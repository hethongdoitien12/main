import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const MEDALS = ['🥇', '🥈', '🥉'];
const AVATAR_COLORS = ['#6C5CE7','#00cec9','#e17055','#fd79a8','#fdcb6e','#74b9ff','#55efc4'];

function avatarColor(name = '') {
  const code = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function Avatar({ url, username, size = 44 }) {
  const color = avatarColor(username);
  const letter = (username || '?')[0].toUpperCase();
  if (url) return (
    <img src={url} alt={username}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#fff' }}>
      {letter}
    </div>
  );
}

function CreatorModal({ creator, onClose, onGift }) {
  const color = avatarColor(creator.username);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
      zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)', animation: 'fadeIn .2s ease' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#0e0e17', border: '1px solid #2a2a3e', borderRadius: 16,
          width: 420, maxWidth: '92vw', overflow: 'hidden', animation: 'slideUp .25s ease' }}>

        {/* Hero banner */}
        <div style={{ height: 90, background: `linear-gradient(135deg, ${color}44, ${color}11)`,
          borderBottom: '1px solid #1a1a28', position: 'relative' }}>
          <button onClick={onClose}
            style={{ position: 'absolute', top: 12, right: 14, background: 'rgba(0,0,0,.4)',
              border: '1px solid #333', borderRadius: 8, color: '#aaa', padding: '4px 10px',
              fontSize: 18, lineHeight: 1, cursor: 'pointer' }}>
            ×
          </button>
        </div>

        {/* Avatar overlap */}
        <div style={{ padding: '0 24px 24px', marginTop: -32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ border: `3px solid ${color}`, borderRadius: '50%' }}>
              <Avatar url={creator.avatar_url} username={creator.username} size={64} />
            </div>
            <button onClick={onGift}
              style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#6C5CE7,#fd79a8)',
                border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              💝 Gửi Gift
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
              {creator.username}
            </div>
            <div style={{ fontSize: 12, color: creator.role === 'admin' ? '#a29bfe' : '#74b9ff' }}>
              {creator.role === 'admin' ? '⚡ Admin' : '🎨 Creator'}
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { label: 'Tổng MT nhận', value: Number(creator.total_tips_received || 0).toLocaleString(), color: '#fdcb6e', icon: '💰' },
              { label: 'Số lần tip',   value: Number(creator.tip_count || 0).toLocaleString(),            color: '#74b9ff', icon: '🎁' },
              { label: 'Fan hâm mộ',   value: Number(creator.supporter_count || 0).toLocaleString(),      color: '#fd79a8', icon: '💝' },
            ].map(s => (
              <div key={s.label} style={{ background: '#13131f', border: '1px solid #1e1e2e',
                borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {Number(creator.rank) <= 3 && (
            <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13, color: '#fdcb6e' }}>
              {MEDALS[Number(creator.rank) - 1]} Top {creator.rank} creator được tip nhiều nhất!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TopCreators() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [creators, setCreators]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);
  const debounceRef = useRef(null);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const r = await api.wallet.topCreators({ search: q, limit: 50 }, token);
      setCreators(r.creators || []);
    } catch { setCreators([]); }
    setLoading(false);
  }, [token]);

  useEffect(() => { if (token) load(''); }, [token, load]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { if (token) load(search); }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search, token, load]);

  const handleGift = (creator) => {
    navigate('/gifting', { state: { creator } });
  };

  const top3 = creators.slice(0, 3);
  const rest  = creators.slice(3);

  return (
    <div>
      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .creator-row:hover { background: #13131f !important; }
      `}</style>

      {selected && (
        <CreatorModal
          creator={selected}
          onClose={() => setSelected(null)}
          onGift={() => { setSelected(null); handleGift(selected); }}
        />
      )}

      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Top Creators</div>
        <div style={{ fontSize: 13, color: '#555' }}>Xếp hạng creator theo tổng MT nhận được từ fans</div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: 380 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: '#555', fontSize: 15, pointerEvents: 'none' }}>🔍</span>
        <input
          style={{ width: '100%', padding: '10px 14px 10px 40px', background: '#0e0e17',
            border: '1px solid #1e1e2e', borderRadius: 10, color: '#e8e6e0', fontSize: 14,
            outline: 'none', boxSizing: 'border-box' }}
          placeholder="Tìm creator theo tên..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>
            ×
          </button>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#555', fontSize: 14 }}>
          Đang tải...
        </div>
      )}

      {!loading && creators.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#555', fontSize: 14 }}>
          {search ? `Không tìm thấy creator nào khớp với "${search}"` : 'Chưa có creator nào'}
        </div>
      )}

      {/* ── Top 3 podium (only when not searching) ── */}
      {!loading && !search && top3.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: '1.5rem' }}>
          {top3.map((c, i) => {
            const color = avatarColor(c.username);
            const sizes  = [80, 64, 64];
            const scales = ['1.05', '1', '1'];
            return (
              <div key={c.id} onClick={() => setSelected(c)}
                style={{ background: '#0e0e17', border: `1px solid ${color}30`, borderRadius: 14,
                  padding: '1.5rem 1rem', textAlign: 'center', cursor: 'pointer', order: i === 0 ? 0 : i === 1 ? -1 : 1,
                  transform: `scale(${scales[i]})`, transition: 'transform .15s, border-color .15s',
                  position: 'relative', overflow: 'hidden' }}>
                {/* glow bg */}
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

                <div style={{ fontSize: 28, marginBottom: 8 }}>{MEDALS[i]}</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                  <div style={{ border: `3px solid ${color}`, borderRadius: '50%' }}>
                    <Avatar url={c.avatar_url} username={c.username} size={sizes[i]} />
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.username}
                </div>
                <div style={{ fontSize: 12, color, marginBottom: 10 }}>
                  {Number(c.total_tips_received || 0).toLocaleString()} MT
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 11, color: '#555', marginBottom: 12 }}>
                  <span>🎁 {c.tip_count} tips</span>
                  <span>💝 {c.supporter_count} fans</span>
                </div>
                <button onClick={e => { e.stopPropagation(); handleGift(c); }}
                  style={{ width: '100%', padding: '8px 0', background: `${color}20`,
                    border: `1px solid ${color}50`, borderRadius: 8, color, fontSize: 12,
                    fontWeight: 600, cursor: 'pointer', transition: 'background .15s' }}>
                  💝 Gửi Gift
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Rest of list ── */}
      {!loading && creators.length > 0 && (
        <div style={{ background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, overflow: 'hidden' }}>
          {(search ? creators : rest).map((c, i) => {
            const rank   = search ? Number(c.rank) : i + 4;
            const color  = avatarColor(c.username);
            const isMedal = Number(c.rank) <= 3;
            return (
              <div key={c.id} className="creator-row"
                onClick={() => setSelected(c)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                  borderBottom: '1px solid #0d0d18', cursor: 'pointer', transition: 'background .12s',
                  background: 'transparent' }}>

                {/* rank */}
                <div style={{ width: 34, textAlign: 'center', flexShrink: 0 }}>
                  {isMedal
                    ? <span style={{ fontSize: 20 }}>{MEDALS[Number(c.rank) - 1]}</span>
                    : <span style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>#{rank}</span>
                  }
                </div>

                {/* avatar */}
                <div style={{ border: `2px solid ${color}50`, borderRadius: '50%' }}>
                  <Avatar url={c.avatar_url} username={c.username} size={42} />
                </div>

                {/* name + role */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#ddd',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.username}
                  </div>
                  <div style={{ fontSize: 11, color: c.role === 'admin' ? '#a29bfe' : '#74b9ff', marginTop: 1 }}>
                    {c.role === 'admin' ? '⚡ Admin' : '🎨 Creator'}
                    <span style={{ color: '#333', margin: '0 5px' }}>·</span>
                    <span style={{ color: '#555' }}>{c.supporter_count} fans · {c.tip_count} tips</span>
                  </div>
                </div>

                {/* MT earned */}
                <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fdcb6e' }}>
                    {Number(c.total_tips_received || 0).toLocaleString()}
                    <span style={{ fontSize: 11, color: '#555', fontWeight: 400, marginLeft: 3 }}>MT</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>nhận được</div>
                </div>

                {/* Gift button */}
                <button onClick={e => { e.stopPropagation(); handleGift(c); }}
                  style={{ padding: '7px 14px', background: 'transparent',
                    border: '1px solid #2a2a3e', borderRadius: 8, color: '#888',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                    transition: 'all .15s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6C5CE7'; e.currentTarget.style.color = '#a29bfe'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a3e'; e.currentTarget.style.color = '#888'; }}>
                  💝 Gift
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
