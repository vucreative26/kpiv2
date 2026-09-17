import {config} from '../config.js';
import {clone,currentPeriod,today,uid,weekForDate} from './utils.js';

const tables={kpis:'flow_v2_kpis',subtasks:'flow_v2_subtasks',tasks:'flow_v2_tasks',links:'flow_v2_resource_links',notes:'flow_v2_daily_notes',events:'flow_v2_events',urgent:'flow_v2_urgent_tasks',salaryRules:'flow_v2_salary_rules',payrolls:'flow_v2_payrolls',payrollItems:'flow_v2_payroll_items'};
const camel=s=>s.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());
const snake=s=>s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
const fromRow=row=>Object.fromEntries(Object.entries(row||{}).map(([k,v])=>[camel(k),v]));
const toRow=row=>Object.fromEntries(Object.entries(row||{}).map(([k,v])=>[snake(k),v]));
let supabase=null,user=null,demo=false;

function demoSeed(){
  const p=currentPeriod(), d=today();
  const k1={id:'k1',period:p,title:'Đào tạo đại lý',description:'Hoàn thiện chương trình đào tạo trong tháng',category:'Đào tạo',deadline:`${p}-28`,priority:'high',status:'in_progress',resultSummary:''};
  const k2={id:'k2',period:p,title:'Nghiên cứu sản phẩm mới',description:'Chuẩn hóa kiến thức và tài liệu',category:'R&D',deadline:`${p}-30`,priority:'medium',status:'todo',resultSummary:''};
  return {profile:{displayName:'Demo',dailyCapacityMinutes:480},kpis:[k1,k2],subtasks:[
    {id:'s1',kpiId:'k1',title:'Chuẩn bị tài liệu',plannedWeek:1,deadline:`${p}-08`,priority:'high',status:'in_progress'},
    {id:'s2',kpiId:'k1',title:'Đào tạo online',plannedWeek:2,deadline:`${p}-15`,priority:'medium',status:'todo'},
    {id:'s3',kpiId:'k1',title:'Upload kho dữ liệu',plannedWeek:null,deadline:null,priority:'low',status:'todo'},
    {id:'s4',kpiId:'k2',title:'Research thành phần',plannedWeek:1,deadline:null,priority:'medium',status:'in_progress'}
  ],tasks:[
    {id:'t1',subtaskId:'s1',title:'Tìm tài liệu',plannedDate:d,plannedPeriod:'morning',deadline:d,estimatedMinutes:90,priority:'high',status:'done',result:'Đã tổng hợp tài liệu',isHighlight:true},
    {id:'t2',subtaskId:'s1',title:'Soạn outline',plannedDate:d,plannedPeriod:'afternoon',deadline:null,estimatedMinutes:120,priority:'medium',status:'in_progress',result:'',isHighlight:false},
    {id:'t3',subtaskId:'s1',title:'Làm slide',plannedDate:null,plannedPeriod:null,deadline:null,estimatedMinutes:180,priority:'high',status:'todo',result:'',isHighlight:false},
    {id:'t4',subtaskId:'s2',title:'Chuẩn bị Zoom',plannedDate:null,plannedPeriod:null,deadline:null,estimatedMinutes:30,priority:'medium',status:'todo',result:'',isHighlight:false},
    {id:'t5',subtaskId:'s4',title:'Đọc tài liệu kỹ thuật',plannedDate:null,plannedPeriod:null,deadline:null,estimatedMinutes:150,priority:'medium',status:'todo',result:'',isHighlight:false}
  ],links:[],notes:[{id:'n1',noteDate:d,content:'Kiểm tra lại slide trước buổi đào tạo.'}],events:[],urgent:[{id:'u1',title:'Chuẩn bị họp đột xuất',dueDate:d,priority:'high',status:'todo',note:'',evidenceUrl:''}],salaryRules:[{id:'r1',title:'Lương cơ bản',ruleType:'base',keyword:'',amount:10000000,active:true},{id:'r2',title:'Lớp online',ruleType:'keyword',keyword:'online',amount:100000,active:true}],payrolls:[],payrollItems:[]};
}
function loadDemo(){
  try{return JSON.parse(localStorage.getItem('flow-v2-demo'))||demoSeed();}catch{return demoSeed();}
}
function saveDemo(data){localStorage.setItem('flow-v2-demo',JSON.stringify(data));}
function filterPeriod(data,period){
  const kpis=data.kpis.filter(k=>k.period===period), kids=new Set(kpis.map(k=>k.id));
  const subtasks=data.subtasks.filter(s=>kids.has(s.kpiId)), sids=new Set(subtasks.map(s=>s.id));
  const tasks=data.tasks.filter(t=>sids.has(t.subtaskId));
  const payrolls=data.payrolls.filter(p=>p.period===period), pids=new Set(payrolls.map(p=>p.id));
  return {...clone(data),kpis,subtasks,tasks,payrolls,payrollItems:data.payrollItems.filter(i=>pids.has(i.payrollId)),notes:data.notes.filter(n=>String(n.noteDate).slice(0,7)===period),events:data.events.filter(e=>e.startDate<=`${period}-31`&&e.endDate>=`${period}-01`),urgent:data.urgent.filter(u=>u.status!=='done'||String(u.dueDate||'').slice(0,7)===period)};
}
async function ensureSupabase(){
  if(supabase)return;
  if(!config.supabaseUrl||config.supabaseUrl.includes('YOUR_'))throw Error('Chưa cấu hình Supabase. Bạn có thể dùng chế độ demo.');
  const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  supabase=mod.createClient(config.supabaseUrl,config.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
}
async function query(table,options={}){
  let q=supabase.from(tables[table]).select('*');
  if(options.period&&table==='kpis')q=q.eq('period',options.period);
  const orderColumns={notes:'note_date',events:'start_date',urgent:'due_date',payrolls:'period'};
  const {data,error}=await q.order(orderColumns[table]||'created_at',{ascending:true,nullsFirst:false});
  if(error)throw Error(error.message);return (data||[]).map(fromRow);
}
export const api={
  async init(callback){
    if(config.supabaseUrl?.includes('YOUR_'))return callback(null);
    await ensureSupabase(); const {data}=await supabase.auth.getSession();user=data.session?.user||null;
    supabase.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;callback(user);}); callback(user);
  },
  async signIn(email,password){await ensureSupabase();const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw Error(error.message);user=data.user;demo=false;return user;},
  async demoSignIn(){demo=true;user={id:'demo',email:'demo@flow.local'};return user;},
  async signOut(){if(!demo&&supabase)await supabase.auth.signOut();demo=false;user=null;},
  isDemo(){return demo;},
  async load(period){
    if(demo)return filterPeriod(loadDemo(),period);
    if(!user)throw Error('Vui lòng đăng nhập.');
    const [kpis,subtasks,tasks,links,notes,events,urgent,salaryRules,payrolls,payrollItems,profileResult]=await Promise.all([
      query('kpis',{period}),query('subtasks'),query('tasks'),query('links'),query('notes'),query('events'),query('urgent'),query('salaryRules'),query('payrolls'),query('payrollItems'),supabase.from('flow_v2_profiles').select('*').maybeSingle()
    ]);
    return filterPeriod({kpis,subtasks,tasks,links,notes,events,urgent,salaryRules,payrolls,payrollItems,profile:fromRow(profileResult.data)||{dailyCapacityMinutes:480}},period);
  },
  async save(table,row){
    if(demo){const data=loadDemo(),record={...row,id:row.id||uid(table.slice(0,2))};const i=data[table].findIndex(x=>x.id===record.id);if(i>=0)data[table][i]={...data[table][i],...record};else data[table].push(record);saveDemo(data);return record;}
    const record=toRow({...row,userId:user.id}); if(!row.id)delete record.id;
    const {data,error}=await supabase.from(tables[table]).upsert(record).select().single();if(error)throw Error(error.message);return fromRow(data);
  },
  async remove(table,id){
    if(demo){const data=loadDemo();data[table]=data[table].filter(x=>x.id!==id);if(table==='kpis'){const sids=data.subtasks.filter(s=>s.kpiId===id).map(s=>s.id);data.subtasks=data.subtasks.filter(s=>s.kpiId!==id);data.tasks=data.tasks.filter(t=>!sids.includes(t.subtaskId));}if(table==='subtasks')data.tasks=data.tasks.filter(t=>t.subtaskId!==id);if(table==='payrolls')data.payrollItems=data.payrollItems.filter(i=>i.payrollId!==id);saveDemo(data);return;}
    const {error}=await supabase.from(tables[table]).delete().eq('id',id);if(error)throw Error(error.message);
  },
  async saveNote(date,content){
    if(demo){const data=loadDemo(),old=data.notes.find(n=>n.noteDate===date);if(old)old.content=content;else data.notes.push({id:uid('note'),noteDate:date,content});saveDemo(data);return;}
    const {error}=await supabase.from(tables.notes).upsert({user_id:user.id,note_date:date,content},{onConflict:'user_id,note_date'});if(error)throw Error(error.message);
  },
  async replacePayroll(payroll,items){
    const saved=await this.save('payrolls',payroll);
    if(demo){const data=loadDemo();data.payrollItems=data.payrollItems.filter(i=>i.payrollId!==saved.id);items.forEach(i=>data.payrollItems.push({...i,id:uid('pi'),payrollId:saved.id}));saveDemo(data);return saved;}
    const del=await supabase.from(tables.payrollItems).delete().eq('payroll_id',saved.id);if(del.error)throw Error(del.error.message);
    if(items.length){const ins=await supabase.from(tables.payrollItems).insert(items.map(i=>toRow({...i,payrollId:saved.id,userId:user.id})));if(ins.error)throw Error(ins.error.message);}
    return saved;
  },
  async allForYear(year){
    if(demo){const d=loadDemo();return {...clone(d),kpis:d.kpis.filter(k=>k.period.startsWith(year)),payrolls:d.payrolls.filter(p=>p.period.startsWith(year))};}
    const data={};for(const key of Object.keys(tables))data[key]=await query(key);data.kpis=data.kpis.filter(k=>k.period.startsWith(year));data.payrolls=data.payrolls.filter(p=>p.period.startsWith(year));return data;
  }
};
