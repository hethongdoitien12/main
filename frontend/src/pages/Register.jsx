import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const S = {
  page:  { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0f' },
  card:  { width:'100%', maxWidth:400, padding:'2.5rem', background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:16 },
  logo:  { textAlign:'center', marginBottom:'1.5rem' },
  icon:  { width:44, height:44, background:'linear-gradient(135deg,#6C5CE7,#a29bfe)', borderRadius:12, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#fff', marginBottom:8 },
  title: { fontSize:22, fontWeight:700, color:'#fff', marginBottom:4, textAlign:'center' },
  sub:   { fontSize:14, color:'#666', textAlign:'center', marginBottom:'2rem' },
  group: { marginBottom:'1.1rem' },
  label: { display:'block', fontSize:13, fontWeight:500, color:'#999', marginBottom:6 },
  input: { width:'100%', padding:'10px 14px', background:'#13131f', border:'1px solid #1e1e2e', borderRadius:8, color:'#e8e6e0', fontSize:14, outline:'none' },
  refBox:{ padding:'10px 14px', background:'rgba(108,92,231,.07)', border:'1px solid rgba(108,92,231,.3)', borderRadius:8, fontSize:12, color:'#a29bfe', marginBottom:'1.1rem', display:'flex', alignItems:'center', gap:8 },
  btn:   { width:'100%', padding:11, background:'#6C5CE7', border:'none', borderRadius:8, color:'#fff', fontSize:15, fontWeight:600 },
  err:   { color:'#ff6b6b', fontSize:13, marginBottom:'1rem', padding:'10px 12px', background:'rgba(255,107,107,.08)', borderRadius:8 },
  link:  { textAlign:'center', marginTop:'1.5rem', fontSize:14, color:'#666' },
};

export default function Register() {
  const [searchParams]                   = useSearchParams();
  const [form, setForm]                  = useState({ username:'', email:'', password:'' });
  const [refCode, setRefCode]            = useState(() => searchParams.get('ref') || '');
  const [error, setError]                = useState('');
  const [loading, setLoading]            = useState(false);
  const { register: authRegister, token} = useAuth();
  const navigate                         = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authRegister(form.username, form.email, form.password, refCode.trim().toUpperCase() || undefined);

      // Nếu có referral code — áp dụng ngay sau khi đăng ký thành công
      if (refCode.trim() && data.token) {
        try {
          await api.referral.use(refCode.trim().toUpperCase(), data.token);
        } catch {
          // Lỗi referral không block đăng ký
        }
      }
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
          <div style={S.icon}>X</div>
        </div>
        <div style={S.title}>Tạo tài khoản</div>
        <div style={S.sub}>Bắt đầu kiếm XU ngay hôm nay</div>

        {error && <div style={S.err}>{error}</div>}

        {refCode && (
          <div style={S.refBox}>
            🎁 Bạn được mời với mã <strong style={{ letterSpacing:2 }}>{refCode.toUpperCase()}</strong> — nhận +500 XU khi đăng ký xong!
          </div>
        )}

        <div style={S.group}>
          <label style={S.label}>Tên người dùng</label>
          <input style={S.input} placeholder="username" value={form.username} onChange={set('username')} required />
        </div>
        <div style={S.group}>
          <label style={S.label}>Email</label>
          <input style={S.input} type="email" placeholder="email@example.com" value={form.email} onChange={set('email')} required />
        </div>
        <div style={S.group}>
          <label style={S.label}>Mật khẩu</label>
          <input style={S.input} type="password" placeholder="ít nhất 6 ký tự" value={form.password} onChange={set('password')} required minLength={6} />
        </div>
        <div style={S.group}>
          <label style={S.label}>Mã giới thiệu (tuỳ chọn)</label>
          <input
            style={{ ...S.input, letterSpacing: refCode ? 3 : 0, textTransform:'uppercase', fontFamily: refCode ? 'monospace' : 'inherit' }}
            placeholder="Nhập mã nếu có"
            value={refCode}
            onChange={e => setRefCode(e.target.value.toUpperCase())}
            maxLength={8}
          />
        </div>

        <button style={{ ...S.btn, opacity: loading ? .7 : 1 }} disabled={loading}>
          {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
        </button>
        <div style={S.link}>Đã có tài khoản? <Link to="/login" style={{ color:'#a29bfe' }}>Đăng nhập</Link></div>
      </form>
    </div>
  );
}
