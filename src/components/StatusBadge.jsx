const STATUS_MAP = {
  polling: {
    label: 'Voting Waktu',
    cls: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  scheduled: {
    label: 'Terjadwal',
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  completed: {
    label: 'Selesai',
    cls: 'bg-slate-200 text-slate-700 border-slate-300',
  },
  cancelled: {
    label: 'Dibatalkan',
    cls: 'bg-rose-100 text-rose-700 border-rose-200',
  },
};

export default function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || {
    label: status,
    cls: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${info.cls}`}
    >
      {info.label}
    </span>
  );
}
