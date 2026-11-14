import { useEffect, useState } from 'react';
import { Award, CalendarCheck, Camera, MapPin, Trophy, Users, X } from 'lucide-react';
import { api } from '../api';
import { formatDateTimeID } from '../utils/storage';
import StatusBadge from './StatusBadge';

export default function HistoryStatsTab({ onSelectSchedule }) {
  const [stats, setStats] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePhotoItem, setActivePhotoItem] = useState(null);

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

  const galleryItems = completed.filter((item) => Boolean(item.proof_photo));

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

      {/* Galeri Foto Bermain */}
      <div className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-[#B83A2D]" />
            <h3 className="text-base font-extrabold text-[#3E2723]">Galeri Foto Bermain</h3>
          </div>
          {galleryItems.length > 0 && (
            <span className="rounded-full bg-[#FAF6EE] border border-[#DDD2BC] px-2.5 py-0.5 text-xs font-bold text-[#7A5C52]">
              {galleryItems.length} foto
            </span>
          )}
        </div>

        {galleryItems.length === 0 ? (
          <p className="text-sm text-[#7A5C52]">
            Belum ada foto bukti bermain yang diunggah. Foto yang diunggah saat menandai sesi selesai akan muncul di sini.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleryItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePhotoItem(item)}
                className="group overflow-hidden rounded-2xl border border-[#DDD2BC] bg-[#FAF6EE] text-left transition hover:border-[#E0A928] hover:shadow-sm"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#EFE9DB]">
                  <img
                    src={item.proof_photo}
                    alt={`Dokumentasi ${item.title}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-3 space-y-1">
                  <div className="font-bold text-sm text-[#3E2723] line-clamp-1">
                    {item.title}
                  </div>
                  <div className="text-xs text-[#7A5C52] line-clamp-1">
                    {formatDateTimeID(item.final_start_at)} • {item.location_name || 'Tanpa lokasi'}
                  </div>
                  {item.winner?.members?.length > 0 && (
                    <div className="inline-flex items-center gap-1 rounded-lg bg-[#3E2723] px-2 py-0.5 text-[11px] font-bold text-[#E0A928]">
                      <Trophy className="h-3 w-3" />
                      Tim {item.winner.team_number}: {item.winner.members.join(' & ')}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
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
                <div className="flex items-center gap-3">
                  {item.proof_photo && (
                    <img
                      src={item.proof_photo}
                      alt={item.title}
                      className="h-11 w-14 rounded-lg object-cover border border-[#DDD2BC] shrink-0"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#3E2723]">{item.title}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="text-xs text-[#7A5C52] mt-0.5">
                      {formatDateTimeID(item.final_start_at)} • {item.location_name || 'Tanpa lokasi'}
                    </div>
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

      {/* Gallery Lightbox Modal */}
      {activePhotoItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setActivePhotoItem(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-4 shadow-xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePhotoItem(null)}
              className="absolute right-5 top-5 z-10 rounded-full bg-[#3E2723]/85 p-1.5 text-[#FFFDF8] hover:bg-[#3E2723]"
              aria-label="Tutup galeri"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={activePhotoItem.proof_photo}
              alt={`Dokumentasi ${activePhotoItem.title}`}
              className="max-h-[65vh] w-full rounded-xl object-contain bg-[#FAF6EE]"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div>
                <h4 className="text-base font-extrabold text-[#3E2723]">{activePhotoItem.title}</h4>
                <p className="text-xs text-[#7A5C52]">
                  {formatDateTimeID(activePhotoItem.final_start_at)} •{' '}
                  {activePhotoItem.location_name || 'Tanpa lokasi'}
                </p>
                {activePhotoItem.winner?.members?.length > 0 && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#B83A2D]">
                    <Trophy className="h-3.5 w-3.5 text-[#E0A928]" />
                    Pemenang Tim {activePhotoItem.winner.team_number}:{' '}
                    {activePhotoItem.winner.members.join(' & ')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const code = activePhotoItem.code;
                  setActivePhotoItem(null);
                  onSelectSchedule(code);
                }}
                className="rounded-xl bg-[#3E2723] px-3.5 py-2 text-xs font-bold text-[#EFE9DB] hover:bg-[#5D4037]"
              >
                Lihat Detail Jadwal →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
