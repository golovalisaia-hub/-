const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const read=name=>fs.readFileSync(name,'utf8');
const context={window:{}};
vm.runInNewContext(read('curriculum.js'),context,{timeout:1000});
const days=context.window.ACADEMY_DAYS;
const weeks=context.window.ACADEMY_WEEKS;
assert.equal(days.length,84,'The first-stage curriculum must contain 84 lessons.');
assert.equal(weeks.length,12,'The first stage must contain 12 weeks.');
assert.equal(context.window.ACADEMY_ENGLISH.length,84,'Every lesson has an English word.');
assert.equal(context.window.ACADEMY_START,'2026-09-20');
for(let index=0;index<84;index++){
  const d=days[index];
  assert.equal(d.number,index+1,`Lesson ${index+1} has correct index.`);
  assert.equal(d.week,Math.floor(index/7));
  for(const key of ['qa','python','practice'])assert.ok(typeof d[key]==='string'&&d[key].trim().length>3,`Lesson ${index+1}: ${key}`);
  assert.ok(d.english?.word&&d.english?.translation,`Lesson ${index+1} has a vocabulary item.`);
}
const html=read('studio.html'),script=read('studio.js'),root=read('index.html'),worker=read('python-worker.mjs');
assert.match(root,/href="studio\.html"/, 'Main page must link to the study studio.');
assert.match(html,/worker-src 'self'/, 'The console uses a self-hosted worker script.');
assert.match(worker,/loadPyodide/, 'The console must load a real Python runtime.');
const required=[...new Set([...script.matchAll(/\$\('([^']+)'\)/g)].map(hit=>hit[1]))];
for(const id of required)assert.ok(html.includes(`id="${id}"`),`Missing studio element #${id}`);
for(const id of ['tabQa','tabPython','tabEnglish','qaBadge','pythonBadge','englishBadge'])assert.ok(html.includes(`id="${id}"`),`Missing dynamic element #${id}`);
assert.match(script,/academy_blocks/);assert.match(script,/academy_sessions/);
assert.match(script,/meta\.fields\.completion/,'Completing a lesson must update sync version metadata.');
console.log(`PASS: ${days.length} indexed lessons, ${weeks.length} weeks, ${required.length} referenced DOM IDs, Academy cloud and Python integration found.`);
