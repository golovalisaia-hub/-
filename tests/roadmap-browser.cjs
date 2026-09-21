/* Browser regression: read-only six-month route; no auth, API billing or SEVER writes. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT='http://127.0.0.1:4173/';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[],writes=[];
   page.on('pageerror',err=>errors.push(err.message));
   page.on('request',request=>{if(/supabase\.co|sever-planner/.test(request.url()))writes.push(request.url());});
   await page.goto(ROOT+'courses.html',{waitUntil:'domcontentloaded'});
   await page.locator('a[href="roadmap.html"]').waitFor();
   assert.match(await page.locator('a[href="roadmap.html"]').innerText(),/26 недель/);
   await page.locator('a[href="roadmap.html"]').click();
   await page.waitForURL('**/roadmap.html');
   await page.locator('#phase-1 .roadmap-week').first().waitFor();
   assert.equal(await page.locator('.roadmap-phase').count(),6,'Six stages, not a single endless lesson');
   assert.equal(await page.locator('.roadmap-week').count(),26,'All 26 weeks defined');
   assert.equal(await page.locator('.roadmap-sessions li').count(),130,'Five distinct planned sessions per week');
   assert.equal(await page.locator('.roadmap-status.available').count(),4,'Only four weeks link existing lessons');
   assert.equal(await page.locator('.roadmap-status.planned').count(),22,'Future weeks are explicitly planned, not published');
   assert.equal(await page.locator('#phase-1').getAttribute('open'),'','First stage opens without overwhelming the student');
   assert.equal(await page.locator('#phase-2').getAttribute('open'),null,'Other stages collapsed');
   assert.equal(await page.locator('#week-1 .roadmap-lesson-link').count(),6,'Actual QA and English pages linked');
   assert.equal(await page.locator('#week-5 .roadmap-lesson-link').count(),0,'Do not invent future lesson URLs');
   assert.match(await page.locator('#week-16').textContent(),/контрольная QA/i,'QA gate, not time based unlock');
   assert.match(await page.locator('#week-26').textContent(),/резерв/i,'Flexible review week');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,`Roadmap ${width}px horizontal overflow: ${overflow}`);
   await page.screenshot({path:`screenshots/${width}-six-month-roadmap.png`,fullPage:true,animations:'disabled'});
   await page.locator('#phase-5 summary').click();
   assert.equal(await page.locator('#phase-5').getAttribute('open'),'','Python stage opens on request');
   assert.match(await page.locator('#week-17').innerText(),/Python|print/i);
   assert.equal(await page.locator('#week-17 .roadmap-lesson-link').count(),0,'Preview Python does not masquerade as full lessons');
   assert.deepEqual(errors,[],`Roadmap ${width}px JS errors`);
   assert.deepEqual(writes,[],`Roadmap ${width}px made unexpected external requests`);
   console.log(`PASS roadmap ${width}px: 26 weeks, 130 planned sessions, no fabricated progress or pages`);
   await page.close();
  }
  const deeplink=await browser.newPage();await deeplink.goto(ROOT+'roadmap.html?week=19',{waitUntil:'domcontentloaded'});
  await deeplink.locator('#phase-5 .roadmap-week').first().waitFor();
  assert.equal(await deeplink.locator('#phase-5').getAttribute('open'),'','Week deep link opens correct phase');
  assert.equal(await deeplink.locator('#phase-1').getAttribute('open'),'','First phase remains available for review');
  console.log('PASS deep link opens requested phase without granting completion');await deeplink.close();
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
