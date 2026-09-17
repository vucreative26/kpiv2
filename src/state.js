import {currentPeriod,weeksOfMonth} from './utils.js';

const emptyData=()=>({kpis:[],subtasks:[],tasks:[],links:[],notes:[],events:[],urgent:[],salaryRules:[],payrolls:[],payrollItems:[],profile:{dailyCapacityMinutes:480}});
const state={
  period:currentPeriod(), view:'dashboard', week:1, data:emptyData(), user:null, demo:false, loading:false,
  listeners:new Set(), filters:{query:'',category:'all',priority:'all',status:'all'}
};
export function getState(){return state;}
export function setState(patch){Object.assign(state,patch);state.listeners.forEach(fn=>fn(state));}
export function subscribe(fn){state.listeners.add(fn);return()=>state.listeners.delete(fn);}
export function setData(data){state.data={...emptyData(),...data,profile:{dailyCapacityMinutes:480,...(data.profile||{})}};setState({data:state.data});}
export function updateLocal(table,id,patch){
  const list=state.data[table]||[],i=list.findIndex(x=>x.id===id);
  if(i>=0)list[i]={...list[i],...patch}; setState({data:state.data});
}
export function selectedWeek(){return weeksOfMonth(state.period).find(w=>w.number===state.week)||weeksOfMonth(state.period)[0];}
export function resetState(){state.data=emptyData();state.user=null;state.demo=false;state.view='dashboard';state.listeners.forEach(fn=>fn(state));}
