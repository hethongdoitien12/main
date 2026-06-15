import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';

const S = {
  h1:    { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: '1.75rem' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 },
  card:  { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.5rem' },
  stat:  { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.25rem' },
  statLbl: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 },
  statVal: (color = '#a29bfe') => ({ fontSize: 26, fontWeight: 700, color }),
  statSub: { fontSize: 11, color: '#555', marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: 11, color: '#555', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #1a1a28', textTransform: 'uppercase' },
  td: { fontSize: 13, color: '#ccc', padding: '10px 0', borderBottom: '1px solid #111' },
  badge: (s) => ({
    padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: s === 'completed' ? '#6fcf9720' : s === 'pending' ? '#fdcb6e20' : '#ff6b6b20',
    color:      s === 'completed' ? '#6fcf97'   : s === 'pending' ? '#fdcb6e'   : '#ff6b6b',
  }),
  bar: (pct, color) => ({
    height: 8, borderRadius: 4, background: color || '#6C5CE7',
    width: `${Math.min(pct, 100)}%`, transition: 'width .5s ease',
  }),
  barWrap: { background: '#13131f', borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  noData: { color: '#333', fontSize: 13, textAlign: 'center', padding: '2rem 0' },
  alert: { background: '#fdcb6e15', border: '1px solid #fdcb6e30', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: 20, fontSize: 13, color: '#fdcb6e' },
};

function BarChart({ data }) {
  if (!data || !data.length) return <div style={S.noData}>Chưa có dữ liệu trong 7 ngày qua</div>;
  const max = Math.max(...data.map(d => d.xu_earned), 1);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const found = data.find(r => r.date?.slice(0, 10) === key);
    return { date: key, xu: found?.xu_earned || 0, tips: found?.tip_count || 0 };
  });

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
      {last7.map(({ date, xu, tips }) => {
        const pct = (xu / max) * 100;
        const label = new Date(date + 'T00:00:00').toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });
        return (
          <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 10, color: '#555' }}>{xu > 0 ? xu.toLocaleString() : ''}</div>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <div title={`${tips} tip · ${xu.toLocaleString()} XU`} style={{
                width: '100%', borderRadius: '3px 3px 0 0',
                height: `${Math.max(pct, xu > 0 ? 4 : 0)}%`,
                background: xu > 0 ? 'linear-gradient(180deg,#a29bfe,#6C5CE7)' : '#1a1a28',
                transition: 'height .4s ease', cursor: 'default',
              }} />
            </div>
            <div style={{ fontSize: 10, color: '#444' }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function CreatorDashboard() {
  const { user, token, wallet } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    if (user && user.role !== 'creator' && user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetch('/api/creator/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, user]);

  if (loading) return <div style={{ color: '#555', padding: '2rem' }}>Đang tải...</div>;
  if (!stats) return <div style={{ color: '#ff6b6b', padding: '2rem' }}>Không thể tải dữ liệu</div>;

  const { totals, topTippers, dailyEarnings, withdrawals } = stats;
  const maxTip = topTippers?.[0]?.total_xu || 1;

  return (
    <div>
      <div style={S.h1}>Creator Dashboard</div>

      {totals?.total_tips === 0 && (
        <div style={S.alert}>
          💡 Chưa có ai tip bạn. Chia sẻ User ID để nhận tip từ fans!
          <br /><strong>ID của bạn: {user?.id}</strong>
        </div>
      )}

      {/* Stats tổng */}
      <div style={S.grid3}>
        <div style={S.stat}>
          <div style={S.statLbl}>Tổng xu nhận được</div>
          <div style={S.statVal('#6fcf97')}>{Number(totals?.total_received_xu || 0).toLocaleString()}</div>
          <div style={S.statSub}>XU (sau phí 5%)</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLbl}>Số lần được tip</div>
          <div style={S.statVal('#74b9ff')}>{Number(totals?.total_tips || 0).toLocaleString()}</div>
          <div style={S.statSub}>lượt</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLbl}>Số dư hiện tại</div>
          <div style={S.statVal('#a29bfe')}>{Number(wallet?.balance || 0).toLocaleString()}</div>
          <div style={S.statSub}>XU · <span style={{ color: '#555', cursor: 'pointer' }} onClick={() => navigate('/wallet')}>Rút →</span></div>
        </div>
      </div>

      <div style={S.grid2}>
        {/* Biểu đồ 7 ngày */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Thu nhập 7 ngày gần nhất</div>
          <BarChart data={dailyEarnings} />
        </div>

        {/* Top tippers */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Top fans tip nhiều nhất</div>
          {topTippers?.length === 0
            ? <div style={S.noData}>Chưa có ai tip</div>
            : topTippers?.map((t, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#ddd' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`} {t.username}
                  </span>
                  <span style={{ fontSize: 13, color: '#a29bfe', fontWeight: 600 }}>
                    {Number(t.total_xu).toLocaleString()} XU
                  </span>
                </div>
                <div style={S.barWrap}>
                  <div style={S.bar((t.total_xu / maxTip) * 100, i === 0 ? '#fdcb6e' : i === 1 ? '#b2bec3' : i === 2 ? '#e17055' : '#6C5CE7')} />
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Withdrawal history */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Lịch sử rút tiền gần đây</div>
        {withdrawals?.length === 0
          ? <div style={S.noData}>Chưa có lịch sử rút tiền</div>
          : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Ngày</th>
                  <th style={S.th}>XU rút</th>
                  <th style={S.th}>VNĐ nhận</th>
                  <th style={S.th}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals?.map(w => (
                  <tr key={w.id}>
                    <td style={S.td}>{new Date(w.created_at).toLocaleDateString('vi-VN')}</td>
                    <td style={S.td}>{Number(w.amount_xu).toLocaleString()} XU</td>
                    <td style={S.td}>{Number(w.amount_vnd).toLocaleString()}₫</td>
                    <td style={S.td}><span style={S.badge(w.status)}>{w.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}
