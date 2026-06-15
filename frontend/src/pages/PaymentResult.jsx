import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

export default function PaymentResult() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { token, refreshWallet } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | success | failed | unknown

  useEffect(() => {
    const resultCode  = params.get('resultCode');   // MoMo
    const returnCode  = params.get('status');        // ZaloPay
    const depositId   = params.get('orderId') || params.get('apptransid');
    const momoSuccess = resultCode === '0';
    const zaloSuccess = returnCode === '1';

    if (momoSuccess || zaloSuccess) {
      setStatus('success');
      refreshWallet?.();
    } else if (resultCode !== null || returnCode !== null) {
      setStatus('failed');
    } else {
      setStatus('unknown');
    }
  }, []);

  const S = {
    wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' },
    card: { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 16, padding: '2.5rem 2rem', maxWidth: 400, width: '100%', textAlign: 'center' },
    icon: { fontSize: 56, marginBottom: '1rem' },
    title: (c) => ({ fontSize: 22, fontWeight: 700, color: c, marginBottom: '0.5rem' }),
    sub:  { fontSize: 14, color: '#666', lineHeight: 1.7, marginBottom: '1.75rem' },
    btn:  (c) => ({ padding: '11px 28px', background: c || '#6C5CE7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }),
  };

  const content = {
    loading: { icon: '⏳', title: 'Đang xác nhận...', color: '#aaa',   sub: 'Vui lòng chờ.' },
    success: { icon: '✅', title: 'Thanh toán thành công!', color: '#6fcf97', sub: 'XU đã được cộng vào ví của bạn.' },
    failed:  { icon: '❌', title: 'Thanh toán thất bại', color: '#ff6b6b', sub: 'Giao dịch không thành công hoặc bị huỷ.' },
    unknown: { icon: '❓', title: 'Kết quả không xác định', color: '#fdcb6e', sub: 'Vui lòng kiểm tra lịch sử ví.' },
  }[status];

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.icon}>{content.icon}</div>
        <div style={S.title(content.color)}>{content.title}</div>
        <div style={S.sub}>{content.sub}</div>
        <button style={S.btn(status === 'success' ? '#6C5CE7' : '#2a2a3a')}
          onClick={() => navigate('/wallet')}>
          Về Ví XU
        </button>
      </div>
    </div>
  );
}
