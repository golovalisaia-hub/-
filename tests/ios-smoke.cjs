/* Published Academy WebKit smoke. Guest only: no login or private database writes. */
const assert=require('node:assert/strict');
const {webkit,devices}=require('playwright');
const ORIGIN='https://golovalisaia-hub.github.io/-/';
(async()=>{
 const browser=await webkit.launch({headless:true});
 try{
  for(const preset of [
   {name:'iPhone 13',device:devices['iPhone 13']},
   {name:'small iPhone',device:{...devices['iPhone 13'],viewport:{width:320,height:690},screen:{width:320,height:690}}},
   {name:'iPad Air portrait',device:{...devices['iPad (gen 7)'],viewport:{width:834,height:1194},screen:{width:834,height:1194}}}
  ]){
   const context=await browser.newContext({...preset.device});
   const page=await context.newPage();const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   const response=await page.goto(ORIGIN,{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(response?.status(),200,`${preset.name}: public root`);
   await page.waitForURL(/path\.html/,{timeout:20000});
   await page.waitForFunction(()=>document.querySelector('#topic')?.textContent?.length>0,undefined,{timeout:25000});
   assert.equal(await page.locator('#lessonTitle').textContent(),'Кто такой тестировщик?');
   assert.equal(await page.locator('#qaTab').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#englishTab').isVisible(),true);
   assert.equal(await page.locator('#qaTab').isVisible(),true);
   assert.equal(await page.locator('#save').isDisabled(),true,'Guest must not write cloud progress');
   await page.locator('#englishTab').click();
   assert.equal(await page.locator('#topic').textContent(),'Hello! Первое знакомство');
   assert.equal(await page.locator('.question').count(),2);
   await page.locator('#next').click();
   assert.equal(await page.locator('#lessonNumber').textContent(),'02');
   assert.equal(await page.locator('#topic').textContent(),'Буквы и звуки');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,`${preset.name}: horizontal overflow ${overflow}px`);
   assert.deepEqual(errors,[],`${preset.name}: JS errors: ${errors.join(' | ')}`);
   console.log(`PASS: ${preset.name}: published QA-first root, English lesson, cloud guest protection and responsive layout.`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
