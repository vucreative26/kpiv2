export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const currentMonth=()=>today().slice(0,7);
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const uid=p=>`${p}-${crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)}`;
export const money=v=>`${(Number(v)||0).toLocaleString('vi-VN')} ₫`;
export const fmtDate=v=>v?new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(`${v}T12:00:00`)):'Chưa có lịch';
export const shortDate=v=>v?new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit'}).format(new Date(`${v}T12:00:00`)):'';
export const weekday=v=>new Intl.DateTimeFormat('vi-VN',{weekday:'short'}).format(new Date(`${v}T12:00:00`));
export const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
export const monthDays=p=>{const [y,m]=p.split('-').map(Number),n=new Date(y,m,0).getDate();return Array.from({length:n},(_,i)=>`${p}-${String(i+1).padStart(2,'0')}`)};
export function monthWeeks(p){const days=monthDays(p),out=[];let i=0,n=1,size=8-(new Date(`${days[0]}T12:00:00`).getDay()||7);while(i<days.length){const slice=days.slice(i,i+size);out.push({number:n++,start:slice[0],end:slice.at(-1),days:slice});i+=size;size=7;}return out;}
export const timeRange=x=>!x.date?'Chưa có lịch':!x.startTime?`${fmtDate(x.date)} · Chưa có giờ`:`${fmtDate(x.date)} · ${x.startTime.slice(0,5)} → ${(x.endTime||'').slice(0,5)||'—'}`;
export function subProgress(sub,tasks){const rows=tasks.filter(t=>t.subtaskId===sub.id);return rows.length?{done:rows.filter(t=>t.completed).length,total:rows.length}:{done:sub.completed?1:0,total:1};}
export function kpiProgress(kpi,subs,tasks){const rows=subs.filter(s=>s.kpiId===kpi.id);return {done:rows.filter(s=>subProgress(s,tasks).done===subProgress(s,tasks).total).length,total:rows.length};}
export const pct=p=>p.total?Math.round(p.done/p.total*100):0;
export const download=(text,name,type='application/json')=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
