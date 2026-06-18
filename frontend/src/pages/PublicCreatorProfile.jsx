import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TYPE_LABELS = {
  ebook: '📖 Ebook', template: '📐 Template', preset: '🎨 Preset',
  source_code: '💻 Source Code', prompt_ai: '🤖 Prompt AI', other: '📦 Khác',
};
const TIER_ICONS = { 1: '🥉', 2: '🥈', 3: '🥇' };
const TIER_COLORS = { 1: '#cd7f32', 2: '#b2bec3', 3: '#fdcb6e' };

function formatNum(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Number(n).toLocaleString();
}

const S = {
  page: { background: '#0a0a0f', color: '#e8e6e0', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 5%', height: 64, borderBottom: '1px solid #1e1e2e',
    position: 'sticky', top: 0, background: 'rgba(10,10,15,0.92)',
    backdropFilter: 'blur(12px)', zIndex: 100,
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  navLogoIcon: {
    width: 36, height: 36, background: 'linear-gradient(135deg,#7c6af7,#a78bfa)',
    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800, color: '#fff',
  },
  navLogoText: { fontSize: 18, fontWeight: 700, color: '#fff' },
  navActions: { display: 'flex', gap: 12 },
  btnOutline: {
    padding: '8px 18px', borderRadius: 8, border: '1px solid #3a3a5c',
    background: 'transparent', color: '#b8b4cc', fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  btnPrimary: {
    padding: '8px 20px', borderRadius: 8,
    background: 'linear-gradient(135deg,#7c6af7,#a78bfa)',
    color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
  },
  body: { maxWidth: 1100, margin: '0 auto', padding: '40px 5% 80px' },
  breadcrumb: { fontSize: 13, color: '#555', marginBottom: 20, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  hero: { background: '#111118', border: '1px solid #1e1e2e', borderRadius: 20, padding: '2rem', marginBottom: 24 },
  avatar: {
    width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg,#7c6af7,#a78bfa)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 34, fontWeight: 700, color: '#fff', flexShrink: 0, objectFit: 'cover',
  },
  username: { fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 4 },
  bio: { fontSize: 14, color: '#888', lineHeight: 1.6, maxWidth: 500, marginTop: 6 },
  statRow: { display: 'flex', gap: 28, marginTop: 16, flexWrap: 'wrap' },
  statBox: { display: 'flex', flexDirection: 'column', gap: 3 },
  statLbl: { fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '.05em' },
  statVal: (c = '#a78bfa') => ({ fontSize: 22, fontWeight: 800, color: c }),
  badge: { fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600 },
  tabs: { display: 'flex', gap: 4, borderBottom: '1px solid #1e1e2e', marginBottom: 24 },
  tab: (active) => ({
    padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, color: active ? '#a78bfa' : '#555',
    borderBottom: `2px solid ${active ? '#7c6af7' : 'transparent'}`,
    marginBottom: -1, transition: 'color .2s',
  }),
  card: { background: '#111118', border: '1px solid #1e1e2e', borderRadius: 14, padding: '1.5rem', marginBottom: 16 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '1rem' },
  noData: { color: '#333', fontSize: 13, textAlign: 'center', padding: '2rem 0' },
  loginPrompt: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    padding: '32px 24px', background: 'rgba(124,106,247,.06)',
    border: '1px solid rgba(124,106,247,.2)', borderRadius: 14, textAlign: 'center',
  },
  loginPromptText: { fontSize: 14, color: '#888', lineHeight: 1.5 },
  loginBtn: {
    padding: '10px 28px', borderRadius: 10,
    background: 'linear-gradient(135deg,#7c6af7,#a78bfa)',
    color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
  },
  giftRow: { display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #0e0e17', alignItems: 'flex-start' },
  giftAvatar: {
    width: 32, height: 32, borderRadius: '50%', background: '#1e1e2e',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#888', flexShrink: 0,
  },
  fanRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid #0e0e17' },
  fanAvatar: {
    width: 36, height: 36, borderRadius: '50%', background: '#1e1e2e',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#888', flexShrink: 0,
  },
  tierCard: (level) => ({
    border: `1px solid ${TIER_COLORS[level] || '#3a3a5c'}40`,
    background: `${TIER_COLORS[level] || '#3a3a5c'}08`,
    borderRadius: 14, padding: '1.25rem', flex: 1, minWidth: 200,
  }),
  productCard: {
    background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 12,
    padding: '1rem', display: 'flex', flexDirection: 'column', gap: 8,
  },
};

function LoginPrompt({ action, navigate }) {
  return (
    <div style={S.loginPrompt}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <div style={S.loginPromptText}>
        Đăng nhập để <strong style={{ color: '#a78bfa' }}>{action}</strong><br />
        và ủng hộ creator yêu thích của bạn
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button style={S.loginBtn} onClick={() => navigate('/register')}>Tạo tài khoản</button>
        <button style={{ ...S.loginBtn, background: 'transparent', border: '1px solid #3a3a5c', color: '#b8b4cc' }}
          onClick={() => navigate('/login')}>Đăng nhập</button>
      </div>
    </div>
  );
}

export default function PublicCreatorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState('overview');

  useEffect(() => {
    fetch(`/api/public/creators/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Không thể tải trang'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: '#555' }}>Đang tải...</div>
    </div>
  );

  if (error) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: '#ff6b6b' }}>{error}</div>
    </div>
  );

  const { creator, topFans, recentGifts, fanClubTiers, products } = data;

  const TABS = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'fanclub',  label: `Fan Club (${fanClubTiers.length})` },
    { key: 'products', label: `Sản phẩm (${products.length})` },
    { key: 'topfans',  label: 'Top Fans' },
  ];

  return (
    <div style={S.page}>
      {/* NAV */}
      <nav style={S.nav}>
        <div style={S.navLogo} onClick={() => navigate('/')}>
          <div style={S.navLogoIcon}>MT</div>
          <span style={S.navLogoText}>MT Economy</span>
        </div>
        <div style={S.navActions}>
          <button style={S.btnOutline} onClick={() => navigate('/login')}
            onMouseEnter={e => { e.target.style.borderColor='#7c6af7'; e.target.style.color='#a78bfa'; }}
            onMouseLeave={e => { e.target.style.borderColor='#3a3a5c'; e.target.style.color='#b8b4cc'; }}>
            Đăng nhập
          </button>
          <button style={S.btnPrimary} onClick={() => navigate('/register')}>Đăng ký</button>
        </div>
      </nav>

      <div style={S.body}>
        <div style={S.breadcrumb} onClick={() => navigate('/explore')}>← Quay lại Creator</div>

        {/* HERO */}
        <div style={S.hero}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <div>
              {creator.avatar_url
                ? <img src={creator.avatar_url} alt={creator.username} style={{ ...S.avatar, background: '#1e1e2e' }} />
                : <div style={S.avatar}>{creator.username?.[0]?.toUpperCase()}</div>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <div style={S.username}>{creator.username}</div>
                {creator.creator_verified && (
                  <span style={{ ...S.badge, background: 'rgba(52,211,153,.12)', color: '#34d399', border: '1px solid rgba(52,211,153,.25)' }}>
                    ✔ Verified Creator
                  </span>
                )}
                {creator.creator_featured && (
                  <span style={{ ...S.badge, background: 'rgba(251,191,36,.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,.25)' }}>
                    ⭐ Featured Creator
                  </span>
                )}
              </div>
              {creator.bio && <div style={S.bio}>{creator.bio}</div>}
              <div style={S.statRow}>
                <div style={S.statBox}>
                  <span style={S.statLbl}>MT nhận</span>
                  <span style={S.statVal('#6fcf97')}>{formatNum(creator.total_tips_received)}</span>
                </div>
                <div style={S.statBox}>
                  <span style={S.statLbl}>Lượt tip</span>
                  <span style={S.statVal('#74b9ff')}>{formatNum(creator.total_tip_count)}</span>
                </div>
                <div style={S.statBox}>
                  <span style={S.statLbl}>Fans</span>
                  <span style={S.statVal('#fd79a8')}>{formatNum(creator.supporter_count)}</span>
                </div>
                <div style={S.statBox}>
                  <span style={S.statLbl}>Tham gia</span>
                  <span style={S.statVal('#ddd')}>
                    {new Date(creator.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Gift CTA — requires login */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#7c6af7,#a78bfa)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => navigate('/register')}
              >
                🎁 Tặng quà ngay
              </button>
              <div style={{ fontSize: 11, color: '#444', textAlign: 'center' }}>Cần tài khoản để tặng quà</div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={S.tabs}>
          {TABS.map(t => (
            <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB: Tổng quan */}
        {tab === 'overview' && (
          <div style={S.grid2}>
            <div style={S.card}>
              <div style={S.sectionTitle}>🎁 Quà tặng gần đây</div>
              {recentGifts.length === 0
                ? <div style={S.noData}>Chưa có quà nào</div>
                : recentGifts.map((g, i) => (
                  <div key={i} style={S.giftRow}>
                    <div style={S.giftAvatar}>
                      {g.sender_avatar
                        ? <img src={g.sender_avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        : g.sender_name?.[0]?.toUpperCase()
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#ddd', fontWeight: 600 }}>
                        {g.sender_name} <span style={{ color: '#a78bfa' }}>+{formatNum(g.amount_xu)} MT</span>
                      </div>
                      {g.message && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{g.message}</div>}
                      <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>{new Date(g.created_at).toLocaleString('vi-VN')}</div>
                    </div>
                  </div>
                ))
              }
            </div>

            <div style={S.card}>
              <div style={S.sectionTitle}>🏆 Top Fans</div>
              {topFans.length === 0
                ? <div style={S.noData}>Chưa có fan nào</div>
                : topFans.map((f, i) => (
                  <div key={f.id} style={S.fanRow}>
                    <div style={{ width: 24, textAlign: 'center', fontSize: 14, color: i < 3 ? '#fdcb6e' : '#555' }}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                    </div>
                    <div style={S.fanAvatar}>
                      {f.avatar_url
                        ? <img src={f.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        : f.username?.[0]?.toUpperCase()
                      }
                    </div>
                    <div style={{ flex: 1, fontSize: 13, color: '#ddd' }}>{f.username}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>{formatNum(f.total_tipped)} MT</div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* TAB: Fan Club */}
        {tab === 'fanclub' && (
          <div>
            {fanClubTiers.length === 0 ? (
              <div style={S.noData}>Creator này chưa thiết lập Fan Club</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                  {fanClubTiers.map(tier => (
                    <div key={tier.id} style={S.tierCard(tier.level)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 22 }}>{TIER_ICONS[tier.level]}</span>
                        <span style={{ fontSize: 11, color: '#555' }}>{tier.member_count} thành viên</span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: TIER_COLORS[tier.level] || '#a78bfa' }}>{tier.name}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '8px 0' }}>
                        {formatNum(tier.price_mt)} <span style={{ fontSize: 13, color: '#888' }}>MT / tháng</span>
                      </div>
                      {tier.description && <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>{tier.description}</div>}
                      {tier.perks?.length > 0 && (
                        <ul style={{ paddingLeft: 16, color: '#777', fontSize: 12, lineHeight: 1.8, marginBottom: 12 }}>
                          {tier.perks.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
                <LoginPrompt action="tham gia Fan Club" navigate={navigate} />
              </>
            )}
          </div>
        )}

        {/* TAB: Sản phẩm */}
        {tab === 'products' && (
          <div>
            {products.length === 0 ? (
              <div style={S.noData}>Creator này chưa có sản phẩm nào</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
                  {products.map(p => (
                    <div key={p.id} style={S.productCard}>
                      {p.thumbnail_url && (
                        <img src={p.thumbnail_url} alt={p.title} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                      )}
                      <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#6C5CE720', color: '#a78bfa', display: 'inline-block' }}>
                        {TYPE_LABELS[p.type] || p.type}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{p.title}</div>
                      {p.description && <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{p.description}</div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#a78bfa' }}>{formatNum(p.price_mt)} MT</span>
                        <span style={{ fontSize: 11, color: '#333' }}>{p.sold_count} đã mua</span>
                      </div>
                    </div>
                  ))}
                </div>
                <LoginPrompt action="mua sản phẩm" navigate={navigate} />
              </>
            )}
          </div>
        )}

        {/* TAB: Top Fans */}
        {tab === 'topfans' && (
          <div style={S.card}>
            <div style={S.sectionTitle}>🏆 Bảng xếp hạng Top Fans</div>
            {topFans.length === 0 ? (
              <div style={S.noData}>Chưa có fan nào</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['#', 'Fan', 'Tổng MT tặng', 'Số lần'].map((h, i) => (
                      <th key={h} style={{ fontSize: 11, color: '#555', padding: '8px 0', borderBottom: '1px solid #1a1a28', textAlign: i > 1 ? 'right' : 'left', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topFans.map((f, i) => (
                    <tr key={f.id}>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #0e0e17', fontSize: 15, width: 32 }}>
                        {i < 3 ? ['🥇','🥈','🥉'][i] : <span style={{ color: '#555' }}>{i + 1}</span>}
                      </td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #0e0e17' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={S.fanAvatar}>
                            {f.avatar_url
                              ? <img src={f.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                              : f.username?.[0]?.toUpperCase()
                            }
                          </div>
                          <span style={{ fontSize: 13, color: '#ddd' }}>{f.username}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #0e0e17', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>
                        {formatNum(f.total_tipped)} MT
                      </td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #0e0e17', textAlign: 'right', fontSize: 13, color: '#555' }}>
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
    </div>
  );
}
