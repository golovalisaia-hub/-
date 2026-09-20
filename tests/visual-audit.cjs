/* Reproducible visual audit. Guest-only: no real accounts, writes or private notes. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT='http://127.0.0.1:4173/';
const GUEST='window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})};';
(async()=>{
 fs.mkdirSync('screenshots',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  for(const config of [{name:'desktop',width:1440,height:900},{name:'tablet',width:834,height:1194},{name:'phone',width:390,height:844},{name:'small-phone',width:320,height:720}]){
   const page=await browser.newPage({viewport:{width:config.width,height:config.height},deviceScaleFactor:1});
   await page.route('**/vendor/supabase.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:GUEST}));
   await page.route('**/@supabase/supabase-js@*/dist/umd/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:GUEST}));
   for(const [route,name,statusSelector] of [
    ['', 'overview','#cloudStatus'],
    ['path.html?lesson=1&subject=qa','lesson-qa','#cloudStatus'],
    ['path.html?lesson=1&subject=english','lesson-english','#cloudStatus'],
    ['library.html','library','#cloudStatus']
   ]){
    await page.goto(ROOT+route,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(selector=>{const el=document.querySelector(selector);return el&&(/Гостевой|Войди в Academy/.test(el.textContent));},statusSelector,{timeout:15000});
    await page.screenshot({path:`screenshots/${config.name}-${name}.png`,fullPage:true,animations:'disabled'});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(overflow<=2,`${config.name}/${name}: horizontal overflow ${overflow}px`);
   }
   await page.close();
   console.log(`PASS: guest screenshots and overflow at ${config.width}px`);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
