import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const S = {
  page:    { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0f' },
  card:    { width:'100%', maxWidth:420, padding:'2.5rem', background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:16 },
  logo:    { textAlign:'center', marginBottom:'1.5rem' },
  icon:    { width:44, height:44, background:'linear-gradient(135deg,#6C5CE7,#a29bfe)', borderRadius:12, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#fff', marginBottom:8 },
  title:   { fontSize:22, fontWeight:700, color:'#fff', marginBottom:4, textAlign:'center' },
  sub:     { fontSize:14, color:'#666', textAlign:'center', marginBottom:'2rem' },
  group:   { marginBottom:'1.1rem' },
  label:   { display:'block', fontSize:13, fontWeight:500, color:'#999', marginBottom:6 },
  input:   { width:'100%', padding:'10px 14px', background:'#13131f', border:'1px solid #1e1e2e', borderRadius:8, color:'#e8e6e0', fontSize:14, outline:'none', boxSizing:'border-box' },
  refBox:  { padding:'10px 14px', background:'rgba(108,92,231,.07)', border:'1px solid rgba(108,92,231,.3)', borderRadius:8, fontSize:12, color:'#a29bfe', marginBottom:'1.1rem', display:'flex', alignItems:'center', gap:8 },
  btn:     { width:'100%', padding:11, background:'#6C5CE7', border:'none', borderRadius:8, color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' },
  btnOut:  { width:'100%', padding:11, background:'transparent', border:'1px solid #2e2e3e', borderRadius:8, color:'#999', fontSize:14, fontWeight:500, cursor:'pointer', marginTop:10 },
  err:     { color:'#ff6b6b', fontSize:13, marginBottom:'1rem', padding:'10px 12px', background:'rgba(255,107,107,.08)', borderRadius:8 },
  ok:      { color:'#00b894', fontSize:13, marginBottom:'1rem', padding:'10px 12px', background:'rgba(0,184,148,.08)', borderRadius:8 },
  link:    { textAlign:'center', marginTop:'1.5rem', fontSize:14, color:'#666' },
  steps:   { display:'flex', gap:8, marginBottom:'1.5rem', alignItems:'center' },
  step:    (active) => ({ flex:1, height:4, borderRadius:2, background: active ? '#6C5CE7' : '#1e1e2e', transition:'background .3s' }),
  otpWrap: { display:'flex', gap:8, marginBottom:'1.1rem' },
  otpInput:{ flex:1, padding:'14px 0', background:'#13131f', border:'2px solid #1e1e2e', borderRadius:8, color:'#a29bfe', fontSize:28, fontWeight:700, textAlign:'center', fontFamily:'monospace', outline:'none', letterSpacing:2 },
  devBox:  { padding:'12px 14px', background:'rgba(255,190,11,.06)', border:'1px solid rgba(255,190,11,.25)', borderRadius:8, fontSize:12, color:'#fdcb6e', marginBottom:'1rem' },
};

export default function Register() {
  const [searchParams]              = useSearchParams();
  const [step, setStep]             = useState(1); // 1=form, 2=otp
  const [form, setForm]             = useState({ username:'', email:'', password:'' });
  const [refCode, setRefCode]       = useState(() => searchParams.get('ref') || '');
  const [otp, setOtp]               = useState('');
  const [devOtp, setDevOtp]         = useState('');
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [loading, setLoading]       = useState(false);
  const { register: authRegister }  = useAuth();
  const navigate                    = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // Bước 1: Gửi OTP
  const sendOtp = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError('Mật khẩu ít nhất 6 ký tự');
    setLoading(true);
    setError('');
    try {
      const data = await api.auth.sendOtp({ email: form.email, username: form.username });
      setStep(2);
      setSuccess(`Mã OTP đã gửi đến ${form.email}`);
      if (data.dev) {
        setDevOtp(data.otp);
        setSuccess('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Xác nhận OTP + tạo tài khoản
  const submit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return setError('Nhập đủ 6 chữ số');
    setLoading(true);
    setError('');
    try {
      const data = await authRegister(
        form.username, form.email, form.password,
        refCode.trim().toUpperCase() || undefined,
        otp
      );

      if (refCode.trim() && data.token) {
        try { await api.referral.use(refCode.trim().toUpperCase(), data.token); } catch {}
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
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.icon}>X</div>
        </div>
        <div style={S.title}>{step === 1 ? 'Tạo tài khoản' : 'Xác nhận email'}</div>
        <div style={S.sub}>{step === 1 ? 'Bắt đầu kiếm MT ngay hôm nay' : `Nhập mã OTP đã gửi đến ${form.email}`}</div>

        {/* Progress bar */}
        <div style={S.steps}>
          <div style={S.step(step >= 1)} />
          <div style={S.step(step >= 2)} />
        </div>

        {error   && <div style={S.err}>{error}</div>}
        {success && <div style={S.ok}>✅ {success}</div>}

        {/* ===== STEP 1: Điền form ===== */}
        {step === 1 && (
          <form onSubmit={sendOtp}>
            {refCode && (
              <div style={S.refBox}>
                🎁 Mã giới thiệu <strong style={{ letterSpacing:2 }}>{refCode.toUpperCase()}</strong> — nhận +500 MT khi đăng ký xong!
              </div>
            )}

            <div style={S.group}>
              <label style={S.label}>Tên người dùng</label>
              <input style={S.input} placeholder="username" value={form.username} onChange={set('username')} required />
            </div>
            <div style={S.group}>
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" placeholder="email@example.com" value={form.email} autoComplete="email" onChange={set('email')} required />
            </div>
            <div style={S.group}>
              <label style={S.label}>Mật khẩu</label>
              <input style={S.input} type="password" placeholder="ít nhất 6 ký tự" value={form.password} autoComplete="new-password" onChange={set('password')} required minLength={6} />
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
              {loading ? 'Đang gửi mã...' : '📧 Gửi mã xác nhận'}
            </button>
            <div style={S.link}>Đã có tài khoản? <Link to="/login" style={{ color:'#a29bfe' }}>Đăng nhập</Link></div>
          </form>
        )}

        {/* ===== STEP 2: Nhập OTP ===== */}
        {step === 2 && (
          <form onSubmit={submit}>
            {devOtp && (
              <div style={S.devBox}>
                🛠️ <strong>Chế độ dev</strong> — chưa cấu hình email thật.<br />
                Mã OTP của bạn: <strong style={{ fontSize:18, letterSpacing:4, fontFamily:'monospace' }}>{devOtp}</strong>
              </div>
            )}

            <div style={S.group}>
              <label style={S.label}>Nhập mã 6 chữ số</label>
              <input
                style={{ ...S.input, textAlign:'center', fontSize:28, fontWeight:700, letterSpacing:12, fontFamily:'monospace', padding:'14px' }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                autoFocus
                required
              />
            </div>

            <button style={{ ...S.btn, opacity: loading ? .7 : 1 }} disabled={loading || otp.length !== 6}>
              {loading ? 'Đang tạo tài khoản...' : '✅ Xác nhận & Tạo tài khoản'}
            </button>
            <button type="button" style={S.btnOut} onClick={() => { setStep(1); setOtp(''); setError(''); setSuccess(''); setDevOtp(''); }}>
              ← Quay lại sửa thông tin
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
