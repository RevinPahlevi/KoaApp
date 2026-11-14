const STATUS_MAP = {
  polling: {
    label: 'Voting Waktu',
    cls: 'bg-[#E0A928]/25 text-[#3E2723] border-[#E0A928]',
    dot: 'bg-[#B83A2D]',
  },
  scheduled: {
    label: 'Terjadwal',
    cls: 'bg-[#3E2723] text-[#EFE9DB] border-[#3E2723]',
    dot: 'bg-[#E0A928]',
  },
  completed: {
    label: 'Selesai',
    cls: 'bg-[#EFE9DB] text-[#5D4037] border-[#DDD2BC]',
    dot: 'bg-[#7A5C52]',
  },
  cancelled: {
    label: 'Dibatalkan',
    cls: 'bg-[#B83A2D]/15 text-[#B83A2D] border-[#B83A2D]/35',
    dot: 'bg-[#B83A2D]',
  },
};

export default function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || {
    label: status,
    cls: 'bg-[#EFE9DB] text-[#3E2723] border-[#DDD2BC]',
    dot: 'bg-[#3E2723]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${info.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${info.dot}`} />
      {info.label}
    </span>
  );
}
