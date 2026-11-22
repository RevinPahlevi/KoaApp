import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastSeq = 0;

const TOAST_STYLES = {
  success: {
    container: 'bg-[#3E2723] border-[#E0A928] text-[#EFE9DB]',
    iconWrap: 'bg-[#E0A928] text-[#3E2723]',
    title: 'Berhasil',
    titleClass: 'text-[#E0A928]',
    Icon: CheckCircle2,
  },
  error: {
    container: 'bg-[#B83A2D] border-[#FAE6E3]/40 text-[#FFFDF8]',
    iconWrap: 'bg-[#FFFDF8]/20 text-[#FFFDF8]',
    title: 'Perhatian',
    titleClass: 'text-[#FFFDF8]',
    Icon: AlertCircle,
  },
  info: {
    container: 'bg-[#FFFDF8] border-[#E0A928] text-[#3E2723]',
    iconWrap: 'bg-[#E0A928]/25 text-[#3E2723]',
    title: 'Informasi',
    titleClass: 'text-[#B83A2D]',
    Icon: Info,
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info', options = {}) => {
      const id = ++toastSeq;
      const duration = options.duration ?? 3800;
      const title = options.title;
      setToasts((prev) => [...prev.slice(-3), { id, message, type, title }]);
      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
      return id;
    },
    [dismissToast]
  );

  const notify = useMemo(
    () => ({
      success: (msg, opts) => showToast(msg, 'success', opts),
      error: (msg, opts) => showToast(msg, 'error', opts),
      info: (msg, opts) => showToast(msg, 'info', opts),
    }),
    [showToast]
  );

  const value = useMemo(() => ({ showToast, dismissToast, notify }), [showToast, dismissToast, notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[70] flex flex-col gap-2.5 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
      >
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type] || TOAST_STYLES.info;
          const Icon = style.Icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto toast-pop-in flex items-start gap-3 rounded-2xl border-2 px-4 py-3.5 shadow-xl backdrop-blur-sm ${style.container}`}
            >
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${style.iconWrap}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-[11px] font-extrabold uppercase tracking-wider ${style.titleClass}`}>
                  {t.title || style.title}
                </div>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold leading-snug break-words">
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="rounded-lg p-1 opacity-75 hover:opacity-100 transition"
                aria-label="Tutup notifikasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
      dismissToast: () => {},
      notify: { success: () => {}, error: () => {}, info: () => {} },
    };
  }
  return ctx;
}
