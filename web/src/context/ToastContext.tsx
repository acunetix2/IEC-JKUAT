// IEC JKUAT — Toast context (one toast at a time).
// Mirrors showToast(): bottom-right card, Material Symbol icon, textContent
// message, 3000ms auto-dismiss with a 300ms fade-out. Color classes appear
// LITERALLY in JSX so Tailwind emits them.

import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  leaving: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastState | null>(null);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (dismissRef.current) clearTimeout(dismissRef.current);
    if (removeRef.current) clearTimeout(removeRef.current);
    dismissRef.current = null;
    removeRef.current = null;
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'success') => {
      clearTimers();
      setCurrent({ message, type, leaving: false });
      dismissRef.current = setTimeout(() => {
        setCurrent((c) => (c ? { ...c, leaving: true } : c));
        removeRef.current = setTimeout(() => setCurrent(null), 300);
      }, 3000);
    },
    [clearTimers]
  );

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {current && <ToastViewport state={current} />}
    </ToastContext.Provider>
  );
}

function ToastViewport({ state }: { state: ToastState }) {
  const base =
    'fixed bottom-8 right-8 z-[100] text-white rounded-xl px-6 py-4 shadow-2xl flex items-center gap-3 font-body-md text-body-md transition-all duration-300';
  const colorClass =
    state.type === 'success' ? 'bg-jkuat-green' : state.type === 'error' ? 'bg-red-500' : 'bg-tech-blue';
  const motion = state.leaving ? 'translate-y-5 opacity-0' : 'translate-y-0 opacity-100';

  return (
    <div className={`${base} ${colorClass} ${motion}`} role="status" aria-live="polite">
      <span className="material-symbols-outlined">{ICONS[state.type]}</span>
      <span>{state.message}</span>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
