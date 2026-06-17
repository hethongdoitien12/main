import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useSSE } from '../hooks/useSSE.js';
import api from '../api.js';

const GIFT_PRESETS = [
  { label: '🌟 Sao',        amount: 50,   color: '#fdcb6e' },
  { label: '💎 Kim cương',  amount: 200,  color: '#74b9ff' },
  { label: '🚀 Rocket',     amount: 500,  color: '#a29bfe' },
  { label: '👑 Vương miện', amount: 1000, color: '#fd79a8' },
  { label: '🔥 Fire',       amount: 2000, color: '#e17055' },
  { label: '💝 Super Love', amount: 5000, color: '#ff6b6b' },
];

const GIFT_EMOJI_MAP = {
  50:   { label: '🌟 Sao',        color: '#fdcb6e' },
  200:  { label: '💎 Kim cương',  color: '#74b9ff' },
  500:  { label: '🚀 Rocket',     color: '#a29bfe' },
  1000: { label: '👑 Vương miện', color: '#fd79a8' },
  2000: { label: '🔥 Fire',       color: '#e17055' },
  5000: { label: '💝 Super Love', color: '#ff6b6b' },
};

function resolveGiftStyle(amount) {
  const preset = GIFT_EMOJI_MAP[amount];
  if (preset) return preset;
  if (amount >= 2000) return { label: '💝 Super Love', color: '#ff6b6b' };
  if (amount >= 1000) return { label: '👑 Vương miện', color: '#fd79a8' };
  if (amount >= 500)  return { label: '🚀 Rocket',     color: '#a29bfe' };
  if (amount >= 200)  return { label: '💎 Kim cương',  color: '#74b9ff' };
  return { label: '🌟 Sao', color: '#fdcb6e' };
}

function FloatingGift({ gift, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position:'fixed', left:`${20 + Math.random()*60}%`, bottom:'15%', fontSize:40,
      animation:'floatUp 2s ease forwards', zIndex:1000, pointerEvents:'none' }}>
      {gift.label.split(' ')[0]}
    </div>
  );
}

function Avatar({ url, username, size = 28 }) {
  const letter = (username || '?')[0].toUpperCase();
  if (url) return (
    <img src={url} alt={username} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
  );
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'linear-gradient(135deg,#6C5CE7,#a29bfe)',
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.45,
      fontWeight:700, color:'#fff', flexShrink:0 }}>
      {letter}
    </div>
  );
}

function Toast({ toasts }) {
  return (
    <div style={{ position:'fixed', top:24, right:24, zIndex:2000, display:'flex', flexDirection:'column', gap:10, pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ padding:'12px 18px', borderRadius:10, fontSize:14, fontWeight:600,
          background: t.type === 'success' ? 'rgba(111,207,151,.15)' : 'rgba(255,107,107,.15)',
          border: `1px solid ${t.type === 'success' ? '#6fcf97' : '#ff6b6b'}`,
          color: t.type === 'success' ? '#6fcf97' : '#ff6b6b',
          animation:'toastIn .25s ease', backdropFilter:'blur(8px)', maxWidth:320 }}>
          {t.type === 'success' ? '✅' : '❌'} {t.text}
        </div>
      ))}
    </div>
  );
}

function CreatorSearch({ token, value, onChange }) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchCreators = useCallback(async (q) => {
    setLoading(true);
    try {
      const r = await api.wallet.creators(q, token);
      setOptions(r.creators || []);
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCreators(search), 280);
    return () => clearTimeout(debounceRef.current);
  }, [search, fetchCreators]);

  const handleFocus = () => {
    setOpen(true);
    if (options.length === 0) fetchCreators(search);
  };

  const select = (c) => {
    onChange(c);
    setSearch(c.username);
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setSearch('');
    setOptions([]);
  };

  return (
    <div ref={ref} style={{ position:'relative', marginBottom:'1rem' }}>
      <div style={{ position:'relative' }}>
        {value && (
          <div style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', display:'flex', alignItems:'center', gap:8, zIndex:1 }}>
            <Avatar url={value.avatar_url} username={value.username} size={22} />
          </div>
        )}
        <input
          style={{ width:'100%', padding:`10px 36px 10px ${value ? '44px' : '14px'}`, background:'#13131f',
            border:'1px solid #1e1e2e', borderRadius:8, color:'#e8e6e0', fontSize:14, outline:'none',
            boxSizing:'border-box' }}
          placeholder="Tìm creator theo tên..."
          value={search}
          onChange={e => { setSearch(e.target.value); onChange(null); setOpen(true); }}
          onFocus={handleFocus}
        />
        {(search || value) && (
          <button onClick={clear} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
            background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:16, lineHeight:1 }}>
            ×
          </button>
        )}
      </div>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'#13131f',
          border:'1px solid #2a2a3e', borderRadius:10, zIndex:100, maxHeight:240, overflowY:'auto',
          boxShadow:'0 8px 32px rgba(0,0,0,.5)' }}>
          {loading && <div style={{ padding:'12px 14px', color:'#555', fontSize:13 }}>Đang tìm...</div>}
          {!loading && options.length === 0 && (
            <div style={{ padding:'12px 14px', color:'#555', fontSize:13 }}>Không tìm thấy creator</div>
          )}
          {options.map(c => (
            <div key={c.id} onClick={() => select(c)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer',
                borderBottom:'1px solid #1a1a28', transition:'background .1s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1a1a28'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Avatar url={c.avatar_url} username={c.username} size={32} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#e8e6e0' }}>{c.username}</div>
                <div style={{ fontSize:11, color:'#666' }}>
                  {c.role === 'admin' ? '⚡ Admin' : '🎨 Creator'} · {Number(c.total_earned||0).toLocaleString()} MT nhận được
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Gifting() {
  const { wallet, token, refreshWallet } = useAuth();
  const [selected, setSelected] = useState(GIFT_PRESETS[0]);
  const [customAmount, setCustomAmount] = useState('');
  const [receiver, setReceiver] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState([]);
  const [floaters, setFloaters] = useState([]);
  const [liveCount, setLiveCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const feedRef = useRef(null);

  const finalAmount = customAmount ? parseInt(customAmount) : (selected?.amount ?? 0);
  const balance = Number(wallet?.balance || 0);
  const insufficient = finalAmount > 0 && balance < finalAmount;

  const addToast = (type, text) => {
    const id = Date.now();
    setToasts(t => [...t, { id, type, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  const addToFeed = useCallback((item) => {
    setFeed(prev => [...prev.slice(-19), item]);
  }, []);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [feed]);

  useEffect(() => {
    if (!token) return;
    api.wallet.recentGifts(token)
      .then(r => {
        const items = (r.gifts || []).map(g => ({
          ...resolveGiftStyle(Number(g.amount)),
          amount: Number(g.amount),
          senderName: g.sender_name,
          receiverName: g.receiver_name,
          message: g.message,
          time: new Date(g.time),
          live: false,
        }));
        setFeed(items);
      })
      .catch(() => {});
  }, [token]);

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
    if (!receiver || finalAmount < 10) return;
    if (insufficient) {
      addToast('error', `Số dư không đủ! Cần ${finalAmount.toLocaleString()} MT, bạn có ${balance.toLocaleString()} MT`);
      return;
    }
    setLoading(true);
    try {
      const r = await api.wallet.tip({ receiverId: receiver.id, amountXu: finalAmount, message }, token);
      const receiverAmt = r.receiver_amount ?? r.receiverAmount ?? Math.floor(finalAmount * 0.95);
      addToast('success', `Đã gửi ${selected?.label ?? '🎁'} ${finalAmount.toLocaleString()} MT → ${receiver.username} nhận ${receiverAmt.toLocaleString()} MT`);
      setMessage('');
      await refreshWallet();
    } catch (err) {
      addToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const canSend = receiver && finalAmount >= 10 && !insufficient && !loading;

  return (
    <div>
      <style>{`
        @keyframes floatUp { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-200px) scale(1.5);opacity:0} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes liveDot { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
      `}</style>

      <Toast toasts={toasts} />

      {floaters.map(f => (
        <FloatingGift key={f.id} gift={f} onDone={() => setFloaters(fl => fl.filter(x => x.id !== f.id))} />
      ))}

      <div style={{ fontSize:24, fontWeight:700, color:'#fff', marginBottom:'1.75rem' }}>Tip & Gifting</div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20, alignItems:'start' }}>

        {/* ── Left panel ── */}
        <div style={{ background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:12, padding:'1.5rem' }}>

          <div style={{ fontSize:14, fontWeight:600, color:'#aaa', marginBottom:'1rem' }}>Chọn quà tặng</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:'1.5rem' }}>
            {GIFT_PRESETS.map(g => {
              const sel = selected?.label === g.label;
              return (
                <button key={g.label}
                  style={{ padding:'14px 10px', borderRadius:10, cursor:'pointer', textAlign:'center', transition:'all .15s',
                    border: sel ? `2px solid ${g.color}` : '1px solid #1e1e2e',
                    background: sel ? `${g.color}18` : '#13131f' }}
                  onClick={() => { setSelected(g); setCustomAmount(''); }}>
                  <span style={{ fontSize:24 }}>{g.label.split(' ')[0]}</span>
                  <span style={{ fontSize:13, color:'#ddd', display:'block', marginTop:4 }}>{g.label.split(' ').slice(1).join(' ')}</span>
                  <span style={{ fontSize:16, fontWeight:700, color:g.color }}>{g.amount.toLocaleString()} MT</span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize:14, fontWeight:600, color:'#aaa', marginBottom:'1rem' }}>Hoặc nhập số MT tuỳ ý</div>
          <div style={{ display:'flex', gap:8, marginBottom:'1.5rem' }}>
            <input style={{ flex:1, padding:'10px 14px', background:'#13131f', border:'1px solid #1e1e2e',
              borderRadius:8, color:'#e8e6e0', fontSize:14, outline:'none' }}
              type="number" placeholder="Số MT (tối thiểu 10)" min="10"
              value={customAmount}
              onChange={e => { setCustomAmount(e.target.value); setSelected(null); }} />
          </div>

          <div style={{ fontSize:14, fontWeight:600, color:'#aaa', marginBottom:'0.6rem' }}>Gửi đến creator</div>
          <CreatorSearch token={token} value={receiver} onChange={setReceiver} />

          {receiver && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(108,92,231,.08)',
              border:'1px solid rgba(108,92,231,.3)', borderRadius:8, marginBottom:'1rem' }}>
              <Avatar url={receiver.avatar_url} username={receiver.username} size={36} />
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#e8e6e0' }}>{receiver.username}</div>
                <div style={{ fontSize:11, color:'#6C5CE7' }}>{receiver.role === 'admin' ? '⚡ Admin' : '🎨 Creator'}</div>
              </div>
            </div>
          )}

          <input style={{ width:'100%', padding:'10px 14px', background:'#13131f', border:'1px solid #1e1e2e',
            borderRadius:8, color:'#e8e6e0', fontSize:14, outline:'none', marginBottom:'1rem', boxSizing:'border-box' }}
            placeholder="Lời nhắn (tuỳ chọn)" value={message} onChange={e => setMessage(e.target.value)} />

          <div style={{ background:'#13131f', borderRadius:8, padding:'10px 14px', marginBottom:'1rem',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            border: insufficient ? '1px solid rgba(255,107,107,.4)' : '1px solid transparent' }}>
            <span style={{ fontSize:13, color: insufficient ? '#ff6b6b' : '#666' }}>
              {insufficient ? '⚠️ Số dư không đủ' : 'Số dư của bạn'}
            </span>
            <span style={{ fontSize:16, fontWeight:700, color: insufficient ? '#ff6b6b' : '#a29bfe' }}>
              {balance.toLocaleString()} MT
            </span>
          </div>

          {finalAmount > 0 && (
            <div style={{ fontSize:12, color:'#555', marginBottom:'1rem', textAlign:'center' }}>
              Platform phí 5% = {Math.floor(finalAmount * 0.05).toLocaleString()} MT &nbsp;·&nbsp;
              Creator nhận <strong style={{ color:'#a29bfe' }}>{Math.floor(finalAmount * 0.95).toLocaleString()} MT</strong>
            </div>
          )}

          <button
            style={{ width:'100%', padding:'13px', border:'none', borderRadius:8, fontSize:15, fontWeight:700,
              cursor: canSend ? 'pointer' : 'not-allowed', transition:'all .15s',
              background: canSend ? 'linear-gradient(135deg,#6C5CE7,#fd79a8)' : '#1e1e2e',
              color: canSend ? '#fff' : '#555',
              opacity: loading ? 0.7 : 1 }}
            disabled={!canSend}
            onClick={send}>
            {loading ? '⏳ Đang gửi...'
              : !receiver ? 'Chọn creator để gửi'
              : insufficient ? 'Số dư không đủ'
              : `Gửi ${selected?.label || '🎁 Quà'} ${finalAmount ? finalAmount.toLocaleString()+' MT' : ''}`}
          </button>
        </div>

        {/* ── Right panel ── */}
        <div>
          <div style={{ background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:12, padding:'1.5rem', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#aaa' }}>Gift Feed</div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#6fcf97', display:'inline-block',
                  animation:'liveDot 1.5s infinite' }}/>
                <span style={{ fontSize:11, color:'#6fcf97' }}>LIVE{liveCount > 0 ? ` · ${liveCount} mới` : ''}</span>
              </div>
            </div>

            <div ref={feedRef} style={{ background:'#0a0a0f', borderRadius:10, height:340, overflowY:'auto',
              border:'1px solid #1a1a28', padding:'10px',
              scrollbarWidth:'thin', scrollbarColor:'#1e1e2e transparent' }}>
              {feed.length === 0 && (
                <div style={{ color:'#333', fontSize:12, textAlign:'center', marginTop:'7rem' }}>
                  Chưa có gift nào...
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {feed.map((f, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
                    background:`${f.color}10`, borderRadius:8, border:`1px solid ${f.color}30`,
                    animation: f.live ? 'slideIn .3s ease' : 'none' }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{f.label.split(' ')[0]}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:'#aaa' }}>
                        <span style={{ color:'#ddd', fontWeight:600 }}>{f.senderName || 'Bạn'}</span>
                        {f.receiverName && <span> → <span style={{ color: f.color, fontWeight:600 }}>{f.receiverName}</span></span>}
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color: f.color }}>{Number(f.amount).toLocaleString()} MT</div>
                      {f.message && (
                        <div style={{ fontSize:11, color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          "{f.message}"
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize:10, color:'#444', flexShrink:0 }}>
                      {f.time instanceof Date ? f.time.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' }) : ''}
                    </span>
                    {f.live && <span style={{ fontSize:9, color:'#6fcf97', flexShrink:0, fontWeight:700 }}>LIVE</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:12, padding:'1.5rem' }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#aaa', marginBottom:'0.75rem' }}>Tích hợp API</div>
            <div style={{ fontSize:12, color:'#666', lineHeight:1.8 }}>
              Gọi API từ hệ thống vé / thế giới ảo / livestream:<br/>
              <code style={{ fontSize:11, color:'#a29bfe', background:'#13131f', padding:'2px 6px', borderRadius:4 }}>
                POST /api/wallet/tip
              </code>
              <br/>với body: <code style={{ color:'#74b9ff', fontSize:11 }}>receiver_id, amount_xu, message</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
