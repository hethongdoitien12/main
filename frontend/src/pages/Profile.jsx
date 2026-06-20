import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';

const S = {
  h1: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: '1.75rem' },
  grid: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' },
  card: { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.5rem' },
  label: { fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '10px 14px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 8, color: '#e8e6e0', fontSize: 14, outline: 'none', marginBottom: '1.25rem' },
  inputFocus: { border: '1px solid #6C5CE7' },
  btn: (dis) => ({ width: '100%', padding: '11px', background: dis ? '#1e1e2e' : 'linear-gradient(135deg,#6C5CE7,#a29bfe)', border: 'none', borderRadius: 8, color: dis ? '#555' : '#fff', fontSize: 14, fontWeight: 600, cursor: dis ? 'not-allowed' : 'pointer', marginTop: 4 }),
  avatarWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' },
  avatar: (url) => ({
    width: 80, height: 80, borderRadius: '50%',
    background: url ? `url(${url}) center/cover` : 'linear-gradient(135deg,#6C5CE7,#a29bfe)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 8,
    border: '3px solid #2e2e44',
  }),
  stat: { background: '#13131f', borderRadius: 10, padding: '14px 16px', marginBottom: 10 },
  statLabel: { fontSize: 11, color: '#555', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 700, color: '#a29bfe' },
  success: { fontSize: 13, color: '#6fcf97', padding: '10px 12px', background: 'rgba(111,207,151,.08)', borderRadius: 8, marginBottom: '1rem', textAlign: 'center' },
  err: { fontSize: 13, color: '#ff6b6b', padding: '10px 12px', background: 'rgba(255,107,107,.08)', borderRadius: 8, marginBottom: '1rem' },
  badge: (role) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: role === 'admin' ? '#fd79a820' : role === 'creator' ? '#fdcb6e20' : '#6C5CE720',
    color: role === 'admin' ? '#fd79a8' : role === 'creator' ? '#fdcb6e' : '#a29bfe',
    border: `1px solid ${role === 'admin' ? '#fd79a840' : role === 'creator' ? '#fdcb6e40' : '#6C5CE740'}`,
  }),
  divider: { border: 'none', borderTop: '1px solid #1a1a28', margin: '1.25rem 0' },
  kycCard: { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.5rem', marginTop: 20 },
  kycTitle: { fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 },
  kycSub: { fontSize: 12, color: '#555', marginBottom: '1.25rem' },
  kycStatus: (s) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    background: s === 'verified' ? '#0e2a1e' : s === 'pending' ? '#1e1e0a' : '#1a1a28',
    color: s === 'verified' ? '#6fcf97' : s === 'pending' ? '#fdcb6e' : '#555',
    border: `1px solid ${s === 'verified' ? '#6fcf9740' : s === 'pending' ? '#fdcb6e40' : '#2e2e44'}`,
    marginBottom: '1.25rem',
  }),
  photoPreview: { width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8, border: '1px solid #2e2e44', marginTop: 8, background: '#13131f' },
};

export default function Profile() {
  const { user, token, login } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Achievements
  const [recentAch, setRecentAch] = useState([]);

  // KYC state
  const [kyc, setKyc] = useState(null);
  const [kycFullName, setKycFullName] = useState('');
  const [kycIdNumber, setKycIdNumber] = useState('');
  const [kycPhotoUrl, setKycPhotoUrl] = useState('');
  const [kycSaving, setKycSaving] = useState(false);
  const [kycMsg, setKycMsg] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setUsername(data.username || '');
        setAvatarUrl(data.avatar_url || '');
        setBio(data.bio || '');
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/achievements/my', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const list = (d.achievements || []).filter(a => a.unlocked_at).sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at)).slice(0, 5);
        setRecentAch(list);
      }).catch(() => {});
  }, [token]);

  const loadKyc = useCallback(() => {
    if (!token) return;
    fetch('/api/user/kyc', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setKyc(data))
      .catch(() => {});
  }, [token]);

  useEffect(() => { loadKyc(); }, [loadKyc]);

  const submitKyc = async () => {
    setKycSaving(true); setKycMsg(null);
    try {
      const res = await fetch('/api/user/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: kycFullName, id_number: kycIdNumber, photo_url: kycPhotoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKycMsg({ type: 'success', text: '📋 Đã nộp hồ sơ KYC! Admin sẽ xem xét trong 1-2 ngày.' });
      addToast('info', '📋 Hồ sơ KYC đã được nộp! Chờ xét duyệt 1-2 ngày.');
      loadKyc();
    } catch (err) {
      setKycMsg({ type: 'error', text: err.message });
      addToast('error', err.message);
    } finally { setKycSaving(false); }
  };

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, avatar_url: avatarUrl, bio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(prev => ({ ...prev, ...data }));
      setMsg({ type: 'success', text: 'Đã cập nhật hồ sơ!' });
      addToast('success', '✅ Hồ sơ đã được cập nhật!');
      // Cập nhật localStorage
      const stored = JSON.parse(localStorage.getItem('xu_user') || '{}');
      localStorage.setItem('xu_user', JSON.stringify({ ...stored, username: data.username, avatar_url: data.avatar_url }));
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
      addToast('error', err.message);
    } finally { setSaving(false); }
  };

  const changed = profile && (
    username !== profile.username ||
    avatarUrl !== (profile.avatar_url || '') ||
    bio !== (profile.bio || '')
  );

  if (!profile) return <div style={{ color: '#555', padding: '2rem' }}>Đang tải...</div>;

  const joined = new Date(profile.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      <div style={S.h1}>Hồ sơ cá nhân</div>
      <div style={S.grid}>

        {/* Left — edit form */}
        <div style={S.card}>
          <div style={S.avatarWrap}>
            <div style={S.avatar(avatarUrl)}>
              {!avatarUrl && (profile.username?.[0]?.toUpperCase() || '?')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={S.badge(profile.role)}>{profile.role}</span>
              {kyc?.kyc_status === 'verified' && (
                <span title="Đã xác minh KYC" style={{ fontSize: 18, lineHeight: 1 }}>✨</span>
              )}
            </div>
          </div>

          {msg && <div style={msg.type === 'success' ? S.success : S.err}>{msg.text}</div>}

          <label style={S.label}>Username</label>
          <input style={S.input} value={username} onChange={e => setUsername(e.target.value)}
            placeholder="Tên hiển thị (3–50 ký tự)" maxLength={50} />

          <label style={S.label}>Avatar URL</label>
          <input style={S.input} value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
            placeholder="https://... (để trống để dùng ký tự)" />

          <label style={S.label}>Bio (tối đa 300 ký tự)</label>
          <textarea
            style={{ ...S.input, height: 72, resize: 'vertical', marginBottom: '1.25rem' }}
            value={bio} onChange={e => setBio(e.target.value)}
            placeholder="Giới thiệu ngắn về bạn..."
            maxLength={300}
          />
          <div style={{ fontSize: 11, color: '#444', marginTop: -16, marginBottom: '1.25rem', textAlign: 'right' }}>{bio.length}/300</div>

          <label style={S.label}>Email</label>
          <input style={{ ...S.input, color: '#555', cursor: 'not-allowed' }} value={profile.email} disabled />

          <button style={S.btn(!changed || saving)} onClick={save} disabled={!changed || saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>

        {/* Right — stats */}
        <div>
          <div style={S.card}>
            <div style={{ fontSize: 13, color: '#555', marginBottom: '1.25rem' }}>
              Tham gia từ {joined}
              {profile.referral_code && (
                <span style={{ marginLeft: 12, color: '#a29bfe' }}>
                  Mã giới thiệu: <strong>{profile.referral_code}</strong>
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div style={S.stat}>
                <div style={S.statLabel}>Số dư hiện tại</div>
                <div style={S.statValue}>{Number(profile.balance || 0).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#555' }}>MT</div>
              </div>
              <div style={S.stat}>
                <div style={S.statLabel}>Đã kiếm được</div>
                <div style={{ ...S.statValue, color: '#6fcf97' }}>{Number(profile.total_earned || 0).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#555' }}>MT</div>
              </div>
              <div style={S.stat}>
                <div style={S.statLabel}>Đã tiêu</div>
                <div style={{ ...S.statValue, color: '#fd79a8' }}>{Number(profile.total_spent || 0).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#555' }}>MT</div>
              </div>
              <div style={S.stat}>
                <div style={S.statLabel}>Đã rút</div>
                <div style={{ ...S.statValue, color: '#fdcb6e' }}>{Number(profile.total_withdrawn || 0).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#555' }}>MT</div>
              </div>
            </div>

            <div style={S.stat}>
              <div style={S.statLabel}>Số người bạn đã giới thiệu</div>
              <div style={{ ...S.statValue, color: '#74b9ff' }}>{Number(profile.referral_count || 0).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#555' }}>người</div>
            </div>
          </div>

          {/* Achievements mini-section */}
          {recentAch.length > 0 && (
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#aaa' }}>🏆 Thành tựu gần đây</div>
                <Link to="/achievements" style={{ fontSize: 12, color: '#a29bfe', textDecoration: 'none' }}>Xem tất cả →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentAch.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#13131f', borderRadius: 8, border: '1px solid #1e1e2e' }}>
                    <span style={{ fontSize: 22 }}>{a.icon || '🏆'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: '#555' }}>{new Date(a.unlocked_at).toLocaleDateString('vi-VN')}</div>
                    </div>
                    {parseInt(a.reward_mt) > 0 && (
                      <span style={{ fontSize: 11, color: '#a29bfe', fontWeight: 700 }}>+{parseInt(a.reward_mt).toLocaleString()} MT</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KYC Section */}
          <div style={S.kycCard}>
            <div style={S.kycTitle}>🪪 Xác minh danh tính (KYC)</div>
            <div style={S.kycSub}>Bắt buộc khi rút trên 1,000,000 MT</div>

            {kyc && (
              <div style={S.kycStatus(kyc.kyc_status)}>
                {kyc.kyc_status === 'verified' && '✅ Đã xác minh'}
                {kyc.kyc_status === 'pending'  && '⏳ Đang chờ duyệt'}
                {kyc.kyc_status === 'none'     && '⚪ Chưa xác minh'}
              </div>
            )}

            {/* Đã duyệt — hiện thông tin tóm tắt */}
            {kyc?.kyc_status === 'verified' && (
              <div style={{ fontSize: 13, color: '#6fcf97', padding: '10px 12px', background: 'rgba(111,207,151,.07)', borderRadius: 8 }}>
                Tài khoản đã được xác minh KYC vào{' '}
                {kyc.kyc_verified_at ? new Date(kyc.kyc_verified_at).toLocaleDateString('vi-VN') : '—'}
              </div>
            )}

            {/* Đang chờ — hiện thông tin đã nộp */}
            {kyc?.kyc_status === 'pending' && (
              <div style={{ fontSize: 13, color: '#fdcb6e', padding: '10px 12px', background: 'rgba(253,203,110,.07)', borderRadius: 8 }}>
                Hồ sơ đã nộp ngày {kyc.kyc_submitted_at ? new Date(kyc.kyc_submitted_at).toLocaleDateString('vi-VN') : '—'}.
                Vui lòng chờ admin xét duyệt.
              </div>
            )}

            {/* Chưa nộp — hiện form */}
            {(!kyc || kyc.kyc_status === 'none') && (
              <div>
                {kycMsg && (
                  <div style={kycMsg.type === 'success' ? S.success : S.err}>{kycMsg.text}</div>
                )}

                <label style={S.label}>Họ và tên (đúng theo CCCD/CMND)</label>
                <input style={S.input} value={kycFullName} onChange={e => setKycFullName(e.target.value)}
                  placeholder="Nguyễn Văn A" maxLength={100} />

                <label style={S.label}>Số CCCD / CMND (9-12 chữ số)</label>
                <input style={S.input} value={kycIdNumber} onChange={e => setKycIdNumber(e.target.value)}
                  placeholder="012345678901" maxLength={12} />

                <label style={S.label}>URL ảnh CCCD / hộ chiếu (tùy chọn)</label>
                <input style={S.input} value={kycPhotoUrl} onChange={e => setKycPhotoUrl(e.target.value)}
                  placeholder="https://... (link ảnh chụp CCCD)" />
                {kycPhotoUrl && (
                  <img src={kycPhotoUrl} alt="Ảnh CCCD" style={S.photoPreview}
                    onError={e => { e.target.style.display = 'none'; }} />
                )}

                <button
                  style={{ ...S.btn(!kycFullName || !kycIdNumber || kycSaving), marginTop: '1rem' }}
                  onClick={submitKyc}
                  disabled={!kycFullName || !kycIdNumber || kycSaving}
                >
                  {kycSaving ? 'Đang nộp...' : '📤 Nộp hồ sơ KYC'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
