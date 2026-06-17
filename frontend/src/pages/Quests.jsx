import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const daysUntil = (dateStr) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
};

const CAT_COLOR = { game:'#a29bfe', music:'#6fcf97', social:'#fdcb6e', content:'#fd79a8', referral:'#74b9ff' };
const TYPE_LABEL = { daily:'Hàng ngày', weekly:'Hàng tuần', one_time:'Một lần', event:'Sự kiện' };

const S = {
  h1: { fontSize:24, fontWeight:700, color:'#fff', marginBottom:'1.75rem' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 },
  card: { background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:12, padding:'1.25rem', display:'flex', flexDirection:'column', gap:10 },
  cardDone: { opacity:.55 },
  top: { display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  tag: (c) => ({ fontSize:11, padding:'2px 8px', borderRadius:99, fontWeight:500, background: c+'22', color: c }),
  typeTag: { fontSize:11, padding:'2px 8px', borderRadius:99, background:'#1e1e2e', color:'#666' },
  title: { fontSize:14, fontWeight:600, color:'#ddd' },
  desc: { fontSize:12, color:'#555', lineHeight:1.5 },
  progress: { background:'#13131f', borderRadius:99, height:6, overflow:'hidden' },
  progressBar: (pct, c) => ({ height:'100%', width:`${pct}%`, background: c, borderRadius:99, transition:'width .3s' }),
  progressTxt: { fontSize:11, color:'#555', marginTop:3 },
  reward: { fontSize:16, fontWeight:700, color:'#a29bfe' },
  rewardSub: { fontSize:11, color:'#555' },
  claimBtn: (dis) => ({ padding:'8px 16px', background: dis ? '#1e1e2e' : '#6C5CE7', border:'none', borderRadius:7, color: dis ? '#444' : '#fff', fontSize:13, fontWeight:600, cursor: dis ? 'default' : 'pointer', alignSelf:'flex-start' }),
  toast: { position:'fixed', bottom:24, right:24, background:'#1e1e2e', border:'1px solid #2e2e44', borderRadius:10, padding:'12px 18px', fontSize:13, color:'#6fcf97', zIndex:999 }
};

export default function Quests() {
  const { token, refreshWallet } = useAuth();
  const [quests, setQuests] = useState([]);
  const [expiryBatches, setExpiryBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [toast, setToast] = useState(null);

  const load = () => Promise.all([
    api.quests.list(token).then(setQuests).catch(()=>{}),
    api.wallet.transactions({ type: 'earn_quest', limit: 10 }, token)
      .then(() => {})
      .catch(() => {}),
  ]).finally(() => setLoading(false));

  useEffect(() => { if (token) load(); }, [token]);

  const claim = async (questId) => {
    setClaiming(questId);
    try {
      const r = await api.quests.claim(questId, token);
      setToast(`+${r.rewardXu.toLocaleString()} MT đã vào ví!`);
      setTimeout(() => setToast(null), 3000);
      await refreshWallet();
      await load();
    } catch (err) {
      setToast(`Lỗi: ${err.message}`);
      setTimeout(() => setToast(null), 3000);
    } finally { setClaiming(null); }
  };

  if (loading) return <div style={{color:'#444',padding:'2rem'}}>Đang tải nhiệm vụ...</div>;

  return (
    <div>
      <div style={S.h1}>Nhiệm vụ kiếm MT</div>
      <div style={S.grid}>
        {quests.map(q => {
          const cat = q.category || 'social';
          const color = CAT_COLOR[cat] || '#888';
          const reqCount = q.requirement?.count || 1;
          const cur = q.current_count || 0;
          const pct = Math.min(100, Math.round((cur / reqCount) * 100));
          const isDone = q.user_status === 'completed';
          const isClaimed = q.user_status === 'claimed';

          return (
            <div key={q.id} style={{ ...S.card, ...(isClaimed ? S.cardDone : {}) }}>
              <div style={S.top}>
                <span style={S.tag(color)}>{cat}</span>
                <span style={S.typeTag}>{TYPE_LABEL[q.type]}</span>
              </div>
              <div style={S.title}>{q.title}</div>
              <div style={S.desc}>{q.description}</div>
              <div style={S.progress}>
                <div style={S.progressBar(isClaimed ? 100 : pct, color)} />
              </div>
              <div style={S.progressTxt}>
                {isClaimed ? '✓ Đã nhận thưởng' : `${cur}/${reqCount} ${isClaimed ? '' : `(${pct}%)`}`}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={S.reward}>+{Number(q.reward_xu).toLocaleString()} MT</div>
                  <div style={S.rewardSub}>phần thưởng • hết hạn sau 90 ngày</div>
                </div>
                {!isClaimed && (
                  <button style={S.claimBtn(!isDone || claiming === q.id)}
                    disabled={!isDone || claiming === q.id}
                    onClick={() => claim(q.id)}>
                    {claiming === q.id ? '...' : isDone ? 'Nhận thưởng' : 'Chưa xong'}
                  </button>
                )}
                {isClaimed && <span style={{ fontSize:20 }}>✅</span>}
              </div>
            </div>
          );
        })}
        {quests.length === 0 && (
          <div style={{ color:'#444', fontSize:13, padding:'2rem' }}>Chưa có nhiệm vụ nào.</div>
        )}
      </div>
      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}
