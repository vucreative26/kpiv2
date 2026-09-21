import {config} from '../config.js?v=20260921-clock10';
import {currentMonth,today,uid} from './utils.js?v=20260921-clock10';

const tableNames={months:'flow_v3_months',kpis:'flow_v3_kpis',subtasks:'flow_v3_subtasks',tasks:'flow_v3_tasks',urgentTasks:'flow_v3_urgent_tasks',notes:'flow_v3_notes',timeEntries:'flow_v3_time_entries',payrolls:'flow_v3_payrolls',attendanceEvents:'flow_v3_attendance_events'};
const camel=s=>s.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());
const snake=s=>s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
const fromRow=r=>Object.fromEntries(Object.entries(r||{}).map(([k,v])=>[camel(k),v]));
const toRow=r=>Object.fromEntries(Object.entries(r||{}).map(([k,v])=>[snake(k),v]));
let client,user,demo=false;

function seed(){
  const p=currentMonth(),[year,month]=p.split('-').map(Number),mid='m-demo',d=today();
  return {months:[{id:mid,year,month}],kpis:[
    {id:'k-training',monthId:mid,name:'Đào tạo lớp A',note:'Hoàn thiện nội dung và tổ chức lớp',sortOrder:1},
    {id:'k-web',monthId:mid,name:'Website sản phẩm',note:'Ra mắt landing page phiên bản mới',sortOrder:2}
  ],subtasks:[
    {id:'s-docs',kpiId:'k-training',name:'Chuẩn bị tài liệu',weekNumber:1,startDate:`${p}-01`,endDate:`${p}-06`,note:'',completed:false,sortOrder:1},
    {id:'s-class',kpiId:'k-training',name:'Chuẩn bị lớp học',weekNumber:2,startDate:null,endDate:null,note:'',completed:false,sortOrder:2},
    {id:'s-landing',kpiId:'k-web',name:'Thiết kế Landing Page',weekNumber:2,startDate:null,endDate:null,note:'',completed:false,sortOrder:1}
  ],tasks:[
    {id:'t-outline',subtaskId:'s-docs',name:'Soạn outline',date:d,startTime:null,endTime:null,note:'',completed:false,sortOrder:1},
    {id:'t-slide',subtaskId:'s-docs',name:'Chuẩn bị slide',date:d,startTime:'09:00',endTime:'11:00',note:'',completed:true,sortOrder:2},
    {id:'t-review',subtaskId:'s-docs',name:'Review tài liệu',date:null,startTime:null,endTime:null,note:'',completed:false,sortOrder:3},
    {id:'t-room',subtaskId:'s-class',name:'Kiểm tra phòng học',date:null,startTime:null,endTime:null,note:'',completed:false,sortOrder:1},
    {id:'t-wireframe',subtaskId:'s-landing',name:'Chốt wireframe',date:`${p}-22`,startTime:'14:00',endTime:'15:30',note:'',completed:false,sortOrder:1}
  ],urgentTasks:[{id:'u-demo',monthId:mid,name:'Sửa gấp tài liệu Workshop',date:d,startTime:'14:00',endTime:'15:00',relatedKpiId:null,relatedSubtaskId:null,category:'Khác',note:'',completed:false}],notes:[{id:'n-demo',monthId:mid,title:'Ý tưởng cho tháng này',body:'Tổng hợp lại các đầu việc quan trọng trước khi đưa vào KPI.',color:'blue',pinned:true,createdAt:new Date().toISOString()}],timeEntries:[],payrolls:[],attendanceEvents:[],settings:{displayName:'Demo'}};
}
const key='flow-kpi-v3-demo';
const loadDemo=()=>{try{const stored=JSON.parse(localStorage.getItem(key));return stored?{...seed(),...stored,notes:stored.notes||[],timeEntries:stored.timeEntries||[]}:seed()}catch{return seed()}};
const saveDemo=d=>localStorage.setItem(key,JSON.stringify(d));
const scoped=(all,period)=>{const [year,month]=period.split('-').map(Number),months=all.months.filter(m=>m.year===year&&m.month===month),mids=new Set(months.map(m=>m.id)),kpis=all.kpis.filter(k=>mids.has(k.monthId)),kids=new Set(kpis.map(k=>k.id)),subtasks=all.subtasks.filter(s=>kids.has(s.kpiId)),sids=new Set(subtasks.map(s=>s.id));return {...all,months,kpis,subtasks,tasks:all.tasks.filter(t=>sids.has(t.subtaskId)),urgentTasks:all.urgentTasks.filter(x=>mids.has(x.monthId)),notes:(all.notes||[]).filter(x=>mids.has(x.monthId)),timeEntries:(all.timeEntries||[]).filter(x=>mids.has(x.monthId)),payrolls:all.payrolls.filter(x=>mids.has(x.monthId)),attendanceEvents:all.attendanceEvents.filter(x=>mids.has(x.monthId))}};
async function ensureClient(){if(client)return;const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');client=mod.createClient(config.supabaseUrl,config.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}})}
async function getRows(name){const {data,error}=await client.from(tableNames[name]).select('*');if(error)throw Error(error.message);return data.map(fromRow)}
async function ensureMonth(period){const [year,month]=period.split('-').map(Number);if(demo){const d=loadDemo();let row=d.months.find(x=>x.year===year&&x.month===month);if(!row){row={id:uid('month'),year,month};d.months.push(row);saveDemo(d)}return row}const {data,error}=await client.from(tableNames.months).upsert({user_id:user.id,year,month},{onConflict:'user_id,year,month'}).select().single();if(error)throw Error(error.message);return fromRow(data)}

export const api={
  async init(cb){await ensureClient();const {data}=await client.auth.getSession();user=data.session?.user||null;client.auth.onAuthStateChange((_e,s)=>{user=s?.user||null;cb(user)});cb(user)},
  async signIn(email,password){await ensureClient();const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw Error(error.message);user=data.user;demo=false;return user},
  async demoSignIn(){demo=true;user={id:'demo'};return user},
  async signOut(){if(!demo&&client)await client.auth.signOut();demo=false;user=null},
  isDemo:()=>demo,
  async load(period){if(demo)return scoped(loadDemo(),period);if(!user)throw Error('Vui lòng đăng nhập');await ensureMonth(period);const [months,kpis,subtasks,tasks,urgentTasks,notes,timeEntries,payrolls,attendanceEvents,settings]=await Promise.all([getRows('months'),getRows('kpis'),getRows('subtasks'),getRows('tasks'),getRows('urgentTasks'),getRows('notes'),getRows('timeEntries'),getRows('payrolls'),getRows('attendanceEvents'),client.from('flow_v3_settings').select('*').maybeSingle()]);return scoped({months,kpis,subtasks,tasks,urgentTasks,notes,timeEntries,payrolls,attendanceEvents,settings:fromRow(settings.data)||{}},period)},
  async month(period){return ensureMonth(period)},
  async save(name,row){if(demo){const d=loadDemo(),record={...row,id:row.id||uid(name)};const i=d[name].findIndex(x=>x.id===record.id);if(i<0)d[name].push(record);else d[name][i]={...d[name][i],...record};saveDemo(d);return record}const payload=toRow({...row,userId:user.id});if(!row.id)delete payload.id;const {data,error}=await client.from(tableNames[name]).upsert(payload).select().single();if(error)throw Error(error.message);return fromRow(data)},
  async remove(name,id){if(demo){const d=loadDemo();if(name==='kpis'){const subs=d.subtasks.filter(s=>s.kpiId===id),ids=new Set(subs.map(s=>s.id));d.subtasks=d.subtasks.filter(s=>s.kpiId!==id);d.tasks=d.tasks.filter(t=>!ids.has(t.subtaskId));d.urgentTasks.forEach(u=>{if(u.relatedKpiId===id)u.relatedKpiId=null;if(ids.has(u.relatedSubtaskId))u.relatedSubtaskId=null})}if(name==='subtasks'){d.tasks=d.tasks.filter(t=>t.subtaskId!==id);d.urgentTasks.forEach(u=>{if(u.relatedSubtaskId===id)u.relatedSubtaskId=null})}d[name]=d[name].filter(x=>x.id!==id);saveDemo(d);return}const {error}=await client.from(tableNames[name]).delete().eq('id',id);if(error)throw Error(error.message)},
  async completeSubtask(sub,complete){const all=(demo?loadDemo().tasks:(await getRows('tasks'))).filter(t=>t.subtaskId===sub.id);for(const t of all)await this.save('tasks',{...t,completed:complete,completedAt:complete?new Date().toISOString():null});return this.save('subtasks',{...sub,completed:complete,completedAt:complete?new Date().toISOString():null})},
  async clock(action,period,date){const month=await ensureMonth(period);if(demo){const d=loadDemo(),now=new Date().toISOString();let row=d.timeEntries.find(x=>x.date===date);if(action==='checkin'){if(row?.checkInAt)throw Error('Hôm nay đã Check-in');row=row||{id:uid('clock'),monthId:month.id,date,reason:'',note:''};row.checkInAt=now;if(!d.timeEntries.some(x=>x.id===row.id))d.timeEntries.push(row)}else{if(!row?.checkInAt)throw Error('Bạn cần Check-in trước');if(row.checkOutAt)throw Error('Hôm nay đã Check-out');row.checkOutAt=now}saveDemo(d);return row}const {data,error}=await client.rpc('flow_v3_clock',{clock_action:action,work_date:date,work_month_id:month.id});if(error)throw Error(error.message);return fromRow(data)},
  async exportAll(){if(demo)return loadDemo();const data={};for(const n of Object.keys(tableNames))data[n]=await getRows(n);const {data:s}=await client.from('flow_v3_settings').select('*').maybeSingle();data.settings=fromRow(s)||{};return data},
  async restore(payload){if(demo){saveDemo(payload.data);return}const data={};for(const n of Object.keys(tableNames))data[snake(n)]=(payload.data[n]||[]).map(toRow);data.settings=toRow(payload.data.settings||{});const normalized={...payload,data};const {error}=await client.rpc('flow_v3_restore_backup',{payload:normalized});if(error)throw Error(error.message)}
};
