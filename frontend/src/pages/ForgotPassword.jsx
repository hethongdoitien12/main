import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  btn:     { width:'100%', padding:11, background:'#6C5CE7', border:'none', borderRadius:8, color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' },
  btnOut:  { width:'100%', padding:11, background:'transparent', border:'1px solid #2e2e3e', borderRadius:8, color:'#999', fontSize:14, fontWeight:500, cursor:'pointer', marginTop:10 },
  err:     { color:'#ff6b6b', fontSize:13, marginBottom:'1rem', padding:'10px 12px', background:'rgba(255,107,107,.08)', borderRadius:8 },
  ok:      { color:'#00b894', fontSize:13, marginBottom:'1rem', padding:'10px 12px', background:'rgba(0,184,148,.08)', borderRadius:8 },
  link:    { textAlign:'center', marginTop:'1.5rem', fontSize:14, color:'#666' },
  steps:   { display:'flex', gap:8, marginBottom:'1.5rem', alignItems:'center' },
  step:    (active) => ({ flex:1, height:4, borderRadius:2, background: active ? '#6C5CE7' : '#1e1e2e', transition:'background .3s' }),
  devBox:  { padding:'12px 14px', background:'rgba(255,190,11,.06)', border:'1px solid rgba(255,190,11,.25)', borderRadius:8, fontSize:12, color:'#fdcb6e', marginBottom:'1rem' },
  successWrap: { textAlign:'center', padding:'1rem 0' },
};

export default function ForgotPassword() {
  const [step, setStep]       = useState(1); // 1=email, 2=otp+newpass, 3=done
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [devOtp, setDevOtp]   = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate              = useNavigate();

  // Bước 1: Gửi OTP
  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await api.auth.forgotPassword({ email });
      setStep(2);
      if (data.dev) setDevOtp(data.otp);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Đặt mật khẩu mới
  const resetPass = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return setError('Nhập đủ 6 chữ số');
    if (newPass !== confirm) return setError('Mật khẩu xác nhận không khớp');
    if (newPass.length < 6) return setError('Mật khẩu ít nhất 6 ký tự');
    setLoading(true); setError('');
    try {
      await api.auth.resetPassword({ email, otp_code: otp, new_password: newPass });
      setStep(3);
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
        <div style={S.title}>
          {step === 1 && 'Quên mật khẩu'}
          {step === 2 && 'Đặt mật khẩu mới'}
          {step === 3 && 'Thành công!'}
        </div>
        <div style={S.sub}>
          {step === 1 && 'Nhập email để nhận mã xác nhận'}
          {step === 2 && `Nhập mã OTP đã gửi đến ${email}`}
          {step === 3 && 'Mật khẩu đã được cập nhật'}
        </div>

        {step < 3 && (
          <div style={S.steps}>
            <div style={S.step(step >= 1)} />
            <div style={S.step(step >= 2)} />
          </div>
        )}

        {error && <div style={S.err}>{error}</div>}

        {/* ===== STEP 1: Nhập email ===== */}
        {step === 1 && (
          <form onSubmit={sendOtp}>
            <div style={S.group}>
              <label style={S.label}>Email đã đăng ký</label>
              <input
                style={S.input}
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required autoFocus
              />
            </div>
            <button style={{ ...S.btn, opacity: loading ? .7 : 1 }} disabled={loading}>
              {loading ? 'Đang gửi...' : '📧 Gửi mã xác nhận'}
            </button>
            <div style={S.link}>
              <Link to="/login" style={{ color:'#a29bfe' }}>← Quay lại đăng nhập</Link>
            </div>
          </form>
        )}

        {/* ===== STEP 2: OTP + mật khẩu mới ===== */}
        {step === 2 && (
          <form onSubmit={resetPass}>
            {devOtp && (
              <div style={S.devBox}>
                🛠️ <strong>Chế độ dev</strong> — Mã OTP của bạn:{' '}
                <strong style={{ fontSize:18, letterSpacing:4, fontFamily:'monospace' }}>{devOtp}</strong>
              </div>
            )}

            <div style={S.group}>
              <label style={S.label}>Mã OTP (6 chữ số)</label>
              <input
                style={{ ...S.input, textAlign:'center', fontSize:24, fontWeight:700, letterSpacing:10, fontFamily:'monospace', padding:'12px' }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                autoFocus
                required
              />
            </div>
            <div style={S.group}>
              <label style={S.label}>Mật khẩu mới</label>
              <input
                style={S.input}
                type="password"
                placeholder="ít nhất 6 ký tự"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                required minLength={6}
              />
            </div>
            <div style={S.group}>
              <label style={S.label}>Xác nhận mật khẩu</label>
              <input
                style={{ ...S.input, borderColor: confirm && newPass !== confirm ? '#ff6b6b' : '#1e1e2e' }}
                type="password"
                placeholder="nhập lại mật khẩu"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>

            <button style={{ ...S.btn, opacity: (loading || otp.length !== 6) ? .7 : 1 }} disabled={loading || otp.length !== 6}>
              {loading ? 'Đang cập nhật...' : '🔒 Đặt mật khẩu mới'}
            </button>
            <button type="button" style={S.btnOut} onClick={() => { setStep(1); setOtp(''); setError(''); setDevOtp(''); }}>
              ← Dùng email khác
            </button>
          </form>
        )}

        {/* ===== STEP 3: Thành công ===== */}
        {step === 3 && (
          <div style={S.successWrap}>
            <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
            <p style={{ color:'#999', marginBottom:24 }}>Mật khẩu mới đã được lưu. Đăng nhập ngay nhé!</p>
            <button style={S.btn} onClick={() => navigate('/login')}>
              Đăng nhập ngay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
