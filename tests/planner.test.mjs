import test from 'node:test';
import assert from 'node:assert/strict';
import {weeksOfMonth,weekForDate,progressForSubtask,progressForKpi,percent,normalizeSearch} from '../src/utils.js';

test('chia tháng thành tuần cắt theo ranh giới tháng',()=>{
  const weeks=weeksOfMonth('2026-09');
  assert.deepEqual(weeks.map(w=>[w.start,w.end]),[
    ['2026-09-01','2026-09-06'],['2026-09-07','2026-09-13'],['2026-09-14','2026-09-20'],['2026-09-21','2026-09-27'],['2026-09-28','2026-09-30']
  ]);
  assert.equal(weekForDate('2026-09','2026-09-08'),2);
});

test('progress KPI tính trực tiếp từ Task, không trung bình sai theo Sub-task',()=>{
  const k={id:'k'},subs=[{id:'a',kpiId:'k',status:'done'},{id:'b',kpiId:'k',status:'todo'}];
  const tasks=[{subtaskId:'a',status:'done'},...Array.from({length:9},()=>({subtaskId:'b',status:'todo'}))];
  assert.deepEqual(progressForKpi(k,subs,tasks),{done:1,total:10});
  assert.equal(percent(progressForKpi(k,subs,tasks)),10);
});

test('Sub-task không có Task dùng trạng thái của chính nó',()=>{
  assert.deepEqual(progressForSubtask({id:'a',status:'done'},[]),{done:1,total:1});
});

test('search tiếng Việt không phụ thuộc dấu',()=>{
  assert.equal(normalizeSearch('Đào tạo Mesotherapy'),'dao tao mesotherapy');
});
