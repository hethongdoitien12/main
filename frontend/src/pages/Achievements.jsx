import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';

const S = {
  page: { maxWidth: 900, margin: '0 auto' },
  h1: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub: { fontSize: 13, color: '#555', marginBottom: '1.75rem' },
  tabs: { display: 'flex', gap: 8, marginBottom: '1.5rem' },
  tab: (active) => ({
    padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: active ? 'linear-gradient(135deg,#6C5CE7,#a29bfe)' : '#13131f',
    color: active ? '#fff' : '#555',
    border: active ? 'none' : '1px solid #1e1e2e',
  }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 },
  card: (unlocked) => ({
    background: unlocked ? '#0e0e17' : '#0a0a0f',
    border: `1px solid ${unlocked ? '#2e2e44' : '#1a1a28'}`,
    borderRadius: 12, padding: '1.25rem',
    opacity: unlocked ? 1 : 0.6,
    position: 'relative', overflow: 'hidden',
    transition: 'border-color .2s',
  }),
  cardGlow: {
    position: 'absolute', top: 0, right: 0, width: 80, height: 80,
    background: 'radial-gradient(circle,#6C5CE720,transparent 70%)',
    borderRadius: '50%',
  },
  icon: { fontSize: 36, marginBottom: 10, display: 'block' },
  title: (unlocked) => ({ fontSize: 15, fontWeight: 700, color: unlocked ? '#fff' : '#444', marginBottom: 4 }),
  desc: { fontSize: 12, color: '#555', marginBottom: 10, lineHeight: 1.5 },
  meta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  reward: (unlocked) => ({
    fontSize: 12, fontWeight: 700,
    color: unlocked ? '#a29bfe' : '#333',
    background: unlocked ? '#6C5CE720' : '#1a1a28',
    padding: '3px 10px', borderRadius: 20,
    border: `1px solid ${unlocked ? '#6C5CE740' : '#2e2e44'}`,
  }),
  badge: {
    fontSize: 11, color: '#6fcf97', background: '#0e2a1e',
    border: '1px solid #6fcf9740', borderRadius: 20, padding: '3px 10px', fontWeight: 600,
  },
  locked: {
    fontSize: 11, color: '#333', background: '#1a1a28',
    border: '1px solid #2e2e44', borderRadius: 20, padding: '3px 10px',
  },
  date: { fontSize: 10, color: '#444', marginTop: 4 },
  catChip: (cat) => {
    const colors = {
      USER: '#6C5CE7', CREATOR: '#fdcb6e', FANCLUB: '#fd79a8',
      MARKETPLACE: '#00b894', SOCIAL: '#74b9ff',
    };
    return {
      fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
      color: colors[cat] || '#888', background: (colors[cat] || '#888') + '20',
      border: `1px solid ${(colors[cat] || '#888')}40`,
      padding: '2px 8px', borderRadius: 20,
    };
  },
  statsRow: {
    display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap',
  },
  stat: {
    flex: 1, minWidth: 120, background: '#0e0e17', border: '1px solid #1e1e2e',
    borderRadius: 10, padding: '12px 16px',
  },
  statLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: 700, color: '#a29bfe' },
  empty: { textAlign: 'center', padding: '3rem', color: '#444', fontSize: 14 },
};

const TABS = ['Tất cả', 'Đã mở', 'Chưa mở'];

function fmt(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Achievements() {
  const { token } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [tab, setTab] = useState('Tất cả');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/achievements', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setAchievements(d.achievements || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);
  const totalReward = unlocked.reduce((s, a) => s + parseInt(a.reward_mt || 0), 0);

  const displayed = tab === 'Đã mở' ? unlocked : tab === 'Chưa mở' ? locked : achievements;

  return (
    <div style={S.page}>
      <h1 style={S.h1}>🏆 Thành tựu</h1>
      <p style={S.sub}>Hoàn thành các mốc để nhận MT và badge đặc biệt.</p>

      <div style={S.statsRow}>
        <div style={S.stat}>
          <div style={S.statLabel}>Đã mở khóa</div>
          <div style={S.statVal}>{unlocked.length} / {achievements.length}</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLabel}>MT kiếm được</div>
          <div style={S.statVal}>{totalReward.toLocaleString()}</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLabel}>Tỉ lệ hoàn thành</div>
          <div style={S.statVal}>{achievements.length ? Math.round(unlocked.length / achievements.length * 100) : 0}%</div>
        </div>
      </div>

      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
            {t} {t === 'Đã mở' ? `(${unlocked.length})` : t === 'Chưa mở' ? `(${locked.length})` : `(${achievements.length})`}
          </button>
        ))}
      </div>

      {loading && <div style={S.empty}>Đang tải...</div>}
      {!loading && displayed.length === 0 && (
        <div style={S.empty}>
          {tab === 'Đã mở' ? '🔒 Bạn chưa mở khóa thành tựu nào.' : 'Không có thành tựu.'}
        </div>
      )}

      <div style={S.grid}>
        {displayed.map(a => (
          <div key={a.id} style={S.card(a.unlocked)}>
            {a.unlocked && <div style={S.cardGlow} />}
            <span style={S.icon}>{a.icon || '🏆'}</span>
            <div style={S.title(a.unlocked)}>{a.title}</div>
            <div style={S.desc}>{a.description}</div>
            <div style={S.meta}>
              <span style={S.catChip(a.category)}>{a.category}</span>
              <span style={S.reward(a.unlocked)}>
                {parseInt(a.reward_mt) > 0 ? `+${parseInt(a.reward_mt).toLocaleString()} MT` : 'Không có thưởng'}
              </span>
            </div>
            {a.unlocked
              ? <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={S.badge}>✓ Đã mở khóa</span>
                  {a.unlocked_at && <span style={S.date}>{fmt(a.unlocked_at)}</span>}
                </div>
              : <div style={{ marginTop: 8 }}><span style={S.locked}>🔒 Chưa mở</span></div>
            }
          </div>
        ))}
      </div>
    </div>
  );
}
