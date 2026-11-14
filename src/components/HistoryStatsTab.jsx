import { useEffect, useState } from 'react';
import { Award, CalendarCheck, MapPin, Trophy, Users } from 'lucide-react';
import { api } from '../api';
import { formatDateTimeID } from '../utils/storage';
import StatusBadge from './StatusBadge';

export default function HistoryStatsTab({ onSelectSchedule }) {
  const [stats, setStats] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getStats(), api.getSchedules('completed')])
      .then(([statsData, completedData]) => {
        setStats(statsData);
        setCompleted(completedData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-500">Memuat statistik & riwayat...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <CalendarCheck className="h-4 w-4 text-emerald-600" /> Total Jadwal Dibuat
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{stats?.total_schedules || 0}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Trophy className="h-4 w-4 text-amber-500" /> Sesi Selesai
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{stats?.completed_schedules || 0}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Users className="h-4 w-4 text-sky-600" /> Jadwal Aktif Saat Ini
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{stats?.active_schedules || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Players */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900 mb-4">
            <Award className="h-5 w-5 text-amber-500" /> Partisipasi Pemain
          </div>
          {!stats?.top_players?.length ? (
            <p className="text-sm text-slate-500">Belum ada data partisipasi.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.top_players.map((p, idx) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{p.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{p.games_count}x hadir</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Locations */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900 mb-4">
            <MapPin className="h-5 w-5 text-sky-600" /> Lokasi Paling Sering Dipakai
          </div>
          {!stats?.top_locations?.length ? (
            <p className="text-sm text-slate-500">Belum ada data lokasi.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.top_locations.map((loc) => (
                <div
                  key={loc.name}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm"
                >
                  <span className="font-semibold text-slate-800">{loc.name}</span>
                  <span className="text-xs font-semibold text-slate-600">{loc.usage_count}x main</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Completed Games List */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Riwayat Permainan Selesai</h3>
        {completed.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada sesi permainan yang ditandai selesai.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {completed.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectSchedule(item.code)}
                className="flex flex-wrap items-center justify-between gap-3 py-3 cursor-pointer hover:bg-slate-50 rounded-xl px-2 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{item.title}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {formatDateTimeID(item.final_start_at)} • {item.location_name || 'Tanpa lokasi'}
                  </div>
                </div>
                <div className="text-xs font-semibold text-emerald-700">
                  {item.attending_count} pemain hadir →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
