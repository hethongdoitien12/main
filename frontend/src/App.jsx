import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Layout from './components/Layout.jsx';
import LandingPage from './pages/LandingPage.jsx';
import PublicCreators from './pages/PublicCreators.jsx';
import PublicCreatorProfile from './pages/PublicCreatorProfile.jsx';

const Login          = lazy(() => import('./pages/Login.jsx'));
const Register       = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const Dashboard      = lazy(() => import('./pages/Dashboard.jsx'));
const Wallet         = lazy(() => import('./pages/Wallet.jsx'));
const Quests         = lazy(() => import('./pages/Quests.jsx'));
const History        = lazy(() => import('./pages/History.jsx'));
const Admin          = lazy(() => import('./pages/Admin.jsx'));
const Gifting        = lazy(() => import('./pages/Gifting.jsx'));
const PaymentResult  = lazy(() => import('./pages/PaymentResult.jsx'));
const Referral       = lazy(() => import('./pages/Referral.jsx'));
const Profile        = lazy(() => import('./pages/Profile.jsx'));
const CreatorDashboard = lazy(() => import('./pages/CreatorDashboard.jsx'));
const Leaderboard    = lazy(() => import('./pages/Leaderboard.jsx'));
const TopCreators    = lazy(() => import('./pages/TopCreators.jsx'));
const Checkin        = lazy(() => import('./pages/Checkin.jsx'));
const Shop           = lazy(() => import('./pages/Shop.jsx'));
const Creators       = lazy(() => import('./pages/Creators.jsx'));
const CreatorProfile = lazy(() => import('./pages/CreatorProfile.jsx'));
const MyMemberships  = lazy(() => import('./pages/MyMemberships.jsx'));
const Marketplace    = lazy(() => import('./pages/Marketplace.jsx'));
const ProductDetail  = lazy(() => import('./pages/ProductDetail.jsx'));
const ActivityFeed   = lazy(() => import('./pages/ActivityFeed.jsx'));
const Achievements   = lazy(() => import('./pages/Achievements.jsx'));

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', sans-serif;
    background: #0a0a0f;
    color: #e8e6e0;
    min-height: 100vh;
    line-height: 1.6;
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #111118; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
  input, button, select, textarea { font-family: inherit; }
  button { cursor: pointer; }
  a { color: inherit; text-decoration: none; }
`;

const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

function PageLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'#333', fontSize: 13 }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32, border: '3px solid #1e1e2e', borderTopColor: '#6C5CE7',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <span>Đang tải...</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to="/login" replace />;
};

const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Layout /> : <LandingPage />;
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login"           element={<Login />} />
              <Route path="/register"        element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/payment/result"  element={<PaymentResult />} />
              <Route path="/explore"         element={<PublicCreators />} />
              <Route path="/explore/:id"     element={<PublicCreatorProfile />} />
              <Route path="/" element={<HomeRoute />}>
                <Route index                      element={<Dashboard />} />
                <Route path="wallet"              element={<Wallet />} />
                <Route path="quests"              element={<Quests />} />
                <Route path="history"             element={<History />} />
                <Route path="gifting"             element={<Gifting />} />
                <Route path="referral"            element={<Referral />} />
                <Route path="profile"             element={<Profile />} />
                <Route path="leaderboard"         element={<Leaderboard />} />
                <Route path="top-creators"        element={<TopCreators />} />
                <Route path="checkin"             element={<Checkin />} />
                <Route path="creator"             element={<CreatorDashboard />} />
                <Route path="shop"                element={<Shop />} />
                <Route path="admin"               element={<Admin />} />
                <Route path="creators"            element={<Creators />} />
                <Route path="creator/:id"         element={<CreatorProfile />} />
                <Route path="memberships"         element={<MyMemberships />} />
                <Route path="marketplace"         element={<Marketplace />} />
                <Route path="marketplace/:id"     element={<ProductDetail />} />
                <Route path="activity"            element={<ActivityFeed />} />
                <Route path="achievements"        element={<Achievements />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
