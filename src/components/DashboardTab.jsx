import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Trophy,
  Users,
} from 'lucide-react';
import { api } from '../api';
import StatusBadge from './StatusBadge';
import { formatDateTimeID } from '../utils/storage';

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function toLocalDateKey(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DashboardTab({ onSelectSchedule }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toLocalDateKey(new Date()));

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const schedulesByDate = useMemo(() => {
    const map = new Map();
    for (const s of data?.calendar_schedules || []) {
      const key = toLocalDateKey(s.final_start_at);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return map;
  }, [data]);

  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIdx = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDayIdx; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      cells.push({
        day: d,
        key: toLocalDateKey(dateObj),
      });
    }
    return cells;
  }, [currentMonth]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
    }).format(currentMonth);
  }, [currentMonth]);

  const selectedSchedules = schedulesByDate.get(selectedDateKey) || [];
  const todayKey = toLocalDateKey(new Date());

  const prevMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  if (loading) {
    return (
      <div className="py-12 text-center text-sm font-medium text-[#7A5C52]">
        Memuat dashboard & leaderboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kalender Jadwal */}
      <section className="rounded-3xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#B83A2D]" />
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#3E2723]">
                Kalender Jadwal Main Koa
              </h2>
              <p className="text-xs text-[#7A5C52]">
                Tanggal yang memiliki jadwal ditandai — klik tanggal untuk melihat detailnya
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] p-2 text-[#3E2723] hover:bg-[#EFE9DB]"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[130px] text-center text-sm font-extrabold text-[#3E2723] capitalize">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] p-2 text-[#3E2723] hover:bg-[#EFE9DB]"
              title="Bulan berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-3 space-y-2">
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {DAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#7A5C52]"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="h-12 sm:h-14" />;
                }
                const items = schedulesByDate.get(cell.key) || [];
                const hasSchedule = items.length > 0;
                const hasActive = items.some((i) => i.status === 'scheduled');
                const isSelected = selectedDateKey === cell.key;
                const isToday = todayKey === cell.key;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setSelectedDateKey(cell.key)}
                    className={`relative flex flex-col items-center justify-center h-12 sm:h-14 rounded-xl border text-sm font-bold transition ${
                      isSelected
                        ? 'border-[#3E2723] bg-[#3E2723] text-[#E0A928] shadow-xs'
                        : hasActive
                        ? 'border-[#B83A2D] bg-[#FAE6E3] text-[#B83A2D] hover:bg-[#B83A2D]/20'
                        : hasSchedule
                        ? 'border-[#E0A928] bg-[#E0A928]/25 text-[#3E2723] hover:bg-[#E0A928]/40'
                        : isToday
                        ? 'border-[#3E2723]/50 bg-[#FAF6EE] text-[#3E2723]'
                        : 'border-[#EFE9DB] bg-[#FAF6EE]/60 text-[#5D4037] hover:bg-[#EFE9DB]'
                    }`}
                  >
                    <span>{cell.day}</span>
                    {hasSchedule && (
                      <span
                        className={`mt-0.5 flex items-center gap-0.5 text-[10px] font-extrabold ${
                          isSelected
                            ? 'text-[#E0A928]'
                            : hasActive
                            ? 'text-[#B83A2D]'
                            : 'text-[#3E2723]'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSelected
                              ? 'bg-[#E0A928]'
                              : hasActive
                              ? 'bg-[#B83A2D]'
                              : 'bg-[#3E2723]'
                          }`}
                        />
                        {items.length > 1 ? items.length : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] font-semibold text-[#7A5C52]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#B83A2D]" /> Terjadwal
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E0A928]" /> Selesai
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#3E2723]" /> Tanggal Dipilih
              </span>
            </div>
          </div>

          {/* Selected Date Details */}
          <div className="lg:col-span-2 rounded-2xl bg-[#FAF6EE] border border-[#DDD2BC] p-4 space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#B83A2D]">
              Jadwal Tanggal{' '}
              {new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date(`${selectedDateKey}T00:00:00`))}
            </div>

            {selectedSchedules.length === 0 ? (
              <p className="text-xs text-[#7A5C52] py-6 text-center">
                Tidak ada jadwal bermain pada tanggal ini.
              </p>
            ) : (
              <div className="space-y-2.5">
                {selectedSchedules.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => onSelectSchedule(s.code)}
                    className="cursor-pointer rounded-xl bg-[#FFFDF8] border border-[#DDD2BC] p-3.5 hover:border-[#B83A2D] transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={s.status} />
                      <span className="font-mono text-[11px] font-bold text-[#7A5C52]">
                        {s.code}
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-[#3E2723]">{s.title}</div>
                    <div className="text-xs text-[#5D4037]">
                      {formatDateTimeID(s.final_start_at)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#7A5C52] pt-1">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-[#B83A2D]" />
                        {s.location_name || 'Tanpa lokasi'}
                      </span>
                      <span className="font-bold text-[#3E2723]">
                        {s.attending_count}
                        {s.quota > 0 ? `/${s.quota}` : ''} Hadir
                      </span>
                    </div>
                    {s.winner && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-[#E0A928]/25 px-2 py-0.5 text-[11px] font-extrabold text-[#3E2723]">
                        <Trophy className="h-3 w-3 text-[#B83A2D]" /> Pemenang:{' '}
                        {s.winner.members?.join(' & ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leaderboard per Mandan */}
        <section className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#E0A928]" />
            <div>
              <h3 className="text-base font-extrabold text-[#3E2723]">Leaderboard per Mandan</h3>
              <p className="text-xs text-[#7A5C52]">Peringkat pasangan tim berdasarkan kemenangan</p>
            </div>
          </div>

          {!data?.team_leaderboard?.length ? (
            <p className="text-sm text-[#7A5C52] py-4">
              Belum ada data kemenangan mandan. Tandai sesi selesai dan pilih tim pemenang.
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.team_leaderboard.map((team, idx) => (
                <div
                  key={team.pair_name}
                  className="flex items-center justify-between rounded-xl bg-[#FAF6EE] border border-[#EFE9DB] px-3.5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                        idx === 0
                          ? 'bg-[#E0A928] text-[#3E2723]'
                          : idx === 1
                          ? 'bg-[#3E2723] text-[#EFE9DB]'
                          : idx === 2
                          ? 'bg-[#B83A2D] text-[#FFFDF8]'
                          : 'bg-[#EFE9DB] text-[#5D4037]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-sm font-extrabold text-[#3E2723]">{team.pair_name}</div>
                      <div className="text-[11px] text-[#7A5C52]">{team.matches}x main bareng</div>
                    </div>
                  </div>
                  <span className="rounded-lg bg-[#3E2723] px-2.5 py-1 text-xs font-extrabold text-[#E0A928]">
                    {team.wins} Menang
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Leaderboard per Orangan */}
        <section className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#B83A2D]" />
            <div>
              <h3 className="text-base font-extrabold text-[#3E2723]">Leaderboard per Orangan</h3>
              <p className="text-xs text-[#7A5C52]">Peringkat individu berdasarkan menang & hadir</p>
            </div>
          </div>

          {!data?.player_leaderboard?.length ? (
            <p className="text-sm text-[#7A5C52] py-4">Belum ada data pemain.</p>
          ) : (
            <div className="space-y-2.5">
              {data.player_leaderboard.map((p, idx) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between rounded-xl bg-[#FAF6EE] border border-[#EFE9DB] px-3.5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                        idx === 0
                          ? 'bg-[#E0A928] text-[#3E2723]'
                          : idx === 1
                          ? 'bg-[#3E2723] text-[#EFE9DB]'
                          : idx === 2
                          ? 'bg-[#B83A2D] text-[#FFFDF8]'
                          : 'bg-[#EFE9DB] text-[#5D4037]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-sm font-extrabold text-[#3E2723]">{p.name}</div>
                      <div className="text-[11px] text-[#7A5C52] inline-flex items-center gap-1">
                        <Users className="h-3 w-3" /> {p.games_count}x main
                      </div>
                    </div>
                  </div>
                  <span className="rounded-lg bg-[#B83A2D] px-2.5 py-1 text-xs font-extrabold text-[#FFFDF8]">
                    {p.wins} Menang
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
