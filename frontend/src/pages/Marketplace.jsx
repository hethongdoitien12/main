import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';

const TYPE_LABELS = {
  ebook:'📚 eBook', template:'📐 Template', preset:'🎨 Preset',
  source_code:'💻 Source Code', prompt_ai:'🤖 AI Prompt', other:'📦 Khác',
};
const TYPE_COLORS = {
  ebook:'#6C5CE7', template:'#00b894', preset:'#fd79a8',
  source_code:'#fdcb6e', prompt_ai:'#74b9ff', other:'#b2bec3',
};
const THUMB_ICONS = { ebook:'📚', template:'📐', preset:'🎨', source_code:'💻', prompt_ai:'🤖', other:'📦' };

function fmtDate(d) {
  return new Date(d).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
}

const S = {
  page:     { maxWidth: 1200 },
  h1:       { fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub:      { color: '#555', fontSize: 13, marginBottom: '1.5rem' },
  tabs:     { display: 'flex', gap: 4, marginBottom: '1.5rem', borderBottom: '1px solid #1e1e2e' },
  tab:      (a) => ({ padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: a ? '#a29bfe' : '#555', borderBottom: `2px solid ${a ? '#6C5CE7' : 'transparent'}`, marginBottom: -1 }),
  toolbar:  { display: 'flex', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' },
  input:    { padding: '8px 14px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 8, color: '#ccc', fontSize: 13, outline: 'none', minWidth: 240 },
  select:   { padding: '8px 12px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 8, color: '#ccc', fontSize: 13, outline: 'none' },
  grid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 },
  card:     { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'border-color .15s, transform .15s' },
  thumb:    { width: '100%', height: 160, objectFit: 'cover', background: '#13131f' },
  thumbPh:  { width: '100%', height: 160, background: 'linear-gradient(135deg,#1a1a2e,#0e0e17)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 },
  cardBody: { padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 },
  typeBadge:(t) => ({ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: TYPE_COLORS[t] + '22', color: TYPE_COLORS[t], letterSpacing: '.04em', alignSelf: 'flex-start' }),
  title:    { fontSize: 14, fontWeight: 600, color: '#e8e6e0', lineHeight: 1.4, flex: 1 },
  creator:  { display: 'flex', alignItems: 'center', gap: 6 },
  avatar:   { width: 20, height: 20, borderRadius: '50%', background: '#6C5CE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#fff', flexShrink: 0 },
  creatorName: { fontSize: 12, color: '#666' },
  cardFoot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  price:    { fontSize: 16, fontWeight: 700, color: '#a29bfe' },
  sold:     { fontSize: 11, color: '#444' },
  boughtBadge: { fontSize: 11, padding: '3px 9px', borderRadius: 99, background: '#0e2a1e', color: '#00b894', fontWeight: 600 },
  buyBtn:   { fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#6C5CE7,#a29bfe)', color: '#fff', border: 'none', cursor: 'pointer' },
  empty:    { textAlign: 'center', color: '#333', padding: '4rem', fontSize: 15 },
  pagination: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: '2rem', alignItems: 'center' },
  pageBtn:  (a) => ({ padding: '6px 14px', borderRadius: 7, border: '1px solid #2e2e44', background: a ? '#6C5CE7' : 'transparent', color: a ? '#fff' : '#666', fontSize: 13, cursor: 'pointer' }),
  statsRow: { display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap' },
  statCard: { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 10, padding: '12px 18px', minWidth: 130 },
  statLbl:  { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 },
  statVal:  { fontSize: 20, fontWeight: 700, color: '#a29bfe' },
  orderCard: { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 14, padding: '1.25rem', display: 'flex', gap: 16, alignItems: 'flex-start' },
  orderThumb: { width: 64, height: 64, borderRadius: 10, background: 'linear-gradient(135deg,#1a1a2e,#0e0e17)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 },
  orderImg:  { width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 },
  dlBtn:    { display: 'inline-block', marginTop: 8, padding: '5px 14px', background: '#00b894', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' },
};

export default function Marketplace() {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [activeTab, setActiveTab] = useState('browse');
  const [products, setProducts]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [type, setType]           = useState('');
  const [sort, setSort]           = useState('newest');
  const [page, setPage]           = useState(1);
  const [stats, setStats]         = useState(null);

  const [orders, setOrders]       = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const limit = 24;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ sort, page, limit });
      if (search) q.set('search', search);
      if (type)   q.set('type', type);
      const r = await fetch(`/api/creator-products?${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setProducts(d.products || []);
      setTotal(d.total || 0);
    } finally {
      setLoading(false);
    }
  }, [token, search, type, sort, page]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch('/api/creator-products?limit=200&page=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      const ps = d.products || [];
      setStats({
        total: d.total || 0,
        totalSold: ps.reduce((a, p) => a + (p.sold_count || 0), 0),
        bought: ps.filter(p => p.already_bought).length,
      });
    } catch {}
  }, [token]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const r = await fetch('/api/creator-products/my-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setOrders(d.orders || []);
    } catch {}
    finally { setOrdersLoading(false); }
  }, [token]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
  }, [activeTab, fetchOrders]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };
  const totalPages = Math.ceil(total / limit);

  return (
    <div style={S.page}>
      <div style={S.h1}>🛒 Marketplace</div>
      <div style={S.sub}>Mua sản phẩm số từ các creators — eBook, Template, Preset, Source Code và hơn thế nữa</div>

      <div style={S.tabs}>
        <button style={S.tab(activeTab === 'browse')} onClick={() => setActiveTab('browse')}>
          🛍 Tất cả sản phẩm
        </button>
        <button style={S.tab(activeTab === 'orders')} onClick={() => setActiveTab('orders')}>
          📦 Đã mua {orders.length > 0 && `(${orders.length})`}
        </button>
      </div>

      {/* ── Tab: Duyệt sản phẩm ── */}
      {activeTab === 'browse' && (
        <>
          {stats && (
            <div style={S.statsRow}>
              <div style={S.statCard}>
                <div style={S.statLbl}>Sản phẩm</div>
                <div style={S.statVal}>{stats.total.toLocaleString()}</div>
              </div>
              <div style={S.statCard}>
                <div style={S.statLbl}>Lượt bán</div>
                <div style={S.statVal}>{stats.totalSold.toLocaleString()}</div>
              </div>
              <div style={{ ...S.statCard, borderColor: '#2a2044' }}>
                <div style={S.statLbl}>Đã mua của tôi</div>
                <div style={{ ...S.statVal, color: '#6fcf97' }}>{stats.bought}</div>
              </div>
            </div>
          )}

          <div style={S.toolbar}>
            <input
              style={S.input}
              placeholder="🔍 Tìm kiếm sản phẩm hoặc creator..."
              value={search}
              onChange={handleSearch}
            />
            <select style={S.select} value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
              <option value="">Tất cả loại</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select style={S.select} value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
              <option value="newest">Mới nhất</option>
              <option value="popular">Bán chạy nhất</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
            </select>
            <span style={{ color: '#444', fontSize: 12, marginLeft: 'auto' }}>
              {total.toLocaleString()} sản phẩm
            </span>
          </div>

          {loading ? (
            <div style={{ ...S.grid, opacity: .4 }}>
              {Array(8).fill(0).map((_, i) => (
                <div key={i} style={{ ...S.card, height: 280 }} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={S.empty}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
              <div>Không tìm thấy sản phẩm nào</div>
              {(search || type) && (
                <button
                  onClick={() => { setSearch(''); setType(''); setPage(1); }}
                  style={{ marginTop: 12, padding: '8px 18px', background: '#6C5CE7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div style={S.grid}>
              {products.map(p => (
                <div
                  key={p.id}
                  style={S.card}
                  onClick={() => navigate(`/marketplace/${p.id}`)}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6C5CE7'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.transform = 'none'; }}
                >
                  {p.thumbnail_url
                    ? <img src={p.thumbnail_url} alt={p.title} style={S.thumb} onError={e => { e.target.style.display='none'; }} />
                    : <div style={S.thumbPh}>{THUMB_ICONS[p.type] || '📦'}</div>
                  }
                  <div style={S.cardBody}>
                    <span style={S.typeBadge(p.type)}>{TYPE_LABELS[p.type]}</span>
                    <div style={S.title}>{p.title}</div>
                    <div style={S.creator}>
                      <div style={S.avatar}>{p.creator_name?.[0]?.toUpperCase()}</div>
                      <span style={S.creatorName}>{p.creator_name}</span>
                    </div>
                    <div style={S.cardFoot}>
                      <div>
                        <div style={S.price}>{Number(p.price_mt).toLocaleString()} MT</div>
                        <div style={S.sold}>{p.sold_count || 0} lượt mua</div>
                      </div>
                      {p.already_bought
                        ? <span style={S.boughtBadge}>✓ Đã mua</span>
                        : <span style={{ ...S.buyBtn, pointerEvents: 'none' }}>Mua ngay</span>
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div style={S.pagination}>
              <button style={S.pageBtn(false)} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Trước</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return <button key={pg} style={S.pageBtn(pg === page)} onClick={() => setPage(pg)}>{pg}</button>;
              })}
              <button style={S.pageBtn(false)} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Sau →</button>
              <span style={{ color: '#444', fontSize: 12 }}>Trang {page}/{totalPages}</span>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Đơn hàng của tôi ── */}
      {activeTab === 'orders' && (
        <div>
          {ordersLoading ? (
            <div style={{ color: '#444', textAlign: 'center', padding: '3rem' }}>Đang tải...</div>
          ) : orders.length === 0 ? (
            <div style={S.empty}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
              <div>Chưa có đơn hàng nào</div>
              <button
                onClick={() => setActiveTab('browse')}
                style={{ marginTop: 12, padding: '8px 18px', background: '#6C5CE7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}
              >
                Khám phá sản phẩm →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ color: '#555', fontSize: 13, marginBottom: 4 }}>
                {orders.length} sản phẩm đã mua
              </div>
              {orders.map(o => (
                <div key={o.id} style={S.orderCard}>
                  {o.thumbnail_url
                    ? <img src={o.thumbnail_url} alt={o.title} style={S.orderImg} onError={e => { e.target.style.display='none'; }} />
                    : <div style={S.orderThumb}>{THUMB_ICONS[o.type] || '📦'}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{o.title}</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: (TYPE_COLORS[o.type] || '#888') + '22', color: TYPE_COLORS[o.type] || '#888' }}>{TYPE_LABELS[o.type]}</span>
                      <span style={{ fontSize: 12, color: '#555' }}>từ {o.creator_name}</span>
                      <span style={{ fontSize: 12, color: '#444' }}>{fmtDate(o.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#a29bfe', fontWeight: 600 }}>
                      {Number(o.amount_mt).toLocaleString()} MT
                      <span style={{ fontSize: 11, color: '#444', fontWeight: 400, marginLeft: 8 }}>
                        (phí nền tảng: {Number(o.platform_fee).toLocaleString()} MT)
                      </span>
                    </div>
                    {o.download_url
                      ? <a href={o.download_url} target="_blank" rel="noreferrer" style={S.dlBtn}>⬇ Tải xuống</a>
                      : <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>Liên hệ creator để nhận file</div>
                    }
                  </div>
                  <button
                    onClick={() => navigate(`/marketplace/${o.id}`)}
                    style={{ padding: '6px 12px', background: 'none', border: '1px solid #2e2e44', borderRadius: 7, color: '#666', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
                  >
                    Chi tiết →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
