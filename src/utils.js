export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
export const currentPeriod = () => today().slice(0,7);
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money = value => `${(Number(value)||0).toLocaleString('vi-VN')} đ`;
export const minutesLabel = value => {
  const n=Number(value)||0;
  if(!n)return 'Chưa ước tính';
  const h=Math.floor(n/60),m=n%60;
  return `${h?h+'h ':''}${m?m+'p':''}`.trim();
};
export const statusLabel = status => ({todo:'Chưa làm',in_progress:'Đang làm',done:'Hoàn thành'})[status]||status;
export const priorityLabel = value => ({low:'Thấp',medium:'Vừa',high:'Cao'})[value]||value;
export const periodLabel = value => ({morning:'Sáng',afternoon:'Chiều',anytime:'Cả ngày'})[value]||'';
export const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
export const clone = value => JSON.parse(JSON.stringify(value));
export const normalizeSearch = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d');
export const includesSearch = (values,query) => !query || normalizeSearch(values.join(' ')).includes(normalizeSearch(query));
export function monthDays(period){
  const [y,m]=period.split('-').map(Number), count=new Date(y,m,0).getDate();
  return Array.from({length:count},(_,i)=>`${period}-${String(i+1).padStart(2,'0')}`);
}
export function weeksOfMonth(period){
  const days=monthDays(period), weeks=[], day0=new Date(`${days[0]}T12:00:00`).getDay();
  let size=day0===0?1:8-day0, cursor=0, number=1;
  while(cursor<days.length){
    const slice=days.slice(cursor,cursor+size);
    weeks.push({number,start:slice[0],end:slice.at(-1),days:slice});
    cursor+=size; size=7; number++;
  }
  return weeks;
}
export function weekForDate(period,date){
  const week=weeksOfMonth(period).find(w=>date>=w.start&&date<=w.end);
  return week?.number||null;
}
export const formatDate = value => value ? new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(`${value}T12:00:00`)) : 'Chưa đặt';
export const shortDate = value => value ? new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit'}).format(new Date(`${value}T12:00:00`)) : '';
export const dayName = value => new Intl.DateTimeFormat('vi-VN',{weekday:'short'}).format(new Date(`${value}T12:00:00`));
export function progressForSubtask(subtask,tasks){
  const rows=tasks.filter(t=>t.subtaskId===subtask.id);
  return rows.length ? {done:rows.filter(t=>t.status==='done').length,total:rows.length} : {done:subtask.status==='done'?1:0,total:1};
}
export function progressForKpi(kpi,subtasks,tasks){
  const subs=subtasks.filter(s=>s.kpiId===kpi.id), ids=new Set(subs.map(s=>s.id)), rows=tasks.filter(t=>ids.has(t.subtaskId));
  if(rows.length)return {done:rows.filter(t=>t.status==='done').length,total:rows.length};
  return {done:subs.filter(s=>s.status==='done').length,total:subs.length||1};
}
export const percent = p => Math.round((p.done/(p.total||1))*100);
export function csv(rows){
  return '\ufeff'+rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
}
export function download(text,name,type='text/plain;charset=utf-8'){
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
