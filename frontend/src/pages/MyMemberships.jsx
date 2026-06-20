import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';
import { SkeletonRow } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';

const TIER_COLORS = {
  1: { border: '#cd7f3250', bg: '#cd7f3208', text: '#cd7f32', icon: '🥉' },
  2: { border: '#b2bec350', bg: '#b2bec308', text: '#b2bec3', icon: '🥈' },
  3: { border: '#fdcb6e50', bg: '#fdcb6e08', text: '#fdcb6e', icon: '🥇' },
};

const S = {
  h1:    { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: '1.75rem' },
  card:  { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 14, padding: '1.5rem', marginBottom: 16 },
  noData: { color: '#444', fontSize: 14, textAlign: 'center', padding: '3rem 0' },
  badge: (status) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: status === 'active' ? '#00b89420' : status === 'cancelled' ? '#ff6b6b20' : '#55555520',
    color:      status === 'active' ? '#00b894'   : status === 'cancelled' ? '#ff6b6b'   : '#888',
  }),
  autoRenewBadge: (on) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: on ? '#6C5CE720' : '#22222a',
    color: on ? '#a29bfe' : '#555',
    border: `1px solid ${on ? '#6C5CE740' : '#2a2a3a'}`,
  }),
  toggleBtn: (on) => ({
    padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
    background: on ? '#ff6b6b20' : '#6C5CE720',
    color: on ? '#ff6b6b' : '#a29bfe',
  }),
  cancelBtn: {
    padding: '7px 16px', borderRadius: 8, border: '1px solid #ff6b6b40',
    background: 'none', color: '#ff6b6b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  visitBtn: {
    padding: '7px 16px', borderRadius: 8, border: '1px solid #2a2a3a',
    background: 'none', color: '#888', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  toast: (ok) => ({
    position: 'fixed', top: 20, right: 20, zIndex: 9999,
    background: ok ? '#00b89440' : '#ff6b6b40',
    border: `1px solid ${ok ? '#00b894' : '#ff6b6b'}`,
    color: ok ? '#00b894' : '#ff6b6b',
    padding: '12px 20px', borderRadius: 10, fontSize: 14,
  }),
  modalOverlay: {
    position: 'fixed', inset: 0, background: '#000000aa', zIndex: 8888,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: '#13131f', border: '1px solid #2a2a3a', borderRadius: 14,
    padding: '2rem', maxWidth: 400, width: '90%',
  },
};

export default function MyMemberships() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    try {
      const r = await fetch('/api/fanclub/my-memberships', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMemberships(d.memberships || []);
    } catch (e) {
      addToast('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) load(); }, [token]);

  const toggleAutoRenew = async (id, currentValue) => {
    if (toggling) return;
    setToggling(id);
    try {
      const r = await fetch(`/api/fanclub/memberships/${id}/auto-renew`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_renew: !currentValue }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMemberships(prev => prev.map(m => m.id === id ? { ...m, auto_renew: d.auto_renew } : m));
      addToast('success', d.auto_renew ? '🔄 Đã bật tự động gia hạn' : '⏸ Đã tắt tự động gia hạn');
    } catch (e) {
      addToast('error', e.message);
    } finally {
      setToggling(null);
    }
  };

  const cancelMembership = async () => {
    if (!confirmCancel || cancelling) return;
    setCancelling(true);
    try {
      const r = await fetch(`/api/fanclub/memberships/${confirmCancel.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMemberships(prev => prev.map(m => m.id === confirmCancel.id ? { ...m, status: 'cancelled', auto_renew: false } : m));
      addToast('success', '✅ Đã hủy membership. Quyền lợi còn đến hết hạn.');
      setConfirmCancel(null);
    } catch (e) {
      addToast('error', e.message);
    } finally {
      setCancelling(false);
    }
  };

  const activeMemberships   = memberships.filter(m => m.status === 'active');
  const inactiveMemberships = memberships.filter(m => m.status !== 'active');

  if (loading) return (
    <div>
      <div style={S.h1}>Fan Club của tôi</div>
      {[1, 2, 3].map(i => <SkeletonRow key={i} style={{ marginBottom: 16, height: 100, borderRadius: 14 }} />)}
    </div>
  );

  return (
    <div>

      {confirmCancel && (
        <div style={S.modalOverlay} onClick={() => setConfirmCancel(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Hủy Fan Club?</div>
            <div style={{ fontSize: 14, color: '#888', lineHeight: 1.6, marginBottom: 20 }}>
              Bạn sắp hủy membership <strong style={{ color: '#fff' }}>{confirmCancel.tier_name}</strong> tại{' '}
              <strong style={{ color: '#fff' }}>{confirmCancel.creator_name}</strong>.
              <br /><br />
              Quyền lợi vẫn còn hiệu lực đến <strong style={{ color: '#fdcb6e' }}>{new Date(confirmCancel.expires_at).toLocaleDateString('vi-VN')}</strong> nhưng sẽ không được gia hạn.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ ...S.cancelBtn, flex: 1, opacity: cancelling ? 0.6 : 1 }}
                onClick={cancelMembership}
                disabled={cancelling}
              >
                {cancelling ? 'Đang hủy...' : '✓ Xác nhận hủy'}
              </button>
              <button
                style={{ ...S.visitBtn, flex: 1 }}
                onClick={() => setConfirmCancel(null)}
              >
                Giữ lại
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={S.h1}>Fan Club của tôi</div>

      {memberships.length === 0 ? (
        <div style={S.card}>
          <div style={S.noData}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👑</div>
            <div>Bạn chưa tham gia Fan Club nào.</div>
            <button
              style={{ marginTop: 16, padding: '10px 24px', background: '#6C5CE7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              onClick={() => navigate('/creators')}
            >
              Khám phá Creators
            </button>
          </div>
        </div>
      ) : (
        <>
          {activeMemberships.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
                Đang hoạt động ({activeMemberships.length})
              </div>
              {activeMemberships.map(m => {
                const tc = TIER_COLORS[m.level] || TIER_COLORS[1];
                const daysLeft = Math.ceil((new Date(m.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
                const isExpiringSoon = daysLeft <= 5;
                return (
                  <div key={m.id} style={{ ...S.card, border: `1px solid ${tc.border}`, background: tc.bg }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                      {/* Avatar creator */}
                      <div style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#6C5CE7,#a29bfe)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {m.creator_avatar
                          ? <img src={m.creator_avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          : m.creator_name?.[0]?.toUpperCase()
                        }
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{m.creator_name}</span>
                          <span style={{ ...S.badge(m.status) }}>● {m.status === 'active' ? 'Đang hoạt động' : m.status}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 18 }}>{tc.icon}</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: tc.text }}>{m.tier_name}</span>
                          <span style={{ fontSize: 13, color: '#666' }}>·</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#a29bfe' }}>{Number(m.price_mt).toLocaleString()} MT/tháng</span>
                        </div>

                        {m.perks?.length > 0 && (
                          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                            {m.perks.slice(0, 2).join(' · ')}{m.perks.length > 2 ? ` +${m.perks.length - 2} quyền lợi` : ''}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#666' }}>
                          <span>
                            Hết hạn:{' '}
                            <strong style={{ color: isExpiringSoon ? '#fdcb6e' : '#888' }}>
                              {new Date(m.expires_at).toLocaleDateString('vi-VN')}
                              {isExpiringSoon && ` (còn ${daysLeft} ngày)`}
                            </strong>
                          </span>
                          <span>Gia hạn: <strong style={{ color: '#555' }}>{m.renewal_count} lần</strong></span>
                          <div style={S.autoRenewBadge(m.auto_renew)}>
                            {m.auto_renew ? '🔄 Tự động gia hạn' : '⏸ Không tự động'}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          style={{ ...S.toggleBtn(m.auto_renew), opacity: toggling === m.id ? 0.6 : 1 }}
                          onClick={() => toggleAutoRenew(m.id, m.auto_renew)}
                          disabled={toggling === m.id}
                        >
                          {toggling === m.id ? '...' : m.auto_renew ? '⏸ Tắt auto-renew' : '🔄 Bật auto-renew'}
                        </button>
                        <button
                          style={S.visitBtn}
                          onClick={() => navigate(`/creator/${m.creator_id}`)}
                        >
                          Xem profile
                        </button>
                        <button
                          style={S.cancelBtn}
                          onClick={() => setConfirmCancel(m)}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {inactiveMemberships.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, color: '#333', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
                Đã hết hạn / đã hủy ({inactiveMemberships.length})
              </div>
              {inactiveMemberships.map(m => {
                const tc = TIER_COLORS[m.level] || TIER_COLORS[1];
                return (
                  <div key={m.id} style={{ ...S.card, opacity: 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 22 }}>{tc.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#888' }}>{m.creator_name}</span>
                          <span style={{ fontSize: 13, color: '#555' }}>—</span>
                          <span style={{ fontSize: 13, color: tc.text }}>{m.tier_name}</span>
                          <span style={S.badge(m.status)}>{m.status === 'cancelled' ? 'Đã hủy' : 'Đã hết hạn'}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>
                          Hết hạn {new Date(m.expires_at).toLocaleDateString('vi-VN')} · {Number(m.price_mt).toLocaleString()} MT/tháng
                        </div>
                      </div>
                      <button style={S.visitBtn} onClick={() => navigate(`/creator/${m.creator_id}`)}>
                        Gia hạn
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 24, padding: '1rem 1.25rem', background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 10, fontSize: 13, color: '#555' }}>
        💡 <strong style={{ color: '#888' }}>Auto-renew:</strong> Khi bật, hệ thống sẽ tự trừ MT và gia hạn 30 ngày trước khi membership hết hạn. Nếu số dư không đủ, auto-renew sẽ tự tắt và bạn nhận thông báo.
      </div>
    </div>
  );
}
