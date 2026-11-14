import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { execute, insertReturningId, queryAll, queryOne } from './db.js';

const app = express();

app.use(cors());
app.use(express.json());

const nowIso = () => new Date().toISOString();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[crypto.randomInt(0, chars.length)];
  }
  return `KOA-${suffix}`;
}

async function generateUniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateCode();
    const existing = await queryOne('SELECT id FROM schedules WHERE code = ?', [code]);
    if (!existing) return code;
  }
  return `KOA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function logActivity(scheduleId, actorName, actionType, message) {
  await execute(
    'INSERT INTO activity_logs (schedule_id, actor_name, action_type, message, created_at) VALUES (?, ?, ?, ?, ?)',
    [scheduleId, actorName, actionType, message, nowIso()]
  );
}

function buildMandanTeams(names) {
  const shuffled = [...names];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const teams = [];
  const pairCount = Math.floor(shuffled.length / 2);
  for (let i = 0; i < pairCount; i++) {
    teams.push({
      team_number: i + 1,
      members: [shuffled[i * 2], shuffled[i * 2 + 1]],
    });
  }
  const reserve = shuffled.length % 2 === 1 ? [shuffled[shuffled.length - 1]] : [];
  return { teams, reserve };
}

async function syncMandanTeams(scheduleId, currentTeamsJson, actorName = 'Sistem', forceShuffle = false) {
  const attendingRows = await queryAll(
    "SELECT participant_name FROM rsvps WHERE schedule_id = ? AND status = 'attending' ORDER BY id ASC",
    [scheduleId]
  );
  const attendingNames = attendingRows.map((r) => r.participant_name);

  if (attendingNames.length < 4) {
    if (currentTeamsJson) {
      await execute('UPDATE schedules SET teams_json = NULL, updated_at = ? WHERE id = ?', [
        nowIso(),
        scheduleId,
      ]);
      await logActivity(
        scheduleId,
        'Sistem',
        'updated',
        'Pembagian mandan direset karena jumlah pemain hadir kurang dari 4 orang.'
      );
    }
    return;
  }

  let needsUpdate = forceShuffle || !currentTeamsJson;
  if (!needsUpdate && currentTeamsJson) {
    try {
      const parsed = JSON.parse(currentTeamsJson);
      const existingSet = new Set(
        [...(parsed.teams || []).flatMap((t) => t.members || []), ...(parsed.reserve || [])].map((n) =>
          n.toLowerCase()
        )
      );
      const currentSet = new Set(attendingNames.map((n) => n.toLowerCase()));
      if (
        existingSet.size !== currentSet.size ||
        [...currentSet].some((n) => !existingSet.has(n))
      ) {
        needsUpdate = true;
      }
    } catch {
      needsUpdate = true;
    }
  }

  if (needsUpdate) {
    const result = buildMandanTeams(attendingNames);
    await execute('UPDATE schedules SET teams_json = ?, updated_at = ? WHERE id = ?', [
      JSON.stringify(result),
      nowIso(),
      scheduleId,
    ]);
    const summary = result.teams
      .map((t) => `Tim ${t.team_number}: ${t.members.join(' & ')}`)
      .join(' | ');
    await logActivity(
      scheduleId,
      forceShuffle ? actorName : 'Sistem',
      'updated',
      forceShuffle ? `Mengacak ulang mandan: ${summary}` : `Mandan otomatis terpilih (${summary}).`
    );
  }
}

async function formatScheduleDetail(schedule, hostToken) {
  if (!schedule) return null;
  const options = await queryAll(
    'SELECT id, start_at, end_at, note FROM poll_options WHERE schedule_id = ? ORDER BY start_at ASC',
    [schedule.id]
  );

  const votes = await queryAll(
    'SELECT option_id, participant_name, created_at FROM poll_votes WHERE schedule_id = ?',
    [schedule.id]
  );

  const votesByOption = new Map();
  for (const v of votes) {
    if (!votesByOption.has(v.option_id)) votesByOption.set(v.option_id, []);
    votesByOption.get(v.option_id).push(v.participant_name);
  }

  const enrichedOptions = options.map((opt) => {
    const voters = votesByOption.get(opt.id) || [];
    return {
      ...opt,
      voters,
      vote_count: voters.length,
    };
  });

  const rsvps = await queryAll(
    'SELECT id, participant_name, status, note, updated_at FROM rsvps WHERE schedule_id = ? ORDER BY updated_at DESC',
    [schedule.id]
  );

  const logs = await queryAll(
    'SELECT id, actor_name, action_type, message, created_at FROM activity_logs WHERE schedule_id = ? ORDER BY id DESC LIMIT 30',
    [schedule.id]
  );

  const { host_token, teams_json, ...safeSchedule } = schedule;
  let parsedTeams = { teams: [], reserve: [] };
  if (teams_json) {
    try {
      parsedTeams = JSON.parse(teams_json);
    } catch {
      parsedTeams = { teams: [], reserve: [] };
    }
  }
  return {
    ...safeSchedule,
    teams: parsedTeams.teams || [],
    reserve_players: parsedTeams.reserve || [],
    is_host: Boolean(hostToken && hostToken === host_token),
    poll_options: enrichedOptions,
    rsvps,
    activity_logs: logs,
  };
}

// List all schedules with summary counts
app.get('/api/schedules', async (req, res) => {
  const statusFilter = req.query.status;
  let query = `
    SELECT s.id, s.code, s.title, s.description, s.creator_name, s.mode, s.status,
           s.final_start_at, s.final_end_at, s.location_name, s.location_address,
           s.location_maps_url, s.quota, s.created_at, s.updated_at,
           (SELECT COUNT(*) FROM rsvps r WHERE r.schedule_id = s.id AND r.status = 'attending') AS attending_count,
           (SELECT COUNT(*) FROM rsvps r WHERE r.schedule_id = s.id AND r.status = 'maybe') AS maybe_count,
           (SELECT COUNT(DISTINCT participant_name) FROM poll_votes pv WHERE pv.schedule_id = s.id) AS voter_count
    FROM schedules s
  `;
  const params = [];
  if (statusFilter && statusFilter !== 'all') {
    query += ' WHERE s.status = ?';
    params.push(statusFilter);
  }
  query +=
    " ORDER BY CASE s.status WHEN 'scheduled' THEN 1 WHEN 'polling' THEN 2 WHEN 'completed' THEN 3 ELSE 4 END, COALESCE(s.final_start_at, s.created_at) DESC";

  const rows = await queryAll(query, params);
  res.json(rows);
});

// Get single schedule by code
app.get('/api/schedules/:code', async (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const hostToken = req.headers['x-host-token'] || req.query.hostToken || '';
  const schedule = await queryOne('SELECT * FROM schedules WHERE code = ?', [code]);
  if (!schedule) {
    return res.status(404).json({ error: 'Jadwal tidak ditemukan. Periksa kembali kode jadwal.' });
  }
  res.json(await formatScheduleDetail(schedule, hostToken));
});

// Create a new schedule (no login required)
app.post('/api/schedules', async (req, res) => {
  const {
    title,
    description = '',
    creator_name,
    mode = 'direct',
    final_start_at = null,
    final_end_at = null,
    poll_options = [],
    location_name = '',
    location_address = '',
    location_maps_url = '',
    quota = 4,
    creator_attending = true,
    save_location = true,
  } = req.body;

  if (!title?.trim() || !creator_name?.trim()) {
    return res.status(400).json({ error: 'Judul jadwal dan nama pembuat wajib diisi.' });
  }

  if (mode === 'direct' && !final_start_at) {
    return res.status(400).json({ error: 'Tanggal dan jam bermain wajib diisi untuk jadwal langsung.' });
  }

  if (mode === 'polling' && (!Array.isArray(poll_options) || poll_options.length < 2)) {
    return res.status(400).json({ error: 'Mode polling membutuhkan minimal 2 opsi waktu.' });
  }

  const code = await generateUniqueCode();
  const hostToken = crypto.randomBytes(16).toString('hex');
  const status = mode === 'polling' ? 'polling' : 'scheduled';
  const parsedQuota = Math.max(0, Number(quota) || 0);
  const ts = nowIso();

  const scheduleId = await insertReturningId(
    `INSERT INTO schedules (
      code, host_token, title, description, creator_name, mode, status,
      final_start_at, final_end_at, location_name, location_address, location_maps_url, quota, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code,
      hostToken,
      title.trim(),
      description.trim(),
      creator_name.trim(),
      mode,
      status,
      mode === 'direct' ? final_start_at : null,
      mode === 'direct' ? final_end_at : null,
      location_name.trim(),
      location_address.trim(),
      location_maps_url.trim(),
      parsedQuota,
      ts,
      ts,
    ]
  );

  if (mode === 'polling') {
    for (const opt of poll_options) {
      if (opt?.start_at) {
        await execute(
          'INSERT INTO poll_options (schedule_id, start_at, end_at, note) VALUES (?, ?, ?, ?)',
          [scheduleId, opt.start_at, opt.end_at || null, (opt.note || '').trim()]
        );
      }
    }
  }

  if (creator_attending) {
    await execute(
      "INSERT INTO rsvps (schedule_id, participant_name, status, note, updated_at) VALUES (?, ?, 'attending', 'Pembuat jadwal', ?)",
      [scheduleId, creator_name.trim(), ts]
    );
  }

  if (save_location && location_name.trim()) {
    const existingLoc = await queryOne('SELECT id FROM locations WHERE LOWER(name) = LOWER(?)', [
      location_name.trim(),
    ]);
    if (!existingLoc) {
      await execute(
        'INSERT INTO locations (name, address, maps_url, created_at) VALUES (?, ?, ?, ?)',
        [location_name.trim(), location_address.trim(), location_maps_url.trim(), ts]
      );
    }
  }

  await logActivity(
    scheduleId,
    creator_name.trim(),
    'created',
    mode === 'polling'
      ? `Membuat polling jadwal "${title.trim()}" dengan ${poll_options.length} opsi waktu.`
      : `Membuat jadwal "${title.trim()}".`
  );

  const created = await queryOne('SELECT * FROM schedules WHERE id = ?', [scheduleId]);
  res.status(201).json({
    ...(await formatScheduleDetail(created, hostToken)),
    host_token: hostToken,
  });
});

// Update / finalize / cancel / complete schedule (host_token required)
app.patch('/api/schedules/:code', async (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const hostToken = req.headers['x-host-token'] || req.body.host_token || '';
  const schedule = await queryOne('SELECT * FROM schedules WHERE code = ?', [code]);

  if (!schedule) {
    return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
  }
  if (!hostToken || hostToken !== schedule.host_token) {
    return res
      .status(403)
      .json({ error: 'Hanya pembuat jadwal (memiliki akses Host) yang dapat mengubah jadwal ini.' });
  }

  const {
    title,
    description,
    final_start_at,
    final_end_at,
    location_name,
    location_address,
    location_maps_url,
    quota,
    status,
    finalize_option_id,
    actor_name = schedule.creator_name,
  } = req.body;

  let nextStartAt = final_start_at !== undefined ? final_start_at : schedule.final_start_at;
  let nextEndAt = final_end_at !== undefined ? final_end_at : schedule.final_end_at;
  let nextStatus = status !== undefined ? status : schedule.status;
  let logMessage = 'Memperbarui detail jadwal.';
  let actionType = 'updated';

  if (finalize_option_id) {
    const opt = await queryOne('SELECT * FROM poll_options WHERE id = ? AND schedule_id = ?', [
      finalize_option_id,
      schedule.id,
    ]);
    if (!opt) {
      return res.status(400).json({ error: 'Opsi polling tidak ditemukan.' });
    }
    nextStartAt = opt.start_at;
    nextEndAt = opt.end_at;
    nextStatus = 'scheduled';
    actionType = 'finalized';
    logMessage = 'Menetapkan jadwal final dari hasil voting.';
  } else if (status === 'cancelled' && schedule.status !== 'cancelled') {
    actionType = 'cancelled';
    logMessage = 'Membatalkan jadwal bermain.';
  } else if (status === 'completed' && schedule.status !== 'completed') {
    actionType = 'completed';
    logMessage = 'Menandai sesi permainan telah selesai.';
  }

  await execute(
    `UPDATE schedules SET
      title = ?,
      description = ?,
      final_start_at = ?,
      final_end_at = ?,
      location_name = ?,
      location_address = ?,
      location_maps_url = ?,
      quota = ?,
      status = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      title !== undefined ? title.trim() : schedule.title,
      description !== undefined ? description.trim() : schedule.description,
      nextStartAt,
      nextEndAt,
      location_name !== undefined ? location_name.trim() : schedule.location_name,
      location_address !== undefined ? location_address.trim() : schedule.location_address,
      location_maps_url !== undefined ? location_maps_url.trim() : schedule.location_maps_url,
      quota !== undefined ? Math.max(0, Number(quota) || 0) : schedule.quota,
      nextStatus,
      nowIso(),
      schedule.id,
    ]
  );

  await logActivity(schedule.id, actor_name, actionType, logMessage);

  const updated = await queryOne('SELECT * FROM schedules WHERE id = ?', [schedule.id]);
  res.json(await formatScheduleDetail(updated, hostToken));
});

// Vote on poll options (no login, participant_name based)
app.post('/api/schedules/:code/vote', async (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { participant_name, option_ids } = req.body;
  const hostToken = req.headers['x-host-token'] || '';

  if (!participant_name?.trim()) {
    return res.status(400).json({ error: 'Nama Anda wajib diisi untuk melakukan voting.' });
  }
  if (!Array.isArray(option_ids)) {
    return res.status(400).json({ error: 'Daftar pilihan opsi tidak valid.' });
  }

  const schedule = await queryOne('SELECT * FROM schedules WHERE code = ?', [code]);
  if (!schedule) {
    return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
  }
  if (schedule.status !== 'polling') {
    return res
      .status(400)
      .json({ error: 'Polling sudah ditutup karena jadwal sudah ditetapkan atau selesai.' });
  }

  const cleanName = participant_name.trim();
  const validOptions = (
    await queryAll('SELECT id FROM poll_options WHERE schedule_id = ?', [schedule.id])
  ).map((o) => Number(o.id));
  const filteredIds = [...new Set(option_ids.map(Number))].filter((id) => validOptions.includes(id));

  await execute('DELETE FROM poll_votes WHERE schedule_id = ? AND LOWER(participant_name) = LOWER(?)', [
    schedule.id,
    cleanName,
  ]);

  const ts = nowIso();
  for (const optId of filteredIds) {
    await execute(
      'INSERT INTO poll_votes (option_id, schedule_id, participant_name, created_at) VALUES (?, ?, ?, ?)',
      [optId, schedule.id, cleanName, ts]
    );
  }

  await logActivity(
    schedule.id,
    cleanName,
    'voted',
    filteredIds.length > 0
      ? `Memilih ${filteredIds.length} opsi waktu pada polling.`
      : 'Menghapus pilihan votingnya.'
  );

  const updated = await queryOne('SELECT * FROM schedules WHERE id = ?', [schedule.id]);
  res.json(await formatScheduleDetail(updated, hostToken));
});

// RSVP / Attendance confirmation (no login, participant_name based)
app.post('/api/schedules/:code/rsvp', async (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { participant_name, status, note = '' } = req.body;
  const hostToken = req.headers['x-host-token'] || '';

  if (!participant_name?.trim()) {
    return res.status(400).json({ error: 'Nama Anda wajib diisi untuk konfirmasi kehadiran.' });
  }
  if (!['attending', 'maybe', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Status kehadiran tidak valid.' });
  }

  const schedule = await queryOne('SELECT * FROM schedules WHERE code = ?', [code]);
  if (!schedule) {
    return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
  }
  if (schedule.status === 'cancelled' || schedule.status === 'completed') {
    return res
      .status(400)
      .json({ error: 'Konfirmasi tidak dapat diubah karena jadwal sudah selesai atau dibatalkan.' });
  }

  const cleanName = participant_name.trim();

  if (status === 'attending' && schedule.quota > 0) {
    const existing = await queryOne(
      'SELECT status FROM rsvps WHERE schedule_id = ? AND LOWER(participant_name) = LOWER(?)',
      [schedule.id, cleanName]
    );
    const currentRow = await queryOne(
      "SELECT COUNT(*) AS cnt FROM rsvps WHERE schedule_id = ? AND status = 'attending'",
      [schedule.id]
    );
    const currentAttending = Number(currentRow?.cnt || 0);

    const alreadyAttending = existing?.status === 'attending';
    if (!alreadyAttending && currentAttending >= schedule.quota) {
      return res.status(400).json({
        error: `Kuota pemain sudah penuh (${schedule.quota}/${schedule.quota}). Anda dapat memilih "Belum Pasti" atau hubungi pembuat jadwal.`,
      });
    }
  }

  const existing = await queryOne(
    'SELECT id FROM rsvps WHERE schedule_id = ? AND LOWER(participant_name) = LOWER(?)',
    [schedule.id, cleanName]
  );
  const ts = nowIso();

  if (existing) {
    await execute(
      'UPDATE rsvps SET participant_name = ?, status = ?, note = ?, updated_at = ? WHERE id = ?',
      [cleanName, status, note.trim(), ts, existing.id]
    );
  } else {
    await execute(
      'INSERT INTO rsvps (schedule_id, participant_name, status, note, updated_at) VALUES (?, ?, ?, ?, ?)',
      [schedule.id, cleanName, status, note.trim(), ts]
    );
  }

  const labelMap = {
    attending: 'Hadir',
    maybe: 'Belum Pasti',
    declined: 'Tidak Hadir',
  };
  await logActivity(schedule.id, cleanName, 'rsvp', `Konfirmasi kehadiran: ${labelMap[status]}.`);

  await syncMandanTeams(schedule.id, schedule.teams_json);

  const updated = await queryOne('SELECT * FROM schedules WHERE id = ?', [schedule.id]);
  res.json(await formatScheduleDetail(updated, hostToken));
});

// Shuffle mandan teams manually (host-only)
app.post('/api/schedules/:code/shuffle-teams', async (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const hostToken = req.headers['x-host-token'] || req.body?.host_token || '';
  const schedule = await queryOne('SELECT * FROM schedules WHERE code = ?', [code]);

  if (!schedule) {
    return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
  }
  if (!hostToken || hostToken !== schedule.host_token) {
    return res.status(403).json({ error: 'Hanya pembuat jadwal yang dapat mengacak ulang mandan.' });
  }

  const countRow = await queryOne(
    "SELECT COUNT(*) AS cnt FROM rsvps WHERE schedule_id = ? AND status = 'attending'",
    [schedule.id]
  );
  if (Number(countRow?.cnt || 0) < 4) {
    return res.status(400).json({ error: 'Minimal 4 pemain hadir diperlukan untuk memilih mandan.' });
  }

  await syncMandanTeams(schedule.id, schedule.teams_json, schedule.creator_name, true);
  const updated = await queryOne('SELECT * FROM schedules WHERE id = ?', [schedule.id]);
  res.json(await formatScheduleDetail(updated, hostToken));
});

// Locations CRUD
app.get('/api/locations', async (req, res) => {
  const rows = await queryAll('SELECT * FROM locations ORDER BY id DESC');
  res.json(rows);
});

app.post('/api/locations', async (req, res) => {
  const { name, address = '', maps_url = '' } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nama lokasi wajib diisi.' });
  }
  const id = await insertReturningId(
    'INSERT INTO locations (name, address, maps_url, created_at) VALUES (?, ?, ?, ?)',
    [name.trim(), address.trim(), maps_url.trim(), nowIso()]
  );
  const created = await queryOne('SELECT * FROM locations WHERE id = ?', [id]);
  res.status(201).json(created);
});

app.delete('/api/locations/:id', async (req, res) => {
  await execute('DELETE FROM locations WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Statistics & History summary
app.get('/api/stats', async (req, res) => {
  const totalSchedules = Number(
    (await queryOne('SELECT COUNT(*) AS cnt FROM schedules'))?.cnt || 0
  );
  const activeSchedules = Number(
    (
      await queryOne(
        "SELECT COUNT(*) AS cnt FROM schedules WHERE status IN ('polling', 'scheduled')"
      )
    )?.cnt || 0
  );
  const completedSchedules = Number(
    (await queryOne("SELECT COUNT(*) AS cnt FROM schedules WHERE status = 'completed'"))?.cnt || 0
  );

  const topPlayers = await queryAll(
    `SELECT MIN(r.participant_name) AS name, COUNT(*) AS games_count
     FROM rsvps r
     JOIN schedules s ON s.id = r.schedule_id
     WHERE r.status = 'attending' AND s.status IN ('scheduled', 'completed')
     GROUP BY LOWER(r.participant_name)
     ORDER BY games_count DESC, name ASC
     LIMIT 10`
  );

  const topLocations = await queryAll(
    `SELECT MIN(location_name) AS name, COUNT(*) AS usage_count
     FROM schedules
     WHERE location_name != '' AND status != 'cancelled'
     GROUP BY LOWER(location_name)
     ORDER BY usage_count DESC
     LIMIT 5`
  );

  res.json({
    total_schedules: totalSchedules,
    active_schedules: activeSchedules,
    completed_schedules: completedSchedules,
    top_players: topPlayers,
    top_locations: topLocations,
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server.' });
});

export default app;
