import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  HelpCircle,
  History,
  MapPin,
  Share2,
  ShieldCheck,
  Shuffle,
  Users,
  Vote,
  XCircle,
} from 'lucide-react';
import { api } from '../api';
import StatusBadge from './StatusBadge';
import {
  formatDateTimeID,
  formatShortDateID,
  getHostTokenForCode,
  getNowLocalDateTimeInput,
  getSavedPlayerName,
  saveHostToken,
  savePlayerName,
  toLocalDateTimeInput,
} from '../utils/storage';

export default function ScheduleDetail({ code, onBack }) {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [playerName, setPlayerName] = useState(getSavedPlayerName());
  const [rsvpNote, setRsvpNote] = useState('');
  const [selectedRsvpStatus, setSelectedRsvpStatus] = useState('');
  const [rsvpFeedback, setRsvpFeedback] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [copied, setCopied] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Host edit modal state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStartAt, setEditStartAt] = useState('');
  const [editLocName, setEditLocName] = useState('');
  const [editLocAddress, setEditLocAddress] = useState('');
  const [editLocMaps, setEditLocMaps] = useState('');
  const [editQuota, setEditQuota] = useState(4);

  const loadSchedule = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams(window.location.search);
      const urlHost = params.get('host');
      if (urlHost) {
        saveHostToken(code, urlHost);
        window.history.replaceState({}, '', `/s/${code}`);
      }
      const data = await api.getSchedule(code);
      setSchedule(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [code]);

  // Sync user's existing votes when playerName or schedule changes
  useEffect(() => {
    if (!schedule || !playerName.trim()) return;
    const lower = playerName.trim().toLowerCase();
    const myVotes = schedule.poll_options
      .filter((opt) => opt.voters.some((v) => v.toLowerCase() === lower))
      .map((opt) => opt.id);
    setSelectedOptions(myVotes);
  }, [schedule, playerName]);

  const shareUrl = `${window.location.origin}/s/${code}`;

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const shareToWhatsApp = () => {
    if (!schedule) return;
    const timeText =
      schedule.status === 'polling'
        ? 'Sedang Voting Waktu'
        : formatDateTimeID(schedule.final_start_at);
    const locText = schedule.location_name || 'Belum ditentukan';
    const teamLines =
      schedule.teams?.length > 0
        ? [
            '',
            '*Pembagian Mandan:*',
            ...schedule.teams.map((t) => `• Tim ${t.team_number}: ${t.members.join(' & ')}`),
          ]
        : [];
    const msg = [
      `*Ayo Main Koa! — ${schedule.title}*`,
      `Kode: ${schedule.code}`,
      `Waktu: ${timeText}`,
      `Lokasi: ${locText}`,
      ...teamLines,
      '',
      `Klik link ini untuk ikut / konfirmasi hadir:`,
      shareUrl,
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const maxVotes = useMemo(() => {
    if (!schedule?.poll_options?.length) return 0;
    return Math.max(...schedule.poll_options.map((o) => o.vote_count));
  }, [schedule]);

  const attendingList = useMemo(
    () => schedule?.rsvps?.filter((r) => r.status === 'attending') || [],
    [schedule]
  );
  const maybeList = useMemo(
    () => schedule?.rsvps?.filter((r) => r.status === 'maybe') || [],
    [schedule]
  );
  const declinedList = useMemo(
    () => schedule?.rsvps?.filter((r) => r.status === 'declined') || [],
    [schedule]
  );

  const myRsvp = useMemo(() => {
    if (!schedule || !playerName.trim()) return null;
    const lower = playerName.trim().toLowerCase();
    return schedule.rsvps.find((r) => r.participant_name.toLowerCase() === lower) || null;
  }, [schedule, playerName]);

  const togglePollOption = (optId) => {
    setSelectedOptions((prev) =>
      prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId]
    );
  };

  const handleSubmitVote = async () => {
    setActionError('');
    if (!playerName.trim()) {
      setActionError('Masukkan nama Anda terlebih dahulu sebelum melakukan voting.');
      return;
    }
    savePlayerName(playerName);
    setSubmitting(true);
    try {
      const updated = await api.voteSchedule(code, {
        participant_name: playerName.trim(),
        option_ids: selectedOptions,
      });
      setSchedule(updated);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRsvp = async () => {
    setActionError('');
    setRsvpFeedback(null);
    if (!playerName.trim()) {
      setRsvpFeedback({
        type: 'error',
        text: 'Masukkan nama Anda terlebih dahulu di kotak "Nama Anda" di atas.',
      });
      return;
    }
    if (!selectedRsvpStatus) {
      setRsvpFeedback({
        type: 'error',
        text: 'Pilih salah satu status (Hadir, Belum Pasti, atau Tidak Hadir) terlebih dahulu.',
      });
      return;
    }
    savePlayerName(playerName);
    setSubmitting(true);
    try {
      const updated = await api.rsvpSchedule(code, {
        participant_name: playerName.trim(),
        status: selectedRsvpStatus,
        note: rsvpNote,
      });
      setSchedule(updated);
      setRsvpFeedback({
        type: 'success',
        text: 'Konfirmasi kehadiran berhasil disimpan ke database!',
      });
    } catch (err) {
      setRsvpFeedback({
        type: 'error',
        text: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizePoll = async (optionId) => {
    setActionError('');
    setSubmitting(true);
    try {
      const updated = await api.updateSchedule(code, {
        finalize_option_id: optionId,
        actor_name: playerName.trim() || schedule.creator_name,
      });
      setSchedule(updated);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setActionError('');
    setSubmitting(true);
    try {
      const updated = await api.updateSchedule(code, {
        status: newStatus,
        actor_name: playerName.trim() || schedule.creator_name,
      });
      setSchedule(updated);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShuffleTeams = async () => {
    setActionError('');
    setSubmitting(true);
    try {
      const updated = await api.shuffleTeams(code);
      setSchedule(updated);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = () => {
    setEditTitle(schedule.title);
    setEditStartAt(toLocalDateTimeInput(schedule.final_start_at));
    setEditLocName(schedule.location_name || '');
    setEditLocAddress(schedule.location_address || '');
    setEditLocMaps(schedule.location_maps_url || '');
    setEditQuota(schedule.quota);
    setEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setActionError('');
    if (editStartAt && new Date(editStartAt).getTime() < Date.now()) {
      setActionError('Tanggal dan jam bermain tidak boleh waktu yang sudah lewat.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await api.updateSchedule(code, {
        title: editTitle,
        final_start_at: editStartAt ? new Date(editStartAt).toISOString() : schedule.final_start_at,
        location_name: editLocName,
        location_address: editLocAddress,
        location_maps_url: editLocMaps,
        quota: Number(editQuota),
        actor_name: playerName.trim() || schedule.creator_name,
      });
      setSchedule(updated);
      setEditing(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-sm font-medium text-[#7A5C52]">
        Memuat detail meja jadwal...
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-[#B83A2D]/30 bg-[#FFFDF8] p-8 text-center shadow-sm">
        <XCircle className="mx-auto h-10 w-10 text-[#B83A2D] mb-3" />
        <h2 className="text-lg font-extrabold text-[#3E2723] mb-1">Meja Jadwal Tidak Ditemukan</h2>
        <p className="text-sm text-[#7A5C52] mb-5">{error}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl bg-[#3E2723] px-4 py-2.5 text-sm font-bold text-[#EFE9DB] hover:bg-[#5D4037]"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
        </button>
      </div>
    );
  }

  const isLocked = schedule.status === 'cancelled' || schedule.status === 'completed';
  const quotaFull = schedule.quota > 0 && attendingList.length >= schedule.quota;
  const hostToken = getHostTokenForCode(code);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5D4037] hover:text-[#3E2723]"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Meja
        </button>
        <span className="font-mono text-xs font-extrabold bg-[#3E2723] text-[#E0A928] px-3 py-1 rounded-lg">
          {schedule.code}
        </span>
      </div>

      {/* Main Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#B83A2D] via-[#E0A928] to-[#3E2723]" />

        <div className="flex flex-wrap items-start justify-between gap-4 pt-1">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={schedule.status} />
              {schedule.is_host && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E0A928]/25 border border-[#E0A928] px-2.5 py-0.5 text-xs font-extrabold text-[#3E2723]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#B83A2D]" /> Pembuat Meja
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-[#3E2723]">{schedule.title}</h1>
            <p className="text-sm text-[#7A5C52]">
              Dibuka oleh <strong className="text-[#3E2723]">{schedule.creator_name}</strong>
              {schedule.description ? ` • ${schedule.description}` : ''}
            </p>
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            <button
              onClick={() => copyText(shareUrl, 'link')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3.5 py-2.5 sm:py-2 text-xs font-bold text-[#3E2723] hover:bg-[#EFE9DB]"
            >
              {copied === 'link' ? (
                <>
                  <Check className="h-4 w-4 text-[#B83A2D]" /> Link Disalin!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Salin Link
                </>
              )}
            </button>
            <button
              onClick={shareToWhatsApp}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#B83A2D] px-4 py-2.5 sm:py-2 text-xs font-bold text-[#FFFDF8] hover:bg-[#982D22] shadow-xs"
            >
              <Share2 className="h-4 w-4" /> Bagikan ke WA
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#EFE9DB]">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#B83A2D]/15 p-2.5 text-[#B83A2D]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#7A5C52]">Waktu Main</div>
              <div className="text-sm font-extrabold text-[#3E2723]">
                {schedule.status === 'polling'
                  ? 'Menunggu hasil voting'
                  : formatDateTimeID(schedule.final_start_at)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#E0A928]/25 p-2.5 text-[#3E2723]">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#7A5C52]">Lokasi Lapau</div>
              <div className="text-sm font-extrabold text-[#3E2723]">
                {schedule.location_name || 'Belum ditentukan'}
              </div>
              {schedule.location_address && (
                <div className="text-xs text-[#7A5C52]">{schedule.location_address}</div>
              )}
              {schedule.location_maps_url && (
                <a
                  href={schedule.location_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-extrabold text-[#B83A2D] hover:underline"
                >
                  Buka Google Maps <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#3E2723] p-2.5 text-[#E0A928]">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-[#7A5C52]">Kuota Meja</div>
              <div className="text-sm font-extrabold text-[#3E2723]">
                {attendingList.length} {schedule.quota > 0 ? `/ ${schedule.quota}` : ''} Pemain Hadir
              </div>
              {schedule.quota > 0 && (
                <div className="mt-1.5 h-2 w-full rounded-full bg-[#EFE9DB] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      quotaFull ? 'bg-[#B83A2D]' : 'bg-[#E0A928]'
                    }`}
                    style={{
                      width: `${Math.min(100, (attendingList.length / schedule.quota) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Host Management Bar */}
        {schedule.is_host && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#FAF6EE] border border-[#DDD2BC] px-4 py-3">
            <span className="text-xs font-bold text-[#5D4037]">Kontrol Pembuat Meja:</span>
            <div className="flex flex-wrap gap-2">
              {!isLocked && (
                <button
                  onClick={openEdit}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#FFFDF8] border border-[#DDD2BC] px-3 py-1.5 text-xs font-bold text-[#3E2723] hover:bg-[#EFE9DB]"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Detail
                </button>
              )}
              {schedule.status === 'scheduled' && (
                <button
                  onClick={() => handleStatusChange('completed')}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#3E2723] px-3 py-1.5 text-xs font-bold text-[#EFE9DB] hover:bg-[#5D4037]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#E0A928]" /> Tandai Selesai
                </button>
              )}
              {!isLocked && (
                <button
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#FAE6E3] border border-[#B83A2D]/30 px-3 py-1.5 text-xs font-bold text-[#B83A2D] hover:bg-[#B83A2D] hover:text-[#FFFDF8] transition"
                >
                  <XCircle className="h-3.5 w-3.5" /> Batalkan
                </button>
              )}
              {hostToken && (
                <button
                  onClick={() => copyText(`${shareUrl}?host=${hostToken}`, 'hostlink')}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#E0A928]/25 border border-[#E0A928] px-3 py-1.5 text-xs font-bold text-[#3E2723] hover:bg-[#E0A928]/40"
                >
                  {copied === 'hostlink' ? 'Link Host Disalin!' : 'Salin Link Host'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal for Host */}
      {editing && (
        <form
          onSubmit={handleSaveEdit}
          className="rounded-2xl bg-[#FFFDF8] border border-[#E0A928] p-5 shadow-xs space-y-4"
        >
          <h3 className="text-sm font-extrabold text-[#3E2723]">Edit Detail Meja Jadwal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Judul jadwal"
              className="rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3 py-2 text-base sm:text-sm"
              required
            />
            {schedule.status !== 'polling' && (
              <input
                type="datetime-local"
                min={getNowLocalDateTimeInput()}
                value={editStartAt}
                onChange={(e) => setEditStartAt(e.target.value)}
                className="rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3 py-2 text-base sm:text-sm"
              />
            )}
            <input
              type="text"
              value={editLocName}
              onChange={(e) => setEditLocName(e.target.value)}
              placeholder="Nama lokasi lapau"
              className="rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3 py-2 text-base sm:text-sm"
            />
            <input
              type="text"
              value={editLocAddress}
              onChange={(e) => setEditLocAddress(e.target.value)}
              placeholder="Alamat"
              className="rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3 py-2 text-base sm:text-sm"
            />
            <input
              type="url"
              value={editLocMaps}
              onChange={(e) => setEditLocMaps(e.target.value)}
              placeholder="Link Google Maps"
              className="rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3 py-2 text-base sm:text-sm"
            />
            <select
              value={editQuota}
              onChange={(e) => setEditQuota(Number(e.target.value))}
              className="rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3 py-2 text-base sm:text-sm"
            >
              <option value={4}>4 Pemain (1 Meja)</option>
              <option value={8}>8 Pemain (2 Meja)</option>
              <option value={12}>12 Pemain (3 Meja)</option>
              <option value={0}>Tanpa Batas</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl px-4 py-2 text-xs font-bold text-[#5D4037] hover:bg-[#EFE9DB]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#B83A2D] px-4 py-2 text-xs font-bold text-[#FFFDF8] hover:bg-[#982D22]"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      )}

      {/* Player Identity Box (No Login Required) */}
      {!isLocked && (
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#7A5C52] mb-1">
                Nama Panggilan Anda (Tanpa Login)
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ketik nama Anda, cth: Andi"
                className="w-full rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3.5 py-2.5 text-base sm:text-sm font-bold text-[#3E2723] focus:border-[#B83A2D] focus:bg-[#FFFDF8] focus:outline-none focus:ring-2 focus:ring-[#B83A2D]/20"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#7A5C52] mb-1">
                Catatan Singkat (Opsional)
              </label>
              <input
                type="text"
                value={rsvpNote}
                onChange={(e) => setRsvpNote(e.target.value)}
                placeholder="cth: Nyusul habis Isya"
                className="w-full rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3.5 py-2.5 text-base sm:text-sm focus:border-[#B83A2D] focus:bg-[#FFFDF8] focus:outline-none"
              />
            </div>
          </div>

          {actionError && (
            <div className="mt-3 rounded-xl bg-[#FAE6E3] border border-[#B83A2D]/30 px-3.5 py-2.5 text-xs font-bold text-[#B83A2D]">
              {actionError}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Polling Section */}
          {schedule.mode === 'polling' && (
            <div className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote className="h-5 w-5 text-[#B83A2D]" />
                  <h2 className="text-base font-extrabold text-[#3E2723]">
                    {schedule.status === 'polling'
                      ? 'Pilih Waktu yang Anda Bisa'
                      : 'Hasil Voting Waktu'}
                  </h2>
                </div>
                {schedule.status === 'polling' && (
                  <button
                    onClick={handleSubmitVote}
                    disabled={submitting}
                    className="rounded-xl bg-[#E0A928] px-4 py-2 text-xs font-extrabold text-[#3E2723] hover:bg-[#C48F17] disabled:opacity-50"
                  >
                    Simpan Pilihan ({selectedOptions.length})
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {schedule.poll_options.map((opt) => {
                  const isSelected = selectedOptions.includes(opt.id);
                  const isTop = maxVotes > 0 && opt.vote_count === maxVotes;
                  const totalVoters = Math.max(
                    1,
                    new Set(schedule.poll_options.flatMap((o) => o.voters)).size
                  );
                  const pct = Math.round((opt.vote_count / totalVoters) * 100);

                  return (
                    <div
                      key={opt.id}
                      onClick={() => schedule.status === 'polling' && togglePollOption(opt.id)}
                      className={`rounded-xl border p-4 transition ${
                        schedule.status === 'polling' ? 'cursor-pointer' : ''
                      } ${
                        isSelected
                          ? 'border-[#E0A928] bg-[#E0A928]/20 ring-1 ring-[#E0A928]'
                          : 'border-[#DDD2BC] bg-[#FAF6EE] hover:border-[#3E2723]/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          {schedule.status === 'polling' && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-4 w-4 rounded border-[#DDD2BC] accent-[#B83A2D]"
                            />
                          )}
                          <div>
                            <div className="text-sm font-bold text-[#3E2723]">
                              {formatDateTimeID(opt.start_at)}
                            </div>
                            {opt.note && <div className="text-xs text-[#7A5C52]">{opt.note}</div>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isTop && (
                            <span className="rounded-full bg-[#B83A2D] px-2.5 py-0.5 text-[11px] font-bold text-[#FFFDF8]">
                              Suara Terbanyak
                            </span>
                          )}
                          <span className="text-xs font-extrabold text-[#3E2723]">
                            {opt.vote_count} suara
                          </span>
                          {schedule.is_host && schedule.status === 'polling' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFinalizePoll(opt.id);
                              }}
                              className="rounded-lg bg-[#3E2723] px-2.5 py-1 text-xs font-bold text-[#E0A928] hover:bg-[#5D4037]"
                            >
                              Tetapkan Final
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="h-1.5 w-full rounded-full bg-[#EFE9DB] overflow-hidden mb-2">
                        <div
                          className="h-full bg-[#B83A2D] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {opt.voters.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {opt.voters.map((voter) => (
                            <span
                              key={voter}
                              className="rounded-md bg-[#FFFDF8] border border-[#DDD2BC] px-2 py-0.5 text-xs font-semibold text-[#3E2723]"
                            >
                              {voter}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mandan / Pembagian Tim Otomatis */}
          <div className="rounded-2xl bg-[#3E2723] text-[#EFE9DB] border border-[#5D4037] p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shuffle className="h-5 w-5 text-[#E0A928]" />
                <h2 className="text-base font-extrabold text-[#FFFDF8]">
                  Pembagian Mandan (2 Orang / Tim)
                </h2>
              </div>
              {schedule.is_host && !isLocked && schedule.teams?.length > 0 && (
                <button
                  type="button"
                  onClick={handleShuffleTeams}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#E0A928] px-3 py-1.5 text-xs font-extrabold text-[#3E2723] hover:bg-[#C48F17] disabled:opacity-50"
                >
                  <Shuffle className="h-3.5 w-3.5" /> Acak Ulang Mandan
                </button>
              )}
            </div>

            {!schedule.teams?.length ? (
              <div className="rounded-xl bg-[#FFFDF8]/10 border border-dashed border-[#EFE9DB]/25 px-4 py-3 text-xs text-[#EFE9DB]/85">
                Pasangan mandan akan otomatis diacak (2 orang per tim) begitu sudah ada{' '}
                <strong className="text-[#E0A928]">4 pemain</strong> yang konfirmasi{' '}
                <strong className="text-[#E0A928]">Hadir</strong> (saat ini {attendingList.length}
                /4).
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {schedule.teams.map((team) => (
                    <div
                      key={team.team_number}
                      className="rounded-xl border border-[#E0A928]/40 bg-[#FFFDF8]/10 p-3.5"
                    >
                      <div className="text-xs font-extrabold uppercase tracking-wider text-[#E0A928] mb-2">
                        Tim {team.team_number} • Sepasang Mandan
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#3E2723]">
                        <span className="rounded-lg bg-[#FFFDF8] px-3 py-1 shadow-xs">
                          {team.members[0]}
                        </span>
                        <span className="text-xs font-extrabold text-[#E0A928]">&amp;</span>
                        <span className="rounded-lg bg-[#FFFDF8] px-3 py-1 shadow-xs">
                          {team.members[1]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {schedule.reserve_players?.length > 0 && (
                  <div className="text-xs text-[#EFE9DB]/80">
                    Menunggu pasangan mandan:{' '}
                    <strong className="text-[#E0A928]">{schedule.reserve_players.join(', ')}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RSVP Section */}
          <div className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#B83A2D]" />
                <h2 className="text-base font-extrabold text-[#3E2723]">
                  Konfirmasi Kehadiran (RSVP)
                </h2>
              </div>
              {myRsvp && (
                <span className="text-xs text-[#7A5C52]">
                  Status tersimpan:{' '}
                  <strong className="text-[#3E2723]">
                    {myRsvp.status === 'attending'
                      ? 'Hadir'
                      : myRsvp.status === 'maybe'
                      ? 'Belum Pasti'
                      : 'Tidak Hadir'}
                  </strong>
                </span>
              )}
            </div>

            {!isLocked && (
              <div className="space-y-3">
                {quotaFull && myRsvp?.status !== 'attending' && (
                  <div className="rounded-xl bg-[#FAE6E3] border border-[#B83A2D]/35 px-3.5 py-2.5 text-xs font-bold text-[#B83A2D]">
                    Kuota meja sudah penuh ({attendingList.length}/{schedule.quota}). Pendaftaran kehadiran baru sudah ditutup.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    disabled={submitting || (quotaFull && myRsvp?.status !== 'attending')}
                    onClick={() => {
                      setSelectedRsvpStatus('attending');
                      setRsvpFeedback(null);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 px-3 text-sm font-bold transition ${
                      (selectedRsvpStatus || myRsvp?.status) === 'attending'
                        ? 'border-[#3E2723] bg-[#3E2723] text-[#E0A928] shadow-xs'
                        : 'border-[#DDD2BC] bg-[#FAF6EE] text-[#3E2723] hover:bg-[#EFE9DB] disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {quotaFull && myRsvp?.status !== 'attending' ? 'Kuota Penuh' : 'Hadir'}
                  </button>

                  <button
                    type="button"
                    disabled={submitting || (quotaFull && myRsvp?.status !== 'attending')}
                    onClick={() => {
                      setSelectedRsvpStatus('maybe');
                      setRsvpFeedback(null);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 px-3 text-sm font-bold transition ${
                      (selectedRsvpStatus || myRsvp?.status) === 'maybe'
                        ? 'border-[#E0A928] bg-[#E0A928] text-[#3E2723] shadow-xs'
                        : 'border-[#DDD2BC] bg-[#FAF6EE] text-[#3E2723] hover:bg-[#EFE9DB] disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <HelpCircle className="h-4 w-4" /> Belum Pasti
                  </button>

                  <button
                    type="button"
                    disabled={submitting || (quotaFull && myRsvp?.status !== 'attending')}
                    onClick={() => {
                      setSelectedRsvpStatus('declined');
                      setRsvpFeedback(null);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 px-3 text-sm font-bold transition ${
                      (selectedRsvpStatus || myRsvp?.status) === 'declined'
                        ? 'border-[#B83A2D] bg-[#B83A2D] text-[#FFFDF8] shadow-xs'
                        : 'border-[#DDD2BC] bg-[#FAF6EE] text-[#3E2723] hover:bg-[#EFE9DB] disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <XCircle className="h-4 w-4" /> Tidak Hadir
                  </button>
                </div>

                <button
                  type="button"
                  disabled={
                    submitting ||
                    !selectedRsvpStatus ||
                    (quotaFull && myRsvp?.status !== 'attending')
                  }
                  onClick={handleRsvp}
                  className="w-full rounded-xl bg-[#B83A2D] py-3.5 px-4 text-sm font-extrabold text-[#FFFDF8] shadow-sm hover:bg-[#982D22] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {quotaFull && myRsvp?.status !== 'attending'
                    ? `Kuota Meja Penuh (${attendingList.length}/${schedule.quota})`
                    : submitting
                    ? 'Menyimpan...'
                    : 'Simpan Konfirmasi Kehadiran'}
                </button>

                {rsvpFeedback && (
                  <div
                    className={`rounded-xl border px-3.5 py-2.5 text-xs font-bold ${
                      rsvpFeedback.type === 'success'
                        ? 'bg-[#E0A928]/25 border-[#E0A928] text-[#3E2723]'
                        : 'bg-[#FAE6E3] border-[#B83A2D]/35 text-[#B83A2D]'
                    }`}
                  >
                    {rsvpFeedback.text}
                  </div>
                )}
              </div>
            )}

            {/* Attendee Lists */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="rounded-xl bg-[#FAF6EE] border border-[#DDD2BC] p-3.5">
                <div className="text-xs font-extrabold text-[#3E2723] mb-2">
                  Hadir ({attendingList.length})
                </div>
                {attendingList.length === 0 ? (
                  <p className="text-xs text-[#7A5C52]">Belum ada</p>
                ) : (
                  <ul className="space-y-1.5">
                    {attendingList.map((r) => (
                      <li key={r.id} className="text-xs text-[#3E2723]">
                        <span className="font-bold">{r.participant_name}</span>
                        {r.note && <span className="text-[#7A5C52]"> — {r.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl bg-[#E0A928]/15 border border-[#E0A928]/40 p-3.5">
                <div className="text-xs font-extrabold text-[#3E2723] mb-2">
                  Belum Pasti ({maybeList.length})
                </div>
                {maybeList.length === 0 ? (
                  <p className="text-xs text-[#7A5C52]">Belum ada</p>
                ) : (
                  <ul className="space-y-1.5">
                    {maybeList.map((r) => (
                      <li key={r.id} className="text-xs text-[#3E2723]">
                        <span className="font-bold">{r.participant_name}</span>
                        {r.note && <span className="text-[#7A5C52]"> — {r.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl bg-[#FAE6E3]/60 border border-[#B83A2D]/25 p-3.5">
                <div className="text-xs font-extrabold text-[#B83A2D] mb-2">
                  Tidak Hadir ({declinedList.length})
                </div>
                {declinedList.length === 0 ? (
                  <p className="text-xs text-[#7A5C52]">Belum ada</p>
                ) : (
                  <ul className="space-y-1.5">
                    {declinedList.map((r) => (
                      <li key={r.id} className="text-xs text-[#3E2723]">
                        <span className="font-bold">{r.participant_name}</span>
                        {r.note && <span className="text-[#7A5C52]"> — {r.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Activity & Notification Feed */}
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs h-fit space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#B83A2D]" />
            <h2 className="text-base font-extrabold text-[#3E2723]">Kabar Meja & Aktivitas</h2>
          </div>

          {schedule.activity_logs.length === 0 ? (
            <p className="text-xs text-[#7A5C52]">Belum ada aktivitas.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {schedule.activity_logs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-2.5 text-xs border-b border-[#EFE9DB] pb-2.5 last:border-0"
                >
                  <Clock className="h-3.5 w-3.5 text-[#B83A2D] shrink-0 mt-0.5" />
                  <div>
                    <div>
                      <span className="font-bold text-[#3E2723]">{log.actor_name}</span>{' '}
                      <span className="text-[#5D4037]">{log.message}</span>
                    </div>
                    <div className="text-[11px] text-[#7A5C52] mt-0.5">
                      {formatShortDateID(
                        log.created_at?.endsWith('Z') ? log.created_at : `${log.created_at}Z`
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
