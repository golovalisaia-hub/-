const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const read=file=>fs.readFileSync(file,'utf8');
const ctx={window:{}};
vm.runInNewContext(read('path-lessons.js'),ctx,{timeout:3000});
const {qa,english}=ctx.window.AcademyPathLessons;
assert.equal(qa.length,14,'14 authored QA foundation lessons');
assert.equal(english.length,14,'14 authored English foundation lessons');
for(const [track,items] of [['QA',qa],['English',english]]){
 for(let i=0;i<items.length;i++){
  const item=items[i];
  assert.ok(typeof item.title==='string'&&item.title.length>=6,`${track} ${i+1} title`);
  for(const field of ['theory','example','practice','criteria'])assert.ok(typeof item[field]==='string'&&item[field].length>24,`${track} ${i+1} ${field}`);
  assert.equal(item.quiz.length,2,`${track} ${i+1} questions`);
  for(const [question,choices,correct,reason] of item.quiz){
   assert.ok(question.length>=6,`${track} ${i+1}: quiz prompt`);
   assert.ok(reason.length>=6,`${track} ${i+1}: quiz feedback`);
   assert.equal(choices.length,3);
   assert.ok(Number.isInteger(correct)&&correct>=0&&correct<choices.length);
   assert.equal(new Set(choices).size,3,`${track} ${i+1} unique choices`);
  }
  if(track==='English')assert.ok(item.speech.length>12,`English ${i+1} speech`);
 }
}
const html=read('path.html'),js=read('path.js'),root=read('index.html');
assert.match(root,/id="mapTitle"/,'The homepage is now a course map dashboard');
assert.match(root,/href="path\.html"/,'Dashboard links to real QA-first lessons');
assert.match(root,/home\.js/,'Dashboard loads actual owner progress');
for(const asset of ['path.css','path-redesign.css','path-entry.js','path-lessons.js','path.js','vendor/supabase.js'])assert.ok(html.includes(asset),`Missing path asset ${asset}`);
for(const id of ['qaTab','englishTab','lessonSelect','answer','save','complete','reviewed','criteriaBox','progressFill','cloudStatus','loginDialog'])assert.ok(html.includes(`id="${id}"`),`Missing UI #${id}`);
assert.doesNotMatch(html,/id="pythonTab"/,'Python is not an obligatory foundation tab');
assert.match(js,/academy_path_progress/,'Separate path progress');
assert.match(js,/\.upsert\(/,'Cloud upsert');
assert.doesNotMatch(js,/\.from\(['"]tasks['"]\)/,'Never mutate planner tasks from the new path');
assert.match(js,/academy-path-draft-v1/,'Local draft fallback');
console.log('PASS: focused dashboard, 14 QA + 14 English lessons, valid quizzes, isolated learning records and no SEVER task writes.');
