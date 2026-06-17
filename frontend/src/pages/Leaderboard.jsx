import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';

const PERIODS = [
  { value: 'alltime', label: '🏆 Tất cả' },
  { value: 'month',   label: '📅 Tháng này' },
  { value: 'week',    label: '⚡ Tuần này' },
];

const MEDALS = ['🥇', '🥈', '🥉'];
const ROLE_COLORS = { admin: '#a29bfe', creator: '#74b9ff', user: '#6fcf97' };

const S = {
  h1:      { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub:     { fontSize: 13, color: '#555', marginBottom: '1.75rem' },
  tabs:    { display: 'flex', gap: 6, marginBottom: '1.5rem' },
  tab:     (a) => ({
    padding: '7px 18px', borderRadius: 20,
    border: `1px solid ${a ? '#a29bfe' : '#2e2e44'}`,
    background: a ? '#a29bfe20' : 'transparent',
    color: a ? '#a29bfe' : '#666',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
  }),
  card:    { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, overflow: 'hidden' },
  row:     (isMe) => ({
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 20px', borderBottom: '1px solid #0d0d18',
    background: isMe ? '#a29bfe08' : 'transparent',
    transition: 'background .15s',
  }),
  rank:    { width: 32, textAlign: 'center', fontSize: 18, flexShrink: 0 },
  rankNum: { width: 32, textAlign: 'center', fontSize: 13, color: '#444', fontWeight: 600, flexShrink: 0 },
  avatar:  (color) => ({
    width: 40, height: 40, borderRadius: '50%',
    background: color || '#6C5CE7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
  }),
  name:    { fontSize: 14, fontWeight: 600, color: '#ddd' },
  role:    (r) => ({ fontSize: 11, color: ROLE_COLORS[r] || '#555', textTransform: 'capitalize', marginTop: 1 }),
  mt:      { fontSize: 16, fontWeight: 700, color: '#f6c90e', marginLeft: 'auto', flexShrink: 0 },
  xuSub:   { fontSize: 11, color: '#444', marginTop: 2, textAlign: 'right' },
  myBox:   {
    margin: '0 0 12px', padding: '12px 20px',
    background: '#13131f', border: '1px solid #a29bfe30',
    borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
  },
  empty:   { padding: '2.5rem', textAlign: 'center', color: '#333', fontSize: 13 },
};

const AVATAR_COLORS = [
  '#6C5CE7','#00cec9','#e17055','#fd79a8','#fdcb6e','#74b9ff','#55efc4',
];
function avatarColor(name = '') {
  const code = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export default function Leaderboard() {
  const { token, user } = useAuth();
  const [period,  setPeriod]  = useState('alltime');
  const [entries, setEntries] = useState([]);
  const [myRank,  setMyRank]  = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/wallet/leaderboard?period=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setEntries(Array.isArray(d.entries) ? d.entries : []);
      setMyRank(d.myRank || null);
    } catch { setEntries([]); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) load(period); }, [token, period, load]);

  const onPeriod = (p) => { setPeriod(p); };

  const meInTop = entries.some(e => e.id === user?.id);

  return (
    <div>
      <div style={S.h1}>Bảng xếp hạng</div>
      <div style={S.sub}>Top người kiếm MT nhiều nhất hệ thống</div>

      <div style={S.tabs}>
        {PERIODS.map(p => (
          <button key={p.value} style={S.tab(period === p.value)} onClick={() => onPeriod(p.value)}>
            {p.label}
          </button>
        ))}
      </div>

      {/* My rank banner — chỉ hiện khi alltime và không có trong top 20 */}
      {period === 'alltime' && myRank && !meInTop && (
        <div style={S.myBox}>
          <div style={S.rankNum}>#{myRank.rank}</div>
          <div style={S.avatar(avatarColor(user?.username))}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.name}>{user?.username} <span style={{ fontSize: 11, color: '#a29bfe' }}>(Bạn)</span></div>
            <div style={S.role(user?.role)}>{user?.role}</div>
          </div>
          <div>
            <div style={S.mt}>{Number(myRank.xu_earned || 0).toLocaleString()} MT</div>
            <div style={S.xuSub}>đã kiếm</div>
          </div>
        </div>
      )}

      <div style={S.card}>
        {loading && (
          <div style={S.empty}>Đang tải...</div>
        )}

        {!loading && entries.length === 0 && (
          <div style={S.empty}>Chưa có dữ liệu cho kỳ này</div>
        )}

        {!loading && entries.map((e, i) => {
          const isMe  = e.id === user?.id;
          const color = avatarColor(e.username);
          return (
            <div key={e.id} style={S.row(isMe)}>
              {/* rank */}
              {i < 3
                ? <div style={S.rank}>{MEDALS[i]}</div>
                : <div style={S.rankNum}>#{e.rank}</div>
              }

              {/* avatar */}
              <div style={{
                ...S.avatar(color),
                boxShadow: i === 0 ? `0 0 14px ${color}60` : 'none',
                border: isMe ? '2px solid #a29bfe' : '2px solid transparent',
              }}>
                {e.username?.[0]?.toUpperCase()}
              </div>

              {/* name + role */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ ...S.name, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.username}
                  </span>
                  {isMe && <span style={{ fontSize: 10, color: '#a29bfe', background: '#a29bfe15', border: '1px solid #a29bfe30', borderRadius: 10, padding: '1px 7px', flexShrink: 0 }}>Bạn</span>}
                </div>
                <div style={S.role(e.role)}>{e.role}</div>
              </div>

              {/* MT */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  ...S.mt,
                  marginLeft: 0,
                  fontSize: i < 3 ? 18 : 15,
                  color: i === 0 ? '#f6c90e' : i === 1 ? '#dfe6e9' : i === 2 ? '#e17055' : '#f6c90e',
                }}>
                  {Number(e.xu_earned || 0).toLocaleString()}
                  <span style={{ fontSize: 11, color: '#555', fontWeight: 400, marginLeft: 4 }}>MT</span>
                </div>
                <div style={S.xuSub}>
                  {period === 'alltime'
                    ? `Số dư: ${Number(e.xu_balance || 0).toLocaleString()}`
                    : `trong kỳ này`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
