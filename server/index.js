import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[crypto.randomInt(0, chars.length)];
  }
  return `KOA-${suffix}`;
}

function generateUniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateCode();
    const existing = db.prepare('SELECT id FROM schedules WHERE code = ?').get(code);
    if (!existing) return code;
  }
  return `KOA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function logActivity(scheduleId, actorName, actionType, message) {
  db.prepare(
    'INSERT INTO activity_logs (schedule_id, actor_name, action_type, message) VALUES (?, ?, ?, ?)'
  ).run(scheduleId, actorName, actionType, message);
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

function syncMandanTeams(scheduleId, currentTeamsJson, actorName = 'Sistem', forceShuffle = false) {
  const attendingRows = db
    .prepare("SELECT participant_name FROM rsvps WHERE schedule_id = ? AND status = 'attending' ORDER BY id ASC")
    .all(scheduleId);
  const attendingNames = attendingRows.map((r) => r.participant_name);

  if (attendingNames.length < 4) {
    if (currentTeamsJson) {
      db.prepare("UPDATE schedules SET teams_json = NULL, updated_at = datetime('now') WHERE id = ?").run(
        scheduleId
      );
      logActivity(
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
      const existingSet = new Set([
        ...(parsed.teams || []).flatMap((t) => t.members || []),
        ...(parsed.reserve || []),
      ].map((n) => n.toLowerCase()));
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
    db.prepare("UPDATE schedules SET teams_json = ?, updated_at = datetime('now') WHERE id = ?").run(
      JSON.stringify(result),
      scheduleId
    );
    const summary = result.teams
      .map((t) => `Tim ${t.team_number}: ${t.members.join(' & ')}`)
      .join(' | ');
    logActivity(
      scheduleId,
      forceShuffle ? actorName : 'Sistem',
      'updated',
      forceShuffle ? `Mengacak ulang mandan: ${summary}` : `Mandan otomatis terpilih (${summary}).`
    );
  }
}

function formatScheduleDetail(schedule, hostToken) {
  if (!schedule) return null;
  const options = db
    .prepare('SELECT id, start_at, end_at, note FROM poll_options WHERE schedule_id = ? ORDER BY start_at ASC')
    .all(schedule.id);

  const votes = db
    .prepare('SELECT option_id, participant_name, created_at FROM poll_votes WHERE schedule_id = ?')
    .all(schedule.id);

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

  const rsvps = db
    .prepare(
      'SELECT id, participant_name, status, note, updated_at FROM rsvps WHERE schedule_id = ? ORDER BY updated_at DESC'
    )
    .all(schedule.id);

  const logs = db
    .prepare(
      'SELECT id, actor_name, action_type, message, created_at FROM activity_logs WHERE schedule_id = ? ORDER BY id DESC LIMIT 30'
    )
    .all(schedule.id);

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
app.get('/api/schedules', (req, res) => {
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
  query += ' ORDER BY CASE s.status WHEN "scheduled" THEN 1 WHEN "polling" THEN 2 WHEN "completed" THEN 3 ELSE 4 END, COALESCE(s.final_start_at, s.created_at) DESC';

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// Get single schedule by code
app.get('/api/schedules/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const hostToken = req.headers['x-host-token'] || req.query.hostToken || '';
  const schedule = db.prepare('SELECT * FROM schedules WHERE code = ?').get(code);
  if (!schedule) {
    return res.status(404).json({ error: 'Jadwal tidak ditemukan. Periksa kembali kode jadwal.' });
  }
  res.json(formatScheduleDetail(schedule, hostToken));
});

// Create a new schedule (no login required)
app.post('/api/schedules', (req, res) => {
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

  const code = generateUniqueCode();
  const hostToken = crypto.randomBytes(16).toString('hex');
  const status = mode === 'polling' ? 'polling' : 'scheduled';
  const parsedQuota = Math.max(0, Number(quota) || 0);

  db.exec('BEGIN');
  try {
    const insertResult = db
      .prepare(
        `INSERT INTO schedules (
          code, host_token, title, description, creator_name, mode, status,
          final_start_at, final_end_at, location_name, location_address, location_maps_url, quota
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
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
        parsedQuota
      );

    const scheduleId = insertResult.lastInsertRowid;

    if (mode === 'polling') {
      const insertOpt = db.prepare(
        'INSERT INTO poll_options (schedule_id, start_at, end_at, note) VALUES (?, ?, ?, ?)'
      );
      for (const opt of poll_options) {
        if (opt?.start_at) {
          insertOpt.run(scheduleId, opt.start_at, opt.end_at || null, (opt.note || '').trim());
        }
      }
    }

    if (creator_attending) {
      db.prepare(
        "INSERT INTO rsvps (schedule_id, participant_name, status, note) VALUES (?, ?, 'attending', 'Pembuat jadwal')"
      ).run(scheduleId, creator_name.trim());
    }

    if (save_location && location_name.trim()) {
      const existingLoc = db
        .prepare('SELECT id FROM locations WHERE LOWER(name) = LOWER(?)')
        .get(location_name.trim());
      if (!existingLoc) {
        db.prepare('INSERT INTO locations (name, address, maps_url) VALUES (?, ?, ?)').run(
          location_name.trim(),
          location_address.trim(),
          location_maps_url.trim()
        );
      }
    }

    logActivity(
      scheduleId,
      creator_name.trim(),
      'created',
      mode === 'polling'
        ? `Membuat polling jadwal "${title.trim()}" dengan ${poll_options.length} opsi waktu.`
        : `Membuat jadwal "${title.trim()}".`
    );

    db.exec('COMMIT');

    const created = db.prepare('SELECT * FROM schedules WHERE id = ?').get(scheduleId);
    res.status(201).json({
      ...formatScheduleDetail(created, hostToken),
      host_token: hostToken,
    });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Gagal membuat jadwal: ' + err.message });
  }
});

// Update / finalize / cancel / complete schedule (host_token required)
app.patch('/api/schedules/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const hostToken = req.headers['x-host-token'] || req.body.host_token || '';
  const schedule = db.prepare('SELECT * FROM schedules WHERE code = ?').get(code);

  if (!schedule) {
    return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
  }
  if (!hostToken || hostToken !== schedule.host_token) {
    return res.status(403).json({ error: 'Hanya pembuat jadwal (memiliki akses Host) yang dapat mengubah jadwal ini.' });
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
    const opt = db
      .prepare('SELECT * FROM poll_options WHERE id = ? AND schedule_id = ?')
      .get(finalize_option_id, schedule.id);
    if (!opt) {
      return res.status(400).json({ error: 'Opsi polling tidak ditemukan.' });
    }
    nextStartAt = opt.start_at;
    nextEndAt = opt.end_at;
    nextStatus = 'scheduled';
    actionType = 'finalized';
    logMessage = `Menetapkan jadwal final dari hasil voting.`;
  } else if (status === 'cancelled' && schedule.status !== 'cancelled') {
    actionType = 'cancelled';
    logMessage = 'Membatalkan jadwal bermain.';
  } else if (status === 'completed' && schedule.status !== 'completed') {
    actionType = 'completed';
    logMessage = 'Menandai sesi permainan telah selesai.';
  }

  db.prepare(
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
      updated_at = datetime('now')
    WHERE id = ?`
  ).run(
    title !== undefined ? title.trim() : schedule.title,
    description !== undefined ? description.trim() : schedule.description,
    nextStartAt,
    nextEndAt,
    location_name !== undefined ? location_name.trim() : schedule.location_name,
    location_address !== undefined ? location_address.trim() : schedule.location_address,
    location_maps_url !== undefined ? location_maps_url.trim() : schedule.location_maps_url,
    quota !== undefined ? Math.max(0, Number(quota) || 0) : schedule.quota,
    nextStatus,
    schedule.id
  );

  logActivity(schedule.id, actor_name, actionType, logMessage);

  const updated = db.prepare('SELECT * FROM schedules WHERE id = ?').get(schedule.id);
  res.json(formatScheduleDetail(updated, hostToken));
});

// Vote on poll options (no login, participant_name based)
app.post('/api/schedules/:code/vote', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { participant_name, option_ids } = req.body;
  const hostToken = req.headers['x-host-token'] || '';

  if (!participant_name?.trim()) {
    return res.status(400).json({ error: 'Nama Anda wajib diisi untuk melakukan voting.' });
  }
  if (!Array.isArray(option_ids)) {
    return res.status(400).json({ error: 'Daftar pilihan opsi tidak valid.' });
  }

  const schedule = db.prepare('SELECT * FROM schedules WHERE code = ?').get(code);
  if (!schedule) {
    return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
  }
  if (schedule.status !== 'polling') {
    return res.status(400).json({ error: 'Polling sudah ditutup karena jadwal sudah ditetapkan atau selesai.' });
  }

  const cleanName = participant_name.trim();
  const validOptions = db
    .prepare('SELECT id FROM poll_options WHERE schedule_id = ?')
    .all(schedule.id)
    .map((o) => o.id);
  const filteredIds = [...new Set(option_ids.map(Number))].filter((id) => validOptions.includes(id));

  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM poll_votes WHERE schedule_id = ? AND LOWER(participant_name) = LOWER(?)').run(
      schedule.id,
      cleanName
    );
    const insertVote = db.prepare(
      'INSERT INTO poll_votes (option_id, schedule_id, participant_name) VALUES (?, ?, ?)'
    );
    for (const optId of filteredIds) {
      insertVote.run(optId, schedule.id, cleanName);
    }

    logActivity(
      schedule.id,
      cleanName,
      'voted',
      filteredIds.length > 0
        ? `Memilih ${filteredIds.length} opsi waktu pada polling.`
        : 'Menghapus pilihan votingnya.'
    );
    db.exec('COMMIT');

    const updated = db.prepare('SELECT * FROM schedules WHERE id = ?').get(schedule.id);
    res.json(formatScheduleDetail(updated, hostToken));
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Gagal menyimpan voting: ' + err.message });
  }
});

// RSVP / Attendance confirmation (no login, participant_name based)
app.post('/api/schedules/:code/rsvp', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { participant_name, status, note = '' } = req.body;
  const hostToken = req.headers['x-host-token'] || '';

  if (!participant_name?.trim()) {
    return res.status(400).json({ error: 'Nama Anda wajib diisi untuk konfirmasi kehadiran.' });
  }
  if (!['attending', 'maybe', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Status kehadiran tidak valid.' });
  }

  const schedule = db.prepare('SELECT * FROM schedules WHERE code = ?').get(code);
  if (!schedule) {
    return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
  }
  if (schedule.status === 'cancelled' || schedule.status === 'completed') {
    return res.status(400).json({ error: 'Konfirmasi tidak dapat diubah karena jadwal sudah selesai atau dibatalkan.' });
  }

  const cleanName = participant_name.trim();

  if (status === 'attending' && schedule.quota > 0) {
    const existing = db
      .prepare('SELECT status FROM rsvps WHERE schedule_id = ? AND LOWER(participant_name) = LOWER(?)')
      .get(schedule.id, cleanName);
    const currentAttending = db
      .prepare("SELECT COUNT(*) AS cnt FROM rsvps WHERE schedule_id = ? AND status = 'attending'")
      .get(schedule.id).cnt;

    const alreadyAttending = existing?.status === 'attending';
    if (!alreadyAttending && currentAttending >= schedule.quota) {
      return res.status(400).json({
        error: `Kuota pemain sudah penuh (${schedule.quota}/${schedule.quota}). Anda dapat memilih "Belum Pasti" atau hubungi pembuat jadwal.`,
      });
    }
  }

  const existing = db
    .prepare('SELECT id FROM rsvps WHERE schedule_id = ? AND LOWER(participant_name) = LOWER(?)')
    .get(schedule.id, cleanName);

  if (existing) {
    db.prepare(
      "UPDATE rsvps SET participant_name = ?, status = ?, note = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(cleanName, status, note.trim(), existing.id);
  } else {
    db.prepare(
      'INSERT INTO rsvps (schedule_id, participant_name, status, note) VALUES (?, ?, ?, ?)'
    ).run(schedule.id, cleanName, status, note.trim());
  }

  const labelMap = {
    attending: 'Hadir',
    maybe: 'Belum Pasti',
    declined: 'Tidak Hadir',
  };
  logActivity(schedule.id, cleanName, 'rsvp', `Konfirmasi kehadiran: ${labelMap[status]}.`);

  syncMandanTeams(schedule.id, schedule.teams_json);

  const updated = db.prepare('SELECT * FROM schedules WHERE id = ?').get(schedule.id);
  res.json(formatScheduleDetail(updated, hostToken));
});

// Shuffle mandan teams manually (host-only)
app.post('/api/schedules/:code/shuffle-teams', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const hostToken = req.headers['x-host-token'] || req.body?.host_token || '';
  const schedule = db.prepare('SELECT * FROM schedules WHERE code = ?').get(code);

  if (!schedule) {
    return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
  }
  if (!hostToken || hostToken !== schedule.host_token) {
    return res.status(403).json({ error: 'Hanya pembuat jadwal yang dapat mengacak ulang mandan.' });
  }

  const attendingCount = db
    .prepare("SELECT COUNT(*) AS cnt FROM rsvps WHERE schedule_id = ? AND status = 'attending'")
    .get(schedule.id).cnt;
  if (attendingCount < 4) {
    return res.status(400).json({ error: 'Minimal 4 pemain hadir diperlukan untuk memilih mandan.' });
  }

  syncMandanTeams(schedule.id, schedule.teams_json, schedule.creator_name, true);
  const updated = db.prepare('SELECT * FROM schedules WHERE id = ?').get(schedule.id);
  res.json(formatScheduleDetail(updated, hostToken));
});

// Locations CRUD
app.get('/api/locations', (req, res) => {
  const rows = db.prepare('SELECT * FROM locations ORDER BY id DESC').all();
  res.json(rows);
});

app.post('/api/locations', (req, res) => {
  const { name, address = '', maps_url = '' } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nama lokasi wajib diisi.' });
  }
  const result = db
    .prepare('INSERT INTO locations (name, address, maps_url) VALUES (?, ?, ?)')
    .run(name.trim(), address.trim(), maps_url.trim());
  const created = db.prepare('SELECT * FROM locations WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.delete('/api/locations/:id', (req, res) => {
  db.prepare('DELETE FROM locations WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Statistics & History summary
app.get('/api/stats', (req, res) => {
  const totalSchedules = db.prepare('SELECT COUNT(*) AS cnt FROM schedules').get().cnt;
  const activeSchedules = db
    .prepare("SELECT COUNT(*) AS cnt FROM schedules WHERE status IN ('polling', 'scheduled')")
    .get().cnt;
  const completedSchedules = db
    .prepare("SELECT COUNT(*) AS cnt FROM schedules WHERE status = 'completed'")
    .get().cnt;

  const topPlayers = db
    .prepare(
      `SELECT r.participant_name AS name, COUNT(*) AS games_count
       FROM rsvps r
       JOIN schedules s ON s.id = r.schedule_id
       WHERE r.status = 'attending' AND s.status IN ('scheduled', 'completed')
       GROUP BY LOWER(r.participant_name)
       ORDER BY games_count DESC, name ASC
       LIMIT 10`
    )
    .all();

  const topLocations = db
    .prepare(
      `SELECT location_name AS name, COUNT(*) AS usage_count
       FROM schedules
       WHERE location_name != '' AND status != 'cancelled'
       GROUP BY LOWER(location_name)
       ORDER BY usage_count DESC
       LIMIT 5`
    )
    .all();

  res.json({
    total_schedules: totalSchedules,
    active_schedules: activeSchedules,
    completed_schedules: completedSchedules,
    top_players: topPlayers,
    top_locations: topLocations,
  });
});

// Serve production build if available
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`KoaPlay server running at http://localhost:${PORT}`);
});
