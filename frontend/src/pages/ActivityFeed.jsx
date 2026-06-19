import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const TYPE_META = {
  TIP_SENT:          { icon: '🎁', color: '#6fcf97', label: 'Tip',          verb: (a) => `tipped` },
  PRODUCT_PURCHASED: { icon: '🛒', color: '#74b9ff', label: 'Mua sản phẩm', verb: (a) => `purchased` },
  FANCLUB_JOINED:    { icon: '👑', color: '#fd79a8', label: 'Fan Club',      verb: (a) => `joined` },
  CREATOR_VERIFIED:  { icon: '✔',  color: '#00b894', label: 'Verified',      verb: (a) => `became Verified` },
  CREATOR_FEATURED:  { icon: '⭐', color: '#fdcb6e', label: 'Featured',      verb: (a) => `is now Featured` },
  MILESTONE_REACHED: { icon: '🏆', color: '#a29bfe', label: 'Milestone',     verb: (a) => `reached a milestone` },
};

function activityText(a) {
  switch (a.activity_type) {
    case 'TIP_SENT':
      return <><strong style={{ color: '#ddd' }}>{a.actor_username}</strong>{' tipped '}<strong style={{ color: '#6fcf97' }}>{a.target_name}</strong>{a.amount_mt > 0 && <span style={{ color: '#fdcb6e', marginLeft: 4 }}>{Number(a.amount_mt).toLocaleString()} MT</span>}</>;
    case 'PRODUCT_PURCHASED':
      return <><strong style={{ color: '#ddd' }}>{a.actor_username}</strong>{' purchased '}<strong style={{ color: '#74b9ff' }}>"{a.target_name}"</strong>{a.amount_mt > 0 && <span style={{ color: '#fdcb6e', marginLeft: 4 }}>{Number(a.amount_mt).toLocaleString()} MT</span>}</>;
    case 'FANCLUB_JOINED':
      return <><strong style={{ color: '#ddd' }}>{a.actor_username}</strong>{' joined '}<strong style={{ color: '#fd79a8' }}>{a.target_name}</strong>{' Fan Club'}{a.amount_mt > 0 && <span style={{ color: '#fdcb6e', marginLeft: 4 }}>{Number(a.amount_mt).toLocaleString()} MT/tháng</span>}</>;
    case 'CREATOR_VERIFIED':
      return <><strong style={{ color: '#00b894' }}>{a.actor_username}</strong>{' trở thành '}<strong style={{ color: '#00b894' }}>✔ Verified Creator</strong></>;
    case 'CREATOR_FEATURED':
      return <><strong style={{ color: '#fdcb6e' }}>{a.actor_username}</strong>{' được gắn '}<strong style={{ color: '#fdcb6e' }}>⭐ Featured</strong></>;
    case 'MILESTONE_REACHED':
      return <><strong style={{ color: '#a29bfe' }}>{a.actor_username}</strong>{' đạt mốc '}<strong style={{ color: '#fdcb6e' }}>{a.target_name}</strong>{' MT!'}</>;
    default:
      return <><strong style={{ color: '#ddd' }}>{a.actor_username}</strong>{' '}{a.target_name}</>;
  }
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s trước`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}p trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
  return `${Math.floor(diff / 86400)}d trước`;
}

function Avatar({ username, avatarUrl, size = 38 }) {
  const src = avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username || 'user')}`;
  return (
    <img src={src} alt={username} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#1e1e2e' }}
      onError={e => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username || '?')}`; }} />
  );
}

const TYPES = [
  { key: '', label: 'Tất cả' },
  { key: 'TIP_SENT',          label: '🎁 Tips' },
  { key: 'PRODUCT_PURCHASED', label: '🛒 Mua hàng' },
  { key: 'FANCLUB_JOINED',    label: '👑 Fan Club' },
  { key: 'CREATOR_VERIFIED',  label: '✔ Verified' },
  { key: 'CREATOR_FEATURED',  label: '⭐ Featured' },
  { key: 'MILESTONE_REACHED', label: '🏆 Milestone' },
];

export default function ActivityFeed() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore,setLoadingMore]= useState(false);
  const [hasMore,    setHasMore]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const intervalRef = useRef(null);

  const fetchPage = useCallback(async (pg, type, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: 30, page: pg });
      if (type) params.set('activity_type', type);
      const r = await fetch(`/api/activity?${params}`);
      const d = await r.json();
      const list = d.activities || [];
      setActivities(prev => append ? [...prev, ...list] : list);
      setHasMore(d.has_more);
      setPage(pg);
    } catch { /**/ }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => {
    setPage(1);
    setActivities([]);
    fetchPage(1, typeFilter, false);
  }, [typeFilter, fetchPage]);

  // Poll every 15s for new activities (only first page)
  useEffect(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      fetch(`/api/activity?limit=5&page=1${typeFilter ? `&activity_type=${typeFilter}` : ''}`)
        .then(r => r.json())
        .then(d => {
          const newItems = d.activities || [];
          if (!newItems.length) return;
          setActivities(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            const fresh = newItems.filter(a => !existingIds.has(a.id));
            return fresh.length ? [...fresh, ...prev] : prev;
          });
        }).catch(() => {});
    }, 15000);
    return () => clearInterval(intervalRef.current);
  }, [typeFilter]);

  const loadMore = () => fetchPage(page + 1, typeFilter, true);

  const S = {
    page:   { maxWidth: 860, margin: '0 auto', padding: '2rem 1rem' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 },
    h1:     { fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 },
    sub:    { fontSize: 13, color: '#555', marginTop: 4 },
    filters:{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 },
    filterBtn: (active) => ({
      padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
      background: active ? '#6C5CE7' : '#13131f',
      color:      active ? '#fff'    : '#555',
      transition: 'all .15s',
    }),
    card: { display: 'flex', gap: 12, padding: '14px 16px', background: '#0d0d16', border: '1px solid #1a1a28', borderRadius: 12, marginBottom: 10, alignItems: 'flex-start' },
    iconWrap: (color) => ({ width: 38, height: 38, borderRadius: '50%', background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }),
    text:   { fontSize: 14, color: '#aaa', lineHeight: 1.5 },
    time:   { fontSize: 11, color: '#444', marginTop: 4 },
    empty:  { textAlign: 'center', color: '#444', padding: '3rem', fontSize: 14 },
    loadMore: { width: '100%', padding: '12px', background: '#13131f', border: '1px solid #2a2a3a', borderRadius: 10, color: '#555', fontSize: 13, cursor: 'pointer', marginTop: 8 },
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.h1}>📡 Activity Feed</div>
          <div style={S.sub}>Hoạt động mới nhất trên nền tảng • Tự động cập nhật mỗi 15 giây</div>
        </div>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid #2a2a3a', borderRadius: 8, color: '#555', fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}>
          ← Quay lại
        </button>
      </div>

      {/* Filters */}
      <div style={S.filters}>
        {TYPES.map(t => (
          <button key={t.key} style={S.filterBtn(typeFilter === t.key)} onClick={() => setTypeFilter(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div style={S.empty}>Đang tải...</div>
      ) : !activities.length ? (
        <div style={S.empty}>Chưa có hoạt động nào</div>
      ) : (
        <>
          {activities.map(a => {
            const meta = TYPE_META[a.activity_type] || { icon: '📌', color: '#888' };
            return (
              <div key={a.id} style={S.card}>
                {a.actor_avatar || a.actor_username
                  ? <Avatar username={a.actor_username} avatarUrl={a.actor_avatar} />
                  : <div style={S.iconWrap(meta.color)}>{meta.icon}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.text}>{activityText(a)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <span style={S.time}>{timeAgo(a.created_at)}</span>
                    <span style={{ padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: `${meta.color}20`, color: meta.color }}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {hasMore && (
            <button style={S.loadMore} onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Đang tải...' : 'Xem thêm →'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
