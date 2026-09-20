/* Cross-device continuity for the QA + English path: phone -> tablet -> desktop.
   The cloud is a shared in-process store, so the three browser contexts really are three
   separate devices talking to one server. No production credentials, no real user records. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:4173/path.html';
const OWNER='cross-device-owner';
/* One shared server-side store for all devices. */
const rows=new Map();
const calls=[];
function cloud(request){
  calls.push(`${request.table}:${request.op}`);
  if(request.table==='profiles')return {data:{role:'owner'},error:null};
  if(request.table!=='academy_path_progress')return {data:null,error:{message:`Unexpected table ${request.table}`}};
  if(request.op==='upsert'){
    const row={...request.payload};
    if(row.user_id!==OWNER)return {data:null,error:{message:'RLS: foreign user_id rejected'}};
    rows.set(`${row.track}:${row.lesson_number}`,row);
    return {data:{...row},error:null};
  }
  return {data:[...rows.values()].filter(row=>row.user_id===request.userId).map(row=>({...row})),error:null};
}
const stub=owner=>`(()=>{'use strict';
const auth={
  getSession:async()=>({data:{session:${owner?`{user:{id:'${OWNER}'}}`:'null'}},error:null}),
  getUser:async()=>({data:{user:${owner?`{id:'${OWNER}'}`:'null'}},error:null}),
  signInWithPassword:async()=>({data:{user:{id:'${OWNER}'}},error:null}),
  signOut:async()=>({error:null})
};
function from(table){
  const state={table,op:'select',payload:null,userId:null};
  const api={
    select(){return api;},
    upsert(value){state.op='upsert';state.payload=value;return api;},
    eq(key,value){if(key==='user_id')state.userId=value;return api;},
    limit(){return api;},
    single(){return window.__cloud(state);},
    then(resolve,reject){return window.__cloud(state).then(resolve,reject);}
  };
  return api;
}
window.supabase={createClient:()=>({auth,from})};
})();`;
async function device(browser,name,width,height,owner=true){
  const context=await browser.newContext({viewport:{width,height}});
  await context.exposeBinding('__cloud',(_source,request)=>cloud(request));
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(`${name}: ${error.message}`));
  await page.route('**/vendor/supabase.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:stub(owner)}));
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.locator('#topic').waitFor();
  return {context,page,errors,name};
}
async function practise(page){
  /* Two correct answers, a real written answer, opened criteria and a ticked self-review. */
  for(let index=0;index<2;index++){
    const correct=await page.evaluate(i=>{
      const question=window.AcademyPathLessons.qa[0].quiz[i];
      return question[1][question[2]];
    },index);
    await page.locator('.question').nth(index).getByRole('button',{name:correct,exact:true}).click();
  }
  await page.locator('#criteriaBox summary').click();
  await page.locator('#reviewed').check();
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const draft='Предусловие: заметка открыта. Шаги: нажать «Сохранить» и обновить список. Ожидаемый результат: заметка видна в списке, данные не потеряны.';
  try{
    /* 1. Phone: write a draft and store it in the cloud. */
    const phone=await device(browser,'phone',390,844);
    await phone.page.waitForFunction(()=>!document.getElementById('answer').disabled,undefined,{timeout:15000});
    await phone.page.locator('#answer').fill(draft);
    await phone.page.locator('#save').click();
    await phone.page.waitForFunction(()=>document.getElementById('feedback').textContent.includes('Черновик сохранён'),undefined,{timeout:15000});
    assert.equal(rows.size,1,'phone stored exactly one row');
    assert.equal([...rows.values()][0].status,'draft','a saved draft is not a completed practice');

    /* 2. Tablet: a different device with its own storage sees the same text. */
    const tablet=await device(browser,'tablet',834,1194);
    await tablet.page.waitForFunction(()=>!document.getElementById('answer').disabled,undefined,{timeout:15000});
    assert.equal(await tablet.page.locator('#answer').inputValue(),draft,'tablet restored the phone draft without loss');
    assert.equal(await tablet.page.locator('#draftNotice').isHidden(),true,'no false conflict warning for identical text');

    /* 3. Desktop: finish the practice on the third device. */
    const desktop=await device(browser,'desktop',1440,900);
    await desktop.page.waitForFunction(()=>!document.getElementById('answer').disabled,undefined,{timeout:15000});
    assert.equal(await desktop.page.locator('#answer').inputValue(),draft,'desktop restored the same draft');
    await practise(desktop.page);
    await desktop.page.locator('#complete').click();
    await desktop.page.waitForFunction(()=>document.getElementById('feedback').textContent.includes('Практика сохранена'),undefined,{timeout:15000});
    assert.equal([...rows.values()][0].status,'practiced','desktop upgraded the same row to practised');
    assert.equal([...rows.values()][0].answer,draft,'the answer text survived the status change');

    /* 4. Back to the phone: the progress travelled with the account. */
    const phoneAgain=await device(browser,'phone-return',390,844);
    await phoneAgain.page.waitForFunction(()=>document.getElementById('qaMark').textContent==='✓',undefined,{timeout:15000});
    assert.match(await phoneAgain.page.locator('#progressDetail').textContent(),/Практика QA: 1\/14/,'phone shows the practice completed elsewhere');
    /* The account continues at the next unfinished subject of the same lesson. */
    assert.equal(await phoneAgain.page.locator('#englishTab').getAttribute('aria-pressed'),'true','phone opens the subject that is still missing');
    await phoneAgain.page.locator('#qaTab').click();
    assert.equal(await phoneAgain.page.locator('#answer').inputValue(),draft,'phone shows the cloud answer, not a stale local copy');
    assert.equal(rows.size,1,'no duplicate row was created by three devices');

    const seen=[phone,tablet,desktop,phoneAgain].flatMap(item=>item.errors);
    assert.deepEqual(seen,[],`page errors: ${seen.join(' | ')}`);
    assert.ok(!calls.some(call=>call.startsWith('tasks')),'the learning path never writes planner tasks directly');
    for(const item of [phone,tablet,desktop,phoneAgain])await item.context.close();
    console.log('PASS: phone draft -> tablet -> desktop practice -> phone, one cloud row, no lost text.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error.message||error);process.exitCode=1;});
