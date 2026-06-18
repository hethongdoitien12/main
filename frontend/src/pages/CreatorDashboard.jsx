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

export default function CreatorDashboard() {
  const { user, token, wallet } = useAuth();
  const navigate = useNavigate();
  const [stats,    setStats]    = useState(null);
  const [products, setProducts] = useState([]);
  const [tiers,    setTiers]    = useState([]);
  const [members,  setMembers]  = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('overview');
  const [toast,    setToast]    = useState(null);

  const [prodForm, setProdForm] = useState({ title: '', description: '', type: 'ebook', price_mt: '', thumbnail_url: '', download_url: '' });
  const [tierForm, setTierForm] = useState({ name: 'Bronze', level: 1, price_mt: '', description: '', perks: '' });
  const [saving,   setSaving]   = useState(false);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
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

      {/* Tab: Doanh thu 30 ngày */}
      {tab === 'revenue' && (
        <div>
          <div style={S.card}>
            <div style={S.sectionTitle}>Doanh thu tips 30 ngày qua</div>
            <BarChart30 data={stats.dailyEarnings30} />
            <div style={{ marginTop: 12, display: 'flex', gap: 24 }}>
              <div><span style={{ fontSize: 11, color: '#555' }}>Tips 30 ngày: </span><span style={{ fontWeight: 700, color: '#6fcf97' }}>{Number(revenue30 || 0).toLocaleString()} MT</span></div>
              <div><span style={{ fontSize: 11, color: '#555' }}>Sản phẩm: </span><span style={{ fontWeight: 700, color: '#74b9ff' }}>{Number(productSalesTotal || 0).toLocaleString()} MT</span></div>
              <div><span style={{ fontSize: 11, color: '#555' }}>Tổng: </span><span style={{ fontWeight: 700, color: '#a29bfe' }}>{totalRevenue.toLocaleString()} MT</span></div>
            </div>
          </div>
          <div style={{ ...S.card, marginTop: 16 }}>
            <div style={S.sectionTitle}>Fan Club Members ({members.length})</div>
            {!members.length ? <div style={S.noData}>Chưa có thành viên</div> : (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Thành viên</th>
                    <th style={S.th}>Tier</th>
                    <th style={S.th}>MT / tháng</th>
                    <th style={S.th}>Auto-renew</th>
                    <th style={S.th}>Gia hạn</th>
                    <th style={S.th}>Hết hạn</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => {
                    const daysLeft = Math.ceil((new Date(m.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={m.id}>
                        <td style={S.td}>{m.username}</td>
                        <td style={S.td}>{m.tier_name}</td>
                        <td style={S.td}>{Number(m.price_mt).toLocaleString()} MT</td>
                        <td style={S.td}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: m.auto_renew ? '#6C5CE720' : '#22222a',
                            color: m.auto_renew ? '#a29bfe' : '#444',
                          }}>
                            {m.auto_renew ? '🔄 Bật' : '—'}
                          </span>
                        </td>
                        <td style={S.td}>{m.renewal_count || 0} lần</td>
                        <td style={{ ...S.td, color: daysLeft <= 5 ? '#fdcb6e' : '#ccc' }}>
                          {new Date(m.expires_at).toLocaleDateString('vi-VN')}
                          {daysLeft <= 5 && <span style={{ fontSize: 11, color: '#fdcb6e', marginLeft: 4 }}>({daysLeft}ngày)</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
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
            <div style={S.sectionTitle}>Sản phẩm của tôi</div>
            {!products.length ? <div style={S.noData}>Chưa có sản phẩm nào</div>
              : products.map(p => (
                <div key={p.id} style={{ marginBottom: 12, padding: '1rem', background: '#13131f', borderRadius: 10, border: `1px solid ${p.is_active ? '#1e1e2e' : '#2a1a1a'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: p.is_active ? '#fff' : '#555' }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{TYPE_LABELS[p.type]} · {Number(p.price_mt).toLocaleString()} MT · {p.order_count} đơn · {Number(p.revenue_mt).toLocaleString()} MT doanh thu</div>
                    </div>
                    <button onClick={() => toggleProduct(p.id, !p.is_active)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #2a2a3a', background: 'none', color: p.is_active ? '#ff6b6b' : '#6fcf97', fontSize: 11, cursor: 'pointer' }}>
                      {p.is_active ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Tab: Rút tiền */}
      {tab === 'withdrawals' && (
        <div style={S.card}>
          <div style={S.sectionTitle}>Lịch sử rút tiền</div>
          {!withdrawals?.length ? <div style={S.noData}>Chưa có lịch sử rút tiền</div> : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Ngày</th>
                  <th style={S.th}>MT rút</th>
                  <th style={S.th}>VNĐ nhận</th>
                  <th style={S.th}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(w => (
                  <tr key={w.id}>
                    <td style={S.td}>{new Date(w.created_at).toLocaleDateString('vi-VN')}</td>
                    <td style={S.td}>{Number(w.amount_xu).toLocaleString()} MT</td>
                    <td style={S.td}>{Number(w.amount_vnd).toLocaleString()}₫</td>
                    <td style={S.td}><span style={S.badge(w.status)}>{w.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 16 }}>
            <button style={{ ...S.submitBtn, background: '#00b894' }} onClick={() => navigate('/wallet')}>
              💰 Tới trang rút tiền
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
