import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

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
};

export default function Profile() {
  const { user, token, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setUsername(data.username || '');
        setAvatarUrl(data.avatar_url || '');
      })
      .catch(() => {});
  }, [token]);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, avatar_url: avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(prev => ({ ...prev, ...data }));
      setMsg({ type: 'success', text: 'Đã cập nhật hồ sơ!' });
      // Cập nhật localStorage
      const stored = JSON.parse(localStorage.getItem('xu_user') || '{}');
      localStorage.setItem('xu_user', JSON.stringify({ ...stored, username: data.username, avatar_url: data.avatar_url }));
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally { setSaving(false); }
  };

  const changed = profile && (username !== profile.username || avatarUrl !== (profile.avatar_url || ''));

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
            <span style={S.badge(profile.role)}>{profile.role}</span>
          </div>

          {msg && <div style={msg.type === 'success' ? S.success : S.err}>{msg.text}</div>}

          <label style={S.label}>Username</label>
          <input style={S.input} value={username} onChange={e => setUsername(e.target.value)}
            placeholder="Tên hiển thị (3–50 ký tự)" maxLength={50} />

          <label style={S.label}>Avatar URL</label>
          <input style={S.input} value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
            placeholder="https://... (để trống để dùng ký tự)" />

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
        </div>

      </div>
    </div>
  );
}
