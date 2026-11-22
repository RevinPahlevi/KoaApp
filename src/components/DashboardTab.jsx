import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
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
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [activityMetric, setActivityMetric] = useState('sessions');
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

  // Weekly activity bar chart data (last 7 days including today)
  const weeklyActivity = useMemo(() => {
    const now = new Date();
    const days = [];
    const shortMonthFmt = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    });

    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
      const key = toLocalDateKey(d);
      const dayItems = schedulesByDate.get(key) || [];
      const completedItems = dayItems.filter((item) => item.status === 'completed');
      const sessionsCount = completedItems.length;
      const playersCount = completedItems.reduce(
        (sum, item) => sum + Number(item.attending_count || 0),
        0
      );

      days.push({
        key,
        dayName: DAY_NAMES[d.getDay()],
        shortDate: shortMonthFmt.format(d),
        isToday: offset === 0,
        sessionsCount,
        playersCount,
        totalScheduled: dayItems.length,
      });
    }
    return days;
  }, [schedulesByDate]);

  const weeklyTotals = useMemo(() => {
    const totalSessions = weeklyActivity.reduce((s, d) => s + d.sessionsCount, 0);
    const totalPlayers = weeklyActivity.reduce((s, d) => s + d.playersCount, 0);
    const activeDays = weeklyActivity.filter((d) => d.sessionsCount > 0).length;
    const maxVal = Math.max(
      1,
      ...weeklyActivity.map((d) =>
        activityMetric === 'sessions' ? d.sessionsCount : d.playersCount
      )
    );
    return { totalSessions, totalPlayers, activeDays, maxVal };
  }, [weeklyActivity, activityMetric]);

  const teamList = data?.team_leaderboard || [];
  const playerList = data?.player_leaderboard || [];
  const displayedTeams = showAllTeams ? teamList : teamList.slice(0, 5);
  const displayedPlayers = showAllPlayers ? playerList : playerList.slice(0, 5);

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

          {!teamList.length ? (
            <p className="text-sm text-[#7A5C52] py-4">
              Belum ada data kemenangan mandan. Tandai sesi selesai dan pilih tim pemenang.
            </p>
          ) : (
            <div className="space-y-2.5">
              {displayedTeams.map((team, idx) => (
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

              {teamList.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllTeams((prev) => !prev)}
                  className="mt-1 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3.5 py-2 text-xs font-extrabold text-[#3E2723] hover:bg-[#EFE9DB] transition"
                >
                  {showAllTeams ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5 text-[#B83A2D]" /> Tampilkan 5 Teratas
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5 text-[#B83A2D]" /> Tampilkan Semua (
                      {teamList.length})
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Leaderboard per Orangan */}
        <section className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#B83A2D]" />
            <div>
              <h3 className="text-base font-extrabold text-[#3E2723]">Leaderboard per Orangan</h3>
              <p className="text-xs text-[#7A5C52]">
                Peringkat individu berdasarkan menang &amp; sesi selesai
              </p>
            </div>
          </div>

          {!playerList.length ? (
            <p className="text-sm text-[#7A5C52] py-4">
              Belum ada data pemain. Pemain terhitung main setelah jadwal ditandai selesai.
            </p>
          ) : (
            <div className="space-y-2.5">
              {displayedPlayers.map((p, idx) => (
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

              {playerList.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllPlayers((prev) => !prev)}
                  className="mt-1 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3.5 py-2 text-xs font-extrabold text-[#3E2723] hover:bg-[#EFE9DB] transition"
                >
                  {showAllPlayers ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5 text-[#B83A2D]" /> Tampilkan 5 Teratas
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5 text-[#B83A2D]" /> Tampilkan Semua (
                      {playerList.length})
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Visualisasi Keaktifan Mingguan (Grafik Batang 7 Hari Terakhir) */}
      <section className="rounded-3xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#B83A2D]" />
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#3E2723]">
                Keaktifan Bermain (7 Hari Terakhir)
              </h2>
              <p className="text-xs text-[#7A5C52]">
                Grafik batang keaktifan per hari berdasarkan sesi permainan yang telah ditandai selesai
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-xl bg-[#EFE9DB] p-1 border border-[#DDD2BC]">
            <button
              type="button"
              onClick={() => setActivityMetric('sessions')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activityMetric === 'sessions'
                  ? 'bg-[#3E2723] text-[#E0A928] shadow-2xs'
                  : 'text-[#5D4037] hover:text-[#3E2723]'
              }`}
            >
              Sesi Main
            </button>
            <button
              type="button"
              onClick={() => setActivityMetric('players')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activityMetric === 'players'
                  ? 'bg-[#3E2723] text-[#E0A928] shadow-2xs'
                  : 'text-[#5D4037] hover:text-[#3E2723]'
              }`}
            >
              Pemain Main
            </button>
          </div>
        </div>

        {/* Summary Pills */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#FAF6EE] border border-[#EFE9DB] px-3.5 py-2.5">
            <div className="text-[11px] font-bold text-[#7A5C52]">Sesi Minggu Ini</div>
            <div className="text-lg sm:text-xl font-extrabold text-[#3E2723]">
              {weeklyTotals.totalSessions}
            </div>
          </div>
          <div className="rounded-xl bg-[#FAF6EE] border border-[#EFE9DB] px-3.5 py-2.5">
            <div className="text-[11px] font-bold text-[#7A5C52]">Total Pemain Main</div>
            <div className="text-lg sm:text-xl font-extrabold text-[#B83A2D]">
              {weeklyTotals.totalPlayers}
            </div>
          </div>
          <div className="rounded-xl bg-[#FAF6EE] border border-[#EFE9DB] px-3.5 py-2.5">
            <div className="text-[11px] font-bold text-[#7A5C52]">Hari Aktif</div>
            <div className="text-lg sm:text-xl font-extrabold text-[#3E2723]">
              {weeklyTotals.activeDays}{' '}
              <span className="text-xs font-bold text-[#7A5C52]">/ 7 hari</span>
            </div>
          </div>
        </div>

        {/* Bar Chart Canvas */}
        <div className="rounded-2xl bg-[#FAF6EE] border border-[#DDD2BC] p-4 sm:p-5">
          <div className="relative h-52 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-1">
            {/* Subtle horizontal reference lines */}
            <div className="pointer-events-none absolute inset-x-0 top-6 bottom-1 flex flex-col justify-between">
              <div className="border-t border-dashed border-[#DDD2BC]/80 w-full" />
              <div className="border-t border-dashed border-[#DDD2BC]/80 w-full" />
              <div className="border-t border-dashed border-[#DDD2BC]/80 w-full" />
              <div className="border-t border-[#DDD2BC] w-full" />
            </div>

            {weeklyActivity.map((day) => {
              const value =
                activityMetric === 'sessions' ? day.sessionsCount : day.playersCount;
              const barHeightPx =
                value > 0 ? Math.max(18, Math.round((value / weeklyTotals.maxVal) * 144)) : 4;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => {
                    setSelectedDateKey(day.key);
                    const d = new Date(`${day.key}T00:00:00`);
                    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  }}
                  title={`${day.dayName}, ${day.shortDate}: ${day.sessionsCount} sesi selesai, ${day.playersCount} pemain main`}
                  className="group relative z-10 flex-1 h-full flex flex-col items-center justify-end focus:outline-none"
                >
                  {/* Value label above bar */}
                  <span
                    className={`mb-1.5 text-xs font-extrabold transition ${
                      value > 0
                        ? day.isToday
                          ? 'text-[#B83A2D]'
                          : 'text-[#3E2723]'
                        : 'text-[#7A5C52]/55'
                    }`}
                  >
                    {value}
                  </span>

                  {/* Bar track & fill */}
                  <div className="w-full max-w-[46px] flex items-end justify-center">
                    <div
                      style={{ height: `${barHeightPx}px` }}
                      className={`w-full rounded-t-xl transition-all duration-300 ${
                        value === 0
                          ? 'bg-[#DDD2BC]/70'
                          : day.isToday
                          ? 'bg-gradient-to-t from-[#B83A2D] to-[#E0A928] shadow-xs group-hover:brightness-105'
                          : 'bg-gradient-to-t from-[#3E2723] to-[#5D4037] group-hover:from-[#B83A2D] group-hover:to-[#E0A928]'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* X-Axis Day Labels */}
          <div className="mt-2.5 grid grid-cols-7 gap-2 sm:gap-4 text-center">
            {weeklyActivity.map((day) => (
              <div key={`label-${day.key}`} className="flex flex-col items-center">
                <span
                  className={`text-xs font-extrabold ${
                    day.isToday ? 'text-[#B83A2D]' : 'text-[#3E2723]'
                  }`}
                >
                  {day.dayName}
                </span>
                <span className="text-[10px] font-semibold text-[#7A5C52]">{day.shortDate}</span>
                {day.isToday && (
                  <span className="mt-0.5 rounded-full bg-[#B83A2D] px-1.5 py-0.2 text-[9px] font-extrabold text-[#FFFDF8]">
                    Hari ini
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

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
    </div>
  );
}
