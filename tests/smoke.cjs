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
assert.equal(days.length,84,'The first-stage curriculum must contain 84 lessons.');
assert.equal(weeks.length,12,'The first stage must contain 12 weeks.');
assert.equal(context.window.ACADEMY_ENGLISH.length,84,'Every lesson has an English word.');
assert.equal(context.window.ACADEMY_START,'2026-09-20');
assert.equal(guide.focusedCount,14,'First two weeks have individually written explanations.');
assert.equal(guide.grammarCount,12,'All twelve weeks have English grammar guidance.');
for(let index=0;index<84;index++){
  const d=days[index];
  assert.equal(d.number,index+1,`Lesson ${index+1} has correct index.`);
  assert.equal(d.week,Math.floor(index/7));
  for(const key of ['qa','python','practice'])assert.ok(typeof d[key]==='string'&&d[key].trim().length>3,`Lesson ${index+1}: ${key}`);
  assert.ok(d.english?.word&&d.english?.translation,`Lesson ${index+1} has vocabulary.`);
  for(const subject of ['qa','python']){
    const lesson=guide.guide(index+1,subject);
    for(const key of ['theory','example','question','how'])assert.ok(typeof lesson?.[key]==='string'&&lesson[key].trim().length>30,`Lesson ${index+1} ${subject}: ${key}`);
  }
  const english=guide.english(index+1);
  assert.equal(english.main.word,d.english.word,`English lesson ${index+1} uses correct word.`);
  assert.equal(english.review.length,4,`English lesson ${index+1} has four review words.`);
  assert.ok(english.grammar.title&&english.grammar.example&&english.grammar.task,`English lesson ${index+1} has grammar.`);
  assert.equal(new Set([english.main.word,...english.review.map(item=>item.word)]).size,5,`English lesson ${index+1} has five unique cards.`);
}
const html=read('studio.html'),script=read('studio.js'),root=read('index.html'),worker=read('python-worker.mjs'),extras=read('studio-extras.js');
assert.match(root,/href="studio\.html"/, 'The main page must link to the studio.');
for(const file of ['curriculum.js','lesson-guide.js','studio.js','studio-extras.js','studio.css','studio-extras.css'])assert.ok(html.includes(`"${file}"`),`Studio must load ${file}`);
assert.match(html,/worker-src 'self'/, 'Python runs inside its own worker.');
assert.match(worker,/loadPyodide/, 'A real Python runtime is present.');
assert.match(extras,/MutationObserver/, 'Lesson companion follows navigation.');
const required=[...new Set([...script.matchAll(/\$\('([^']+)'\)/g),...extras.matchAll(/\$\('([^']+)'\)/g)].map(hit=>hit[1]))];
for(const id of required)assert.ok(html.includes(`id="${id}"`),`Missing studio element #${id}`);
for(const id of ['tabQa','tabPython','tabEnglish','qaBadge','pythonBadge','englishBadge'])assert.ok(html.includes(`id="${id}"`),`Missing dynamic element #${id}`);
assert.match(script,/academy_blocks/);assert.match(script,/academy_sessions/);
assert.match(script,/meta\.fields\.completion/,'Completing a lesson must update sync version metadata.');
console.log(`PASS: 84 lessons with QA/Python explanations, 84 English sessions with grammar and review, ${required.length} DOM IDs, cloud and Python wiring.`);
