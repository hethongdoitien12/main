import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';

const S = {
  h1:    { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: '1.75rem' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
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
  tabs: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #1e1e2e' },
  tab: (active) => ({
    padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, color: active ? '#a29bfe' : '#555',
    borderBottom: `2px solid ${active ? '#6C5CE7' : 'transparent'}`, marginBottom: -1,
  }),
  formGroup: { marginBottom: 12 },
  label:     { fontSize: 12, color: '#888', marginBottom: 4, display: 'block' },
  input:     {
    width: '100%', padding: '9px 12px', background: '#13131f',
    border: '1px solid #2a2a3a', borderRadius: 8, color: '#ddd', fontSize: 13, outline: 'none',
  },
  select: {
    width: '100%', padding: '9px 12px', background: '#13131f',
    border: '1px solid #2a2a3a', borderRadius: 8, color: '#ddd', fontSize: 13, outline: 'none',
  },
  submitBtn: {
    padding: '9px 20px', background: '#6C5CE7', border: 'none', borderRadius: 8,
    color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  toast: (ok) => ({
    position: 'fixed', top: 20, right: 20, zIndex: 9999,
    background: ok ? '#00b89440' : '#ff6b6b40',
    border: `1px solid ${ok ? '#00b894' : '#ff6b6b'}`,
    color: ok ? '#00b894' : '#ff6b6b',
    padding: '12px 20px', borderRadius: 10, fontSize: 14,
  }),
};

function BarChart30({ data }) {
  if (!data || !data.length) return <div style={S.noData}>Chưa có dữ liệu trong 30 ngày qua</div>;
  const max = Math.max(...data.map(d => d.total_earned || 0), 1);
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    const found = data.find(r => r.date?.slice(0, 10) === key);
    return { date: key, mt: Number(found?.total_earned || 0) };
  });
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 100 }}>
      {last30.map(({ date, mt }) => (
        <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div title={`${date}: ${mt.toLocaleString()} MT`} style={{
            width: '100%', borderRadius: '2px 2px 0 0',
            height: `${Math.max((mt / max) * 100, mt > 0 ? 4 : 0)}%`,
            background: mt > 0 ? 'linear-gradient(180deg,#a29bfe,#6C5CE7)' : '#1a1a28',
            transition: 'height .3s',
          }} />
        </div>
      ))}
    </div>
  );
}

function BarChart7({ data }) {
  if (!data || !data.length) return <div style={S.noData}>Chưa có dữ liệu 7 ngày qua</div>;
  const max = Math.max(...data.map(d => d.xu_earned), 1);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const found = data.find(r => r.date?.slice(0, 10) === key);
    return { date: key, mt: found?.xu_earned || 0, tips: found?.tip_count || 0 };
  });
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
      {last7.map(({ date, mt, tips }) => {
        const pct = (mt / max) * 100;
        const label = new Date(date + 'T00:00:00').toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });
        return (
          <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 10, color: '#555' }}>{mt > 0 ? mt.toLocaleString() : ''}</div>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <div title={`${tips} tips · ${mt.toLocaleString()} MT`} style={{
                width: '100%', borderRadius: '3px 3px 0 0',
                height: `${Math.max(pct, mt > 0 ? 4 : 0)}%`,
                background: mt > 0 ? 'linear-gradient(180deg,#6fcf97,#00b894)' : '#1a1a28',
                transition: 'height .4s',
              }} />
            </div>
            <div style={{ fontSize: 10, color: '#444' }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

const TYPE_LABELS = {
  ebook: '📖 Ebook', template: '📐 Template', preset: '🎨 Preset',
  source_code: '💻 Source Code', prompt_ai: '🤖 Prompt AI', other: '📦 Khác',
};
const TIER_NAMES = { 1: 'Bronze 🥉', 2: 'Silver 🥈', 3: 'Gold 🥇' };

const PERIOD_OPTS = [
  { key: 'today', label: 'Hôm nay' },
  { key: '7d',    label: '7 ngày'  },
  { key: '30d',   label: '30 ngày' },
  { key: 'all',   label: 'Tất cả'  },
];

const SRC_META = {
  tip:     { label: '🎁 Tip',         color: '#6fcf97' },
  fanclub: { label: '👑 Fan Club',     color: '#a29bfe' },
  product: { label: '🛒 Sản phẩm',    color: '#74b9ff' },
};

function fmt(n) { return Number(n || 0).toLocaleString(); }

function RevCard({ label, gross, fee, net, color }) {
  return (
    <div style={{ background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.25rem' }}>
      <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || '#fff', marginBottom: 8 }}>
        {fmt(net)} MT
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, color: '#444', marginBottom: 2 }}>THU VÀO</div>
          <div style={{ fontSize: 13, color: '#888' }}>{fmt(gross)} MT</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#444', marginBottom: 2 }}>PHÍ NỀN TẢNG</div>
          <div style={{ fontSize: 13, color: '#ff6b6b' }}>−{fmt(fee)} MT</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#444', marginBottom: 2 }}>THỰC NHẬN</div>
          <div style={{ fontSize: 13, color: color || '#fff', fontWeight: 600 }}>{fmt(net)} MT</div>
        </div>
      </div>
    </div>
  );
}

function EarningsTab({ earnings, loading, period, onPeriodChange }) {
  const Sth = { ...S.th, padding: '10px 12px' };
  const Std = { ...S.td, padding: '10px 12px' };

  return (
    <div>
      {/* ── Time filter ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {PERIOD_OPTS.map(p => (
          <button key={p.key} onClick={() => onPeriodChange(p.key)} style={{
            padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: period === p.key ? '#6C5CE7' : '#13131f',
            color:      period === p.key ? '#fff'    : '#555',
            transition: 'all .15s',
          }}>{p.label}</button>
        ))}
        {loading && <span style={{ fontSize: 12, color: '#555', alignSelf: 'center', marginLeft: 8 }}>Đang tải...</span>}
      </div>

      {!earnings && !loading && (
        <div style={S.noData}>Không có dữ liệu</div>
      )}

      {earnings && (
        <>
          {/* ── 4 Revenue cards ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
            <RevCard label="💰 Tổng doanh thu"
              gross={earnings.summary.total.gross}
              fee={earnings.summary.total.fee}
              net={earnings.summary.total.net}
              color="#a29bfe" />
            <RevCard label="🎁 Từ Tip"
              gross={earnings.summary.tips.gross}
              fee={earnings.summary.tips.fee}
              net={earnings.summary.tips.net}
              color="#6fcf97" />
            <RevCard label="👑 Từ Fan Club"
              gross={earnings.summary.fanclub.gross}
              fee={earnings.summary.fanclub.fee}
              net={earnings.summary.fanclub.net}
              color="#fd79a8" />
            <RevCard label="🛒 Từ Sản phẩm"
              gross={earnings.summary.products.gross}
              fee={earnings.summary.products.fee}
              net={earnings.summary.products.net}
              color="#74b9ff" />
          </div>

          {/* ── Revenue Breakdown table ──────────────────────────────── */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={S.sectionTitle}>Phân tích doanh thu</div>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={Sth}>Nguồn</th>
                  <th style={{ ...Sth, textAlign: 'right' }}>Giao dịch</th>
                  <th style={{ ...Sth, textAlign: 'right' }}>Thu vào</th>
                  <th style={{ ...Sth, textAlign: 'right' }}>Phí nền tảng</th>
                  <th style={{ ...Sth, textAlign: 'right' }}>Thực nhận</th>
                  <th style={{ ...Sth, textAlign: 'right' }}>% Tổng</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'tips',     src: earnings.summary.tips,     label: '🎁 Tip'      },
                  { key: 'fanclub',  src: earnings.summary.fanclub,  label: '👑 Fan Club' },
                  { key: 'products', src: earnings.summary.products, label: '🛒 Sản phẩm' },
                ].map(({ key, src, label }) => {
                  const totalNet = Number(earnings.summary.total.net) || 1;
                  const pct = totalNet > 0 ? ((Number(src.net) / totalNet) * 100).toFixed(1) : '0.0';
                  const color = key === 'tips' ? '#6fcf97' : key === 'fanclub' ? '#fd79a8' : '#74b9ff';
                  return (
                    <tr key={key}>
                      <td style={Std}><span style={{ fontWeight: 600, color }}>{label}</span></td>
                      <td style={{ ...Std, textAlign: 'right', color: '#888' }}>{src.count}</td>
                      <td style={{ ...Std, textAlign: 'right', color: '#888' }}>{fmt(src.gross)} MT</td>
                      <td style={{ ...Std, textAlign: 'right', color: '#ff6b6b' }}>−{fmt(src.fee)} MT</td>
                      <td style={{ ...Std, textAlign: 'right', color, fontWeight: 600 }}>{fmt(src.net)} MT</td>
                      <td style={{ ...Std, textAlign: 'right', color: '#555' }}>{pct}%</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '1px solid #2a2a3a' }}>
                  <td style={{ ...Std, fontWeight: 700, color: '#fff' }}>Tổng cộng</td>
                  <td style={{ ...Std, textAlign: 'right', fontWeight: 700 }}>
                    {Number(earnings.summary.tips.count) + Number(earnings.summary.fanclub.count) + Number(earnings.summary.products.count)}
                  </td>
                  <td style={{ ...Std, textAlign: 'right', fontWeight: 700, color: '#aaa' }}>{fmt(earnings.summary.total.gross)} MT</td>
                  <td style={{ ...Std, textAlign: 'right', fontWeight: 700, color: '#ff6b6b' }}>−{fmt(earnings.summary.total.fee)} MT</td>
                  <td style={{ ...Std, textAlign: 'right', fontWeight: 700, color: '#a29bfe' }}>{fmt(earnings.summary.total.net)} MT</td>
                  <td style={{ ...Std, textAlign: 'right', color: '#555' }}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Top Products + Top Fans side by side ─────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Top Products */}
            <div style={S.card}>
              <div style={S.sectionTitle}>🏆 Sản phẩm bán chạy nhất</div>
              {!earnings.topProducts?.length
                ? <div style={S.noData}>Chưa có đơn hàng</div>
                : (
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={Sth}>#</th>
                        <th style={Sth}>Sản phẩm</th>
                        <th style={{ ...Sth, textAlign: 'right' }}>Đơn</th>
                        <th style={{ ...Sth, textAlign: 'right' }}>Thực nhận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.topProducts.map((p, i) => (
                        <tr key={p.id}>
                          <td style={{ ...Std, color: i < 3 ? ['#fdcb6e','#b2bec3','#e17055'][i] : '#444', fontWeight: 700 }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </td>
                          <td style={Std}>
                            <div style={{ fontSize: 13, color: '#ddd', fontWeight: 500 }}>{p.title}</div>
                            <div style={{ fontSize: 11, color: '#555', marginTop: 1 }}>{TYPE_LABELS[p.type]} · {fmt(p.price_mt)} MT</div>
                          </td>
                          <td style={{ ...Std, textAlign: 'right', color: '#74b9ff' }}>{p.order_count}</td>
                          <td style={{ ...Std, textAlign: 'right', color: '#6fcf97', fontWeight: 600 }}>{fmt(p.net_revenue)} MT</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>

            {/* Top Fans */}
            <div style={S.card}>
              <div style={S.sectionTitle}>👑 Top fans chi nhiều nhất</div>
              {!earnings.topFans?.length
                ? <div style={S.noData}>Chưa có giao dịch từ fans</div>
                : (
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={Sth}>#</th>
                        <th style={Sth}>Fan</th>
                        <th style={{ ...Sth, textAlign: 'right' }}>Tip</th>
                        <th style={{ ...Sth, textAlign: 'right' }}>Fan Club</th>
                        <th style={{ ...Sth, textAlign: 'right' }}>Sản phẩm</th>
                        <th style={{ ...Sth, textAlign: 'right' }}>Tổng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.topFans.map((f, i) => (
                        <tr key={f.id}>
                          <td style={{ ...Std, color: i < 3 ? ['#fdcb6e','#b2bec3','#e17055'][i] : '#444', fontWeight: 700 }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </td>
                          <td style={Std}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {f.avatar_url
                                ? <img src={f.avatar_url} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                                : <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#555' }}>👤</div>
                              }
                              <span style={{ fontSize: 13, color: '#ddd' }}>{f.username}</span>
                            </div>
                          </td>
                          <td style={{ ...Std, textAlign: 'right', color: '#6fcf97', fontSize: 12 }}>{fmt(f.tip_gross)}</td>
                          <td style={{ ...Std, textAlign: 'right', color: '#fd79a8', fontSize: 12 }}>{fmt(f.fc_gross)}</td>
                          <td style={{ ...Std, textAlign: 'right', color: '#74b9ff', fontSize: 12 }}>{fmt(f.prod_gross)}</td>
                          <td style={{ ...Std, textAlign: 'right', fontWeight: 700, color: '#a29bfe' }}>{fmt(f.total_gross)} MT</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>

          {/* ── Transaction history ──────────────────────────────────── */}
          <div style={S.card}>
            <div style={S.sectionTitle}>
              Lịch sử giao dịch
              <span style={{ fontSize: 11, color: '#444', marginLeft: 8 }}>
                ({earnings.transactions?.length || 0} giao dịch gần nhất)
              </span>
            </div>
            {!earnings.transactions?.length
              ? <div style={S.noData}>Chưa có giao dịch nào</div>
              : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={Sth}>Thời gian</th>
                      <th style={Sth}>Nguồn</th>
                      <th style={Sth}>Từ</th>
                      <th style={Sth}>Chi tiết</th>
                      <th style={{ ...Sth, textAlign: 'right' }}>Thu vào</th>
                      <th style={{ ...Sth, textAlign: 'right' }}>Phí</th>
                      <th style={{ ...Sth, textAlign: 'right' }}>Thực nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.transactions.map((tx, i) => {
                      const meta = SRC_META[tx.source] || { label: tx.source, color: '#888' };
                      return (
                        <tr key={i}>
                          <td style={{ ...Std, fontSize: 12, color: '#555', whiteSpace: 'nowrap' }}>
                            {new Date(tx.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                            {' '}
                            <span style={{ color: '#333' }}>
                              {new Date(tx.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td style={Std}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                              background: `${meta.color}20`, color: meta.color,
                            }}>{meta.label}</span>
                          </td>
                          <td style={{ ...Std, fontSize: 13, color: '#aaa' }}>{tx.from_user}</td>
                          <td style={{ ...Std, fontSize: 12, color: '#555', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.ref_title || '—'}
                          </td>
                          <td style={{ ...Std, textAlign: 'right', color: '#aaa', fontSize: 12 }}>{fmt(tx.gross)}</td>
                          <td style={{ ...Std, textAlign: 'right', color: '#ff6b6b', fontSize: 12 }}>−{fmt(tx.fee)}</td>
                          <td style={{ ...Std, textAlign: 'right', fontWeight: 600, color: meta.color }}>{fmt(tx.net)} MT</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
        </>
      )}
    </div>
  );
}

const STATUS_COLOR = {
  pending:  '#fdcb6e',
  approved: '#74b9ff',
  paid:     '#6fcf97',
  rejected: '#ff6b6b',
};

function WithdrawalTab({ token, wallet, showToast }) {
  const [history,    setHistory]    = useState([]);
  const [histLoading,setHistLoading]= useState(true);
  const [amount,     setAmount]     = useState('');
  const [note,       setNote]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchHistory = async () => {
    try {
      const r = await fetch('/api/withdrawals/mine', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setHistory(Array.isArray(d) ? d : []);
    } catch { setHistory([]); }
    finally { setHistLoading(false); }
  };

  useEffect(() => { if (token) fetchHistory(); }, [token]);

  const hasPending = history.some(w => w.status === 'pending');
  const balance    = Number(wallet?.balance || 0);

  const submit = async () => {
    if (submitting) return;
    const amt = parseInt(amount);
    if (!amt || amt < 1000) { showToast('Tối thiểu 1,000 MT', false); return; }
    if (amt > balance)      { showToast('Số dư không đủ', false); return; }
    if (hasPending)         { showToast('Bạn đang có yêu cầu chờ duyệt', false); return; }
    setSubmitting(true);
    try {
      const r = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_mt: amt, note: note || undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      showToast('✅ Yêu cầu rút đã được gửi!');
      setAmount(''); setNote('');
      fetchHistory();
    } catch (e) { showToast(e.message, false); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={S.grid2}>
      {/* ── Form gửi yêu cầu ── */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Tạo yêu cầu rút tiền</div>

        <div style={{ background: '#0e0e17', borderRadius: 10, padding: '1rem', marginBottom: 16, border: '1px solid #1e1e2e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#555' }}>Số dư ví hiện tại</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#a29bfe' }}>{balance.toLocaleString()} MT</div>
          </div>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>Số MT muốn rút * <span style={{ color: '#444', fontWeight: 400 }}>(tối thiểu 1,000 MT)</span></label>
          <input
            style={S.input} type="number" min="1000" step="100"
            placeholder="Nhập số MT (vd: 5000)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          {amount && parseInt(amount) >= 1000 && parseInt(amount) <= balance && (
            <div style={{ fontSize: 12, color: '#6fcf97', marginTop: 4 }}>
              ✓ Hợp lệ — sẽ trừ ngay {parseInt(amount).toLocaleString()} MT khỏi ví
            </div>
          )}
          {amount && parseInt(amount) > balance && (
            <div style={{ fontSize: 12, color: '#ff6b6b', marginTop: 4 }}>✕ Số dư không đủ</div>
          )}
          {amount && parseInt(amount) < 1000 && parseInt(amount) > 0 && (
            <div style={{ fontSize: 12, color: '#fdcb6e', marginTop: 4 }}>✕ Tối thiểu 1,000 MT</div>
          )}
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>Ghi chú (tùy chọn)</label>
          <input
            style={S.input}
            placeholder="VD: Rút về tài khoản Vietcombank 1234"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {hasPending && (
          <div style={{ background: '#fdcb6e15', border: '1px solid #fdcb6e30', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#fdcb6e' }}>
            ⏳ Bạn đang có 1 yêu cầu đang chờ duyệt. Không thể tạo yêu cầu mới.
          </div>
        )}

        <button
          style={{ ...S.submitBtn, opacity: hasPending || submitting ? .5 : 1 }}
          onClick={submit}
          disabled={submitting || hasPending}
        >
          {submitting ? 'Đang gửi...' : '💸 Gửi yêu cầu rút'}
        </button>

        <div style={{ marginTop: 12, padding: '10px 14px', background: '#13131f', borderRadius: 8, fontSize: 11, color: '#444', lineHeight: 1.7 }}>
          ℹ️ <strong style={{ color: '#555' }}>Quy trình:</strong><br/>
          1. Gửi yêu cầu → MT bị trừ ngay<br/>
          2. Admin <strong style={{ color: '#74b9ff' }}>Duyệt</strong> yêu cầu<br/>
          3. Admin <strong style={{ color: '#6fcf97' }}>Mark Paid</strong> → tiền được chuyển<br/>
          4. Nếu bị từ chối → MT hoàn về ví
        </div>
      </div>

      {/* ── Lịch sử ── */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={S.sectionTitle}>Lịch sử yêu cầu</div>
          <button onClick={fetchHistory} style={{ background: 'none', border: '1px solid #2a2a3a', borderRadius: 6, color: '#555', fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}>
            ↻ Làm mới
          </button>
        </div>

        {histLoading ? (
          <div style={S.noData}>Đang tải...</div>
        ) : !history.length ? (
          <div style={S.noData}>Chưa có yêu cầu rút nào</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Ngày</th>
                <th style={S.th}>Số MT</th>
                <th style={S.th}>Ghi chú</th>
                <th style={S.th}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {history.map(w => (
                <tr key={w.id}>
                  <td style={{ ...S.td, fontSize: 12, color: '#555', whiteSpace: 'nowrap' }}>
                    {new Date(w.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </td>
                  <td style={{ ...S.td, fontWeight: 700, color: '#fd79a8' }}>
                    {Number(w.amount_xu).toLocaleString()} MT
                  </td>
                  <td style={{ ...S.td, fontSize: 12, color: '#555', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.notes || '—'}
                    {w.bank_transfer_ref && (
                      <div style={{ fontSize: 11, color: '#74b9ff', marginTop: 2 }}>🏦 {w.bank_transfer_ref}</div>
                    )}
                  </td>
                  <td style={S.td}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: `${STATUS_COLOR[w.status] || '#888'}20`,
                      color: STATUS_COLOR[w.status] || '#888',
                    }}>
                      {w.status === 'pending'  ? '⏳ Chờ duyệt' :
                       w.status === 'approved' ? '✅ Đã duyệt'  :
                       w.status === 'paid'     ? '💸 Đã trả'    :
                       w.status === 'rejected' ? '❌ Từ chối'   : w.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function CreatorDashboard() {
  const { user, token, wallet } = useAuth();
  const navigate = useNavigate();
  const [stats,        setStats]        = useState(null);
  const [products,     setProducts]     = useState([]);
  const [tiers,        setTiers]        = useState([]);
  const [members,      setMembers]      = useState([]);
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('overview');
  const [toast,        setToast]        = useState(null);
  const [earnings,     setEarnings]     = useState(null);
  const [earningsPeriod, setEarningsPeriod] = useState('30d');
  const [earningsLoading, setEarningsLoading] = useState(false);

  const [prodForm, setProdForm] = useState({ title: '', description: '', type: 'ebook', price_mt: '', thumbnail_url: '', download_url: '' });
  const [tierForm, setTierForm] = useState({ name: 'Bronze', level: 1, price_mt: '', description: '', perks: '' });
  const [saving,   setSaving]   = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEarnings = async (period, tkn) => {
    if (!tkn) return;
    setEarningsLoading(true);
    try {
      const r = await fetch(`/api/creator/earnings?period=${period}`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      const d = await r.json();
      setEarnings(d);
    } catch { /* ignore */ }
    finally { setEarningsLoading(false); }
  };

  useEffect(() => {
    if (!token) return;
    if (user && user.role !== 'creator' && user.role !== 'admin') { navigate('/'); return; }

    const h = { Authorization: `Bearer ${token}` };
    setLoading(true);
    Promise.all([
      fetch('/api/creator/stats', { headers: h }).then(r => r.json()),
      fetch('/api/creator-products/mine', { headers: h }).then(r => r.json()),
      fetch('/api/fanclub/my-tiers', { headers: h }).then(r => r.json()),
      fetch('/api/fanclub/members', { headers: h }).then(r => r.json()),
    ]).then(([s, p, t, m]) => {
      setStats(s);
      setProducts(p.products || []);
      setTiers(t.tiers || []);
      setMembers(m.members || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token, user]);

  useEffect(() => {
    if (tab === 'revenue' && token) {
      fetchEarnings(earningsPeriod, token);
    }
  }, [tab, earningsPeriod, token]);

  const createProduct = async () => {
    if (saving) return;
    if (!prodForm.title || !prodForm.price_mt) { showToast('Điền title và price_mt', false); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/creator-products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prodForm, price_mt: parseInt(prodForm.price_mt) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setProducts(prev => [d.product, ...prev]);
      setProdForm({ title: '', description: '', type: 'ebook', price_mt: '', thumbnail_url: '', download_url: '' });
      showToast('✅ Đã tạo sản phẩm!');
    } catch (e) { showToast(e.message, false); }
    finally { setSaving(false); }
  };

  const toggleProduct = async (id, is_active) => {
    await fetch(`/api/creator-products/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active } : p));
  };

  const startEdit = (p) => {
    setEditingProductId(p.id);
    setEditForm({ title: p.title, description: p.description || '', type: p.type, price_mt: String(p.price_mt), thumbnail_url: p.thumbnail_url || '', download_url: p.download_url || '' });
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      const r = await fetch(`/api/creator-products/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, price_mt: parseInt(editForm.price_mt) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...d.product } : p));
      setEditingProductId(null);
      showToast('✅ Đã cập nhật sản phẩm!');
    } catch (e) { showToast(e.message, false); }
    finally { setSaving(false); }
  };

  const deleteProduct = async (id, title) => {
    if (!window.confirm(`Xóa sản phẩm "${title}"?\nSản phẩm sẽ bị ẩn khỏi Marketplace.`)) return;
    try {
      const r = await fetch(`/api/creator-products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Xóa thất bại');
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast('🗑 Đã xóa sản phẩm');
    } catch (e) { showToast(e.message, false); }
  };

  const saveTier = async () => {
    if (saving) return;
    if (!tierForm.price_mt) { showToast('Điền price_mt', false); return; }
    setSaving(true);
    try {
      const perks = tierForm.perks ? tierForm.perks.split('\n').filter(Boolean) : [];
      const r = await fetch('/api/fanclub/tiers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tierForm, perks, price_mt: parseInt(tierForm.price_mt) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setTiers(prev => {
        const exists = prev.findIndex(t => t.level === d.tier.level);
        if (exists >= 0) { const n = [...prev]; n[exists] = d.tier; return n; }
        return [...prev, d.tier].sort((a, b) => a.level - b.level);
      });
      showToast(`✅ Đã lưu tier ${d.tier.name}!`);
    } catch (e) { showToast(e.message, false); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ color: '#555', padding: '2rem' }}>Đang tải...</div>;
  if (!stats)  return <div style={{ color: '#ff6b6b', padding: '2rem' }}>Không thể tải dữ liệu</div>;

  const { totals, topTippers, dailyEarnings, withdrawals, revenue30, todayRevenue, fanClubCount, productSalesTotal, creatorVerified, creatorFeatured, verificationNote } = stats;
  const maxTip = topTippers?.[0]?.total_xu || 1;
  const totalRevenue = Number(revenue30 || 0) + Number(productSalesTotal || 0);
  const convRate = totals?.total_tips > 0 && members?.length > 0
    ? ((members.length / (topTippers?.length || 1)) * 100).toFixed(1)
    : '0.0';

  const TABS = [
    { key: 'overview',  label: '📊 Tổng quan' },
    { key: 'revenue',   label: '💰 Doanh thu' },
    { key: 'fanclub',   label: `👑 Fan Club (${tiers.length})` },
    { key: 'products',  label: `🛍 Sản phẩm (${products.length})` },
    { key: 'withdrawals', label: '🏦 Rút tiền' },
  ];

  return (
    <div>
      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <div style={S.h1}>Creator Dashboard</div>
        {creatorVerified && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 14px', background: '#00b89420', border: '1px solid #00b89450', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#00b894' }}>
            ✔ Verified Creator
          </span>
        )}
        {creatorFeatured && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 14px', background: '#fdcb6e20', border: '1px solid #fdcb6e50', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#fdcb6e' }}>
            ⭐ Featured Creator
          </span>
        )}
        {!creatorVerified && !creatorFeatured && (
          <span style={{ fontSize: 12, color: '#444', fontStyle: 'italic' }}>Chưa được xác minh</span>
        )}
      </div>

      {creatorVerified && verificationNote && (
        <div style={{ background: '#00b89410', border: '1px solid #00b89430', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 12, color: '#00b894' }}>
          📝 Ghi chú xác minh: {verificationNote}
        </div>
      )}

      {totals?.total_tips === 0 && (
        <div style={S.alert}>
          💡 Chưa có ai tip bạn. Chia sẻ trang profile để nhận tip từ fans!
          <br /><span style={{ cursor: 'pointer', color: '#a29bfe', textDecoration: 'underline' }}
            onClick={() => navigate(`/creator/${user?.id}`)}>Xem profile của tôi →</span>
        </div>
      )}

      {/* Stats tổng — 4 ô */}
      <div style={S.grid4}>
        <div style={S.stat}>
          <div style={S.statLbl}>Tổng MT nhận (tips)</div>
          <div style={S.statVal('#6fcf97')}>{Number(totals?.total_received_xu || 0).toLocaleString()}</div>
          <div style={S.statSub}>sau phí 5%</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLbl}>Hôm nay</div>
          <div style={S.statVal('#fdcb6e')}>{Number(todayRevenue || 0).toLocaleString()}</div>
          <div style={S.statSub}>MT nhận hôm nay</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLbl}>30 ngày qua</div>
          <div style={S.statVal('#74b9ff')}>{Number(revenue30 || 0).toLocaleString()}</div>
          <div style={S.statSub}>MT từ tips</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLbl}>Số dư ví</div>
          <div style={S.statVal('#a29bfe')}>{Number(wallet?.balance || 0).toLocaleString()}</div>
          <div style={S.statSub}>MT · <span style={{ cursor: 'pointer', color: '#555' }} onClick={() => navigate('/wallet')}>Rút →</span></div>
        </div>
      </div>

      {/* Stats mở rộng */}
      <div style={S.grid4}>
        <div style={S.stat}>
          <div style={S.statLbl}>Fan Club Members</div>
          <div style={S.statVal('#fd79a8')}>{members.length}</div>
          <div style={S.statSub}>thành viên đang active</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLbl}>Sản phẩm</div>
          <div style={S.statVal('#81ecec')}>{products.filter(p => p.is_active).length}</div>
          <div style={S.statSub}>đang bán · {Number(productSalesTotal || 0).toLocaleString()} MT</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLbl}>Tổng lượt tip</div>
          <div style={S.statVal('#74b9ff')}>{Number(totals?.total_tips || 0).toLocaleString()}</div>
          <div style={S.statSub}>lượt nhận tip</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLbl}>Fan → Member</div>
          <div style={S.statVal('#a29bfe')}>{convRate}%</div>
          <div style={S.statSub}>tỷ lệ chuyển đổi</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* Tab: Tổng quan */}
      {tab === 'overview' && (
        <div style={S.grid2}>
          <div style={S.card}>
            <div style={S.sectionTitle}>Thu nhập 7 ngày gần nhất (từ tips)</div>
            <BarChart7 data={dailyEarnings} />
          </div>
          <div style={S.card}>
            <div style={S.sectionTitle}>Top fans tip nhiều nhất</div>
            {!topTippers?.length ? <div style={S.noData}>Chưa có ai tip</div>
              : topTippers.map((t, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#ddd' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`} {t.username}
                    </span>
                    <span style={{ fontSize: 13, color: '#a29bfe', fontWeight: 600 }}>
                      {Number(t.total_xu).toLocaleString()} MT
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
      )}

      {/* Tab: Doanh thu */}
      {tab === 'revenue' && (
        <EarningsTab
          earnings={earnings}
          loading={earningsLoading}
          period={earningsPeriod}
          onPeriodChange={setEarningsPeriod}
        />
      )}

      {/* Tab: Fan Club setup */}
      {tab === 'fanclub' && (
        <div style={S.grid2}>
          <div style={S.card}>
            <div style={S.sectionTitle}>Tạo / Cập nhật Tier</div>
            <div style={S.formGroup}>
              <label style={S.label}>Chọn Tier</label>
              <select style={S.select} value={tierForm.level}
                onChange={e => {
                  const lv = Number(e.target.value);
                  const existing = tiers.find(t => t.level === lv);
                  setTierForm(existing
                    ? { ...existing, perks: (existing.perks || []).join('\n') }
                    : { name: ['','Bronze','Silver','Gold'][lv], level: lv, price_mt: '', description: '', perks: '' }
                  );
                }}>
                <option value={1}>🥉 Bronze</option>
                <option value={2}>🥈 Silver</option>
                <option value={3}>🥇 Gold</option>
              </select>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Tên hiển thị</label>
              <input style={S.input} value={tierForm.name}
                onChange={e => setTierForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Giá (MT / tháng)</label>
              <input style={S.input} type="number" placeholder="500" value={tierForm.price_mt}
                onChange={e => setTierForm(f => ({ ...f, price_mt: e.target.value }))} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Mô tả ngắn</label>
              <input style={S.input} value={tierForm.description}
                onChange={e => setTierForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Quyền lợi (mỗi dòng 1 quyền lợi)</label>
              <textarea style={{ ...S.input, height: 80, resize: 'vertical' }} value={tierForm.perks}
                onChange={e => setTierForm(f => ({ ...f, perks: e.target.value }))} />
            </div>
            <button style={S.submitBtn} onClick={saveTier} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu Tier'}
            </button>
          </div>

          <div style={S.card}>
            <div style={S.sectionTitle}>Tiers hiện tại</div>
            {!tiers.length ? <div style={S.noData}>Chưa có tier nào</div> : tiers.map(t => (
              <div key={t.id} style={{ marginBottom: 16, padding: '1rem', background: '#13131f', borderRadius: 10, border: '1px solid #1e1e2e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{t.name}</span>
                  <span style={{ fontSize: 13, color: '#a29bfe' }}>{Number(t.price_mt).toLocaleString()} MT/tháng</span>
                </div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{t.member_count} thành viên</div>
                {t.description && <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>{t.description}</div>}
                {t.perks?.length > 0 && (
                  <ul style={{ paddingLeft: 16, color: '#666', fontSize: 12, marginTop: 6 }}>
                    {t.perks.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Sản phẩm */}
      {tab === 'products' && (
        <div style={S.grid2}>
          <div style={S.card}>
            <div style={S.sectionTitle}>Thêm sản phẩm mới</div>
            {['title','description','thumbnail_url','download_url'].map(field => (
              <div style={S.formGroup} key={field}>
                <label style={S.label}>{field === 'title' ? 'Tiêu đề *' : field === 'description' ? 'Mô tả' : field === 'thumbnail_url' ? 'URL ảnh thumbnail' : 'URL tải xuống'}</label>
                <input style={S.input} value={prodForm[field]} onChange={e => setProdForm(f => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
            <div style={S.formGroup}>
              <label style={S.label}>Loại sản phẩm *</label>
              <select style={S.select} value={prodForm.type} onChange={e => setProdForm(f => ({ ...f, type: e.target.value }))}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Giá (MT) *</label>
              <input style={S.input} type="number" placeholder="1000" value={prodForm.price_mt}
                onChange={e => setProdForm(f => ({ ...f, price_mt: e.target.value }))} />
            </div>
            <button style={S.submitBtn} onClick={createProduct} disabled={saving}>
              {saving ? 'Đang tạo...' : '+ Tạo sản phẩm'}
            </button>
          </div>

          <div style={S.card}>
            <div style={S.sectionTitle}>Sản phẩm của tôi ({products.length})</div>
            {!products.length ? <div style={S.noData}>Chưa có sản phẩm nào</div>
              : products.map(p => (
                <div key={p.id} style={{ marginBottom: 12, padding: '1rem', background: '#13131f', borderRadius: 10, border: `1px solid ${editingProductId === p.id ? '#6C5CE7' : p.is_active ? '#1e1e2e' : '#2a1a1a'}` }}>
                  {editingProductId === p.id ? (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#a29bfe', marginBottom: 10 }}>✏️ Sửa sản phẩm</div>
                      {[['title','Tiêu đề *'],['description','Mô tả'],['thumbnail_url','URL thumbnail'],['download_url','URL tải xuống']].map(([f, lbl]) => (
                        <div key={f} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>{lbl}</div>
                          <input style={{ ...S.input, marginBottom: 0 }} value={editForm[f]} onChange={e => setEditForm(ef => ({ ...ef, [f]: e.target.value }))} />
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Loại</div>
                          <select style={{ ...S.select }} value={editForm.type} onChange={e => setEditForm(ef => ({ ...ef, type: e.target.value }))}>
                            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Giá (MT)</div>
                          <input style={{ ...S.input, marginBottom: 0 }} type="number" value={editForm.price_mt} onChange={e => setEditForm(ef => ({ ...ef, price_mt: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button style={{ ...S.submitBtn, flex: 1 }} onClick={() => saveEdit(p.id)} disabled={saving}>{saving ? 'Đang lưu...' : '💾 Lưu'}</button>
                        <button style={{ padding: '8px 14px', background: 'none', border: '1px solid #2a2a3a', borderRadius: 8, color: '#666', fontSize: 13, cursor: 'pointer' }} onClick={() => setEditingProductId(null)}>Hủy</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: p.is_active ? '#fff' : '#555', marginBottom: 2 }}>{p.title}</div>
                          <div style={{ fontSize: 11, color: '#555' }}>{TYPE_LABELS[p.type]} · {Number(p.price_mt).toLocaleString()} MT · {p.order_count || 0} đơn</div>
                          {p.order_count > 0 && <div style={{ fontSize: 11, color: '#00b894', marginTop: 2 }}>+{Number(p.revenue_mt || 0).toLocaleString()} MT doanh thu</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => startEdit(p)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #2a2a3a', background: 'none', color: '#a29bfe', fontSize: 11, cursor: 'pointer' }}>
                            ✏️ Sửa
                          </button>
                          <button onClick={() => toggleProduct(p.id, !p.is_active)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #2a2a3a', background: 'none', color: p.is_active ? '#fdcb6e' : '#6fcf97', fontSize: 11, cursor: 'pointer' }}>
                            {p.is_active ? 'Ẩn' : 'Hiện'}
                          </button>
                          <button onClick={() => deleteProduct(p.id, p.title)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #2a1a1a', background: 'none', color: '#ff6b6b', fontSize: 11, cursor: 'pointer' }}>
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Tab: Rút tiền */}
      {tab === 'withdrawals' && (
        <WithdrawalTab token={token} wallet={wallet} showToast={showToast} />
      )}
    </div>
  );
}
