/* Browser tests use a disposable in-browser Supabase stub; never write real user data. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:4173/path.html';
const GUEST='window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})};';
const OWNER=`(()=>{
 const user={id:'qa-first-test-owner'};
 const read=()=>JSON.parse(sessionStorage.getItem('__test_path_rows')||'[]');
 const write=rows=>sessionStorage.setItem('__test_path_rows',JSON.stringify(rows));
 window.__testPathWrites=[];
 function from(table){
  let kind='read',payload=null,filters=[];
  const query={
   select(){return query;},eq(k,v){filters.push([k,v]);return query;},limit(){return query;},
   upsert(p){kind='upsert';payload=p;return query;},
   single(){return kind==='upsert'?new Promise(resolve=>setTimeout(()=>resolve(run(true)),250)):Promise.resolve(run(true));},
   then(ok,fail){return Promise.resolve(run(false)).then(ok,fail);}
  };
  function run(single){
   if(table==='profiles')return{data:single?{role:'owner'}:[{role:'owner'}],error:null};
   if(table!=='academy_path_progress')return{data:null,error:{message:'Unexpected table '+table}};
   let rows=read().filter(r=>filters.every(([k,v])=>r[k]===v));
   if(kind==='upsert'){
    const all=read();const index=all.findIndex(r=>r.user_id===payload.user_id&&r.track===payload.track&&r.lesson_number===payload.lesson_number);
    if(index<0)all.push({...payload});else all[index]={...payload};
    write(all);window.__testPathWrites.push({table,track:payload.track,lesson:payload.lesson_number,status:payload.status});rows=[payload];
   }
   return{data:single?(rows[0]||null):rows,error:null};
  }
  return query;
 }
 window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user},error:null}),signInWithPassword:async()=>({data:{user},error:null}),signOut:async()=>({error:null})},from})};
})();`;
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,834,390,320]){
   const page=await browser.newPage({viewport:{width,height:820}}),errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   await page.route('**/vendor/supabase.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:GUEST}));
   await page.goto(BASE,{waitUntil:'domcontentloaded'});
   await page.locator('#topic').getByText('Кто такой тестировщик?').waitFor();
   assert.equal(await page.locator('#qaTab').isVisible(),true);
   assert.equal(await page.locator('#englishTab').isVisible(),true);
   assert.equal(await page.locator('#answer').isDisabled(),true,'Guest cannot write answers that would be lost on login');
   assert.equal(await page.locator('#save').isDisabled(),true,'Guest cannot save');
   assert.equal(await page.locator('#complete').isDisabled(),true,'Guest cannot mark practiced');
   await page.locator('#englishTab').click();
   assert.equal(await page.locator('#topic').textContent(),'Hello! Первое знакомство');
   assert.equal(await page.locator('.question').count(),2);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,`Width ${width}: horizontal overflow ${overflow}px`);
   assert.deepEqual(errors,[],`Width ${width}: ${errors.join('; ')}`);
   console.log(`PASS: QA-first guest, English and responsive ${width}px`);
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.route('**/vendor/supabase.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:OWNER}));
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('Вход подтверждён'));
  assert.equal(await page.locator('#lessonTitle').textContent(),'Кто такой тестировщик?');
  assert.equal(await page.locator('#englishTab').isEnabled(),true,'Navigation unlocks after cloud load');
  const qaAnswer='Проверю требование сохранения заметки: введу тестовое название, нажму сохранить, обновлю страницу и сопоставлю ожидаемый результат с фактическим.';
  await page.locator('#answer').fill(qaAnswer);
  await page.locator('#save').click();
  await page.waitForFunction(()=>document.querySelector('#feedback').textContent.includes('Сохраняем'));
  assert.equal(await page.locator('#answer').isDisabled(),true,'No editing while a snapshot is being saved');
  assert.equal(await page.locator('#englishTab').isDisabled(),true,'No switching subjects during save');
  assert.equal(await page.locator('#lessonSelect').isDisabled(),true,'No switching lessons during save');
  await page.waitForFunction(()=>document.querySelector('#feedback').textContent.includes('Черновик сохранён'));
  assert.equal(await page.locator('#answer').isEnabled(),true,'Editing resumes after confirmed save');
  assert.equal(await page.locator('#englishTab').isEnabled(),true,'Subject navigation resumes after save');
  assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('__test_path_rows'))[0].status),'draft');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('Вход подтверждён'));
  assert.equal(await page.locator('#answer').inputValue(),qaAnswer,'QA draft restored from cloud');
  const secondDraft='Другой несохранённый текст на этом устройстве для проверки конфликта с облаком.';
  await page.locator('#answer').fill(secondDraft);
  await page.locator('#englishTab').click();await page.locator('#qaTab').click();
  assert.equal(await page.locator('#draftNotice').isVisible(),true,'Different browser draft is clearly warned about');
  assert.equal(await page.locator('#answer').inputValue(),secondDraft,'Local draft remains accessible for comparison');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#useCloud').click();
  assert.equal(await page.locator('#answer').inputValue(),qaAnswer,'Cloud recovery restores previously confirmed answer');
  assert.equal(await page.locator('#draftNotice').isHidden(),true,'Conflict banner clears after explicit recovery');
  console.log('PASS: save locks, cloud confirmation, draft reload, local/cloud conflict alert and explicit recovery.');
  await page.getByRole('button',{name:'Получить информацию о качестве и рисках'}).click();
  await page.getByRole('button',{name:'Тестировщик',exact:true}).click();
  await page.locator('#complete').click();
  assert.match(await page.locator('#feedback').textContent(),/критерии/i,'Cannot mark without self-review');
  await page.locator('#criteriaBox summary').click();await page.locator('#reviewed').check();
  await page.locator('#complete').click();
  await page.waitForFunction(()=>document.querySelector('#qaMark').textContent.includes('✓'));
  assert.equal(await page.locator('#progressNumber').textContent(),'0 / 14','QA alone cannot finish the lesson');
  await page.locator('#englishTab').click();
  await page.getByRole('button',{name:'Hello',exact:true}).click();
  await page.getByRole('button',{name:'Меня зовут...',exact:true}).click();
  await page.locator('#answer').fill('Hello! My name is Alex. I am a student.');
  await page.locator('#criteriaBox summary').click();await page.locator('#reviewed').check();
  await page.locator('#complete').click();
  await page.waitForFunction(()=>document.querySelector('#progressNumber').textContent==='1 / 14');
  assert.equal(await page.locator('#continue').isVisible(),true);
  await page.locator('#continue').click();
  assert.equal(await page.locator('#lessonNumber').textContent(),'02');
  const rows=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('__test_path_rows')));
  assert.equal(rows.length,2);
  assert.ok(rows.every(row=>row.status==='practiced'));
  assert.deepEqual(errors,[],'No uncaught page errors');
  console.log('PASS: independent QA and English evidence, self-review gate, next lesson and zero planner writes.');
  await page.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
