import { Code2, Coffee, Info, ShieldAlert, Users } from 'lucide-react';

const TECH_STACK = [
  {
    category: 'Frontend',
    items: ['React', 'Vite', 'Tailwind CSS v4', 'Lucide Icons'],
  },
  {
    category: 'Backend & API',
    items: ['Node.js 22', 'Express.js', 'REST API'],
  },
  {
    category: 'Database',
    items: ['PostgreSQL (Neon Serverless)', 'SQLite (node:sqlite Lokal)'],
  },
  {
    category: 'Hosting & Deployment',
    items: ['Vercel Serverless', 'GitHub'],
  },
];

const PROHIBITIONS = [
  'Pengguna dilarang membagikan akun dan password kepada orang lain.',
  'Pengguna dilarang menggunakan akun milik pengguna lain tanpa izin.',
  'Pengguna dilarang memberikan informasi ketersediaan waktu yang tidak sesuai dengan kondisi sebenarnya.',
  'Pengguna dilarang melakukan voting lebih dari satu kali pada alternatif jadwal yang sama.',
  'Pengguna dilarang memanipulasi hasil voting atau mengganggu proses penentuan jadwal.',
  'Pengguna dilarang mengubah jadwal tanpa hak akses yang sesuai.',
  'Pengguna dilarang membatalkan jadwal tanpa persetujuan Admin.',
  'Pengguna dilarang memberikan informasi tanggal, waktu, atau lokasi yang tidak benar.',
  'Pengguna dilarang melakukan spam atau mengirimkan informasi yang tidak berkaitan dengan penjadwalan.',
  'Pengguna dilarang menyalahgunakan fitur notifikasi.',
  'Pengguna dilarang mengakses, mengubah, atau menghapus data pengguna lain tanpa izin.',
  'Pengguna dilarang menggunakan website untuk kegiatan di luar tujuan penjadwalan bermain Koa.',
  'Pengguna dilarang melakukan tindakan yang dapat mengganggu keamanan dan operasional sistem.',
];

const DEVELOPERS = [
  {
    name: 'Revin Pahlevi',
    role: 'Fullstack Developer',
    photo: '/images/revin.jpg',
    imgClass: 'object-center',
  },
  {
    name: 'Rahil Akram Hammad',
    role: 'UI/UX Designer',
    photo: '/images/rahil.jpeg',
    imgClass: 'object-center',
  },
  {
    name: 'Ervizon Fariz',
    role: 'System Analyst',
    photo: '/images/ervizon.jpeg',
    imgClass: 'object-[center_36%]',
  },
];

export default function InfoTab() {
  return (
    <div className="space-y-6">
      {/* 1. Deskripsi Aplikasi */}
      <section className="relative overflow-hidden rounded-3xl bg-[#3E2723] text-[#EFE9DB] border border-[#5D4037] p-6 sm:p-7 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#E0A928]/15 blur-2xl" />
        <div className="relative space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E0A928] px-3 py-1 text-xs font-extrabold text-[#3E2723]">
            <Coffee className="h-3.5 w-3.5" /> Tentang KoaPlay
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#FFFDF8]">
            KoaPlay — Platform Penjadwalan Main Koa di Lapau
          </h2>
          <p className="text-sm text-[#EFE9DB]/90 leading-relaxed">
            <strong>KoaPlay</strong> adalah aplikasi web yang dirancang untuk mempermudah koordinasi,
            perencanaan, dan penjadwalan kegiatan bermain Koa bersama teman-teman tanpa perlu ribet
            membuat akun atau login. Melalui tautan dan kode meja unik, pengguna dapat membuat
            jadwal langsung maupun polling waktu, mengelola kuota pemain, memantau konfirmasi
            kehadiran (RSVP), membagi pasangan <strong>mandan</strong> secara otomatis (2 orang per
            tim) saat 4 pemain terkumpul, menyimpan lokasi lapau favorit dengan Google Maps, serta
            melihat riwayat dan statistik permainan.
          </p>
        </div>
      </section>

      {/* 2. Tech Stack */}
      <section className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-[#B83A2D]" />
          <h3 className="text-base font-extrabold text-[#3E2723]">Tech Stack yang Dipakai</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TECH_STACK.map((group) => (
            <div
              key={group.category}
              className="rounded-xl bg-[#FAF6EE] border border-[#DDD2BC] p-4 space-y-2"
            >
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#B83A2D]">
                {group.category}
              </div>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li key={item} className="text-sm font-semibold text-[#3E2723] flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E0A928] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Larangan Penggunaan Sistem */}
      <section className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-[#B83A2D]" />
          <h3 className="text-base font-extrabold text-[#3E2723]">
            Larangan Penggunaan Sistem KoaPlay
          </h3>
        </div>
        <ol className="space-y-2.5">
          {PROHIBITIONS.map((rule, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 rounded-xl bg-[#FAF6EE] border border-[#EFE9DB] px-3.5 py-2.5 text-sm text-[#3E2723]"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#B83A2D] text-xs font-extrabold text-[#FFFDF8]">
                {idx + 1}
              </span>
              <span className="leading-relaxed pt-0.5">{rule}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 4. Info Developer */}
      <section className="rounded-2xl bg-[#FFFDF8] border border-[#DDD2BC] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#B83A2D]" />
          <h3 className="text-base font-extrabold text-[#3E2723]">Info Developer</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DEVELOPERS.map((dev) => (
            <div
              key={dev.name}
              className="group overflow-hidden rounded-2xl border border-[#DDD2BC] bg-[#FAF6EE] p-4 text-center shadow-2xs hover:border-[#B83A2D] transition"
            >
              <div className="mx-auto mb-4 w-full max-w-[220px] aspect-[3/4] overflow-hidden rounded-2xl border-2 border-[#E0A928] bg-[#EFE9DB] shadow-sm">
                <img
                  src={dev.photo}
                  alt={dev.name}
                  className={`h-full w-full object-cover ${dev.imgClass} group-hover:scale-105 transition duration-300`}
                />
              </div>
              <div className="text-base font-extrabold text-[#3E2723]">{dev.name}</div>
              <div className="mt-1 inline-block rounded-full bg-[#3E2723] px-3 py-0.5 text-xs font-bold text-[#E0A928]">
                {dev.role}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
