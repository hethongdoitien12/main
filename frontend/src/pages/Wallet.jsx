import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';

/* ─── STYLES ─────────────────────────────────────────────────────────────── */
const S = {
  h1:       { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: '1.5rem' },
  tabs:     { display: 'flex', gap: 5, marginBottom: '1.75rem', padding: '4px', background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 10, width: 'fit-content', flexWrap: 'wrap', maxWidth: 700 },
  tab:      (a) => ({ padding: '7px 14px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: a ? '#6C5CE7' : 'transparent', color: a ? '#fff' : '#666', transition: 'all .15s', whiteSpace: 'nowrap' }),
  card:     { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.75rem', maxWidth: 560 },
  label:    { display: 'block', fontSize: 13, fontWeight: 500, color: '#999', marginBottom: 6 },
  input:    { width: '100%', padding: '10px 14px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 8, color: '#e8e6e0', fontSize: 14, outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' },
  btn:      (dis, c) => ({ width: '100%', padding: '11px', background: dis ? '#2a2a3a' : (c || '#6C5CE7'), border: 'none', borderRadius: 8, color: dis ? '#555' : '#fff', fontSize: 15, fontWeight: 600, cursor: dis ? 'not-allowed' : 'pointer' }),
  btnSm:    (c) => ({ padding: '9px 18px', background: c || '#6C5CE7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }),
  btnGhost: (a) => ({ padding: '6px 14px', background: a ? '#1e1e2e' : 'transparent', border: `1px solid ${a ? '#2e2e44' : 'transparent'}`, borderRadius: 7, color: a ? '#ccc' : '#555', fontSize: 12, fontWeight: 500, cursor: 'pointer' }),
  success:  { color: '#6fcf97', fontSize: 13, padding: '12px 14px', background: 'rgba(111,207,151,.08)', border: '1px solid rgba(111,207,151,.2)', borderRadius: 8, marginBottom: '1rem' },
  err:      { color: '#ff6b6b', fontSize: 13, padding: '12px 14px', background: 'rgba(255,107,107,.08)', border: '1px solid rgba(255,107,107,.2)', borderRadius: 8, marginBottom: '1rem' },
  info:     { fontSize: 12, color: '#666', padding: '10px 12px', background: '#13131f', borderRadius: 8, lineHeight: 1.7 },
  step:     { background: '#0d1117', border: '1px solid #1e2a1e', borderRadius: 12, padding: '1.5rem', marginTop: '1rem' },
  stepTitle:{ fontSize: 15, fontWeight: 600, color: '#6fcf97', marginBottom: '1rem' },
  gwBtn:    (s) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: s ? '#1a1a2e' : '#13131f', border: `1px solid ${s ? '#6C5CE7' : '#1e1e2e'}`, borderRadius: 10, cursor: 'pointer', marginBottom: 8, width: '100%', textAlign: 'left' }),
  preset:   (s) => ({ padding: '8px 14px', background: s ? '#6C5CE7' : '#13131f', border: `1px solid ${s ? '#6C5CE7' : '#1e1e2e'}`, borderRadius: 8, color: s ? '#fff' : '#aaa', fontSize: 13, fontWeight: 500, cursor: 'pointer' }),
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: '1.25rem' },
  statCard: (acc) => ({ background: '#13131f', border: `1px solid ${acc || '#1e1e2e'}`, borderRadius: 10, padding: '12px 14px' }),
  statLbl:  { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 },
  statVal:  (c) => ({ fontSize: 18, fontWeight: 700, color: c || '#fff' }),
  statSub:  { fontSize: 11, color: '#444', marginTop: 2 },
  txRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #0d0d18' },
  txIcon:   (pos) => ({ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: pos ? 'rgba(111,207,151,.1)' : 'rgba(255,107,107,.1)', flexShrink: 0, marginRight: 10 }),
  badge:    (s) => {
    const map = { pending: ['#1e1e0a','#fdcb6e'], completed: ['#0e2a1e','#6fcf97'], failed: ['#2a0e0e','#ff6b6b'], cancelled: ['#1a1a1a','#666'] };
    const [bg, c] = map[s] || ['#1e1e2e','#aaa'];
    return { fontSize: 10, padding: '3px 8px', borderRadius: 99, fontWeight: 600, background: bg, color: c, whiteSpace: 'nowrap' };
  },
  quickBtn: (c) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 12, cursor: 'pointer', flex: 1, color: c || '#ccc' }),
  srchResult: { background: '#13131f', border: '1px solid #2e2e44', borderRadius: 10, overflow: 'hidden', marginBottom: '1rem' },
  srchItem: (s) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: s ? '#1a1a2e' : 'transparent', borderBottom: '1px solid #1a1a28' }),
};

const GATEWAYS = [
  { value: 'momo',          label: 'MoMo',                   icon: '🟣', desc: 'Ví điện tử MoMo — sandbox' },
  { value: 'zalopay',       label: 'ZaloPay',                icon: '🔵', desc: 'ZaloPay — sandbox' },
  { value: 'bank_transfer', label: 'Chuyển khoản ngân hàng', icon: '🏦', desc: 'Admin xác nhận thủ công' },
];
const TIP_PRESETS = [10, 50, 100, 500, 1000, 5000];
const DEP_PRESETS = [10000, 50000, 100000, 200000, 500000];

const TX_META = {
  deposit:           { label: 'Nạp tiền',      icon: '💳', color: '#6fcf97' },
  withdrawal:        { label: 'Rút tiền',       icon: '🏦', color: '#ff6b6b' },
  earn_quest:        { label: 'Quest',          icon: '🏆', color: '#6fcf97' },
  earn_game:         { label: 'Chơi game',      icon: '🎮', color: '#6fcf97' },
  earn_referral:     { label: 'Giới thiệu',     icon: '👥', color: '#6fcf97' },
  earn_content:      { label: 'Tạo content',    icon: '✍️', color: '#6fcf97' },
  earn_checkin:      { label: 'Điểm danh',      icon: '📅', color: '#6fcf97' },
  earn_bonus:        { label: 'Bonus',          icon: '🎁', color: '#6fcf97' },
  spend_ticket:      { label: 'Mua vé',         icon: '🎫', color: '#fd79a8' },
  spend_item:        { label: 'Mua item',       icon: '🛍', color: '#fd79a8' },
  spend_agent:       { label: 'AI Agent',       icon: '🤖', color: '#fd79a8' },
  spend_music:       { label: 'Nhạc',           icon: '🎵', color: '#fd79a8' },
  spend_boost:       { label: 'Boost',          icon: '🚀', color: '#fd79a8' },
  tip_sent:          { label: 'Tip gửi',        icon: '💝', color: '#ff6b6b' },
  tip_received:      { label: 'Tip nhận',       icon: '💝', color: '#6fcf97' },
  transfer_sent:     { label: 'Chuyển đi',      icon: '💸', color: '#ff6b6b' },
  transfer_received: { label: 'Nhận chuyển',    icon: '💸', color: '#6fcf97' },
  gift_redeem:       { label: 'Mã quà tặng',    icon: '🎁', color: '#6fcf97' },
  refund:            { label: 'Hoàn tiền',      icon: '↩️', color: '#74b9ff' },
  expire:            { label: 'Hết hạn',        icon: '⏳', color: '#636e72' },
  admin_adjust:      { label: 'Admin',          icon: '⚙️', color: '#fdcb6e' },
};

const TX_FILTER_GROUPS = [
  { key: 'all',        label: 'Tất cả' },
  { key: 'deposit',    label: '💳 Nạp' },
  { key: 'withdrawal', label: '🏦 Rút' },
  { key: 'earn',       label: '✨ Kiếm' },
  { key: 'spend',      label: '🛍 Tiêu' },
  { key: 'tip',        label: '💝 Tip' },
  { key: 'transfer',   label: '💸 Chuyển' },
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getTier(totalEarned) {
  const n = Number(totalEarned || 0);
  if (n >= 200000) return { label: 'Kim Cương', icon: '💎', color: '#74b9ff',  next: null,   bg: 'rgba(116,185,255,.08)', border: 'rgba(116,185,255,.3)' };
  if (n >= 50000)  return { label: 'Vàng',      icon: '🥇', color: '#FFD700',  next: 200000, bg: 'rgba(255,215,0,.08)',   border: 'rgba(255,215,0,.3)' };
  if (n >= 10000)  return { label: 'Bạc',       icon: '🥈', color: '#C0C0C0',  next: 50000,  bg: 'rgba(192,192,192,.08)', border: 'rgba(192,192,192,.3)' };
  if (n >= 1000)   return { label: 'Đồng',      icon: '🥉', color: '#CD7F32',  next: 10000,  bg: 'rgba(205,127,50,.08)',  border: 'rgba(205,127,50,.3)' };
  return            { label: 'Mới',      icon: '🌱', color: '#6fcf97',  next: 1000,   bg: 'rgba(111,207,151,.08)', border: 'rgba(111,207,151,.3)' };
}

/* ─── MINI BAR CHART (SVG, no dependencies) ─────────────────────────────── */
function MiniBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const W = 300, H = 64, pad = 4;
  const maxVal = Math.max(...data.map(d => Math.max(d.earned, d.spent)), 1);
  const bw = Math.floor((W - pad * 2) / data.length);
  const halfBw = Math.floor(bw / 2) - 1;

  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      {data.map((d, i) => {
        const x = pad + i * bw;
        const earnH = Math.max(2, Math.round((d.earned / maxVal) * (H - 12)));
        const spentH = Math.max(2, Math.round((d.spent / maxVal) * (H - 12)));
        const label = new Date(d.day).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        return (
          <g key={d.day}>
            <rect x={x} y={H - 10 - earnH} width={halfBw} height={earnH} fill="#6fcf97" opacity={0.75} rx={2} />
            <rect x={x + halfBw + 1} y={H - 10 - spentH} width={halfBw} height={spentH} fill="#ff6b6b" opacity={0.6} rx={2} />
            {i % 2 === 0 && (
              <text x={x + halfBw} y={H - 1} textAnchor="middle" fontSize={7} fill="#333">{label}</text>
            )}
          </g>
        );
      })}
      <line x1={pad} y1={H - 10} x2={W - pad} y2={H - 10} stroke="#1e1e2e" strokeWidth={1} />
    </svg>
  );
}

/* ─── AVATAR ─────────────────────────────────────────────────────────────── */
function Avatar({ user, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: user?.avatar_url ? `url(${user.avatar_url}) center/cover` : 'linear-gradient(135deg,#6C5CE7,#a29bfe)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 700, color: '#fff',
    }}>
      {!user?.avatar_url && user?.username?.[0]?.toUpperCase()}
    </div>
  );
}

/* ─── USER SEARCH INPUT ──────────────────────────────────────────────────── */
function UserSearch({ token, onSelect, placeholder = 'Tìm username / email...' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!q || q.length < 2) { setResults([]); return; }
    setSearching(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/wallet/search-creators?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const d = await r.json();
        setResults(Array.isArray(d) ? d : []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [q, token]);

  const pick = (u) => { setQ(u.username); setResults([]); onSelect(u); };

  return (
    <div>
      <input style={S.input} placeholder={placeholder} value={q} onChange={e => { setQ(e.target.value); onSelect(null); }} />
      {searching && <div style={{ fontSize: 11, color: '#555', marginTop: -8, marginBottom: 8 }}>Đang tìm...</div>}
      {results.length > 0 && (
        <div style={S.srchResult}>
          {results.map(u => (
            <div key={u.id} style={S.srchItem(false)} onClick={() => pick(u)}>
              <Avatar user={u} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{u.username}</div>
                <div style={{ fontSize: 10, color: '#555' }}>{u.role === 'creator' ? '⭐ Creator' : '👤 User'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {q.length >= 2 && !searching && results.length === 0 && (
        <div style={{ fontSize: 12, color: '#444', textAlign: 'center', padding: '8px 0', marginTop: -8, marginBottom: 8 }}>
          Không tìm thấy
        </div>
      )}
    </div>
  );
}

/* ─── TỔNG QUAN TAB ─────────────────────────────────────────────────────── */
function OverviewTab({ wallet, token, setTab, expiry, user }) {
  const [recent, setRecent]       = useState([]);
  const [chartData, setChartData] = useState([]);
  const [streak, setStreak]       = useState(null);
  const [giftCode, setGiftCode]   = useState('');
  const [giftMsg, setGiftMsg]     = useState(null);
  const [giftLoading, setGiftLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/wallet/transactions?limit=5', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setRecent(d.transactions || [])).catch(() => {});
    fetch('/api/wallet/chart', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setChartData(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/checkin/status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setStreak(d)).catch(() => {});
  }, [token]);

  const redeemGift = async () => {
    if (!giftCode.trim()) return;
    setGiftLoading(true); setGiftMsg(null);
    try {
      const r = await fetch('/api/wallet/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: giftCode.trim() }),
      });
      const d = await r.json();
      if (d.ok) {
        setGiftMsg({ type: 'success', text: `🎁 Nhận ${d.amount_xu.toLocaleString()} MT từ mã ${d.code}!` });
        setGiftCode('');
      } else { setGiftMsg({ type: 'error', text: d.error }); }
    } catch (e) { setGiftMsg({ type: 'error', text: e.message }); }
    finally { setGiftLoading(false); }
  };

  const tier = getTier(wallet?.total_earned);
  const expiringMT = expiry?.batches?.filter(b => parseFloat(b.days_left) <= 30).reduce((s, b) => s + parseInt(b.remaining_xu), 0) || 0;
  const totalEarned = Number(wallet?.total_earned || 0);
  const tierProgress = tier.next ? Math.min(100, Math.round((totalEarned / tier.next) * 100)) : 100;

  const quickActions = [
    { icon: '💳', label: 'Nạp',      color: '#6fcf97', tab: 'deposit' },
    { icon: '🏦', label: 'Rút',      color: '#fdcb6e', tab: 'withdraw' },
    { icon: '💸', label: 'Chuyển',   color: '#74b9ff', tab: 'transfer' },
    { icon: '💝', label: 'Tip',      color: '#fd79a8', tab: 'tip' },
    { icon: '📋', label: 'Lịch sử',  color: '#a29bfe', tab: 'history' },
    { icon: '🎁', label: 'Mã quà',   color: '#6fcf97', tab: null },
  ];

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Balance hero */}
      <div style={{ background: 'linear-gradient(135deg,#13131f 0%,#1a1228 100%)', border: '1px solid #2e2e44', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Số dư ví</div>
        <div style={{ fontSize: 40, fontWeight: 800, color: '#a29bfe', lineHeight: 1 }}>
          {Number(wallet?.balance || 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 15, color: '#555', marginTop: 3 }}>MT</div>
        {user?.created_at && (
          <div style={{ fontSize: 11, color: '#333', marginTop: 8 }}>
            Tham gia từ {new Date(user.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' })}
          </div>
        )}
      </div>

      {/* Tier badge + streak */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        <div style={{ flex: 1, background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>{tier.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: tier.color }}>{tier.label}</span>
          </div>
          {tier.next ? (
            <>
              <div style={{ height: 4, background: '#1e1e2e', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${tierProgress}%`, background: tier.color, borderRadius: 99, transition: 'width .5s' }} />
              </div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
                {totalEarned.toLocaleString()} / {tier.next.toLocaleString()} MT
              </div>
            </>
          ) : <div style={{ fontSize: 10, color: tier.color }}>Cấp bậc cao nhất! 🎉</div>}
        </div>
        {streak && (
          <div style={{ background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 10, padding: '10px 14px', minWidth: 90, textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>{streak.current_streak >= 7 ? '🔥' : '📅'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: streak.current_streak >= 7 ? '#fdcb6e' : '#ccc' }}>
              {streak.current_streak || 0}
            </div>
            <div style={{ fontSize: 10, color: '#555' }}>streak</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={S.statGrid}>
        <div style={S.statCard('#6fcf9720')}>
          <div style={S.statLbl}>Đã kiếm</div>
          <div style={S.statVal('#6fcf97')}>{Number(wallet?.total_earned || 0).toLocaleString()}</div>
          <div style={S.statSub}>MT</div>
        </div>
        <div style={S.statCard('#fd79a820')}>
          <div style={S.statLbl}>Đã tiêu</div>
          <div style={S.statVal('#fd79a8')}>{Number(wallet?.total_spent || 0).toLocaleString()}</div>
          <div style={S.statSub}>MT</div>
        </div>
        <div style={S.statCard('#fdcb6e20')}>
          <div style={S.statLbl}>Đã rút</div>
          <div style={S.statVal('#fdcb6e')}>{Number(wallet?.total_withdrawn || 0).toLocaleString()}</div>
          <div style={S.statSub}>MT</div>
        </div>
      </div>

      {/* 7-day chart */}
      {chartData.length > 0 && (
        <div style={{ background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 10, padding: '14px 16px', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#ccc' }}>Biểu đồ 7 ngày</div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#555' }}>
              <span><span style={{ color: '#6fcf97' }}>■</span> Kiếm</span>
              <span><span style={{ color: '#ff6b6b' }}>■</span> Tiêu</span>
            </div>
          </div>
          <MiniBarChart data={chartData} />
        </div>
      )}

      {/* MT expiry warning */}
      {expiringMT > 0 && (
        <div style={{ background: '#2a1a0a', border: '1px solid #fdcb6e40', borderRadius: 10, padding: '12px 16px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12 }}>
            <span style={{ color: '#fdcb6e', fontWeight: 600 }}>⏳ {expiringMT.toLocaleString()} MT</span>
            <span style={{ color: '#666' }}> sắp hết hạn (30 ngày)</span>
          </div>
          <button onClick={() => setTab('expiry')} style={{ padding: '4px 10px', background: '#fdcb6e15', border: '1px solid #fdcb6e40', borderRadius: 6, color: '#fdcb6e', fontSize: 11, cursor: 'pointer' }}>Xem →</button>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {quickActions.map(a => (
          <button key={a.label} style={S.quickBtn(a.color)} onClick={() => a.tab && setTab(a.tab)}>
            <span style={{ fontSize: 20 }}>{a.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Gift code */}
      <div style={{ background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 10, padding: '14px 16px', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#ccc', marginBottom: 8 }}>🎁 Nhập mã quà tặng</div>
        {giftMsg && <div style={giftMsg.type === 'success' ? { ...S.success, marginBottom: 8 } : { ...S.err, marginBottom: 8 }}>{giftMsg.text}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ ...S.input, marginBottom: 0, flex: 1, padding: '8px 12px', fontSize: 13, textTransform: 'uppercase' }}
            placeholder="WELCOME500"
            value={giftCode}
            onChange={e => setGiftCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && redeemGift()}
          />
          <button style={{ ...S.btnSm(), whiteSpace: 'nowrap', padding: '8px 16px' }}
            onClick={redeemGift} disabled={!giftCode.trim() || giftLoading}>
            {giftLoading ? '...' : 'Nhận'}
          </button>
        </div>
      </div>

      {/* Recent transactions */}
      {recent.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#ccc' }}>Giao dịch gần đây</div>
            <button onClick={() => setTab('history')} style={{ fontSize: 12, color: '#6C5CE7', background: 'none', border: 'none', cursor: 'pointer' }}>Xem tất cả →</button>
          </div>
          {recent.map(tx => {
            const meta = TX_META[tx.type] || { label: tx.type, icon: '•', color: '#aaa' };
            return (
              <div key={tx.id} style={S.txRow}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={S.txIcon(tx.amount > 0)}>{meta.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, color: '#ccc', fontWeight: 500 }}>{meta.label}</div>
                    <div style={{ fontSize: 11, color: '#444' }}>{fmtDate(tx.created_at)}</div>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>
                  {tx.amount > 0 ? '+' : ''}{parseInt(tx.amount).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── TIP TAB ────────────────────────────────────────────────────────────── */
function TipTab({ token, wallet, refreshWallet }) {
  const [selected, setSelected] = useState(null);
  const [amount, setAmount]     = useState('');
  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState(null);
  const [recentTips, setRecentTips] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/wallet/transactions?limit=50&type=tip_sent', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const seen = new Set();
        const uniq = [];
        (d.transactions || []).forEach(tx => {
          const name = tx.description?.match(/cho (.+?)( —|$)/)?.[1];
          if (name && !seen.has(name)) { seen.add(name); uniq.push({ name, meta: tx }); }
        });
        setRecentTips(uniq.slice(0, 4));
      })
      .catch(() => {});
  }, [token]);

  const sendTip = async () => {
    if (!selected || !amount || parseInt(amount) < 10) return;
    setLoading(true); setMsg(null);
    try {
      const r = await fetch('/api/wallet/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiver_id: selected.id, amount_xu: parseInt(amount), message }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ type: 'success', text: `💝 Đã gửi ${parseInt(amount).toLocaleString()} MT cho ${selected.username}! Creator nhận ${Math.floor(parseInt(amount)*0.95).toLocaleString()} MT.` });
      setAmount(''); setMessage(''); setSelected(null);
      await refreshWallet();
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  };

  const balance = parseInt(wallet?.balance || 0);

  return (
    <div>
      {msg && <div style={msg.type === 'success' ? S.success : S.err}>{msg.text}</div>}

      {recentTips.length > 0 && !selected && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Gần đây</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {recentTips.map(({ name }) => (
              <button key={name} style={{ padding: '5px 12px', background: '#13131f', border: '1px solid #2e2e44', borderRadius: 99, color: '#aaa', fontSize: 12, cursor: 'pointer' }}>
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!selected ? (
        <>
          <label style={S.label}>Tìm creator / người dùng</label>
          <UserSearch token={token} onSelect={setSelected} />
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#13131f', border: '1px solid #2e2e44', borderRadius: 10, marginBottom: '1.25rem' }}>
            <Avatar user={selected} size={42} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{selected.username}</div>
              <div style={{ fontSize: 11, color: '#555' }}>{selected.role === 'creator' ? '⭐ Creator' : '👤 User'}</div>
            </div>
            <button onClick={() => { setSelected(null); setAmount(''); setMsg(null); }} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>

          <label style={S.label}>Số MT muốn tip</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
            {TIP_PRESETS.map(p => <button key={p} style={S.preset(parseInt(amount) === p)} onClick={() => setAmount(String(p))}>{p.toLocaleString()}</button>)}
          </div>
          <input style={S.input} type="number" placeholder="Hoặc nhập số lượng..." min="10"
            value={amount} onChange={e => setAmount(e.target.value)} />

          {parseInt(amount) >= 10 && (
            <div style={{ ...S.info, marginTop: 0, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Creator nhận: <strong style={{ color: '#6fcf97' }}>{Math.floor(parseInt(amount) * 0.95).toLocaleString()} MT</strong></span>
              <span style={{ color: '#444' }}>Phí 5%: {Math.ceil(parseInt(amount) * 0.05).toLocaleString()}</span>
            </div>
          )}
          {parseInt(amount) > balance && <div style={{ ...S.err, marginBottom: '1rem' }}>⚠️ Số dư không đủ ({balance.toLocaleString()} MT)</div>}

          <label style={S.label}>Lời nhắn (tuỳ chọn)</label>
          <input style={S.input} placeholder="Ủng hộ bạn nhé! 💪" maxLength={200} value={message} onChange={e => setMessage(e.target.value)} />

          <button style={S.btn(!amount || parseInt(amount) < 10 || parseInt(amount) > balance || loading)}
            onClick={sendTip} disabled={!amount || parseInt(amount) < 10 || parseInt(amount) > balance || loading}>
            {loading ? 'Đang gửi...' : `💝 Gửi ${parseInt(amount || 0).toLocaleString()} MT cho ${selected.username}`}
          </button>
        </>
      )}
    </div>
  );
}

/* ─── LỊCH SỬ TAB ────────────────────────────────────────────────────────── */
function HistoryTab({ token }) {
  const [txs, setTxs]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async (f, off, reset) => {
    setLoading(true);
    try {
      let tp = '';
      if (f === 'earn') tp = '&type=earn_quest&type=earn_game&type=earn_referral&type=earn_content&type=earn_checkin&type=earn_bonus&type=gift_redeem&type=transfer_received';
      else if (f === 'spend') tp = '&type=spend_ticket&type=spend_item&type=spend_agent&type=spend_music&type=spend_boost';
      else if (f === 'tip') tp = '&type=tip_sent&type=tip_received';
      else if (f === 'transfer') tp = '&type=transfer_sent&type=transfer_received';
      else if (f !== 'all') tp = `&type=${f}`;

      const r = await fetch(`/api/wallet/transactions?limit=${LIMIT}&offset=${off}${tp}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      const rows = d.transactions || [];
      setHasMore(rows.length === LIMIT);
      setTxs(prev => reset ? rows : [...prev, ...rows]);
    } catch { } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { setOffset(0); load(filter, 0, true); }, [filter, load]);

  const exportCSV = () => {
    const csvUrl = `/api/wallet/export-csv?token=${encodeURIComponent(token)}`;
    window.open(csvUrl, '_blank');
  };

  const total = filter !== 'all' ? txs.reduce((s, tx) => s + parseInt(tx.amount), 0) : 0;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
          {TX_FILTER_GROUPS.map(g => <button key={g.key} style={S.btnGhost(filter === g.key)} onClick={() => setFilter(g.key)}>{g.label}</button>)}
        </div>
        <button onClick={exportCSV} style={{ padding: '6px 12px', background: '#13131f', border: '1px solid #2e2e44', borderRadius: 7, color: '#a29bfe', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          📥 Xuất CSV
        </button>
      </div>

      {filter !== 'all' && txs.length > 0 && (
        <div style={{ ...S.info, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{txs.length} giao dịch</span>
          <span style={{ fontWeight: 600, color: total >= 0 ? '#6fcf97' : '#ff6b6b' }}>
            {total >= 0 ? '+' : ''}{total.toLocaleString()} MT
          </span>
        </div>
      )}

      {loading && txs.length === 0 && <div style={{ color: '#444', fontSize: 13, padding: '2rem', textAlign: 'center' }}>Đang tải...</div>}
      {!loading && txs.length === 0 && <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: '2.5rem' }}>Chưa có giao dịch nào</div>}

      {txs.map(tx => {
        const meta = TX_META[tx.type] || { label: tx.type, icon: '•', color: '#aaa' };
        return (
          <div key={tx.id} style={S.txRow}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={S.txIcon(tx.amount > 0)}>{meta.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#ccc', fontWeight: 500 }}>{meta.label}</div>
                {tx.description && <div style={{ fontSize: 11, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>}
                <div style={{ fontSize: 11, color: '#333' }}>{fmtDate(tx.created_at)}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>
                {tx.amount > 0 ? '+' : ''}{parseInt(tx.amount).toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: '#333' }}>→ {parseInt(tx.balance_after).toLocaleString()}</div>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <button onClick={() => { const n = offset + LIMIT; setOffset(n); load(filter, n, false); }} disabled={loading}
          style={{ width: '100%', marginTop: '1rem', padding: '10px', background: 'transparent', border: '1px solid #2e2e44', borderRadius: 8, color: '#666', fontSize: 13, cursor: 'pointer' }}>
          {loading ? 'Đang tải...' : '↓ Tải thêm'}
        </button>
      )}
    </div>
  );
}

/* ─── RÚT MT TAB ─────────────────────────────────────────────────────────── */
function WithdrawTab({ token, wallet, refreshWallet }) {
  const [subTab, setSubTab] = useState('form');
  const [form, setForm]     = useState({ amountXu: '', bankName: '', bankAccount: '', accountName: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]       = useState(null);
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const handleW = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const r = await fetch('/api/withdrawals/mine', { headers: { Authorization: `Bearer ${token}` } });
      setHistory(Array.isArray(await r.json()) ? await r.json() : []);
    } catch { } finally { setHistLoading(false); }
  }, [token]);

  useEffect(() => { if (subTab === 'history') loadHistory(); }, [subTab, loadHistory]);

  const submit = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount_xu: parseInt(form.amountXu), bank_name: form.bankName, bank_account: form.bankAccount, account_name: form.accountName }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ type: 'success', text: `✅ Đã gửi yêu cầu! Bạn sẽ nhận ${d.amount_vnd?.toLocaleString() || Math.floor(parseInt(form.amountXu)*0.9).toLocaleString()} VNĐ sau khi admin duyệt.` });
      setForm({ amountXu: '', bankName: '', bankAccount: '', accountName: '' });
      await refreshWallet();
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  };

  const canSubmit = parseInt(form.amountXu || 0) >= 50000 && form.bankAccount && form.bankName && form.accountName;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem' }}>
        {[['form','📝 Tạo yêu cầu'],['history','📋 Lịch sử rút']].map(([k,l]) => (
          <button key={k} style={S.btnGhost(subTab === k)} onClick={() => setSubTab(k)}>{l}</button>
        ))}
      </div>

      {subTab === 'form' && (
        <>
          {msg && <div style={msg.type === 'success' ? S.success : S.err}>{msg.text}</div>}
          <label style={S.label}>Số MT muốn rút <span style={{ color: '#555' }}>(tối thiểu 50,000)</span></label>
          <input style={S.input} type="number" name="amountXu" placeholder="50000" min="50000" value={form.amountXu} onChange={handleW} />
          {parseInt(form.amountXu) >= 50000 && (
            <div style={{ ...S.info, marginTop: 0, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Phí 10%: <strong style={{ color: '#ff6b6b' }}>{Math.floor(parseInt(form.amountXu)*0.1).toLocaleString()} MT</strong></span>
              <span>Bạn nhận: <strong style={{ color: '#6fcf97' }}>{Math.floor(parseInt(form.amountXu)*0.9).toLocaleString()} VNĐ</strong></span>
            </div>
          )}
          <label style={S.label}>Tên ngân hàng</label>
          <input style={S.input} name="bankName" placeholder="Vietcombank / Techcombank / MB Bank..." value={form.bankName} onChange={handleW} />
          <label style={S.label}>Số tài khoản</label>
          <input style={S.input} name="bankAccount" placeholder="0123456789" value={form.bankAccount} onChange={handleW} />
          <label style={S.label}>Tên chủ tài khoản</label>
          <input style={S.input} name="accountName" placeholder="NGUYEN VAN A" value={form.accountName} onChange={handleW} />
          <button style={S.btn(!canSubmit || loading)} onClick={submit} disabled={!canSubmit || loading}>
            {loading ? 'Đang gửi...' : '🏦 Gửi yêu cầu rút'}
          </button>
          <div style={{ ...S.info, marginTop: '1rem' }}>Yêu cầu rút sẽ được admin xét duyệt trong 1–3 ngày làm việc.</div>
        </>
      )}

      {subTab === 'history' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button style={S.btnGhost(false)} onClick={loadHistory}>↻ Làm mới</button>
          </div>
          {histLoading && <div style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '2rem' }}>Đang tải...</div>}
          {!histLoading && history.length === 0 && <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: '2.5rem' }}>Chưa có yêu cầu rút nào</div>}
          {history.map(wr => (
            <div key={wr.id} style={{ background: '#13131f', borderRadius: 10, padding: '14px 16px', marginBottom: 8, border: '1px solid #1a1a28' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fdcb6e' }}>-{parseInt(wr.amount_xu).toLocaleString()} MT</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>→ {parseInt(wr.amount_vnd).toLocaleString()} VNĐ (phí {parseInt(wr.fee_xu).toLocaleString()} MT)</div>
                </div>
                <span style={S.badge(wr.status)}>
                  {wr.status === 'pending' ? '⏳ Chờ duyệt' : wr.status === 'completed' ? '✅ Xong' : wr.status === 'failed' ? '❌ Từ chối' : wr.status}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#555' }}>🏦 {wr.bank_name} · {wr.bank_account} · 📅 {fmtDate(wr.created_at)}</div>
              {wr.bank_transfer_ref && <div style={{ fontSize: 11, color: '#6fcf97', marginTop: 4 }}>Mã GD: {wr.bank_transfer_ref}</div>}
              {wr.notes && wr.status === 'failed' && <div style={{ fontSize: 11, color: '#ff6b6b', marginTop: 4 }}>Lý do: {wr.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── CHUYỂN MT TAB ──────────────────────────────────────────────────────── */
function TransferTab({ token, wallet, refreshWallet }) {
  const [selected, setSelected] = useState(null);
  const [amount, setAmount]     = useState('');
  const [note, setNote]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState(null);

  const doTransfer = async () => {
    if (!selected || !amount || parseInt(amount) < 1) return;
    setLoading(true); setMsg(null);
    try {
      const r = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiver_id: selected.id, amount_xu: parseInt(amount), note }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ type: 'success', text: `✅ Đã chuyển ${parseInt(amount).toLocaleString()} MT cho ${d.receiver_username}! (0% phí)` });
      setAmount(''); setNote(''); setSelected(null);
      await refreshWallet();
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  };

  const balance = parseInt(wallet?.balance || 0);

  return (
    <div>
      {msg && <div style={msg.type === 'success' ? S.success : S.err}>{msg.text}</div>}

      <div style={{ ...S.info, marginBottom: '1.25rem', color: '#aaa' }}>
        💸 Chuyển MT trực tiếp — <strong style={{ color: '#6fcf97' }}>0% phí</strong>. Khác với Tip, người nhận không cần là creator.
      </div>

      {!selected ? (
        <>
          <label style={S.label}>Tìm người nhận</label>
          <UserSearch token={token} onSelect={setSelected} />
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#13131f', border: '1px solid #2e2e44', borderRadius: 10, marginBottom: '1.25rem' }}>
            <Avatar user={selected} size={42} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{selected.username}</div>
              <div style={{ fontSize: 11, color: '#555' }}>{selected.role === 'creator' ? '⭐ Creator' : '👤 User'}</div>
            </div>
            <button onClick={() => { setSelected(null); setAmount(''); setMsg(null); }} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>

          <label style={S.label}>Số MT muốn chuyển</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
            {[100, 500, 1000, 5000, 10000].map(p => (
              <button key={p} style={S.preset(parseInt(amount) === p)} onClick={() => setAmount(String(p))}>{p.toLocaleString()}</button>
            ))}
          </div>
          <input style={S.input} type="number" placeholder="Số MT..." min="1" value={amount} onChange={e => setAmount(e.target.value)} />

          {parseInt(amount) > 0 && parseInt(amount) <= balance && (
            <div style={{ ...S.info, marginTop: 0, marginBottom: '1rem', color: '#6fcf97' }}>
              {selected.username} sẽ nhận đúng <strong>{parseInt(amount).toLocaleString()} MT</strong> (không khấu phí)
            </div>
          )}
          {parseInt(amount) > balance && <div style={{ ...S.err, marginBottom: '1rem' }}>⚠️ Số dư không đủ ({balance.toLocaleString()} MT)</div>}

          <label style={S.label}>Ghi chú (tuỳ chọn)</label>
          <input style={S.input} placeholder="Chuyển tiền nhé..." maxLength={200} value={note} onChange={e => setNote(e.target.value)} />

          <button style={S.btn(!amount || parseInt(amount) < 1 || parseInt(amount) > balance || loading, '#74b9ff')}
            onClick={doTransfer} disabled={!amount || parseInt(amount) < 1 || parseInt(amount) > balance || loading}>
            {loading ? 'Đang chuyển...' : `💸 Chuyển ${parseInt(amount || 0).toLocaleString()} MT`}
          </button>
        </>
      )}
    </div>
  );
}

/* ─── NOTIFICATIONS TAB ──────────────────────────────────────────────────── */
function NotificationsTab({ token }) {
  const [notifs, setNotifs]   = useState([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/notifications?limit=30', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setNotifs(d.notifications || []);
      setUnread(d.unread_count || 0);
    } catch { } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      setNotifs(n => n.map(x => ({ ...x, read: true })));
      setUnread(0);
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
      setUnread(u => Math.max(0, u - 1));
    } catch {}
  };

  const deleteNotif = async (id) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setNotifs(n => n.filter(x => x.id !== id));
    } catch {}
  };

  const NOTIF_ICONS = {
    deposit: '💳', withdrawal_approved: '✅', withdrawal_rejected: '❌',
    tip_received: '💝', transfer_received: '💸', kyc_submitted: '📋',
    kyc_approved: '✅', kyc_rejected: '❌', system: '📢', quest: '🏆', gift: '🎁',
  };

  if (loading) return <div style={{ color: '#444', fontSize: 13, padding: '2rem', textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: 13, color: '#ccc' }}>
          {unread > 0 ? <span style={{ color: '#a29bfe', fontWeight: 600 }}>{unread} chưa đọc</span> : 'Tất cả đã đọc'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unread > 0 && <button style={S.btnGhost(false)} onClick={markAllRead}>Đọc tất cả</button>}
          <button style={S.btnGhost(false)} onClick={load}>↻</button>
        </div>
      </div>

      {notifs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#333', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔔</div>
          Chưa có thông báo nào
        </div>
      )}

      {notifs.map(n => (
        <div key={n.id} onClick={() => !n.read && markRead(n.id)}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', marginBottom: 6,
            background: n.read ? 'transparent' : '#13131f',
            border: `1px solid ${n.read ? 'transparent' : '#2e2e44'}`,
            borderRadius: 10, cursor: n.read ? 'default' : 'pointer', position: 'relative',
          }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            {NOTIF_ICONS[n.type] || '📢'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: n.read ? '#888' : '#ccc' }}>
              {n.title}
              {!n.read && <span style={{ marginLeft: 6, width: 6, height: 6, borderRadius: '50%', background: '#6C5CE7', display: 'inline-block', verticalAlign: 'middle' }} />}
            </div>
            {n.body && <div style={{ fontSize: 12, color: '#555', marginTop: 2, lineHeight: 1.5 }}>{n.body}</div>}
            <div style={{ fontSize: 11, color: '#333', marginTop: 4 }}>{fmtDate(n.created_at)}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
            style={{ background: 'transparent', border: 'none', color: '#333', fontSize: 14, cursor: 'pointer', padding: '0 4px', flexShrink: 0, lineHeight: 1 }}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── LEADERBOARD TAB ────────────────────────────────────────────────────── */
function LeaderboardTab({ token, currentUserId }) {
  const [period, setPeriod] = useState('alltime');
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/wallet/leaderboard?period=${p}&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
      setData(await r.json());
    } catch { } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(period); }, [period, load]);

  const medalColor = r => r === 1 ? '#FFD700' : r === 2 ? '#C0C0C0' : r === 3 ? '#CD7F32' : null;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem' }}>
        {[['alltime','Mọi thời'],['month','Tháng này'],['week','Tuần này']].map(([k,l]) => (
          <button key={k} style={S.btnGhost(period === k)} onClick={() => setPeriod(k)}>{l}</button>
        ))}
        <div style={{ marginLeft: 'auto' }}><button style={S.btnGhost(false)} onClick={() => load(period)}>↻</button></div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '2.5rem', color: '#444', fontSize: 13 }}>Đang tải...</div>}
      {!loading && data?.entries?.length === 0 && <div style={{ textAlign: 'center', padding: '2.5rem', color: '#333', fontSize: 13 }}><div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>Chưa có dữ liệu</div>}

      {!loading && data?.entries?.map(e => {
        const isMe = e.id === currentUserId;
        const medal = medalColor(parseInt(e.rank));
        return (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: isMe ? 'rgba(108,92,231,.12)' : parseInt(e.rank) <= 3 ? 'rgba(255,215,0,.04)' : 'transparent', borderRadius: 10, border: isMe ? '1px solid rgba(108,92,231,.35)' : parseInt(e.rank) <= 3 ? '1px solid rgba(255,215,0,.12)' : '1px solid transparent', marginBottom: 6 }}>
            <div style={{ width: 30, textAlign: 'center', flexShrink: 0 }}>
              {medal ? <span style={{ fontSize: 18 }}>{parseInt(e.rank) === 1 ? '🥇' : parseInt(e.rank) === 2 ? '🥈' : '🥉'}</span>
                : <span style={{ fontSize: 13, fontWeight: 700, color: '#444' }}>#{e.rank}</span>}
            </div>
            <Avatar user={e} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: isMe ? 700 : 500, color: isMe ? '#a29bfe' : '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.username} {isMe && <span style={{ fontSize: 10, color: '#6C5CE7' }}>● bạn</span>}
              </div>
              <div style={{ fontSize: 10, color: '#444' }}>{e.role === 'creator' ? '⭐ Creator' : '👤 User'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: medal || '#a29bfe' }}>{Number(e.xu_earned).toLocaleString()}</div>
              <div style={{ fontSize: 10, color: '#444' }}>MT kiếm được</div>
            </div>
          </div>
        );
      })}

      {!loading && data?.myRank && !data.entries?.find(e => e.id === currentUserId) && (
        <>
          <div style={{ textAlign: 'center', color: '#333', fontSize: 12, padding: '4px 0 8px' }}>• • •</div>
          <div style={{ ...S.info, display: 'flex', justifyContent: 'space-between' }}>
            <span>Vị trí của bạn</span>
            <span style={{ fontWeight: 700, color: '#a29bfe' }}>#{data.myRank.rank} — {Number(data.myRank.xu_earned).toLocaleString()} MT</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── EXPIRY TAB ─────────────────────────────────────────────────────────── */
function ExpiryTab({ token }) {
  const [expiry, setExpiry]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/wallet/expiry-info', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setExpiry(d)).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const srcLabel = { earn_quest: 'Quest', earn_referral: 'Giới thiệu', earn_checkin: 'Điểm danh', earn_content: 'Content', bonus: 'Bonus' };

  if (loading) return <div style={{ color: '#444', fontSize: 13, padding: '2rem' }}>Đang tải...</div>;
  if (!expiry?.batches?.length) return (
    <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: '2.5rem' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>Không có MT nào sắp hết hạn
    </div>
  );

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ ...S.info, marginBottom: '1.25rem', color: '#aaa' }}>
        MT kiếm từ quest, giới thiệu, điểm danh hết hạn sau 90 ngày. MT nạp tiền không hết hạn.
      </div>
      {expiry.total_expiring_7d > 0 && (
        <div style={{ background: '#2a1a0a', border: '1px solid #fdcb6e40', borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fdcb6e' }}>⚠️ {expiry.total_expiring_7d.toLocaleString()} MT hết hạn trong 7 ngày!</div>
        </div>
      )}
      {expiry.batches.map(b => {
        const days = Math.max(0, Math.floor(parseFloat(b.days_left)));
        const urgent = days <= 7, soon = days <= 30;
        return (
          <div key={b.id} style={{ background: '#13131f', border: `1px solid ${urgent ? '#fdcb6e30' : '#1a1a28'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: urgent ? '#fdcb6e' : soon ? '#e17055' : '#ccc' }}>{parseInt(b.remaining_xu).toLocaleString()} MT</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                {srcLabel[b.source_type] || b.source_type} · {new Date(b.granted_at).toLocaleDateString('vi-VN')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: urgent ? '#fdcb6e' : soon ? '#e17055' : '#555' }}>{days === 0 ? 'Hôm nay!' : `${days} ngày`}</div>
              <div style={{ fontSize: 10, color: '#444' }}>{new Date(b.expires_at).toLocaleDateString('vi-VN')}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── MAIN WALLET ────────────────────────────────────────────────────────── */
export default function Wallet() {
  const { user, wallet, token, refreshWallet } = useAuth();
  const [tab, setTab]         = useState('overview');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState(null);

  // KYC
  const [kyc, setKyc]             = useState(null);
  const [kycForm, setKycForm]     = useState({ fullName: '', idNumber: '' });
  const [kycLoading, setKycLoading] = useState(false);
  const [kycMsg, setKycMsg]       = useState(null);

  // Deposit
  const [amount, setAmount]   = useState('');
  const [gateway, setGateway] = useState('momo');
  const [payStep, setPayStep] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Deposit history sub-tab
  const [depSubTab, setDepSubTab] = useState('form');
  const [depHistory, setDepHistory] = useState([]);
  const [depHistLoading, setDepHistLoading] = useState(false);

  // Expiry
  const [expiry, setExpiry] = useState(null);

  const loadKyc = useCallback(async () => {
    if (!token) return;
    try { const r = await fetch('/api/user/kyc', { headers: { Authorization: `Bearer ${token}` } }); if (r.ok) setKyc(await r.json()); } catch {}
  }, [token]);

  const loadExpiry = useCallback(async () => {
    if (!token) return;
    try { const r = await fetch('/api/wallet/expiry-info', { headers: { Authorization: `Bearer ${token}` } }); if (r.ok) setExpiry(await r.json()); } catch {}
  }, [token]);

  const loadDepHistory = useCallback(async () => {
    if (!token) return;
    setDepHistLoading(true);
    try {
      const r = await fetch('/api/wallet/deposits?limit=20', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setDepHistory(Array.isArray(d) ? d : []);
    } catch { } finally { setDepHistLoading(false); }
  }, [token]);

  useEffect(() => { loadKyc(); loadExpiry(); }, [loadKyc, loadExpiry]);
  useEffect(() => { if (depSubTab === 'history') loadDepHistory(); }, [depSubTab, loadDepHistory]);

  const submitKyc = async () => {
    if (!kycForm.fullName.trim() || !kycForm.idNumber.trim()) return;
    setKycLoading(true); setKycMsg(null);
    try {
      const r = await fetch('/api/user/kyc/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: kycForm.fullName, id_number: kycForm.idNumber }),
      });
      const d = await r.json();
      if (d.ok) { setKycMsg({ type: 'success', text: '✅ Hồ sơ KYC đã nộp! Admin sẽ xem xét trong 1-2 ngày.' }); loadKyc(); }
      else setKycMsg({ type: 'error', text: d.error });
    } catch (e) { setKycMsg({ type: 'error', text: e.message }); }
    finally { setKycLoading(false); }
  };

  const submitDeposit = async () => {
    if (!amount || parseInt(amount) < 10000) return;
    setLoading(true); setMsg(null); setPayStep(null);
    try {
      const r = await fetch('/api/wallet/deposit/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vnd_amount: parseInt(amount), payment_gateway: gateway }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (gateway === 'bank_transfer') setPayStep({ deposit_id: d.deposit_id, gateway, amount_vnd: d.amount_vnd, pay_url: null });
      else if (d.pay_url) { setPayStep({ deposit_id: d.deposit_id, gateway, amount_vnd: d.amount_vnd, pay_url: d.pay_url }); window.open(d.pay_url, '_blank'); }
      else if (d.gateway_error) { setMsg({ type: 'error', text: `Lỗi ${gateway}: ${d.gateway_error}` }); setPayStep({ deposit_id: d.deposit_id, gateway, amount_vnd: d.amount_vnd, sandbox_only: true }); }
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  };

  const confirmDeposit = async () => {
    if (!payStep) return;
    setConfirming(true); setMsg(null);
    try {
      const r = await fetch('/api/wallet/deposit/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ deposit_id: payStep.deposit_id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ type: 'success', text: `✅ Nạp thành công! +${parseInt(payStep.amount_vnd).toLocaleString()} MT` });
      setPayStep(null); setAmount('');
      await refreshWallet(); loadExpiry();
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setConfirming(false); }
  };

  const switchTab = (t) => { setTab(t); setMsg(null); };

  const TABS = [
    ['overview',     '📊 Tổng quan'],
    ['deposit',      '💳 Nạp MT'],
    ['withdraw',     '🏦 Rút MT'],
    ['transfer',     '💸 Chuyển MT'],
    ['tip',          '💝 Gửi Tip'],
    ['history',      '📋 Lịch sử'],
    ['leaderboard',  '🏆 Bảng xếp hạng'],
    ['notifications','🔔 Thông báo'],
    ['expiry',       '⏳ Hết hạn'],
    ['kyc',          '🪪 KYC'],
  ];

  const DEP_STATUS = { pending: '⏳ Chờ', completed: '✅ Hoàn thành', failed: '❌ Lỗi', processing: '🔄 Đang xử lý', refunded: '↩️ Hoàn lại' };
  const PAY_LABEL = { momo: '🟣 MoMo', zalopay: '🔵 ZaloPay', bank_transfer: '🏦 CK Ngân hàng', vnpay: '🟢 VNPay' };

  return (
    <div>
      <div style={S.h1}>Ví MT</div>

      {/* KYC banner */}
      {wallet?.balance > 800_000 && kyc && kyc.kyc_status !== 'verified' && (
        <div style={{ background: kyc.kyc_status === 'pending' ? '#6C5CE715' : '#fdcb6e12', border: `1px solid ${kyc.kyc_status === 'pending' ? '#6C5CE740' : '#fdcb6e40'}`, borderRadius: 10, padding: '12px 16px', maxWidth: 700, marginBottom: '1.25rem', fontSize: 13 }}>
          {kyc.kyc_status === 'pending'
            ? <div style={{ color: '#a29bfe' }}>🔍 <strong>KYC đang chờ duyệt</strong> — Admin sẽ xem xét trong 1–2 ngày.</div>
            : <div style={{ color: '#fdcb6e' }}>⚠️ <strong>Xác minh danh tính</strong> — Cần KYC để rút trên 1,000,000 MT.
                <button onClick={() => switchTab('kyc')} style={{ marginLeft: 12, padding: '3px 10px', background: '#fdcb6e20', border: '1px solid #fdcb6e60', borderRadius: 6, color: '#fdcb6e', fontSize: 12, cursor: 'pointer' }}>Xác minh →</button>
              </div>}
        </div>
      )}

      <div style={S.tabs}>
        {TABS.map(([k, l]) => (
          <button key={k} style={S.tab(tab === k)} onClick={() => switchTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── TỔNG QUAN ── */}
      {tab === 'overview' && <OverviewTab wallet={wallet} token={token} setTab={switchTab} expiry={expiry} user={user} />}

      {/* ── NẠP MT ── */}
      {tab === 'deposit' && (
        <div style={S.card}>
          <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem' }}>
            {[['form','💳 Tạo đơn nạp'],['history','📋 Lịch sử nạp']].map(([k,l]) => (
              <button key={k} style={S.btnGhost(depSubTab === k)} onClick={() => setDepSubTab(k)}>{l}</button>
            ))}
          </div>

          {depSubTab === 'form' && (
            <>
              {msg && <div style={msg.type === 'success' ? S.success : S.err}>{msg.text}</div>}
              {!payStep && (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {DEP_PRESETS.map(p => <button key={p} style={S.preset(parseInt(amount) === p)} onClick={() => setAmount(String(p))}>{p.toLocaleString()}đ</button>)}
                  </div>
                  <label style={S.label}>Số tiền (VNĐ) — tối thiểu 10,000</label>
                  <input style={S.input} type="number" placeholder="100000" min="10000" step="10000" value={amount} onChange={e => setAmount(e.target.value)} />
                  {amount && parseInt(amount) >= 10000 && (
                    <div style={{ ...S.info, marginTop: 0, marginBottom: '1rem', color: '#a29bfe', fontWeight: 600 }}>
                      Bạn nhận: {parseInt(amount).toLocaleString()} MT · 1 VNĐ = 1 MT · Miễn phí
                    </div>
                  )}
                  <label style={S.label}>Phương thức thanh toán</label>
                  {GATEWAYS.map(gw => (
                    <button key={gw.value} style={S.gwBtn(gateway === gw.value)} onClick={() => setGateway(gw.value)}>
                      <span style={{ fontSize: 20 }}>{gw.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: gateway === gw.value ? '#a29bfe' : '#ccc' }}>{gw.label}</div>
                        <div style={{ fontSize: 11, color: '#555' }}>{gw.desc}</div>
                      </div>
                      {gateway === gw.value && <span style={{ marginLeft: 'auto', color: '#6C5CE7', fontSize: 18 }}>✓</span>}
                    </button>
                  ))}
                  <button style={{ ...S.btn(!amount || parseInt(amount) < 10000 || loading), marginTop: '0.5rem' }}
                    onClick={submitDeposit} disabled={!amount || parseInt(amount) < 10000 || loading}>
                    {loading ? 'Đang tạo đơn...' : `Nạp qua ${GATEWAYS.find(g => g.value === gateway)?.label}`}
                  </button>
                </>
              )}

              {payStep && (
                <div style={S.step}>
                  <div style={S.stepTitle}>Bước 2 — Hoàn tất thanh toán</div>
                  <div style={{ fontSize: 13, color: '#aaa', marginBottom: '1rem', lineHeight: 1.7 }}>
                    Số tiền: <strong style={{ color: '#fff' }}>{parseInt(payStep.amount_vnd).toLocaleString()} VNĐ</strong><br />
                    Mã đơn: <span style={{ color: '#555', fontFamily: 'monospace', fontSize: 11 }}>{payStep.deposit_id}</span>
                  </div>
                  {payStep.pay_url && (
                    <>
                      <a href={payStep.pay_url} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', padding: '11px', background: '#1a1a2e', border: '1px solid #6C5CE7', borderRadius: 8, color: '#a29bfe', fontWeight: 600, marginBottom: 12, textDecoration: 'none' }}>
                        🔗 Mở trang thanh toán {payStep.gateway.toUpperCase()} ↗
                      </a>
                    </>
                  )}
                  {payStep.sandbox_only && <div style={{ ...S.info, color: '#fdcb6e', border: '1px solid #fdcb6e22', marginBottom: 12 }}>⚠️ Gateway sandbox — dùng nút xác nhận thủ công để test.</div>}
                  {payStep.gateway === 'bank_transfer' && (
                    <div style={{ ...S.info, marginBottom: 12 }}>
                      <strong style={{ color: '#ccc' }}>Thông tin CK:</strong><br />
                      MB Bank · STK: <strong>0001234567890</strong><br />
                      Nội dung: <strong style={{ color: '#a29bfe' }}>NAPXU {payStep.deposit_id.slice(0, 8).toUpperCase()}</strong><br />
                      Số tiền: <strong>{parseInt(payStep.amount_vnd).toLocaleString()}đ</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                    <button style={{ ...S.btnSm('#6fcf97'), flex: 1 }} onClick={confirmDeposit} disabled={confirming}>
                      {confirming ? 'Đang xác nhận...' : '✅ Tôi đã thanh toán'}
                    </button>
                    <button style={S.btnSm('#2a2a3a')} onClick={() => { setPayStep(null); setMsg(null); }}>Huỷ</button>
                  </div>
                </div>
              )}
            </>
          )}

          {depSubTab === 'history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button style={S.btnGhost(false)} onClick={loadDepHistory}>↻ Làm mới</button>
              </div>
              {depHistLoading && <div style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '2rem' }}>Đang tải...</div>}
              {!depHistLoading && depHistory.length === 0 && <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: '2.5rem' }}>Chưa có lần nạp nào</div>}
              {depHistory.map(d => (
                <div key={d.id} style={{ background: '#13131f', borderRadius: 10, padding: '13px 16px', marginBottom: 8, border: '1px solid #1a1a28' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#6fcf97' }}>+{parseInt(d.amount_xu).toLocaleString()} MT</div>
                      <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>= {parseInt(d.amount_vnd).toLocaleString()} VNĐ</div>
                    </div>
                    <span style={S.badge(d.status)}>{DEP_STATUS[d.status] || d.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#555' }}>
                    {PAY_LABEL[d.payment_method] || d.payment_method} · 📅 {fmtDate(d.created_at)}
                  </div>
                  {d.payment_ref && <div style={{ fontSize: 10, color: '#444', marginTop: 3, fontFamily: 'monospace' }}>Ref: {d.payment_ref}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RÚT MT ── */}
      {tab === 'withdraw' && <div style={S.card}><WithdrawTab token={token} wallet={wallet} refreshWallet={refreshWallet} /></div>}

      {/* ── CHUYỂN MT ── */}
      {tab === 'transfer' && <div style={S.card}><TransferTab token={token} wallet={wallet} refreshWallet={refreshWallet} /></div>}

      {/* ── GỬI TIP ── */}
      {tab === 'tip' && <div style={S.card}><TipTab token={token} wallet={wallet} refreshWallet={refreshWallet} /></div>}

      {/* ── LỊCH SỬ ── */}
      {tab === 'history' && <div style={{ ...S.card, maxWidth: 600 }}><HistoryTab token={token} /></div>}

      {/* ── LEADERBOARD ── */}
      {tab === 'leaderboard' && <div style={{ ...S.card, maxWidth: 560 }}><LeaderboardTab token={token} currentUserId={user?.id} /></div>}

      {/* ── THÔNG BÁO ── */}
      {tab === 'notifications' && <div style={{ ...S.card, maxWidth: 560 }}><NotificationsTab token={token} /></div>}

      {/* ── HẾT HẠN ── */}
      {tab === 'expiry' && <div style={S.card}><ExpiryTab token={token} /></div>}

      {/* ── KYC ── */}
      {tab === 'kyc' && (
        <div style={S.card}>
          {kycMsg && <div style={kycMsg.type === 'success' ? S.success : S.err}>{kycMsg.text}</div>}
          {kyc?.kyc_status === 'verified' ? (
            <div style={{ ...S.success, textAlign: 'center', padding: '1.5rem' }}>
              ✅ <strong>Đã xác minh KYC</strong><br />
              <span style={{ fontSize: 12, color: '#555', marginTop: 4, display: 'block' }}>Bạn có thể rút không giới hạn</span>
            </div>
          ) : kyc?.kyc_status === 'pending' ? (
            <div style={{ background: '#6C5CE715', border: '1px solid #6C5CE740', borderRadius: 8, padding: '1.25rem', textAlign: 'center' }}>
              🔍 <strong style={{ color: '#a29bfe' }}>Đang chờ xét duyệt</strong><br />
              <span style={{ fontSize: 12, color: '#555', marginTop: 4, display: 'block' }}>
                Họ tên: <strong style={{ color: '#ccc' }}>{kyc.kyc_full_name}</strong> ·
                Nộp lúc: {kyc.kyc_submitted_at ? new Date(kyc.kyc_submitted_at).toLocaleString('vi-VN') : '—'}
              </span>
            </div>
          ) : (
            <>
              <div style={{ ...S.info, marginBottom: '1.25rem', color: '#aaa' }}>
                📋 Xác minh danh tính để rút trên <strong style={{ color: '#fdcb6e' }}>1,000,000 MT</strong>.
              </div>
              <label style={S.label}>Họ và tên (theo CCCD/CMND)</label>
              <input style={S.input} placeholder="NGUYEN VAN A" value={kycForm.fullName} onChange={e => setKycForm(f => ({ ...f, fullName: e.target.value }))} />
              <label style={S.label}>Số CCCD/CMND (9-12 chữ số)</label>
              <input style={S.input} placeholder="012345678901" maxLength={12} value={kycForm.idNumber} onChange={e => setKycForm(f => ({ ...f, idNumber: e.target.value.replace(/\D/g, '') }))} />
              <button style={S.btn(!kycForm.fullName.trim() || kycForm.idNumber.length < 9 || kycLoading)}
                disabled={!kycForm.fullName.trim() || kycForm.idNumber.length < 9 || kycLoading} onClick={submitKyc}>
                {kycLoading ? 'Đang gửi...' : '🪪 Nộp hồ sơ KYC'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
