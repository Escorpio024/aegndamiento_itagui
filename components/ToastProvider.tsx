'use client';
import { createContext, useContext, useCallback, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warn';
interface ToastItem { id: number; msg: string; type: ToastType; }

const ToastCtx = createContext<(msg: string, type?: ToastType) => void>(() => {});

export function useToast() { return useContext(ToastCtx); }

const ICONS: Record<ToastType, string> = { success:'✅', error:'❌', info:'ℹ️', warn:'⚠️' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let next = 0;

  const toast = useCallback((msg: string, type: ToastType = 'info') => {
    const id = ++next;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{ICONS[t.type]}</span>
            <span className="toast-msg">{t.msg}</span>
            <button className="toast-close" onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>✕</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
