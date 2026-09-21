import {currentMonth} from './utils.js';
export const emptyData=()=>({months:[],kpis:[],subtasks:[],tasks:[],urgentTasks:[],payrolls:[],attendanceEvents:[],settings:{}});
const state={view:'dashboard',period:currentMonth(),calendarView:'month',anchorDate:null,data:emptyData(),demo:false,user:null,filters:{query:'',status:'all',week:'all',kpi:'all',hideCompleted:false}};
export const getState=()=>state;
export const setState=patch=>Object.assign(state,patch);
export const setData=data=>state.data={...emptyData(),...data,settings:{...data.settings}};
