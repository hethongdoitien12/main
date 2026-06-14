import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const S = {
  h1: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub: { color: '#666', fontSize: 14, marginBottom: '2rem' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: '2rem' },
  statCard: { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.1rem 1.25rem' },
  statLbl: { fontSize: 12, color: '#555', marginBottom: 6, letterSpacing: '.04em', textTransform: 'uppercase' },
  statVal: { fontSize: 24, fontWeight: 700, color: '#fff' },
  statSub: { fontSize: 11, color: '#444', marginTop: 2 },
  section: { marginBottom: '2rem' },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: '#aaa', marginBottom: 12 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 },
  card: { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.25rem' },
  txRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #13131f' },
  txName: { fontSize: 13, color: '#ccc' },
  txSub: { fontSize: 11, color: '#555' },
  txAmt: (pos) => ({ fontSize: 14, fontWeight: 600, color: pos ? '#6fcf97' : '#ff6b6b' }),
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#6C5CE7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' },
  btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 8, color: '#ccc', fontSize: 13, fontWeight: 500, textDecoration: 'none' },
};

const TX_LABELS = {
  deposit: 'Nạp tiền', withdrawal: 'Rút tiền', earn_quest: 'Quest', earn_game: 'Chơi game',
  earn_referral: 'Giới thiệu', earn_content: 'Tạo content', spend_ticket: 'Mua vé',
  spend_item: 'Mua item', spend_agent: 'Thuê Agent', spend_music: 'Nhạc', spend_boost: 'Boost',
  tip_sent: 'Tip gửi', tip_received: 'Tip nhận', expire: 'Hết hạn', refund: 'Hoàn tiền'
};

export default function Dashboard() {
  const { user, wallet, token } = useAuth();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (token) {
      api.wallet.history({ limit: 6 }, token).then(setHistory).catch(() => {});
    }
  }, [token]);

  const earned = history.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
  const spent = history.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  return (
    <div>
      <div style={S.h1}>Xin chào, {user?.username} 👋</div>
      <div style={S.sub}>Tổng quan tài khoản XU của bạn</div>

      <div style={S.grid4}>
        <div style={{ ...S.statCard, borderColor: '#2a2044' }}>
          <div style={S.statLbl}>Số dư hiện tại</div>
          <div style={{ ...S.statVal, color: '#a29bfe' }}>{Number(wallet?.balance || 0).toLocaleString()}</div>
          <div style={S.statSub}>XU</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLbl}>Tổng đã kiếm</div>
          <div style={{ ...S.statVal, color: '#6fcf97' }}>{Number(wallet?.total_earned || 0).toLocaleString()}</div>
          <div style={S.statSub}>XU tất cả thời gian</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLbl}>Tổng đã tiêu</div>
          <div style={{ ...S.statVal, color: '#fd79a8' }}>{Number(wallet?.total_spent || 0).toLocaleString()}</div>
          <div style={S.statSub}>XU tất cả thời gian</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLbl}>Đã rút ra</div>
          <div style={{ ...S.statVal, color: '#fdcb6e' }}>{Number(wallet?.total_withdrawn || 0).toLocaleString()}</div>
          <div style={S.statSub}>XU → VNĐ</div>
        </div>
      </div>

      <div style={S.grid2}>
        <div style={S.card}>
          <div style={{ ...S.sectionTitle, marginBottom: 14 }}>Giao dịch gần đây</div>
          {history.length === 0 ? (
            <div style={{ color: '#444', fontSize: 13, padding: '1rem 0', textAlign: 'center' }}>Chưa có giao dịch nào</div>
          ) : (
            history.map((tx) => (
              <div key={tx.id} style={S.txRow}>
                <div>
                  <div style={S.txName}>{TX_LABELS[tx.type] || tx.type}</div>
                  <div style={S.txSub}>{new Date(tx.created_at).toLocaleDateString('vi-VN')}</div>
                </div>
                <div style={S.txAmt(tx.amount > 0)}>
                  {tx.amount > 0 ? '+' : ''}{Number(tx.amount).toLocaleString()} XU
                </div>
              </div>
            ))
          )}
          <div style={{ marginTop: 14 }}>
            <Link to="/history" style={S.btnSecondary}>Xem tất cả →</Link>
          </div>
        </div>

        <div style={S.card}>
          <div style={{ ...S.sectionTitle, marginBottom: 14 }}>Hành động nhanh</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/wallet" style={{ ...S.btnPrimary, justifyContent: 'center' }}>
              ＋ Nạp XU
            </Link>
            <Link to="/wallet" style={{ ...S.btnSecondary, justifyContent: 'center' }}>
              ↑ Rút XU ra VNĐ
            </Link>
            <Link to="/quests" style={{ ...S.btnSecondary, justifyContent: 'center' }}>
              ◆ Làm nhiệm vụ kiếm XU
            </Link>
          </div>
          <div style={{ marginTop: '1.5rem', padding: '12px', background: '#13131f', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Tỷ giá hôm nay</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#ddd' }}>1 XU = 1 VNĐ</div>
            <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Phí rút: 10% | Phí tip: 5%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
