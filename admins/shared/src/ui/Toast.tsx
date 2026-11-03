import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { commonUz } from '../i18n/uz';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: 'min(360px, calc(100vw - 32px))',
        }}
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const bg =
            toast.type === 'success'
              ? 'var(--accent-emerald)'
              : toast.type === 'error'
              ? 'var(--accent-rose)'
              : 'var(--accent-indigo)';
          const Icon =
            toast.type === 'success'
              ? CheckCircle2
              : toast.type === 'error'
              ? AlertCircle
              : Info;

          return (
            <div
              key={toast.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-surface)',
                border: `1px solid ${bg}`,
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                color: 'var(--text-main)',
                fontSize: '14px',
              }}
            >
              <Icon size={18} style={{ color: bg, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label={commonUz.close}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
