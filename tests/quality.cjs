const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const scope={window:{}};
for(const file of ['curriculum.js','lesson-guide.js','learning-checks.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),scope,{timeout:1500,filename:file});
const checks=scope.window.AcademyChecks;
assert.ok(checks,'Learning checks load.');
assert.ok(checks.qaIssues('Привет').length>=2,'A one-word QA answer must not pass.');
assert.equal(checks.qaIssues('Предусловие: добавлена карта. Шаги: открыть карту, нажать удалить и подтвердить. Ожидаемый результат: карта пропала из списка.').length,0,'A structured test case passes a format check.');
assert.ok(checks.qaIssues('Я открыл приложение и нажал кнопку, проверил ещё раз несколько вариантов, посмотрел что случилось.').length>0,'Missing expected result is flagged.');
assert.equal(checks.pythonIssues('Этот код выводит сообщение и завершается без ошибок.',"print('ok')").length,0);
assert.ok(checks.pythonIssues('',"print('ok')").length>0,'Python requires an explanation.');
assert.equal(checks.englishMatches('ПРИВЕТ!','привет'),true);
assert.equal(checks.englishMatches('Нет','да'),false);
for(let n=1;n<=84;n++){
  const e=scope.window.AcademyGuide.english(n);
  for(let i=0;i<e.review.length;i++){
    const choices=checks.reviewChoices(e.review[i],[e.main,...e.review],n+i*3);
    assert.equal(choices.length,3,`Lesson ${n} question ${i}: three choices.`);
    assert.equal(new Set(choices).size,3,`Lesson ${n} question ${i}: choices are different.`);
    assert.ok(choices.includes(e.review[i].translation),`Lesson ${n} question ${i}: correct answer included.`);
  }
}
const extras=fs.readFileSync('studio-extras.js','utf8');
assert.match(extras,/learning-checks\.js/);
assert.match(extras,/academy-quality\.js/);
/* Оформление живёт в одном academy-ui.css, который страница подключает напрямую;
   скрипт больше не вставляет отдельные таблицы стилей. */
assert.doesNotMatch(extras,/\.css'/,'studio-extras.js injects behaviour only, not stylesheets');
assert.match(fs.readFileSync('studio.html','utf8'),/academy-ui\.css/,'the archive uses the single stylesheet');
const quality=fs.readFileSync('academy-quality.js','utf8');
assert.match(quality,/stopImmediatePropagation/,'Invalid completion blocked before core handler.');
assert.match(quality,/beforeunload/,'Pending timer warns on navigation.');
console.log('PASS: self-checks, QA/Python feedback, 336 English revision questions and studio wiring.');
