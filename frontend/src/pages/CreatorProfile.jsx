import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const S = {
  back:    { fontSize: 13, color: '#666', cursor: 'pointer', marginBottom: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: 6 },
  hero:    { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 16, padding: '2rem', marginBottom: 20 },
  avatar:  {
    width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#6C5CE7,#a29bfe)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  username: { fontSize: 22, fontWeight: 700, color: '#fff' },
  bio:     { fontSize: 14, color: '#888', lineHeight: 1.6, marginTop: 6, maxWidth: 500 },
  statRow: { display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' },
  statBox: { display: 'flex', flexDirection: 'column', gap: 2 },
  statLbl: { fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '.05em' },
  statVal: (color = '#a29bfe') => ({ fontSize: 20, fontWeight: 700, color }),
  giftBtn: {
    padding: '10px 24px', background: 'linear-gradient(135deg,#6C5CE7,#a29bfe)',
    border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: '#aaa', marginBottom: '1rem' },
  card:  { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 14, padding: '1.5rem', marginBottom: 16 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  noData: { color: '#333', fontSize: 13, textAlign: 'center', padding: '1.5rem 0' },

  fanRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #111' },
  fanAvatar: {
    width: 36, height: 36, borderRadius: '50%', background: '#1e1e2e',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#888', flexShrink: 0,
  },
  giftRow: { display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #111', alignItems: 'flex-start' },
  giftAvatar: {
    width: 30, height: 30, borderRadius: '50%', background: '#1e1e2e',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#888', flexShrink: 0,
  },

  tierCard: (level) => ({
    border: `1px solid ${level === 3 ? '#fdcb6e50' : level === 2 ? '#b2bec350' : '#cd7f3250'}`,
    background: level === 3 ? '#fdcb6e08' : level === 2 ? '#b2bec308' : '#cd7f3208',
    borderRadius: 12, padding: '1.25rem', flex: 1,
  }),
  tierName: (level) => ({
    fontSize: 16, fontWeight: 700,
    color: level === 3 ? '#fdcb6e' : level === 2 ? '#b2bec3' : '#cd7f32',
  }),
  joinBtn: (level, isMine) => ({
    width: '100%', marginTop: 12, padding: '8px 0',
    background: isMine ? '#1a1a28' : level === 3 ? '#fdcb6e' : level === 2 ? '#b2bec3' : '#cd7f32',
    color: isMine ? '#888' : '#0a0a0f', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: isMine ? 'default' : 'pointer',
  }),

  productCard: {
    background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 12,
    padding: '1rem', display: 'flex', flexDirection: 'column', gap: 8,
  },
  typeTag: (type) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
    background: '#6C5CE720', color: '#a29bfe',
  }),
  buyBtn: {
    padding: '7px 14px', background: '#6C5CE7', border: 'none',
    borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
};

const TYPE_LABELS = {
  ebook: '📖 Ebook', template: '📐 Template', preset: '🎨 Preset',
  source_code: '💻 Source Code', prompt_ai: '🤖 Prompt AI', other: '📦 Khác',
};
const TIER_ICONS = { 1: '🥉', 2: '🥈', 3: '🥇' };

export default function CreatorProfile() {
  const { id } = useParams();
  const { token, user, wallet, refreshWallet } = useAuth();
  const navigate = useNavigate();

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [joining,    setJoining]    = useState(null);
  const [buying,     setBuying]     = useState(null);
  const [toast,      setToast]      = useState(null);
  const [tab,        setTab]        = useState('overview');
  const [joinModal,  setJoinModal]  = useState(null);  // tier being joined
  const [autoRenew,  setAutoRenew]  = useState(false);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    try {
      const r = await fetch(`/api/creators/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
    } catch (e) {
      showToast(e.message, false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token && id) load(); }, [token, id]);

  const openJoinModal = (tier) => {
    setAutoRenew(false);
    setJoinModal(tier);
  };

  const joinTier = async () => {
    if (!joinModal || joining) return;
    const tierId = joinModal.id;
    setJoining(tierId);
    try {
      const r = await fetch(`/api/fanclub/join/${tierId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_renew: autoRenew }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      showToast(`🎉 Đã tham gia Fan Club ${d.tier_name}!${autoRenew ? ' (Tự động gia hạn bật)' : ''}`);
      setJoinModal(null);
      refreshWallet && refreshWallet();
      load();
    } catch (e) {
      showToast(e.message, false);
    } finally {
      setJoining(null);
    }
  };

  const buyProduct = async (productId) => {
    if (buying) return;
    setBuying(productId);
    try {
      const r = await fetch(`/api/creator-products/${productId}/buy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      showToast('✅ Mua thành công! Tải xuống tại lịch sử mua.');
      refreshWallet && refreshWallet();
      load();
    } catch (e) {
      showToast(e.message, false);
    } finally {
      setBuying(null);
    }
  };

  if (loading) return <div style={{ color: '#555', padding: '2rem' }}>Đang tải...</div>;
  if (!data) return <div style={{ color: '#ff6b6b', padding: '2rem' }}>Không tìm thấy creator</div>;

  const { creator, topFans, recentGifts, fanClubTiers, myMembership, products } = data;
  const isOwnProfile = user?.id === creator.id;

  // Join modal
  const JoinModal = joinModal ? (() => {
    const level = joinModal.level;
    const tc = { 1: '#cd7f32', 2: '#b2bec3', 3: '#fdcb6e' };
    const canAfford = (wallet?.balance || 0) >= joinModal.price_mt;
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => setJoinModal(null)}>
        <div style={{ background: '#13131f', border: '1px solid #2a2a3a', borderRadius: 16, padding: '2rem', maxWidth: 420, width: '90%' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Tham gia Fan Club
          </div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
            {creator.username} · <span style={{ color: tc[level] || '#a29bfe' }}>{joinModal.name}</span>
          </div>

          <div style={{ background: '#0e0e17', borderRadius: 10, padding: '1rem', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Chi phí / tháng</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{Number(joinModal.price_mt).toLocaleString()} <span style={{ fontSize: 13, color: '#888' }}>MT</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Số dư hiện tại</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: canAfford ? '#6fcf97' : '#ff6b6b' }}>{Number(wallet?.balance || 0).toLocaleString()} MT</div>
            </div>
          </div>

          {!canAfford && (
            <div style={{ background: '#ff6b6b15', border: '1px solid #ff6b6b30', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff6b6b', marginBottom: 16 }}>
              ⚠️ Số dư không đủ. Bạn cần thêm {(joinModal.price_mt - (wallet?.balance || 0)).toLocaleString()} MT.
            </div>
          )}

          <div style={{ background: '#0e0e17', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={e => setAutoRenew(e.target.checked)}
                style={{ marginTop: 2, accentColor: '#6C5CE7', width: 16, height: 16, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#ddd' }}>🔄 Tự động gia hạn</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2, lineHeight: 1.5 }}>
                  Hệ thống sẽ tự trừ {Number(joinModal.price_mt).toLocaleString()} MT và gia hạn trước khi hết hạn. Bạn có thể tắt bất cứ lúc nào.
                </div>
              </div>
            </label>
          </div>

          <div style={{ fontSize: 12, color: '#444', marginBottom: 16 }}>
            Platform thu 10% phí · Creator nhận {Number(joinModal.price_mt - Math.floor(joinModal.price_mt * 0.1)).toLocaleString()} MT
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={joinTier}
              disabled={!canAfford || joining === joinModal.id}
              style={{
                flex: 1, padding: '11px 0', border: 'none', borderRadius: 10,
                background: canAfford ? (level === 3 ? '#fdcb6e' : level === 2 ? '#b2bec3' : '#cd7f32') : '#1a1a28',
                color: canAfford ? '#0a0a0f' : '#555',
                fontSize: 14, fontWeight: 700, cursor: canAfford ? 'pointer' : 'not-allowed',
                opacity: joining === joinModal.id ? 0.6 : 1,
              }}
            >
              {joining === joinModal.id ? 'Đang xử lý...' : `Tham gia — ${Number(joinModal.price_mt).toLocaleString()} MT`}
            </button>
            <button
              onClick={() => setJoinModal(null)}
              style={{ padding: '11px 18px', border: '1px solid #2a2a3a', borderRadius: 10, background: 'none', color: '#888', fontSize: 14, cursor: 'pointer' }}
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    );
  })() : null;

  const TABS = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'fanclub',  label: `Fan Club (${fanClubTiers.length})` },
    { key: 'products', label: `Sản phẩm (${products.length})` },
    { key: 'topfans',  label: `Top Fans` },
  ];

  return (
    <div>
      {JoinModal}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? '#00b89440' : '#ff6b6b40',
          border: `1px solid ${toast.ok ? '#00b894' : '#ff6b6b'}`,
          color: toast.ok ? '#00b894' : '#ff6b6b',
          padding: '12px 20px', borderRadius: 10, fontSize: 14,
        }}>
          {toast.msg}
        </div>
      )}

      <div style={S.back} onClick={() => navigate('/creators')}>← Quay lại Creators</div>

      {/* Hero card */}
      <div style={S.hero}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div>
            {creator.avatar_url
              ? <img src={creator.avatar_url} alt={creator.username} style={{ ...S.avatar, objectFit: 'cover' }} />
              : <div style={S.avatar}>{creator.username[0].toUpperCase()}</div>
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={S.username}>{creator.username}</div>
              {creator.creator_verified && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: '#00b89420', border: '1px solid #00b89450', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#00b894' }}>
                  ✔ Verified Creator
                </span>
              )}
              {creator.creator_featured && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: '#fdcb6e20', border: '1px solid #fdcb6e50', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fdcb6e' }}>
                  ⭐ Featured Creator
                </span>
              )}
            </div>
            {creator.bio && <div style={S.bio}>{creator.bio}</div>}
            <div style={S.statRow}>
              <div style={S.statBox}>
                <span style={S.statLbl}>MT nhận</span>
                <span style={S.statVal('#6fcf97')}>{Number(creator.total_tips_received).toLocaleString()}</span>
              </div>
              <div style={S.statBox}>
                <span style={S.statLbl}>Lượt tip</span>
                <span style={S.statVal('#74b9ff')}>{Number(creator.total_tip_count).toLocaleString()}</span>
              </div>
              <div style={S.statBox}>
                <span style={S.statLbl}>Fans</span>
                <span style={S.statVal('#fd79a8')}>{Number(creator.supporter_count).toLocaleString()}</span>
              </div>
              <div style={S.statBox}>
                <span style={S.statLbl}>Tham gia</span>
                <span style={S.statVal('#ddd')}>{new Date(creator.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short' })}</span>
              </div>
            </div>
          </div>
          {!isOwnProfile && (
            <button style={S.giftBtn} onClick={() => navigate('/gifting', { state: { creator } })}>
              🎁 Tặng quà ngay
            </button>
          )}
        </div>

        {myMembership && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#6C5CE720', borderRadius: 8, fontSize: 13, color: '#a29bfe', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            ✨ Bạn đang là thành viên <strong>{myMembership.tier_name}</strong> — hết hạn {new Date(myMembership.expires_at).toLocaleDateString('vi-VN')}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #1e1e2e', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600,
            color: tab === t.key ? '#a29bfe' : '#555',
            borderBottom: `2px solid ${tab === t.key ? '#6C5CE7' : 'transparent'}`,
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab: Tổng quan */}
      {tab === 'overview' && (
        <div style={S.grid2}>
          <div style={S.card}>
            <div style={S.sectionTitle}>🎁 Quà tặng gần đây</div>
            {recentGifts.length === 0 ? <div style={S.noData}>Chưa có quà nào</div> : recentGifts.map((g, i) => (
              <div key={i} style={S.giftRow}>
                <div style={S.giftAvatar}>
                  {g.sender_avatar
                    ? <img src={g.sender_avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : g.sender_name?.[0]?.toUpperCase()
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#ddd', fontWeight: 600 }}>
                    {g.sender_name} <span style={{ color: '#a29bfe', fontSize: 13 }}>+{Number(g.amount_xu).toLocaleString()} MT</span>
                  </div>
                  {g.message && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{g.message}</div>}
                  <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{new Date(g.created_at).toLocaleString('vi-VN')}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={S.card}>
            <div style={S.sectionTitle}>🏆 Top Fans</div>
            {topFans.length === 0 ? <div style={S.noData}>Chưa có fan nào</div> : topFans.map((f, i) => (
              <div key={f.id} style={S.fanRow}>
                <div style={{ fontSize: 14, color: i < 3 ? '#fdcb6e' : '#555', width: 22, textAlign: 'center' }}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}`}
                </div>
                <div style={S.fanAvatar}>
                  {f.avatar_url
                    ? <img src={f.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : f.username[0].toUpperCase()
                  }
                </div>
                <div style={{ flex: 1, fontSize: 13, color: '#ddd' }}>{f.username}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#a29bfe' }}>{Number(f.total_tipped).toLocaleString()} MT</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Fan Club */}
      {tab === 'fanclub' && (
        <div>
          {fanClubTiers.length === 0 ? (
            <div style={S.noData}>Creator này chưa thiết lập Fan Club</div>
          ) : (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
              {fanClubTiers.map(tier => {
                const isMine = myMembership?.tier_name === tier.name;
                return (
                  <div key={tier.id} style={{ ...S.tierCard(tier.level), minWidth: 200, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>{TIER_ICONS[tier.level]}</span>
                      <span style={{ fontSize: 11, color: '#555' }}>{tier.member_count} thành viên</span>
                    </div>
                    <div style={S.tierName(tier.level)}>{tier.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '8px 0' }}>
                      {Number(tier.price_mt).toLocaleString()} <span style={{ fontSize: 13, color: '#888' }}>MT / tháng</span>
                    </div>
                    {tier.description && <div style={{ fontSize: 13, color: '#777', marginBottom: 8 }}>{tier.description}</div>}
                    {tier.perks?.length > 0 && (
                      <ul style={{ paddingLeft: 16, color: '#888', fontSize: 12, lineHeight: 1.8 }}>
                        {tier.perks.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    )}
                    {!isOwnProfile && (
                      <button
                        style={S.joinBtn(tier.level, isMine)}
                        disabled={isMine}
                        onClick={() => !isMine && openJoinModal(tier)}
                      >
                        {isMine ? '✓ Đang tham gia' : 'Tham gia ngay'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ fontSize: 12, color: '#444' }}>
            💡 Platform thu 10% phí hoa hồng. Creator nhận 90% số MT bạn đăng ký.
          </div>
        </div>
      )}

      {/* Tab: Sản phẩm */}
      {tab === 'products' && (
        <div>
          {products.length === 0 ? (
            <div style={S.noData}>Creator này chưa có sản phẩm nào</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {products.map(p => (
                <div key={p.id} style={S.productCard}>
                  {p.thumbnail_url && (
                    <img src={p.thumbnail_url} alt={p.title}
                      style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                  )}
                  <div style={S.typeTag(p.type)}>{TYPE_LABELS[p.type] || p.type}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{p.title}</div>
                  {p.description && <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{p.description}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#a29bfe' }}>{Number(p.price_mt).toLocaleString()} MT</span>
                    <span style={{ fontSize: 11, color: '#444' }}>{p.sold_count} đã mua</span>
                  </div>
                  {!isOwnProfile && (
                    <button
                      style={{ ...S.buyBtn, opacity: buying === p.id ? 0.6 : 1 }}
                      disabled={buying === p.id}
                      onClick={() => buyProduct(p.id)}
                    >
                      {buying === p.id ? 'Đang mua...' : '🛍 Mua ngay'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Top Fans leaderboard */}
      {tab === 'topfans' && (
        <div style={S.card}>
          <div style={S.sectionTitle}>🏆 Bảng xếp hạng Top Fans</div>
          {topFans.length === 0 ? (
            <div style={S.noData}>Chưa có fan nào tip cho creator này</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 11, color: '#555', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #1a1a28', textTransform: 'uppercase' }}>#</th>
                  <th style={{ fontSize: 11, color: '#555', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #1a1a28', textTransform: 'uppercase' }}>Fan</th>
                  <th style={{ fontSize: 11, color: '#555', textAlign: 'right', padding: '8px 0', borderBottom: '1px solid #1a1a28', textTransform: 'uppercase' }}>Tổng MT tặng</th>
                  <th style={{ fontSize: 11, color: '#555', textAlign: 'right', padding: '8px 0', borderBottom: '1px solid #1a1a28', textTransform: 'uppercase' }}>Số lần</th>
                </tr>
              </thead>
              <tbody>
                {topFans.map((f, i) => (
                  <tr key={f.id}>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #111', fontSize: 15 }}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : <span style={{ color: '#555' }}>{i+1}</span>}
                    </td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #111' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ ...S.fanAvatar, width: 30, height: 30 }}>
                          {f.username[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, color: '#ddd' }}>{f.username}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #111', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#a29bfe' }}>
                      {Number(f.total_tipped).toLocaleString()} MT
                    </td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #111', textAlign: 'right', fontSize: 13, color: '#555' }}>
                      {f.tip_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
