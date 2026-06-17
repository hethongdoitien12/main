import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

// ─── helpers ─────────────────────────────────────────────────────────────────
function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function firstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); } // 0=Sun

const MONTHS_VI = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                   'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const DAYS_VI = ['CN','T2','T3','T4','T5','T6','T7'];

const REWARDS = [
  { day:1,  xu:50,  label:'Ngày 1' },
  { day:2,  xu:75,  label:'Ngày 2' },
  { day:3,  xu:100, label:'Ngày 3+' },
  { day:7,  xu:250, label:'Tuần 1 🏆' },
  { day:14, xu:350, label:'2 tuần 🔥' },
  { day:30, xu:500, label:'Tháng 👑' },
];

function streakReward(day) {
  if (day >= 30) return 500;
  if (day >= 14) return 350;
  if (day >= 7)  return 250;
  if (day >= 3)  return 100;
  if (day >= 2)  return 75;
  return 50;
}

// ─── styles ──────────────────────────────────────────────────────────────────
const S = {
  h1:    { fontSize:24, fontWeight:700, color:'#fff', marginBottom:4 },
  sub:   { color:'#666', fontSize:14, marginBottom:'2rem' },
  grid:  { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:16 },
  card:  { background:'#0e0e17', border:'1px solid #1e1e2e', borderRadius:12, padding:'1.5rem' },
  lbl:   { fontSize:11, color:'#555', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 },
  val:   (c) => ({ fontSize:28, fontWeight:800, color:c||'#fff', lineHeight:1 }),
  sub2:  { fontSize:11, color:'#444', marginTop:3 },
  calDay:(opts) => ({
    aspectRatio:'1', borderRadius:8, display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:500,
    background:opts.checked ? '#f6c90e' : opts.isToday ? '#f6c90e18' : opts.empty ? 'transparent' : '#13131f',
    border:`1px solid ${opts.checked ? '#f6c90e60' : opts.isToday ? '#f6c90e40' : opts.empty ? 'transparent' : '#1a1a28'}`,
    color:opts.checked ? '#1a1a00' : opts.isToday ? '#f6c90e' : opts.empty ? 'transparent' : '#666',
    position:'relative',
  }),
  streakBar: (pct) => ({
    height:6, borderRadius:3, background:'linear-gradient(90deg,#f6c90e,#fdcb6e)',
    width:`${Math.min(100,pct)}%`, transition:'width .5s ease',
  }),
};

// ─── Checkin button ───────────────────────────────────────────────────────────
function CheckinButton({ status, onDone }) {
  const { token, refreshWallet } = useAuth();
  const [doing, setDoing] = useState(false);
  const [msg,   setMsg]   = useState('');

  const doIt = async () => {
    if (doing || status?.checked_in_today) return;
    setDoing(true); setMsg('');
    try {
      const r = await api.checkin.doIt(token);
      setMsg(`✓ +${r.xu_earned} XU — Streak ${r.streak_day} ngày!`);
      refreshWallet && refreshWallet();
      onDone && onDone();
    } catch (e) {
      setMsg(e.message || 'Lỗi');
    } finally { setDoing(false); }
  };

  const done = status?.checked_in_today;
  const reward = status?.next_reward || 50;
  const nextDay = status?.next_day || 1;

  return (
    <div style={{ textAlign:'center' }}>
      <button
        onClick={doIt} disabled={doing || done}
        style={{
          width:'100%', padding:'14px 0', borderRadius:10, fontWeight:800, fontSize:16,
          border:`1px solid ${done ? '#2e2e44' : '#f6c90e60'}`,
          background:done ? '#13131f' : 'linear-gradient(135deg,#f6c90e,#fdcb6e)',
          color:done ? '#555' : '#1a1a00',
          cursor:done ? 'default' : 'pointer',
          opacity:doing ? .6 : 1, transition:'all .2s',
          letterSpacing:'.02em',
        }}>
        {done ? '✓ Đã điểm danh hôm nay' : doing ? 'Đang xử lý...' : `🗓 Điểm danh · +${reward} XU (ngày ${nextDay})`}
      </button>
      {msg && (
        <div style={{ marginTop:10, fontSize:13, color: msg.startsWith('✓') ? '#6fcf97' : '#ff6b6b',
          background:'#13131f', border:'1px solid #1e1e2e', borderRadius:8, padding:'8px 14px' }}>
          {msg}
        </div>
      )}
    </div>
  );
}

// ─── Monthly calendar ─────────────────────────────────────────────────────────
function MonthCalendar({ year, month, checkedSet, streakMap }) {
  const totalDays = daysInMonth(year, month);
  const firstDay  = firstDayOfMonth(year, month); // 0=Sun → shift to Mon-first
  const offset    = (firstDay + 6) % 7;           // Mon=0, Tue=1 ... Sun=6
  const todayStr  = new Date().toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ d, dateStr });
  }

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:6 }}>
        {DAYS_VI.map(dn => (
          <div key={dn} style={{ fontSize:10, color:'#444', textAlign:'center', padding:'2px 0' }}>{dn}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e${i}`} style={S.calDay({ empty:true })} />;
          const checked = checkedSet.has(cell.dateStr);
          const isToday = cell.dateStr === todayStr;
          const sDay    = streakMap?.[cell.dateStr];
          return (
            <div key={cell.dateStr} style={S.calDay({ checked, isToday })}>
              <span style={{ fontSize:11 }}>{cell.d}</span>
              {checked && sDay && (
                <span style={{ fontSize:8, opacity:.7, lineHeight:1 }}>×{sDay}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Checkin() {
  const { token } = useAuth();
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const d = await api.checkin.status(token);
      setStatus(d);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Build sets
  const checkedSet  = new Set((status?.recent || []).map(r => r.checked_in_date));
  const streakMap   = Object.fromEntries((status?.recent || []).map(r => [r.checked_in_date, r.streak_day]));

  const streak      = status?.current_streak  || 0;
  const totalDays   = status?.recent?.length  || 0;
  const totalXu     = (status?.recent || []).reduce((s, r) => s + Number(r.xu_earned), 0);

  const nextMile    = REWARDS.filter(r => r.day > streak)[0];
  const prevMonth   = () => { if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); } else setViewMonth(m => m-1); };
  const nextMonth   = () => {
    const today = new Date();
    if (viewYear === today.getFullYear() && viewMonth === today.getMonth()) return;
    if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); } else setViewMonth(m => m+1);
  };
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  return (
    <div>
      <div style={S.h1}>Điểm danh hàng ngày</div>
      <div style={S.sub}>Điểm danh mỗi ngày để tích streak và nhận thưởng XU</div>

      {/* Checkin button */}
      {!loading && status && (
        <div style={{ ...S.card, marginBottom:16 }}>
          <CheckinButton status={status} onDone={load} />
        </div>
      )}

      <div style={S.grid}>
        {/* Streak & stats */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Streak card */}
          <div style={S.card}>
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <div style={{ fontSize:56, lineHeight:1 }}>
                {streak >= 30 ? '👑' : streak >= 14 ? '🔥' : streak >= 7 ? '🏆' : streak >= 3 ? '⚡' : '📅'}
              </div>
              <div>
                <div style={S.lbl}>Streak hiện tại</div>
                <div style={S.val('#f6c90e')}>{streak}</div>
                <div style={S.sub2}>ngày liên tiếp</div>
              </div>
            </div>

            {nextMile && (
              <div style={{ marginTop:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#555', marginBottom:6 }}>
                  <span>→ Milestone: {nextMile.label}</span>
                  <span style={{ color:'#f6c90e' }}>+{nextMile.xu} XU</span>
                </div>
                <div style={{ height:6, background:'#1e1e2e', borderRadius:3, overflow:'hidden' }}>
                  <div style={S.streakBar((streak/nextMile.day)*100)} />
                </div>
                <div style={{ fontSize:11, color:'#444', marginTop:4 }}>{streak} / {nextMile.day} ngày</div>
              </div>
            )}
            {!nextMile && streak >= 30 && (
              <div style={{ marginTop:12, padding:'8px 12px', background:'#f6c90e18', borderRadius:8, fontSize:13, color:'#f6c90e', textAlign:'center' }}>
                👑 Tối đa! +500 XU mỗi ngày
              </div>
            )}
          </div>

          {/* Summary stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { lbl:'Tổng ngày điểm danh', val:totalDays, unit:'ngày', color:'#a29bfe' },
              { lbl:'Tổng XU kiếm được', val:totalXu.toLocaleString(), unit:'XU', color:'#6fcf97' },
            ].map(({ lbl, val, unit, color }) => (
              <div key={lbl} style={{ ...S.card, padding:'1rem' }}>
                <div style={S.lbl}>{lbl}</div>
                <div style={S.val(color)}>{val}</div>
                <div style={S.sub2}>{unit}</div>
              </div>
            ))}
          </div>

          {/* Reward table */}
          <div style={S.card}>
            <div style={{ fontSize:13, fontWeight:600, color:'#aaa', marginBottom:12 }}>Bảng phần thưởng</div>
            {REWARDS.map(({ day, xu, label }) => {
              const reached = streak >= day;
              return (
                <div key={day} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'8px 0', borderBottom:'1px solid #0d0d18',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{
                      width:28, height:28, borderRadius:'50%', flexShrink:0,
                      background:reached ? '#f6c90e20' : '#13131f',
                      border:`1px solid ${reached ? '#f6c90e60' : '#1e1e2e'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, color:reached ? '#f6c90e' : '#444',
                    }}>
                      {reached ? '✓' : day}
                    </div>
                    <span style={{ fontSize:13, color:reached ? '#ddd' : '#555' }}>{label}</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:600, color:reached ? '#f6c90e' : '#444' }}>
                    +{xu} XU
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendar */}
        <div style={S.card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <button onClick={prevMonth} style={{ background:'none', border:'none', color:'#888', fontSize:18, cursor:'pointer', padding:'0 6px' }}>‹</button>
            <div style={{ fontSize:14, fontWeight:600, color:'#ddd' }}>
              {MONTHS_VI[viewMonth]} {viewYear}
            </div>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              style={{ background:'none', border:'none', color:isCurrentMonth?'#333':'#888', fontSize:18, cursor:isCurrentMonth?'default':'pointer', padding:'0 6px' }}>›</button>
          </div>

          <MonthCalendar year={viewYear} month={viewMonth} checkedSet={checkedSet} streakMap={streakMap} />

          <div style={{ marginTop:14, display:'flex', gap:14, fontSize:11, color:'#444' }}>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:12, height:12, borderRadius:3, background:'#f6c90e', display:'inline-block' }} />
              Đã điểm danh
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:12, height:12, borderRadius:3, background:'#f6c90e18', border:'1px solid #f6c90e40', display:'inline-block' }} />
              Hôm nay
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:12, height:12, borderRadius:3, background:'#13131f', border:'1px solid #1a1a28', display:'inline-block' }} />
              Chưa điểm danh
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
