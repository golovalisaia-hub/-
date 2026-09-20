/* Real Chromium, local-only teaching simulator. No Supabase credentials or writes. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:840}});
   const errors=[],outside=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{if(/supabase\.co|sever-planner/.test(request.url()))outside.push(request.url());});
   await page.goto('http://127.0.0.1:4173/sandbox.html',{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('#reportHeading').textContent(),'Опиши ОДНУ обнаруженную проблему');
   assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=2,`QA lab overflow at ${width}px`);
   assert.match(await page.locator('#evidence').textContent(),/0 из 2/);
   // A guessed or copied report is not enough without an observed event.
   await page.locator('#defect').selectOption('boundary');
   await page.locator('#steps').fill('Создать заметку с заголовком из двадцати одного символа, нажать сохранить.');
   await page.locator('#expected').fill('Система должна отказать, максимальная длина двадцать символов.');
   await page.locator('#actual').fill('Заметка с двадцать одним символом неожиданно сохранилась.');
   await page.locator('#check').click();
   assert.match(await page.locator('#reportFeedback').textContent(),/Нет воспроизведения/);
   assert.equal(await page.locator('#reference').isHidden(),true);
   assert.equal(await page.locator('#copy').isDisabled(),true);
   // Boundary failure is observable only by interacting with the simulator.
   await page.locator('#noteTitle').fill('x'.repeat(22));await page.locator('#noteForm button').click();
   assert.match(await page.locator('#appMessage').textContent(),/Не удалось/);
   await page.locator('#noteTitle').fill('x'.repeat(21));await page.locator('#noteForm button').click();
   assert.match(await page.locator('#evidence').textContent(),/1 из 2/);
   await page.locator('#check').click();
   assert.match(await page.locator('#reportFeedback').textContent(),/Симулятор подтвердил/);
   assert.equal(await page.locator('#reference').isVisible(),true);
   assert.equal(await page.locator('#copy').isDisabled(),true);
   await page.locator('#reviewed').check();
   assert.equal(await page.locator('#copy').isEnabled(),true);
   // Editing invalidates the comparison and requires another self-check.
   await page.locator('#actual').fill('После нажатия кнопки заметка появилась в списке и не была отклонена.');
   assert.equal(await page.locator('#reference').isHidden(),true);
   assert.equal(await page.locator('#copy').isDisabled(),true);
   // A fresh run must re-establish evidence; the report text is preserved.
   page.once('dialog',dialog=>dialog.accept());await page.locator('#reset').click();
   assert.match(await page.locator('#evidence').textContent(),/0 из 2/);
   assert.ok((await page.locator('#steps').inputValue()).length>20);
   await page.locator('#noteTitle').fill('Тестовая заметка');await page.locator('#noteForm button').click();
   await page.locator('#notes button').click();
   assert.match(await page.locator('#notes').textContent(),/Пока заметок нет/);
   await page.locator('#reload').click();
   assert.match(await page.locator('#notes').textContent(),/Тестовая заметка/);
   assert.match(await page.locator('#evidence').textContent(),/1 из 2/);
   await page.locator('#defect').selectOption('delete');
   await page.locator('#check').click();
   assert.equal(await page.locator('#reference').isVisible(),true);
   assert.deepEqual(errors,[],`QA lab errors at ${width}px`);
   assert.deepEqual(outside,[],`QA lab must not access real cloud at ${width}px`);
   await page.close();
   console.log(`PASS: ${width}px: real defect observations, no fake credit, report review and responsive layout`);
  }
  const page=await browser.newPage();
  await page.route('**/vendor/supabase.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})};'}));
  await page.goto('http://127.0.0.1:4173/path.html',{waitUntil:'domcontentloaded'});
  await page.locator('#sandboxLink').waitFor();
  assert.equal(await page.locator('#sandboxLink').getAttribute('href'),'sandbox.html');
  console.log('PASS: QA lab is linked from the existing lesson without changing progress or SEVER.');
  await page.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
