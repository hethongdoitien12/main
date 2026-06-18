import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const s = {
  page: {
    background: '#0a0a0f',
    color: '#e8e6e0',
    minHeight: '100vh',
    fontFamily: "'Inter', sans-serif",
    overflowX: 'hidden',
  },

  // NAV
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 5%',
    height: 64,
    borderBottom: '1px solid #1e1e2e',
    position: 'sticky',
    top: 0,
    background: 'rgba(10,10,15,0.92)',
    backdropFilter: 'blur(12px)',
    zIndex: 100,
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: 10 },
  navLogoIcon: {
    width: 36, height: 36, background: 'linear-gradient(135deg,#7c6af7,#a78bfa)',
    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 800, color: '#fff',
  },
  navLogoText: { fontSize: 18, fontWeight: 700, color: '#fff' },
  navActions: { display: 'flex', gap: 12, alignItems: 'center' },
  btnOutline: {
    padding: '8px 18px', borderRadius: 8, border: '1px solid #3a3a5c',
    background: 'transparent', color: '#b8b4cc', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', transition: 'all .2s',
  },
  btnPrimary: {
    padding: '8px 20px', borderRadius: 8,
    background: 'linear-gradient(135deg,#7c6af7,#a78bfa)',
    color: '#fff', fontSize: 14, fontWeight: 600, border: 'none',
    cursor: 'pointer', transition: 'opacity .2s',
  },

  // HERO
  hero: {
    textAlign: 'center',
    padding: '100px 5% 80px',
    background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,106,247,.18) 0%, transparent 70%)',
  },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(124,106,247,.15)', border: '1px solid rgba(124,106,247,.3)',
    borderRadius: 20, padding: '5px 14px', fontSize: 13, color: '#a78bfa',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 'clamp(36px,7vw,72px)', fontWeight: 800, lineHeight: 1.1,
    background: 'linear-gradient(135deg,#fff 40%,#a78bfa)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    marginBottom: 20,
  },
  heroSub: {
    fontSize: 'clamp(16px,2.5vw,20px)', color: '#8b8aaa', maxWidth: 560,
    margin: '0 auto 40px', lineHeight: 1.6,
  },
  heroButtons: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' },
  heroBtnPrimary: {
    padding: '14px 32px', borderRadius: 10,
    background: 'linear-gradient(135deg,#7c6af7,#a78bfa)',
    color: '#fff', fontSize: 16, fontWeight: 700, border: 'none',
    cursor: 'pointer', transition: 'transform .2s,opacity .2s',
  },
  heroBtnSecondary: {
    padding: '14px 32px', borderRadius: 10,
    border: '1px solid #3a3a5c', background: 'transparent',
    color: '#b8b4cc', fontSize: 16, fontWeight: 600,
    cursor: 'pointer', transition: 'border-color .2s,color .2s',
  },

  // SECTION
  section: { padding: '80px 5%', maxWidth: 1200, margin: '0 auto' },
  sectionTitle: {
    fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800, textAlign: 'center',
    marginBottom: 12, color: '#fff',
  },
  sectionSub: {
    textAlign: 'center', color: '#8b8aaa', fontSize: 16,
    marginBottom: 48, maxWidth: 500, margin: '0 auto 48px',
  },

  // STATS
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 24, marginTop: 48,
  },
  statCard: {
    background: 'linear-gradient(135deg,rgba(124,106,247,.1),rgba(167,139,250,.05))',
    border: '1px solid rgba(124,106,247,.2)', borderRadius: 16,
    padding: '32px 24px', textAlign: 'center',
  },
  statNum: {
    fontSize: 'clamp(28px,5vw,40px)', fontWeight: 800,
    background: 'linear-gradient(135deg,#7c6af7,#a78bfa)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    lineHeight: 1.1, marginBottom: 8,
  },
  statLabel: { fontSize: 14, color: '#8b8aaa', fontWeight: 500 },

  // CREATORS
  creatorsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 20, marginTop: 48,
  },
  creatorCard: {
    background: '#111118', border: '1px solid #1e1e2e',
    borderRadius: 16, padding: 24, textAlign: 'center',
    transition: 'border-color .2s,transform .2s', cursor: 'pointer',
  },
  creatorAvatar: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'linear-gradient(135deg,#7c6af7,#a78bfa)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, fontWeight: 700, color: '#fff',
    margin: '0 auto 12px', objectFit: 'cover',
  },
  creatorName: { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 },
  creatorBadges: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 },
  badge: {
    fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
  },
  verifiedBadge: { background: 'rgba(52,211,153,.15)', color: '#34d399', border: '1px solid rgba(52,211,153,.3)' },
  featuredBadge: { background: 'rgba(251,191,36,.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,.3)' },
  creatorTips: { fontSize: 13, color: '#8b8aaa', marginBottom: 16 },
  creatorTipsNum: { color: '#a78bfa', fontWeight: 700 },
  viewBtn: {
    width: '100%', padding: '8px 0', borderRadius: 8,
    background: 'rgba(124,106,247,.15)', border: '1px solid rgba(124,106,247,.3)',
    color: '#a78bfa', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', transition: 'background .2s',
  },

  // PRODUCTS
  productsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 24, marginTop: 48,
  },
  productCard: {
    background: '#111118', border: '1px solid #1e1e2e',
    borderRadius: 16, overflow: 'hidden',
    transition: 'border-color .2s,transform .2s', cursor: 'pointer',
  },
  productThumb: {
    width: '100%', height: 160, objectFit: 'cover',
    background: 'linear-gradient(135deg,#1a1a2e,#2a1a4e)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 40,
  },
  productBody: { padding: 20 },
  productTitle: { fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 },
  productCreator: { fontSize: 13, color: '#8b8aaa', marginBottom: 12 },
  productFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  productPrice: { fontSize: 16, fontWeight: 800, color: '#a78bfa' },
  productBtn: {
    padding: '6px 14px', borderRadius: 8,
    background: 'rgba(124,106,247,.15)', border: '1px solid rgba(124,106,247,.3)',
    color: '#a78bfa', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'background .2s',
  },

  // HOW IT WORKS
  howGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 24, marginTop: 48, position: 'relative',
  },
  howCard: {
    background: '#111118', border: '1px solid #1e1e2e',
    borderRadius: 16, padding: '28px 24px', textAlign: 'center',
  },
  howStep: {
    width: 44, height: 44, borderRadius: '50%',
    background: 'linear-gradient(135deg,#7c6af7,#a78bfa)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 800, color: '#fff',
    margin: '0 auto 16px',
  },
  howTitle: { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 },
  howDesc: { fontSize: 14, color: '#8b8aaa', lineHeight: 1.5 },

  // BENEFITS
  benefitsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: 24, marginTop: 48,
  },
  benefitCard: {
    background: '#111118', border: '1px solid #1e1e2e', borderRadius: 16, padding: 32,
  },
  benefitTitle: {
    fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 20,
    display: 'flex', alignItems: 'center', gap: 10,
  },
  benefitItem: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    marginBottom: 14, fontSize: 14, color: '#b8b4cc', lineHeight: 1.5,
  },
  checkIcon: { color: '#7c6af7', fontSize: 16, marginTop: 1, flexShrink: 0 },

  // CTA
  cta: {
    background: 'linear-gradient(135deg,rgba(124,106,247,.15),rgba(167,139,250,.08))',
    border: '1px solid rgba(124,106,247,.2)',
    borderRadius: 24, padding: '64px 32px', textAlign: 'center',
    margin: '0 5% 80px',
  },
  ctaTitle: {
    fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800,
    background: 'linear-gradient(135deg,#fff,#a78bfa)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    marginBottom: 16,
  },
  ctaSub: { color: '#8b8aaa', fontSize: 16, marginBottom: 32 },
  ctaButtons: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' },

  // FOOTER
  footer: {
    borderTop: '1px solid #1e1e2e',
    padding: '32px 5%', textAlign: 'center',
    color: '#555', fontSize: 13,
  },
};

const typeEmoji = { ebook: '📚', template: '🎨', preset: '⚙️', source_code: '💻', prompt_ai: '🤖', other: '📦' };

function formatNum(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [creators, setCreators] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/public/stats').then(r => r.json()).then(setStats).catch(() => {});
    fetch('/api/public/creators?featured=true&limit=8').then(r => r.json()).then(d => setCreators(d.creators || [])).catch(() => {});
    fetch('/api/public/products?limit=6').then(r => r.json()).then(d => setProducts(d.products || [])).catch(() => {});

    document.title = 'MT Economy';
    const meta = document.querySelector('meta[name="description"]') || document.createElement('meta');
    meta.name = 'description';
    meta.content = 'MT Economy — Nền tảng Creator Economy giúp creator kiếm tiền từ Tip, Fan Club và Marketplace.';
    if (!document.querySelector('meta[name="description"]')) document.head.appendChild(meta);
  }, []);

  return (
    <div style={s.page}>
      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navLogo}>
          <div style={s.navLogoIcon}>MT</div>
          <span style={s.navLogoText}>MT Economy</span>
        </div>
        <div style={s.navActions}>
          <button style={s.btnOutline} onClick={() => navigate('/login')}
            onMouseEnter={e => { e.target.style.borderColor='#7c6af7'; e.target.style.color='#a78bfa'; }}
            onMouseLeave={e => { e.target.style.borderColor='#3a3a5c'; e.target.style.color='#b8b4cc'; }}>
            Đăng nhập
          </button>
          <button style={s.btnPrimary} onClick={() => navigate('/register')}
            onMouseEnter={e => e.target.style.opacity='.85'}
            onMouseLeave={e => e.target.style.opacity='1'}>
            Đăng ký
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={s.hero}>
        <div style={s.heroBadge}>✨ Nền tảng Creator Economy mới tại Việt Nam</div>
        <h1 style={s.heroTitle}>MT Economy<br />Nền tảng Creator Economy<br />sử dụng MT</h1>
        <p style={s.heroSub}>
          Hỗ trợ creator kiếm tiền từ cộng đồng<br />
          thông qua Tip, Fan Club và Marketplace.
        </p>
        <div style={s.heroButtons}>
          <button style={s.heroBtnPrimary} onClick={() => navigate('/register')}
            onMouseEnter={e => e.target.style.opacity='.85'}
            onMouseLeave={e => e.target.style.opacity='1'}>
            Đăng ký ngay
          </button>
          <button style={s.heroBtnSecondary} onClick={() => document.getElementById('creators-section')?.scrollIntoView({ behavior:'smooth' })}
            onMouseEnter={e => { e.target.style.borderColor='#7c6af7'; e.target.style.color='#a78bfa'; }}
            onMouseLeave={e => { e.target.style.borderColor='#3a3a5c'; e.target.style.color='#b8b4cc'; }}>
            Khám phá Creator
          </button>
        </div>
      </section>

      {/* STATS */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 5%' }}>
        <div style={s.statsGrid}>
          {[
            { label: 'Người dùng', value: stats?.total_users, icon: '👥' },
            { label: 'Creator', value: stats?.total_creators, icon: '🎨' },
            { label: 'Lượt Tip', value: stats?.total_tips, icon: '💝' },
            { label: 'Giao dịch', value: stats?.total_transactions, icon: '📊' },
          ].map(({ label, value, icon }) => (
            <div key={label} style={s.statCard}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
              <div style={s.statNum}>{value !== undefined ? formatNum(value) : '—'}</div>
              <div style={s.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TOP CREATORS */}
      <div id="creators-section" style={s.section}>
        <h2 style={s.sectionTitle}>Top Creator</h2>
        <p style={s.sectionSub}>Những creator nổi bật đang xây dựng cộng đồng trên MT Economy</p>
        {creators.length === 0 ? (
          <div style={{ textAlign:'center', color:'#555', padding:'60px 0' }}>
            Chưa có creator nào. Hãy là người đầu tiên! 🚀
          </div>
        ) : (
          <div style={s.creatorsGrid}>
            {creators.map(c => (
              <div key={c.id} style={s.creatorCard}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(124,106,247,.5)'; e.currentTarget.style.transform='translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#1e1e2e'; e.currentTarget.style.transform='none'; }}>
                {c.avatar_url
                  ? <img src={c.avatar_url} alt={c.username} style={{ ...s.creatorAvatar, background:'#1e1e2e' }} />
                  : <div style={s.creatorAvatar}>{c.username?.[0]?.toUpperCase() || '?'}</div>
                }
                <div style={s.creatorName}>{c.username}</div>
                <div style={s.creatorBadges}>
                  {c.creator_verified && <span style={{ ...s.badge, ...s.verifiedBadge }}>✓ Verified</span>}
                  {c.creator_featured && <span style={{ ...s.badge, ...s.featuredBadge }}>⭐ Featured</span>}
                </div>
                <div style={s.creatorTips}>
                  Nhận <span style={s.creatorTipsNum}>{formatNum(c.total_tips_received)} MT</span> từ {c.supporter_count || 0} fan
                </div>
                <button style={s.viewBtn} onClick={() => navigate('/login')}
                  onMouseEnter={e => e.target.style.background='rgba(124,106,247,.25)'}
                  onMouseLeave={e => e.target.style.background='rgba(124,106,247,.15)'}>
                  Xem hồ sơ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOP PRODUCTS */}
      <div style={{ ...s.section, background: 'rgba(124,106,247,.03)', borderRadius: 0, maxWidth: '100%', padding: '80px 5%' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={s.sectionTitle}>Marketplace</h2>
          <p style={s.sectionSub}>Sản phẩm số từ các creator tài năng</p>
          {products.length === 0 ? (
            <div style={{ textAlign:'center', color:'#555', padding:'60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🛍️</div>
              <p>Marketplace đang được xây dựng. Quay lại sớm nhé!</p>
            </div>
          ) : (
            <div style={s.productsGrid}>
              {products.map(p => (
                <div key={p.id} style={s.productCard} onClick={() => navigate('/login')}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(124,106,247,.4)'; e.currentTarget.style.transform='translateY(-4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#1e1e2e'; e.currentTarget.style.transform='none'; }}>
                  {p.thumbnail_url
                    ? <img src={p.thumbnail_url} alt={p.title} style={{ width:'100%', height:160, objectFit:'cover' }} />
                    : <div style={s.productThumb}>{typeEmoji[p.type] || '📦'}</div>
                  }
                  <div style={s.productBody}>
                    <div style={s.productTitle}>{p.title}</div>
                    <div style={s.productCreator}>bởi {p.creator_name}</div>
                    <div style={s.productFooter}>
                      <div style={s.productPrice}>{formatNum(p.price_mt)} MT</div>
                      <button style={s.productBtn}
                        onMouseEnter={e => e.target.style.background='rgba(124,106,247,.3)'}
                        onMouseLeave={e => e.target.style.background='rgba(124,106,247,.15)'}>
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Cách hoạt động</h2>
        <p style={s.sectionSub}>Bắt đầu chỉ trong vài bước đơn giản</p>
        <div style={s.howGrid}>
          {[
            { step: 1, title: 'Đăng ký tài khoản', desc: 'Tạo tài khoản miễn phí và nhận MT chào mừng ngay lập tức.' },
            { step: 2, title: 'Nhận hoặc nạp MT', desc: 'Hoàn thành quest, nhận phần thưởng hàng ngày hoặc nạp MT từ ví.' },
            { step: 3, title: 'Tip Creator hoặc mua sản phẩm', desc: 'Ủng hộ creator yêu thích hoặc khám phá sản phẩm số trên Marketplace.' },
            { step: 4, title: 'Creator nhận thu nhập', desc: 'Creator nhận MT trực tiếp và có thể rút về tài khoản ngân hàng.' },
          ].map(({ step, title, desc }) => (
            <div key={step} style={s.howCard}>
              <div style={s.howStep}>{step}</div>
              <div style={s.howTitle}>{title}</div>
              <div style={s.howDesc}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BENEFITS */}
      <div style={{ ...s.section, paddingTop: 0 }}>
        <h2 style={s.sectionTitle}>Lợi ích</h2>
        <p style={s.sectionSub}>MT Economy mang lại giá trị cho cả user lẫn creator</p>
        <div style={s.benefitsGrid}>
          <div style={s.benefitCard}>
            <div style={s.benefitTitle}><span>👤</span> Cho User</div>
            {[
              'Hỗ trợ creator yêu thích trực tiếp qua Tip',
              'Mua sản phẩm số chất lượng cao',
              'Tham gia Fan Club và nhận đặc quyền độc quyền',
              'Kiếm MT qua quest và check-in hàng ngày',
              'Xếp hạng fan trung thành trên Leaderboard',
            ].map(item => (
              <div key={item} style={s.benefitItem}>
                <span style={s.checkIcon}>✦</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div style={s.benefitCard}>
            <div style={s.benefitTitle}><span>🎨</span> Cho Creator</div>
            {[
              'Nhận MT trực tiếp từ fan qua Tip',
              'Bán sản phẩm số trên Marketplace',
              'Xây dựng Fan Club với các gói tier',
              'Xem thống kê doanh thu chi tiết',
              'Rút tiền về tài khoản ngân hàng dễ dàng',
            ].map(item => (
              <div key={item} style={s.benefitItem}>
                <span style={s.checkIcon}>✦</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={s.cta}>
        <div style={s.ctaTitle}>Bắt đầu kiếm và sử dụng MT<br />ngay hôm nay</div>
        <p style={s.ctaSub}>Tham gia cộng đồng creator economy đang phát triển nhanh nhất Việt Nam</p>
        <div style={s.ctaButtons}>
          <button style={s.heroBtnPrimary} onClick={() => navigate('/register')}
            onMouseEnter={e => e.target.style.opacity='.85'}
            onMouseLeave={e => e.target.style.opacity='1'}>
            Tạo tài khoản
          </button>
          <button style={s.heroBtnSecondary} onClick={() => document.getElementById('creators-section')?.scrollIntoView({ behavior:'smooth' })}
            onMouseEnter={e => { e.target.style.borderColor='#7c6af7'; e.target.style.color='#a78bfa'; }}
            onMouseLeave={e => { e.target.style.borderColor='#3a3a5c'; e.target.style.color='#b8b4cc'; }}>
            Khám phá Creator
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color:'#a78bfa', fontWeight:700 }}>MT Economy</span>
          {' '}— Nền tảng Creator Economy nội bộ
        </div>
        <div>© {new Date().getFullYear()} MT Economy. All rights reserved.</div>
      </footer>
    </div>
  );
}
