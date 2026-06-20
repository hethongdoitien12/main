import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastCtx = createContext(null);

let _idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  const show = useCallback((message, { type = 'info', duration = 3500 } = {}) => {
    const id = ++_idSeq;
    setToasts(prev => [...prev.slice(-4), { id, message, type, leaving: false }]);
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toast = {
    success: (msg, opts) => show(msg, { type: 'success', ...opts }),
    error:   (msg, opts) => show(msg, { type: 'error',   ...opts }),
    info:    (msg, opts) => show(msg, { type: 'info',     ...opts }),
    warn:    (msg, opts) => show(msg, { type: 'warn',     ...opts }),
    dismiss,
  };

  const colors = {
    success: { bg: '#0e2a1e', border: '#6fcf9740', icon: '✓', iconColor: '#6fcf97', textColor: '#b8f5d4' },
    error:   { bg: '#2a0e0e', border: '#ff6b6b40', icon: '✕', iconColor: '#ff6b6b', textColor: '#ffc8c8' },
    warn:    { bg: '#2a1e0e', border: '#fdcb6e40', icon: '!', iconColor: '#fdcb6e', textColor: '#fde8a0' },
    info:    { bg: '#0e1a2e', border: '#74b9ff40', icon: 'i', iconColor: '#74b9ff', textColor: '#b8d8ff' },
  };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.info;
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 10, padding: '11px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,.5)',
              maxWidth: 340, pointerEvents: 'all',
              opacity: t.leaving ? 0 : 1,
              transform: t.leaving ? 'translateX(30px)' : 'translateX(0)',
              transition: 'opacity .25s, transform .25s',
              cursor: 'pointer',
            }} onClick={() => dismiss(t.id)}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: c.iconColor + '20', border: `1px solid ${c.iconColor}60`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: c.iconColor, flexShrink: 0,
              }}>{c.icon}</div>
              <span style={{ fontSize: 13, color: c.textColor, lineHeight: 1.4 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
