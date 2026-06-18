import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const S = {
  h1:       { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 },
  sub:      { fontSize: 14, color: '#555', marginBottom: '1.75rem' },
  search:   {
    width: '100%', padding: '10px 14px', background: '#0e0e17',
    border: '1px solid #2a2a3a', borderRadius: 10, color: '#ddd',
    fontSize: 14, marginBottom: '1.5rem', outline: 'none',
  },
  grid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  card:     {
    background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 14,
    padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 10,
    transition: 'border-color .2s, transform .2s', cursor: 'pointer',
  },
  avatar:   {
    width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#6C5CE7,#a29bfe)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  username: { fontSize: 16, fontWeight: 700, color: '#fff' },
  bio:      { fontSize: 12, color: '#666', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  statRow:  { display: 'flex', gap: 16, marginTop: 4 },
  statItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  statLbl:  { fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '.05em' },
  statVal:  { fontSize: 15, fontWeight: 700, color: '#a29bfe' },
  rank:     {
    width: 26, height: 26, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
    background: '#1e1e2e', color: '#888',
  },
  giftBtn:  {
    marginTop: 'auto', padding: '8px 0', background: 'linear-gradient(135deg,#6C5CE7,#a29bfe)',
    border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
  },
  empty: { color: '#333', textAlign: 'center', padding: '4rem 0', fontSize: 14 },
};

const RANK_COLORS = ['#fdcb6e', '#b2bec3', '#e17055'];
const RANK_ICONS  = ['🥇', '🥈', '🥉'];

export default function Creators() {
  const { token } = useAuth();
  const navigate  = useNavigate();
  const [creators, setCreators] = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [hovered,  setHovered]  = useState(null);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const r = await fetch(`/api/creators?search=${encodeURIComponent(q)}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setCreators(d.creators || []);
    } catch {
      setCreators([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <div>
      <div style={S.h1}>🌟 Khám phá Creators</div>
      <div style={S.sub}>Tìm kiếm và ủng hộ các creator bạn yêu thích</div>

      <input
        style={S.search}
        placeholder="🔍 Tìm creator theo tên..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div style={S.empty}>Đang tải...</div>
      ) : creators.length === 0 ? (
        <div style={S.empty}>Không tìm thấy creator nào</div>
      ) : (
        <div style={S.grid}>
          {creators.map((c, idx) => (
            <div
              key={c.id}
              style={{
                ...S.card,
                borderColor: hovered === c.id ? '#6C5CE7' : '#1e1e2e',
                transform: hovered === c.id ? 'translateY(-2px)' : 'none',
              }}
              onMouseEnter={() => setHovered(c.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => navigate(`/creator/${c.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt={c.username} style={{ ...S.avatar, objectFit: 'cover' }} />
                ) : (
                  <div style={S.avatar}>{c.username[0].toUpperCase()}</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={S.username}>{c.username}</span>
                    {idx < 3 && <span title={`#${idx + 1}`}>{RANK_ICONS[idx]}</span>}
                  </div>
                  {c.bio && <div style={S.bio}>{c.bio}</div>}
                </div>
              </div>

              <div style={S.statRow}>
                <div style={S.statItem}>
                  <span style={S.statLbl}>MT nhận</span>
                  <span style={S.statVal}>{Number(c.total_tips_received).toLocaleString()}</span>
                </div>
                <div style={S.statItem}>
                  <span style={S.statLbl}>Lượt tip</span>
                  <span style={{ ...S.statVal, color: '#74b9ff' }}>{Number(c.total_tip_count).toLocaleString()}</span>
                </div>
                <div style={S.statItem}>
                  <span style={S.statLbl}>Fans</span>
                  <span style={{ ...S.statVal, color: '#fd79a8' }}>{Number(c.supporter_count).toLocaleString()}</span>
                </div>
              </div>

              <button
                style={S.giftBtn}
                onClick={e => {
                  e.stopPropagation();
                  navigate('/gifting', { state: { creator: c } });
                }}
              >
                🎁 Tặng quà
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
