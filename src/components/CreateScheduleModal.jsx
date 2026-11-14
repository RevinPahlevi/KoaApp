import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Calendar, Vote, MapPin, Users } from 'lucide-react';
import { api } from '../api';
import { getSavedPlayerName, saveHostToken, savePlayerName } from '../utils/storage';

export default function CreateScheduleModal({ onClose, onCreated }) {
  const [creatorName, setCreatorName] = useState(getSavedPlayerName());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('direct');
  const [finalStartAt, setFinalStartAt] = useState('');
  const [pollOptions, setPollOptions] = useState([
    { start_at: '', note: '' },
    { start_at: '', note: '' },
  ]);
  const [locations, setLocations] = useState([]);
  const [selectedLocId, setSelectedLocId] = useState('custom');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationMapsUrl, setLocationMapsUrl] = useState('');
  const [quota, setQuota] = useState(4);
  const [creatorAttending, setCreatorAttending] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getLocations().then(setLocations).catch(() => {});
  }, []);

  const handleSelectSavedLocation = (id) => {
    setSelectedLocId(id);
    if (id === 'custom') {
      setLocationName('');
      setLocationAddress('');
      setLocationMapsUrl('');
      return;
    }
    const found = locations.find((l) => String(l.id) === String(id));
    if (found) {
      setLocationName(found.name);
      setLocationAddress(found.address || '');
      setLocationMapsUrl(found.maps_url || '');
    }
  };

  const addPollOption = () => {
    setPollOptions((prev) => [...prev, { start_at: '', note: '' }]);
  };

  const removePollOption = (idx) => {
    setPollOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePollOption = (idx, field, val) => {
    setPollOptions((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!creatorName.trim() || !title.trim()) {
      setError('Nama Anda dan judul jadwal wajib diisi.');
      return;
    }

    if (mode === 'direct' && !finalStartAt) {
      setError('Silakan pilih tanggal & jam bermain.');
      return;
    }

    const validPollOptions = pollOptions.filter((o) => o.start_at);
    if (mode === 'polling' && validPollOptions.length < 2) {
      setError('Mode polling membutuhkan minimal 2 opsi waktu yang diisi.');
      return;
    }

    setLoading(true);
    try {
      savePlayerName(creatorName.trim());
      const created = await api.createSchedule({
        title: title.trim(),
        description: description.trim(),
        creator_name: creatorName.trim(),
        mode,
        final_start_at: mode === 'direct' ? new Date(finalStartAt).toISOString() : null,
        poll_options:
          mode === 'polling'
            ? validPollOptions.map((o) => ({
                start_at: new Date(o.start_at).toISOString(),
                note: o.note.trim(),
              }))
            : [],
        location_name: locationName.trim(),
        location_address: locationAddress.trim(),
        location_maps_url: locationMapsUrl.trim(),
        quota: Number(quota),
        creator_attending: creatorAttending,
        save_location: selectedLocId === 'custom' && Boolean(locationName.trim()),
      });

      if (created.host_token) {
        saveHostToken(created.code, created.host_token);
      }
      onCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 sm:px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Buat Jadwal Main Koa</h2>
            <p className="text-xs text-slate-500">Tanpa login — langsung bagikan link ke teman</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nama Anda <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="cth: Budi"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Judul Sesi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="cth: Koa Malam Minggu"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>
          </div>

          {/* Mode penjadwalan */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Cara Tentukan Waktu</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('direct')}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                  mode === 'direct'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Calendar className="h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <div className="text-sm font-semibold">Langsung Jadwal</div>
                  <div className="text-xs text-slate-500">Waktu sudah pasti</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('polling')}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                  mode === 'polling'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Vote className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <div className="text-sm font-semibold">Polling Dulu</div>
                  <div className="text-xs text-slate-500">Teman pilih waktu</div>
                </div>
              </button>
            </div>
          </div>

          {mode === 'direct' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tanggal & Jam Mulai <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={finalStartAt}
                onChange={(e) => setFinalStartAt(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  Opsi Waktu Polling (min. 2)
                </label>
                <button
                  type="button"
                  onClick={addPollOption}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Opsi
                </button>
              </div>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl bg-slate-50/70 sm:bg-transparent p-2.5 sm:p-0 border border-slate-200/70 sm:border-0">
                  <input
                    type="datetime-local"
                    value={opt.start_at}
                    onChange={(e) => updatePollOption(idx, 'start_at', e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt.note}
                      onChange={(e) => updatePollOption(idx, 'note', e.target.value)}
                      placeholder="Ket. (opsional)"
                      className="flex-1 sm:w-36 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm focus:border-emerald-500 focus:outline-none"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removePollOption(idx)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lokasi */}
          <div className="space-y-3 rounded-xl bg-slate-50 p-4 border border-slate-200/80">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <MapPin className="h-4 w-4 text-emerald-600" />
              Lokasi Bermain
            </div>

            {locations.length > 0 && (
              <select
                value={selectedLocId}
                onChange={(e) => handleSelectSavedLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="custom">+ Tulis lokasi baru</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.address ? `— ${loc.address}` : ''}
                  </option>
                ))}
              </select>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Nama tempat (cth: Warkop Maju)"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Alamat singkat (opsional)"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <input
              type="url"
              value={locationMapsUrl}
              onChange={(e) => setLocationMapsUrl(e.target.value)}
              placeholder="Link Google Maps (opsional, cth: https://maps.app.goo.gl/...)"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Kuota & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
                <Users className="h-4 w-4 text-slate-500" /> Kuota Pemain
              </label>
              <select
                value={quota}
                onChange={(e) => setQuota(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value={4}>4 Pemain (1 Meja Koa)</option>
                <option value={8}>8 Pemain (2 Meja Koa)</option>
                <option value={12}>12 Pemain (3 Meja Koa)</option>
                <option value={0}>Tanpa Batas Kuota</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Catatan Tambahan
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="cth: Bawa kartu cadangan"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={creatorAttending}
              onChange={(e) => setCreatorAttending(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Langsung tandai saya sebagai <strong>Hadir</strong>
          </label>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Buat & Dapatkan Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
