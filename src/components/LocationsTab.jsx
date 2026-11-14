import { useEffect, useState } from 'react';
import { ExternalLink, MapPin, Plus, Trash2 } from 'lucide-react';
import { api } from '../api';

export default function LocationsTab() {
  const [locations, setLocations] = useState([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getLocations();
      setLocations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;
    try {
      await api.createLocation({
        name: name.trim(),
        address: address.trim(),
        maps_url: mapsUrl.trim(),
      });
      setName('');
      setAddress('');
      setMapsUrl('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    await api.deleteLocation(id);
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 text-base font-bold text-slate-900">
          <MapPin className="h-5 w-5 text-emerald-600" />
          Tambah Lokasi Bermain Baru
        </div>
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama tempat (cth: Warkop Maju)"
            className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-base sm:text-sm focus:border-emerald-500 focus:outline-none"
            required
          />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Alamat lengkap / patokan"
            className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-base sm:text-sm focus:border-emerald-500 focus:outline-none"
          />
          <input
            type="url"
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            placeholder="Link Google Maps (opsional)"
            className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-base sm:text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 sm:py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Simpan Lokasi
          </button>
        </div>
      </form>

      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4">Daftar Lokasi Tersimpan</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Memuat lokasi...</p>
        ) : locations.length === 0 ? (
          <p className="text-sm text-slate-500">
            Belum ada lokasi tersimpan. Lokasi juga otomatis tersimpan saat Anda membuat jadwal baru.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4"
              >
                <div>
                  <div className="font-semibold text-slate-900">{loc.name}</div>
                  {loc.address && <div className="text-xs text-slate-500 mt-0.5">{loc.address}</div>}
                  {loc.maps_url && (
                    <a
                      href={loc.maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline"
                    >
                      Buka di Google Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(loc.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Hapus lokasi"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
