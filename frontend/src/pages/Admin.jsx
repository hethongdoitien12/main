import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ─── styles ────────────────────────────────────────────────────────────────
const S = {
  h1:       { fontSize:24, fontWeight:700, color:'#fff', marginBottom:4 },
  sub:      { color:'#555', fontSize:13, marginBottom:'1.75rem' },
  topTabs:  { display:'flex', gap:6, marginBottom:'1.75rem', padding:'4px', background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:10, width:'fit-content' },
  topTab:   (a) => ({ padding:'7px 20px', borderRadius:7, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', transition:'all .15s', background:a?'#6C5CE7':'transparent', color:a?'#fff':'#666' }),
  subTabs:  { display:'flex', gap:4, marginBottom:'1.25rem' },
  subTab:   (a) => ({ padding:'5px 14px', borderRadius:6, border:`1px solid ${a?'#2e2e44':'transparent'}`, fontSize:12, fontWeight:500, cursor:'pointer', background:a?'#1e1e2e':'transparent', color:a?'#ccc':'#555' }),
  grid4:    { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:'1.75rem' },
  stat:     (accent) => ({ background:'#0e0e17', border:`1px solid ${accent||'#1e1e2e'}`, borderRadius:12, padding:'1rem 1.2rem' }),
  statLbl:  { fontSize:11, color:'#555', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 },
  statVal:  (c) => ({ fontSize:22, fontWeight:700, color:c||'#fff' }),
  statSub:  { fontSize:11, color:'#444', marginTop:3 },
  card:     { background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:12, overflow:'hidden' },
  table:    { width:'100%', borderCollapse:'collapse' },
  th:       { fontSize:11, color:'#555', textTransform:'uppercase', letterSpacing:'.04em', padding:'10px 14px', textAlign:'left', borderBottom:'1px solid #1a1a28', whiteSpace:'nowrap' },
  td:       { fontSize:13, color:'#ccc', padding:'11px 14px', borderBottom:'1px solid #0d0d18', verticalAlign:'middle' },
  badge:    (s) => {
    const map = { pending:['#1e2a0e','#6fcf97'], completed:['#0e2a1e','#00b894'], failed:['#2a0e0e','#ff6b6b'], confirmed:['#0e1e2a','#74b9ff'], expired:['#1a1a10','#666'] };
    const [bg,color] = map[s] || ['#1e1e2e','#aaa'];
    return { fontSize:11, padding:'3px 9px', borderRadius:99, fontWeight:500, background:bg, color };
  },
  approveBtn: { padding:'5px 12px', background:'#0e2a1e', border:'1px solid #00b894', borderRadius:6, color:'#00b894', fontSize:12, fontWeight:600, cursor:'pointer', marginRight:6 },
  rejectBtn:  { padding:'5px 12px', background:'#2a0e0e', border:'1px solid #ff6b6b', borderRadius:6, color:'#ff6b6b', fontSize:12, fontWeight:600, cursor:'pointer' },
  empty:    { padding:'2.5rem', textAlign:'center', color:'#333', fontSize:13 },
  toast:    { position:'fixed', bottom:24, right:24, background:'#1e1e2e', border:'1px solid #2e2e44', borderRadius:10, padding:'12px 18px', fontSize:13, color:'#6fcf97', zIndex:999, boxShadow:'0 4px 24px #000a' },
  search:   { padding:'7px 12px', background:'#13131f', border:'1px solid #1e1e2e', borderRadius:8, color:'#ccc', fontSize:13, outline:'none', width:220 },
  toolbar:  { display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderBottom:'1px solid #1a1a28', flexWrap:'wrap' },
  refreshBtn: { padding:'6px 14px', background:'transparent', border:'1px solid #2e2e44', borderRadius:7, color:'#888', fontSize:12, cursor:'pointer' },
  infoBox:  { background:'#13131f', border:'1px solid #1e1e2e', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#666', lineHeight:1.7 },
};

const TX_LABELS = {
  deposit:'Nạp tiền', withdrawal:'Rút tiền', earn_quest:'Quest', earn_game:'Chơi game',
  earn_referral:'Giới thiệu', earn_content:'Tạo content', earn_bonus:'Bonus dev',
  spend_ticket:'Mua vé', spend_item:'Mua item', spend_agent:'Agent', spend_music:'Nhạc', spend_boost:'Boost',
  tip_sent:'Tip gửi', tip_received:'Tip nhận', refund:'Hoàn tiền', expire:'Hết hạn',
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
}
function fmtVnd(n) { return Number(n||0).toLocaleString('vi-VN') + 'đ'; }
function fmtXu(n)  { return Number(n||0).toLocaleString('vi-VN') + ' XU'; }

// ─── sub-components ─────────────────────────────────────────────────────────

function StatGrid({ stats, loading }) {
  if (loading || !stats) return <div style={{...S.grid4, opacity:.4}}>{''.padStart(4,' ').split('').map((_,i)=><div key={i} style={S.stat()}/>)}</div>;
  return (
    <div style={S.grid4}>
      <div style={S.stat('#2a2044')}>
        <div style={S.statLbl}>Tổng user</div>
        <div style={S.statVal('#a29bfe')}>{Number(stats.total_users||0).toLocaleString()}</div>
        <div style={S.statSub}>tài khoản</div>
      </div>
      <div style={S.stat()}>
        <div style={S.statLbl}>XU lưu hành</div>
        <div style={S.statVal('#6fcf97')}>{fmtXu(stats.total_xu_circulating)}</div>
        <div style={S.statSub}>trong tất cả ví</div>
      </div>
      <div style={S.stat()}>
        <div style={S.statLbl}>Tổng nạp vào</div>
        <div style={S.statVal('#74b9ff')}>{fmtXu(stats.total_deposited)}</div>
        <div style={S.statSub}>tất cả thời gian</div>
      </div>
      <div style={S.stat()}>
        <div style={S.statLbl}>Tổng giao dịch</div>
        <div style={S.statVal('#fdcb6e')}>{Number(stats.transaction_count||0).toLocaleString()}</div>
        <div style={S.statSub}>ledger entries</div>
      </div>
    </div>
  );
}

function WithdrawalTab({ token, showToast }) {
  const [tab, setTab]       = useState('pending');
  const [queue, setQueue]   = useState([]);
  const [wStats, setWStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchQueue = useCallback(async (status) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/withdrawals/queue?status=${status}`, { headers:{ Authorization:`Bearer ${token}` } });
      const d = await r.json();
      setQueue(Array.isArray(d) ? d : []);
    } catch { setQueue([]); } finally { setLoading(false); }
  }, [token]);

  const fetchWStats = useCallback(async () => {
    try {
      const r = await fetch('/api/withdrawals/stats', { headers:{ Authorization:`Bearer ${token}` } });
      setWStats(await r.json());
    } catch {}
  }, [token]);

  useEffect(() => { fetchQueue(tab); fetchWStats(); }, [tab, fetchQueue, fetchWStats]);

  const approve = async (id, username, amountVnd) => {
    await fetch(`/api/withdrawals/${id}/approve`, {
      method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ notes:'Đã chuyển khoản' })
    });
    showToast(`✅ Đã duyệt ${fmtVnd(amountVnd)} cho ${username}`);
    fetchQueue(tab); fetchWStats();
  };

  const reject = async (id, username) => {
    const reason = prompt(`Lý do từ chối rút của ${username}:`);
    if (!reason) return;
    await fetch(`/api/withdrawals/${id}/reject`, {
      method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ reason })
    });
    showToast(`❌ Đã từ chối và hoàn XU cho ${username}`);
    fetchQueue(tab); fetchWStats();
  };

  return (
    <>
      {wStats && (
        <div style={{...S.grid4, gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))'}}>
          <div style={S.stat('#2a1e0e')}><div style={S.statLbl}>Chờ duyệt</div><div style={S.statVal('#fdcb6e')}>{wStats.pending_count}</div><div style={S.statSub}>{fmtVnd(wStats.pending_vnd)}</div></div>
          <div style={S.stat('#0e2a1e')}><div style={S.statLbl}>Đã duyệt</div><div style={S.statVal('#6fcf97')}>{wStats.completed_count}</div><div style={S.statSub}>{fmtVnd(wStats.completed_vnd)}</div></div>
          <div style={S.stat('#2a0e2a')}><div style={S.statLbl}>Phí thu được</div><div style={S.statVal('#a29bfe')}>{fmtXu(wStats.total_fee_xu)}</div><div style={S.statSub}>10% mỗi lệnh</div></div>
        </div>
      )}
      <div style={S.subTabs}>
        {[['pending','⏳ Chờ duyệt'],['completed','✅ Đã duyệt'],['failed','❌ Từ chối']].map(([k,l])=>(
          <button key={k} style={S.subTab(tab===k)} onClick={()=>setTab(k)}>{l}</button>
        ))}
        <button style={{...S.refreshBtn, marginLeft:'auto'}} onClick={()=>{fetchQueue(tab);fetchWStats();}}>↻ Làm mới</button>
      </div>
      <div style={S.card}>
        {loading ? <div style={S.empty}>Đang tải...</div> : !queue.length ? (
          <div style={S.empty}>Không có yêu cầu nào ở trạng thái "{tab}"</div>
        ) : (
          <table style={S.table}>
            <thead><tr>
              {['User','Số XU rút','Nhận VNĐ','Phí','Ngân hàng / STK','Thời gian','Trạng thái',''].map(h=>(
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {queue.map(w=>(
                <tr key={w.id}>
                  <td style={S.td}>
                    <div style={{fontWeight:600,color:'#fff'}}>{w.username}</div>
                    <div style={{fontSize:11,color:'#555'}}>{w.email}</div>
                  </td>
                  <td style={S.td}><span style={{color:'#fd79a8',fontWeight:600}}>{fmtXu(w.amount_xu)}</span></td>
                  <td style={S.td}><span style={{color:'#6fcf97',fontWeight:600}}>{fmtVnd(w.amount_vnd)}</span></td>
                  <td style={S.td}><span style={{color:'#666'}}>{fmtXu(w.fee_xu)}</span></td>
                  <td style={S.td}>
                    <div style={{fontWeight:500}}>{w.bank_name||'—'}</div>
                    <code style={{fontSize:11,color:'#888'}}>{w.bank_account||'—'}</code>
                    <div style={{fontSize:11,color:'#555'}}>{w.account_name}</div>
                  </td>
                  <td style={S.td}><span style={{fontSize:12,color:'#555'}}>{fmtDate(w.created_at)}</span></td>
                  <td style={S.td}><span style={S.badge(w.status)}>{w.status}</span></td>
                  <td style={S.td}>
                    {w.status==='pending' && (
                      <>
                        <button style={S.approveBtn} onClick={()=>approve(w.id,w.username,w.amount_vnd)}>Duyệt</button>
                        <button style={S.rejectBtn} onClick={()=>reject(w.id,w.username)}>Từ chối</button>
                      </>
                    )}
                    {w.notes && <div style={{fontSize:11,color:'#555',marginTop:4,maxWidth:120}}>{w.notes}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function DepositTab({ token, showToast }) {
  const [deposits, setDeposits]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/deposits?limit=200', { headers:{ Authorization:`Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setDeposits(Array.isArray(d) ? d : []); }
      else setDeposits([]);
    } catch { setDeposits([]); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const approve = async (id, username, amountVnd) => {
    const notes = prompt(`Ghi chú duyệt deposit cho ${username} (${fmtVnd(amountVnd)}):`);
    if (notes === null) return;
    const r = await fetch(`/api/admin/deposits/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ notes }),
    });
    const d = await r.json();
    if (d.ok) { showToast(`✅ Đã duyệt deposit cho ${username}`); fetch_(); }
    else showToast(`❌ Lỗi: ${d.error}`);
  };

  const reject = async (id, username) => {
    const reason = prompt(`Lý do từ chối deposit của ${username}:`);
    if (!reason) return;
    const r = await fetch(`/api/admin/deposits/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    });
    const d = await r.json();
    if (d.ok) { showToast(`↩️ Đã từ chối deposit của ${username}`); fetch_(); }
    else showToast(`❌ Lỗi: ${d.error}`);
  };

  const filtered = deposits.filter(d => {
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchSearch = !search || d.username?.toLowerCase().includes(search.toLowerCase()) || d.email?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingCount = deposits.filter(d => d.status === 'pending').length;
  const GW_COLORS = { momo:'#d63031', zalopay:'#0984e3', vnpay:'#e17055', bank_transfer:'#00b894' };

  return (
    <>
      {pendingCount > 0 && (
        <div style={{ background:'#fdcb6e15', border:'1px solid #fdcb6e40', borderRadius:10, padding:'10px 16px', marginBottom:16, fontSize:13, color:'#fdcb6e', display:'flex', alignItems:'center', gap:8 }}>
          ⚠️ Có <strong>{pendingCount}</strong> deposit đang chờ duyệt thủ công
          <button style={{ marginLeft:'auto', ...S.refreshBtn, color:'#fdcb6e', border:'1px solid #fdcb6e40' }} onClick={() => setStatus('pending')}>
            Xem ngay →
          </button>
        </div>
      )}
      <div style={S.subTabs}>
        {[['all','Tất cả'],['pending','Chờ duyệt'],['completed','Hoàn tất'],['failed','Thất bại'],['expired','Hết hạn']].map(([k,l])=>(
          <button key={k} style={S.subTab(statusFilter===k)} onClick={()=>setStatus(k)}>
            {l}{k==='pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
        <button style={{...S.refreshBtn, marginLeft:'auto'}} onClick={fetch_}>↻ Làm mới</button>
      </div>
      <div style={S.card}>
        <div style={S.toolbar}>
          <input style={S.search} placeholder="Tìm user / email..." value={search} onChange={e=>setSearch(e.target.value)} />
          <span style={{fontSize:12,color:'#444'}}>{filtered.length} kết quả</span>
        </div>
        {loading ? <div style={S.empty}>Đang tải...</div> : !filtered.length ? (
          <div style={S.empty}>Không có dữ liệu</div>
        ) : (
          <table style={S.table}>
            <thead><tr>
              {['User','Gateway','Số VNĐ','Số XU','Trạng thái','Thời gian','Ref',''].map(h=>(
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(d=>(
                <tr key={d.id}>
                  <td style={S.td}>
                    <div style={{fontWeight:600,color:'#fff'}}>{d.username||'—'}</div>
                    <div style={{fontSize:11,color:'#555'}}>{d.email}</div>
                  </td>
                  <td style={S.td}>
                    <span style={{fontSize:12,fontWeight:600,color:GW_COLORS[d.payment_method||d.payment_gateway]||'#888',textTransform:'uppercase'}}>
                      {d.payment_method||d.payment_gateway||'—'}
                    </span>
                  </td>
                  <td style={S.td}><span style={{color:'#74b9ff',fontWeight:500}}>{fmtVnd(d.amount_vnd||d.vnd_amount)}</span></td>
                  <td style={S.td}><span style={{color:'#6fcf97',fontWeight:500}}>{fmtXu(d.amount_xu||d.xu_amount)}</span></td>
                  <td style={S.td}><span style={S.badge(d.status)}>{d.status}</span></td>
                  <td style={S.td}><span style={{fontSize:12,color:'#555'}}>{fmtDate(d.created_at)}</span></td>
                  <td style={S.td}><code style={{fontSize:10,color:'#444'}}>{(d.payment_ref||d.gateway_ref||'—').slice(0,20)}</code></td>
                  <td style={S.td}>
                    {d.status === 'pending' && (
                      <>
                        <button style={S.approveBtn} onClick={()=>approve(d.id, d.username, d.amount_vnd||d.vnd_amount)}>Duyệt</button>
                        <button style={S.rejectBtn} onClick={()=>reject(d.id, d.username)}>Từ chối</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function TransactionTab({ token }) {
  const [txns, setTxns]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const [typeFilter, setType] = useState('all');
  const [offset, setOffset]   = useState(0);
  const LIMIT = 50;

  const fetch_ = useCallback(async (off=0) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/transactions?limit=${LIMIT}&offset=${off}`, { headers:{ Authorization:`Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setTxns(Array.isArray(d) ? d : d.transactions||[]); }
      else setTxns([]);
    } catch { setTxns([]); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetch_(offset); }, [fetch_, offset]);

  const types = ['all', ...new Set(txns.map(t=>t.type).filter(Boolean))];
  const filtered = txns.filter(t => {
    const matchType = typeFilter==='all' || t.type===typeFilter;
    const matchSearch = !search || t.username?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <>
      <div style={S.subTabs}>
        {types.slice(0,8).map(k=>(
          <button key={k} style={S.subTab(typeFilter===k)} onClick={()=>setType(k)}>
            {k==='all'?'Tất cả':(TX_LABELS[k]||k)}
          </button>
        ))}
        <button style={{...S.refreshBtn, marginLeft:'auto'}} onClick={()=>fetch_(offset)}>↻ Làm mới</button>
      </div>
      <div style={S.card}>
        <div style={S.toolbar}>
          <input style={S.search} placeholder="Tìm username..." value={search} onChange={e=>setSearch(e.target.value)} />
          <span style={{fontSize:12,color:'#444'}}>{filtered.length} / {txns.length}</span>
          <div style={{marginLeft:'auto',display:'flex',gap:6}}>
            <button style={S.refreshBtn} disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-LIMIT))}>← Trước</button>
            <span style={{fontSize:12,color:'#555',alignSelf:'center'}}>Trang {Math.floor(offset/LIMIT)+1}</span>
            <button style={S.refreshBtn} disabled={txns.length<LIMIT} onClick={()=>setOffset(offset+LIMIT)}>Tiếp →</button>
          </div>
        </div>
        {loading ? <div style={S.empty}>Đang tải...</div> : !filtered.length ? (
          <div style={S.empty}>Không có giao dịch nào</div>
        ) : (
          <table style={S.table}>
            <thead><tr>
              {['User','Loại','Số XU','Mô tả','Thời gian'].map(h=>(
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(tx=>(
                <tr key={tx.id}>
                  <td style={S.td}><span style={{color:'#ddd',fontWeight:500}}>{tx.username||'—'}</span></td>
                  <td style={S.td}>
                    <span style={{fontSize:12,padding:'2px 8px',borderRadius:99,background:'#1e1e2e',color:'#888'}}>
                      {TX_LABELS[tx.type]||tx.type}
                    </span>
                  </td>
                  <td style={S.td}>
                    <span style={{fontWeight:600, color: Number(tx.amount)>0 ? '#6fcf97' : '#ff6b6b'}}>
                      {Number(tx.amount)>0?'+':''}{Number(tx.amount).toLocaleString()} XU
                    </span>
                  </td>
                  <td style={S.td}><span style={{color:'#555',fontSize:12}}>{tx.description||'—'}</span></td>
                  <td style={S.td}><span style={{fontSize:12,color:'#555'}}>{fmtDate(tx.created_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {txns.length === 0 && !loading && (
        <div style={{...S.infoBox, marginTop:12}}>
          ℹ️ Cần thêm route <code>GET /api/admin/transactions</code> trong backend để xem dữ liệu.
        </div>
      )}
    </>
  );
}

// ─── KYC tab ─────────────────────────────────────────────────────────────────

function KycTab({ token, showToast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/kyc/pending', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setList(Array.isArray(d) ? d : []);
    } catch { setList([]); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const approve = async (userId, username) => {
    const r = await fetch(`/api/admin/kyc/${userId}/approve`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    });
    const d = await r.json();
    if (d.ok) { showToast(`✅ Đã duyệt KYC cho ${username}`); load(); }
    else showToast(`❌ ${d.error}`);
  };

  const reject = async (userId, username) => {
    const reason = prompt(`Lý do từ chối KYC của ${username}:`);
    if (!reason) return;
    const r = await fetch(`/api/admin/kyc/${userId}/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    });
    const d = await r.json();
    if (d.ok) { showToast(`↩️ Đã từ chối KYC của ${username}`); load(); }
    else showToast(`❌ ${d.error}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#aaa' }}>
          {list.length > 0 ? <><strong style={{ color: '#fdcb6e' }}>{list.length}</strong> hồ sơ đang chờ xét duyệt</> : 'Không có hồ sơ KYC nào đang chờ'}
        </div>
        <button style={S.refreshBtn} onClick={load}>↻ Làm mới</button>
      </div>

      {loading && <div style={S.empty}>Đang tải...</div>}

      {!loading && list.length === 0 && (
        <div style={{ ...S.card, ...S.empty }}>Chưa có hồ sơ KYC nào chờ duyệt 🎉</div>
      )}

      {!loading && list.length > 0 && (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              {['User','Email','Họ tên','CCCD/CMND','Nộp lúc','Role',''].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {list.map(u => (
                <tr key={u.id}>
                  <td style={S.td}><div style={{ fontWeight: 600, color: '#fff' }}>{u.username}</div></td>
                  <td style={S.td}><div style={{ fontSize: 12, color: '#666' }}>{u.email}</div></td>
                  <td style={S.td}><div style={{ color: '#ccc' }}>{u.kyc_full_name || '—'}</div></td>
                  <td style={S.td}><code style={{ fontSize: 12, color: '#888' }}>{u.kyc_id_number || '—'}</code></td>
                  <td style={S.td}><div style={{ fontSize: 12, color: '#555' }}>{fmtDate(u.kyc_submitted_at)}</div></td>
                  <td style={S.td}><span style={S.badge(u.role)}>{u.role}</span></td>
                  <td style={S.td}>
                    <button style={S.approveBtn} onClick={() => approve(u.id, u.username)}>Duyệt</button>
                    <button style={S.rejectBtn} onClick={() => reject(u.id, u.username)}>Từ chối</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── charts tab ─────────────────────────────────────────────────────────────

function ChartsTab({ token }) {
  const [data, setData]     = useState(null);
  const [days, setDays]     = useState(30);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/chart-data?days=${d}`, { headers: { Authorization: `Bearer ${token}` } });
      setData(await r.json());
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(days); }, [days, load]);

  const exportCSV = (type) => {
    const sep = type === 'transactions' ? `days=${days}&token=${token}` : `token=${token}`;
    window.open(`/api/admin/export/${type}?${sep}`, '_blank');
  };

  // Build merged dataset for 30/7 days
  const chartData = data ? (() => {
    const n = data.days;
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (n - 1 - i));
      const key = d.toISOString().slice(0, 10);
      const rev = data.revenue.find(r => r.date?.slice(0, 10) === key);
      const usr = data.newUsers.find(u => u.date?.slice(0, 10) === key);
      return {
        date: d.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' }),
        'Doanh thu (nghìn đ)': rev ? Math.round(rev.vnd_deposited / 1000) : 0,
        'User mới': usr ? usr.count : 0,
      };
    });
  })() : [];

  return (
    <div>
      {/* Export + filter toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{ ...S.refreshBtn, background: days === d ? '#1e1e2e' : 'transparent', color: days === d ? '#a29bfe' : '#555', border: `1px solid ${days === d ? '#6C5CE7' : '#1e1e2e'}` }}>
              {d} ngày
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => exportCSV('transactions')} style={{ ...S.refreshBtn, color: '#6fcf97', border: '1px solid #6fcf9740' }}>
            ↓ Export giao dịch CSV
          </button>
          <button onClick={() => exportCSV('users')} style={{ ...S.refreshBtn, color: '#74b9ff', border: '1px solid #74b9ff40' }}>
            ↓ Export users CSV
          </button>
        </div>
      </div>

      {loading && <div style={{ color: '#555', padding: '2rem', textAlign: 'center' }}>Đang tải...</div>}

      {!loading && chartData.length > 0 && (
        <>
          {/* Revenue chart */}
          <div style={{ ...S.card, padding: '1.5rem', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: '1rem' }}>Doanh thu (VNĐ) — {days} ngày</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6C5CE7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6C5CE7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a28" />
                <XAxis dataKey="date" tick={{ fill: '#444', fontSize: 11 }} tickLine={false} axisLine={false}
                  interval={Math.floor(chartData.length / 6)} />
                <YAxis tick={{ fill: '#444', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#13131f', border: '1px solid #2e2e44', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#888' }} itemStyle={{ color: '#a29bfe' }} />
                <Area type="monotone" dataKey="Doanh thu (nghìn đ)" stroke="#6C5CE7" fill="url(#revGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* New users chart */}
          <div style={{ ...S.card, padding: '1.5rem' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: '1rem' }}>User mới đăng ký — {days} ngày</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a28" />
                <XAxis dataKey="date" tick={{ fill: '#444', fontSize: 11 }} tickLine={false} axisLine={false}
                  interval={Math.floor(chartData.length / 6)} />
                <YAxis tick={{ fill: '#444', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#13131f', border: '1px solid #2e2e44', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#888' }} itemStyle={{ color: '#74b9ff' }} />
                <Bar dataKey="User mới" fill="#74b9ff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!loading && chartData.length === 0 && (
        <div style={{ ...S.card, padding: '3rem', textAlign: 'center', color: '#333' }}>Chưa có dữ liệu trong khoảng thời gian này</div>
      )}
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

export default function Admin() {
  const { token, user } = useAuth();
  const [tab, setTab]       = useState('withdrawals');
  const [stats, setStats]   = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [toast, setToast]   = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 3500); };

  useEffect(() => {
    if (!token) return;
    setStatsLoading(true);
    fetch('/api/wallet/platform-stats', { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setStats(d))
      .catch(()=>{})
      .finally(()=>setStatsLoading(false));
  }, [token]);

  if (user?.role !== 'admin') {
    return (
      <div style={{padding:'3rem', textAlign:'center'}}>
        <div style={{fontSize:48, marginBottom:12}}>⛔</div>
        <div style={{color:'#ff6b6b', fontSize:16, fontWeight:600}}>Chỉ admin mới xem được trang này</div>
        <div style={{color:'#444', fontSize:13, marginTop:6}}>Tài khoản của bạn: <b style={{color:'#888'}}>{user?.role}</b></div>
      </div>
    );
  }

  return (
    <div>
      <div style={S.h1}>Admin Dashboard</div>
      <div style={S.sub}>Quản lý giao dịch, rút tiền và nạp tiền toàn hệ thống</div>

      <StatGrid stats={stats} loading={statsLoading} />

      <div style={S.topTabs}>
        {[
          ['withdrawals', '↑ Rút tiền'],
          ['deposits',    '↓ Nạp tiền'],
          ['transactions','≡ Giao dịch'],
          ['charts',      '📊 Biểu đồ'],
          ['kyc',         '🪪 KYC'],
        ].map(([k,l])=>(
          <button key={k} style={S.topTab(tab===k)} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'withdrawals'  && <WithdrawalTab   token={token} showToast={showToast} />}
      {tab === 'deposits'     && <DepositTab      token={token} showToast={showToast} />}
      {tab === 'transactions' && <TransactionTab  token={token} />}
      {tab === 'charts'       && <ChartsTab       token={token} />}
      {tab === 'kyc'          && <KycTab          token={token} showToast={showToast} />}

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}
