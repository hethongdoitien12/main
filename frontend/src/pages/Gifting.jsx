import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useSSE } from '../hooks/useSSE.js';
import api from '../api.js';

const GIFT_PRESETS = [
  { label: '🌟 Sao', amount: 50,   color: '#fdcb6e' },
  { label: '💎 Kim cương', amount: 200,  color: '#74b9ff' },
  { label: '🚀 Rocket', amount: 500,  color: '#a29bfe' },
  { label: '👑 Vương miện', amount: 1000, color: '#fd79a8' },
  { label: '🔥 Fire', amount: 2000, color: '#e17055' },
  { label: '💝 Super Love', amount: 5000, color: '#ff6b6b' },
];

const S = {
  h1: { fontSize:24, fontWeight:700, color:'#fff', marginBottom:'1.75rem' },
  layout: { display:'grid', gridTemplateColumns:'1fr 380px', gap:20, alignItems:'start' },
  card: { background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:12, padding:'1.5rem' },
  sectionTitle: { fontSize:14, fontWeight:600, color:'#aaa', marginBottom:'1rem' },
  giftGrid: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:'1.5rem' },
  giftBtn: (sel, color) => ({
    padding:'14px 10px', borderRadius:10, border: sel ? `2px solid ${color}` : '1px solid #1e1e2e',
    background: sel ? `${color}15` : '#13131f', cursor:'pointer', textAlign:'center', transition:'all .15s'
  }),
  giftLabel: { fontSize:13, color:'#ddd', display:'block', marginTop:4 },
  giftAmount: (color) => ({ fontSize:16, fontWeight:700, color }),
  input: { width:'100%', padding:'10px 14px', background:'#13131f', border:'1px solid #1e1e2e', borderRadius:8, color:'#e8e6e0', fontSize:14, outline:'none', marginBottom:'1rem' },
  sendBtn: (dis) => ({ width:'100%', padding:'12px', background: dis ? '#1e1e2e' : 'linear-gradient(135deg,#6C5CE7,#fd79a8)', border:'none', borderRadius:8, color: dis ? '#555' : '#fff', fontSize:15, fontWeight:700, cursor: dis ? 'not-allowed' : 'pointer' }),
  balBox: { background:'#13131f', borderRadius:8, padding:'10px 14px', marginBottom:'1rem', display:'flex', justifyContent:'space-between', alignItems:'center' },
  feedBox: { background:'#0a0a0f', borderRadius:10, height:320, overflow:'hidden', position:'relative', border:'1px solid #1a1a28' },
  feedInner: { position:'absolute', bottom:0, left:0, right:0, padding:'12px', display:'flex', flexDirection:'column', gap:6 },
  feedItem: (color) => ({ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:`${color}10`, borderRadius:8, border:`1px solid ${color}30`, animation:'slideIn .3s ease' }),
  customRow: { display:'flex', gap:8, marginBottom:'1rem' },
  customInput: { flex:1, padding:'10px 14px', background:'#13131f', border:'1px solid #1e1e2e', borderRadius:8, color:'#e8e6e0', fontSize:14, outline:'none' },
  success: { color:'#6fcf97', fontSize:13, padding:'10px 12px', background:'rgba(111,207,151,.08)', borderRadius:8, marginBottom:'1rem', textAlign:'center' },
  err: { color:'#ff6b6b', fontSize:13, padding:'10px 12px', background:'rgba(255,107,107,.08)', borderRadius:8, marginBottom:'1rem' },
};

// Floating gift animation component
function FloatingGift({ gift, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position:'fixed', left:`${20 + Math.random()*60}%`, bottom:'15%', fontSize:40, animation:'floatUp 2s ease forwards', zIndex:1000, pointerEvents:'none' }}>
      {gift.label.split(' ')[0]}
    </div>
  );
}

const GIFT_EMOJI_MAP = {
  50: { label: '🌟 Sao', color: '#fdcb6e' },
  200: { label: '💎 Kim cương', color: '#74b9ff' },
  500: { label: '🚀 Rocket', color: '#a29bfe' },
  1000: { label: '👑 Vương miện', color: '#fd79a8' },
  2000: { label: '🔥 Fire', color: '#e17055' },
  5000: { label: '💝 Super Love', color: '#ff6b6b' },
};

function resolveGiftStyle(amount) {
  const preset = GIFT_EMOJI_MAP[amount];
  if (preset) return preset;
  if (amount >= 2000) return { label: '💝 Super Love', color: '#ff6b6b' };
  if (amount >= 1000) return { label: '👑 Vương miện', color: '#fd79a8' };
  if (amount >= 500)  return { label: '🚀 Rocket', color: '#a29bfe' };
  if (amount >= 200)  return { label: '💎 Kim cương', color: '#74b9ff' };
  return { label: '🌟 Sao', color: '#fdcb6e' };
}

export default function Gifting() {
  const { wallet, token, refreshWallet } = useAuth();
  const [selected, setSelected] = useState(GIFT_PRESETS[0]);
  const [customAmount, setCustomAmount] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [feed, setFeed] = useState([]);
  const [floaters, setFloaters] = useState([]);
  const [liveCount, setLiveCount] = useState(0);

  const finalAmount = customAmount ? parseInt(customAmount) : selected?.amount ?? 0;

  const addToFeed = (item) => {
    setFeed(prev => [...prev.slice(-9), item]);
  };

  useSSE(token, {
    gift_feed: (data) => {
      const style = resolveGiftStyle(data.amount);
      addToFeed({
        ...style,
        amount: data.amount,
        senderName: data.senderName,
        message: data.message,
        time: new Date(data.time),
        live: true,
      });
      setLiveCount(c => c + 1);
      setFloaters(f => [...f, { id: Date.now(), ...style }]);
    },
  });

  const send = async () => {
    if (!receiverId || finalAmount < 10) return;
    setLoading(true); setMsg(null);
    try {
      const r = await api.wallet.tip({ receiverId, amountXu: finalAmount, message }, token);
      const receiverAmt = r.receiver_amount ?? r.receiverAmount ?? finalAmount;
      setMsg({ type:'success', text:`Đã gửi ${selected?.label ?? '🎁'} ${finalAmount.toLocaleString()} XU! Creator nhận ${receiverAmt.toLocaleString()} XU` });
      setMessage('');
      await refreshWallet();
    } catch (err) {
      setMsg({ type:'error', text: err.message });
    } finally { setLoading(false); }
  };

  return (
    <div>
      <style>{`
        @keyframes floatUp { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-200px) scale(1.5);opacity:0} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
      `}</style>

      {floaters.map(f => (
        <FloatingGift key={f.id} gift={f} onDone={() => setFloaters(fl => fl.filter(x => x.id !== f.id))} />
      ))}

      <div style={S.h1}>Tip & Gifting</div>

      <div style={S.layout}>
        <div style={S.card}>
          <div style={S.sectionTitle}>Chọn quà tặng</div>

          <div style={S.giftGrid}>
            {GIFT_PRESETS.map(g => (
              <button key={g.label} style={S.giftBtn(selected.label===g.label, g.color)} onClick={() => { setSelected(g); setCustomAmount(''); }}>
                <span style={{ fontSize:24 }}>{g.label.split(' ')[0]}</span>
                <span style={S.giftLabel}>{g.label.split(' ').slice(1).join(' ')}</span>
                <span style={S.giftAmount(g.color)}>{g.amount.toLocaleString()} XU</span>
              </button>
            ))}
          </div>

          <div style={S.sectionTitle}>Hoặc nhập số XU tuỳ ý</div>
          <div style={S.customRow}>
            <input style={S.customInput} type="number" placeholder="Số XU (tối thiểu 10)" min="10"
              value={customAmount} onChange={e => { setCustomAmount(e.target.value); setSelected(null); }} />
          </div>

          <div style={S.sectionTitle}>Gửi đến creator</div>
          <input style={S.input} placeholder="User ID của creator" value={receiverId} onChange={e => setReceiverId(e.target.value)} />
          <input style={S.input} placeholder="Lời nhắn (tuỳ chọn)" value={message} onChange={e => setMessage(e.target.value)} />

          <div style={S.balBox}>
            <span style={{ fontSize:13, color:'#666' }}>Số dư của anh</span>
            <span style={{ fontSize:16, fontWeight:700, color:'#a29bfe' }}>{Number(wallet?.balance||0).toLocaleString()} XU</span>
          </div>

          {msg && <div style={msg.type==='success' ? S.success : S.err}>{msg.text}</div>}

          {finalAmount > 0 && (
            <div style={{ fontSize:12, color:'#555', marginBottom:'1rem', textAlign:'center' }}>
              Platform phí 5% = {Math.floor(finalAmount * 0.05).toLocaleString()} XU · Creator nhận {Math.floor(finalAmount * 0.95).toLocaleString()} XU
            </div>
          )}

          <button style={S.sendBtn(!receiverId || finalAmount < 10 || loading)} onClick={send}
            disabled={!receiverId || finalAmount < 10 || loading}>
            {loading ? 'Đang gửi...' : `Gửi ${selected?.label || '🎁 Quà'} ${finalAmount ? finalAmount.toLocaleString()+' XU' : ''}`}
          </button>
        </div>

        <div>
          <div style={{ ...S.card, marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
              <div style={S.sectionTitle}>Live Gift Feed</div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#6fcf97', display:'inline-block', animation:'pulse 1.5s infinite' }}/>
                <span style={{ fontSize:11, color:'#6fcf97' }}>LIVE{liveCount > 0 ? ` · ${liveCount} gift` : ''}</span>
              </div>
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
            <div style={S.feedBox}>
              <div style={S.feedInner}>
                {feed.length === 0 && <div style={{ color:'#333', fontSize:12, textAlign:'center', marginTop:'6rem' }}>Chờ gift realtime...</div>}
                {feed.map((f, i) => (
                  <div key={i} style={S.feedItem(f.color)}>
                    <span style={{ fontSize:20 }}>{f.label.split(' ')[0]}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <span style={{ fontSize:12, color:'#aaa' }}>
                        {f.senderName || 'Bạn'} gửi{' '}
                      </span>
                      <span style={{ fontSize:13, fontWeight:600, color: f.color }}>{f.amount.toLocaleString()} XU</span>
                      {f.message && <div style={{ fontSize:11, color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>"{f.message}"</div>}
                    </div>
                    <span style={{ fontSize:10, color:'#444', flexShrink:0 }}>
                      {f.time instanceof Date ? f.time.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.sectionTitle}>Tích hợp vào hệ thống của anh</div>
            <div style={{ fontSize:12, color:'#666', lineHeight:1.8 }}>
              Gọi API này từ hệ thống vé / thế giới ảo / livestream:<br/>
              <code style={{ fontSize:11, color:'#a29bfe', background:'#13131f', padding:'2px 6px', borderRadius:4 }}>
                POST /api/wallet/tip
              </code>
              <br/>với body: receiverId, amountXu, message
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
