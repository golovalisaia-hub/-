/* Disposable Chromium checks. Supabase is stubbed; real user data and SEVER are never modified. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT='http://127.0.0.1:4173/';
const GUEST='window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})};';
const OWNER=`(()=>{
 const user={id:'overview-test-owner'};
 const rows=[
  {user_id:user.id,track:'qa_foundation',lesson_number:1,status:'practiced',answer:'Пример для QA',quiz_score:2},
  {user_id:user.id,track:'english_foundation',lesson_number:1,status:'practiced',answer:'Example English',quiz_score:2},
  {user_id:user.id,track:'qa_foundation',lesson_number:2,status:'draft',answer:'Незавершённый черновик',quiz_score:0}
 ];
 const from=table=>{
  let filters=[];
  const query={select(){return query;},eq(k,v){filters.push([k,v]);return query;},limit(){return query;},single(){return Promise.resolve(table==='profiles'?{data:{role:'owner'},error:null}:{data:null,error:{message:'unexpected single'}});},then(ok,fail){if(table!=='academy_path_progress')return Promise.resolve({data:null,error:{message:'Unexpected table '+table}}).then(ok,fail);return Promise.resolve({data:rows.filter(row=>filters.every(([k,v])=>row[k]===v)),error:null}).then(ok,fail);}};
  return query;
 };
 window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user},error:null})},from})};
})();`;
async function stub(page,source){await page.route('**/vendor/supabase.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:source}));}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,834,390,320]){
   const page=await browser.newPage({viewport:{width,height:820}}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));await stub(page,GUEST);
   await page.goto(ROOT,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('Гостевой'));
   assert.equal(await page.locator('#mapTitle').textContent(),'Твой путь в IT');
   assert.equal(await page.locator('#percent').textContent(),'—','Never fabricate guest progress');
   assert.equal(await page.locator('.module-card').count(),2,'Only two real current modules');
   assert.equal(await page.locator('#weekOneLessons').isHidden(),true,'Lesson list starts collapsed');
   assert.equal(await page.locator('.nav-links a').nth(1).getAttribute('href'),'courses.html','Subject catalogue must be the real link, not click-only rerouting');
   await page.locator('.module-card').first().getByRole('button',{name:'Уроки'}).click();
   assert.equal(await page.locator('#weekOneLessons a').count(),7);
   await page.waitForFunction(()=>document.querySelector('#weekOneLessons a')?.getAttribute('href')?.includes('flow=1'));
   assert.equal(await page.locator('#weekOneLessons a').first().getAttribute('href'),'path.html?lesson=1&subject=qa&flow=1');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,`Dashboard ${width}px horizontal overflow: ${overflow}`);
   if(width<=390)assert.equal(await page.locator('.mobile-nav a').count(),4);
   assert.deepEqual(errors,[],`Dashboard ${width}px page errors: ${errors.join('; ')}`);
   console.log(`PASS: dashboard subject routing and responsive layout at ${width}px`);
   await page.close();
  }
  const owner=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  owner.on('pageerror',error=>errors.push(error.message));await stub(owner,OWNER);await owner.goto(ROOT,{waitUntil:'domcontentloaded'});
  await owner.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('Облачный прогресс загружен'));
  assert.equal(await owner.locator('#percent').textContent(),'7%');
  assert.equal(await owner.locator('#weekOneCount').textContent(),'1 / 7 уроков');
  assert.equal(await owner.locator('#currentHeading').textContent(),'Урок 02 / 14');
  assert.equal(await owner.locator('#currentQa').textContent(),'Черновик');
  assert.equal(await owner.locator('#qaProgress').textContent(),'1 / 14');
  assert.equal(await owner.locator('#englishProgress').textContent(),'1 / 14');
  await owner.waitForFunction(()=>document.querySelector('#heroContinue').getAttribute('href')?.includes('flow=1'));
  assert.equal(await owner.locator('#heroContinue').getAttribute('href'),'path.html?lesson=2&subject=qa&flow=1');
  await owner.locator('.module-card').nth(1).getByRole('button',{name:'Уроки'}).click();
  assert.equal(await owner.locator('#weekTwoLessons a').count(),7);
  await owner.locator('#weekTwoLessons a').nth(2).click();
  await owner.waitForURL('**/path.html?lesson=10&subject=qa&flow=1');
  await owner.locator('body.guided-lesson #flowTitle').waitFor();
  await owner.waitForFunction(()=>document.querySelector('#lessonNumber').textContent==='10',undefined,{timeout:10000});
  assert.equal(await owner.locator('#lessonSelect').inputValue(),'10');
  assert.equal(await owner.locator('#qaTab').getAttribute('aria-pressed'),'true');
  assert.equal(await owner.locator('.subject-tabs').isVisible(),false,'QA lesson must not mix English on the same screen');
  assert.deepEqual(errors,[],`Owner navigation errors: ${errors.join('; ')}`);
  console.log('PASS: cloud progress and draft, dashboard lesson 10 opens guided QA without mixing subjects');
  await owner.close();
  const direct=await browser.newPage({viewport:{width:320,height:720}});await stub(direct,GUEST);
  await direct.goto(ROOT+'path.html?lesson=11&subject=english&flow=1',{waitUntil:'domcontentloaded'});
  await direct.waitForFunction(()=>document.querySelector('#lessonNumber').textContent==='11');
  await direct.locator('body.guided-lesson #flowTitle').waitFor();
  assert.equal(await direct.locator('#englishTab').getAttribute('aria-pressed'),'true');
  const lessonOverflow=await direct.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(lessonOverflow<=2,`Deep linked mobile lesson overflow ${lessonOverflow}px`);
  console.log('PASS: guest English deep link and 320px focused lesson layout');
  await direct.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
