import { useEffect, useState } from 'react';
import {
  Calendar,
  Coffee,
  Hash,
  History,
  Info,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Vote,
} from 'lucide-react';
import { api } from './api';
import StatusBadge from './components/StatusBadge';
import CreateScheduleModal from './components/CreateScheduleModal';
import ScheduleDetail from './components/ScheduleDetail';
import LocationsTab from './components/LocationsTab';
import HistoryStatsTab from './components/HistoryStatsTab';
import InfoTab from './components/InfoTab';
import DashboardTab from './components/DashboardTab';
import AdminLoginPage from './components/AdminLoginPage';
import { clearAdminToken, formatDateTimeID, getAdminToken } from './utils/storage';

function parseCodeFromPath() {
  const match = window.location.pathname.match(/^\/s\/([^/]+)$/i);
  return match ? decodeURIComponent(match[1]).toUpperCase() : null;
}

function isAdminPath() {
  return window.location.pathname.toLowerCase() === '/admin';
}

export default function App() {
  const [activeCode, setActiveCode] = useState(parseCodeFromPath);
  const [showAdminLogin, setShowAdminLogin] = useState(isAdminPath);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [schedules, setSchedules] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [joinCode, setJoinCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const onPopState = () => {
      setActiveCode(parseCodeFromPath());
      setShowAdminLogin(isAdminPath());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) return;
    api
      .adminCheck()
      .then((res) => setIsAdmin(Boolean(res?.is_admin)))
      .catch(() => {
        clearAdminToken();
        setIsAdmin(false);
      });
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.getSchedules(statusFilter);
      setSchedules(data);
    } catch (err) {
      setLoadError(err.message || 'Gagal memuat daftar jadwal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCode && !showAdminLogin && activeTab === 'schedules') {
      loadSchedules();
    }
  }, [activeCode, showAdminLogin, activeTab, statusFilter]);

  const navigateToSchedule = (code) => {
    const upper = code.trim().toUpperCase();
    if (!upper) return;
    window.history.pushState({}, '', `/s/${upper}`);
    setShowAdminLogin(false);
    setActiveCode(upper);
  };

  const navigateHome = () => {
    window.history.pushState({}, '', '/');
    setShowAdminLogin(false);
    setActiveCode(null);
  };

  const navigateToAdminLogin = () => {
    window.history.pushState({}, '', '/admin');
    setActiveCode(null);
    setShowAdminLogin(true);
  };

  const handleAdminLogout = () => {
    clearAdminToken();
    setIsAdmin(false);
  };

  const handleAdminQuickDelete = async (e, s) => {
    e.stopPropagation();
    const ok = window.confirm(`Hapus jadwal "${s.title}" (${s.code}) secara permanen?`);
    if (!ok) return;
    try {
      await api.deleteSchedule(s.code);
      loadSchedules();
    } catch (err) {
      alert(err.message || 'Gagal menghapus jadwal.');
    }
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    navigateToSchedule(joinCode);
    setJoinCode('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#EFE9DB] text-[#3E2723]">
      {/* Marawa Top Accent Stripe (Merah Bata - Kuning Mustard - Cokelat Kopi) */}
      <div className="grid grid-cols-3 h-1.5 w-full">
        <div className="bg-[#B83A2D]" />
        <div className="bg-[#E0A928]" />
        <div className="bg-[#3E2723]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#DDD2BC] bg-[#FAF6EE]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <button
            onClick={() => {
              navigateHome();
              setActiveTab('schedules');
            }}
            className="flex items-center gap-3 text-left group"
          >
            <div className="relative flex h-10 w-8 items-center justify-center rounded-lg bg-[#B83A2D] text-[#FFFDF8] font-extrabold text-base shadow-sm border-2 border-[#E0A928] group-hover:-rotate-3 transition">
              K
              <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#E0A928] border border-[#3E2723]" />
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight text-[#3E2723] leading-none">
                Koa<span className="text-[#B83A2D]">Play</span>
              </div>
              <div className="text-[11px] font-medium text-[#7A5C52] mt-0.5">
                Meja Janjian Bakoa di Lapau
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {!activeCode && !showAdminLogin && (
              <nav className="hidden sm:flex items-center gap-1 mr-2 rounded-xl bg-[#EFE9DB] p-1 border border-[#DDD2BC]">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    activeTab === 'dashboard'
                      ? 'bg-[#3E2723] text-[#EFE9DB] shadow-2xs'
                      : 'text-[#5D4037] hover:text-[#3E2723]'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('schedules')}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    activeTab === 'schedules'
                      ? 'bg-[#3E2723] text-[#EFE9DB] shadow-2xs'
                      : 'text-[#5D4037] hover:text-[#3E2723]'
                  }`}
                >
                  Jadwal
                </button>
                <button
                  onClick={() => setActiveTab('locations')}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    activeTab === 'locations'
                      ? 'bg-[#3E2723] text-[#EFE9DB] shadow-2xs'
                      : 'text-[#5D4037] hover:text-[#3E2723]'
                  }`}
                >
                  Lokasi Lapau
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    activeTab === 'history'
                      ? 'bg-[#3E2723] text-[#EFE9DB] shadow-2xs'
                      : 'text-[#5D4037] hover:text-[#3E2723]'
                  }`}
                >
                  Riwayat & Statistik
                </button>
                <button
                  onClick={() => setActiveTab('info')}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    activeTab === 'info'
                      ? 'bg-[#3E2723] text-[#EFE9DB] shadow-2xs'
                      : 'text-[#5D4037] hover:text-[#3E2723]'
                  }`}
                >
                  Info Aplikasi
                </button>
              </nav>
            )}

            {isAdmin ? (
              <button
                onClick={handleAdminLogout}
                title="Keluar dari Mode Admin"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E0A928] bg-[#3E2723] px-3 py-2 text-xs font-bold text-[#E0A928] hover:bg-[#5D4037] transition"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
                <LogOut className="h-3.5 w-3.5" />
              </button>
            ) : (
              !showAdminLogin && (
                <button
                  onClick={navigateToAdminLogin}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3 py-2 text-xs font-bold text-[#3E2723] hover:bg-[#EFE9DB] transition"
                >
                  <ShieldCheck className="h-4 w-4 text-[#B83A2D]" />
                  <span>Login Admin</span>
                </button>
              )
            )}

            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#B83A2D] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-[#FFFDF8] shadow-sm hover:bg-[#982D22] active:scale-[0.98] transition"
            >
              <Plus className="h-4 w-4" /> Buat Jadwal
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-24 sm:py-7">
        {showAdminLogin ? (
          <AdminLoginPage
            onBack={navigateHome}
            onSuccess={() => {
              setIsAdmin(true);
              navigateHome();
            }}
          />
        ) : activeCode ? (
          <ScheduleDetail code={activeCode} onBack={navigateHome} />
        ) : activeTab === 'dashboard' ? (
          <DashboardTab onSelectSchedule={navigateToSchedule} />
        ) : activeTab === 'locations' ? (
          <LocationsTab />
        ) : activeTab === 'history' ? (
          <HistoryStatsTab onSelectSchedule={navigateToSchedule} />
        ) : activeTab === 'info' ? (
          <InfoTab />
        ) : (
          <div className="space-y-6">
            {/* Hero / Quick Join */}
            <div className="relative overflow-hidden rounded-3xl bg-[#3E2723] p-6 sm:p-8 text-[#EFE9DB] shadow-md border border-[#5D4037]">
              {/* Decorative warm circles */}
              <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#E0A928]/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-14 left-1/3 h-40 w-40 rounded-full bg-[#B83A2D]/20 blur-2xl" />

              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2.5 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E0A928] px-3 py-1 text-xs font-extrabold text-[#3E2723]">
                    <Coffee className="h-3.5 w-3.5" /> Tanpa Login • Langsung Main
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FFFDF8]">
                    Kumpulkan Mandan, Atur Meja Koa Tanpa Ribet
                  </h1>
                  <p className="text-xs sm:text-sm text-[#EFE9DB]/85 leading-relaxed">
                    Buat jadwal atau voting waktu, bagikan kode ke grup WhatsApp, dan biarkan sistem
                    mengacak pasangan mandan otomatis saat 4 pemain sudah kumpul.
                  </p>
                </div>

                <form
                  onSubmit={handleJoinSubmit}
                  className="flex w-full md:w-auto items-center gap-2 rounded-2xl bg-[#FFFDF8]/10 p-2 backdrop-blur-xs border border-[#EFE9DB]/20"
                >
                  <div className="relative flex-1 md:w-48">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E0A928]" />
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Kode (cth: KOA-7X92)"
                      className="w-full rounded-xl bg-transparent pl-9 pr-3 py-2.5 sm:py-2 text-base sm:text-sm font-semibold text-[#FFFDF8] placeholder:text-[#EFE9DB]/60 focus:outline-none uppercase"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#E0A928] px-4 py-2.5 sm:py-2 text-xs font-extrabold text-[#3E2723] hover:bg-[#C48F17] active:scale-[0.98] transition"
                  >
                    <Search className="h-3.5 w-3.5" /> Buka
                  </button>
                </form>
              </div>
            </div>

            {/* Admin Mode Banner */}
            {isAdmin && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#3E2723] border border-[#E0A928] px-4 py-3 text-xs text-[#EFE9DB] shadow-xs">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="h-4 w-4 text-[#E0A928]" />
                  <span>
                    Mode Admin Aktif — Anda dapat menambah, mengedit, dan menghapus seluruh jadwal meja.
                  </span>
                </div>
                <button
                  onClick={handleAdminLogout}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#E0A928] px-3 py-1 font-extrabold text-[#3E2723] hover:bg-[#C48F17]"
                >
                  <LogOut className="h-3.5 w-3.5" /> Logout Admin
                </button>
              </div>
            )}

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'Semua Meja' },
                  { key: 'scheduled', label: 'Terjadwal' },
                  { key: 'polling', label: 'Sedang Voting' },
                  { key: 'completed', label: 'Selesai' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                      statusFilter === f.key
                        ? 'bg-[#3E2723] text-[#EFE9DB] shadow-xs'
                        : 'bg-[#FAF6EE] border border-[#DDD2BC] text-[#5D4037] hover:bg-[#FFFDF8] hover:border-[#3E2723]/40'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule Cards */}
            {loading ? (
              <div className="py-14 text-center text-sm font-medium text-[#7A5C52]">
                Memuat daftar meja jadwal...
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-[#B83A2D]/30 bg-[#FAE6E3] p-6 text-center text-sm font-semibold text-[#B83A2D]">
                {loadError}
              </div>
            ) : schedules.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-[#DDD2BC] bg-[#FAF6EE] p-10 text-center">
                <Calendar className="mx-auto h-10 w-10 text-[#7A5C52]/60 mb-3" />
                <h3 className="text-base font-extrabold text-[#3E2723]">Belum Ada Meja Jadwal</h3>
                <p className="text-sm text-[#7A5C52] mt-1 mb-5">
                  Klik tombol "Buat Jadwal" untuk membuka meja permainan Koa baru.
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#B83A2D] px-5 py-2.5 text-sm font-bold text-[#FFFDF8] hover:bg-[#982D22] transition"
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
                    className="group relative overflow-hidden cursor-pointer rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs hover:border-[#B83A2D] hover:shadow-md transition flex flex-col justify-between gap-4"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#B83A2D] via-[#E0A928] to-[#3E2723] opacity-75 group-hover:opacity-100 transition" />

                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={s.status} />
                        <span className="font-mono text-xs font-bold bg-[#EFE9DB] text-[#3E2723] px-2.5 py-1 rounded-lg border border-[#DDD2BC]">
                          {s.code}
                        </span>
                      </div>

                      <h3 className="text-lg font-extrabold text-[#3E2723] group-hover:text-[#B83A2D] transition">
                        {s.title}
                      </h3>

                      <div className="space-y-1.5 text-xs font-medium text-[#5D4037]">
                        <div className="flex items-center gap-2">
                          {s.status === 'polling' ? (
                            <Vote className="h-4 w-4 text-[#E0A928] shrink-0" />
                          ) : (
                            <Calendar className="h-4 w-4 text-[#B83A2D] shrink-0" />
                          )}
                          <span>
                            {s.status === 'polling'
                              ? `Voting waktu berlangsung (${s.voter_count} orang sudah vote)`
                              : formatDateTimeID(s.final_start_at)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#3E2723] shrink-0" />
                          <span>{s.location_name || 'Lapau / lokasi belum ditentukan'}</span>
                        </div>
                      </div>

                      {s.attending_names?.length > 0 && (
                        <div className="pt-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A5C52] mb-1.5">
                            Pemain Bergabung:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {s.attending_names.map((name, idx) => (
                              <span
                                key={`${name}-${idx}`}
                                className="rounded-lg bg-[#E0A928]/20 border border-[#E0A928]/50 px-2.5 py-0.5 text-xs font-bold text-[#3E2723]"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#EFE9DB] text-xs">
                      <span className="inline-flex items-center gap-1.5 font-extrabold text-[#3E2723]">
                        <Users className="h-4 w-4 text-[#B83A2D]" />
                        {s.attending_count}
                        {s.quota > 0 ? `/${s.quota}` : ''} Pemain Hadir
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => handleAdminQuickDelete(e, s)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#FAE6E3] border border-[#B83A2D]/30 px-2.5 py-1 font-bold text-[#B83A2D] hover:bg-[#B83A2D] hover:text-[#FFFDF8] transition"
                            title="Hapus jadwal ini"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus
                          </button>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#EFE9DB] group-hover:bg-[#B83A2D] group-hover:text-[#FFFDF8] px-3 py-1 font-bold text-[#3E2723] transition">
                          {isAdmin ? 'Kelola / Edit →' : 'Ikut / Buka Meja →'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {!activeCode && !showAdminLogin && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#DDD2BC] bg-[#FAF6EE]/95 backdrop-blur-md">
          <div className="grid grid-cols-5 h-16">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${
                activeTab === 'dashboard' ? 'text-[#B83A2D]' : 'text-[#7A5C52]'
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${
                activeTab === 'schedules' ? 'text-[#B83A2D]' : 'text-[#7A5C52]'
              }`}
            >
              <Calendar className="h-5 w-5" />
              Jadwal
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${
                activeTab === 'locations' ? 'text-[#B83A2D]' : 'text-[#7A5C52]'
              }`}
            >
              <MapPin className="h-5 w-5" />
              Lokasi
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${
                activeTab === 'history' ? 'text-[#B83A2D]' : 'text-[#7A5C52]'
              }`}
            >
              <History className="h-5 w-5" />
              Riwayat
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${
                activeTab === 'info' ? 'text-[#B83A2D]' : 'text-[#7A5C52]'
              }`}
            >
              <Info className="h-5 w-5" />
              Info
            </button>
          </div>
        </nav>
      )}

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
