import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { SkeletonGrid, SkeletonCard } from '../components/Skeleton.jsx';

const CAT_LABEL = {
  badge: '🏅 Badge',
  frame: '🖼 Khung Avatar',
  boost: '🚀 Boost',
  ticket: '🎫 Vé',
  exclusive: '👑 Đặc Quyền',
};

const CAT_ORDER = ['badge', 'frame', 'boost', 'ticket', 'exclusive'];

const S = {
  page:   { maxWidth: 900, margin: '0 auto' },
  h1:     { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub:    { fontSize: 14, color: '#555', marginBottom: 24 },
  tabs:   { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  tab:    (a) => ({
    padding: '6px 16px', borderRadius: 20, border: `1px solid ${a ? '#6C5CE7' : '#2a2a3a'}`,
    background: a ? '#6C5CE7' : 'transparent', color: a ? '#fff' : '#888',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
  }),
  grid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 32 },
  card:   (owned) => ({
    background: '#13131f', border: `1px solid ${owned ? '#6C5CE744' : '#1e1e2e'}`,
    borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 10,
    position: 'relative', overflow: 'hidden',
    transition: 'border-color .2s',
  }),
  limitedBadge: {
    position: 'absolute', top: 10, right: 10,
    fontSize: 10, padding: '2px 8px', background: '#e17055', borderRadius: 20,
    color: '#fff', fontWeight: 600, letterSpacing: '.04em',
  },
  ownedBadge: {
    position: 'absolute', top: 10, right: 10,
    fontSize: 10, padding: '2px 8px', background: '#00b89444', borderRadius: 20,
    color: '#00b894', fontWeight: 600, border: '1px solid #00b89444',
  },
  icon:   { fontSize: 36, lineHeight: 1 },
  name:   { fontSize: 15, fontWeight: 700, color: '#eee' },
  desc:   { fontSize: 12, color: '#666', lineHeight: 1.5, flex: 1 },
  price:  { fontSize: 18, fontWeight: 700, color: '#f6c90e' },
  stock:  { fontSize: 11, color: '#e17055' },
  btn:    (dis) => ({
    padding: '9px 0', borderRadius: 8, border: 'none', width: '100%',
    background: dis ? '#1a1a2a' : 'linear-gradient(135deg,#6C5CE7,#a29bfe)',
    color: dis ? '#444' : '#fff', fontWeight: 600, fontSize: 13,
    cursor: dis ? 'not-allowed' : 'pointer',
  }),
  section: { marginBottom: 8, fontSize: 13, color: '#6C5CE7', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' },
  toast:  (type) => ({
    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
    background: type === 'error' ? '#c0392b' : '#00b894',
    color: '#fff', padding: '12px 24px', borderRadius: 10,
    fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 20px #0006',
    maxWidth: 400, textAlign: 'center',
  }),
  mySection: { marginTop: 32 },
  myTitle: { fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 },
  myGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 },
  myCard: {
    background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 10,
    padding: 14, display: 'flex', alignItems: 'center', gap: 10,
  },
  myIcon: { fontSize: 24, flexShrink: 0 },
  myName: { fontSize: 13, fontWeight: 600, color: '#ccc' },
  myDate: { fontSize: 11, color: '#444' },
  empty: { color: '#444', fontSize: 13, padding: '20px 0', textAlign: 'center' },
  balBar: {
    background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: 10,
    padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10,
  },
  balLabel: { fontSize: 12, color: '#555', marginRight: 4 },
  balVal: { fontSize: 20, fontWeight: 700, color: '#a29bfe' },
};

export default function Shop() {
  const { token, wallet, refreshWallet } = useAuth();
  const [items, setItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [cat, setCat] = useState('all');
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(null);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('shop');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.shop.items(token).then(setItems).catch(() => {}),
      api.shop.myItems(token).then(setMyItems).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [token]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleBuy = async (item) => {
    if (buying) return;
    setBuying(item.id);
    try {
      const r = await api.shop.buy(item.id, token);
      showToast(r.message || `Mua thành công ${item.icon} ${item.name}!`);
      const updated = await api.shop.items(token);
      setItems(updated);
      const myUpdated = await api.shop.myItems(token);
      setMyItems(myUpdated);
      refreshWallet();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBuying(null);
    }
  };

  const ownsItem = (itemId) => myItems.some(m => m.item_id === itemId || m.id === itemId);

  const cats = ['all', ...CAT_ORDER.filter(c => items.some(i => i.category === c))];
  const filtered = cat === 'all' ? items : items.filter(i => i.category === cat);

  const grouped = CAT_ORDER.reduce((acc, c) => {
    const list = filtered.filter(i => i.category === c);
    if (list.length) acc[c] = list;
    return acc;
  }, {});

  return (
    <div style={S.page}>
      <div style={S.h1}>🛍 Cửa Hàng MT</div>
      <div style={S.sub}>Dùng MT để mua badge, khung avatar, boost bài đăng và nhiều hơn nữa.</div>

      <div style={S.balBar}>
        <span style={S.balLabel}>Số dư của bạn:</span>
        <span style={S.balVal}>{(wallet?.balance || 0).toLocaleString()} MT</span>
      </div>

      <div style={S.tabs}>
        {[['shop','🏪 Cửa hàng'],['owned','🎒 Đã mua']].map(([k, l]) => (
          <button key={k} style={S.tab(tab === k)} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'shop' && (
        <>
          <div style={S.tabs}>
            {cats.map(c => (
              <button key={c} style={S.tab(cat === c)} onClick={() => setCat(c)}>
                {c === 'all' ? '🔥 Tất cả' : CAT_LABEL[c]}
              </button>
            ))}
          </div>

          {loading && (
            <SkeletonGrid columns={3}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </SkeletonGrid>
          )}

          {!loading && Object.entries(grouped).map(([c, list]) => (
            <div key={c}>
              <div style={S.section}>{CAT_LABEL[c]}</div>
              <div style={S.grid}>
                {list.map(item => {
                  const owned = ownsItem(item.id);
                  const outOfStock = item.stock !== null && item.stock <= 0;
                  const noBalance = (wallet?.balance || 0) < item.price_mt;
                  const isBuying = buying === item.id;
                  return (
                    <div key={item.id} style={S.card(owned)}>
                      {item.is_limited && !owned && <span style={S.limitedBadge}>LIMITED</span>}
                      {owned && <span style={S.ownedBadge}>✓ Đã có</span>}
                      <div style={S.icon}>{item.icon}</div>
                      <div style={S.name}>{item.name}</div>
                      <div style={S.desc}>{item.description}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <div style={S.price}>{item.price_mt.toLocaleString()} MT</div>
                        {item.stock !== null && (
                          <div style={S.stock}>còn {item.stock}</div>
                        )}
                      </div>
                      <button
                        style={S.btn(owned || outOfStock || noBalance || isBuying)}
                        disabled={owned || outOfStock || noBalance || isBuying}
                        onClick={() => handleBuy(item)}
                      >
                        {isBuying ? '⏳ Đang mua...' :
                         outOfStock ? 'Hết hàng' :
                         owned ? '✓ Đã sở hữu' :
                         noBalance ? 'Không đủ MT' :
                         'Mua ngay'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={S.empty}>Không có vật phẩm nào trong danh mục này.</div>
          )}
        </>
      )}

      {tab === 'owned' && (
        <div>
          {myItems.length === 0 ? (
            <div style={S.empty}>Bạn chưa mua vật phẩm nào. Hãy ghé cửa hàng!</div>
          ) : (
            <div style={S.myGrid}>
              {myItems.map(m => (
                <div key={m.id} style={S.myCard}>
                  <div style={S.myIcon}>{m.icon}</div>
                  <div>
                    <div style={S.myName}>{m.name}</div>
                    <div style={S.myDate}>
                      {new Date(m.created_at).toLocaleDateString('vi-VN')} · {m.amount_mt?.toLocaleString()} MT
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {toast && <div style={S.toast(toast.type)}>{toast.msg}</div>}
    </div>
  );
}
