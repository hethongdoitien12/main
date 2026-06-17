import { useState, useEffect, useCallback, useRef } from 'react';
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
function fmtXu(n)  { return Number(n||0).toLocaleString('vi-VN') + ' MT'; }

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
        <div style={S.statLbl}>MT lưu hành</div>
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

  const approve = async (id, username, amountVnd, w) => {
    const bankRef = prompt(`Mã giao dịch ngân hàng khi chuyển cho ${username} (${fmtVnd(amountVnd)}):\n\nNgân hàng: ${w.bank_name} — STK: ${w.bank_account} — Tên: ${w.account_name}\n\n(Bỏ trống nếu chưa có mã)`);
    if (bankRef === null) return;
    const r = await fetch(`/api/withdrawals/${id}/approve`, {
      method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ notes:'Đã chuyển khoản', bank_transfer_ref: bankRef || undefined })
    });
    const d = await r.json();
    if (!r.ok) { showToast(`❌ ${d.error}`); return; }
    showToast(`✅ Đã duyệt ${fmtVnd(amountVnd)} cho ${username}${bankRef ? ` — Mã GD: ${bankRef}` : ''}`);
    fetchQueue(tab); fetchWStats();
  };

  const reject = async (id, username) => {
    const reason = prompt(`Lý do từ chối rút của ${username}:`);
    if (!reason) return;
    await fetch(`/api/withdrawals/${id}/reject`, {
      method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ reason })
    });
    showToast(`❌ Đã từ chối và hoàn MT cho ${username}`);
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
              {['User','Số MT rút','Nhận VNĐ','Phí','Ngân hàng / STK','Thời gian','Trạng thái',''].map(h=>(
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
                        <button style={S.approveBtn} onClick={()=>approve(w.id,w.username,w.amount_vnd,w)}>✓ Duyệt</button>
                        <button style={S.rejectBtn} onClick={()=>reject(w.id,w.username)}>✕ Từ chối</button>
                      </>
                    )}
                    {w.bank_transfer_ref && <div style={{fontSize:11,color:'#74b9ff',marginTop:4}}>🏦 {w.bank_transfer_ref}</div>}
                    {w.notes && <div style={{fontSize:11,color:'#555',marginTop:2,maxWidth:140}}>{w.notes}</div>}
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
              {['User','Gateway','Số VNĐ','Số MT','Trạng thái','Thời gian','Ref',''].map(h=>(
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
              {['User','Loại','Số MT','Mô tả','Thời gian'].map(h=>(
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
                      {Number(tx.amount)>0?'+':''}{Number(tx.amount).toLocaleString()} MT
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

// ─── notification broadcast tab ─────────────────────────────────────────────

const NOTIF_TYPES = [
  { value:'system',  label:'🔔 System',  color:'#74b9ff' },
  { value:'promo',   label:'🎁 Promo',   color:'#f6c90e' },
  { value:'warning', label:'⚠️ Warning', color:'#ff6b6b' },
  { value:'info',    label:'ℹ️ Info',    color:'#6fcf97' },
];
const TARGET_OPTS = [
  { value:'all',     label:'🌐 Tất cả users' },
  { value:'user',    label:'👤 Chỉ role: user' },
  { value:'creator', label:'🎨 Chỉ role: creator' },
  { value:'admin',   label:'🔑 Chỉ role: admin' },
];

function NotificationTab({ token, showToast }) {
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [type,     setType]     = useState('system');
  const [target,   setTarget]   = useState('all');
  const [preview,  setPreview]  = useState(null);
  const [sending,  setSending]  = useState(false);
  const [logs,     setLogs]     = useState([]);
  const [logsLoad, setLogsLoad] = useState(false);

  // live preview count when target changes
  useEffect(() => {
    fetch(`/api/admin/notifications/preview?target=${target}`, {
      headers:{ Authorization:`Bearer ${token}` },
    }).then(r=>r.json()).then(d=>setPreview(d.count)).catch(()=>{});
  }, [target, token]);

  const loadLogs = useCallback(async () => {
    setLogsLoad(true);
    const r = await fetch('/api/admin/notifications/broadcasts', { headers:{ Authorization:`Bearer ${token}` } });
    const d = await r.json();
    setLogs(Array.isArray(d) ? d : []);
    setLogsLoad(false);
  }, [token]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const send = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSending(true);
    try {
      const r = await fetch('/api/admin/notifications/broadcast', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), body: body.trim()||null, type, target }),
      });
      const d = await r.json();
      if (d.ok) {
        showToast(`✅ Đã gửi cho ${d.sent} users`);
        setTitle(''); setBody(''); setType('system'); setTarget('all');
        loadLogs();
      } else showToast(`❌ ${d.error}`);
    } finally { setSending(false); }
  };

  const typeInfo   = NOTIF_TYPES.find(t => t.value === type) || NOTIF_TYPES[0];
  const targetInfo = TARGET_OPTS.find(t => t.value === target) || TARGET_OPTS[0];

  const inp = { width:'100%', boxSizing:'border-box', padding:'9px 12px', background:'#13131f', border:'1px solid #2e2e44', borderRadius:8, color:'#ddd', fontSize:13, outline:'none' };
  const lbl = { display:'block', fontSize:11, color:'#555', marginBottom:5 };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>

      {/* ── left: compose form ── */}
      <div style={S.card}>
        <div style={{ fontWeight:700, color:'#ddd', fontSize:14, marginBottom:16 }}>📣 Soạn thông báo</div>

        <form onSubmit={send}>
          {/* type selector */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Loại thông báo</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {NOTIF_TYPES.map(t => (
                <button key={t.value} type="button" onClick={()=>setType(t.value)} style={{
                  padding:'5px 12px', borderRadius:20, border:`1px solid ${t.color}${type===t.value?'':'40'}`,
                  background: type===t.value ? `${t.color}20` : 'transparent',
                  color: type===t.value ? t.color : '#555', fontSize:12, cursor:'pointer',
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* target selector */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Gửi đến</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {TARGET_OPTS.map(t => (
                <button key={t.value} type="button" onClick={()=>setTarget(t.value)} style={{
                  padding:'5px 12px', borderRadius:20, border:`1px solid ${target===t.value?'#a29bfe':'#2e2e44'}`,
                  background: target===t.value ? '#a29bfe20' : 'transparent',
                  color: target===t.value ? '#a29bfe' : '#555', fontSize:12, cursor:'pointer',
                }}>{t.label}</button>
              ))}
            </div>
            {preview !== null && (
              <div style={{ marginTop:7, fontSize:11, color:'#6fcf97' }}>
                → Sẽ gửi cho <b>{preview}</b> user{preview !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* title */}
          <div style={{ marginBottom:12 }}>
            <label style={lbl}>Tiêu đề *</label>
            <input style={inp} value={title} onChange={e=>setTitle(e.target.value)}
              placeholder="VD: 🎁 Ưu đãi đặc biệt hôm nay!" maxLength={200} required />
            <div style={{ fontSize:10, color:'#333', marginTop:3, textAlign:'right' }}>{title.length}/200</div>
          </div>

          {/* body */}
          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Nội dung (tuỳ chọn)</label>
            <textarea style={{ ...inp, height:90, resize:'vertical' }} value={body}
              onChange={e=>setBody(e.target.value)} placeholder="Mô tả chi tiết thêm..." />
          </div>

          {/* preview card */}
          {title && (
            <div style={{ marginBottom:16, padding:'10px 14px', background:'#0a0a15', border:`1px solid ${typeInfo.color}30`, borderLeft:`3px solid ${typeInfo.color}`, borderRadius:8 }}>
              <div style={{ fontSize:11, color: typeInfo.color, marginBottom:4 }}>{typeInfo.label} preview</div>
              <div style={{ fontWeight:600, color:'#ddd', fontSize:13 }}>{title}</div>
              {body && <div style={{ fontSize:12, color:'#555', marginTop:4 }}>{body}</div>}
            </div>
          )}

          <button type="submit" disabled={sending||!title.trim()} style={{
            width:'100%', padding:'10px', background:'#a29bfe', border:'none', borderRadius:8,
            color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer',
            opacity: (sending||!title.trim()) ? 0.5 : 1,
          }}>
            {sending ? 'Đang gửi...' : `📣 Gửi thông báo${preview !== null ? ` (${preview})` : ''}`}
          </button>
        </form>
      </div>

      {/* ── right: broadcast history ── */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontWeight:700, color:'#ddd', fontSize:14 }}>📋 Lịch sử gửi</div>
          <button onClick={loadLogs} style={S.refreshBtn}>{logsLoad?'...':'↻ Làm mới'}</button>
        </div>

        {logsLoad && <div style={{ fontSize:12, color:'#333', textAlign:'center', padding:'1rem' }}>Đang tải...</div>}

        {!logsLoad && logs.length === 0 && (
          <div style={{ fontSize:12, color:'#333', textAlign:'center', padding:'1rem' }}>Chưa gửi broadcast nào</div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {logs.map(log => {
            const t = NOTIF_TYPES.find(x=>x.value===log.type)||NOTIF_TYPES[0];
            return (
              <div key={log.id} style={{
                padding:'10px 14px', background:'#0d0d1a',
                border:`1px solid ${t.color}20`, borderLeft:`3px solid ${t.color}`,
                borderRadius:8,
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, color:'#ddd', fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.title}</div>
                    {log.body && <div style={{ fontSize:11, color:'#444', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.body}</div>}
                  </div>
                  <span style={{ ...S.badge(''), background:'transparent', border:`1px solid ${t.color}40`, color:t.color, fontSize:10, whiteSpace:'nowrap', padding:'2px 6px', flexShrink:0 }}>{t.label}</span>
                </div>
                <div style={{ display:'flex', gap:10, marginTop:6, fontSize:11, color:'#333' }}>
                  <span>👤 {log.recipient_count} users</span>
                  <span>→ {TARGET_OPTS.find(x=>x.value===log.target)?.label||log.target}</span>
                  <span style={{ marginLeft:'auto' }}>by {log.admin_username}</span>
                  <span>{new Date(log.created_at).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'})}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── quest management tab ───────────────────────────────────────────────────

const TYPE_COLORS = { daily:'#6fcf97', weekly:'#74b9ff', one_time:'#a29bfe', event:'#f6c90e' };
const CAT_LABELS  = { game:'🎮 Game', music:'🎵 Music', social:'📣 Social', content:'📝 Content', referral:'👥 Referral', '':'—' };

const EMPTY_FORM = {
  title:'', description:'', type:'one_time', category:'',
  reward_xu:'', action:'', count:'1', expires_at:'',
};

function QuestModal({ initial, onSave, onClose, saving }) {
  const [f, setF] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const isEdit = !!initial?.id;

  const submit = (e) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    if (!f.reward_xu || Number(f.reward_xu) <= 0) return;
    if (!f.action.trim() || !f.count || Number(f.count) < 1) return;
    onSave({
      title: f.title.trim(),
      description: f.description.trim() || null,
      type: f.type,
      category: f.category || null,
      reward_xu: Number(f.reward_xu),
      requirement: { action: f.action.trim(), count: Number(f.count) },
      expires_at: f.expires_at || null,
    });
  };

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' };
  const box     = { background:'#0d0d1a', border:'1px solid #2e2e44', borderRadius:12, padding:'1.5rem', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' };
  const inp     = { width:'100%', boxSizing:'border-box', padding:'8px 12px', background:'#13131f', border:'1px solid #2e2e44', borderRadius:8, color:'#ddd', fontSize:13, outline:'none' };
  const lbl     = { display:'block', fontSize:11, color:'#555', marginBottom:4 };
  const row     = { marginBottom:14 };
  const sel     = { ...inp, cursor:'pointer' };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={box}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem' }}>
          <span style={{ fontWeight:700, color:'#ddd', fontSize:15 }}>{isEdit ? '✏️ Sửa quest' : '➕ Tạo quest mới'}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#555', fontSize:18, cursor:'pointer' }}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div style={row}>
            <label style={lbl}>Tên quest *</label>
            <input style={inp} value={f.title} onChange={e=>set('title',e.target.value)} placeholder="VD: Nghe 3 bài hát hôm nay" required />
          </div>
          <div style={row}>
            <label style={lbl}>Mô tả</label>
            <textarea style={{ ...inp, height:64, resize:'vertical' }} value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Mô tả ngắn..." />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            <div>
              <label style={lbl}>Loại *</label>
              <select style={sel} value={f.type} onChange={e=>set('type',e.target.value)}>
                {['daily','weekly','one_time','event'].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Danh mục</label>
              <select style={sel} value={f.category} onChange={e=>set('category',e.target.value)}>
                <option value="">— Không —</option>
                {['game','music','social','content','referral'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            <div>
              <label style={lbl}>Thưởng MT *</label>
              <input style={inp} type="number" min="1" value={f.reward_xu} onChange={e=>set('reward_xu',e.target.value)} placeholder="500" required />
            </div>
            <div>
              <label style={lbl}>Hết hạn (tuỳ chọn)</label>
              <input style={inp} type="datetime-local" value={f.expires_at} onChange={e=>set('expires_at',e.target.value)} />
            </div>
          </div>
          <div style={{ background:'#0a0a15', border:'1px solid #2e2e44', borderRadius:8, padding:'12px', marginBottom:14 }}>
            <div style={{ fontSize:11, color:'#a29bfe', marginBottom:8 }}>⚙️ Điều kiện hoàn thành</div>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:8 }}>
              <div>
                <label style={lbl}>Action *</label>
                <input style={inp} value={f.action} onChange={e=>set('action',e.target.value)} placeholder="VD: play_game, listen_music" required />
              </div>
              <div>
                <label style={lbl}>Số lần *</label>
                <input style={inp} type="number" min="1" value={f.count} onChange={e=>set('count',e.target.value)} required />
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding:'8px 18px', background:'transparent', border:'1px solid #2e2e44', borderRadius:8, color:'#555', cursor:'pointer' }}>Huỷ</button>
            <button type="submit" disabled={saving} style={{ padding:'8px 22px', background:'#a29bfe', border:'none', borderRadius:8, color:'#fff', fontWeight:600, cursor:'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo quest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuestManagementTab({ token, showToast }) {
  const [quests, setQuests]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(null); // null | 'create' | quest object
  const [saving, setSaving]   = useState(false);
  const [filter, setFilter]   = useState('all'); // 'all' | 'active' | 'inactive'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/quests', { headers:{ Authorization:`Bearer ${token}` } });
      const d = await r.json();
      setQuests(Array.isArray(d) ? d : []);
    } catch { setQuests([]); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (q) => {
    const r = await fetch(`/api/admin/quests/${q.id}/toggle`, {
      method:'PATCH', headers:{ Authorization:`Bearer ${token}` },
    });
    const d = await r.json();
    if (d.id) { showToast(`${d.is_active ? '✅ Bật' : '⏸️ Tắt'}: ${d.title}`); load(); }
    else showToast(`❌ ${d.error}`);
  };

  const deleteQuest = async (q) => {
    if (!window.confirm(`Xóa quest "${q.title}"?\nChỉ xóa được nếu chưa có user tham gia.`)) return;
    const r = await fetch(`/api/admin/quests/${q.id}`, {
      method:'DELETE', headers:{ Authorization:`Bearer ${token}` },
    });
    const d = await r.json();
    if (d.ok) { showToast('🗑️ Đã xóa quest'); load(); }
    else showToast(`❌ ${d.error}`);
  };

  const saveQuest = async (payload) => {
    setSaving(true);
    const isEdit = !!modal?.id;
    const url    = isEdit ? `/api/admin/quests/${modal.id}` : '/api/admin/quests';
    const method = isEdit ? 'PATCH' : 'POST';
    try {
      const r = await fetch(url, {
        method, headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.id || d.ok) {
        showToast(isEdit ? '✅ Đã cập nhật quest' : '✅ Tạo quest thành công');
        setModal(null); load();
      } else showToast(`❌ ${d.error}`);
    } finally { setSaving(false); }
  };

  const displayed = quests.filter(q =>
    filter === 'all' ? true : filter === 'active' ? q.is_active : !q.is_active
  );

  const toEditForm = (q) => ({
    id: q.id,
    title: q.title,
    description: q.description || '',
    type: q.type,
    category: q.category || '',
    reward_xu: q.reward_xu,
    action: q.requirement?.action || '',
    count: q.requirement?.count || 1,
    expires_at: q.expires_at ? q.expires_at.slice(0,16) : '',
  });

  return (
    <div>
      {/* toolbar */}
      <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        {['all','active','inactive'].map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:'4px 12px', borderRadius:6, border:'1px solid',
            borderColor: filter===f ? '#a29bfe' : '#2e2e44',
            background: filter===f ? '#a29bfe20' : 'transparent',
            color: filter===f ? '#a29bfe' : '#555', fontSize:12, cursor:'pointer',
          }}>{f==='all'?`Tất cả (${quests.length})`:f==='active'?`Đang bật (${quests.filter(q=>q.is_active).length})`:`Đã tắt (${quests.filter(q=>!q.is_active).length})`}</button>
        ))}
        <button onClick={()=>setModal('create')} style={{ marginLeft:'auto', padding:'6px 16px', background:'#a29bfe', border:'none', borderRadius:8, color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer' }}>➕ Tạo quest</button>
        <button onClick={load} style={S.refreshBtn}>↻ Làm mới</button>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>
            {['Quest', 'Loại / Danh mục', 'Thưởng', 'Điều kiện', 'Thống kê', 'Trạng thái', ''].map(h => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ ...S.td, textAlign:'center', color:'#333' }}>Đang tải...</td></tr>
            )}
            {!loading && displayed.length === 0 && (
              <tr><td colSpan={7} style={{ ...S.td, textAlign:'center', color:'#333' }}>Không có quest nào</td></tr>
            )}
            {displayed.map(q => (
              <tr key={q.id} style={{ opacity: q.is_active ? 1 : 0.5 }}>
                {/* title + desc */}
                <td style={S.td}>
                  <div style={{ fontWeight:600, color: q.is_active ? '#ddd' : '#555', maxWidth:180 }}>{q.title}</div>
                  {q.description && <div style={{ fontSize:11, color:'#444', marginTop:2, maxWidth:180 }}>{q.description.slice(0,60)}{q.description.length>60?'…':''}</div>}
                  {q.expires_at && <div style={{ fontSize:10, color:'#f6c90e', marginTop:2 }}>⏰ {new Date(q.expires_at).toLocaleDateString('vi-VN')}</div>}
                </td>
                {/* type/category */}
                <td style={S.td}>
                  <span style={{ ...S.badge(''), background:'transparent', border:`1px solid ${TYPE_COLORS[q.type]||'#444'}40`, color: TYPE_COLORS[q.type]||'#aaa', padding:'2px 7px' }}>{q.type}</span>
                  {q.category && <div style={{ fontSize:11, color:'#444', marginTop:4 }}>{CAT_LABELS[q.category]||q.category}</div>}
                </td>
                {/* reward */}
                <td style={S.td}><span style={{ color:'#f6c90e', fontWeight:600 }}>+{Number(q.reward_xu).toLocaleString()} MT</span></td>
                {/* requirement */}
                <td style={S.td}>
                  <div style={{ fontSize:11, color:'#74b9ff' }}>{q.requirement?.action}</div>
                  <div style={{ fontSize:11, color:'#444' }}>× {q.requirement?.count}</div>
                </td>
                {/* stats */}
                <td style={S.td}>
                  <div style={{ fontSize:11, color:'#555' }}>👤 {q.total_participants}</div>
                  <div style={{ fontSize:11, color:'#6fcf97' }}>✓ {q.total_completed}</div>
                  <div style={{ fontSize:11, color:'#a29bfe' }}>🏆 {q.total_claimed}</div>
                </td>
                {/* status */}
                <td style={S.td}><span style={S.badge(q.is_active ? 'completed' : 'failed')}>{q.is_active ? 'active' : 'inactive'}</span></td>
                {/* actions */}
                <td style={{ ...S.td, whiteSpace:'nowrap' }}>
                  <button onClick={()=>setModal(toEditForm(q))} style={{ ...S.refreshBtn, marginRight:4 }}>✏️</button>
                  <button onClick={()=>toggle(q)} style={{ ...S.refreshBtn, marginRight:4 }}>{q.is_active ? '⏸️' : '▶️'}</button>
                  {q.total_participants === 0 && (
                    <button onClick={()=>deleteQuest(q)} style={{ ...S.rejectBtn, fontSize:11, padding:'3px 8px' }}>🗑️</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <QuestModal
          initial={modal === 'create' ? null : modal}
          saving={saving}
          onSave={saveQuest}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── checkin admin tab ───────────────────────────────────────────────────────

function CheckinAdminTab({ token }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    import('../api.js').then(m => m.default.admin.checkinStats(token))
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={S.empty}>Đang tải...</div>;
  if (!data)   return <div style={S.empty}>Không tải được dữ liệu</div>;

  const { overview, topStreaks, daily, milestones } = data;

  return (
    <div>
      {/* Overview stats */}
      <div style={S.grid4}>
        {[
          { lbl:'Điểm danh hôm nay', val:overview.today_count, color:'#f6c90e' },
          { lbl:'Tổng người điểm danh', val:overview.total_users, color:'#a29bfe' },
          { lbl:'Tổng lượt điểm danh', val:Number(overview.total_checkins).toLocaleString(), color:'#74b9ff' },
          { lbl:'MT đã phát', val:Number(overview.total_xu_awarded||0).toLocaleString(), color:'#6fcf97' },
          { lbl:'Streak TB', val:`${overview.avg_streak||0}`, unit:'ngày', color:'#fd79a8' },
        ].map(({ lbl, val, color }) => (
          <div key={lbl} style={S.stat(color+'33')}>
            <div style={S.statLbl}>{lbl}</div>
            <div style={S.statVal(color)}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:14 }}>

        {/* Today's top streaks */}
        <div style={S.card}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid #1a1a28', fontSize:13, fontWeight:600, color:'#aaa' }}>
            🏆 Top streak điểm danh hôm nay
          </div>
          {topStreaks.length === 0
            ? <div style={S.empty}>Chưa có ai điểm danh hôm nay</div>
            : (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>#</th>
                    <th style={S.th}>Người dùng</th>
                    <th style={S.th}>Streak</th>
                    <th style={S.th}>MT nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {topStreaks.map((r, i) => (
                    <tr key={r.email}>
                      <td style={{ ...S.td, color:'#555' }}>{i + 1}</td>
                      <td style={S.td}>
                        <div style={{ fontWeight:500 }}>{r.username}</div>
                        <div style={{ fontSize:11, color:'#555' }}>{r.email}</div>
                      </td>
                      <td style={S.td}>
                        <span style={{ color:'#f6c90e', fontWeight:700 }}>
                          {r.streak_day >= 30 ? '👑' : r.streak_day >= 14 ? '🔥' : r.streak_day >= 7 ? '🏆' : '⚡'} {r.streak_day}
                        </span>
                      </td>
                      <td style={{ ...S.td, color:'#6fcf97', fontWeight:600 }}>
                        +{Number(r.xu_earned).toLocaleString()} MT
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>

        {/* Right column: milestones + 30-day chart */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Milestone hits */}
          <div style={S.card}>
            <div style={{ padding:'12px 14px', borderBottom:'1px solid #1a1a28', fontSize:13, fontWeight:600, color:'#aaa' }}>
              🎯 Milestone đạt được (tất cả thời gian)
            </div>
            <div style={{ padding:'14px' }}>
              {[{ day:7, label:'Streak 7 ngày 🏆', color:'#f6c90e' }, { day:14, label:'Streak 14 ngày 🔥', color:'#fd79a8' }, { day:30, label:'Streak 30 ngày 👑', color:'#a29bfe' }].map(({ day, label, color }) => {
                const hit = milestones.find(m => m.streak_day == day);
                return (
                  <div key={day} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #0d0d18' }}>
                    <span style={{ fontSize:13, color:'#ccc' }}>{label}</span>
                    <span style={{ fontSize:16, fontWeight:700, color }}>{hit ? Number(hit.hits).toLocaleString() : 0} lượt</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 30-day activity */}
          <div style={S.card}>
            <div style={{ padding:'12px 14px', borderBottom:'1px solid #1a1a28', fontSize:13, fontWeight:600, color:'#aaa' }}>
              📅 Lượt điểm danh 30 ngày qua
            </div>
            <div style={{ padding:'14px', maxHeight:180, overflowY:'auto' }}>
              {daily.length === 0
                ? <div style={{ color:'#444', textAlign:'center', fontSize:13, padding:'1rem 0' }}>Chưa có dữ liệu</div>
                : [...daily].reverse().map(row => (
                  <div key={row.date} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #0d0d18', fontSize:12 }}>
                    <span style={{ color:'#666' }}>{row.date}</span>
                    <span style={{ color:'#74b9ff', fontWeight:600 }}>{row.count} người</span>
                    <span style={{ color:'#6fcf97' }}>+{Number(row.xu).toLocaleString()} MT</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── user management tab ────────────────────────────────────────────────────

const ROLE_COLORS = { admin: '#a29bfe', creator: '#74b9ff', user: '#6fcf97' };

function UserManagementTab({ token, showToast }) {
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [offset, setOffset]     = useState(0);
  const LIMIT = 50;

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setOffset(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (off = 0, q = debouncedSearch) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: LIMIT, offset: off, ...(q ? { search: q } : {}) });
      const r = await fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setUsers(d.users || []);
      setTotal(d.total || 0);
    } catch { setUsers([]); } finally { setLoading(false); }
  }, [token, debouncedSearch]);

  useEffect(() => { load(offset); }, [offset, debouncedSearch, load]);

  const changeRole = async (u, newRole) => {
    const r = await fetch(`/api/admin/users/${u.id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: newRole }),
    });
    const d = await r.json();
    if (d.ok) { showToast(`✅ Đổi role ${u.username} → ${newRole}`); load(offset); }
    else showToast(`❌ ${d.error}`);
  };

  const banUser = async (u) => {
    const reason = prompt(`Lý do ban ${u.username}:`);
    if (reason === null) return;
    const r = await fetch(`/api/admin/users/${u.id}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    });
    const d = await r.json();
    if (d.ok) { showToast(`🚫 Đã ban ${u.username}`); load(offset); }
    else showToast(`❌ ${d.error}`);
  };

  const unbanUser = async (u) => {
    const r = await fetch(`/api/admin/users/${u.id}/unban`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    if (d.ok) { showToast(`✅ Đã gỡ ban ${u.username}`); load(offset); }
    else showToast(`❌ ${d.error}`);
  };

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div>
      {/* toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          style={{ ...S.search, width: 260 }}
          placeholder="Tìm username hoặc email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 12, color: '#444' }}>
          {loading ? 'Đang tải...' : `${total} users`}
        </span>
        <button style={{ ...S.refreshBtn, marginLeft: 'auto' }} onClick={() => load(offset)}>↻ Làm mới</button>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>
            {['User', 'Role', 'Số dư', 'Đã kiếm', 'Ngày tạo', 'Trạng thái', ''].map(h => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {!loading && users.length === 0 && (
              <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#333' }}>Không có user nào</td></tr>
            )}
            {users.map(u => (
              <tr key={u.id} style={{ opacity: u.banned_at ? 0.5 : 1 }}>
                {/* user info */}
                <td style={S.td}>
                  <div style={{ fontWeight: 600, color: u.banned_at ? '#555' : '#fff' }}>{u.username}</div>
                  <div style={{ fontSize: 11, color: '#444' }}>{u.email}</div>
                </td>

                {/* role selector */}
                <td style={S.td}>
                  <select
                    value={u.role}
                    onChange={e => changeRole(u, e.target.value)}
                    style={{
                      padding: '3px 8px', background: '#13131f', border: `1px solid ${ROLE_COLORS[u.role] || '#444'}40`,
                      borderRadius: 6, color: ROLE_COLORS[u.role] || '#aaa', fontSize: 12, cursor: 'pointer', outline: 'none',
                    }}
                  >
                    {['user', 'creator', 'admin'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>

                {/* balances */}
                <td style={S.td}><span style={{ color: '#6fcf97', fontWeight: 500 }}>{Number(u.balance || 0).toLocaleString()}</span></td>
                <td style={S.td}><span style={{ color: '#555', fontSize: 12 }}>{Number(u.total_earned || 0).toLocaleString()}</span></td>

                {/* date */}
                <td style={S.td}>
                  <span style={{ fontSize: 11, color: '#444' }}>
                    {new Date(u.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </td>

                {/* status */}
                <td style={S.td}>
                  {u.banned_at ? (
                    <div>
                      <span style={S.badge('failed')}>banned</span>
                      {u.ban_reason && <div style={{ fontSize: 10, color: '#555', marginTop: 2, maxWidth: 120 }}>{u.ban_reason}</div>}
                    </div>
                  ) : (
                    <span style={S.badge('completed')}>active</span>
                  )}
                </td>

                {/* actions */}
                <td style={S.td}>
                  {u.banned_at ? (
                    <button style={{ ...S.approveBtn, fontSize: 11 }} onClick={() => unbanUser(u)}>Gỡ ban</button>
                  ) : (
                    <button style={{ ...S.rejectBtn, fontSize: 11 }} onClick={() => banUser(u)}>Ban</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderTop: '1px solid #1a1a28' }}>
            <button style={S.refreshBtn} disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>← Trước</button>
            <span style={{ fontSize: 12, color: '#444' }}>Trang {currentPage} / {totalPages}</span>
            <button style={S.refreshBtn} disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>Tiếp →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

function DevToolsTab({ token, showToast }) {
  const [resetting, setResetting] = useState(false);
  const [result, setResult]       = useState(null);

  // ── Adjust MT state ──
  const [users, setUsers]         = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [userSearch, setUserSearch]     = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjNote, setAdjNote]     = useState('');
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjResult, setAdjResult]   = useState(null);
  const searchRef = useRef(null);

  // ── Adjust history state ──
  const [history, setHistory]       = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const fetchHistory = () => {
    setHistLoading(true);
    fetch('/api/admin/adjust-history?limit=20', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : []))
      .catch(() => {}).finally(() => setHistLoading(false));
  };

  const fetchUsers = () =>
    fetch('/api/admin/users?limit=200', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : (d.users || []))).catch(() => {});

  useEffect(() => { fetchUsers(); fetchHistory(); }, [token]);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedUserObj = users.find(u => u.id === selectedUser);

  const filteredUsers = userSearch.trim()
    ? users.filter(u =>
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  const selectUser = (u) => {
    setSelectedUser(u.id);
    setUserSearch(u.username);
    setDropdownOpen(false);
  };

  const clearUser = () => {
    setSelectedUser('');
    setUserSearch('');
    setDropdownOpen(false);
  };

  const adjustXu = async () => {
    if (!selectedUser || !adjAmount || adjAmount === '0') return;
    setAdjLoading(true); setAdjResult(null);
    try {
      const r = await fetch('/api/admin/adjust-xu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: selectedUser, amount: parseInt(adjAmount), note: adjNote }),
      });
      const d = await r.json();
      if (d.ok) {
        setAdjResult({ ok: true, entry: d.entry });
        showToast(`✅ Đã điều chỉnh ${parseInt(adjAmount) > 0 ? '+' : ''}${adjAmount} MT cho ${selectedUserObj?.username}`);
        setAdjAmount(''); setAdjNote('');
        fetchUsers();
        fetchHistory();
      } else {
        setAdjResult({ ok: false, error: d.error });
        showToast(`❌ ${d.error}`);
      }
    } catch (err) {
      setAdjResult({ ok: false, error: err.message });
    } finally { setAdjLoading(false); }
  };

  const resetSeed = async () => {
    const confirmed = window.confirm(
      '⚠️ Thao tác này sẽ XÓA 3 tài khoản test (admin@xu.vn, nam@creator.vn, linh@user.vn) và toàn bộ quests, sau đó seed lại.\n\nUser thật sẽ KHÔNG bị ảnh hưởng.\n\nTiếp tục?'
    );
    if (!confirmed) return;
    setResetting(true);
    setResult(null);
    try {
      const r = await fetch('/api/admin/reset-seed', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.ok) {
        setResult({ ok: true, data: d });
        showToast('✅ Reset & seed thành công!');
      } else {
        setResult({ ok: false, error: d.error });
        showToast(`❌ Lỗi: ${d.error}`);
      }
    } catch (err) {
      setResult({ ok: false, error: err.message });
      showToast(`❌ ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 20, lineHeight: 1.7 }}>
        Công cụ dành cho môi trường <strong style={{ color: '#fdcb6e' }}>development</strong>.
        Dùng để điều chỉnh MT và reset dữ liệu test.
      </div>

      {/* ── Adjust MT panel ── */}
      <div style={{ background: '#0e0e17', border: '1px solid #1e2a0e', borderRadius: 12, padding: '1.5rem', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, color: '#6fcf97', marginBottom: 8 }}>💰 Điều chỉnh MT thủ công</div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>
          Cộng (+) hoặc trừ (−) MT cho bất kỳ user nào. Ghi vào ledger với loại <code style={{ color: '#a29bfe' }}>admin_adjust</code>.
        </div>

        {/* User searchable picker */}
        <div style={{ marginBottom: 10 }} ref={searchRef}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Tìm user <span style={{ color: '#333', textTransform: 'none', letterSpacing: 0 }}>— gõ tên hoặc email</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={userSearch}
              onChange={e => { setUserSearch(e.target.value); setSelectedUser(''); setDropdownOpen(true); }}
              onFocus={() => setDropdownOpen(true)}
              style={{
                width: '100%', padding: '8px 36px 8px 10px', background: '#13131f',
                border: `1px solid ${selectedUser ? '#6fcf9760' : '#1e1e2e'}`,
                borderRadius: 8, color: '#ccc', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
            {/* clear / indicator */}
            <span
              onClick={selectedUser || userSearch ? clearUser : undefined}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: selectedUser ? '#6fcf97' : '#333', cursor: selectedUser || userSearch ? 'pointer' : 'default', userSelect: 'none' }}
            >
              {selectedUser ? '✓' : userSearch ? '✕' : '▾'}
            </span>

            {/* dropdown */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                background: '#13131f', border: '1px solid #2e2e44', borderRadius: 8,
                maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 32px #000a',
              }}>
                {filteredUsers.length === 0 ? (
                  <div style={{ padding: '10px 14px', fontSize: 12, color: '#444' }}>Không tìm thấy user nào</div>
                ) : filteredUsers.map(u => (
                  <div
                    key={u.id}
                    onClick={() => selectUser(u)}
                    style={{
                      padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #1a1a28',
                      background: selectedUser === u.id ? '#1e2a1e' : 'transparent',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1a1a2e'}
                    onMouseLeave={e => e.currentTarget.style.background = selectedUser === u.id ? '#1e2a1e' : 'transparent'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{u.username}</span>
                        <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>{u.email}</span>
                      </div>
                      <span style={{ fontSize: 12, color: '#6fcf97', fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 8 }}>
                        {Number(u.balance || 0).toLocaleString()} MT
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>
                      <span style={{ padding: '1px 6px', borderRadius: 4, background: '#1e1e2e', color: '#666' }}>{u.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* count hint */}
          <div style={{ fontSize: 11, color: '#333', marginTop: 4 }}>
            {userSearch && !selectedUser ? `${filteredUsers.length} / ${users.length} kết quả` : selectedUser ? `✓ Đã chọn: ${selectedUserObj?.email}` : `${users.length} users`}
          </div>
        </div>

        {/* Amount + note row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Số MT (âm để trừ)</div>
            <input
              type="number"
              placeholder="vd: 500 hoặc -200"
              value={adjAmount}
              onChange={e => setAdjAmount(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: '#13131f', border: `1px solid ${adjAmount && parseInt(adjAmount) < 0 ? '#ff6b6b60' : adjAmount ? '#6fcf9760' : '#1e1e2e'}`, borderRadius: 8, color: '#ccc', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Ghi chú (tùy chọn)</div>
            <input
              type="text"
              placeholder="vd: Thưởng sự kiện tháng 6"
              value={adjNote}
              onChange={e => setAdjNote(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 8, color: '#ccc', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Preview */}
        {selectedUser && adjAmount && parseInt(adjAmount) !== 0 && (
          <div style={{ fontSize: 12, background: '#13131f', borderRadius: 8, padding: '8px 12px', marginBottom: 12, color: '#888', lineHeight: 1.7 }}>
            👤 <strong style={{ color: '#ccc' }}>{selectedUserObj?.username}</strong>
            {' · '}số dư hiện tại: <strong style={{ color: '#fdcb6e' }}>{Number(selectedUserObj?.balance || 0).toLocaleString()} MT</strong>
            {' → '}sau điều chỉnh:{' '}
            <strong style={{ color: parseInt(adjAmount) > 0 ? '#6fcf97' : '#ff6b6b' }}>
              {Math.max(0, Number(selectedUserObj?.balance || 0) + parseInt(adjAmount || 0)).toLocaleString()} MT
            </strong>
          </div>
        )}

        <button
          onClick={adjustXu}
          disabled={adjLoading || !selectedUser || !adjAmount || parseInt(adjAmount) === 0}
          style={{
            padding: '8px 20px', borderRadius: 8, border: '1px solid #6fcf9760',
            background: adjLoading || !selectedUser || !adjAmount ? '#0a1a0a' : '#0e2a1e',
            color: adjLoading || !selectedUser || !adjAmount ? '#333' : '#6fcf97',
            fontSize: 13, fontWeight: 600, cursor: adjLoading || !selectedUser || !adjAmount ? 'not-allowed' : 'pointer',
          }}
        >
          {adjLoading ? '⏳ Đang xử lý...' : parseInt(adjAmount || 0) >= 0 ? '➕ Cộng MT' : '➖ Trừ MT'}
        </button>

        {adjResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 12, lineHeight: 1.8,
            background: adjResult.ok ? '#0e2a1e' : '#2a0e0e',
            border: `1px solid ${adjResult.ok ? '#00b89440' : '#ff6b6b40'}`,
            color: adjResult.ok ? '#6fcf97' : '#ff6b6b' }}>
            {adjResult.ok ? (
              <>✅ Thành công! Số dư sau: <strong>{Number(adjResult.entry?.balance_after || 0).toLocaleString()} MT</strong></>
            ) : (
              <>❌ {adjResult.error}</>
            )}
          </div>
        )}
      </div>

      {/* ── Adjust history panel ── */}
      <div style={{ background: '#0e0e17', border: '1px solid #1a1a2e', borderRadius: 12, padding: '1.5rem', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, color: '#a29bfe' }}>📋 Lịch sử điều chỉnh MT</div>
          <button
            onClick={fetchHistory}
            disabled={histLoading}
            style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #2e2e44', borderRadius: 6, color: '#555', fontSize: 12, cursor: 'pointer' }}
          >
            {histLoading ? '...' : '↻ Làm mới'}
          </button>
        </div>

        {histLoading && <div style={{ fontSize: 12, color: '#333', padding: '1rem 0', textAlign: 'center' }}>Đang tải...</div>}

        {!histLoading && history.length === 0 && (
          <div style={{ fontSize: 12, color: '#333', padding: '1rem 0', textAlign: 'center' }}>Chưa có lần điều chỉnh nào</div>
        )}

        {!histLoading && history.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map(h => (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                padding: '9px 12px', background: '#13131f', borderRadius: 8,
                border: `1px solid ${Number(h.amount) > 0 ? '#6fcf9720' : '#ff6b6b20'}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{h.username}</span>
                    <span style={{ fontSize: 11, color: '#444' }}>{h.email}</span>
                    {h.admin_username && (
                      <span style={{ fontSize: 11, color: '#555', background: '#1e1e2e', borderRadius: 4, padding: '1px 6px' }}>
                        by {h.admin_username}
                      </span>
                    )}
                  </div>
                  {h.metadata?.note && (
                    <div style={{ fontSize: 11, color: '#555', marginTop: 3, fontStyle: 'italic' }}>"{h.metadata.note}"</div>
                  )}
                  <div style={{ fontSize: 11, color: '#333', marginTop: 3 }}>
                    {Number(h.balance_before).toLocaleString()} → {Number(h.balance_after).toLocaleString()} MT
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 12, flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: Number(h.amount) > 0 ? '#6fcf97' : '#ff6b6b' }}>
                    {Number(h.amount) > 0 ? '+' : ''}{Number(h.amount).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: '#333', marginTop: 2 }}>
                    {new Date(h.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Reset seed panel ── */}
      <div style={{ background: '#0e0e17', border: '1px solid #2a1e0e', borderRadius: 12, padding: '1.5rem' }}>
        <div style={{ fontWeight: 600, color: '#fdcb6e', marginBottom: 8 }}>🔄 Reset dữ liệu test</div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 16, lineHeight: 1.7 }}>
          Xóa 3 tài khoản test + toàn bộ quests rồi seed lại từ đầu.<br />
          Mật khẩu sau reset: <code style={{ color: '#a29bfe' }}>password123</code>
        </div>
        <div style={{ fontSize: 12, color: '#444', marginBottom: 16, background: '#13131f', borderRadius: 8, padding: '10px 14px', lineHeight: 1.8 }}>
          📧 admin@xu.vn → <span style={{ color: '#888' }}>admin</span><br />
          📧 nam@creator.vn → <span style={{ color: '#888' }}>creator, 10.000 MT</span><br />
          📧 linh@user.vn → <span style={{ color: '#888' }}>user, 10.000 MT</span>
        </div>
        <button
          onClick={resetSeed}
          disabled={resetting}
          style={{
            padding: '8px 20px', borderRadius: 8, border: '1px solid #fdcb6e60',
            background: resetting ? '#1a1410' : '#2a1e0e', color: resetting ? '#666' : '#fdcb6e',
            fontSize: 13, fontWeight: 600, cursor: resetting ? 'not-allowed' : 'pointer',
          }}
        >
          {resetting ? '⏳ Đang reset...' : '🔄 Reset & Seed lại'}
        </button>

        {result && (
          <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, fontSize: 12, lineHeight: 1.8,
            background: result.ok ? '#0e2a1e' : '#2a0e0e',
            border: `1px solid ${result.ok ? '#00b89440' : '#ff6b6b40'}`,
            color: result.ok ? '#6fcf97' : '#ff6b6b' }}>
            {result.ok ? (
              <>
                ✅ Reset thành công!<br />
                Đã xóa: {result.data.deleted.join(', ')}<br />
                Đã seed: {result.data.seeded.users.length} users, {result.data.seeded.quests} quests
              </>
            ) : (
              <>❌ Lỗi: {result.error}</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ConfigTab ───────────────────────────────────────────────────────────────
const CONFIG_LABELS = {
  WITHDRAWAL_FEE_PCT:   { label:'Phí rút tiền', hint:'Số thập phân. VD: 0.10 = 10%', suffix:'(thập phân)' },
  TIP_PLATFORM_FEE_PCT: { label:'Phí platform khi tip', hint:'Số thập phân. VD: 0.05 = 5%', suffix:'(thập phân)' },
  DEPOSIT_FEE_PCT:      { label:'Phí nạp tiền', hint:'0 = miễn phí', suffix:'(thập phân)' },
  VND_PER_XU:           { label:'Tỷ giá MT → VNĐ', hint:'1 MT = ? VNĐ khi rút', suffix:'VNĐ/MT' },
  XU_FREE_EXPIRE_DAYS:  { label:'Ngày hết hạn MT thưởng', hint:'Số ngày MT quest/referral tự expire', suffix:'ngày' },
  MIN_WITHDRAWAL_XU:    { label:'Rút tối thiểu', hint:'Số MT nhỏ nhất có thể rút', suffix:'MT' },
  KYC_THRESHOLD_XU:     { label:'Ngưỡng cần KYC', hint:'Rút trên mức này phải xác minh danh tính', suffix:'MT' },
};

function ConfigTab({ token, showToast }) {
  const [configs, setConfigs] = useState([]);
  const [editing, setEditing] = useState({});
  const [saving,  setSaving]  = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/config', { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => r.json())
      .then(rows => {
        setConfigs(rows);
        const init = {};
        rows.forEach(r => { init[r.key] = r.value; });
        setEditing(init);
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, [token]);

  const save = async (key) => {
    setSaving(s => ({...s, [key]:true}));
    try {
      const r = await fetch(`/api/admin/config/${key}`, {
        method:'PUT',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ value: editing[key] }),
      });
      const d = await r.json();
      if (!r.ok) { showToast(`❌ ${d.error}`); return; }
      setConfigs(cs => cs.map(c => c.key === key ? {...c, value: d.value, updated_at: d.updated_at} : c));
      showToast(`✅ Đã lưu ${CONFIG_LABELS[key]?.label || key}`);
    } catch { showToast('❌ Lưu thất bại'); }
    finally { setSaving(s => ({...s, [key]:false})); }
  };

  if (loading) return <div style={{color:'#555',padding:'2rem'}}>Đang tải cấu hình...</div>;

  return (
    <div>
      <div style={{marginBottom:'1.25rem'}}>
        <div style={{color:'#fff',fontWeight:600,fontSize:15,marginBottom:4}}>⚙️ Cấu hình hệ thống</div>
        <div style={{color:'#555',fontSize:12}}>Thay đổi phí, tỷ giá và giới hạn giao dịch. Áp dụng ngay lập tức (cache 5 phút).</div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:12}}>
        {configs.map(cfg => {
          const meta = CONFIG_LABELS[cfg.key] || { label: cfg.key, hint: cfg.description, suffix:'' };
          const current = parseFloat(cfg.value);
          const displayPct = cfg.key.endsWith('_PCT') ? ` (${(current*100).toFixed(0)}%)` : '';
          const changed = editing[cfg.key] !== cfg.value;
          return (
            <div key={cfg.key} style={{background:'#0e0e17',border:`1px solid ${changed?'#6C5CE7':'#1e1e2e'}`,borderRadius:10,padding:'14px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{color:'#fff',fontWeight:600,fontSize:13}}>{meta.label}</div>
                  <div style={{color:'#555',fontSize:11,marginTop:2}}>{meta.hint}</div>
                </div>
                <span style={{fontSize:11,color:'#444',background:'#13131f',padding:'2px 8px',borderRadius:4,fontFamily:'monospace'}}>{meta.suffix}</span>
              </div>

              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input
                  type="number" step="any"
                  value={editing[cfg.key] ?? cfg.value}
                  onChange={e => setEditing(ed => ({...ed, [cfg.key]: e.target.value}))}
                  style={{flex:1,padding:'7px 10px',background:'#13131f',border:'1px solid #2e2e44',borderRadius:7,color:'#fff',fontSize:13,outline:'none'}}
                />
                <button
                  onClick={()=>save(cfg.key)}
                  disabled={saving[cfg.key] || !changed}
                  style={{padding:'7px 14px',background:changed?'#6C5CE7':'#1a1a2e',border:'none',borderRadius:7,color:changed?'#fff':'#444',fontSize:12,fontWeight:600,cursor:changed?'pointer':'default',transition:'all .15s'}}
                >
                  {saving[cfg.key] ? '...' : 'Lưu'}
                </button>
              </div>

              <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                <span style={{fontSize:11,color:'#555'}}>Hiện tại: <span style={{color:'#a29bfe'}}>{cfg.value}{displayPct}</span></span>
                <span style={{fontSize:10,color:'#333'}}>cập nhật {fmtDate(cfg.updated_at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{marginTop:'1.5rem',background:'#13131f',border:'1px solid #1e1e2e',borderRadius:8,padding:'12px 16px'}}>
        <div style={{color:'#555',fontSize:12,fontWeight:600,marginBottom:8}}>💡 Cách cổng thanh toán hoạt động</div>
        <div style={{color:'#444',fontSize:12,lineHeight:1.7}}>
          • <b style={{color:'#6fcf97'}}>MoMo / ZaloPay:</b> Đang dùng sandbox. Để dùng thật, thêm secrets: <code style={{color:'#74b9ff'}}>MOMO_ACCESS_KEY</code>, <code style={{color:'#74b9ff'}}>MOMO_SECRET_KEY</code>, <code style={{color:'#74b9ff'}}>ZALOPAY_KEY1</code>, <code style={{color:'#74b9ff'}}>ZALOPAY_KEY2</code> và đổi endpoint sang production.<br/>
          • <b style={{color:'#6fcf97'}}>Gửi email:</b> Thêm secrets: <code style={{color:'#74b9ff'}}>SMTP_HOST</code>, <code style={{color:'#74b9ff'}}>SMTP_USER</code>, <code style={{color:'#74b9ff'}}>SMTP_PASS</code> để bật email thông báo rút tiền.<br/>
          • <b style={{color:'#6fcf97'}}>IPN Callback URL:</b> <code style={{color:'#a29bfe',fontSize:11}}>{window.location.origin}/api/wallet/momo/ipn</code>
        </div>
      </div>
    </div>
  );
}

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
          ['notify',      '📣 Thông báo'],
          ['quests',      '🏆 Quests'],
          ['checkin',     '🗓 Điểm danh'],
          ['users',       '👥 Users'],
          ['config',      '⚙️ Cấu hình'],
          ['devtools',    '🔧 Dev Tools'],
        ].map(([k,l])=>(
          <button key={k} style={S.topTab(tab===k)} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'withdrawals'  && <WithdrawalTab   token={token} showToast={showToast} />}
      {tab === 'deposits'     && <DepositTab      token={token} showToast={showToast} />}
      {tab === 'transactions' && <TransactionTab  token={token} />}
      {tab === 'charts'       && <ChartsTab       token={token} />}
      {tab === 'kyc'          && <KycTab              token={token} showToast={showToast} />}
      {tab === 'notify'       && <NotificationTab    token={token} showToast={showToast} />}
      {tab === 'quests'       && <QuestManagementTab token={token} showToast={showToast} />}
      {tab === 'checkin'      && <CheckinAdminTab    token={token} />}
      {tab === 'users'        && <UserManagementTab  token={token} showToast={showToast} />}
      {tab === 'config'       && <ConfigTab          token={token} showToast={showToast} />}
      {tab === 'devtools'     && <DevToolsTab        token={token} showToast={showToast} />}

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}
