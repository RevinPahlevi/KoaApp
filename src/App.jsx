import { useEffect, useState } from 'react';
import {
  Calendar,
  Hash,
  History,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Users,
  Vote,
} from 'lucide-react';
import { api } from './api';
import StatusBadge from './components/StatusBadge';
import CreateScheduleModal from './components/CreateScheduleModal';
import ScheduleDetail from './components/ScheduleDetail';
import LocationsTab from './components/LocationsTab';
import HistoryStatsTab from './components/HistoryStatsTab';
import { formatDateTimeID } from './utils/storage';

function parseCodeFromPath() {
  const match = window.location.pathname.match(/^\/s\/([^/]+)$/i);
  return match ? decodeURIComponent(match[1]).toUpperCase() : null;
}

export default function App() {
  const [activeCode, setActiveCode] = useState(parseCodeFromPath);
  const [activeTab, setActiveTab] = useState('schedules');
  const [schedules, setSchedules] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [joinCode, setJoinCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onPopState = () => {
      setActiveCode(parseCodeFromPath());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await api.getSchedules(statusFilter);
      setSchedules(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCode && activeTab === 'schedules') {
      loadSchedules();
    }
  }, [activeCode, activeTab, statusFilter]);

  const navigateToSchedule = (code) => {
    const upper = code.trim().toUpperCase();
    if (!upper) return;
    window.history.pushState({}, '', `/s/${upper}`);
    setActiveCode(upper);
  };

  const navigateHome = () => {
    window.history.pushState({}, '', '/');
    setActiveCode(null);
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    navigateToSchedule(joinCode);
    setJoinCode('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <button
            onClick={() => {
              navigateHome();
              setActiveTab('schedules');
            }}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-lg shadow-xs">
              K
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-slate-900 leading-none">
                KoaPlay
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Jadwal Main Koa Tanpa Login</div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {!activeCode && (
              <nav className="hidden sm:flex items-center gap-1 mr-2">
                <button
                  onClick={() => setActiveTab('schedules')}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    activeTab === 'schedules'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Jadwal
                </button>
                <button
                  onClick={() => setActiveTab('locations')}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    activeTab === 'locations'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Lokasi
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    activeTab === 'history'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Riwayat & Statistik
                </button>
              </nav>
            )}

            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" /> Buat Jadwal
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {!activeCode && (
          <div className="flex sm:hidden border-t border-slate-100 px-4 py-2 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('schedules')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                activeTab === 'schedules' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'
              }`}
            >
              Jadwal
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                activeTab === 'locations' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'
              }`}
            >
              Lokasi
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                activeTab === 'history' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'
              }`}
            >
              Riwayat & Statistik
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {activeCode ? (
          <ScheduleDetail code={activeCode} onBack={navigateHome} />
        ) : activeTab === 'locations' ? (
          <LocationsTab />
        ) : activeTab === 'history' ? (
          <HistoryStatsTab onSelectSchedule={navigateToSchedule} />
        ) : (
          <div className="space-y-6">
            {/* Hero / Quick Join */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-6 text-white shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-1.5 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                    <Sparkles className="h-3.5 w-3.5" /> Tanpa Daftar & Tanpa Login
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold">
                    Atur Jadwal Main Koa Bareng Teman dalam Hitungan Detik
                  </h1>
                  <p className="text-xs sm:text-sm text-emerald-100">
                    Buat jadwal atau polling waktu, bagikan link ke grup WhatsApp, dan pantau siapa
                    saja yang hadir secara terpusat.
                  </p>
                </div>

                <form
                  onSubmit={handleJoinSubmit}
                  className="flex w-full md:w-auto items-center gap-2 rounded-xl bg-white/10 p-1.5 backdrop-blur-xs border border-white/20"
                >
                  <div className="relative flex-1 md:w-48">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-200" />
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Kode (cth: KOA-7X92)"
                      className="w-full rounded-lg bg-transparent pl-9 pr-3 py-2 text-sm text-white placeholder:text-emerald-200/80 focus:outline-none uppercase"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
                  >
                    <Search className="h-3.5 w-3.5" /> Buka
                  </button>
                </form>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'Semua' },
                  { key: 'scheduled', label: 'Terjadwal' },
                  { key: 'polling', label: 'Sedang Voting' },
                  { key: 'completed', label: 'Selesai' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      statusFilter === f.key
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule Cards */}
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">Memuat daftar jadwal...</div>
            ) : schedules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <Calendar className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-800">Belum Ada Jadwal</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">
                  Klik tombol "Buat Jadwal" untuk membuat sesi bermain Koa pertama Anda.
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" /> Buat Jadwal Sekarang
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedules.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => navigateToSchedule(s.code)}
                    className="group cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={s.status} />
                        <span className="font-mono text-xs font-semibold text-slate-500">
                          {s.code}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition">
                        {s.title}
                      </h3>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          {s.status === 'polling' ? (
                            <Vote className="h-4 w-4 text-amber-500 shrink-0" />
                          ) : (
                            <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                          )}
                          <span>
                            {s.status === 'polling'
                              ? `Voting waktu berlangsung (${s.voter_count} orang sudah vote)`
                              : formatDateTimeID(s.final_start_at)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-sky-600 shrink-0" />
                          <span>{s.location_name || 'Lokasi belum ditentukan'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="text-slate-500">
                        Host: <strong className="text-slate-700">{s.creator_name}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <Users className="h-3.5 w-3.5" />
                        {s.attending_count}
                        {s.quota > 0 ? `/${s.quota}` : ''} Hadir
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateScheduleModal
          onClose={() => setShowCreate(false)}
          onCreated={(created) => {
            setShowCreate(false);
            navigateToSchedule(created.code);
          }}
        />
      )}
    </div>
  );
}
