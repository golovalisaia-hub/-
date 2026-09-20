/* Real Chromium: a tutor must not award cloud credit, reveal answers early or send notes away. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:4173/';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,834,390,320]){
   const context=await browser.newContext({viewport:{width,height:850}});
   const page=await context.newPage(),errors=[],outside=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',req=>{if(/supabase\.co|sever-planner|api\.openai\.com/.test(req.url()))outside.push(req.url());});
   await page.goto(BASE+'mentor.html?lesson=1',{waitUntil:'domcontentloaded'});
   assert.match(await page.locator('#exerciseTitle').textContent(),/тестировщик/i);
   assert.equal(await page.locator('#attemptCount').textContent(),'0');
   assert.equal(await page.locator('#check').isDisabled(),true,'no answer selected');
   assert.equal(await page.locator('#result').isHidden(),true,'answers hidden until attempt');
   assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=2,`mentor overflow at ${width}`);
   const correct=await page.evaluate(()=>window.AcademyAssessment.qa[0].cases[0][2]);
   const wrong=(correct+1)%3;
   await page.locator('#reason').fill('Я пытаюсь объяснить выбор собственными словами; эта строка не должна сохраняться в браузере.');
   await page.locator('#choices .choice').nth(wrong).click();await page.locator('#check').click();
   assert.match(await page.locator('#result').textContent(),/Пока неверно/);
   assert.match(await page.locator('#result').textContent(),/Проверяемый ответ/);
   assert.equal(await page.locator('#attemptCount').textContent(),'1');
   const raw=await page.evaluate(()=>localStorage.getItem('academy-qa-review-v1'));
   assert.ok(raw&&raw.includes('"attempts":1'),'review state was saved on this device');
   assert.ok(!raw.includes('объяснить выбор'),'free-text explanation is not persisted');
   assert.equal(await page.locator('#dueButton').isDisabled(),true,'future review not falsely due now');
   await page.reload({waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('#attemptCount').textContent(),'1','reload restores state');
   assert.match(await page.locator('#cardBadge').textContent(),/2 \/ 3/,'next card, not immediate repetition of same answer');
   await page.locator('#lessonPick').selectOption('2');
   await page.locator('#hint').click();assert.equal(await page.locator('#hintBox').isVisible(),true);
   const supportedCorrect=await page.evaluate(()=>window.AcademyAssessment.qa[1].cases[0][2]);
   await page.locator('#choices .choice').nth(supportedCorrect).click();await page.locator('#check').click();
   assert.match(await page.locator('#result').textContent(),/Верно с подсказкой/);
   let store=JSON.parse(await page.evaluate(()=>localStorage.getItem('academy-qa-review-v1')));
   assert.equal(store.topics['2'].streak,0,'hint never claims independent recall');
   await page.locator('#lessonPick').selectOption('3');
   const soloCorrect=await page.evaluate(()=>window.AcademyAssessment.qa[2].cases[0][2]);
   await page.locator('#choices .choice').nth(soloCorrect).click();await page.locator('#check').click();
   assert.match(await page.locator('#result').textContent(),/Самостоятельный ответ верный/);
   store=JSON.parse(await page.evaluate(()=>localStorage.getItem('academy-qa-review-v1')));
   assert.equal(store.topics['3'].streak,1,'first independent answer counts once');
   await page.locator('#lessonPick').selectOption('1');await page.locator('#lessonPick').selectOption('3');
   const secondCorrect=await page.evaluate(()=>window.AcademyAssessment.qa[2].cases[1][2]);
   await page.locator('#choices .choice').nth(secondCorrect).click();await page.locator('#check').click();
   store=JSON.parse(await page.evaluate(()=>localStorage.getItem('academy-qa-review-v1')));
   assert.equal(store.topics['3'].streak,1,'same-day drilling cannot skip spaced review');
   assert.deepEqual(errors,[],`JS errors at ${width}`);
   assert.deepEqual(outside,[],`coach must not send anything to cloud or SEVER at ${width}`);
   await context.close();
   console.log(`PASS: ${width}px adaptive tutor, evidence, persisted scheduling, no fake results or remote calls`);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
