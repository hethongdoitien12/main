import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import NotificationBell from './NotificationBell.jsx';

const BREAKPOINT = 768;

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < BREAKPOINT);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

const S = {
  shell: { display: 'flex', minHeight: '100vh' },
  sidebar: (open, mobile) => ({
    width: 220,
    background: '#0e0e17',
    borderRight: '1px solid #1e1e2e',
    display: 'flex',
    flexDirection: 'column',
    padding: '0 0 1.5rem',
    flexShrink: 0,
    ...(mobile ? {
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200,
      transform: open ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform .25s ease',
      boxShadow: open ? '4px 0 24px rgba(0,0,0,.7)' : 'none',
    } : {}),
  }),
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
    zIndex: 199, backdropFilter: 'blur(2px)',
  },
  logo: {
    padding: '1.25rem 1.25rem .875rem', display: 'flex', alignItems: 'center', gap: 10,
    borderBottom: '1px solid #1a1a28',
  },
  logoIcon: {
    width: 34, height: 34, background: 'linear-gradient(135deg,#6C5CE7,#a29bfe)',
    borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 17, fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  logoText: { fontSize: 16, fontWeight: 700, color: '#fff' },
  nav: { padding: '.875rem .625rem', flex: 1, overflowY: 'auto' },
  navSection: {
    fontSize: 10, color: '#333', textTransform: 'uppercase',
    letterSpacing: '.08em', padding: '10px 10px 4px',
  },
  navItem: (active) => ({
    display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px',
    borderRadius: 8, marginBottom: 2, fontSize: 13, fontWeight: 500,
    color: active ? '#fff' : '#666',
    background: active ? '#1e1e2e' : 'transparent',
    border: active ? '1px solid #2e2e44' : '1px solid transparent',
    transition: 'all .15s', textDecoration: 'none',
  }),
  balanceBox: {
    margin: '0 .625rem 1rem', padding: '11px 13px', background: '#13131f',
    border: '1px solid #1e1e2e', borderRadius: 10,
  },
  balanceLbl: { fontSize: 10, color: '#555', marginBottom: 4, letterSpacing: '.04em', textTransform: 'uppercase' },
  balanceVal: { fontSize: 20, fontWeight: 700, color: '#a29bfe' },
  userBox: {
    margin: '0 .625rem', padding: '9px 11px', background: '#13131f',
    border: '1px solid #1e1e2e', borderRadius: 10, display: 'flex',
    alignItems: 'center', gap: 9,
  },
  avatar: {
    width: 30, height: 30, borderRadius: '50%', background: '#6C5CE7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0,
  },
  topbar: (mobile) => ({
    height: 52, borderBottom: '1px solid #1a1a28', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between',
    padding: mobile ? '0 1rem' : '0 1.5rem',
    gap: 8, flexShrink: 0, background: '#0a0a0f',
  }),
  hamburger: {
    background: 'none', border: '1px solid #1e1e2e', borderRadius: 7,
    padding: '6px 9px', color: '#888', fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
};

const NAV_SECTIONS = [
  {
    label: 'Tổng quan',
    items: [
      { to: '/',          label: 'Dashboard',     icon: '◈', exact: true },
      { to: '/wallet',    label: 'Ví MT',          icon: '◎' },
      { to: '/history',   label: 'Lịch sử',        icon: '≡' },
    ],
  },
  {
    label: 'Khám phá',
    items: [
      { to: '/activity',    label: 'Activity Feed', icon: '📡' },
      { to: '/creators',    label: 'Creators',      icon: '🌟' },
      { to: '/marketplace', label: 'Marketplace',   icon: '🛒' },
      { to: '/gifting',     label: 'Tip & Gift',    icon: '♥' },
      { to: '/leaderboard', label: 'Xếp hạng',      icon: '◈' },
      { to: '/shop',        label: 'Cửa hàng',      icon: '🛍' },
    ],
  },
  {
    label: 'Tôi',
    items: [
      { to: '/quests',      label: 'Nhiệm vụ',    icon: '◆' },
      { to: '/checkin',     label: 'Điểm danh',   icon: '🗓' },
      { to: '/referral',    label: 'Giới thiệu',  icon: '◇' },
      { to: '/memberships', label: 'Fan Club',     icon: '👑' },
      { to: '/achievements',label: 'Thành tựu',   icon: '🏆' },
      { to: '/profile',     label: 'Hồ sơ',       icon: '◉' },
    ],
  },
  {
    label: 'Creator',
    items: [
      { to: '/creator', label: 'Dashboard', icon: '★', creatorOnly: true },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/admin', label: 'Admin Panel', icon: '⊛', adminOnly: true },
    ],
  },
];

export default function Layout() {
  const { user, wallet, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const isMobile  = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div style={S.shell}>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div style={S.overlay} onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside style={S.sidebar(sidebarOpen, isMobile)}>
        <div style={S.logo}>
          <div style={S.logoIcon}>M</div>
          <span style={S.logoText}>MT Economy</span>
          {isMobile && (
            <button onClick={closeSidebar} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
          )}
        </div>

        <nav style={S.nav}>
          {NAV_SECTIONS.map(section => {
            const visibleItems = section.items.filter(n =>
              (!n.adminOnly   || user?.role === 'admin') &&
              (!n.creatorOnly || user?.role === 'creator' || user?.role === 'admin')
            );
            if (!visibleItems.length) return null;
            return (
              <div key={section.label}>
                <div style={S.navSection}>{section.label}</div>
                {visibleItems.map(({ to, label, icon, exact }) => (
                  <NavLink key={to} to={to} end={exact} style={({ isActive }) => S.navItem(isActive)}>
                    <span style={{ fontSize: 15 }}>{icon}</span>
                    <span style={{ flex: 1 }}>{label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div style={S.balanceBox}>
          <div style={S.balanceLbl}>Số dư</div>
          <div style={S.balanceVal}>{(wallet?.balance || 0).toLocaleString()} MT</div>
        </div>

        <div style={S.userBox}>
          <div style={S.avatar}>{user?.username?.[0]?.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
              {user?.username}
              {user?.kyc_status === 'verified' && <span title="Đã xác minh KYC" style={{ fontSize: 12, lineHeight: 1 }}>✨</span>}
            </div>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            style={{ background: 'none', border: 'none', color: '#555', fontSize: 15, padding: 4 }}
            title="Đăng xuất">⏻</button>
        </div>
      </aside>

      {/* Main content */}
      <div style={S.main}>
        <div style={S.topbar(isMobile)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMobile && (
              <button style={S.hamburger} onClick={() => setSidebarOpen(v => !v)} aria-label="Menu">
                ☰
              </button>
            )}
            {isMobile && (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#ddd' }}>MT Economy</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMobile && (
              <span style={{ fontSize: 12, color: '#a29bfe', fontWeight: 700 }}>
                {(wallet?.balance || 0).toLocaleString()} MT
              </span>
            )}
            <NotificationBell />
          </div>
        </div>

        <main style={{ flex: 1, padding: isMobile ? '1.25rem 1rem' : '2rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
