import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const S = {
  page: { background: '#0a0a0f', color: '#e8e6e0', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 5%', height: 64, borderBottom: '1px solid #1e1e2e',
    position: 'sticky', top: 0, background: 'rgba(10,10,15,0.92)',
    backdropFilter: 'blur(12px)', zIndex: 100,
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  navLogoIcon: {
    width: 36, height: 36, background: 'linear-gradient(135deg,#7c6af7,#a78bfa)',
    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800, color: '#fff',
  },
  navLogoText: { fontSize: 18, fontWeight: 700, color: '#fff' },
  navActions: { display: 'flex', gap: 12, alignItems: 'center' },
  btnOutline: {
    padding: '8px 18px', borderRadius: 8, border: '1px solid #3a3a5c',
    background: 'transparent', color: '#b8b4cc', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', transition: 'all .2s',
  },
  btnPrimary: {
    padding: '8px 20px', borderRadius: 8,
    background: 'linear-gradient(135deg,#7c6af7,#a78bfa)',
    color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
  },
  body: { maxWidth: 1200, margin: '0 auto', padding: '48px 5% 80px' },
  header: { marginBottom: 32 },
  breadcrumb: {
    fontSize: 13, color: '#555', marginBottom: 16, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  h1: { fontSize: 'clamp(24px,4vw,32px)', fontWeight: 800, color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: '#666' },
  filters: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' },
  search: {
    flex: 1, minWidth: 200, padding: '10px 14px', background: '#111118',
    border: '1px solid #2a2a3a', borderRadius: 10, color: '#ddd',
    fontSize: 14, outline: 'none',
  },
  filterBtn: (active) => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: active ? '1px solid #7c6af7' : '1px solid #2a2a3a',
    background: active ? 'rgba(124,106,247,.15)' : 'transparent',
    color: active ? '#a78bfa' : '#666',
    transition: 'all .2s',
  }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 },
  card: {
    background: '#111118', border: '1px solid #1e1e2e', borderRadius: 16,
    padding: 24, display: 'flex', flexDirection: 'column', gap: 10,
    transition: 'border-color .2s,transform .2s', cursor: 'pointer',
  },
  avatar: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'linear-gradient(135deg,#7c6af7,#a78bfa)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, fontWeight: 700, color: '#fff', flexShrink: 0, objectFit: 'cover',
  },
  username: { fontSize: 16, fontWeight: 700, color: '#fff' },
  bio: { fontSize: 12, color: '#666', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  badges: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  badge: { fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 },
  verifiedBadge: { background: 'rgba(52,211,153,.12)', color: '#34d399', border: '1px solid rgba(52,211,153,.25)' },
  featuredBadge: { background: 'rgba(251,191,36,.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,.25)' },
  statRow: { display: 'flex', gap: 16, marginTop: 4 },
  statItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  statLbl: { fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '.05em' },
  statVal: { fontSize: 15, fontWeight: 700, color: '#a78bfa' },
  viewBtn: {
    marginTop: 'auto', padding: '9px 0',
    background: 'rgba(124,106,247,.15)', border: '1px solid rgba(124,106,247,.3)',
    borderRadius: 8, color: '#a78bfa', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'background .2s',
  },
  empty: { color: '#444', textAlign: 'center', padding: '80px 0', fontSize: 14 },
  rankIcons: ['🥇', '🥈', '🥉'],
};

function formatNum(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Number(n).toLocaleString();
}

export default function PublicCreators() {
  const navigate = useNavigate();
  const [creators, setCreators] = useState([]);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all'); // all | verified | featured
  const [loading,  setLoading]  = useState(true);
  const [hovered,  setHovered]  = useState(null);

  const load = useCallback(async (q = '', f = 'all') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (q) params.set('search', q);
      if (f === 'verified') params.set('verified', 'true');
      if (f === 'featured') params.set('featured', 'true');
      const r = await fetch(`/api/public/creators?${params}`);
      const d = await r.json();
      setCreators(d.creators || []);
    } catch {
      setCreators([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search, filter), 350);
    return () => clearTimeout(t);
  }, [search, filter, load]);

  return (
    <div style={S.page}>
      {/* NAV */}
      <nav style={S.nav}>
        <div style={S.navLogo} onClick={() => navigate('/')}>
          <div style={S.navLogoIcon}>MT</div>
          <span style={S.navLogoText}>MT Economy</span>
        </div>
        <div style={S.navActions}>
          <button style={S.btnOutline} onClick={() => navigate('/login')}
            onMouseEnter={e => { e.target.style.borderColor='#7c6af7'; e.target.style.color='#a78bfa'; }}
            onMouseLeave={e => { e.target.style.borderColor='#3a3a5c'; e.target.style.color='#b8b4cc'; }}>
            Đăng nhập
          </button>
          <button style={S.btnPrimary} onClick={() => navigate('/register')}
            onMouseEnter={e => e.target.style.opacity='.85'}
            onMouseLeave={e => e.target.style.opacity='1'}>
            Đăng ký
          </button>
        </div>
      </nav>

      <div style={S.body}>
        <div style={S.header}>
          <div style={S.breadcrumb} onClick={() => navigate('/')}>← Trang chủ</div>
          <h1 style={S.h1}>🌟 Khám phá Creator</h1>
          <p style={S.sub}>Tìm kiếm và ủng hộ những creator bạn yêu thích</p>
        </div>

        <div style={S.filters}>
          <input
            style={S.search}
            placeholder="🔍 Tìm creator theo tên..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {[
            { key: 'all',      label: 'Tất cả' },
            { key: 'featured', label: '⭐ Featured' },
            { key: 'verified', label: '✓ Verified' },
          ].map(({ key, label }) => (
            <button key={key} style={S.filterBtn(filter === key)} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={S.empty}>Đang tải...</div>
        ) : creators.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            Không tìm thấy creator nào
          </div>
        ) : (
          <div style={S.grid}>
            {creators.map((c, idx) => (
              <div
                key={c.id}
                style={{
                  ...S.card,
                  borderColor: hovered === c.id ? 'rgba(124,106,247,.5)' : '#1e1e2e',
                  transform: hovered === c.id ? 'translateY(-4px)' : 'none',
                }}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(`/explore/${c.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {c.avatar_url
                    ? <img src={c.avatar_url} alt={c.username} style={{ ...S.avatar, background: '#1e1e2e' }} />
                    : <div style={S.avatar}>{c.username?.[0]?.toUpperCase() || '?'}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={S.username}>{c.username}</span>
                      {idx < 3 && <span>{S.rankIcons[idx]}</span>}
                    </div>
                    {c.bio && <div style={S.bio}>{c.bio}</div>}
                  </div>
                </div>

                {(c.creator_verified || c.creator_featured) && (
                  <div style={S.badges}>
                    {c.creator_verified  && <span style={{ ...S.badge, ...S.verifiedBadge }}>✓ Verified</span>}
                    {c.creator_featured  && <span style={{ ...S.badge, ...S.featuredBadge }}>⭐ Featured</span>}
                  </div>
                )}

                <div style={S.statRow}>
                  <div style={S.statItem}>
                    <span style={S.statLbl}>MT nhận</span>
                    <span style={S.statVal}>{formatNum(c.total_tips_received)}</span>
                  </div>
                  <div style={S.statItem}>
                    <span style={S.statLbl}>Fans</span>
                    <span style={{ ...S.statVal, color: '#fd79a8' }}>{formatNum(c.supporter_count)}</span>
                  </div>
                </div>

                <button style={S.viewBtn}
                  onMouseEnter={e => e.target.style.background='rgba(124,106,247,.28)'}
                  onMouseLeave={e => e.target.style.background='rgba(124,106,247,.15)'}>
                  Xem hồ sơ →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
