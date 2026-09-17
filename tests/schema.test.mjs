import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../schema.sql',import.meta.url),'utf8');
test('mọi bảng nghiệp vụ V2 bật RLS qua allowlist',()=>{
  for(const table of ['flow_v2_kpis','flow_v2_subtasks','flow_v2_tasks','flow_v2_daily_notes','flow_v2_events','flow_v2_urgent_tasks','flow_v2_payrolls']) assert.match(sql,new RegExp(table));
  assert.match(sql,/enable row level security/);
  assert.match(sql,/auth\.uid\(\)\)=user_id/);
});
test('schema có đủ trường planner',()=>{
  for(const field of ['planned_week','planned_date','planned_period','estimated_minutes','daily_capacity_minutes']) assert.match(sql,new RegExp(field));
});
