import {api} from './api.js';
import {getState,setState,setData,selectedWeek} from './state.js';
import {today,currentPeriod,esc,money,minutesLabel,statusLabel,priorityLabel,periodLabel,weeksOfMonth,monthDays,formatDate,shortDate,dayName,progressForSubtask,progressForKpi,percent,includesSearch,csv,download} from './utils.js';

const APP_VERSION='2026.09.17-rail';

const $=selector=>document.querySelector(selector);
const S=()=>getState();
const titles={dashboard:['Tổng quan','Bức tranh kế hoạch và thực thi trong tháng'],month:['Kế hoạch tháng','Phân bổ Sub-task vào từng tuần'],week:['Kế hoạch tuần','Phân bổ Task vào ngày và buổi'],kpi:['KPI công việc','Phân rã KPI thành Sub-task và Task'],calendar:['Lịch tháng & Note','Xem việc theo ngày, lịch cá nhân và ghi chú'],urgent:['Việc gấp','Các yêu cầu phát sinh ngoài kế hoạch'],salary:['Bảng lương','Tổng hợp thu nhập theo tháng'],reports:['Báo cáo','Tổng kết công việc theo tháng và năm']};
let modalSubmit=null,busy=0;

function toast(message,error=false){const n=document.createElement('div');n.className=`toast ${error?'error':'success'}`;n.textContent=message;$('#toast').append(n);setTimeout(()=>n.remove(),4200);}
function setBusy(on){busy+=on?1:-1;busy=Math.max(0,busy);document.body.classList.toggle('busy',!!busy);$('#syncButton').disabled=!!busy;}
async function run(work,success){setBusy(true);try{const result=await work();if(success)toast(success);return result;}catch(e){toast(e.message||String(e),true);throw e;}finally{setBusy(false);}}
async function refresh(silent=false){const data=await run(()=>api.load(S().period));setData(data);render();if(!silent)toast('Đã đồng bộ dữ liệu');}
function openModal(title,body,onSubmit,{wide=false}={}){
  modalSubmit=onSubmit;$('#overlay').hidden=false;$('#overlay').innerHTML=`<div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true"><div class="modal-head"><h2>${esc(title)}</h2><button type="button" data-close aria-label="Đóng">×</button></div><form id="modalForm"><div class="modal-body">${body}</div><div class="modal-actions"><button type="button" class="button subtle" data-close>Hủy</button><button class="button primary">Lưu</button></div></form></div>`;
  $('#modalForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,data=Object.fromEntries(new FormData(form));form.querySelectorAll('input[type=checkbox]').forEach(x=>data[x.name]=x.checked);const ok=await modalSubmit?.(data,form);if(ok!==false)closeModal();};
  $('#overlay').querySelector('input,textarea,select')?.focus();
}
function closeModal(){$('#overlay').hidden=true;$('#overlay').replaceChildren();modalSubmit=null;}
function closeMobileNav(){document.body.classList.remove('nav-open');}
function input(name,label,value='',type='text',extra=''){return `<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;}
function select(name,label,value,options){return `<label>${esc(label)}<select name="${name}">${options.map(([v,t])=>`<option value="${v}" ${v===value?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;}
function textarea(name,label,value=''){return `<label>${esc(label)}<textarea name="${name}">${esc(value)}</textarea></label>`;}
function progressHtml(p){const pc=percent(p);return `<div class="progress-row"><div class="progress"><i style="width:${pc}%"></i></div><small>${p.done}/${p.total} việc · ${pc}%</small></div>`;}
function badge(value,type='neutral'){return `<span class="badge ${type}">${esc(value)}</span>`;}
function empty(text,action=''){return `<div class="empty"><span>○</span><p>${esc(text)}</p>${action}</div>`;}
function context(){
  const d=S().data, subById=new Map(d.subtasks.map(x=>[x.id,x])), kpiById=new Map(d.kpis.map(x=>[x.id,x]));
  const taskContext=t=>{const sub=subById.get(t.subtaskId),kpi=sub&&kpiById.get(sub.kpiId);return {sub,kpi,breadcrumb:[kpi?.title,sub?.title].filter(Boolean).join(' › ')}};
  return {subById,kpiById,taskContext};
}
function render(){
  const s=S(),[title,sub]=titles[s.view];$('#viewTitle').textContent=title;$('#viewSubtitle').textContent=sub;$('#period').value=s.period;
  document.querySelectorAll('#mainNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===s.view));
  $('#mobileNav').innerHTML=['dashboard','month','week','kpi','calendar','urgent','salary','reports'].map(v=>`<button class="${v===s.view?'active':''}" data-nav="${v}"><img src="./assets/icons/${iconFor(v)}.svg" alt=""><span>${titles[v][0]}</span></button>`).join('');
  const renderers={dashboard:renderDashboard,month:renderMonth,week:renderWeek,kpi:renderKpi,calendar:renderCalendar,urgent:renderUrgent,salary:renderSalary,reports:renderReports};
  renderers[s.view]();
}
function iconFor(view){return ({dashboard:'dashboard',month:'month-planner',week:'week-planner',kpi:'kpi',calendar:'calendar',urgent:'urgent',salary:'salary',reports:'report'})[view]||'dashboard';}

function renderDashboard(){
  const {data,period}=S(),{taskContext}=context(),tasks=data.tasks,kpis=data.kpis,subs=data.subtasks;
  const done=tasks.filter(x=>x.status==='done').length,scheduledSubs=subs.filter(x=>x.plannedWeek).length,scheduledTasks=tasks.filter(x=>x.plannedDate).length;
  const todayTasks=tasks.filter(x=>x.plannedDate===today()),late=tasks.filter(x=>x.status!=='done'&&x.deadline&&x.deadline<today());
  const weeks=weeksOfMonth(period),capacity=data.profile.dailyCapacityMinutes||480;
  const weekLoad=weeks.map(w=>{const mins=tasks.filter(t=>t.plannedDate>=w.start&&t.plannedDate<=w.end).reduce((n,t)=>n+(Number(t.estimatedMinutes)||0),0);return {...w,mins,pct:Math.round(mins/(capacity*w.days.length)*100)};});
  $('#content').innerHTML=`<div class="metrics">
    <article><span>KPI tháng</span><b>${kpis.length}</b><small>${kpis.filter(k=>percent(progressForKpi(k,subs,tasks))===100).length} hoàn thành</small></article>
    <article><span>Lập kế hoạch tháng</span><b>${subs.length?Math.round(scheduledSubs/subs.length*100):0}%</b><small>${scheduledSubs}/${subs.length} Sub-task đã xếp</small></article>
    <article><span>Lập kế hoạch Task</span><b>${tasks.length?Math.round(scheduledTasks/tasks.length*100):0}%</b><small>${scheduledTasks}/${tasks.length} đã xếp ngày</small></article>
    <article><span>Thực thi</span><b>${tasks.length?Math.round(done/tasks.length*100):0}%</b><small>${done}/${tasks.length} Task hoàn thành</small></article>
  </div><div class="dashboard-grid">
    <section class="panel"><div class="section-head"><h2>Việc hôm nay</h2><button data-nav="calendar">Xem lịch</button></div>${todayTasks.length?todayTasks.map(t=>taskLine(t,taskContext(t))).join(''):empty('Hôm nay chưa có Task được xếp.')}</section>
    <section class="panel"><div class="section-head"><h2>Cần chú ý</h2></div>${late.length?late.map(t=>taskLine(t,taskContext(t),true)).join(''):empty('Không có Task quá hạn.')}</section>
    <section class="panel span-2"><div class="section-head"><h2>Workload theo tuần</h2><small>${minutesLabel(capacity)} / ngày</small></div><div class="workload">${weekLoad.map(w=>`<button data-week="${w.number}"><span>Tuần ${String(w.number).padStart(2,'0')}</span><div class="progress"><i class="${w.pct>100?'over':''}" style="width:${Math.min(w.pct,100)}%"></i></div><b>${w.pct}% ${w.pct>100?'⚠':''}</b><small>${minutesLabel(w.mins)}</small></button>`).join('')}</div></section>
    <section class="panel span-2"><div class="section-head"><h2>Tiến độ KPI</h2><button data-nav="kpi">Quản lý KPI</button></div>${kpis.length?kpis.map(k=>`<div class="kpi-progress"><div><b>${esc(k.title)}</b><small>${esc(k.category||'Chưa phân loại')} · hạn ${formatDate(k.deadline)}</small></div>${progressHtml(progressForKpi(k,subs,tasks))}</div>`).join(''):empty('Chưa có KPI trong tháng.')}</section>
  </div>`;
}
function taskLine(t,c,late=false){return `<div class="task-line"><button data-toggle-task="${t.id}" class="check ${t.status==='done'?'done':''}">${t.status==='done'?'✓':'○'}</button><div><b>${esc(t.title)}</b><small>${esc(c.breadcrumb)}${t.plannedPeriod?' · '+periodLabel(t.plannedPeriod):''}</small></div>${late?badge('Quá hạn','danger'):''}${t.estimatedMinutes?badge(minutesLabel(t.estimatedMinutes)):''}</div>`;}

function renderKpi(){
  const {data,filters}=S(),q=filters.query,subs=data.subtasks,tasks=data.tasks;
  const rows=data.kpis.filter(k=>includesSearch([k.title,k.category,k.description],q)||subs.some(s=>s.kpiId===k.id&&includesSearch([s.title],q)));
  $('#content').innerHTML=`<div class="toolbar"><div class="search"><span>⌕</span><input id="globalSearch" placeholder="Tìm KPI, Sub-task, Task..." value="${esc(q)}"></div><button class="button primary" data-add-kpi>+ KPI</button></div><div class="kpi-tree">${rows.length?rows.map(k=>{
    const children=subs.filter(s=>s.kpiId===k.id);return `<article class="kpi-block"><header><div><div class="eyebrow">${esc(k.category||'KPI')} ${badge(priorityLabel(k.priority),k.priority==='high'?'danger':'neutral')}</div><h2>${esc(k.title)}</h2><p>${esc(k.description||'')}</p>${progressHtml(progressForKpi(k,subs,tasks))}</div><div class="row-actions"><button data-add-sub="${k.id}">+ Sub-task</button><button data-edit-kpi="${k.id}">Sửa</button><button data-delete="kpis:${k.id}">Xóa</button></div></header><div class="sub-list">${children.length?children.map(s=>subtree(s,k,tasks)).join(''):empty('Chưa có Sub-task.',`<button data-add-sub="${k.id}" class="button subtle">+ Thêm Sub-task</button>`)}</div></article>`;
  }).join(''):empty('Chưa có KPI phù hợp.',`<button data-add-kpi class="button primary">+ Tạo KPI đầu tiên</button>`)}</div>`;
}
function subtree(s,k,tasks){const rows=tasks.filter(t=>t.subtaskId===s.id);return `<details class="subtree" open><summary><div><b>${esc(s.title)}</b><small>${s.plannedWeek?'Tuần '+String(s.plannedWeek).padStart(2,'0'):'Chưa xếp tuần'} · ${statusLabel(s.status)}</small>${progressHtml(progressForSubtask(s,tasks))}</div><div class="row-actions"><button data-add-task="${s.id}">+ Task</button><button data-edit-sub="${s.id}">Sửa</button><button data-delete="subtasks:${s.id}">Xóa</button></div></summary><div class="task-list">${rows.length?rows.map(t=>`<div class="task-row"><button data-toggle-task="${t.id}" class="check ${t.status==='done'?'done':''}">${t.status==='done'?'✓':'○'}</button><div><b>${esc(t.title)}</b><small>${t.plannedDate?formatDate(t.plannedDate)+' · '+periodLabel(t.plannedPeriod):'Chưa xếp ngày'}${t.estimatedMinutes?' · '+minutesLabel(t.estimatedMinutes):''}</small></div>${t.isHighlight?badge('Nổi bật','highlight'):''}<div class="row-actions"><button data-edit-task="${t.id}">Sửa</button><button data-delete="tasks:${t.id}">Xóa</button></div></div>`).join(''):empty('Chưa có Task.')}</div></details>`;}

function renderMonth(){
  const {data,period}=S(),weeks=weeksOfMonth(period),unscheduled=data.subtasks.filter(s=>!s.plannedWeek),{kpiById}=context();
  $('#content').innerHTML=`<div class="planning-summary"><div><b>${data.subtasks.filter(s=>s.plannedWeek).length}/${data.subtasks.length} Sub-task đã xếp tuần</b><span>${unscheduled.length?unscheduled.length+' chưa xếp':'✓ Kế hoạch tháng đã hoàn tất'}</span></div>${progressHtml({done:data.subtasks.length-unscheduled.length,total:data.subtasks.length||1})}<button class="button primary" data-month-palette="">+ /kpi</button></div><div class="month-board">${weeks.map(w=>{
    const items=data.subtasks.filter(s=>s.plannedWeek===w.number),mins=items.flatMap(s=>data.tasks.filter(t=>t.subtaskId===s.id)).reduce((n,t)=>n+(Number(t.estimatedMinutes)||0),0),cap=(data.profile.dailyCapacityMinutes||480)*w.days.length,pct=Math.round(mins/cap*100);
    return `<section class="week-column"><header><button data-week="${w.number}"><span>Tuần ${String(w.number).padStart(2,'0')}</span><small>${shortDate(w.start)} – ${shortDate(w.end)}</small></button><div>${badge(`${pct}%${pct>100?' ⚠':''}`,pct>100?'danger':'neutral')}<button data-month-palette="${w.number}">+ /kpi</button></div></header><div class="week-cards">${items.length?items.map(s=>monthCard(s,kpiById.get(s.kpiId),data.tasks)).join(''):empty(`Chưa có Sub-task trong Tuần ${String(w.number).padStart(2,'0')}.`)}</div></section>`;
  }).join('')}</div><aside class="unscheduled-bar"><b>Chưa xếp lịch <span>${unscheduled.length}</span></b><div>${unscheduled.slice(0,8).map(s=>`<button data-open-sub="${s.id}">${esc(s.title)}<small>${esc(kpiById.get(s.kpiId)?.title||'')}</small></button>`).join('')||'<small>Tất cả Sub-task đã được phân bổ.</small>'}</div></aside>`;
}
function monthCard(s,k,tasks){const rows=tasks.filter(t=>t.subtaskId===s.id),mins=rows.reduce((n,t)=>n+(Number(t.estimatedMinutes)||0),0);return `<article class="plan-card" data-open-sub="${s.id}"><div class="card-top">${badge(priorityLabel(s.priority),s.priority==='high'?'danger':'neutral')}<button data-move-sub="${s.id}">•••</button></div><b>${esc(s.title)}</b><small>${esc(k?.title||'')}</small>${progressHtml(progressForSubtask(s,tasks))}<small>◷ ${minutesLabel(mins)}</small></article>`;}

function renderWeek(){
  const {data}=S(),week=selectedWeek(),{taskContext}=context(),subIds=new Set(data.subtasks.filter(s=>s.plannedWeek===week.number).map(s=>s.id)),eligible=data.tasks.filter(t=>subIds.has(t.subtaskId)),unscheduled=eligible.filter(t=>!t.plannedDate),capacity=data.profile.dailyCapacityMinutes||480;
  $('#content').innerHTML=`<div class="week-head"><div><div class="week-switch">${weeksOfMonth(S().period).map(w=>`<button class="${w.number===week.number?'active':''}" data-week="${w.number}">Tuần ${w.number}</button>`).join('')}</div><b>${shortDate(week.start)} → ${shortDate(week.end)}</b></div><div><strong>${eligible.length-unscheduled.length}/${eligible.length} Task đã xếp ngày</strong><button class="button primary" data-week-palette="">+ /kpi</button></div></div><div class="weekly-layout"><aside class="week-inbox"><h3>Chưa xếp <span>${unscheduled.length}</span></h3>${unscheduled.length?unscheduled.map(t=>`<button data-edit-task="${t.id}"><b>${esc(t.title)}</b><small>${esc(taskContext(t).breadcrumb)}</small></button>`).join(''):empty('Tất cả Task đã được xếp ngày.')}</aside><div class="day-grid">${week.days.map(day=>{
    const rows=eligible.filter(t=>t.plannedDate===day),mins=rows.reduce((n,t)=>n+(Number(t.estimatedMinutes)||0),0),pct=Math.round(mins/capacity*100);
    return `<section class="day-column"><header><span>${dayName(day)}</span><b>${shortDate(day)}</b>${badge(`${pct}%${pct>100?' ⚠':''}`,pct>100?'danger':'neutral')}</header>${['morning','afternoon','anytime'].map(slot=>`<div class="day-slot"><div><small>${periodLabel(slot)}</small><button data-week-palette="${day}:${slot}">+</button></div>${rows.filter(t=>(t.plannedPeriod||'anytime')===slot).map(t=>weekTask(t,taskContext(t))).join('')}</div>`).join('')}</section>`;
  }).join('')}</div></div>`;
}
function weekTask(t,c){return `<article class="week-task ${t.status==='done'?'completed':''}"><button data-toggle-task="${t.id}" class="check ${t.status==='done'?'done':''}">${t.status==='done'?'✓':'○'}</button><div><b>${esc(t.title)}</b><small>${esc(c.breadcrumb)}</small><span>${minutesLabel(t.estimatedMinutes)}</span></div><button data-move-task="${t.id}">•••</button></article>`;}

function renderCalendar(){
  const {data,period}=S(),days=monthDays(period),firstDay=new Date(`${days[0]}T12:00:00`).getDay(),offset=firstDay===0?6:firstDay-1,{taskContext}=context();
  $('#content').innerHTML=`<div class="calendar-layout"><section class="calendar-panel"><div class="calendar-weekdays">${['T2','T3','T4','T5','T6','T7','CN'].map(x=>`<b>${x}</b>`).join('')}</div><div class="calendar-grid">${Array.from({length:offset},()=>'<div class="calendar-cell muted"></div>').join('')}${days.map(day=>{
    const tasks=data.tasks.filter(t=>t.plannedDate===day),urgent=data.urgent.filter(t=>t.dueDate===day),events=data.events.filter(e=>e.startDate<=day&&e.endDate>=day),note=data.notes.find(n=>n.noteDate===day);
    return `<button class="calendar-cell ${day===today()?'today':''}" data-day="${day}"><b>${Number(day.slice(-2))}</b>${tasks.slice(0,3).map(t=>`<span class="event task">${esc(t.title)}</span>`).join('')}${urgent.slice(0,1).map(t=>`<span class="event urgent">⚡ ${esc(t.title)}</span>`).join('')}${events.slice(0,1).map(e=>`<span class="event personal">${esc(e.title||eventType(e.eventType))}</span>`).join('')}${note?'<i title="Có ghi chú"></i>':''}</button>`;
  }).join('')}</div></section><aside class="calendar-side">${calendarDay(today(),taskContext)}</aside></div>`;
}
function eventType(type){return ({leave:'Nghỉ phép',trip:'Đi công tác',training:'Đào tạo',personal:'Việc cá nhân'})[type]||type;}
function calendarDay(day,taskContext){const d=S().data,tasks=d.tasks.filter(t=>t.plannedDate===day),urgent=d.urgent.filter(t=>t.dueDate===day),events=d.events.filter(e=>e.startDate<=day&&e.endDate>=day),note=d.notes.find(n=>n.noteDate===day);return `<div class="section-head"><div><small>${dayName(day)}</small><h2>${formatDate(day)}</h2></div><button data-add-event="${day}">+ Lịch</button></div><h3>Công việc</h3>${tasks.map(t=>taskLine(t,taskContext(t))).join('')||empty('Không có Task trong ngày.')}<h3>Việc gấp & lịch cá nhân</h3>${urgent.map(u=>`<div class="simple-line"><b>⚡ ${esc(u.title)}</b></div>`).join('')}${events.map(e=>`<div class="simple-line"><b>${esc(e.title||eventType(e.eventType))}</b><small>${eventType(e.eventType)}</small></div>`).join('')||empty('Không có lịch cá nhân.')}<label class="daily-note">Ghi chú ngày<textarea id="dailyNote">${esc(note?.content||'')}</textarea><button class="button primary" data-save-note="${day}">Lưu ghi chú</button></label>`;}

function renderUrgent(){const rows=S().data.urgent;$('#content').innerHTML=`<div class="toolbar"><p>Việc phát sinh không bắt buộc thuộc KPI nhưng vẫn xuất hiện trên Dashboard và lịch.</p><button class="button primary" data-add-urgent>+ Việc gấp</button></div><div class="urgent-grid">${rows.length?rows.map(u=>`<article class="urgent-card ${u.status==='done'?'completed':''}"><div>${badge(priorityLabel(u.priority),u.priority==='high'?'danger':'neutral')} ${u.dueDate?badge(formatDate(u.dueDate)):''}</div><h3>${esc(u.title)}</h3><p>${esc(u.note||'')}</p><footer><button data-complete-urgent="${u.id}">${u.status==='done'?'Mở lại':'Hoàn thành'}</button><button data-edit-urgent="${u.id}">Sửa</button><button data-delete="urgent:${u.id}">Xóa</button></footer></article>`).join(''):empty('Chưa có việc gấp.')}</div>`;}

function renderSalary(){
  const d=S().data,total=d.payrolls.reduce((sum,p)=>sum+d.payrollItems.filter(i=>i.payrollId===p.id).reduce((n,i)=>n+Number(i.amount||0),0),0);
  $('#content').innerHTML=`<div class="metrics salary-metrics"><article><span>Tổng lương tháng</span><b>${money(total)}</b><small>${d.payrolls.length} bảng lương</small></article><article><span>KPI hoàn thành</span><b>${d.kpis.filter(k=>percent(progressForKpi(k,d.subtasks,d.tasks))===100).length}</b><small>Có thể chọn vào bảng lương</small></article></div><div class="two-columns"><section class="panel"><div class="section-head"><h2>Bảng lương</h2><button class="button primary" data-add-payroll>+ Tạo bảng lương</button></div>${d.payrolls.length?d.payrolls.map(p=>{const items=d.payrollItems.filter(i=>i.payrollId===p.id),sum=items.reduce((n,i)=>n+Number(i.amount||0),0);return `<article class="payroll"><div><b>${esc(p.title)}</b><small>${esc(p.note||p.period)}</small></div><strong>${money(sum)}</strong><div class="pay-items">${items.map(i=>`<span>${esc(i.title)} <b>${money(i.amount)}</b></span>`).join('')}</div><footer><button data-edit-payroll="${p.id}">Chỉnh sửa</button><button data-export-payroll="${p.id}">Xuất CSV</button><button data-delete="payrolls:${p.id}">Xóa</button></footer></article>`;}).join(''):empty('Chưa tạo bảng lương tháng này.')}</section><section class="panel"><div class="section-head"><h2>Gợi ý lương</h2><button data-add-rule>+ Thêm</button></div>${d.salaryRules.map(r=>`<div class="rule-line"><div><b>${esc(r.title)}</b><small>${r.ruleType}${r.keyword?' · '+esc(r.keyword):''}</small></div><strong>${money(r.amount)}</strong><button data-edit-rule="${r.id}">Sửa</button></div>`).join('')||empty('Chưa có cấu hình lương.')}</section></div>`;
}

function renderReports(){
  const d=S().data,{taskContext}=context(),done=d.tasks.filter(t=>t.status==='done'),highlights=done.filter(t=>t.isHighlight),pending=d.tasks.filter(t=>t.status!=='done');
  $('#content').innerHTML=`<div class="report-actions"><button class="button primary" data-export-month>Xuất báo cáo tháng CSV</button><button class="button subtle" data-export-backup>Backup JSON</button><button class="button subtle" data-year-report>Xem tổng kết năm</button></div><div class="report-sheet"><header><span>BÁO CÁO THÁNG</span><h1>${S().period}</h1><p>${d.kpis.length} KPI · ${done.length}/${d.tasks.length} Task hoàn thành</p></header><section><h2>KPI và kết quả</h2>${d.kpis.map(k=>`<article><h3>${esc(k.title)}</h3>${progressHtml(progressForKpi(k,d.subtasks,d.tasks))}<p>${esc(k.resultSummary||k.description||'Chưa có tổng kết.')}</p></article>`).join('')||empty('Chưa có KPI.')}</section><section><h2>Hoạt động nổi bật</h2>${highlights.map(t=>`<div class="report-line"><b>${esc(t.title)}</b><span>${esc(taskContext(t).breadcrumb)}</span><p>${esc(t.result||'')}</p></div>`).join('')||empty('Chưa đánh dấu hoạt động nổi bật.')}</section><section><h2>Việc chưa hoàn thành</h2>${pending.map(t=>`<div class="report-line"><b>${esc(t.title)}</b><span>${esc(taskContext(t).breadcrumb)}</span></div>`).join('')||empty('Tất cả Task đã hoàn thành.')}</section></div>`;
}

function kpiForm(item={}){openModal(item.id?'Chỉnh sửa KPI':'Tạo KPI',`<div class="form-grid">${input('title','Tên KPI',item.title,'text','required')}${input('category','Nhóm',item.category)}${input('deadline','Deadline',item.deadline,'date')}${select('priority','Ưu tiên',item.priority||'medium',[['low','Thấp'],['medium','Vừa'],['high','Cao']])}${select('status','Trạng thái',item.status||'todo',[['todo','Chưa làm'],['in_progress','Đang làm'],['done','Hoàn thành']])}</div>${textarea('description','Mô tả',item.description)}${textarea('resultSummary','Tổng kết kết quả',item.resultSummary)}`,async v=>{await run(()=>api.save('kpis',{...item,...v,period:S().period}),'Đã lưu KPI');await refresh(true);return true;});}
function subForm(kpiId,item={}){openModal(item.id?'Chỉnh sửa Sub-task':'Thêm Sub-task',`${input('title','Tên Sub-task',item.title,'text','required')}<div class="form-grid">${input('deadline','Deadline (không bắt buộc)',item.deadline,'date')}${select('plannedWeek','Tuần dự kiến',String(item.plannedWeek||''),[['','Chưa xếp'],...weeksOfMonth(S().period).map(w=>[String(w.number),`Tuần ${w.number} · ${shortDate(w.start)}–${shortDate(w.end)}`])])}${select('priority','Ưu tiên',item.priority||'medium',[['low','Thấp'],['medium','Vừa'],['high','Cao']])}${select('status','Trạng thái',item.status||'todo',[['todo','Chưa làm'],['in_progress','Đang làm'],['done','Hoàn thành']])}</div>${textarea('description','Mô tả',item.description)}`,async v=>{v.plannedWeek=v.plannedWeek?Number(v.plannedWeek):null;await run(()=>api.save('subtasks',{...item,...v,kpiId}),'Đã lưu Sub-task');await refresh(true);return true;});}
function taskForm(subtaskId,item={}){openModal(item.id?'Chỉnh sửa Task':'Thêm Task',`${input('title','Tên Task',item.title,'text','required')}<div class="form-grid">${input('plannedDate','Ngày dự kiến',item.plannedDate,'date')}${select('plannedPeriod','Buổi',item.plannedPeriod||'', [['','Chưa xếp'],['morning','Sáng'],['afternoon','Chiều'],['anytime','Cả ngày']])}${input('deadline','Deadline',item.deadline,'date')}${input('estimatedMinutes','Thời lượng (phút)',item.estimatedMinutes,'number','min="0"')}${select('priority','Ưu tiên',item.priority||'medium',[['low','Thấp'],['medium','Vừa'],['high','Cao']])}${select('status','Trạng thái',item.status||'todo',[['todo','Chưa làm'],['in_progress','Đang làm'],['done','Hoàn thành']])}</div>${textarea('description','Mô tả',item.description)}${textarea('result','Kết quả đã đạt',item.result)}${input('evidenceUrl','Link minh chứng',item.evidenceUrl,'url')}<label class="checkbox"><input name="isHighlight" type="checkbox" ${item.isHighlight?'checked':''}> Đánh dấu nổi bật cho báo cáo</label>`,async v=>{v.estimatedMinutes=v.estimatedMinutes?Number(v.estimatedMinutes):null;v.plannedDate=v.plannedDate||null;v.plannedPeriod=v.plannedPeriod||null;if(v.status==='done'&&!item.completedAt)v.completedAt=new Date().toISOString();await run(()=>api.save('tasks',{...item,...v,subtaskId}),'Đã lưu Task');await refresh(true);return true;});}
function urgentForm(item={}){openModal(item.id?'Chỉnh sửa việc gấp':'Thêm việc gấp',`${input('title','Tên công việc',item.title,'text','required')}<div class="form-grid">${input('dueDate','Hạn',item.dueDate,'date')}${select('priority','Ưu tiên',item.priority||'high',[['low','Thấp'],['medium','Vừa'],['high','Cao']])}${select('status','Trạng thái',item.status||'todo',[['todo','Chưa làm'],['in_progress','Đang làm'],['done','Hoàn thành']])}</div>${textarea('note','Ghi chú',item.note)}${input('evidenceUrl','Link tài liệu',item.evidenceUrl,'url')}`,async v=>{await run(()=>api.save('urgent',{...item,...v}),'Đã lưu việc gấp');await refresh(true);return true;});}
function eventForm(day,item={}){openModal('Thêm lịch cá nhân',`${input('title','Tên lịch',item.title)}<div class="form-grid">${select('eventType','Loại',item.eventType||'personal',[['leave','Nghỉ phép'],['trip','Đi công tác'],['training','Đào tạo'],['personal','Việc cá nhân']])}${input('startDate','Từ ngày',item.startDate||day,'date','required')}${input('endDate','Đến ngày',item.endDate||day,'date','required')}${input('startTime','Từ giờ',item.startTime,'time')}${input('endTime','Đến giờ',item.endTime,'time')}</div>${textarea('note','Ghi chú',item.note)}`,async v=>{if(v.endDate<v.startDate){toast('Ngày kết thúc phải sau ngày bắt đầu.',true);return false;}await run(()=>api.save('events',{...item,...v}),'Đã lưu lịch');await refresh(true);return true;});}
function ruleForm(item={}){openModal(item.id?'Sửa gợi ý lương':'Thêm gợi ý lương',`${input('title','Tên dòng lương',item.title,'text','required')}<div class="form-grid">${select('ruleType','Loại',item.ruleType||'keyword',[['base','Lương cơ bản'],['keyword','Theo từ khóa'],['tax','Khấu trừ']])}${input('keyword','Từ khóa',item.keyword)}${input('amount','Số tiền',item.amount||0,'number')}</div>`,async v=>{v.amount=Number(v.amount)||0;v.active=true;await run(()=>api.save('salaryRules',{...item,...v}),'Đã lưu gợi ý lương');await refresh(true);return true;});}

function monthPalette(weekNumber){
  const d=S().data,{kpiById}=context(),rows=d.subtasks.filter(s=>!s.plannedWeek||s.plannedWeek===Number(weekNumber));
  openModal(`Thêm Sub-task vào Tuần ${weekNumber||'…'}`,`<div class="palette"><input id="paletteSearch" placeholder="Tìm KPI / Sub-task..."><div class="palette-tabs"><button type="button" class="active">Chưa xếp</button></div><div class="palette-list">${rows.map(s=>`<label data-search="${esc(`${s.title} ${kpiById.get(s.kpiId)?.title||''}`)}"><input type="checkbox" name="pick-${s.id}"><span><b>${esc(s.title)}</b><small>${esc(kpiById.get(s.kpiId)?.title||'')}</small></span></label>`).join('')||empty('Không còn Sub-task chưa xếp.')}</div></div>`,async(_v,form)=>{const chosen=rows.filter(s=>form.elements.namedItem(`pick-${s.id}`)?.checked);if(!chosen.length){toast('Chọn ít nhất một Sub-task.',true);return false;}const target=Number(weekNumber)||1;for(const s of chosen)await api.save('subtasks',{...s,plannedWeek:target});toast(`Đã thêm ${chosen.length} Sub-task vào Tuần ${target}`);await refresh(true);return true;},{wide:true});
  setTimeout(()=>{$('#paletteSearch')?.addEventListener('input',e=>document.querySelectorAll('.palette-list label').forEach(x=>x.hidden=!includesSearch([x.dataset.search],e.target.value)));},0);
}
function weekPalette(target){
  const [date,slot]=String(target||'').split(':'),week=selectedWeek(),d=S().data,{taskContext}=context(),subIds=new Set(d.subtasks.filter(s=>s.plannedWeek===week.number).map(s=>s.id)),rows=d.tasks.filter(t=>subIds.has(t.subtaskId)&&!t.plannedDate);
  openModal('Xếp Task vào ngày / buổi',`<div class="form-grid">${select('date','Ngày',date||week.start,week.days.map(x=>[x,`${dayName(x)} · ${formatDate(x)}`]))}${select('slot','Buổi',slot||'morning',[['morning','Sáng'],['afternoon','Chiều'],['anytime','Cả ngày']])}</div><div class="palette"><input id="paletteSearch" placeholder="Tìm Task..."><div class="palette-list">${rows.map(t=>`<label data-search="${esc(`${t.title} ${taskContext(t).breadcrumb}`)}"><input type="checkbox" name="pick-${t.id}"><span><b>${esc(t.title)}</b><small>${esc(taskContext(t).breadcrumb)}</small></span></label>`).join('')||empty('Không còn Task chưa xếp trong tuần.')}</div></div>`,async(v,form)=>{const chosen=rows.filter(t=>form.elements.namedItem(`pick-${t.id}`)?.checked);if(!chosen.length){toast('Chọn ít nhất một Task.',true);return false;}for(const t of chosen)await api.save('tasks',{...t,plannedDate:v.date,plannedPeriod:v.slot});toast(`Đã xếp ${chosen.length} Task`);await refresh(true);return true;},{wide:true});
}

function moveSub(item){const taskCount=S().data.tasks.filter(t=>t.subtaskId===item.id&&t.plannedDate).length;openModal('Chuyển tuần',`${taskCount?`<div class="warning">Sub-task này có ${taskCount} Task đã được xếp ngày. Chuyển tuần không tự đổi ngày của các Task.</div>`:''}${select('plannedWeek','Tuần mới',String(item.plannedWeek||''),[['','Bỏ lịch'],...weeksOfMonth(S().period).map(w=>[String(w.number),`Tuần ${w.number}`])])}`,async v=>{await run(()=>api.save('subtasks',{...item,plannedWeek:v.plannedWeek?Number(v.plannedWeek):null}),'Đã chuyển tuần');await refresh(true);return true;});}
function moveTask(item){const week=selectedWeek();openModal('Chuyển lịch Task',`<div class="form-grid">${select('plannedDate','Ngày',item.plannedDate||'', [['','Bỏ lịch'],...week.days.map(x=>[x,`${dayName(x)} · ${formatDate(x)}`])])}${select('plannedPeriod','Buổi',item.plannedPeriod||'morning',[['morning','Sáng'],['afternoon','Chiều'],['anytime','Cả ngày']])}</div>`,async v=>{await run(()=>api.save('tasks',{...item,plannedDate:v.plannedDate||null,plannedPeriod:v.plannedDate?v.plannedPeriod:null}),'Đã chuyển lịch');await refresh(true);return true;});}
function payrollForm(payroll={}){
  const d=S().data,existing=d.payrollItems.filter(i=>i.payrollId===payroll.id),base=d.salaryRules.find(r=>r.ruleType==='base')||{title:'Lương cơ bản',amount:0};
  const {kpiById}=context();
  const completedSubs=d.subtasks.filter(s=>s.status==='done'||percent(progressForSubtask(s,d.tasks))===100);
  const completedUrgent=d.urgent.filter(u=>u.status==='done');
  const initial=existing.length?existing:[{sourceType:'base',sourceId:null,title:base.title||'Lương cơ bản',amount:Number(base.amount)||0}];
  const entry=item=>`<div class="payroll-entry"><input type="hidden" name="sourceType" value="${esc(item.sourceType||'manual')}"><input type="hidden" name="sourceId" value="${esc(item.sourceId||'')}"><label><span>Tên khoản</span><input class="pay-title" name="lineTitle" value="${esc(item.title||'')}" placeholder="Ví dụ: KPI đào tạo"></label><label><span>Số tiền</span><input class="pay-amount" name="lineAmount" type="number" value="${Number(item.amount)||0}" step="1000" min="0"></label><button type="button" data-remove-pay aria-label="Xóa dòng">×</button></div>`;
  const references=`<div class="reference-group"><h4>Sub-task hoàn thành <span>${completedSubs.length}</span></h4>${completedSubs.length?completedSubs.map(s=>`<div class="reference-item"><i>✓</i><div><b>${esc(s.title)}</b><small>${esc(kpiById.get(s.kpiId)?.title||'')}</small></div></div>`).join(''):empty('Chưa có Sub-task hoàn thành.')}</div><div class="reference-group"><h4>Việc gấp hoàn thành <span>${completedUrgent.length}</span></h4>${completedUrgent.length?completedUrgent.map(u=>`<div class="reference-item"><i>✓</i><div><b>${esc(u.title)}</b><small>${u.dueDate?formatDate(u.dueDate):'Không có hạn'}</small></div></div>`).join(''):empty('Chưa có việc gấp hoàn thành.')}</div>`;
  openModal(payroll.id?'Chỉnh sửa bảng lương':'Tạo bảng lương',`<div class="payroll-info">${input('title','Tên bảng lương',payroll.title||`Bảng lương ${S().period}`,'text','required')}${textarea('note','Ghi chú',payroll.note)}</div><div class="payroll-builder"><section class="salary-compose"><div class="payroll-pane-head"><div><h3>Thêm các khoản lương</h3><p>Tự nhập tên khoản và số tiền cần cộng.</p></div></div><div id="selectedPayLines">${initial.map(entry).join('')}</div><button type="button" class="add-pay-line" id="addManualPay"><span>＋</span><div><b>Thêm khoản KPI/lương</b><small>Thêm một dòng tên khoản và số tiền mới</small></div></button><div class="payroll-total"><span>Tổng dự kiến</span><b id="payrollDraftTotal">${money(initial.reduce((n,i)=>n+Number(i.amount||0),0))}</b></div></section><aside class="salary-reference"><div class="payroll-pane-head"><div><h3>Tham chiếu việc đã hoàn thành</h3><p>Dùng danh sách này để đối chiếu khi nhập khoản KPI.</p></div></div><div class="payroll-reference-list">${references}</div></aside></div>`,async(_v,form)=>{
    const items=[...form.querySelectorAll('.payroll-entry')].map(row=>({sourceType:row.querySelector('[name=sourceType]').value,sourceId:row.querySelector('[name=sourceId]').value||null,title:row.querySelector('[name=lineTitle]').value.trim(),amount:Number(row.querySelector('[name=lineAmount]').value)||0})).filter(x=>x.title);
    if(!items.length){toast('Thêm ít nhất một dòng lương.',true);return false;}
    await run(()=>api.replacePayroll({...payroll,title:form.elements.title.value,note:form.elements.note.value,period:S().period},items),'Đã lưu bảng lương');await refresh(true);return true;
  },{wide:true});
  const list=$('#selectedPayLines'),total=()=>{$('#payrollDraftTotal').textContent=money([...list.querySelectorAll('.pay-amount')].reduce((n,x)=>n+Number(x.value||0),0));};
  const append=item=>{const box=document.createElement('div');box.innerHTML=entry(item,list.children.length);list.append(box.firstElementChild);total();};
  $('#addManualPay').onclick=()=>{append({sourceType:'manual',sourceId:null,title:'',amount:0});list.lastElementChild.querySelector('.pay-title').focus();};
  list.addEventListener('click',e=>{if(e.target.closest('[data-remove-pay]')){e.target.closest('.payroll-entry').remove();total();}});
  list.addEventListener('input',total);
}
async function confirmDelete(table,id){const labels={kpis:'KPI và toàn bộ Sub-task/Task',subtasks:'Sub-task và toàn bộ Task',tasks:'Task',urgent:'việc gấp',payrolls:'bảng lương'};openModal('Xác nhận xóa',`<div class="danger-box">Bạn sắp xóa ${labels[table]||'mục này'}. Thao tác này không thể hoàn tác.</div>`,async()=>{await run(()=>api.remove(table,id),'Đã xóa');await refresh(true);return true;});}

document.addEventListener('click',async e=>{
  const b=e.target.closest('button,[data-open-sub]');if(!b)return;
  if(b.dataset.close!=null)return closeModal();
  if(b.dataset.nav){setState({view:b.dataset.nav});closeMobileNav();return render();}
  if(b.dataset.view){setState({view:b.dataset.view});closeMobileNav();return render();}
  if(b.dataset.week){setState({week:Number(b.dataset.week),view:'week'});return render();}
  const d=S().data;
  if(b.dataset.addKpi!=null)return kpiForm();
  if(b.dataset.editKpi)return kpiForm(d.kpis.find(x=>x.id===b.dataset.editKpi));
  if(b.dataset.addSub)return subForm(b.dataset.addSub);
  if(b.dataset.editSub){const x=d.subtasks.find(x=>x.id===b.dataset.editSub);return subForm(x.kpiId,x);}
  if(b.dataset.addTask)return taskForm(b.dataset.addTask);
  if(b.dataset.editTask){const x=d.tasks.find(x=>x.id===b.dataset.editTask);return taskForm(x.subtaskId,x);}
  if(b.dataset.toggleTask){const x=d.tasks.find(x=>x.id===b.dataset.toggleTask);await run(()=>api.save('tasks',{...x,status:x.status==='done'?'todo':'done',completedAt:x.status==='done'?null:new Date().toISOString()}));return refresh(true);}
  if(b.dataset.monthPalette!=null)return monthPalette(b.dataset.monthPalette||1);
  if(b.dataset.weekPalette!=null)return weekPalette(b.dataset.weekPalette);
  if(b.dataset.moveSub)return moveSub(d.subtasks.find(x=>x.id===b.dataset.moveSub));
  if(b.dataset.moveTask)return moveTask(d.tasks.find(x=>x.id===b.dataset.moveTask));
  if(b.dataset.openSub){const x=d.subtasks.find(x=>x.id===b.dataset.openSub);return subForm(x.kpiId,x);}
  if(b.dataset.day){const {taskContext}=context();const side=$('.calendar-side');if(side)side.innerHTML=calendarDay(b.dataset.day,taskContext);return;}
  if(b.dataset.addEvent)return eventForm(b.dataset.addEvent);
  if(b.dataset.saveNote){await run(()=>api.saveNote(b.dataset.saveNote,$('#dailyNote').value),'Đã lưu ghi chú');return refresh(true);}
  if(b.dataset.addUrgent!=null)return urgentForm();
  if(b.dataset.editUrgent)return urgentForm(d.urgent.find(x=>x.id===b.dataset.editUrgent));
  if(b.dataset.completeUrgent){const x=d.urgent.find(x=>x.id===b.dataset.completeUrgent);await run(()=>api.save('urgent',{...x,status:x.status==='done'?'todo':'done'}));return refresh(true);}
  if(b.dataset.addRule!=null)return ruleForm();
  if(b.dataset.editRule)return ruleForm(d.salaryRules.find(x=>x.id===b.dataset.editRule));
  if(b.dataset.addPayroll!=null)return payrollForm();
  if(b.dataset.editPayroll)return payrollForm(d.payrolls.find(x=>x.id===b.dataset.editPayroll));
  if(b.dataset.exportPayroll){const p=d.payrolls.find(x=>x.id===b.dataset.exportPayroll),items=d.payrollItems.filter(i=>i.payrollId===p.id);return download(csv([['Bảng lương',p.title],['Tháng',p.period],[],['Khoản','Số tiền'],...items.map(i=>[i.title,i.amount]),['Tổng',items.reduce((n,i)=>n+Number(i.amount),0)]]),`Bang-luong-${p.period}.csv`,'text/csv;charset=utf-8');}
  if(b.dataset.delete){const [table,id]=b.dataset.delete.split(':');return confirmDelete(table,id);}
  if(b.dataset.exportMonth!=null){const {taskContext}=context();return download(csv([['KPI','Sub-task','Task','Trạng thái','Ngày','Kết quả'],...d.tasks.map(t=>{const c=taskContext(t);return[c.kpi?.title,c.sub?.title,t.title,statusLabel(t.status),t.plannedDate||'',t.result||''];})]),`Bao-cao-${S().period}.csv`,'text/csv;charset=utf-8');}
  if(b.dataset.exportBackup!=null)return download(JSON.stringify(d,null,2),`Flow-KPI-V2-${S().period}.json`,'application/json');
  if(b.dataset.yearReport!=null){const year=S().period.slice(0,4),all=await run(()=>api.allForYear(year));const completed=all.tasks?.filter(t=>t.status==='done').length||0;return openModal(`Tổng kết năm ${year}`,`<div class="year-summary"><b>${all.kpis.length}</b><span>KPI</span><b>${completed}</b><span>Task hoàn thành</span><b>${all.payrolls.length}</b><span>Bảng lương</span></div>`,()=>true);}
});
document.addEventListener('input',e=>{if(e.target.id==='globalSearch'){S().filters.query=e.target.value;renderKpi();}});

$('#overlay').addEventListener('click',e=>{if(e.target===$('#overlay'))closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#overlay').hidden)closeModal();});
$('#period').addEventListener('change',async e=>{if(!/^\d{4}-\d{2}$/.test(e.target.value))return;setState({period:e.target.value,week:1});await refresh(true);});
function shiftMonth(n){const [y,m]=S().period.split('-').map(Number),d=new Date(y,m-1+n,1);setState({period:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,week:1});refresh(true);}
$('#prevMonth').onclick=()=>shiftMonth(-1);$('#nextMonth').onclick=()=>shiftMonth(1);$('#syncButton').onclick=()=>refresh();
$('#quickAdd').onclick=()=>{const v=S().view;if(v==='urgent')return urgentForm();if(v==='salary')return payrollForm();if(v==='calendar')return eventForm(today());return kpiForm();};
$('#quickUrgent').onclick=()=>urgentForm();
$('#mobileMenuButton').onclick=()=>document.body.classList.toggle('nav-open');
document.addEventListener('click',e=>{if(!document.body.classList.contains('nav-open'))return;if(e.target.closest('.sidebar,#mobileMenuButton'))return;closeMobileNav();});
$('#logoutButton').onclick=async()=>{await api.signOut();$('#app').hidden=true;$('#auth').hidden=false;};
$('#loginForm').onsubmit=async e=>{e.preventDefault();$('#authMessage').textContent='';try{const user=await run(()=>api.signIn($('#email').value,$('#password').value));await enter(user);}catch(err){$('#authMessage').textContent=err.message;}};
$('#demoLogin').onclick=async()=>enter(await api.demoSignIn());
async function enter(user){setState({user,demo:api.isDemo(),period:currentPeriod()});$('#auth').hidden=true;$('#app').hidden=false;await refresh(true);}

api.init(user=>{if(user)enter(user);}).catch(e=>{$('#authMessage').textContent=e.message;});
