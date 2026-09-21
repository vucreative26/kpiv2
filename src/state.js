import {currentMonth} from './utils.js?v=20260921-users12';
export const emptyData=()=>({months:[],kpis:[],subtasks:[],tasks:[],urgentTasks:[],notes:[],timeEntries:[],payrolls:[],attendanceEvents:[],profile:{},settings:{}});
const state={view:'dashboard',period:currentMonth(),calendarView:'month',anchorDate:null,planningSidebar:'unscheduled',planningKpiId:null,planningSubtaskId:null,planningSlide:'forward',rangeStart:null,rangeEnd:null,data:emptyData(),demo:false,user:null,filters:{query:'',status:'all',week:'all',kpi:'all',hideCompleted:false}};
export const getState=()=>state;
export const setState=patch=>Object.assign(state,patch);
export const setData=data=>state.data={...emptyData(),...data,settings:{...data.settings}};
