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
    return (
      <div className="py-12 text-center text-sm font-medium text-[#7A5C52]">
        Memuat statistik & riwayat...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#7A5C52]">
            <CalendarCheck className="h-4 w-4 text-[#B83A2D]" /> Total Meja Dibuat
          </div>
          <div className="mt-2 text-3xl font-extrabold text-[#3E2723]">
            {stats?.total_schedules || 0}
          </div>
        </div>
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#7A5C52]">
            <Trophy className="h-4 w-4 text-[#E0A928]" /> Sesi Selesai
          </div>
          <div className="mt-2 text-3xl font-extrabold text-[#3E2723]">
            {stats?.completed_schedules || 0}
          </div>
        </div>
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#7A5C52]">
            <Users className="h-4 w-4 text-[#3E2723]" /> Meja Aktif Saat Ini
          </div>
          <div className="mt-2 text-3xl font-extrabold text-[#3E2723]">
            {stats?.active_schedules || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Players */}
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs">
          <div className="flex items-center gap-2 text-base font-extrabold text-[#3E2723] mb-4">
            <Award className="h-5 w-5 text-[#E0A928]" /> Mandan Paling Rajin Hadir
          </div>
          {!stats?.top_players?.length ? (
            <p className="text-sm text-[#7A5C52]">Belum ada data partisipasi.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.top_players.map((p, idx) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between rounded-xl bg-[#FAF6EE] border border-[#EFE9DB] px-3.5 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E0A928] text-xs font-extrabold text-[#3E2723]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-[#3E2723]">{p.name}</span>
                  </div>
                  <span className="text-xs font-bold text-[#B83A2D]">{p.games_count}x main</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Locations */}
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs">
          <div className="flex items-center gap-2 text-base font-extrabold text-[#3E2723] mb-4">
            <MapPin className="h-5 w-5 text-[#B83A2D]" /> Lapau Paling Sering Dipakai
          </div>
          {!stats?.top_locations?.length ? (
            <p className="text-sm text-[#7A5C52]">Belum ada data lokasi.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.top_locations.map((loc) => (
                <div
                  key={loc.name}
                  className="flex items-center justify-between rounded-xl bg-[#FAF6EE] border border-[#EFE9DB] px-3.5 py-2.5 text-sm"
                >
                  <span className="font-bold text-[#3E2723]">{loc.name}</span>
                  <span className="text-xs font-bold text-[#7A5C52]">{loc.usage_count}x sesi</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Completed Games List */}
      <div className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs space-y-4">
        <h3 className="text-base font-extrabold text-[#3E2723]">Riwayat Permainan Selesai</h3>
        {completed.length === 0 ? (
          <p className="text-sm text-[#7A5C52]">Belum ada sesi permainan yang ditandai selesai.</p>
        ) : (
          <div className="divide-y divide-[#EFE9DB]">
            {completed.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectSchedule(item.code)}
                className="flex flex-wrap items-center justify-between gap-3 py-3 cursor-pointer hover:bg-[#FAF6EE] rounded-xl px-2 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#3E2723]">{item.title}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="text-xs text-[#7A5C52] mt-0.5">
                    {formatDateTimeID(item.final_start_at)} • {item.location_name || 'Tanpa lokasi'}
                  </div>
                </div>
                <div className="text-xs font-extrabold text-[#B83A2D]">
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
