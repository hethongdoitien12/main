import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const S = {
  h1:      { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: '1.5rem' },
  tabs:    { display: 'flex', gap: 6, marginBottom: '1.75rem', padding: '4px', background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 10, width: 'fit-content', flexWrap: 'wrap' },
  tab:     (a) => ({ padding: '8px 18px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: a ? '#6C5CE7' : 'transparent', color: a ? '#fff' : '#666', transition: 'all .15s', whiteSpace: 'nowrap' }),
  card:    { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.75rem', maxWidth: 560 },
  label:   { display: 'block', fontSize: 13, fontWeight: 500, color: '#999', marginBottom: 6 },
  input:   { width: '100%', padding: '10px 14px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 8, color: '#e8e6e0', fontSize: 14, outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' },
  btn:     (dis, color) => ({ width: '100%', padding: '11px', background: dis ? '#2a2a3a' : (color || '#6C5CE7'), border: 'none', borderRadius: 8, color: dis ? '#555' : '#fff', fontSize: 15, fontWeight: 600, cursor: dis ? 'not-allowed' : 'pointer' }),
  btnSm:   (color) => ({ padding: '9px 18px', background: color || '#6C5CE7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }),
  btnGhost:(active) => ({ padding: '6px 14px', background: active ? '#1e1e2e' : 'transparent', border: `1px solid ${active ? '#2e2e44' : 'transparent'}`, borderRadius: 7, color: active ? '#ccc' : '#555', fontSize: 12, fontWeight: 500, cursor: 'pointer' }),
  success: { color: '#6fcf97', fontSize: 13, padding: '12px 14px', background: 'rgba(111,207,151,.08)', border: '1px solid rgba(111,207,151,.2)', borderRadius: 8, marginBottom: '1rem' },
  err:     { color: '#ff6b6b', fontSize: 13, padding: '12px 14px', background: 'rgba(255,107,107,.08)', border: '1px solid rgba(255,107,107,.2)', borderRadius: 8, marginBottom: '1rem' },
  info:    { fontSize: 12, color: '#666', padding: '10px 12px', background: '#13131f', borderRadius: 8, marginTop: '1rem', lineHeight: 1.7 },
  step:    { background: '#0d1117', border: '1px solid #1e2a1e', borderRadius: 12, padding: '1.5rem', marginTop: '1rem' },
  stepTitle: { fontSize: 15, fontWeight: 600, color: '#6fcf97', marginBottom: '1rem' },
  gwBtn:   (sel) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: sel ? '#1a1a2e' : '#13131f', border: `1px solid ${sel ? '#6C5CE7' : '#1e1e2e'}`, borderRadius: 10, cursor: 'pointer', marginBottom: 8, width: '100%', textAlign: 'left', transition: 'all .15s' }),
  preset:  (sel) => ({ padding: '8px 14px', background: sel ? '#6C5CE7' : '#13131f', border: `1px solid ${sel ? '#6C5CE7' : '#1e1e2e'}`, borderRadius: 8, color: sel ? '#fff' : '#aaa', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }),
  divider: { height: 1, background: '#1e1e2e', margin: '1.25rem 0' },
  statGrid:{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: '1.5rem' },
  statCard:(accent) => ({ background: '#13131f', border: `1px solid ${accent || '#1e1e2e'}`, borderRadius: 10, padding: '12px 14px' }),
  statLbl: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 },
  statVal: (c) => ({ fontSize: 18, fontWeight: 700, color: c || '#fff' }),
  statSub: { fontSize: 11, color: '#444', marginTop: 2 },
  txRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #0d0d18' },
  txIcon:  (pos) => ({ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: pos ? 'rgba(111,207,151,.1)' : 'rgba(255,107,107,.1)', flexShrink: 0, marginRight: 10 }),
  badge:   (s) => {
    const map = { pending: ['#1e1e0a','#fdcb6e'], completed: ['#0e2a1e','#6fcf97'], failed: ['#2a0e0e','#ff6b6b'], cancelled: ['#1a1a1a','#666'] };
    const [bg, c] = map[s] || ['#1e1e2e','#aaa'];
    return { fontSize: 10, padding: '3px 8px', borderRadius: 99, fontWeight: 600, background: bg, color: c, whiteSpace: 'nowrap' };
  },
  quickBtn: (color) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 10px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 12, cursor: 'pointer', flex: 1, transition: 'all .15s', color: color || '#ccc' }),
  searchResult: { background: '#13131f', border: '1px solid #2e2e44', borderRadius: 10, overflow: 'hidden', marginBottom: '1rem' },
  searchItem: (sel) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: sel ? '#1a1a2e' : 'transparent', borderBottom: '1px solid #1a1a28', transition: 'background .1s' }),
};

const GATEWAYS = [
  { value: 'momo',          label: 'MoMo',                    icon: '🟣', desc: 'Ví điện tử MoMo — sandbox' },
  { value: 'zalopay',       label: 'ZaloPay',                 icon: '🔵', desc: 'ZaloPay — sandbox' },
  { value: 'bank_transfer', label: 'Chuyển khoản ngân hàng',  icon: '🏦', desc: 'Admin xác nhận thủ công' },
];

const TIP_PRESETS = [10, 50, 100, 500, 1000, 5000];
const DEP_PRESETS = [10000, 50000, 100000, 200000, 500000];

const TX_META = {
  deposit:        { label: 'Nạp tiền',     icon: '💳', color: '#6fcf97' },
  withdrawal:     { label: 'Rút tiền',     icon: '🏦', color: '#ff6b6b' },
  earn_quest:     { label: 'Quest',        icon: '🏆', color: '#6fcf97' },
  earn_game:      { label: 'Chơi game',    icon: '🎮', color: '#6fcf97' },
  earn_referral:  { label: 'Giới thiệu',   icon: '👥', color: '#6fcf97' },
  earn_content:   { label: 'Tạo content',  icon: '✍️', color: '#6fcf97' },
  earn_checkin:   { label: 'Điểm danh',    icon: '📅', color: '#6fcf97' },
  earn_bonus:     { label: 'Bonus',        icon: '🎁', color: '#6fcf97' },
  spend_ticket:   { label: 'Mua vé',       icon: '🎫', color: '#fd79a8' },
  spend_item:     { label: 'Mua item',     icon: '🛍', color: '#fd79a8' },
  spend_agent:    { label: 'AI Agent',     icon: '🤖', color: '#fd79a8' },
  spend_music:    { label: 'Nhạc',         icon: '🎵', color: '#fd79a8' },
  spend_boost:    { label: 'Boost',        icon: '🚀', color: '#fd79a8' },
  tip_sent:       { label: 'Tip gửi',      icon: '💝', color: '#ff6b6b' },
  tip_received:   { label: 'Tip nhận',     icon: '💝', color: '#6fcf97' },
  refund:         { label: 'Hoàn tiền',    icon: '↩️', color: '#74b9ff' },
  expire:         { label: 'Hết hạn',      icon: '⏳', color: '#636e72' },
  admin_adjust:   { label: 'Admin',        icon: '⚙️', color: '#fdcb6e' },
};

const TX_FILTER_GROUPS = [
  { key: 'all',      label: 'Tất cả' },
  { key: 'deposit',  label: '💳 Nạp' },
  { key: 'withdrawal', label: '🏦 Rút' },
  { key: 'earn',     label: '✨ Kiếm' },
  { key: 'spend',    label: '🛍 Tiêu' },
  { key: 'tip',      label: '💝 Tip' },
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ─── TỔNG QUAN TAB ─────────────────────────────────────────────────────────
function OverviewTab({ wallet, token, setTab, expiry }) {
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/wallet/transactions?limit=5', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setRecent(d.transactions || [])).catch(() => {});
  }, [token]);

  const quickActions = [
    { icon: '💳', label: 'Nạp MT',  color: '#6fcf97', tab: 'deposit' },
    { icon: '🏦', label: 'Rút MT',  color: '#fdcb6e', tab: 'withdraw' },
    { icon: '💝', label: 'Gửi Tip', color: '#fd79a8', tab: 'tip' },
    { icon: '📋', label: 'Lịch sử', color: '#74b9ff', tab: 'history' },
  ];

  const expiringSoon = expiry?.batches?.filter(b => parseFloat(b.days_left) <= 30) || [];
  const expiringMT = expiringSoon.reduce((s, b) => s + parseInt(b.remaining_xu), 0);

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Balance hero */}
      <div style={{ background: 'linear-gradient(135deg, #13131f 0%, #1a1228 100%)', border: '1px solid #2e2e44', borderRadius: 16, padding: '1.75rem', marginBottom: '1.25rem', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Số dư ví</div>
        <div style={{ fontSize: 42, fontWeight: 800, color: '#a29bfe', lineHeight: 1 }}>
          {Number(wallet?.balance || 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 16, color: '#555', marginTop: 4 }}>MT</div>
      </div>

      {/* MT sắp hết hạn */}
      {expiringMT > 0 && (
        <div style={{ background: '#2a1a0a', border: '1px solid #fdcb6e40', borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fdcb6e' }}>⏳ MT sắp hết hạn</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              <strong style={{ color: '#fdcb6e' }}>{expiringMT.toLocaleString()} MT</strong> sẽ hết hạn trong 30 ngày tới
            </div>
          </div>
          <button onClick={() => setTab('expiry')} style={{ padding: '5px 12px', background: '#fdcb6e15', border: '1px solid #fdcb6e40', borderRadius: 7, color: '#fdcb6e', fontSize: 12, cursor: 'pointer' }}>
            Xem →
          </button>
        </div>
      )}

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

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        {quickActions.map(a => (
          <button key={a.tab} style={S.quickBtn(a.color)} onClick={() => setTab(a.tab)}>
            <span style={{ fontSize: 22 }}>{a.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Recent transactions */}
      {recent.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ccc' }}>Giao dịch gần đây</div>
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

// ─── TIP TAB (tìm creator theo username) ─────────────────────────────────────
function TipTab({ token, wallet, refreshWallet }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const searchTimer = useRef(null);

  const search = useCallback((q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setSearching(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/wallet/search-creators?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const d = await r.json();
        setResults(Array.isArray(d) ? d : []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [token]);

  useEffect(() => { search(query); }, [query, search]);

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
      setAmount(''); setMessage(''); setSelected(null); setQuery(''); setResults([]);
      await refreshWallet();
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  };

  const balance = parseInt(wallet?.balance || 0);

  return (
    <div>
      {msg && <div style={msg.type === 'success' ? S.success : S.err}>{msg.text}</div>}

      {/* Bước 1: Tìm creator */}
      {!selected ? (
        <>
          <div style={{ fontSize: 13, color: '#555', marginBottom: '1rem' }}>
            Tìm creator hoặc người dùng để gửi tip
          </div>
          <label style={S.label}>Tên người dùng / email</label>
          <input
            style={S.input}
            placeholder="Nhập username hoặc email..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />

          {searching && <div style={{ fontSize: 12, color: '#555', marginTop: -8, marginBottom: '1rem' }}>Đang tìm...</div>}

          {results.length > 0 && (
            <div style={S.searchResult}>
              {results.map(u => (
                <div key={u.id} style={S.searchItem(false)}
                  onClick={() => { setSelected(u); setQuery(u.username); setResults([]); }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.avatar_url ? `url(${u.avatar_url}) center/cover` : 'linear-gradient(135deg,#6C5CE7,#a29bfe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {!u.avatar_url && u.username?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{u.username}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>{u.role === 'creator' ? '⭐ Creator' : '👤 User'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {query.length >= 2 && !searching && results.length === 0 && (
            <div style={{ fontSize: 13, color: '#444', textAlign: 'center', padding: '1rem 0' }}>
              Không tìm thấy người dùng nào
            </div>
          )}
        </>
      ) : (
        <>
          {/* Đã chọn creator — hiện form tip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#13131f', border: '1px solid #2e2e44', borderRadius: 10, marginBottom: '1.25rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: selected.avatar_url ? `url(${selected.avatar_url}) center/cover` : 'linear-gradient(135deg,#6C5CE7,#a29bfe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {!selected.avatar_url && selected.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{selected.username}</div>
              <div style={{ fontSize: 11, color: '#555' }}>{selected.role === 'creator' ? '⭐ Creator' : '👤 User'}</div>
            </div>
            <button onClick={() => { setSelected(null); setQuery(''); setAmount(''); setMsg(null); }}
              style={{ background: 'transparent', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>

          <label style={S.label}>Số MT muốn tip</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
            {TIP_PRESETS.map(p => (
              <button key={p} style={S.preset(parseInt(amount) === p)} onClick={() => setAmount(String(p))}>
                {p.toLocaleString()}
              </button>
            ))}
          </div>
          <input style={S.input} type="number" placeholder="Hoặc nhập số lượng..." min="10"
            value={amount} onChange={e => setAmount(e.target.value)} />

          {parseInt(amount) >= 10 && (
            <div style={{ ...S.info, marginTop: 0, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Creator nhận: <strong style={{ color: '#6fcf97' }}>{Math.floor(parseInt(amount) * 0.95).toLocaleString()} MT</strong></span>
              <span style={{ color: '#444' }}>Phí 5%: {Math.ceil(parseInt(amount) * 0.05).toLocaleString()} MT</span>
            </div>
          )}
          {parseInt(amount) > balance && (
            <div style={{ ...S.err, marginBottom: '1rem' }}>⚠️ Số dư không đủ (hiện có {balance.toLocaleString()} MT)</div>
          )}

          <label style={S.label}>Lời nhắn (tuỳ chọn)</label>
          <input style={S.input} placeholder="Ủng hộ bạn nhé! 💪" maxLength={200}
            value={message} onChange={e => setMessage(e.target.value)} />

          <button
            style={S.btn(!amount || parseInt(amount) < 10 || parseInt(amount) > balance || loading)}
            onClick={sendTip}
            disabled={!amount || parseInt(amount) < 10 || parseInt(amount) > balance || loading}>
            {loading ? 'Đang gửi...' : `💝 Gửi ${parseInt(amount || 0).toLocaleString()} MT cho ${selected.username}`}
          </button>
        </>
      )}
    </div>
  );
}

// ─── LỊCH SỬ NÂNG CẤP ───────────────────────────────────────────────────────
function HistoryTab({ token }) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async (f, off, reset) => {
    setLoading(true);
    try {
      let typeParam = '';
      if (f === 'earn') typeParam = '&type=earn_quest&type=earn_game&type=earn_referral&type=earn_content&type=earn_checkin&type=earn_bonus';
      else if (f === 'spend') typeParam = '&type=spend_ticket&type=spend_item&type=spend_agent&type=spend_music&type=spend_boost';
      else if (f === 'tip') typeParam = '&type=tip_sent&type=tip_received';
      else if (f !== 'all') typeParam = `&type=${f}`;

      const r = await fetch(`/api/wallet/transactions?limit=${LIMIT}&offset=${off}${typeParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      const rows = d.transactions || [];
      setHasMore(rows.length === LIMIT);
      setTxs(prev => reset ? rows : [...prev, ...rows]);
    } catch { } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { setOffset(0); load(filter, 0, true); }, [filter, load]);

  const loadMore = () => {
    const next = offset + LIMIT;
    setOffset(next);
    load(filter, next, false);
  };

  const total = txs.reduce((s, tx) => {
    if (filter === 'all') return s;
    return s + parseInt(tx.amount);
  }, 0);

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {TX_FILTER_GROUPS.map(g => (
          <button key={g.key} style={S.btnGhost(filter === g.key)} onClick={() => setFilter(g.key)}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Summary nếu có filter */}
      {filter !== 'all' && txs.length > 0 && (
        <div style={{ ...S.info, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{txs.length} giao dịch</span>
          <span style={{ color: total >= 0 ? '#6fcf97' : '#ff6b6b', fontWeight: 600 }}>
            {total >= 0 ? '+' : ''}{total.toLocaleString()} MT
          </span>
        </div>
      )}

      {loading && txs.length === 0 && <div style={{ color: '#444', fontSize: 13, padding: '2rem', textAlign: 'center' }}>Đang tải...</div>}

      {!loading && txs.length === 0 && (
        <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: '2.5rem' }}>Chưa có giao dịch nào</div>
      )}

      {txs.map(tx => {
        const meta = TX_META[tx.type] || { label: tx.type, icon: '•', color: '#aaa' };
        return (
          <div key={tx.id} style={S.txRow}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={S.txIcon(tx.amount > 0)}>{meta.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#ccc', fontWeight: 500 }}>{meta.label}</div>
                {tx.description && (
                  <div style={{ fontSize: 11, color: '#444', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.description}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#333', marginTop: 1 }}>{fmtDate(tx.created_at)}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>
                {tx.amount > 0 ? '+' : ''}{parseInt(tx.amount).toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: '#333' }}>
                → {parseInt(tx.balance_after).toLocaleString()} MT
              </div>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <button onClick={loadMore} disabled={loading}
          style={{ width: '100%', marginTop: '1rem', padding: '10px', background: 'transparent', border: '1px solid #2e2e44', borderRadius: 8, color: '#666', fontSize: 13, cursor: 'pointer' }}>
          {loading ? 'Đang tải...' : '↓ Tải thêm'}
        </button>
      )}
    </div>
  );
}

// ─── RÚT MT TAB (có lịch sử rút) ────────────────────────────────────────────
function WithdrawTab({ token, wallet, refreshWallet }) {
  const [subTab, setSubTab] = useState('form');
  const [withdraw, setWithdraw] = useState({ amountXu: '', bankName: '', bankAccount: '', accountName: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const handleW = (e) => setWithdraw(f => ({ ...f, [e.target.name]: e.target.value }));

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const r = await fetch('/api/withdrawals/mine', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setHistory(Array.isArray(d) ? d : []);
    } catch { } finally { setHistLoading(false); }
  }, [token]);

  useEffect(() => { if (subTab === 'history') loadHistory(); }, [subTab, loadHistory]);

  const submit = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount_xu: parseInt(withdraw.amountXu),
          bank_name: withdraw.bankName,
          bank_account: withdraw.bankAccount,
          account_name: withdraw.accountName,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ type: 'success', text: `✅ Đã gửi yêu cầu rút! Bạn sẽ nhận ${d.amount_vnd?.toLocaleString() || Math.floor(parseInt(withdraw.amountXu) * 0.9).toLocaleString()}đ sau khi admin duyệt.` });
      setWithdraw({ amountXu: '', bankName: '', bankAccount: '', accountName: '' });
      await refreshWallet();
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  };

  const canSubmit = parseInt(withdraw.amountXu || 0) >= 50000 && withdraw.bankAccount && withdraw.bankName && withdraw.accountName;
  const feePreview = parseInt(withdraw.amountXu || 0) >= 50000;

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
          <input style={S.input} type="number" name="amountXu" placeholder="50000" min="50000"
            value={withdraw.amountXu} onChange={handleW} />

          {feePreview && (
            <div style={{ ...S.info, marginTop: 0, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Phí 10%: <strong style={{ color: '#ff6b6b' }}>{Math.floor(parseInt(withdraw.amountXu) * 0.1).toLocaleString()} MT</strong></span>
              <span>Bạn nhận: <strong style={{ color: '#6fcf97' }}>{Math.floor(parseInt(withdraw.amountXu) * 0.9).toLocaleString()} VNĐ</strong></span>
            </div>
          )}

          <label style={S.label}>Tên ngân hàng</label>
          <input style={S.input} name="bankName" placeholder="Vietcombank / Techcombank / MB Bank..."
            value={withdraw.bankName} onChange={handleW} />

          <label style={S.label}>Số tài khoản</label>
          <input style={S.input} name="bankAccount" placeholder="0123456789"
            value={withdraw.bankAccount} onChange={handleW} />

          <label style={S.label}>Tên chủ tài khoản</label>
          <input style={S.input} name="accountName" placeholder="NGUYEN VAN A"
            value={withdraw.accountName} onChange={handleW} />

          <button style={S.btn(!canSubmit || loading)} onClick={submit} disabled={!canSubmit || loading}>
            {loading ? 'Đang gửi...' : '🏦 Gửi yêu cầu rút'}
          </button>
          <div style={S.info}>Yêu cầu rút sẽ được admin xét duyệt trong 1–3 ngày làm việc.</div>
        </>
      )}

      {subTab === 'history' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button style={S.btnGhost(false)} onClick={loadHistory}>↻ Làm mới</button>
          </div>
          {histLoading && <div style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '2rem' }}>Đang tải...</div>}
          {!histLoading && history.length === 0 && (
            <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: '2.5rem' }}>Chưa có yêu cầu rút nào</div>
          )}
          {history.map(wr => (
            <div key={wr.id} style={{ background: '#13131f', borderRadius: 10, padding: '14px 16px', marginBottom: 8, border: '1px solid #1a1a28' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fdcb6e' }}>
                    -{parseInt(wr.amount_xu).toLocaleString()} MT
                  </div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                    → {parseInt(wr.amount_vnd).toLocaleString()} VNĐ
                    <span style={{ color: '#444' }}> (phí {parseInt(wr.fee_xu).toLocaleString()} MT)</span>
                  </div>
                </div>
                <span style={S.badge(wr.status)}>
                  {wr.status === 'pending' ? '⏳ Chờ duyệt' : wr.status === 'completed' ? '✅ Hoàn thành' : wr.status === 'failed' ? '❌ Từ chối' : wr.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#555' }}>
                <span>🏦 {wr.bank_name} · {wr.bank_account}</span>
                <span>📅 {fmtDate(wr.created_at)}</span>
              </div>
              {wr.bank_transfer_ref && (
                <div style={{ fontSize: 11, color: '#6fcf97', marginTop: 6 }}>
                  Mã GD: <strong>{wr.bank_transfer_ref}</strong>
                </div>
              )}
              {wr.notes && wr.status === 'failed' && (
                <div style={{ fontSize: 11, color: '#ff6b6b', marginTop: 6 }}>
                  Lý do: {wr.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MT HẾT HẠN TAB ──────────────────────────────────────────────────────────
// ─── LEADERBOARD TAB ─────────────────────────────────────────────────────────
function LeaderboardTab({ token, currentUserId }) {
  const [period, setPeriod] = useState('alltime');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/wallet/leaderboard?period=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      setData(d);
    } catch { } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(period); }, [period, load]);

  const PERIODS = [
    { key: 'alltime', label: 'Mọi thời' },
    { key: 'month',   label: 'Tháng này' },
    { key: 'week',    label: 'Tuần này' },
  ];

  const medalColor = (rank) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return null;
  };

  const topRow = (entry, isMe) => {
    const medal = medalColor(parseInt(entry.rank));
    return (
      <div key={entry.id} style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px',
        background: isMe ? 'rgba(108,92,231,.12)' : parseInt(entry.rank) <= 3 ? 'rgba(255,215,0,.04)' : 'transparent',
        borderRadius: 10,
        border: isMe ? '1px solid rgba(108,92,231,.35)' : parseInt(entry.rank) <= 3 ? '1px solid rgba(255,215,0,.12)' : '1px solid transparent',
        marginBottom: 6,
        transition: 'background .15s',
      }}>
        {/* Rank */}
        <div style={{ width: 30, textAlign: 'center', flexShrink: 0 }}>
          {medal
            ? <span style={{ fontSize: 18 }}>{parseInt(entry.rank) === 1 ? '🥇' : parseInt(entry.rank) === 2 ? '🥈' : '🥉'}</span>
            : <span style={{ fontSize: 13, fontWeight: 700, color: '#444' }}>#{entry.rank}</span>}
        </div>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: entry.avatar_url ? `url(${entry.avatar_url}) center/cover` : `linear-gradient(135deg,#6C5CE7,#a29bfe)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff',
        }}>
          {!entry.avatar_url && entry.username?.[0]?.toUpperCase()}
        </div>
        {/* Name + role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: isMe ? 700 : 500, color: isMe ? '#a29bfe' : '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.username} {isMe && <span style={{ fontSize: 10, color: '#6C5CE7' }}>● bạn</span>}
          </div>
          <div style={{ fontSize: 10, color: '#444' }}>
            {entry.role === 'creator' ? '⭐ Creator' : '👤 User'}
          </div>
        </div>
        {/* MT earned */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: medal ? medalColor(parseInt(entry.rank)) : '#a29bfe' }}>
            {Number(entry.xu_earned).toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: '#444' }}>MT kiếm được</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Period filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem' }}>
        {PERIODS.map(p => (
          <button key={p.key} style={S.btnGhost(period === p.key)} onClick={() => setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <button style={S.btnGhost(false)} onClick={() => load(period)}>↻</button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#444', fontSize: 13 }}>Đang tải...</div>
      )}

      {!loading && data?.entries?.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#333', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
          Chưa có dữ liệu cho kỳ này
        </div>
      )}

      {!loading && data?.entries?.map(e => topRow(e, e.id === currentUserId))}

      {/* Vị trí của tôi nếu không có trong top */}
      {!loading && data?.myRank && !data.entries?.find(e => e.id === currentUserId) && (
        <>
          <div style={{ textAlign: 'center', color: '#333', fontSize: 12, padding: '4px 0 8px', letterSpacing: '.04em' }}>• • •</div>
          <div style={{ ...S.info, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 0, padding: '12px 16px' }}>
            <span style={{ color: '#666' }}>Vị trí của bạn</span>
            <span style={{ fontWeight: 700, color: '#a29bfe' }}>
              #{data.myRank.rank} — {Number(data.myRank.xu_earned).toLocaleString()} MT
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function ExpiryTab({ token }) {
  const [expiry, setExpiry] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/wallet/expiry-info', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setExpiry(d)).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const src = { earn_quest: 'Quest', earn_referral: 'Giới thiệu', earn_checkin: 'Điểm danh', earn_content: 'Content', bonus: 'Bonus' };

  if (loading) return <div style={{ color: '#444', fontSize: 13, padding: '2rem' }}>Đang tải...</div>;
  if (!expiry || expiry.batches?.length === 0) return (
    <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: '2.5rem' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
      Không có MT nào sắp hết hạn
    </div>
  );

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ ...S.info, marginBottom: '1.25rem', color: '#aaa' }}>
        MT kiếm từ quest, giới thiệu, điểm danh sẽ hết hạn sau 90 ngày. MT nạp tiền không hết hạn.
      </div>
      {expiry.total_expiring_7d > 0 && (
        <div style={{ background: '#2a1a0a', border: '1px solid #fdcb6e40', borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fdcb6e' }}>
            ⚠️ {expiry.total_expiring_7d.toLocaleString()} MT hết hạn trong 7 ngày tới!
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Hãy sử dụng trước khi MT này biến mất.</div>
        </div>
      )}
      {expiry.batches.map(b => {
        const days = Math.max(0, Math.floor(parseFloat(b.days_left)));
        const urgent = days <= 7;
        const soon = days <= 30;
        return (
          <div key={b.id} style={{ background: '#13131f', border: `1px solid ${urgent ? '#fdcb6e30' : '#1a1a28'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: urgent ? '#fdcb6e' : soon ? '#e17055' : '#ccc' }}>
                {parseInt(b.remaining_xu).toLocaleString()} MT
              </div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                Nguồn: {src[b.source_type] || b.source_type}
                &nbsp;·&nbsp; Nhận: {new Date(b.granted_at).toLocaleDateString('vi-VN')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: urgent ? '#fdcb6e' : soon ? '#e17055' : '#555' }}>
                {days === 0 ? 'Hôm nay!' : `${days} ngày`}
              </div>
              <div style={{ fontSize: 10, color: '#444' }}>
                {new Date(b.expires_at).toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN WALLET ──────────────────────────────────────────────────────────────
export default function Wallet() {
  const { user, wallet, token, refreshWallet } = useAuth();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // KYC
  const [kyc, setKyc] = useState(null);
  const [kycForm, setKycForm] = useState({ fullName: '', idNumber: '' });
  const [kycLoading, setKycLoading] = useState(false);
  const [kycMsg, setKycMsg] = useState(null);

  // Deposit
  const [amount, setAmount] = useState('');
  const [gateway, setGateway] = useState('momo');
  const [payStep, setPayStep] = useState(null);
  const [confirming, setConfirming] = useState(false);

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

  useEffect(() => { loadKyc(); loadExpiry(); }, [loadKyc, loadExpiry]);

  const submitKyc = async () => {
    if (!kycForm.fullName.trim() || !kycForm.idNumber.trim()) return;
    setKycLoading(true); setKycMsg(null);
    try {
      const r = await fetch('/api/user/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vnd_amount: parseInt(amount), payment_gateway: gateway }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (gateway === 'bank_transfer') {
        setPayStep({ deposit_id: data.deposit_id, gateway, amount_vnd: data.amount_vnd, pay_url: null });
      } else if (data.pay_url) {
        setPayStep({ deposit_id: data.deposit_id, gateway, amount_vnd: data.amount_vnd, pay_url: data.pay_url });
        window.open(data.pay_url, '_blank');
      } else if (data.gateway_error) {
        setMsg({ type: 'error', text: `Lỗi kết nối ${gateway.toUpperCase()}: ${data.gateway_error}` });
        setPayStep({ deposit_id: data.deposit_id, gateway, amount_vnd: data.amount_vnd, pay_url: null, sandbox_only: true });
      }
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
    finally { setLoading(false); }
  };

  const confirmDeposit = async () => {
    if (!payStep) return;
    setConfirming(true); setMsg(null);
    try {
      const r = await fetch('/api/wallet/deposit/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ deposit_id: payStep.deposit_id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ type: 'success', text: `✅ Nạp thành công! +${parseInt(payStep.amount_vnd).toLocaleString()} MT vào ví` });
      setPayStep(null); setAmount('');
      await refreshWallet(); loadExpiry();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
    finally { setConfirming(false); }
  };

  const switchTab = (t) => { setTab(t); setMsg(null); };

  const TABS = [
    ['overview',     '📊 Tổng quan'],
    ['deposit',      '💳 Nạp MT'],
    ['withdraw',     '🏦 Rút MT'],
    ['tip',          '💝 Gửi Tip'],
    ['history',      '📋 Lịch sử'],
    ['leaderboard',  '🏆 Leaderboard'],
    ['expiry',       '⏳ Hết hạn'],
    ['kyc',          '🪪 KYC'],
  ];

  return (
    <div>
      <div style={S.h1}>Ví MT</div>

      {/* KYC banner */}
      {wallet?.balance > 800_000 && kyc && kyc.kyc_status !== 'verified' && (
        <div style={{ background: kyc.kyc_status === 'pending' ? '#6C5CE715' : '#fdcb6e12', border: `1px solid ${kyc.kyc_status === 'pending' ? '#6C5CE740' : '#fdcb6e40'}`, borderRadius: 10, padding: '12px 16px', maxWidth: 560, marginBottom: '1.25rem', fontSize: 13 }}>
          {kyc.kyc_status === 'pending' ? (
            <div style={{ color: '#a29bfe' }}>🔍 <strong>KYC đang chờ duyệt</strong> — Admin sẽ xem xét hồ sơ trong 1–2 ngày làm việc.</div>
          ) : (
            <div style={{ color: '#fdcb6e' }}>
              ⚠️ <strong>Xác minh danh tính</strong> — Số dư trên 800,000 MT. Cần KYC để rút trên 1,000,000 MT.
              <button onClick={() => switchTab('kyc')} style={{ marginLeft: 12, padding: '3px 10px', background: '#fdcb6e20', border: '1px solid #fdcb6e60', borderRadius: 6, color: '#fdcb6e', fontSize: 12, cursor: 'pointer' }}>Xác minh →</button>
            </div>
          )}
        </div>
      )}

      <div style={S.tabs}>
        {TABS.map(([k, l]) => (
          <button key={k} style={S.tab(tab === k)} onClick={() => switchTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── TỔNG QUAN ── */}
      {tab === 'overview' && <OverviewTab wallet={wallet} token={token} setTab={switchTab} expiry={expiry} />}

      {/* ── NẠP MT ── */}
      {tab === 'deposit' && (
        <div style={S.card}>
          {msg && <div style={msg.type === 'success' ? S.success : S.err}>{msg.text}</div>}

          {!payStep && (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
                {DEP_PRESETS.map(p => (
                  <button key={p} style={S.preset(parseInt(amount) === p)} onClick={() => setAmount(String(p))}>{p.toLocaleString()}đ</button>
                ))}
              </div>
              <label style={S.label}>Số tiền (VNĐ) — tối thiểu 10,000</label>
              <input style={S.input} type="number" placeholder="100000" min="10000" step="10000"
                value={amount} onChange={e => setAmount(e.target.value)} />
              {amount && parseInt(amount) >= 10000 && (
                <div style={{ ...S.info, marginTop: 0, marginBottom: '1rem', color: '#a29bfe', fontWeight: 600 }}>
                  Bạn nhận: {parseInt(amount).toLocaleString()} MT &nbsp;·&nbsp; 1 VNĐ = 1 MT · Miễn phí
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
                Đơn nạp: <strong style={{ color: '#fff' }}>{parseInt(payStep.amount_vnd).toLocaleString()} VNĐ</strong><br />
                Mã đơn: <span style={{ color: '#555', fontFamily: 'monospace', fontSize: 11 }}>{payStep.deposit_id}</span>
              </div>
              {payStep.pay_url && (
                <>
                  <a href={payStep.pay_url} target="_blank" rel="noreferrer"
                    style={{ display: 'block', textAlign: 'center', padding: '11px', background: '#1a1a2e', border: '1px solid #6C5CE7', borderRadius: 8, color: '#a29bfe', fontWeight: 600, marginBottom: 12, textDecoration: 'none' }}>
                    🔗 Mở trang thanh toán {payStep.gateway.toUpperCase()} ↗
                  </a>
                  <div style={S.info}>Tab mới đã mở. Hoàn tất thanh toán, sau đó bấm xác nhận.</div>
                </>
              )}
              {payStep.sandbox_only && (
                <div style={{ ...S.info, color: '#fdcb6e', border: '1px solid #fdcb6e22', marginBottom: 12 }}>
                  ⚠️ Gateway sandbox — dùng nút xác nhận thủ công để test.
                </div>
              )}
              {payStep.gateway === 'bank_transfer' && (
                <div style={{ ...S.info, marginBottom: 12 }}>
                  <strong style={{ color: '#ccc' }}>Thông tin chuyển khoản:</strong><br />
                  Ngân hàng: <strong>MB Bank</strong> · STK: <strong>0001234567890</strong><br />
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
        </div>
      )}

      {/* ── RÚT MT ── */}
      {tab === 'withdraw' && (
        <div style={S.card}>
          <WithdrawTab token={token} wallet={wallet} refreshWallet={refreshWallet} />
        </div>
      )}

      {/* ── GỬI TIP ── */}
      {tab === 'tip' && (
        <div style={S.card}>
          <TipTab token={token} wallet={wallet} refreshWallet={refreshWallet} />
        </div>
      )}

      {/* ── LỊCH SỬ ── */}
      {tab === 'history' && (
        <div style={{ ...S.card, maxWidth: 560 }}>
          <HistoryTab token={token} />
        </div>
      )}

      {/* ── LEADERBOARD ── */}
      {tab === 'leaderboard' && (
        <div style={{ ...S.card, maxWidth: 560 }}>
          <LeaderboardTab token={token} currentUserId={user?.id} />
        </div>
      )}

      {/* ── HẾT HẠN ── */}
      {tab === 'expiry' && (
        <div style={S.card}>
          <ExpiryTab token={token} />
        </div>
      )}

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
              <input style={S.input} placeholder="NGUYEN VAN A"
                value={kycForm.fullName} onChange={e => setKycForm(f => ({ ...f, fullName: e.target.value }))} />
              <label style={S.label}>Số CCCD/CMND (9-12 chữ số)</label>
              <input style={S.input} placeholder="012345678901" maxLength={12}
                value={kycForm.idNumber} onChange={e => setKycForm(f => ({ ...f, idNumber: e.target.value.replace(/\D/g, '') }))} />
              <button style={S.btn(!kycForm.fullName.trim() || kycForm.idNumber.length < 9 || kycLoading)}
                disabled={!kycForm.fullName.trim() || kycForm.idNumber.length < 9 || kycLoading}
                onClick={submitKyc}>
                {kycLoading ? 'Đang gửi...' : '🪪 Nộp hồ sơ KYC'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
