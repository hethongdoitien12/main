import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const S = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0f' },
  card: { width: '100%', maxWidth: 400, padding: '2.5rem', background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 16 },
  logo: { textAlign: 'center', marginBottom: '2rem' },
  logoIcon: { width: 52, height: 52, background: 'linear-gradient(135deg,#6C5CE7,#a29bfe)', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub: { fontSize: 14, color: '#666' },
  group: { marginBottom: '1.25rem' },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#999', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 8, color: '#e8e6e0', fontSize: 14, outline: 'none' },
  btn: { width: '100%', padding: '11px', background: '#6C5CE7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 15, fontWeight: 600 },
  err: { color: '#ff6b6b', fontSize: 13, marginBottom: '1rem', padding: '10px 12px', background: 'rgba(255,107,107,.08)', borderRadius: 8 },
  link: { textAlign: 'center', marginTop: '1.5rem', fontSize: 14, color: '#666' }
};

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <form style={S.card} onSubmit={submit}>
        <div style={S.logo}>
          <div style={S.logoIcon}>X</div>
          <div style={S.title}>XU Economy</div>
          <div style={S.sub}>Đăng nhập để tiếp tục</div>
        </div>
        {error && <div style={S.err}>{error}</div>}
        <div style={S.group}>
          <label style={S.label}>Email</label>
          <input style={S.input} type="email" placeholder="email@example.com" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
        </div>
        <div style={S.group}>
          <label style={S.label}>Mật khẩu</label>
          <input style={S.input} type="password" placeholder="••••••••" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
        </div>
        <button style={{ ...S.btn, opacity: loading ? .7 : 1 }} disabled={loading} type="submit">
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
        <div style={S.link}>
          <Link to="/forgot-password" style={{ color:'#a29bfe', fontSize:13 }}>Quên mật khẩu?</Link>
        </div>
        <div style={S.link}>Chưa có tài khoản? <Link to="/register" style={{ color: '#a29bfe' }}>Đăng ký</Link></div>
        <div style={{ ...S.link, marginTop: '.75rem', fontSize: 12 }}>
          Test: <span style={{ color: '#a29bfe' }}>linh@user.vn</span> / password123
        </div>
      </form>
    </div>
  );
}
