import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const ONBOARD_STEPS = [
  { icon: '◉', label: 'Hoàn thiện hồ sơ',      to: '/profile',     done: (u, w) => !!(u?.bio) },
  { icon: '◎', label: 'Nạp MT đầu tiên',         to: '/wallet',      done: (u, w) => (w?.total_earned || 0) > 0 },
  { icon: '🌟', label: 'Khám phá Creator',        to: '/creators',    done: (u, w) => false },
  { icon: '♥', label: 'Gửi quà hoặc mua sản phẩm', to: '/gifting',  done: (u, w) => (w?.total_spent || 0) > 0 },
];

function OnboardingBanner({ user, wallet }) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('onboard_dismissed') === '1';
  });
  if (dismissed) return null;
  const steps = ONBOARD_STEPS.map(s => ({ ...s, isDone: s.done(user, wallet) }));
  const allDone = steps.every(s => s.isDone);
  if (allDone) return null;
  const completed = steps.filter(s => s.isDone).length;
  const pct = Math.round(completed / steps.length * 100);
  return (
    <div style={{
      background: 'linear-gradient(135deg,#0f0e20,#13131f)',
      border: '1px solid #6C5CE740', borderRadius: 14,
      padding: '1.25rem 1.5rem', marginBottom: '1.5rem', position: 'relative',
    }}>
      <button onClick={() => { setDismissed(true); localStorage.setItem('onboard_dismissed','1'); }}
        style={{ position:'absolute', top:12, right:12, background:'none', border:'none', color:'#444', fontSize:16, cursor:'pointer', padding:4 }}>✕</button>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap' }}>
        <span style={{ fontSize:20 }}>🚀</span>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>Bắt đầu với MT Economy</div>
          <div style={{ fontSize:12, color:'#555' }}>{completed}/{steps.length} bước hoàn thành</div>
        </div>
        <div style={{ marginLeft:'auto', minWidth:80 }}>
          <div style={{ height:6, background:'#1e1e2e', borderRadius:6, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#6C5CE7,#a29bfe)', borderRadius:6, transition:'width .4s' }} />
          </div>
          <div style={{ fontSize:11, color:'#a29bfe', marginTop:4, textAlign:'right', fontWeight:700 }}>{pct}%</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:8 }}>
        {steps.map((s,i) => (
          <Link key={i} to={s.to} style={{
            display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
            background: s.isDone ? '#0e2a1e' : '#13131f',
            border: `1px solid ${s.isDone ? '#6fcf9730' : '#1e1e2e'}`,
            borderRadius:8, textDecoration:'none', transition:'border-color .2s',
          }}>
            <div style={{
              width:22, height:22, borderRadius:'50%', flexShrink:0,
              background: s.isDone ? '#6fcf97' : '#1e1e2e',
              border: `1px solid ${s.isDone ? '#6fcf97' : '#2e2e44'}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, color: s.isDone ? '#0a0a0f' : '#555', fontWeight:700,
            }}>{s.isDone ? '✓' : i+1}</div>
            <span style={{ fontSize:12, color: s.isDone ? '#6fcf97' : '#bbb', fontWeight: s.isDone ? 400 : 500, lineHeight:1.3 }}>{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const S = {
  h1: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub: { color: '#666', fontSize: 14, marginBottom: '2rem' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: '1.5rem' },
  statCard: { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.1rem 1.25rem' },
  statLbl: { fontSize: 12, color: '#555', marginBottom: 6, letterSpacing: '.04em', textTransform: 'uppercase' },
  statVal: { fontSize: 24, fontWeight: 700, color: '#fff' },
  statSub: { fontSize: 11, color: '#444', marginTop: 2 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 },
  card: { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.25rem' },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: '#aaa', marginBottom: 12 },
  txRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #13131f' },
  txName: { fontSize: 13, color: '#ccc' },
  txSub: { fontSize: 11, color: '#555' },
  txAmt: (pos) => ({ fontSize: 14, fontWeight: 600, color: pos ? '#6fcf97' : '#ff6b6b' }),
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#6C5CE7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' },
  btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 8, color: '#ccc', fontSize: 13, fontWeight: 500, textDecoration: 'none' },
};

const TX_LABELS = {
  deposit: 'Nạp tiền', withdrawal: 'Rút tiền', earn_quest: 'Quest', earn_game: 'Chơi game',
  earn_referral: 'Giới thiệu', earn_content: 'Tạo content', earn_checkin: 'Điểm danh',
  spend_ticket: 'Mua vé', spend_item: 'Mua item', spend_agent: 'Thuê Agent',
  spend_music: 'Nhạc', spend_boost: 'Boost',
  tip_sent: 'Tip gửi', tip_received: 'Tip nhận', expire: 'Hết hạn', refund: 'Hoàn tiền',
};

// ─── Milestones list ────────────────────────────────────────────────────────
const MILESTONES = [
  { day: 3,  mt: 100,  label: '3 ngày' },
  { day: 7,  mt: 250,  label: '7 ngày 🏆' },
  { day: 14, mt: 350,  label: '14 ngày 🔥' },
  { day: 30, mt: 500,  label: '30 ngày 👑' },
];

// ─── CheckinCard ─────────────────────────────────────────────────────────────
function CheckinCard({ token, onCheckin }) {
  const [status,   setStatus]   = useState(null);
  const [doing,    setDoing]    = useState(false);
  const [flash,    setFlash]    = useState(null); // '+250 MT' flash text

  const load = useCallback(async () => {
    try {
      const d = await api.checkin.status(token);
      setStatus(d);
    } catch {}
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);

  const doCheckin = async () => {
    if (doing || status?.checked_in_today) return;
    setDoing(true);
    try {
      const r = await api.checkin.doIt(token);
      setFlash(`+${r.xu_earned} MT`);
      setTimeout(() => setFlash(null), 2500);
      await load();
      onCheckin && onCheckin();
    } catch (e) {
      setFlash(e.message || 'Lỗi');
      setTimeout(() => setFlash(null), 2500);
    } finally { setDoing(false); }
  };

  const streak   = status?.current_streak  || 0;
  const reward   = status?.next_reward     || 50;
  const nextDay  = status?.next_day        || 1;
  const doneToday = !!status?.checked_in_today;

  // Build last-7-days dots
  const today = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const checkedSet = new Set((status?.recent || []).map(r => r.checked_in_date));

  const nextMilestone = MILESTONES.find(m => m.day > streak);

  return (
    <div style={{
      background: '#0e0e17', border: '1px solid #1e1e2e',
      borderRadius: 12, padding: '1.25rem', marginBottom: 16,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* gradient accent */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 180, height: 180, borderRadius: '50%',
        background: 'radial-gradient(circle, #f6c90e08 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>

        {/* left: streak + button */}
        <div style={{ flex: '0 0 auto', minWidth: 120, textAlign: 'center' }}>
          <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 4 }}>
            {streak === 0 ? '📅' : streak >= 30 ? '👑' : streak >= 14 ? '🔥' : streak >= 7 ? '🏆' : '⚡'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: doneToday ? '#f6c90e' : '#ddd', lineHeight: 1 }}>
            {streak}
          </div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 12 }}>
            ngày liên tiếp
          </div>
          <button
            onClick={doCheckin}
            disabled={doing || doneToday}
            style={{
              width: '100%', padding: '8px 0',
              background: doneToday ? '#13131f' : 'linear-gradient(135deg,#f6c90e,#fdcb6e)',
              border: `1px solid ${doneToday ? '#2e2e44' : '#f6c90e60'}`,
              borderRadius: 8, fontWeight: 700, fontSize: 13,
              color: doneToday ? '#555' : '#1a1a00',
              cursor: doneToday ? 'default' : 'pointer',
              opacity: doing ? 0.6 : 1,
              transition: 'all .2s',
            }}>
            {doneToday ? '✓ Đã điểm danh' : doing ? '...' : `Điểm danh\n+${reward} MT`}
          </button>
          {!doneToday && (
            <div style={{ fontSize: 10, color: '#f6c90e80', marginTop: 5 }}>
              Ngày {nextDay} → +{reward} MT
            </div>
          )}
        </div>

        {/* right: calendar + milestone */}
        <div style={{ flex: 1, minWidth: 160 }}>
          {/* 7-day calendar */}
          <div style={{ fontSize: 11, color: '#555', marginBottom: 7 }}>7 ngày gần nhất</div>
          <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
            {last7.map((dateStr, i) => {
              const done = checkedSet.has(dateStr);
              const isToday = i === 6;
              return (
                <div key={dateStr} style={{
                  flex: 1, height: 28, borderRadius: 6,
                  background: done ? '#f6c90e' : isToday && !done ? '#f6c90e18' : '#13131f',
                  border: `1px solid ${done ? '#f6c90e60' : isToday ? '#f6c90e40' : '#1e1e2e'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11,
                }}>
                  {done ? '✓' : <span style={{ color: isToday ? '#f6c90e60' : '#333' }}>·</span>}
                </div>
              );
            })}
          </div>

          {/* next milestone */}
          {nextMilestone && (
            <div style={{
              background: '#13131f', border: '1px solid #2e2e44',
              borderRadius: 8, padding: '9px 12px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>Mục tiêu tiếp theo</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>
                  Streak {nextMilestone.label}
                </div>
                {/* progress bar */}
                <div style={{ marginTop: 5, height: 4, background: '#1e1e2e', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: 'linear-gradient(90deg,#f6c90e,#fdcb6e)',
                    width: `${Math.min(100, (streak / nextMilestone.day) * 100)}%`,
                    transition: 'width .5s ease',
                  }} />
                </div>
                <div style={{ fontSize: 10, color: '#444', marginTop: 3 }}>
                  {streak} / {nextMilestone.day} ngày
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f6c90e' }}>
                  +{nextMilestone.mt}
                </div>
                <div style={{ fontSize: 10, color: '#555' }}>MT thưởng</div>
              </div>
            </div>
          )}

          {!nextMilestone && streak >= 30 && (
            <div style={{ background: '#f6c90e18', border: '1px solid #f6c90e40', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 14 }}>👑 Tối đa! Streak {streak} ngày</div>
              <div style={{ fontSize: 11, color: '#f6c90e', marginTop: 2 }}>+500 MT mỗi ngày</div>
            </div>
          )}
        </div>
      </div>

      {/* MT flash animation */}
      {flash && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          fontSize: 28, fontWeight: 800,
          color: flash.startsWith('+') ? '#f6c90e' : '#ff6b6b',
          background: '#0d0d1a', border: '1px solid #2e2e44',
          borderRadius: 12, padding: '10px 24px',
          pointerEvents: 'none', zIndex: 10,
          animation: 'none',
        }}>
          {flash}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, wallet, token, refreshWallet } = useAuth();
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(() => {
    if (token) {
      api.wallet.transactions({ limit: 6 }, token)
        .then(r => setHistory(r.transactions || []))
        .catch(() => {});
    }
  }, [token]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleCheckin = () => {
    refreshWallet && refreshWallet();
    loadHistory();
  };

  return (
    <div>
      <div style={S.h1}>Xin chào, {user?.username} 👋</div>
      <div style={S.sub}>Tổng quan tài khoản MT của bạn</div>

      {/* Onboarding */}
      <OnboardingBanner user={user} wallet={wallet} />

      {/* Check-in card */}
      <CheckinCard token={token} onCheckin={handleCheckin} />

      {/* Stats */}
      <div style={S.grid4}>
        <div style={{ ...S.statCard, borderColor: '#2a2044' }}>
          <div style={S.statLbl}>Số dư hiện tại</div>
          <div style={{ ...S.statVal, color: '#a29bfe' }}>{Number(wallet?.balance || 0).toLocaleString()}</div>
          <div style={S.statSub}>MT</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLbl}>Tổng đã kiếm</div>
          <div style={{ ...S.statVal, color: '#6fcf97' }}>{Number(wallet?.total_earned || 0).toLocaleString()}</div>
          <div style={S.statSub}>MT tất cả thời gian</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLbl}>Tổng đã tiêu</div>
          <div style={{ ...S.statVal, color: '#fd79a8' }}>{Number(wallet?.total_spent || 0).toLocaleString()}</div>
          <div style={S.statSub}>MT tất cả thời gian</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLbl}>Đã rút ra</div>
          <div style={{ ...S.statVal, color: '#fdcb6e' }}>{Number(wallet?.total_withdrawn || 0).toLocaleString()}</div>
          <div style={S.statSub}>MT → VNĐ</div>
        </div>
      </div>

      <div style={S.grid2}>
        {/* Recent transactions */}
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
                  {tx.amount > 0 ? '+' : ''}{Number(tx.amount).toLocaleString()} MT
                </div>
              </div>
            ))
          )}
          <div style={{ marginTop: 14 }}>
            <Link to="/history" style={S.btnSecondary}>Xem tất cả →</Link>
          </div>
        </div>

        {/* Quick actions */}
        <div style={S.card}>
          <div style={{ ...S.sectionTitle, marginBottom: 14 }}>Hành động nhanh</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/wallet" style={{ ...S.btnPrimary, justifyContent: 'center' }}>
              ＋ Nạp MT
            </Link>
            <Link to="/wallet" style={{ ...S.btnSecondary, justifyContent: 'center' }}>
              ↑ Rút MT ra VNĐ
            </Link>
            <Link to="/quests" style={{ ...S.btnSecondary, justifyContent: 'center' }}>
              ◆ Làm nhiệm vụ kiếm MT
            </Link>
            <Link to="/leaderboard" style={{ ...S.btnSecondary, justifyContent: 'center' }}>
              ◈ Xem bảng xếp hạng
            </Link>
          </div>
          <div style={{ marginTop: '1.25rem', padding: '12px', background: '#13131f', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Tỷ giá hôm nay</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#ddd' }}>1 MT = 1 VNĐ</div>
            <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Phí rút: 10% | Phí tip: 5%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
