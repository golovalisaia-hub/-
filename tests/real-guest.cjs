/* Actual locally vendored auth SDK, clean anonymous browser session, no credentials or writes. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/cdn.jsdelivr.net/**',route=>route.abort());
  for(const [route,expected] of [['','Гостевой просмотр'],['path.html?lesson=3&subject=english','Гостевой просмотр'],['library.html','Войди в Academy']]){
   await page.goto('http://127.0.0.1:4173/'+route,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(text=>document.querySelector('#cloudStatus')?.textContent.includes(text),expected,{timeout:15000});
   assert.equal(await page.evaluate(()=>typeof window.supabase?.createClient),'function');
   if(route.startsWith('path.html')){
    assert.equal(await page.locator('#lessonNumber').textContent(),'03');
    assert.equal(await page.locator('#englishTab').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#complete').isDisabled(),true);
   }
   if(route==='library.html')assert.equal(await page.locator('#save').isDisabled(),true);
   console.log(`PASS: actual SDK anonymous state at /${route||' (overview)'}`);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
