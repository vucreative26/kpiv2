export const departments = [['training','Phòng đào tạo'],['marketing','Phòng Marketing'],['sales','Phòng kinh doanh'],['hr','Phòng nhân sự']];
export const positions = department => [['head',department==='hr'?'Trưởng phòng nhân sự':'Trưởng phòng'],...(department==='sales'?[['manager','Quản lý']]:[]),['staff',department==='training'?'Dược sĩ đào tạo':'Nhân viên']];
export const canManage = p => p?.status==='active' && !!p.department && (p.position==='head'||(p.department==='sales'&&p.position==='manager'));
export const positionLabel = p => positions(p.department).find(([id])=>id===p.position)?.[1]||'Chưa phân quyền';
export const completedSubtasks = data => data.subtasks.filter(s=>{const children=data.tasks.filter(t=>t.subtaskId===s.id);return children.length?children.every(t=>t.completed):s.completed});
export function autoCheckout(entries,now=new Date()) { return entries.map(e=>{const deadline=new Date(`${e.date}T22:00:00+07:00`);return e.checkInAt&&!e.checkOutAt&&deadline<=now?{...e,checkOutAt:new Date(Math.max(+deadline,+new Date(e.checkInAt))).toISOString(),autoCheckout:true}:e}); }
