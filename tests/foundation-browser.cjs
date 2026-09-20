/* Tests all 7 x 3 beginner bridges using a guest session; no real cloud writes. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const GUEST='window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})};';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,834,390,320]){
   const page=await browser.newPage({viewport:{width,height:820}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/@supabase/supabase-js@*/dist/umd/supabase.min.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:GUEST}));
   await page.goto('http://127.0.0.1:4173/studio.html',{waitUntil:'domcontentloaded'});
   await page.locator('#foundationPanel').waitFor({state:'visible',timeout:12000});
   for(let n=1;n<=7;n++){
    await page.locator('#lessonSelect').selectOption(String(n));
    for(const id of ['tabQa','tabPython','tabEnglish']){
     await page.locator('#'+id).click();
     await page.locator('#foundationPanel').waitFor({state:'visible'});
     assert.match(await page.locator('#foundationPanel').textContent(),new RegExp(`УРОК ${n}/7`));
     assert.equal(await page.locator('#foundationPanel .foundation-option').count(),3,`${width}px day ${n} ${id}: three options`);
     await page.locator('#foundationPanel .foundation-option').first().click();
     assert.ok((await page.locator('#foundationPanel .foundation-feedback').textContent()).length>5,'Answer must produce feedback');
    }
   }
   await page.locator('#lessonSelect').selectOption('8');
   assert.equal(await page.locator('#foundationPanel').isHidden(),true,'First-week content must not be mislabeled for day 8');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,`${width}px horizontal overflow: ${overflow}px`);
   assert.deepEqual(errors,[],`${width}px JS errors: ${errors.join(' / ')}`);
   console.log(`PASS: beginner QA, Python, English days 1–7; feedback and responsive ${width}px.`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
