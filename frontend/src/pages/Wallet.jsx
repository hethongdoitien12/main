import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const S = {
  h1:     { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: '1.75rem' },
  tabs:   { display: 'flex', gap: 6, marginBottom: '1.75rem', padding: '4px', background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 10, width: 'fit-content' },
  tab:    (a) => ({ padding: '8px 20px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: a ? '#6C5CE7' : 'transparent', color: a ? '#fff' : '#666', transition: 'all .15s' }),
  card:   { background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.75rem', maxWidth: 500 },
  label:  { display: 'block', fontSize: 13, fontWeight: 500, color: '#999', marginBottom: 6 },
  input:  { width: '100%', padding: '10px 14px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 8, color: '#e8e6e0', fontSize: 14, outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 14px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 8, color: '#e8e6e0', fontSize: 14, outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' },
  btn:    (dis, color) => ({ width: '100%', padding: '11px', background: dis ? '#2a2a3a' : (color || '#6C5CE7'), border: 'none', borderRadius: 8, color: dis ? '#555' : '#fff', fontSize: 15, fontWeight: 600, cursor: dis ? 'not-allowed' : 'pointer' }),
  btnSm:  (color) => ({ padding: '9px 18px', background: color || '#6C5CE7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }),
  success:{ color: '#6fcf97', fontSize: 13, padding: '12px 14px', background: 'rgba(111,207,151,.08)', border: '1px solid rgba(111,207,151,.2)', borderRadius: 8, marginBottom: '1rem' },
  err:    { color: '#ff6b6b', fontSize: 13, padding: '12px 14px', background: 'rgba(255,107,107,.08)', border: '1px solid rgba(255,107,107,.2)', borderRadius: 8, marginBottom: '1rem' },
  info:   { fontSize: 12, color: '#666', padding: '10px 12px', background: '#13131f', borderRadius: 8, marginTop: '1rem', lineHeight: 1.7 },
  balRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '14px 18px', background: '#13131f', borderRadius: 10, maxWidth: 500 },
  balLbl: { fontSize: 12, color: '#555' },
  balVal: { fontSize: 20, fontWeight: 700, color: '#a29bfe' },
  step:   { background: '#0d1117', border: '1px solid #1e2a1e', borderRadius: 12, padding: '1.5rem', marginTop: '1rem' },
  stepTitle: { fontSize: 15, fontWeight: 600, color: '#6fcf97', marginBottom: '1rem' },
  gwBtn:  (sel) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: sel ? '#1a1a2e' : '#13131f', border: `1px solid ${sel ? '#6C5CE7' : '#1e1e2e'}`, borderRadius: 10, cursor: 'pointer', marginBottom: 8, width: '100%', textAlign: 'left', transition: 'all .15s' }),
  preset: (sel) => ({ padding: '8px 14px', background: sel ? '#6C5CE7' : '#13131f', border: `1px solid ${sel ? '#6C5CE7' : '#1e1e2e'}`, borderRadius: 8, color: sel ? '#fff' : '#aaa', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }),
  divider:{ height: 1, background: '#1e1e2e', margin: '1.25rem 0' },
};

const GATEWAYS = [
  { value: 'momo',          label: 'MoMo',                icon: '🟣', desc: 'Ví điện tử MoMo — sandbox' },
  { value: 'zalopay',       label: 'ZaloPay',             icon: '🔵', desc: 'ZaloPay — sandbox' },
  { value: 'bank_transfer', label: 'Chuyển khoản ngân hàng', icon: '🏦', desc: 'Admin xác nhận thủ công' },
];

const PRESETS = [10000, 50000, 100000, 200000, 500000];

export default function Wallet() {
  const { wallet, token, refreshWallet } = useAuth();
  const [tab, setTab]       = useState('deposit');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]       = useState(null);

  // KYC state
  const [kyc, setKyc]         = useState(null);
  const [kycForm, setKycForm] = useState({ fullName: '', idNumber: '' });
  const [kycLoading, setKycLoading] = useState(false);
  const [kycMsg, setKycMsg]   = useState(null);

  const loadKyc = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch('/api/user/kyc', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setKyc(await r.json());
    } catch {}
  }, [token]);

  useEffect(() => { loadKyc(); }, [loadKyc]);

  const submitKyc = async () => {
    if (!kycForm.fullName.trim() || !kycForm.idNumber.trim()) return;
    setKycLoading(true); setKycMsg(null);
    try {
      const r = await fetch('/api/user/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: kycForm.fullName, id_number: kycForm.idNumber }),
      });
      const d = await r.json();
      if (d.ok) { setKycMsg({ type: 'success', text: '✅ Hồ sơ KYC đã nộp! Admin sẽ xem xét trong 1-2 ngày.' }); loadKyc(); }
      else setKycMsg({ type: 'error', text: d.error });
    } catch (e) { setKycMsg({ type: 'error', text: e.message }); }
    finally { setKycLoading(false); }
  };

  // Deposit state
  const [amount, setAmount]   = useState('');
  const [gateway, setGateway] = useState('momo');
  const [payStep, setPayStep] = useState(null); // { deposit_id, pay_url, gateway, amount_vnd }
  const [confirming, setConfirming] = useState(false);

  // Withdraw state
  const [withdraw, setWithdraw] = useState({ amountXu: '', bankName: '', bankAccount: '', accountName: '' });

  // Tip state
  const [tip, setTip] = useState({ receiverId: '', amountXu: '', message: '' });

  // History
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const handleW = (setter) => (e) => setter(f => ({ ...f, [e.target.name]: e.target.value }));

  const switchTab = (t) => { setTab(t); setMsg(null); if (t === 'history') loadHistory(); };

  async function loadHistory() {
    setHistLoading(true);
    try {
      const r = await api.wallet.transactions({ limit: 30 }, token);
      setHistory(r.transactions || []);
    } catch (e) { console.error(e); }
    finally { setHistLoading(false); }
  }

  // ── Deposit: bước 1 — tạo payment link ──────────────────────────────────
  const submitDeposit = async () => {
    if (!amount || parseInt(amount) < 10000) return;
    setLoading(true); setMsg(null); setPayStep(null);
    try {
      const r = await api.wallet.depositCreate({ vnd_amount: parseInt(amount), payment_gateway: gateway }, token);

      if (gateway === 'bank_transfer') {
        setPayStep({ deposit_id: r.deposit_id, gateway, amount_vnd: r.amount_vnd, pay_url: null });
      } else if (r.pay_url) {
        setPayStep({ deposit_id: r.deposit_id, gateway, amount_vnd: r.amount_vnd, pay_url: r.pay_url, qr_code_url: r.qr_code_url });
        window.open(r.pay_url, '_blank');
      } else if (r.gateway_error) {
        setMsg({ type: 'error', text: `Lỗi kết nối ${gateway.toUpperCase()}: ${r.gateway_error}` });
        setPayStep({ deposit_id: r.deposit_id, gateway, amount_vnd: r.amount_vnd, pay_url: null, sandbox_only: true });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
    finally { setLoading(false); }
  };

  // ── Deposit: bước 2 — xác nhận sau khi thanh toán (dev/manual) ──────────
  const confirmDeposit = async () => {
    if (!payStep) return;
    setConfirming(true); setMsg(null);
    try {
      await api.wallet.depositConfirm({ deposit_id: payStep.deposit_id }, token);
      setMsg({ type: 'success', text: `✅ Nạp thành công! +${parseInt(payStep.amount_vnd).toLocaleString()} MT vào ví` });
      setPayStep(null);
      setAmount('');
      await refreshWallet();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
    finally { setConfirming(false); }
  };

  // ── Withdraw ─────────────────────────────────────────────────────────────
  const submitWithdraw = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await api.withdrawals.create({
        amount_xu: parseInt(withdraw.amountXu),
        bank_name: withdraw.bankName,
        bank_account: withdraw.bankAccount,
        account_name: withdraw.accountName,
      }, token);
      setMsg({ type: 'success', text: `Yêu cầu rút đã gửi! Bạn sẽ nhận ${r.amount_vnd?.toLocaleString() || (parseInt(withdraw.amountXu) * 0.9).toLocaleString()}đ sau khi admin duyệt` });
      setWithdraw({ amountXu: '', bankName: '', bankAccount: '', accountName: '' });
      await refreshWallet();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
    finally { setLoading(false); }
  };

  // ── Tip ──────────────────────────────────────────────────────────────────
  const submitTip = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await api.wallet.tip({ receiver_id: tip.receiverId, amount_xu: parseInt(tip.amountXu), message: tip.message }, token);
      setMsg({ type: 'success', text: `Đã gửi tip! Creator nhận ${r.receiver_amount?.toLocaleString() || ''} MT` });
      setTip({ receiverId: '', amountXu: '', message: '' });
      await refreshWallet();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
    finally { setLoading(false); }
  };

  const TX_LABEL = { deposit:'Nạp tiền', withdrawal:'Rút tiền', earn_quest:'Quest', earn_game:'Game', earn_referral:'Giới thiệu', earn_content:'Content', earn_bonus:'Bonus', spend_ticket:'Mua vé', spend_item:'Mua item', tip_sent:'Tip gửi', tip_received:'Tip nhận', refund:'Hoàn tiền', expire:'Hết hạn', admin_adjust:'Admin' };

  return (
    <div>
      <div style={S.h1}>Ví MT</div>

      <div style={S.balRow}>
        <div>
          <div style={S.balLbl}>Số dư</div>
          <div style={S.balVal}>{Number(wallet?.balance || 0).toLocaleString()} MT</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={S.balLbl}>Tổng đã nạp</div>
          <div style={{ ...S.balVal, fontSize: 15, color: '#6fcf97' }}>{Number(wallet?.total_deposited || wallet?.total_earned || 0).toLocaleString()} MT</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={S.balLbl}>Đã tiêu</div>
          <div style={{ ...S.balVal, fontSize: 15, color: '#fd79a8' }}>{Number(wallet?.total_spent || 0).toLocaleString()} MT</div>
        </div>
      </div>

      {/* KYC banner — hiện khi balance > 800k và chưa verified */}
      {wallet?.balance > 800_000 && kyc && kyc.kyc_status !== 'verified' && (
        <div style={{ background: kyc.kyc_status === 'pending' ? '#6C5CE715' : '#fdcb6e12', border: `1px solid ${kyc.kyc_status === 'pending' ? '#6C5CE740' : '#fdcb6e40'}`, borderRadius: 10, padding: '12px 16px', maxWidth: 500, marginBottom: '1.25rem', fontSize: 13 }}>
          {kyc.kyc_status === 'pending' ? (
            <div style={{ color: '#a29bfe' }}>
              🔍 <strong>KYC đang chờ xét duyệt</strong> — Admin sẽ xem xét hồ sơ của bạn trong 1–2 ngày làm việc.
            </div>
          ) : (
            <div style={{ color: '#fdcb6e' }}>
              ⚠️ <strong>Xác minh danh tính</strong> — Số dư của bạn trên 800,000 MT. Để rút trên 1,000,000 MT cần KYC.
              <button onClick={() => switchTab('kyc')} style={{ marginLeft: 12, padding: '3px 10px', background: '#fdcb6e20', border: '1px solid #fdcb6e60', borderRadius: 6, color: '#fdcb6e', fontSize: 12, cursor: 'pointer' }}>
                Xác minh ngay →
              </button>
            </div>
          )}
        </div>
      )}

      <div style={S.tabs}>
        {[['deposit','💳 Nạp MT'],['withdraw','🏦 Rút MT'],['tip','💝 Gửi Tip'],['history','📋 Lịch sử'],['kyc','🪪 KYC']].map(([k, l]) => (
          <button key={k} style={S.tab(tab === k)} onClick={() => switchTab(k)}>{l}</button>
        ))}
      </div>

      <div style={S.card}>
        {msg && <div style={msg.type === 'success' ? S.success : S.err}>{msg.text}</div>}

        {/* ── TAB: NẠP TIỀN ── */}
        {tab === 'deposit' && !payStep && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
              {PRESETS.map(p => (
                <button key={p} style={S.preset(parseInt(amount) === p)} onClick={() => setAmount(String(p))}>
                  {p.toLocaleString()}đ
                </button>
              ))}
            </div>

            <label style={S.label}>Số tiền (VNĐ) — tối thiểu 10,000</label>
            <input style={S.input} type="number" placeholder="100000" min="10000" step="10000"
              value={amount} onChange={e => setAmount(e.target.value)} />

            {amount && parseInt(amount) >= 10000 && (
              <div style={{ ...S.info, marginTop: 0, marginBottom: '1rem', color: '#a29bfe', fontWeight: 600 }}>
                Bạn nhận: {parseInt(amount).toLocaleString()} MT &nbsp;·&nbsp; Tỷ giá 1 VNĐ = 1 MT · Miễn phí nạp
              </div>
            )}

            <label style={S.label}>Phương thức thanh toán</label>
            {GATEWAYS.map(gw => (
              <button key={gw.value} style={S.gwBtn(gateway === gw.value)} onClick={() => setGateway(gw.value)}>
                <span style={{ fontSize: 20 }}>{gw.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: gateway === gw.value ? '#a29bfe' : '#ccc' }}>{gw.label}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{gw.desc}</div>
                </div>
                {gateway === gw.value && <span style={{ marginLeft: 'auto', color: '#6C5CE7', fontSize: 18 }}>✓</span>}
              </button>
            ))}

            <button style={{ ...S.btn(!amount || parseInt(amount) < 10000 || loading), marginTop: '0.5rem' }}
              onClick={submitDeposit} disabled={!amount || parseInt(amount) < 10000 || loading}>
              {loading ? 'Đang tạo đơn...' : `Nạp qua ${GATEWAYS.find(g=>g.value===gateway)?.label}`}
            </button>
          </>
        )}

        {/* ── BƯỚC 2: Đã tạo đơn — chờ thanh toán ── */}
        {tab === 'deposit' && payStep && (
          <div style={S.step}>
            <div style={S.stepTitle}>Bước 2 — Hoàn tất thanh toán</div>

            <div style={{ fontSize: 13, color: '#aaa', marginBottom: '1rem', lineHeight: 1.7 }}>
              Đơn nạp: <strong style={{ color: '#fff' }}>{parseInt(payStep.amount_vnd).toLocaleString()} VNĐ</strong><br />
              Mã đơn: <span style={{ color: '#555', fontFamily: 'monospace', fontSize: 11 }}>{payStep.deposit_id}</span>
            </div>

            {payStep.pay_url && (
              <>
                <a href={payStep.pay_url} target="_blank" rel="noreferrer"
                  style={{ display: 'block', textAlign: 'center', padding: '11px', background: '#1a1a2e', border: '1px solid #6C5CE7', borderRadius: 8, color: '#a29bfe', fontWeight: 600, marginBottom: 12, textDecoration: 'none' }}>
                  🔗 Mở trang thanh toán {payStep.gateway.toUpperCase()} ↗
                </a>
                <div style={S.info}>
                  Tab mới đã mở. Hoàn tất thanh toán trên {payStep.gateway.toUpperCase()}, sau đó bấm xác nhận bên dưới.
                  <br />Trong môi trường thực, MT sẽ được cộng tự động qua IPN webhook.
                </div>
              </>
            )}

            {payStep.sandbox_only && (
              <div style={{ ...S.info, color: '#fdcb6e', borderColor: '#fdcb6e22', border: '1px solid #fdcb6e22', marginBottom: 12 }}>
                ⚠️ Gateway sandbox không kết nối được — dùng nút xác nhận thủ công để test.
              </div>
            )}

            {payStep.gateway === 'bank_transfer' && (
              <div style={{ ...S.info, marginBottom: 12 }}>
                <strong style={{ color: '#ccc' }}>Thông tin chuyển khoản:</strong><br />
                Ngân hàng: <strong>MB Bank</strong> · STK: <strong>0001234567890</strong><br />
                Nội dung: <strong style={{ color: '#a29bfe' }}>NAPXU {payStep.deposit_id.slice(0, 8).toUpperCase()}</strong><br />
                Số tiền: <strong>{parseInt(payStep.amount_vnd).toLocaleString()}đ</strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
              <button style={{ ...S.btnSm('#6fcf97'), flex: 1 }} onClick={confirmDeposit} disabled={confirming}>
                {confirming ? 'Đang xác nhận...' : '✅ Tôi đã thanh toán'}
              </button>
              <button style={{ ...S.btnSm('#2a2a3a') }} onClick={() => { setPayStep(null); setMsg(null); }}>
                Huỷ
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: RÚT MT ── */}
        {tab === 'withdraw' && (
          <>
            <label style={S.label}>Số MT muốn rút (tối thiểu 50,000)</label>
            <input style={S.input} type="number" name="amountXu" placeholder="50000" min="50000"
              value={withdraw.amountXu} onChange={handleW(setWithdraw)} />
            <label style={S.label}>Tên ngân hàng</label>
            <input style={S.input} name="bankName" placeholder="Vietcombank / Techcombank / MB Bank..." value={withdraw.bankName} onChange={handleW(setWithdraw)} />
            <label style={S.label}>Số tài khoản</label>
            <input style={S.input} name="bankAccount" placeholder="0123456789" value={withdraw.bankAccount} onChange={handleW(setWithdraw)} />
            <label style={S.label}>Tên chủ tài khoản</label>
            <input style={S.input} name="accountName" placeholder="NGUYEN VAN A" value={withdraw.accountName} onChange={handleW(setWithdraw)} />
            {parseInt(withdraw.amountXu) >= 50000 && (
              <div style={{ ...S.info, marginTop: 0, marginBottom: '1rem' }}>
                Phí rút 10%: <strong style={{ color: '#ff6b6b' }}>{(parseInt(withdraw.amountXu) * 0.1).toLocaleString()} MT</strong>
                &nbsp;·&nbsp; Bạn nhận: <strong style={{ color: '#6fcf97' }}>{(parseInt(withdraw.amountXu) * 0.9).toLocaleString()} VNĐ</strong>
              </div>
            )}
            <button
              style={S.btn(parseInt(withdraw.amountXu || 0) < 50000 || !withdraw.bankAccount || !withdraw.bankName || loading)}
              onClick={submitWithdraw}
              disabled={parseInt(withdraw.amountXu || 0) < 50000 || !withdraw.bankAccount || !withdraw.bankName || loading}>
              {loading ? 'Đang gửi...' : 'Gửi yêu cầu rút'}
            </button>
            <div style={S.info}>Yêu cầu rút sẽ được admin xét duyệt trong 1–3 ngày làm việc.</div>
          </>
        )}

        {/* ── TAB: GỬI TIP ── */}
        {tab === 'tip' && (
          <>
            <label style={S.label}>User ID của creator</label>
            <input style={S.input} name="receiverId" placeholder="UUID của creator (xem trong Admin)" value={tip.receiverId} onChange={handleW(setTip)} />
            <label style={S.label}>Số MT muốn tip (tối thiểu 10)</label>
            <input style={S.input} type="number" name="amountXu" placeholder="100" min="10" value={tip.amountXu} onChange={handleW(setTip)} />
            <label style={S.label}>Lời nhắn (tuỳ chọn)</label>
            <input style={S.input} name="message" placeholder="Ủng hộ bạn nhé!" value={tip.message} onChange={handleW(setTip)} />
            {parseInt(tip.amountXu) >= 10 && (
              <div style={{ ...S.info, marginTop: 0, marginBottom: '1rem' }}>
                Creator nhận: <strong style={{ color: '#6fcf97' }}>{(parseInt(tip.amountXu) * 0.95).toLocaleString()} MT</strong>
                &nbsp;·&nbsp; Phí platform 5%: {(parseInt(tip.amountXu) * 0.05).toLocaleString()} MT
              </div>
            )}
            <button
              style={S.btn(!tip.receiverId || parseInt(tip.amountXu || 0) < 10 || loading)}
              onClick={submitTip}
              disabled={!tip.receiverId || parseInt(tip.amountXu || 0) < 10 || loading}>
              {loading ? 'Đang gửi...' : '💝 Gửi Tip'}
            </button>
          </>
        )}

        {/* ── TAB: KYC ── */}
        {tab === 'kyc' && (
          <div>
            {kycMsg && <div style={kycMsg.type === 'success' ? S.success : S.err}>{kycMsg.text}</div>}

            {kyc?.kyc_status === 'verified' ? (
              <div style={{ ...S.success, textAlign: 'center', padding: '1.5rem' }}>
                ✅ <strong>Đã xác minh KYC</strong><br />
                <span style={{ fontSize: 12, color: '#555', marginTop: 4, display: 'block' }}>Bạn có thể rút không giới hạn</span>
              </div>
            ) : kyc?.kyc_status === 'pending' ? (
              <div style={{ background: '#6C5CE715', border: '1px solid #6C5CE740', borderRadius: 8, padding: '1.25rem', textAlign: 'center' }}>
                🔍 <strong style={{ color: '#a29bfe' }}>Đang chờ xét duyệt</strong><br />
                <span style={{ fontSize: 12, color: '#555', marginTop: 4, display: 'block' }}>
                  Họ tên: <strong style={{ color: '#ccc' }}>{kyc.kyc_full_name}</strong> · 
                  Nộp lúc: {kyc.kyc_submitted_at ? new Date(kyc.kyc_submitted_at).toLocaleString('vi-VN') : '—'}
                </span>
              </div>
            ) : (
              <>
                <div style={{ ...S.info, marginBottom: '1.25rem', color: '#aaa' }}>
                  📋 Xác minh danh tính để rút trên <strong style={{ color: '#fdcb6e' }}>1,000,000 MT</strong>. Thông tin chỉ dùng để xác minh, không chia sẻ bên thứ ba.
                </div>
                <label style={S.label}>Họ và tên (theo CCCD/CMND)</label>
                <input style={S.input} placeholder="NGUYEN VAN A"
                  value={kycForm.fullName}
                  onChange={e => setKycForm(f => ({ ...f, fullName: e.target.value }))} />
                <label style={S.label}>Số CCCD/CMND (9-12 chữ số)</label>
                <input style={S.input} placeholder="012345678901" maxLength={12}
                  value={kycForm.idNumber}
                  onChange={e => setKycForm(f => ({ ...f, idNumber: e.target.value.replace(/\D/g, '') }))} />
                <button
                  style={S.btn(!kycForm.fullName.trim() || kycForm.idNumber.length < 9 || kycLoading)}
                  disabled={!kycForm.fullName.trim() || kycForm.idNumber.length < 9 || kycLoading}
                  onClick={submitKyc}>
                  {kycLoading ? 'Đang gửi...' : '🪪 Nộp hồ sơ KYC'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── TAB: LỊCH SỬ ── */}
        {tab === 'history' && (
          <div>
            {histLoading && <div style={{ color: '#555', fontSize: 13 }}>Đang tải...</div>}
            {!histLoading && history.length === 0 && (
              <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: '2rem' }}>Chưa có giao dịch nào</div>
            )}
            {history.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #0d0d18' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#ccc', fontWeight: 500 }}>{TX_LABEL[tx.type] || tx.type}</div>
                  <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{new Date(tx.created_at).toLocaleString('vi-VN')}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: tx.amount > 0 ? '#6fcf97' : '#ff6b6b' }}>
                  {tx.amount > 0 ? '+' : ''}{parseInt(tx.amount).toLocaleString()} MT
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
