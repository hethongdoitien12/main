import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Wallet from './pages/Wallet.jsx';
import Quests from './pages/Quests.jsx';
import History from './pages/History.jsx';
import Admin from './pages/Admin.jsx';
import Gifting from './pages/Gifting.jsx';
import PaymentResult from './pages/PaymentResult.jsx';
import Referral from './pages/Referral.jsx';
import Profile from './pages/Profile.jsx';
import CreatorDashboard from './pages/CreatorDashboard.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import TopCreators from './pages/TopCreators.jsx';
import Checkin from './pages/Checkin.jsx';
import Shop from './pages/Shop.jsx';
import Creators from './pages/Creators.jsx';
import CreatorProfile from './pages/CreatorProfile.jsx';
import MyMemberships from './pages/MyMemberships.jsx';
import Marketplace from './pages/Marketplace.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Layout from './components/Layout.jsx';
import LandingPage from './pages/LandingPage.jsx';
import PublicCreators from './pages/PublicCreators.jsx';
import PublicCreatorProfile from './pages/PublicCreatorProfile.jsx';
import ActivityFeed from './pages/ActivityFeed.jsx';
import Achievements from './pages/Achievements.jsx';

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

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#888' }}>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#888' }}>Loading...</div>;
  return user ? <Layout /> : <LandingPage />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/payment/result" element={<PaymentResult />} />
          <Route path="/explore" element={<PublicCreators />} />
          <Route path="/explore/:id" element={<PublicCreatorProfile />} />
          <Route path="/" element={<HomeRoute />}>
            <Route index element={<Dashboard />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="quests" element={<Quests />} />
            <Route path="history" element={<History />} />
            <Route path="gifting" element={<Gifting />} />
            <Route path="referral" element={<Referral />} />
            <Route path="profile" element={<Profile />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="top-creators" element={<TopCreators />} />
            <Route path="checkin" element={<Checkin />} />
            <Route path="creator" element={<CreatorDashboard />} />
            <Route path="shop" element={<Shop />} />
            <Route path="admin" element={<Admin />} />
            <Route path="creators" element={<Creators />} />
            <Route path="creator/:id" element={<CreatorProfile />} />
            <Route path="memberships" element={<MyMemberships />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="marketplace/:id" element={<ProductDetail />} />
          <Route path="activity" element={<ActivityFeed />} />
          <Route path="achievements" element={<Achievements />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
