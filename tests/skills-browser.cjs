/* Workshop integration: original exercises, real Pyodide execution, no cloud writes. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
for(const width of [1440,834,390,320]){
 const page=await browser.newPage({viewport:{width,height:850}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',request=>{if(/supabase\.co|sever-planner/.test(request.url()))external.push(request.url());});
 await page.goto('http://127.0.0.1:4173/skills.html',{waitUntil:'domcontentloaded'});
 await page.locator('#englishTopic').waitFor();
 assert.equal(await page.locator('#englishPick option').count(),4);
 assert.equal(await page.locator('#pythonPick option').count(),4);
 assert.equal(await page.locator('.intro-card').count(),3);
 assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=2,`skills overflow ${width}px`);
 await page.locator('#englishAnswer').fill('I am a tester');await page.locator('#englishCheck').click();
 assert.equal(await page.locator('#englishTransfer').isVisible(),true);
 await page.locator('#englishSecond').fill('I am a student');await page.locator('#englishTransferCheck').click();
 assert.match(await page.locator('#englishCount').textContent(),/1 \/ 4/);
 await page.locator('#englishNext').click();
 assert.equal(await page.locator('#englishTransferCheck').isDisabled(),false,'transfer button must reset for next theme');
 await page.locator('#englishAnswer').fill('There is a bug');await page.locator('#englishCheck').click();
 await page.locator('#englishSecond').fill('There are two bugs');await page.locator('#englishTransferCheck').click();
 assert.match(await page.locator('#englishCount').textContent(),/2 \/ 4/);
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#englishTopic').waitFor();
 assert.match(await page.locator('#englishCount').textContent(),/2 \/ 4/);
 assert.deepEqual(errors,[],`script errors at ${width}px`);assert.deepEqual(external,[],`workshop must not use cloud or SEVER at ${width}px`);
 if(width===1440){
  await page.locator('#pythonRun').click();
  await page.waitForFunction(()=>document.querySelector('#pythonStatus')?.textContent.includes('Пройдено 0 из 4'),{timeout:60000});
  await page.locator('#pythonEditor').fill('def clean_title(title):\n    return title.strip()');
  await page.locator('#pythonRun').click();
  await page.waitForFunction(()=>document.querySelector('#pythonStatus')?.textContent.includes('4/4'),{timeout:60000});
  assert.match(await page.locator('#pythonCount').textContent(),/1 \/ 4/);
  await page.locator('#pythonNext').click();
  assert.equal(await page.locator('#pythonHint').isDisabled(),false,'hint button must reset');
  await page.locator('#pythonHint').click();
  await page.locator('#pythonEditor').fill('def valid_title(title):\n    return 1 <= len(title.strip()) <= 20');
  await page.locator('#pythonRun').click();
  await page.waitForFunction(()=>document.querySelector('#pythonStatus')?.textContent.includes('6/6'),{timeout:60000});
  assert.match(await page.locator('#pythonCount').textContent(),/1 \/ 4/,'hinted code must not count as independent');
  await page.locator('#pythonPick').selectOption('0');await page.locator('#pythonPick').selectOption('1');
  assert.equal(await page.locator('#pythonHint').isDisabled(),false);
  await page.locator('#pythonEditor').fill('def valid_title(title):\n    return 1 <= len(title.strip()) <= 20');
  await page.locator('#pythonRun').click();
  await page.waitForFunction(()=>document.querySelector('#pythonStatus')?.textContent.includes('6/6'),{timeout:60000});
  assert.match(await page.locator('#pythonCount').textContent(),/2 \/ 4/);
  console.log('PASS: genuine Python execution covers incorrect, boundary, hinted and independent solutions.');
 }
 console.log(`PASS: workshop ${width}px, English transfer, navigation, local progress, privacy and no overflow.`);await page.close();
}
const home=await browser.newPage();await home.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});assert.equal(await home.locator('#skillsLink').getAttribute('href'),'skills.html');await home.close();console.log('PASS: workshop reachable from main Academy dashboard.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});