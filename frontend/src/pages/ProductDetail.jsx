import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const TYPE_LABELS = {
  ebook:'📚 eBook', template:'📐 Template', preset:'🎨 Preset',
  source_code:'💻 Source Code', prompt_ai:'🤖 AI Prompt', other:'📦 Khác',
};
const TYPE_COLORS = {
  ebook:'#6C5CE7', template:'#00b894', preset:'#fd79a8',
  source_code:'#fdcb6e', prompt_ai:'#74b9ff', other:'#b2bec3',
};
const THUMB_ICONS = { ebook:'📚', template:'📐', preset:'🎨', source_code:'💻', prompt_ai:'🤖', other:'📦' };

const S = {
  back:     { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#666', fontSize: 13, marginBottom: '1.5rem', cursor: 'pointer', textDecoration: 'none' },
  layout:   { display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' },
  left:     {},
  thumb:    { width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 14, marginBottom: 20 },
  thumbPh:  { width: '100%', height: 280, background: 'linear-gradient(135deg,#1a1a2e,#0e0e17)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, marginBottom: 20 },
  typeBadge:(t) => ({ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: TYPE_COLORS[t] + '22', color: TYPE_COLORS[t], letterSpacing: '.04em', marginBottom: 10 }),
  title:    { fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 12 },
  desc:     { fontSize: 14, color: '#888', lineHeight: 1.8, whiteSpace: 'pre-wrap' },
  right:    { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 14, padding: '1.5rem', position: 'sticky', top: 20 },
  price:    { fontSize: 32, fontWeight: 700, color: '#a29bfe', marginBottom: 6 },
  priceSub: { fontSize: 12, color: '#444', marginBottom: '1.5rem' },
  buyBtn:   { width: '100%', padding: '13px', background: 'linear-gradient(135deg,#6C5CE7,#a29bfe)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 },
  boughtBox: { background: '#0e2a1e', border: '1px solid #00b894', borderRadius: 10, padding: '14px', textAlign: 'center', marginBottom: 10 },
  dlBtn:    { display: 'block', width: '100%', padding: '12px', background: '#00b894', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', textAlign: 'center', marginTop: 10 },
  meta:     { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #1a1a28' },
  metaRow:  { display: 'flex', justifyContent: 'space-between', fontSize: 13 },
  metaLbl:  { color: '#555' },
  metaVal:  { color: '#ccc', fontWeight: 500 },
  creator:  { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: '1px solid #1a1a28', marginTop: 8 },
  avatar:   { width: 36, height: 36, borderRadius: '50%', background: '#6C5CE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#fff', flexShrink: 0 },
  creatorName: { fontSize: 14, fontWeight: 600, color: '#ddd' },
  creatorSub:  { fontSize: 12, color: '#555' },
  err:      { color: '#ff6b6b', fontSize: 13, padding: '10px', background: '#2a0e0e', borderRadius: 8, marginBottom: 10 },
  success:  { color: '#00b894', fontSize: 13, padding: '10px', background: '#0e2a1e', borderRadius: 8, marginBottom: 10 },
  modal:    { position: 'fixed', inset: 0, background: '#000b', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBox: { background: '#13131f', border: '1px solid #2e2e44', borderRadius: 16, padding: '2rem', maxWidth: 420, width: '90%' },
  modalH:   { fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 },
  modalSub: { fontSize: 13, color: '#666', marginBottom: '1.5rem', lineHeight: 1.6 },
  modalRow: { display: 'flex', gap: 10 },
  confirmBtn: { flex: 1, padding: '11px', background: 'linear-gradient(135deg,#6C5CE7,#a29bfe)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn:  { flex: 1, padding: '11px', background: 'transparent', border: '1px solid #2e2e44', borderRadius: 8, color: '#888', fontSize: 14, cursor: 'pointer' },
};

export default function ProductDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { token, wallet, refreshWallet } = useAuth();

  const [product, setProduct]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [buying, setBuying]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [dlUrl, setDlUrl]       = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/creator-products/${id}/detail`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Không tìm thấy sản phẩm');
        setProduct(d.product);
        if (d.product.already_bought && d.product.download_url) {
          setDlUrl(d.product.download_url);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  const handleBuy = async () => {
    setBuying(true);
    setError('');
    try {
      const r = await fetch(`/api/creator-products/${id}/buy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Mua thất bại');
      setSuccess(`Mua thành công! -${Number(product.price_mt).toLocaleString()} MT`);
      setProduct(p => ({ ...p, already_bought: true, sold_count: (p.sold_count || 0) + 1 }));
      if (d.download_url) setDlUrl(d.download_url);
      setShowModal(false);
      refreshWallet?.();
    } catch (e) {
      setError(e.message);
      setShowModal(false);
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#444' }}>
        Đang tải...
      </div>
    );
  }

  if (error && !product) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
        <div style={{ color: '#ff6b6b', fontSize: 16 }}>{error}</div>
        <button onClick={() => navigate('/marketplace')} style={{ marginTop: 16, padding: '8px 18px', background: '#6C5CE7', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
          ← Quay lại Marketplace
        </button>
      </div>
    );
  }

  const p = product;
  const canAfford = (wallet?.balance || 0) >= parseInt(p.price_mt);

  return (
    <div>
      <div style={S.back} onClick={() => navigate('/marketplace')}>← Quay lại Marketplace</div>

      <div style={S.layout}>
        <div style={S.left}>
          {p.thumbnail_url
            ? <img src={p.thumbnail_url} alt={p.title} style={S.thumb} />
            : <div style={S.thumbPh}>{THUMB_ICONS[p.type] || '📦'}</div>
          }
          <span style={S.typeBadge(p.type)}>{TYPE_LABELS[p.type]}</span>
          <div style={S.title}>{p.title}</div>
          {p.description && (
            <div style={S.desc}>{p.description}</div>
          )}
        </div>

        <div style={S.right}>
          <div style={S.price}>{Number(p.price_mt).toLocaleString()} MT</div>
          <div style={S.priceSub}>{p.sold_count || 0} người đã mua</div>

          {error  && <div style={S.err}>{error}</div>}
          {success && <div style={S.success}>{success}</div>}

          {p.already_bought ? (
            <div style={S.boughtBox}>
              <div style={{ color: '#00b894', fontWeight: 600, marginBottom: 4 }}>✓ Bạn đã sở hữu sản phẩm này</div>
              {dlUrl
                ? <a href={dlUrl} target="_blank" rel="noreferrer" style={S.dlBtn}>⬇ Tải xuống</a>
                : <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>Liên hệ creator để nhận file</div>
              }
            </div>
          ) : (
            <button
              style={{ ...S.buyBtn, opacity: buying ? .6 : 1 }}
              onClick={() => setShowModal(true)}
              disabled={buying}
            >
              {buying ? 'Đang xử lý...' : `🛒 Mua ngay — ${Number(p.price_mt).toLocaleString()} MT`}
            </button>
          )}

          <div style={S.meta}>
            <div style={S.metaRow}>
              <span style={S.metaLbl}>Loại sản phẩm</span>
              <span style={S.metaVal}>{TYPE_LABELS[p.type]}</span>
            </div>
            <div style={S.metaRow}>
              <span style={S.metaLbl}>Số dư của bạn</span>
              <span style={{ ...S.metaVal, color: canAfford || p.already_bought ? '#00b894' : '#ff6b6b' }}>
                {(wallet?.balance || 0).toLocaleString()} MT
              </span>
            </div>
            {!p.already_bought && !canAfford && (
              <div style={{ fontSize: 12, color: '#ff6b6b' }}>
                ⚠ Cần thêm {(parseInt(p.price_mt) - (wallet?.balance || 0)).toLocaleString()} MT
              </div>
            )}
          </div>

          <div style={S.creator}>
            <div style={S.avatar}>{p.creator_name?.[0]?.toUpperCase()}</div>
            <div>
              <div style={S.creatorName}>{p.creator_name}</div>
              <div style={S.creatorSub}>Creator</div>
            </div>
            <Link
              to={`/creator/${p.creator_id}`}
              style={{ marginLeft: 'auto', fontSize: 12, color: '#6C5CE7', textDecoration: 'none' }}
              onClick={e => e.stopPropagation()}
            >
              Xem trang →
            </Link>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={S.modal} onClick={() => setShowModal(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalH}>Xác nhận mua hàng</div>
            <div style={S.modalSub}>
              Bạn sẽ thanh toán <strong style={{ color: '#a29bfe' }}>{Number(p.price_mt).toLocaleString()} MT</strong> để mua:<br />
              <strong style={{ color: '#fff' }}>{p.title}</strong>
              <br /><br />
              Số dư sau: <strong style={{ color: canAfford ? '#00b894' : '#ff6b6b' }}>
                {((wallet?.balance || 0) - parseInt(p.price_mt)).toLocaleString()} MT
              </strong>
              {!canAfford && <div style={{ color: '#ff6b6b', marginTop: 8 }}>⚠ Số dư không đủ!</div>}
            </div>
            <div style={S.modalRow}>
              <button style={S.cancelBtn} onClick={() => setShowModal(false)}>Hủy</button>
              <button
                style={{ ...S.confirmBtn, opacity: !canAfford || buying ? .5 : 1 }}
                onClick={handleBuy}
                disabled={!canAfford || buying}
              >
                {buying ? 'Đang xử lý...' : 'Xác nhận mua'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
