import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const TX_LABELS = {
  deposit:'Nạp tiền', withdrawal:'Rút tiền', earn_quest:'Quest', earn_game:'Chơi game',
  earn_referral:'Giới thiệu', earn_content:'Tạo content', spend_ticket:'Mua vé',
  spend_item:'Mua item', spend_agent:'Thuê Agent', spend_music:'Nhạc license',
  spend_boost:'Boost post', tip_sent:'Gửi tip', tip_received:'Nhận tip',
  expire:'Hết hạn', refund:'Hoàn tiền', admin_adjust:'Điều chỉnh'
};

const TX_ICON = {
  deposit:'↓', withdrawal:'↑', earn_quest:'◆', earn_game:'◈', earn_referral:'⊕',
  earn_content:'✦', spend_ticket:'◎', spend_item:'⬡', spend_agent:'⊡',
  spend_music:'♪', spend_boost:'⊛', tip_sent:'♥', tip_received:'♥',
  expire:'○', refund:'↩', admin_adjust:'⊘'
};

const FILTERS = [
  { label:'Tất cả', value:'' },
  { label:'Nạp/Rút', value:'deposit' },
  { label:'Kiếm XU', value:'earn_quest' },
  { label:'Tiêu XU', value:'spend_ticket' },
  { label:'Tip', value:'tip_sent' },
];

const S = {
  h1: { fontSize:24, fontWeight:700, color:'#fff', marginBottom:'1.75rem' },
  filters: { display:'flex', gap:6, marginBottom:'1.5rem', flexWrap:'wrap' },
  filterBtn: (a) => ({ padding:'6px 14px', borderRadius:99, border: a ? '1px solid #6C5CE7' : '1px solid #1e1e2e', background: a ? '#2a2044' : 'transparent', color: a ? '#a29bfe' : '#666', fontSize:12, fontWeight:500, cursor:'pointer' }),
  card: { background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:12, overflow:'hidden' },
  row: { display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom:'1px solid #0d0d18' },
  icon: (pos) => ({ width:36, height:36, borderRadius:9, background: pos ? 'rgba(111,207,151,.1)' : 'rgba(255,107,107,.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color: pos ? '#6fcf97' : '#ff6b6b', flexShrink:0 }),
  name: { fontSize:13, fontWeight:500, color:'#ddd' },
  desc: { fontSize:11, color:'#555', marginTop:1 },
  amt: (pos) => ({ fontSize:14, fontWeight:700, color: pos ? '#6fcf97' : '#ff6b6b', marginLeft:'auto', flexShrink:0 }),
  bal: { fontSize:11, color:'#444', marginLeft:'auto', marginTop:2 },
  more: { padding:'12px 18px', textAlign:'center' },
  moreBtn: { padding:'8px 20px', background:'transparent', border:'1px solid #1e1e2e', borderRadius:8, color:'#666', fontSize:13, cursor:'pointer' }
};

export default function History() {
  const { token } = useAuth();
  const [txs, setTxs] = useState([]);
  const [filter, setFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const LIMIT = 20;

  const load = async (f, o, append = false) => {
    setLoading(true);
    try {
      const params = { limit: LIMIT, offset: o };
      // For earn/spend we fetch all types via prefix match workaround
      if (f) params.type = f;
      const data = await api.wallet.history(params, token);
      setTxs(append ? prev => [...prev, ...data] : data);
      setHasMore(data.length === LIMIT);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (token) { setOffset(0); load(filter, 0); }
  }, [token, filter]);

  const loadMore = () => {
    const next = offset + LIMIT;
    setOffset(next);
    load(filter, next, true);
  };

  return (
    <div>
      <div style={S.h1}>Lịch sử giao dịch</div>
      <div style={S.filters}>
        {FILTERS.map(f => (
          <button key={f.value} style={S.filterBtn(filter === f.value)} onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={S.card}>
        {txs.length === 0 && !loading && (
          <div style={{ padding:'2rem', textAlign:'center', color:'#444', fontSize:13 }}>Chưa có giao dịch nào</div>
        )}
        {txs.map(tx => {
          const pos = Number(tx.amount) > 0;
          return (
            <div key={tx.id} style={S.row}>
              <div style={S.icon(pos)}>{TX_ICON[tx.type] || '·'}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={S.name}>{TX_LABELS[tx.type] || tx.type}</div>
                <div style={S.desc}>
                  {tx.description || '—'} · {new Date(tx.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={S.amt(pos)}>{pos ? '+' : ''}{Number(tx.amount).toLocaleString()} XU</div>
                <div style={S.bal}>Số dư: {Number(tx.balance_after).toLocaleString()} XU</div>
              </div>
            </div>
          );
        })}
        {hasMore && (
          <div style={S.more}>
            <button style={S.moreBtn} onClick={loadMore} disabled={loading}>
              {loading ? 'Đang tải...' : 'Tải thêm'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
