/* Three learning stages and the objective зачёт.
   Content is validated in Node; the flow is driven in Chromium against a shared in-process
   store. No production credentials, no real user records. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:4173/path.html';
const OWNER='assessment-owner';

/* ---------- 1. Content ---------- */
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync('path-assessment.js','utf8'),sandbox,{timeout:2000});
vm.runInNewContext(fs.readFileSync('path-lessons.js','utf8'),sandbox,{timeout:2000});
const exam=sandbox.window.AcademyAssessment;
const lessons=sandbox.window.AcademyPathLessons;
assert.equal(exam.qa.length,14,'зачёт exists for every QA lesson');
assert.equal(exam.english.length,14,'зачёт exists for every English lesson');
const normalise=text=>String(text).toLowerCase().replace(/[.,!?;:'"«»]/g,'').replace(/\s+/g,' ').trim();
exam.qa.forEach((item,index)=>{
  const where=`QA lesson ${index+1}`;
  assert.equal(item.cases.length,3,`${where}: three objective cases`);
  assert.ok(item.rubric.length>=3,`${where}: an explicit rubric, not a single checkbox`);
  for(const [prompt,options,answer,why] of item.cases){
    assert.ok(prompt.length>20,`${where}: a real question`);
    assert.ok(options.length>=3,`${where}: at least three options`);
    assert.ok(Number.isInteger(answer)&&options[answer],`${where}: exactly one valid answer index`);
    assert.ok(why.length>20,`${where}: the answer is explained`);
    assert.equal(new Set(options).size,options.length,`${where}: no duplicated options`);
  }
  /* The зачёт must not repeat the comprehension quiz. */
  const quiz=lessons.qa[index].quiz.map(entry=>entry[0]);
  for(const [prompt] of item.cases)assert.ok(!quiz.includes(prompt),`${where}: зачёт asks something new`);
});
exam.english.forEach((item,index)=>{
  const where=`English lesson ${index+1}`;
  for(const skill of ['reading','listening','writing','speaking']){
    assert.ok(item[skill],`${where}: ${skill} is covered`);
    assert.match(item[skill].goal,/^(Pre-A1|A1) · /,`${where}: ${skill} names a measurable CEFR goal`);
  }
  for(const skill of ['reading','listening']){
    assert.ok(item[skill].options[item[skill].answer],`${where}: ${skill} has one correct option`);
  }
  assert.ok(item.writing.accept.length>0,`${where}: writing has an accepted answer`);
  for(const accepted of item.writing.accept)assert.equal(accepted,normalise(accepted),`${where}: accepted writing answers are stored normalised`);
  assert.ok(item.speaking.phrase.length>5,`${where}: speaking has a phrase to say`);
});
console.log('PASS: 14 QA зачёт sets with rubrics and 14 English CEFR skill goals are well formed.');

/* ---------- 2. Flow ---------- */
const rows=new Map();
let columnsSupported=true;
function cloud(request){
  if(request.table==='profiles')return {data:{role:'owner'},error:null};
  if(request.op==='select'&&request.wantsExtraColumns&&!columnsSupported){
    return {data:null,error:{code:'42703',message:'column "assessment" does not exist'}};
  }
  if(request.op==='upsert'){
    const row={...request.payload};
    if(!columnsSupported){delete row.certified_at;delete row.assessment;delete row.attempts;}
    rows.set(`${row.track}:${row.lesson_number}`,row);
    return {data:{...row},error:null};
  }
  return {data:[...rows.values()].map(row=>({...row})),error:null};
}
const stub=`(()=>{'use strict';
const auth={
  getSession:async()=>({data:{session:{user:{id:'${OWNER}'}}},error:null}),
  getUser:async()=>({data:{user:{id:'${OWNER}'}},error:null}),
  signInWithPassword:async()=>({data:{user:{id:'${OWNER}'}},error:null}),
  signOut:async()=>({error:null})
};
function from(table){
  const state={table,op:'select',payload:null,wantsExtraColumns:false};
  const api={
    select(list){state.wantsExtraColumns=typeof list==='string'&&list.includes('certified_at');return api;},
    upsert(value){state.op='upsert';state.payload=value;return api;},
    eq(){return api;},limit(){return api;},
    single(){return window.__cloud(state);},
    then(resolve,reject){return window.__cloud(state).then(resolve,reject);}
  };
  return api;
}
window.supabase={createClient:()=>({auth,from})};
})();`;
async function open(browser){
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.exposeBinding('__cloud',(_source,request)=>cloud(request));
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/vendor/supabase.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:stub}));
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.getElementById('answer').disabled,undefined,{timeout:15000});
  return {context,page,errors};
}
const answerQuiz=(page,subject)=>page.evaluate(async name=>{
  const questions=window.AcademyPathLessons[name][0].quiz;
  const blocks=document.querySelectorAll('#questions .question');
  questions.forEach((question,index)=>{
    const correct=question[1][question[2]];
    [...blocks[index].querySelectorAll('button')].find(button=>button.textContent===correct)?.click();
  });
},subject);
const solveCases=(page,all=true)=>page.evaluate(correct=>{
  const cases=window.AcademyAssessment.qa[0].cases;
  const blocks=[...document.querySelectorAll('#examBody .question')];
  cases.forEach((item,index)=>{
    const wanted=correct?item[2]:(item[2]+1)%item[1].length;
    blocks[index].querySelectorAll('button')[wanted].click();
  });
},all);
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const {context,page,errors}=await open(browser);

    /* Stage 1: two correct comprehension answers record "ознакомился" without any text. */
    await answerQuiz(page,'qa');
    await page.waitForFunction(()=>document.getElementById('stageViewed').className==='done',undefined,{timeout:10000});
    assert.equal(rows.get('qa_foundation:1').status,'viewed','reading the topic is its own recorded stage');
    assert.equal(rows.get('qa_foundation:1').answer,'','the viewed marker never invents an answer');
    assert.equal(await page.locator('#stagePractised').getAttribute('class'),'','practice is not granted by the quiz');

    /* The зачёт refuses to run before the practice is fixed. */
    await page.locator('#examSubmit').click();
    assert.match(await page.locator('#feedback').textContent(),/Сначала зафиксируй практику/,'зачёт comes after practice');
    assert.equal(rows.get('qa_foundation:1').certified_at??null,null);

    /* Stage 2: written work, opened criteria and a ticked self-review. */
    await page.locator('#answer').fill('Предусловие: заметка открыта. Шаги: нажать «Сохранить», обновить список. Ожидаемый результат: заметка в списке. Фактический результат совпал.');
    await page.locator('#criteriaBox summary').click();
    await page.locator('#reviewed').check();
    await page.locator('#complete').click();
    await page.waitForFunction(()=>document.getElementById('stagePractised').className==='done',undefined,{timeout:10000});
    assert.equal(rows.get('qa_foundation:1').status,'practiced');

    /* Stage 3 is objective: a wrong case blocks the зачёт and the failure is kept in history. */
    await solveCases(page,false);
    await page.locator('#examSubmit').click();
    await page.waitForFunction(()=>document.getElementById('examHistory').children.length>0,undefined,{timeout:10000});
    assert.equal(rows.get('qa_foundation:1').certified_at??null,null,'a wrong answer never becomes a зачёт');
    const failed=rows.get('qa_foundation:1').attempts;
    assert.equal(failed.length,1,'the failed attempt is recorded');
    assert.equal(failed[0].ok,false);

    /* Correct cases but an untouched rubric are still not enough. */
    await solveCases(page,true);
    await page.locator('#examSubmit').click();
    await page.waitForFunction(()=>document.getElementById('examFeedback').textContent.includes('рубрики'),undefined,{timeout:10000});
    assert.equal(rows.get('qa_foundation:1').certified_at??null,null,'the rubric is part of the зачёт');

    /* Everything satisfied: the зачёт is recorded with its evidence. */
    const boxes=page.locator('#examBody .rubric input');
    for(let index=0;index<await boxes.count();index++)await boxes.nth(index).check();
    await page.locator('#examSubmit').click();
    await page.waitForFunction(()=>document.getElementById('stagePassed').className==='done',undefined,{timeout:10000});
    const row=rows.get('qa_foundation:1');
    assert.equal(row.status,'practiced','the calendar keeps seeing the status it already understands');
    assert.ok(row.certified_at,'the зачёт is stored in its own column');
    assert.deepEqual(row.assessment.cases,[true,true,true],'the evidence says which cases were solved');
    assert.equal(row.assessment.rubric.length,3,'the rubric used is stored with the зачёт');
    assert.equal(row.attempts.at(-1).ok,true,'the successful attempt joins the history');
    assert.ok(row.answer.includes('Предусловие'),'the зачёт keeps the written work');
    assert.match(await page.locator('#gateText').textContent(),/Сдано: 1 из 14/,'stage 2 counts зачёт, not practice');

    /* English: each CEFR skill has to be demonstrated separately. */
    await page.locator('#englishTab').click();
    await answerQuiz(page,'english');
    await page.locator('#answer').fill('Hello! My name is Anna. I am a student.');
    await page.locator('#criteriaBox summary').click();
    await page.locator('#reviewed').check();
    await page.locator('#complete').click();
    await page.waitForFunction(()=>document.getElementById('stagePractised').className==='done',undefined,{timeout:10000});
    await page.evaluate(()=>{
      const data=window.AcademyAssessment.english[0];
      const sections=[...document.querySelectorAll('#examBody .skill')];
      const pick=(section,text)=>[...section.querySelectorAll('.choices button')].find(button=>button.textContent===text)?.click();
      pick(sections[0],data.reading.options[data.reading.answer]);
      pick(sections[1],data.listening.options[data.listening.answer]);
    });
    await page.locator('#examSubmit').click();
    await page.waitForFunction(()=>document.getElementById('examFeedback').textContent.includes('письма'),undefined,{timeout:10000});
    assert.equal(rows.get('english_foundation:1').certified_at??null,null,'writing and speaking are not optional');
    await page.locator('.skill-input').fill('Hello! My name is Anna.');
    await page.locator('#examBody .confirmation input').check();
    await page.locator('#examSubmit').click();
    await page.waitForFunction(()=>document.getElementById('stagePassed').className==='done',undefined,{timeout:10000});
    const english=rows.get('english_foundation:1');
    assert.equal(english.status,'practiced');
    assert.ok(english.certified_at,'English зачёт recorded');
    assert.equal(english.assessment.skills.reading,true);
    assert.equal(english.assessment.skills.speaking,'самооценка','speaking is honestly marked as self-reported');
    assert.deepEqual(errors,[],`page errors: ${errors.join(' | ')}`);
    await context.close();

    /* An older database without the зачёт columns stays usable and says so. */
    columnsSupported=false;rows.clear();
    const old=await open(browser);
    await old.page.waitForFunction(()=>document.getElementById('cloudStatus').textContent.includes('academy_three_stage_assessment'),undefined,{timeout:10000});
    assert.equal(await old.page.locator('#examSubmit').isDisabled(),true,'зачёт is disabled instead of pretending to save');
    await old.page.locator('#answer').fill('Черновик на старой схеме сохраняется как раньше.');
    await old.page.locator('#save').click();
    await old.page.waitForFunction(()=>document.getElementById('feedback').textContent.includes('Черновик сохранён'),undefined,{timeout:10000});
    assert.equal(rows.get('qa_foundation:1').status,'draft','the old two-stage flow keeps working');
    assert.deepEqual(old.errors,[],`page errors: ${old.errors.join(' | ')}`);
    await old.context.close();
    console.log('PASS: ознакомился -> попрактиковался -> зачёт, objective checks, attempt history and old-schema fallback.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error.message||error);process.exitCode=1;});
