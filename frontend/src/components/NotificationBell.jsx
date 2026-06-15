import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const POLL_INTERVAL = 30000;

const TYPE_ICON = {
  tip_received:        '💝',
  deposit_confirmed:   '💰',
  withdrawal_approved: '✅',
  withdrawal_rejected: '❌',
  quest_completed:     '🏆',
  system:              '📢',
};

export default function NotificationBell() {
  const { token } = useAuth();
  const [open, setOpen]       = useState(false);
  const [items, setItems]     = useState([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.notifications.list(token);
      setItems(r.notifications || []);
      setUnread(r.unread_count || 0);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open) fetchNotifications();
  };

  const markAllRead = async () => {
    try {
      await api.notifications.readAll(token);
      setItems(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await api.notifications.readOne(id, token);
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const remove = async (e, id) => {
    e.stopPropagation();
    try {
      await api.notifications.remove(id, token);
      setItems(prev => prev.filter(n => n.id !== id));
      setUnread(prev => {
        const wasUnread = items.find(n => n.id === id && !n.read);
        return wasUnread ? Math.max(0, prev - 1) : prev;
      });
    } catch {}
  };

  const relTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000)  return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff/60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)} giờ trước`;
    return `${Math.floor(diff/86400000)} ngày trước`;
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* ── Bell button ── */}
      <button onClick={handleOpen} style={{
        position: 'relative', background: open ? '#1e1e2e' : 'none',
        border: `1px solid ${open ? '#2e2e44' : 'transparent'}`,
        borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
        fontSize: 18, lineHeight: 1, transition: 'all .15s',
        color: unread > 0 ? '#a29bfe' : '#555',
      }} title="Thông báo">
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 16, height: 16, borderRadius: '50%',
            background: '#e17055', color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #0e0e17',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 340, background: '#0e0e17',
          border: '1px solid #2e2e44', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,.6)',
          zIndex: 1000, overflow: 'hidden',
        }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #1e1e2e' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#ddd' }}>
              Thông báo {unread > 0 && <span style={{ fontSize: 11, background: '#e17055', color: '#fff', borderRadius: 99, padding: '1px 7px', marginLeft: 6 }}>{unread} mới</span>}
            </span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#6C5CE7', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                Đọc tất cả
              </button>
            )}
          </div>

          {/* list */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {items.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#333', fontSize: 13 }}>
                Chưa có thông báo nào
              </div>
            )}
            {items.map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                style={{
                  display: 'flex', gap: 10, padding: '10px 14px',
                  borderBottom: '1px solid #0d0d18',
                  background: n.read ? 'transparent' : 'rgba(108,92,231,.06)',
                  cursor: n.read ? 'default' : 'pointer',
                  transition: 'background .15s',
                }}
              >
                <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>
                  {TYPE_ICON[n.type] || '📢'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: n.read ? '#888' : '#ddd', marginBottom: 2, lineHeight: 1.4 }}>
                    {n.title}
                  </div>
                  {n.body && (
                    <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, marginBottom: 3 }}>
                      {n.body}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#333' }}>{relTime(n.created_at)}</div>
                </div>
                <button onClick={(e) => remove(e, n.id)} style={{ background: 'none', border: 'none', color: '#2a2a3a', fontSize: 14, cursor: 'pointer', padding: '2px 4px', alignSelf: 'flex-start', flexShrink: 0 }} title="Xoá">
                  ✕
                </button>
                {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6C5CE7', alignSelf: 'center', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
