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

  const handleRsvp = async (status) => {
    setActionError('');
    if (!playerName.trim()) {
      setActionError('Masukkan nama Anda terlebih dahulu untuk konfirmasi kehadiran.');
      return;
    }
    savePlayerName(playerName);
    setSubmitting(true);
    try {
      const updated = await api.rsvpSchedule(code, {
        participant_name: playerName.trim(),
        status,
        note: rsvpNote,
      });
      setSchedule(updated);
    } catch (err) {
      setActionError(err.message);
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
      <div className="py-16 text-center text-sm text-slate-500">Memuat detail jadwal...</div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <XCircle className="mx-auto h-10 w-10 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">Jadwal Tidak Ditemukan</h2>
        <p className="text-sm text-slate-600 mb-5">{error}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
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
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Jadwal
        </button>
        <span className="font-mono text-xs font-semibold bg-slate-200/80 text-slate-700 px-2.5 py-1 rounded-lg">
          {schedule.code}
        </span>
      </div>

      {/* Main Header Card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={schedule.status} />
              {schedule.is_host && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  <ShieldCheck className="h-3.5 w-3.5" /> Anda Pembuat Jadwal
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{schedule.title}</h1>
            <p className="text-sm text-slate-500">
              Dibuat oleh <strong className="text-slate-700">{schedule.creator_name}</strong>
              {schedule.description ? ` • ${schedule.description}` : ''}
            </p>
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            <button
              onClick={() => copyText(shareUrl, 'link')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 sm:py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {copied === 'link' ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" /> Link Disalin!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Salin Link
                </>
              )}
            </button>
            <button
              onClick={shareToWhatsApp}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 sm:py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Share2 className="h-4 w-4" /> Bagikan ke WA
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Waktu Bermain</div>
              <div className="text-sm font-semibold text-slate-900">
                {schedule.status === 'polling'
                  ? 'Menunggu hasil voting'
                  : formatDateTimeID(schedule.final_start_at)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-50 p-2.5 text-sky-700">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Lokasi</div>
              <div className="text-sm font-semibold text-slate-900">
                {schedule.location_name || 'Belum ditentukan'}
              </div>
              {schedule.location_address && (
                <div className="text-xs text-slate-500">{schedule.location_address}</div>
              )}
              {schedule.location_maps_url && (
                <a
                  href={schedule.location_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline"
                >
                  Buka Google Maps <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-slate-500">Kuota Pemain</div>
              <div className="text-sm font-semibold text-slate-900">
                {attendingList.length} {schedule.quota > 0 ? `/ ${schedule.quota}` : ''} Hadir
              </div>
              {schedule.quota > 0 && (
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      quotaFull ? 'bg-rose-500' : 'bg-emerald-500'
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <span className="text-xs font-semibold text-slate-600">Kontrol Pembuat Jadwal:</span>
            <div className="flex flex-wrap gap-2">
              {!isLocked && (
                <button
                  onClick={openEdit}
                  className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Detail
                </button>
              )}
              {schedule.status === 'scheduled' && (
                <button
                  onClick={() => handleStatusChange('completed')}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Tandai Selesai
                </button>
              )}
              {!isLocked && (
                <button
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <XCircle className="h-3.5 w-3.5" /> Batalkan
                </button>
              )}
              {hostToken && (
                <button
                  onClick={() => copyText(`${shareUrl}?host=${hostToken}`, 'hostlink')}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
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
          className="rounded-2xl bg-white border border-indigo-200 p-5 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-900">Edit Detail Jadwal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Judul jadwal"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            />
            {schedule.status !== 'polling' && (
              <input
                type="datetime-local"
                value={editStartAt}
                onChange={(e) => setEditStartAt(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            )}
            <input
              type="text"
              value={editLocName}
              onChange={(e) => setEditLocName(e.target.value)}
              placeholder="Nama lokasi"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={editLocAddress}
              onChange={(e) => setEditLocAddress(e.target.value)}
              placeholder="Alamat"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="url"
              value={editLocMaps}
              onChange={(e) => setEditLocMaps(e.target.value)}
              placeholder="Link Google Maps"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={editQuota}
              onChange={(e) => setEditQuota(Number(e.target.value))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
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
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      )}

      {/* Player Identity Box (No Login Required) */}
      {!isLocked && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Nama Anda (Tanpa Login)
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ketik nama panggilan Anda, cth: Andi"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base sm:text-sm font-medium focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Catatan Singkat (Opsional)
              </label>
              <input
                type="text"
                value={rsvpNote}
                onChange={(e) => setRsvpNote(e.target.value)}
                placeholder="cth: Agak telat 15 menit"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base sm:text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {actionError && (
            <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-medium text-rose-700">
              {actionError}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Polling Section */}
          {schedule.mode === 'polling' && (
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote className="h-5 w-5 text-amber-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    {schedule.status === 'polling'
                      ? 'Pilih Waktu yang Anda Bisa'
                      : 'Hasil Voting Waktu'}
                  </h2>
                </div>
                {schedule.status === 'polling' && (
                  <button
                    onClick={handleSubmitVote}
                    disabled={submitting}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
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
                          ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          {schedule.status === 'polling' && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-4 w-4 rounded border-slate-300 text-amber-600"
                            />
                          )}
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {formatDateTimeID(opt.start_at)}
                            </div>
                            {opt.note && <div className="text-xs text-slate-500">{opt.note}</div>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isTop && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                              Suara Terbanyak
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-700">
                            {opt.vote_count} suara
                          </span>
                          {schedule.is_host && schedule.status === 'polling' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFinalizePoll(opt.id);
                              }}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Tetapkan Final
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-2">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {opt.voters.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {opt.voters.map((voter) => (
                            <span
                              key={voter}
                              className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-700"
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
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shuffle className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Pembagian Mandan (2 Orang / Tim)
                </h2>
              </div>
              {schedule.is_host && !isLocked && schedule.teams?.length > 0 && (
                <button
                  type="button"
                  onClick={handleShuffleTeams}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                >
                  <Shuffle className="h-3.5 w-3.5" /> Acak Ulang Mandan
                </button>
              )}
            </div>

            {!schedule.teams?.length ? (
              <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-500">
                Mandan akan otomatis dipilihkan (2 orang per tim) begitu sudah ada{' '}
                <strong>4 pemain</strong> yang konfirmasi <strong>Hadir</strong> (saat ini{' '}
                {attendingList.length}/4).
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {schedule.teams.map((team) => (
                    <div
                      key={team.team_number}
                      className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5"
                    >
                      <div className="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-2">
                        Tim {team.team_number} (Mandan)
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <span className="rounded-lg bg-white border border-indigo-100 px-2.5 py-1 shadow-2xs">
                          {team.members[0]}
                        </span>
                        <span className="text-xs font-bold text-indigo-400">&amp;</span>
                        <span className="rounded-lg bg-white border border-indigo-100 px-2.5 py-1 shadow-2xs">
                          {team.members[1]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {schedule.reserve_players?.length > 0 && (
                  <div className="text-xs text-slate-500">
                    Menunggu pasangan: <strong>{schedule.reserve_players.join(', ')}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RSVP Section */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Konfirmasi Kehadiran (RSVP)</h2>
              </div>
              {myRsvp && (
                <span className="text-xs text-slate-500">
                  Status Anda:{' '}
                  <strong className="text-slate-800">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  disabled={submitting || (quotaFull && myRsvp?.status !== 'attending')}
                  onClick={() => handleRsvp('attending')}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 px-3 text-sm font-semibold transition ${
                    myRsvp?.status === 'attending'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {quotaFull && myRsvp?.status !== 'attending' ? 'Kuota Penuh' : 'Hadir'}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRsvp('maybe')}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 px-3 text-sm font-semibold transition ${
                    myRsvp?.status === 'maybe'
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <HelpCircle className="h-4 w-4" /> Belum Pasti
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRsvp('declined')}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 px-3 text-sm font-semibold transition ${
                    myRsvp?.status === 'declined'
                      ? 'border-rose-600 bg-rose-600 text-white'
                      : 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  <XCircle className="h-4 w-4" /> Tidak Hadir
                </button>
              </div>
            )}

            {/* Attendee Lists */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3.5">
                <div className="text-xs font-bold text-emerald-800 mb-2">
                  Hadir ({attendingList.length})
                </div>
                {attendingList.length === 0 ? (
                  <p className="text-xs text-slate-400">Belum ada</p>
                ) : (
                  <ul className="space-y-1.5">
                    {attendingList.map((r) => (
                      <li key={r.id} className="text-xs text-slate-800">
                        <span className="font-semibold">{r.participant_name}</span>
                        {r.note && <span className="text-slate-500"> — {r.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-3.5">
                <div className="text-xs font-bold text-amber-800 mb-2">
                  Belum Pasti ({maybeList.length})
                </div>
                {maybeList.length === 0 ? (
                  <p className="text-xs text-slate-400">Belum ada</p>
                ) : (
                  <ul className="space-y-1.5">
                    {maybeList.map((r) => (
                      <li key={r.id} className="text-xs text-slate-800">
                        <span className="font-semibold">{r.participant_name}</span>
                        {r.note && <span className="text-slate-500"> — {r.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl bg-rose-50/60 border border-rose-100 p-3.5">
                <div className="text-xs font-bold text-rose-800 mb-2">
                  Tidak Hadir ({declinedList.length})
                </div>
                {declinedList.length === 0 ? (
                  <p className="text-xs text-slate-400">Belum ada</p>
                ) : (
                  <ul className="space-y-1.5">
                    {declinedList.map((r) => (
                      <li key={r.id} className="text-xs text-slate-800">
                        <span className="font-semibold">{r.participant_name}</span>
                        {r.note && <span className="text-slate-500"> — {r.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Activity & Notification Feed */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm h-fit space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-600" />
            <h2 className="text-base font-bold text-slate-900">Aktivitas & Perubahan</h2>
          </div>

          {schedule.activity_logs.length === 0 ? (
            <p className="text-xs text-slate-400">Belum ada aktivitas.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {schedule.activity_logs.map((log) => (
                <div key={log.id} className="flex gap-2.5 text-xs border-b border-slate-100 pb-2.5 last:border-0">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div>
                      <span className="font-semibold text-slate-800">{log.actor_name}</span>{' '}
                      <span className="text-slate-600">{log.message}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
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
