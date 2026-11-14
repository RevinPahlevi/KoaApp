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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#3E2723]/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#FFFDF8] shadow-2xl border border-[#DDD2BC] text-[#3E2723]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#EFE9DB] bg-[#FAF6EE] px-5 sm:px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#3E2723]">Buka Meja Jadwal Koa</h2>
            <p className="text-xs font-medium text-[#7A5C52]">
              Tanpa login — langsung bagikan link ke grup lapau
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#7A5C52] hover:bg-[#EFE9DB] hover:text-[#3E2723]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-[#FAE6E3] border border-[#B83A2D]/30 px-4 py-3 text-sm font-semibold text-[#B83A2D]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#3E2723] mb-1">
                Nama Anda <span className="text-[#B83A2D]">*</span>
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="cth: Uda Budi"
                className="w-full rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3.5 py-2.5 text-base sm:text-sm font-medium focus:border-[#B83A2D] focus:bg-[#FFFDF8] focus:outline-none focus:ring-2 focus:ring-[#B83A2D]/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#3E2723] mb-1">
                Judul Meja / Sesi <span className="text-[#B83A2D]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="cth: Bakoa Malam Minggu"
                className="w-full rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3.5 py-2.5 text-base sm:text-sm font-medium focus:border-[#B83A2D] focus:bg-[#FFFDF8] focus:outline-none focus:ring-2 focus:ring-[#B83A2D]/20"
                required
              />
            </div>
          </div>

          {/* Mode penjadwalan */}
          <div>
            <label className="block text-sm font-bold text-[#3E2723] mb-2">Cara Tentukan Waktu</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('direct')}
                className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition ${
                  mode === 'direct'
                    ? 'border-[#3E2723] bg-[#3E2723] text-[#EFE9DB] shadow-xs'
                    : 'border-[#DDD2BC] bg-[#FAF6EE] hover:bg-[#EFE9DB]/60 text-[#3E2723]'
                }`}
              >
                <Calendar
                  className={`h-5 w-5 shrink-0 ${
                    mode === 'direct' ? 'text-[#E0A928]' : 'text-[#B83A2D]'
                  }`}
                />
                <div>
                  <div className="text-sm font-bold">Langsung Jadwal</div>
                  <div
                    className={`text-xs ${
                      mode === 'direct' ? 'text-[#EFE9DB]/75' : 'text-[#7A5C52]'
                    }`}
                  >
                    Waktu sudah pasti
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('polling')}
                className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition ${
                  mode === 'polling'
                    ? 'border-[#E0A928] bg-[#E0A928]/25 text-[#3E2723] ring-1 ring-[#E0A928]'
                    : 'border-[#DDD2BC] bg-[#FAF6EE] hover:bg-[#EFE9DB]/60 text-[#3E2723]'
                }`}
              >
                <Vote className="h-5 w-5 shrink-0 text-[#B83A2D]" />
                <div>
                  <div className="text-sm font-bold">Polling Dulu</div>
                  <div className="text-xs text-[#7A5C52]">Mandan pilih waktu</div>
                </div>
              </button>
            </div>
          </div>

          {mode === 'direct' ? (
            <div>
              <label className="block text-sm font-bold text-[#3E2723] mb-1">
                Tanggal & Jam Mulai <span className="text-[#B83A2D]">*</span>
              </label>
              <input
                type="datetime-local"
                value={finalStartAt}
                onChange={(e) => setFinalStartAt(e.target.value)}
                className="w-full rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3.5 py-2.5 text-base sm:text-sm font-medium focus:border-[#B83A2D] focus:bg-[#FFFDF8] focus:outline-none"
                required
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-[#3E2723]">
                  Opsi Waktu Polling (min. 2)
                </label>
                <button
                  type="button"
                  onClick={addPollOption}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[#B83A2D] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Opsi
                </button>
              </div>
              {pollOptions.map((opt, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl bg-[#FAF6EE] p-2.5 sm:p-0 border border-[#DDD2BC] sm:border-0"
                >
                  <input
                    type="datetime-local"
                    value={opt.start_at}
                    onChange={(e) => updatePollOption(idx, 'start_at', e.target.value)}
                    className="flex-1 rounded-xl border border-[#DDD2BC] bg-[#FFFDF8] px-3 py-2 text-base sm:text-sm focus:border-[#B83A2D] focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt.note}
                      onChange={(e) => updatePollOption(idx, 'note', e.target.value)}
                      placeholder="Ket. (opsional)"
                      className="flex-1 sm:w-36 rounded-xl border border-[#DDD2BC] bg-[#FFFDF8] px-3 py-2 text-base sm:text-sm focus:border-[#B83A2D] focus:outline-none"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removePollOption(idx)}
                        className="rounded-lg p-2 text-[#7A5C52] hover:bg-[#FAE6E3] hover:text-[#B83A2D]"
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
          <div className="space-y-3 rounded-2xl bg-[#EFE9DB]/60 p-4 border border-[#DDD2BC]">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#3E2723]">
              <MapPin className="h-4 w-4 text-[#B83A2D]" />
              Lokasi Lapau / Tempat Main
            </div>

            {locations.length > 0 && (
              <select
                value={selectedLocId}
                onChange={(e) => handleSelectSavedLocation(e.target.value)}
                className="w-full rounded-xl border border-[#DDD2BC] bg-[#FFFDF8] px-3 py-2.5 text-base sm:text-sm font-medium focus:border-[#B83A2D] focus:outline-none"
              >
                <option value="custom">+ Tulis lokasi lapau baru</option>
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
                placeholder="Nama lapau (cth: Lapau Kopi Nan Lamo)"
                className="w-full rounded-xl border border-[#DDD2BC] bg-[#FFFDF8] px-3 py-2 text-base sm:text-sm focus:border-[#B83A2D] focus:outline-none"
              />
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Alamat / patokan (opsional)"
                className="w-full rounded-xl border border-[#DDD2BC] bg-[#FFFDF8] px-3 py-2 text-base sm:text-sm focus:border-[#B83A2D] focus:outline-none"
              />
            </div>
            <input
              type="url"
              value={locationMapsUrl}
              onChange={(e) => setLocationMapsUrl(e.target.value)}
              placeholder="Link Google Maps (opsional)"
              className="w-full rounded-xl border border-[#DDD2BC] bg-[#FFFDF8] px-3 py-2 text-base sm:text-sm focus:border-[#B83A2D] focus:outline-none"
            />
          </div>

          {/* Kuota & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-bold text-[#3E2723] mb-1">
                <Users className="h-4 w-4 text-[#B83A2D]" /> Kuota Pemain
              </label>
              <select
                value={quota}
                onChange={(e) => setQuota(Number(e.target.value))}
                className="w-full rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3.5 py-2.5 text-base sm:text-sm font-medium focus:border-[#B83A2D] focus:outline-none"
              >
                <option value={4}>4 Pemain (1 Meja Koa)</option>
                <option value={8}>8 Pemain (2 Meja Koa)</option>
                <option value={12}>12 Pemain (3 Meja Koa)</option>
                <option value={0}>Tanpa Batas Kuota</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-[#3E2723] mb-1">
                Catatan Tambahan
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="cth: Bawa kartu ceki cadangan"
                className="w-full rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3.5 py-2.5 text-base sm:text-sm focus:border-[#B83A2D] focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-[#3E2723] cursor-pointer">
            <input
              type="checkbox"
              checked={creatorAttending}
              onChange={(e) => setCreatorAttending(e.target.checked)}
              className="h-4 w-4 rounded border-[#DDD2BC] accent-[#B83A2D]"
            />
            <span>
              Langsung tandai saya sebagai <strong>Hadir</strong> di meja ini
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#EFE9DB]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#5D4037] hover:bg-[#EFE9DB]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#B83A2D] px-5 py-2.5 text-sm font-bold text-[#FFFDF8] shadow-sm hover:bg-[#982D22] disabled:opacity-50 transition"
            >
              {loading ? 'Menyimpan...' : 'Buat Meja & Dapatkan Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
