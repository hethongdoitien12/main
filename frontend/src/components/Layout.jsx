import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import NotificationBell from './NotificationBell.jsx';

const S = {
  shell: { display:'flex', minHeight:'100vh' },
  sidebar: {
    width: 220, background: '#0e0e17', borderRight: '1px solid #1e1e2e',
    display: 'flex', flexDirection: 'column', padding: '0 0 1.5rem', flexShrink: 0
  },
  logo: {
    padding: '1.5rem 1.5rem 1rem', display: 'flex', alignItems: 'center', gap: 10,
    borderBottom: '1px solid #1a1a28'
  },
  logoIcon: {
    width: 36, height: 36, background: 'linear-gradient(135deg,#6C5CE7,#a29bfe)',
    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 700, color: '#fff'
  },
  logoText: { fontSize: 17, fontWeight: 700, color: '#fff' },
  nav: { padding: '1rem .75rem', flex: 1, overflowY: 'auto' },
  navSection: { fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '.08em', padding: '10px 12px 4px' },
  navItem: (active) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
    borderRadius: 8, marginBottom: 2, fontSize: 14, fontWeight: 500,
    color: active ? '#fff' : '#888',
    background: active ? '#1e1e2e' : 'transparent',
    border: active ? '1px solid #2e2e44' : '1px solid transparent',
    transition: 'all .15s'
  }),
  balanceBox: {
    margin: '0 .75rem 1rem', padding: '12px 14px', background: '#13131f',
    border: '1px solid #1e1e2e', borderRadius: 10
  },
  balanceLbl: { fontSize: 11, color: '#555', marginBottom: 4, letterSpacing: '.04em', textTransform: 'uppercase' },
  balanceVal: { fontSize: 22, fontWeight: 700, color: '#a29bfe' },
  userBox: {
    margin: '0 .75rem', padding: '10px 12px', background: '#13131f',
    border: '1px solid #1e1e2e', borderRadius: 10, display: 'flex',
    alignItems: 'center', gap: 10
  },
  avatar: {
    width: 32, height: 32, borderRadius: '50%', background: '#6C5CE7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0
  },
  topbar: {
    height: 52, borderBottom: '1px solid #1a1a28', display: 'flex',
    alignItems: 'center', justifyContent: 'flex-end', padding: '0 1.5rem',
    gap: 8, flexShrink: 0
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
};

const NAV_SECTIONS = [
  {
    label: 'Tổng quan',
    items: [
      { to: '/',          label: 'Dashboard',   icon: '◈', exact: true },
      { to: '/wallet',    label: 'Ví MT',        icon: '◎' },
      { to: '/history',   label: 'Lịch sử',      icon: '≡' },
    ],
  },
  {
    label: 'Khám phá',
    items: [
      { to: '/creators',    label: 'Creators',     icon: '🌟' },
      { to: '/marketplace', label: 'Marketplace',  icon: '🛒' },
      { to: '/gifting',     label: 'Tip & Gift',   icon: '♥' },
      { to: '/leaderboard', label: 'Xếp hạng',     icon: '◈' },
      { to: '/shop',        label: 'Cửa hàng',     icon: '🛍' },
    ],
  },
  {
    label: 'Tôi',
    items: [
      { to: '/quests',      label: 'Nhiệm vụ',    icon: '◆' },
      { to: '/checkin',     label: 'Điểm danh',   icon: '🗓' },
      { to: '/referral',    label: 'Giới thiệu',  icon: '◇' },
      { to: '/memberships', label: 'Fan Club',     icon: '👑' },
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
  const navigate = useNavigate();

  return (
    <div style={S.shell}>
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoIcon}>M</div>
          <span style={S.logoText}>MT Economy</span>
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
                    <span style={{ fontSize: 16 }}>{icon}</span> {label}
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
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} style={{ background: 'none', border: 'none', color: '#555', fontSize: 16, padding: 4 }} title="Đăng xuất">⏻</button>
        </div>
      </aside>

      <div style={S.main}>
        <div style={S.topbar}>
          <NotificationBell />
        </div>
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
