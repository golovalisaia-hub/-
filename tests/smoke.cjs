const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const read=name=>fs.readFileSync(name,'utf8');
const context={window:{}};
vm.runInNewContext(read('curriculum.js'),context,{timeout:1000});
vm.runInNewContext(read('lesson-guide.js'),context,{timeout:1000});
const days=context.window.ACADEMY_DAYS;
const weeks=context.window.ACADEMY_WEEKS;
const guide=context.window.AcademyGuide;
assert.equal(days.length,84,'The legacy curriculum contains 84 lessons.');
assert.equal(weeks.length,12,'The legacy first stage contains 12 weeks.');
assert.equal(context.window.ACADEMY_ENGLISH.length,84,'Legacy vocabulary exists.');
assert.equal(context.window.ACADEMY_START,'2026-09-20');
assert.equal(guide.focusedCount,14);
assert.equal(guide.grammarCount,12);
for(let index=0;index<84;index++){
  const d=days[index];
  assert.equal(d.number,index+1);
  assert.equal(d.week,Math.floor(index/7));
  for(const key of ['qa','python','practice'])assert.ok(typeof d[key]==='string'&&d[key].trim().length>3);
  assert.ok(d.english?.word&&d.english?.translation);
  for(const subject of ['qa','python']){
    const lesson=guide.guide(index+1,subject);
    for(const key of ['theory','example','question','how'])assert.ok(typeof lesson?.[key]==='string'&&lesson[key].trim().length>30);
  }
  const english=guide.english(index+1);
  assert.equal(english.main.word,d.english.word);
  assert.equal(english.review.length,4);
  assert.ok(english.grammar.title&&english.grammar.example&&english.grammar.task);
  assert.equal(new Set([english.main.word,...english.review.map(item=>item.word)]).size,5);
}
const html=read('studio.html'),script=read('studio.js'),root=read('index.html'),worker=read('python-worker.mjs'),extras=read('studio-extras.js');
assert.match(root,/href="path\.html"/, 'The homepage must open the new QA-first path.');
for(const file of ['curriculum.js','lesson-guide.js','studio.js','studio-extras.js','studio.css','studio-extras.css'])assert.ok(html.includes(`"${file}"`),`Legacy studio must load ${file}`);
assert.match(html,/worker-src 'self'/);
assert.match(worker,/loadPyodide/);
assert.match(extras,/MutationObserver/);
const required=[...new Set([...script.matchAll(/\$\('([^']+)'\)/g),...extras.matchAll(/\$\('([^']+)'\)/g)].map(hit=>hit[1]))];
for(const id of required)assert.ok(html.includes(`id="${id}"`),`Missing legacy studio element #${id}`);
for(const id of ['tabQa','tabPython','tabEnglish','qaBadge','pythonBadge','englishBadge'])assert.ok(html.includes(`id="${id}"`));
assert.match(script,/academy_blocks/);assert.match(script,/academy_sessions/);
/* The archive keeps its own cloud progress but must not touch the planner any more:
   only the live QA + English path is linked to the SEVER calendar. */
assert.doesNotMatch(script,/from\('tasks'\)[\s\S]{0,400}?\.update\(/,'the archive must not write planner tasks');
assert.doesNotMatch(script,/meta\.fields\.completion/,'the archive must not stamp calendar completion metadata');
assert.doesNotMatch(script,/function blockDone\(n,b\)\{return isDone\(n\)/,'a planner checkbox is not learning evidence');
assert.match(html,/class="archive-banner"/,'the archive page says it is an archive');
assert.match(html,/href="path\.html"/,'the archive points to the current route');
console.log(`PASS: legacy lessons preserved as a read-only archive, ${required.length} studio DOM IDs, new QA-first homepage points to path.html.`);
