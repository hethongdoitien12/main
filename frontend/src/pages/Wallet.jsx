import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const S = {
  h1: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: '1.75rem' },
  tabs: { display: 'flex', gap: 6, marginBottom: '1.75rem', padding: '4px', background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 10, width: 'fit-content' },
  tab: (a) => ({ padding: '8px 20px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: a ? '#6C5CE7' : 'transparent', color: a ? '#fff' : '#666', transition: 'all .15s' }),
  card: { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.75rem', maxWidth: 480 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#999', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 8, color: '#e8e6e0', fontSize: 14, outline: 'none', marginBottom: '1rem' },
  select: { width: '100%', padding: '10px 14px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 8, color: '#e8e6e0', fontSize: 14, outline: 'none', marginBottom: '1rem' },
  btn: (dis) => ({ width: '100%', padding: '11px', background: dis ? '#2a2a3a' : '#6C5CE7', border: 'none', borderRadius: 8, color: dis ? '#555' : '#fff', fontSize: 15, fontWeight: 600, cursor: dis ? 'not-allowed' : 'pointer' }),
  success: { color: '#6fcf97', fontSize: 13, padding: '12px 14px', background: 'rgba(111,207,151,.08)', borderRadius: 8, marginBottom: '1rem' },
  err: { color: '#ff6b6b', fontSize: 13, padding: '12px 14px', background: 'rgba(255,107,107,.08)', borderRadius: 8, marginBottom: '1rem' },
  info: { fontSize: 12, color: '#555', padding: '10px 12px', background: '#13131f', borderRadius: 8, marginTop: '1rem', lineHeight: 1.7 },
  balRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '14px', background: '#13131f', borderRadius: 10 },
  balLbl: { fontSize: 12, color: '#555' },
  balVal: { fontSize: 20, fontWeight: 700, color: '#a29bfe' },
};

const PAYMENT_METHODS = [
  { value: 'momo', label: 'MoMo' },
  { value: 'zalopay', label: 'ZaloPay' },
  { value: 'vnpay', label: 'VNPay' },
  { value: 'bank_transfer', label: 'Chuyển khoản ngân hàng' },
];

export default function Wallet() {
  const { wallet, token, refreshWallet } = useAuth();
  const [tab, setTab] = useState('deposit');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text }

  const [deposit, setDeposit] = useState({ amountVnd: '', paymentMethod: 'momo' });
  const [withdraw, setWithdraw] = useState({ amountXu: '', bankName: '', bankAccount: '', accountName: '' });
  const [tip, setTip] = useState({ receiverId: '', amountXu: '', message: '' });

  const handle = (setter) => (e) => setter(f => ({ ...f, [e.target.name]: e.target.value }));

  const submitDeposit = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await api.wallet.deposit({ amountVnd: parseInt(deposit.amountVnd), paymentMethod: deposit.paymentMethod }, token);
      setMsg({ type: 'success', text: `Nạp thành công! +${r.deposit.amount_xu.toLocaleString()} XU vào ví` });
      setDeposit({ amountVnd: '', paymentMethod: 'momo' });
      await refreshWallet();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
    finally { setLoading(false); }
  };

  const submitWithdraw = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await api.wallet.withdraw({ amountXu: parseInt(withdraw.amountXu), bankName: withdraw.bankName, bankAccount: withdraw.bankAccount, accountName: withdraw.accountName }, token);
      setMsg({ type: 'success', text: `Yêu cầu rút thành công! Bạn sẽ nhận ${r.amountVnd.toLocaleString()}đ (sau phí)` });
      setWithdraw({ amountXu: '', bankName: '', bankAccount: '', accountName: '' });
      await refreshWallet();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
    finally { setLoading(false); }
  };

  const submitTip = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await api.wallet.tip({ receiverId: tip.receiverId, amountXu: parseInt(tip.amountXu), message: tip.message }, token);
      setMsg({ type: 'success', text: `Đã gửi tip thành công! Creator nhận ${r.receiverAmount.toLocaleString()} XU` });
      setTip({ receiverId: '', amountXu: '', message: '' });
      await refreshWallet();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={S.h1}>Ví XU</div>

      <div style={{ ...S.balRow, maxWidth: 480 }}>
        <div><div style={S.balLbl}>Số dư hiện tại</div><div style={S.balVal}>{Number(wallet?.balance || 0).toLocaleString()} XU</div></div>
        <div style={{ textAlign: 'right' }}><div style={S.balLbl}>Tổng đã kiếm</div><div style={{ ...S.balVal, fontSize: 15, color: '#6fcf97' }}>{Number(wallet?.total_earned || 0).toLocaleString()} XU</div></div>
      </div>

      <div style={S.tabs}>
        {[['deposit','Nạp XU'],['withdraw','Rút XU'],['tip','Gửi Tip']].map(([k, l]) => (
          <button key={k} style={S.tab(tab === k)} onClick={() => { setTab(k); setMsg(null); }}>{l}</button>
        ))}
      </div>

      <div style={S.card}>
        {msg && <div style={msg.type === 'success' ? S.success : S.err}>{msg.text}</div>}

        {tab === 'deposit' && (
          <>
            <label style={S.label}>Số tiền (VNĐ)</label>
            <input style={S.input} type="number" name="amountVnd" placeholder="100000" min="10000" step="10000"
              value={deposit.amountVnd} onChange={handle(setDeposit)} />
            <label style={S.label}>Phương thức thanh toán</label>
            <select style={S.select} name="paymentMethod" value={deposit.paymentMethod} onChange={handle(setDeposit)}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            {deposit.amountVnd && (
              <div style={{ ...S.info, marginTop: 0, marginBottom: '1rem' }}>
                Bạn sẽ nhận: <strong style={{ color: '#a29bfe' }}>{parseInt(deposit.amountVnd || 0).toLocaleString()} XU</strong>
                <br />Tỷ giá: 1 VNĐ = 1 XU · Không phí nạp
              </div>
            )}
            <button style={S.btn(!deposit.amountVnd || loading)} onClick={submitDeposit} disabled={!deposit.amountVnd || loading}>
              {loading ? 'Đang xử lý...' : 'Nạp ngay'}
            </button>
            <div style={S.info}>Lưu ý: Trong môi trường thực, bạn sẽ được redirect sang cổng thanh toán. Đây là demo trực tiếp.</div>
          </>
        )}

        {tab === 'withdraw' && (
          <>
            <label style={S.label}>Số XU muốn rút (tối thiểu 50,000)</label>
            <input style={S.input} type="number" name="amountXu" placeholder="50000" min="50000"
              value={withdraw.amountXu} onChange={handle(setWithdraw)} />
            <label style={S.label}>Tên ngân hàng</label>
            <input style={S.input} name="bankName" placeholder="Vietcombank / Techcombank..." value={withdraw.bankName} onChange={handle(setWithdraw)} />
            <label style={S.label}>Số tài khoản</label>
            <input style={S.input} name="bankAccount" placeholder="0123456789" value={withdraw.bankAccount} onChange={handle(setWithdraw)} />
            <label style={S.label}>Tên chủ tài khoản</label>
            <input style={S.input} name="accountName" placeholder="NGUYEN VAN A" value={withdraw.accountName} onChange={handle(setWithdraw)} />
            {withdraw.amountXu >= 50000 && (
              <div style={{ ...S.info, marginTop: 0, marginBottom: '1rem' }}>
                Phí rút 10%: <strong style={{ color: '#ff6b6b' }}>{(parseInt(withdraw.amountXu) * 0.1).toLocaleString()} XU</strong>
                <br />Bạn nhận: <strong style={{ color: '#6fcf97' }}>{(parseInt(withdraw.amountXu) * 0.9).toLocaleString()} VNĐ</strong>
              </div>
            )}
            <button style={S.btn(parseInt(withdraw.amountXu || 0) < 50000 || !withdraw.bankAccount || loading)} onClick={submitWithdraw}
              disabled={parseInt(withdraw.amountXu || 0) < 50000 || !withdraw.bankAccount || loading}>
              {loading ? 'Đang xử lý...' : 'Gửi yêu cầu rút'}
            </button>
          </>
        )}

        {tab === 'tip' && (
          <>
            <label style={S.label}>User ID của creator</label>
            <input style={S.input} name="receiverId" placeholder="UUID của creator..." value={tip.receiverId} onChange={handle(setTip)} />
            <label style={S.label}>Số XU muốn tip (tối thiểu 10)</label>
            <input style={S.input} type="number" name="amountXu" placeholder="100" min="10" value={tip.amountXu} onChange={handle(setTip)} />
            <label style={S.label}>Lời nhắn (tuỳ chọn)</label>
            <input style={S.input} name="message" placeholder="Ủng hộ bạn nhé!" value={tip.message} onChange={handle(setTip)} />
            {tip.amountXu >= 10 && (
              <div style={{ ...S.info, marginTop: 0, marginBottom: '1rem' }}>
                Creator nhận: <strong style={{ color: '#6fcf97' }}>{(parseInt(tip.amountXu) * 0.95).toLocaleString()} XU</strong>
                <br />Phí platform 5%: {(parseInt(tip.amountXu) * 0.05).toLocaleString()} XU
              </div>
            )}
            <button style={S.btn(!tip.receiverId || parseInt(tip.amountXu || 0) < 10 || loading)} onClick={submitTip}
              disabled={!tip.receiverId || parseInt(tip.amountXu || 0) < 10 || loading}>
              {loading ? 'Đang gửi...' : 'Gửi Tip'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
