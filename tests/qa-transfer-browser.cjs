/* Real browser flow for the independent QA transfer lab; no cloud or SEVER access. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:840}});
   const errors=[],external=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{if(/supabase\.co|sever-planner/.test(request.url()))external.push(request.url());});
   await page.goto('http://127.0.0.1:4173/qa-transfer.html',{waitUntil:'domcontentloaded'});
   await page.locator('#reportTitle').waitFor();
   assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=2,`No horizontal overflow at ${width}px`);
   assert.equal(await page.locator('#copy').isDisabled(),true);
   async function run(amount,member){
    await page.locator('#amount').fill(String(amount));
    if(member)await page.locator('#member').check();else await page.locator('#member').uncheck();
    await page.locator('#orderForm button').click();
   }
   async function report(id,expected,actual){
    await page.locator('#evidencePick').selectOption(String(id));
    await page.locator('#steps').fill('Открыть расчёт доставки, указать сумму и подписку, нажать кнопку расчёта и записать ответ.');
    await page.locator('#expected').selectOption(expected);
    await page.locator('#actual').selectOption(actual);
    await page.locator('#reportForm button[type="submit"]').click();
   }
   await run(999,false);
   assert.match(await page.locator('#appResult').textContent(),/150 ₽/);
   await report(1,'fee','fee');
   assert.match(await page.locator('#reportFeedback').textContent(),/не дефект/);
   assert.equal(await page.locator('#copy').isDisabled(),true);
   await run(1000,false);
   await report(2,'fee','fee');
   assert.match(await page.locator('#reportFeedback').textContent(),/Ожидаемый результат не соответствует/);
   await report(2,'free','fee');
   assert.match(await page.locator('#reportFeedback').textContent(),/Расхождение воспроизведено/);
   assert.equal(await page.locator('#copy').isEnabled(),true);
   await page.locator('#actual').selectOption('free');
   assert.equal(await page.locator('#copy').isDisabled(),true,'Changing evidence invalidates export');
   await run(500,true);
   await report(3,'free','fee');
   assert.match(await page.locator('#progress').textContent(),/2 из 2/);
   await run(1001,false);
   await run(499,true);
   await run(501,true);
   await run(-1,false);
   assert.match(await page.locator('#coverage').textContent(),/7 из 7/);
   assert.deepEqual(errors,[],`No JavaScript errors at ${width}px`);
   assert.deepEqual(external,[],`Never access cloud or planner at ${width}px`);
   page.once('dialog',dialog=>dialog.accept());await page.locator('#restart').click();
   assert.match(await page.locator('#progress').textContent(),/0 из 2/);
   assert.equal(await page.locator('#copy').isDisabled(),true);
   await page.close();
   console.log(`PASS: ${width}px: observable defects, correct report validation, full coverage, safe reset, no external writes`);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
