import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const S = {
  h1:   { fontSize:24, fontWeight:700, color:'#fff', marginBottom:'1.75rem' },
  grid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 },
  card: { background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:12, padding:'1.5rem' },
  lbl:  { fontSize:11, color:'#555', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 },
  val:  { fontSize:28, fontWeight:700, color:'#a29bfe' },
  sub:  { fontSize:12, color:'#555', marginTop:4 },
  codeBox: {
    display:'flex', alignItems:'center', gap:10,
    background:'#13131f', border:'1px solid #2e2e44',
    borderRadius:10, padding:'14px 16px', marginBottom:20,
  },
  code: { flex:1, fontSize:26, fontWeight:700, letterSpacing:4, color:'#fff', fontFamily:'monospace' },
  btn:  (variant='primary') => ({
    padding:'10px 18px', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer',
    ...(variant === 'primary'
      ? { background:'#6C5CE7', color:'#fff' }
      : { background:'#1e1e2e', color:'#aaa', border:'1px solid #2e2e44' })
  }),
  linkBox: {
    display:'flex', gap:8, alignItems:'center',
    background:'#0a0a0f', border:'1px solid #1e1e2e', borderRadius:8, padding:'10px 14px',
    marginBottom:24, fontSize:12, color:'#555', wordBreak:'break-all',
  },
  divider: { borderTop:'1px solid #1a1a28', margin:'24px 0' },
  useSection: { background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:12, padding:'1.5rem', marginBottom:20 },
  input: {
    width:'100%', background:'#0a0a0f', border:'1px solid #2e2e44',
    borderRadius:8, color:'#e8e6e0', fontSize:16, padding:'12px 14px',
    letterSpacing:3, fontFamily:'monospace', textTransform:'uppercase',
    outline:'none', marginBottom:12,
  },
  tableWrap: { background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:12, overflow:'hidden' },
  th:   { fontSize:11, color:'#555', textTransform:'uppercase', letterSpacing:'.04em', padding:'10px 16px', textAlign:'left', borderBottom:'1px solid #1a1a28' },
  td:   { fontSize:13, color:'#ddd', padding:'10px 16px', borderBottom:'1px solid #0d0d18' },
  toast:(ok) => ({
    position:'fixed', bottom:24, right:24,
    background:'#1e1e2e', border:`1px solid ${ok ? '#55efc4' : '#e17055'}`,
    borderRadius:10, padding:'12px 18px', fontSize:13,
    color: ok ? '#6fcf97' : '#e17055', zIndex:999,
  }),
};

function relTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 86400000) return `${Math.floor(diff/3600000)} giờ trước`;
  return `${Math.floor(diff/86400000)} ngày trước`;
}

export default function Referral() {
  const { token, refreshWallet } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]   = useState(null);
  const [copied, setCopied] = useState(false);

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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(data.invite_link);
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
    } catch (err) {
      showToast(err.message, false);
    } finally { setSubmitting(false); }
  };

  if (loading) return <div style={{ color:'#444', padding:'2rem' }}>Đang tải...</div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={S.h1}>Giới thiệu bạn bè</div>

      {/* Thống kê */}
      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.lbl}>Người đã mời</div>
          <div style={S.val}>{data?.stats?.total_referred ?? 0}</div>
          <div style={S.sub}>bạn bè đã tham gia</div>
        </div>
        <div style={S.card}>
          <div style={S.lbl}>XU đã kiếm từ referral</div>
          <div style={S.val}>{Number(data?.stats?.total_xu_earned ?? 0).toLocaleString()}</div>
          <div style={S.sub}>tổng XU nhận được</div>
        </div>
      </div>

      {/* Code của mình */}
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:13, color:'#888', marginBottom:10 }}>
          Mã giới thiệu của bạn — bạn bè nhập khi đăng ký để cả hai nhận thưởng
        </div>
        <div style={S.codeBox}>
          <span style={S.code}>{data?.code}</span>
          <button onClick={copyCode} style={S.btn('primary')}>
            {copied ? '✓ Đã copy' : 'Sao chép mã'}
          </button>
        </div>
        <div style={S.linkBox}>
          <span style={{ flex:1 }}>{data?.invite_link}</span>
          <button onClick={copyLink} style={{ ...S.btn('secondary'), padding:'6px 12px', flexShrink:0 }}>
            Copy link
          </button>
        </div>
      </div>

      {/* Phần thưởng info */}
      <div style={{ background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:10, padding:'14px 16px', marginBottom:24, display:'flex', gap:24 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:18, fontWeight:700, color:'#a29bfe' }}>+{data?.reward_referrer?.toLocaleString()} XU</div>
          <div style={{ fontSize:11, color:'#555', marginTop:2 }}>bạn nhận khi ai đó dùng mã</div>
        </div>
        <div style={{ width:1, background:'#1e1e2e' }} />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:18, fontWeight:700, color:'#6fcf97' }}>+{data?.reward_invitee?.toLocaleString()} XU</div>
          <div style={{ fontSize:11, color:'#555', marginTop:2 }}>bạn bè nhận khi dùng mã của bạn</div>
        </div>
        <div style={{ width:1, background:'#1e1e2e' }} />
        <div style={{ textAlign:'center', flex:1 }}>
          <div style={{ fontSize:11, color:'#555', marginTop:2 }}>⏰ XU referral hết hạn sau 90 ngày</div>
        </div>
      </div>

      {/* Dùng mã của người khác */}
      <div style={S.useSection}>
        <div style={{ fontSize:15, fontWeight:600, color:'#ddd', marginBottom:4 }}>Bạn có mã giới thiệu từ người khác?</div>
        <div style={{ fontSize:12, color:'#555', marginBottom:14 }}>Nhập mã để nhận +{data?.reward_invitee?.toLocaleString()} XU — chỉ dùng được 1 lần</div>
        <div style={{ display:'flex', gap:10 }}>
          <input
            style={S.input}
            placeholder="NHẬP MÃ 8 KÝ TỰ"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={8}
          />
          <button
            onClick={useCode}
            disabled={submitting || code.length < 8}
            style={{ ...S.btn('primary'), flexShrink:0, opacity: code.length < 8 ? .5 : 1 }}>
            {submitting ? 'Đang xử lý...' : 'Áp dụng'}
          </button>
        </div>
      </div>

      {/* Bảng người đã mời */}
      {data?.referrals?.length > 0 && (
        <>
          <div style={{ fontSize:15, fontWeight:600, color:'#ddd', marginBottom:12 }}>
            Người bạn đã mời ({data.referrals.length})
          </div>
          <div style={S.tableWrap}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={S.th}>Username</th>
                  <th style={{ ...S.th, textAlign:'right' }}>Tham gia</th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((r, i) => (
                  <tr key={i}>
                    <td style={S.td}>{r.username}</td>
                    <td style={{ ...S.td, textAlign:'right', color:'#555' }}>{relTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data?.referrals?.length === 0 && (
        <div style={{ textAlign:'center', color:'#333', fontSize:13, padding:'2rem', background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:12 }}>
          Chưa có ai dùng mã của bạn. Chia sẻ link để bắt đầu kiếm XU!
        </div>
      )}

      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  );
}
