const assert=require('node:assert/strict');
const fs=require('node:fs');
const lab=require('../qa-transfer-core.js');
const read=file=>fs.readFileSync(file,'utf8');
const checks=[
  [999,false,'fee','fee'],[1000,false,'free','fee'],[1001,false,'free','free'],
  [499,true,'fee','fee'],[500,true,'free','fee'],[501,true,'free','free'],
  [-1,false,'rejected','rejected'],[1.5,true,'rejected','rejected'],[5001,false,'rejected','rejected']
];
for(const [amount,member,wanted,actual]of checks){
  assert.equal(lab.expected(amount,member),wanted,`Specification: ${amount} / member=${member}`);
  assert.equal(lab.observed(amount,member),actual,`Simulated response: ${amount} / member=${member}`);
}
const journal=lab.PROBES.map((probe,index)=>({id:index+1,amount:probe.amount,member:probe.member,actual:lab.observed(probe.amount,probe.member)}));
assert.equal(lab.covered(journal).length,7,'All seven boundary cases can be tracked');
assert.equal(lab.covered([journal[0],journal[0]]).length,1,'Repeated checks do not inflate coverage');
assert.equal(lab.checkReport([],1,'free','fee','Steps').code,'no-evidence','A claim without a run cannot count');
assert.equal(lab.checkReport(journal,2,'free','fee',' ').code,'missing-steps','Reproduction steps must be provided');
assert.equal(lab.checkReport(journal,2,'fee','fee','Set 1000; click calculate').code,'expected','The specification must be used');
assert.equal(lab.checkReport(journal,2,'free','free','Set 1000; click calculate').code,'actual','Observed evidence must agree');
assert.equal(lab.checkReport(journal,1,'fee','fee','Set 999; click calculate').code,'not-a-bug','Conforming behavior does not count');
assert.equal(lab.checkReport(journal,2,'free','fee','Set 1000; click calculate').ok,true,'Regular boundary discrepancy is verifiable');
assert.equal(lab.checkReport(journal,5,'free','fee','Activate subscription; set 500; calculate').ok,true,'Subscriber boundary discrepancy is verifiable');
const html=read('qa-transfer.html'),ui=read('qa-transfer.js'),entry=read('path-entry.js');
for(const asset of ['qa-transfer-core.js','qa-transfer.js','qa-transfer.css'])assert.ok(html.includes(asset),`Missing lab asset ${asset}`);
for(const id of ['orderForm','amount','member','journal','reportForm','evidencePick','expected','actual','steps','reportFeedback','coverage','copy','restart'])assert.ok(html.includes(`id="${id}"`),`Missing lab UI #${id}`);
assert.match(entry,/qa-transfer\.html/,'The practice must be discoverable from the real lesson page');
assert.doesNotMatch(ui,/supabase|academy_path_progress|\.from\(['"]tasks['"]\)/i,'Lab must not write private cloud or SEVER data');
console.log('PASS: 9 pricing cases, 7 unique boundaries, evidence validation, and safe lesson-to-lab wiring.');
