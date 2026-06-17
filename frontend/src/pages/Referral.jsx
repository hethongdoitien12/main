import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const ROLE_COLORS = { admin: '#a29bfe', creator: '#74b9ff', user: '#6fcf97' };
const AVATAR_PALETTE = ['#6C5CE7','#00cec9','#e17055','#fd79a8','#fdcb6e','#74b9ff','#55efc4'];
const avatarColor = (name = '') => {
  const n = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[n % AVATAR_PALETTE.length];
};

function relTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 30)  return `${days} ngày trước`;
  if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
  return `${Math.floor(days / 365)} năm trước`;
}

const S = {
  h1:    { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub:   { fontSize: 13, color: '#555', marginBottom: '1.75rem' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 },
  card:  { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.2rem 1.4rem' },
  statLbl: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 },
  statVal: { fontSize: 26, fontWeight: 700, color: '#a29bfe' },
  statSub: { fontSize: 11, color: '#444', marginTop: 4 },
  divider: { borderTop: '1px solid #1a1a28', margin: '20px 0' },
  codeBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#13131f', border: '1px solid #2e2e44',
    borderRadius: 10, padding: '14px 16px', marginBottom: 12,
  },
  code: { flex: 1, fontSize: 26, fontWeight: 700, letterSpacing: 4, color: '#fff', fontFamily: 'monospace' },
  linkBox: {
    display: 'flex', gap: 8, alignItems: 'center',
    background: '#0a0a0f', border: '1px solid #1e1e2e',
    borderRadius: 8, padding: '10px 14px', marginBottom: 20,
    fontSize: 12, color: '#444', wordBreak: 'break-all',
  },
  btn: (v = 'primary') => ({
    padding: '9px 18px', border: 'none', borderRadius: 8,
    fontWeight: 600, fontSize: 13, cursor: 'pointer', flexShrink: 0,
    ...(v === 'primary'
      ? { background: '#6C5CE7', color: '#fff' }
      : { background: '#1e1e2e', color: '#aaa', border: '1px solid #2e2e44' }),
  }),
  rewardRow: {
    display: 'flex', gap: 0, background: '#0e0e17',
    border: '1px solid #1e1e2e', borderRadius: 10,
    padding: '14px 0', marginBottom: 20, textAlign: 'center',
  },
  rewardCol: { flex: 1, padding: '0 16px' },
  rewardSep: { width: 1, background: '#1e1e2e', alignSelf: 'stretch' },
  inputBox: {
    width: '100%', boxSizing: 'border-box',
    background: '#0a0a0f', border: '1px solid #2e2e44',
    borderRadius: 8, color: '#e8e6e0', fontSize: 16,
    padding: '12px 14px', letterSpacing: 3,
    fontFamily: 'monospace', textTransform: 'uppercase',
    outline: 'none', marginBottom: 12,
  },
  refCard: (banned) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '13px 16px', background: '#0d0d18',
    border: '1px solid #1a1a28', borderRadius: 10, marginBottom: 8,
    opacity: banned ? 0.45 : 1,
  }),
  avatar: (color) => ({
    width: 40, height: 40, borderRadius: '50%', background: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0,
  }),
  toast: (ok) => ({
    position: 'fixed', bottom: 24, right: 24,
    background: '#1e1e2e', border: `1px solid ${ok ? '#55efc4' : '#e17055'}`,
    borderRadius: 10, padding: '12px 18px', fontSize: 13,
    color: ok ? '#6fcf97' : '#e17055', zIndex: 999,
  }),
};

export default function Referral() {
  const { token, refreshWallet } = useAuth();
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [code,       setCode]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast,      setToast]      = useState(null);
  const [copied,     setCopied]     = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [tab,        setTab]        = useState('all'); // 'all' | 'active' | 'banned'

  const load = () =>
    api.referral.myCode(token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { if (token) load(); }, [token]);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(data.code);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const copyLink = () => {
    navigator.clipboard.writeText(data.invite_link);
    setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000);
    showToast('Đã sao chép link mời!');
  };

  const useCode = async () => {
    if (!code.trim()) return;
    setSubmitting(true);
    try {
      const r = await api.referral.use(code.trim(), token);
      showToast(r.message);
      setCode('');
      await refreshWallet();
      await load();
    } catch (err) { showToast(err.message, false); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div style={{ color: '#444', padding: '2rem' }}>Đang tải...</div>;

  const refs = data?.referrals || [];
  const filteredRefs = refs.filter(r =>
    tab === 'all' ? true : tab === 'active' ? !r.is_banned : r.is_banned
  );
  const activeCount = refs.filter(r => !r.is_banned).length;
  const bannedCount = refs.filter(r =>  r.is_banned).length;
  const avgXu       = refs.length ? Math.round((data?.stats?.total_xu_earned || 0) / refs.length) : 0;

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={S.h1}>Giới thiệu bạn bè</div>
      <div style={S.sub}>Chia sẻ mã của bạn — cả hai cùng nhận thưởng MT</div>

      {/* ── Stats grid ── */}
      <div style={S.grid3}>
        <div style={S.card}>
          <div style={S.statLbl}>Đã mời</div>
          <div style={S.statVal}>{data?.stats?.total_referred ?? 0}</div>
          <div style={S.statSub}>người tham gia</div>
        </div>
        <div style={S.card}>
          <div style={S.statLbl}>Tổng MT nhận</div>
          <div style={{ ...S.statVal, color: '#f6c90e' }}>
            {Number(data?.stats?.total_xu_earned ?? 0).toLocaleString()}
          </div>
          <div style={S.statSub}>từ referral</div>
        </div>
        <div style={S.card}>
          <div style={S.statLbl}>Trung bình / người</div>
          <div style={{ ...S.statVal, color: '#6fcf97' }}>
            {avgXu.toLocaleString()}
          </div>
          <div style={S.statSub}>MT mỗi lần mời</div>
        </div>
      </div>

      {/* ── Code box ── */}
      <div style={S.codeBox}>
        <span style={S.code}>{data?.code}</span>
        <button onClick={copyCode} style={S.btn('primary')}>
          {copied ? '✓ Đã copy' : 'Sao chép mã'}
        </button>
      </div>
      <div style={S.linkBox}>
        <span style={{ flex: 1 }}>{data?.invite_link}</span>
        <button onClick={copyLink} style={{ ...S.btn('secondary'), padding: '6px 12px' }}>
          {copiedLink ? '✓ Đã copy' : 'Copy link'}
        </button>
      </div>

      {/* ── Reward info ── */}
      <div style={S.rewardRow}>
        <div style={S.rewardCol}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#a29bfe' }}>
            +{data?.reward_referrer?.toLocaleString()} MT
          </div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>bạn nhận khi ai đó dùng mã</div>
        </div>
        <div style={S.rewardSep} />
        <div style={S.rewardCol}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#6fcf97' }}>
            +{data?.reward_invitee?.toLocaleString()} MT
          </div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>bạn bè nhận khi dùng mã của bạn</div>
        </div>
        <div style={S.rewardSep} />
        <div style={{ ...S.rewardCol, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 13, color: '#f6c90e' }}>⏰ 90 ngày</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>thời hạn MT referral</div>
        </div>
      </div>

      {/* ── Dùng mã người khác ── */}
      <div style={{ ...S.card, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#ddd', marginBottom: 4 }}>
          Bạn có mã giới thiệu từ người khác?
        </div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 14 }}>
          Nhập mã để nhận +{data?.reward_invitee?.toLocaleString()} MT — chỉ dùng được 1 lần
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            style={S.inputBox}
            placeholder="NHẬP MÃ 8 KÝ TỰ"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={8}
          />
          <button
            onClick={useCode}
            disabled={submitting || code.length < 8}
            style={{ ...S.btn('primary'), opacity: code.length < 8 ? 0.5 : 1 }}>
            {submitting ? 'Đang xử lý...' : 'Áp dụng'}
          </button>
        </div>
      </div>

      {/* ── Danh sách người đã mời ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#ddd' }}>
          Người bạn đã mời ({refs.length})
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            ['all',    `Tất cả (${refs.length})`],
            ['active', `Hoạt động (${activeCount})`],
            ...(bannedCount > 0 ? [['banned', `Bị ban (${bannedCount})`]] : []),
          ].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} style={{
              padding: '4px 12px', borderRadius: 20,
              border: `1px solid ${tab === v ? '#a29bfe' : '#2e2e44'}`,
              background: tab === v ? '#a29bfe20' : 'transparent',
              color: tab === v ? '#a29bfe' : '#555',
              fontSize: 12, cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {filteredRefs.length === 0 && refs.length === 0 && (
        <div style={{ ...S.card, textAlign: 'center', padding: '2.5rem', color: '#333' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🤝</div>
          <div>Chưa có ai dùng mã của bạn.</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Chia sẻ link mời để bắt đầu kiếm MT!</div>
        </div>
      )}

      {filteredRefs.length === 0 && refs.length > 0 && (
        <div style={{ ...S.card, textAlign: 'center', padding: '1.5rem', color: '#333', fontSize: 13 }}>
          Không có kết quả
        </div>
      )}

      {filteredRefs.map((r, i) => {
        const color = avatarColor(r.username);
        const joinDate = new Date(r.created_at);
        return (
          <div key={i} style={S.refCard(r.is_banned)}>
            {/* rank number */}
            <div style={{ width: 22, textAlign: 'center', fontSize: 12, color: '#333', flexShrink: 0 }}>
              #{refs.indexOf(r) + 1}
            </div>

            {/* avatar */}
            <div style={S.avatar(color)}>
              {r.username?.[0]?.toUpperCase()}
            </div>

            {/* info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, color: r.is_banned ? '#555' : '#ddd', fontSize: 14 }}>
                  {r.username}
                </span>
                <span style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 10,
                  color: ROLE_COLORS[r.role] || '#555',
                  background: `${ROLE_COLORS[r.role] || '#555'}15`,
                  border: `1px solid ${ROLE_COLORS[r.role] || '#555'}30`,
                }}>{r.role}</span>
                {r.is_banned && (
                  <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, color: '#ff6b6b', background: '#ff6b6b15', border: '1px solid #ff6b6b30' }}>banned</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 3 }}>
                Tham gia {relTime(r.created_at)} · {joinDate.toLocaleDateString('vi-VN')}
              </div>
              {!r.is_banned && (
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                  Đã kiếm: <span style={{ color: '#74b9ff' }}>{Number(r.invitee_total_earned || 0).toLocaleString()} MT</span>
                  {' · '}Số dư: <span style={{ color: '#6fcf97' }}>{Number(r.invitee_balance || 0).toLocaleString()} MT</span>
                </div>
              )}
            </div>

            {/* MT bạn nhận từ người này */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f6c90e' }}>
                +{Number(r.xu_from_this_referral || 0).toLocaleString()}
                <span style={{ fontSize: 11, color: '#555', fontWeight: 400, marginLeft: 3 }}>MT</span>
              </div>
              <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>bạn đã nhận</div>
            </div>
          </div>
        );
      })}

      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  );
}
