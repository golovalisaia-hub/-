/* Reproducible visual audit. No real accounts, provider calls, private notes or cloud writes. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT='http://127.0.0.1:4173/';
const GUEST='window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null}),getSession:async()=>({data:{session:null},error:null})}})};';
const OWNER='window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:"visual-test-token"}},error:null}),getUser:async()=>({data:{user:{id:"visual-test-user"}},error:null})}})};';
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
   const tutor=await browser.newPage({viewport:{width:config.width,height:config.height},deviceScaleFactor:1});
   await tutor.route('**/vendor/supabase.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:GUEST}));
   await tutor.goto(ROOT+'ai.html?subject=qa&lesson=6',{waitUntil:'domcontentloaded'});
   await tutor.locator('#aiStatus').getByText(/Войди на главной Academy/).waitFor({timeout:15000});
   await tutor.screenshot({path:`screenshots/${config.name}-ai-guest.png`,fullPage:true,animations:'disabled'});
   assert.ok(await tutor.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2,`${config.name}/ai-guest: overflow`);
   await tutor.close();
   const owner=await browser.newPage({viewport:{width:config.width,height:config.height},deviceScaleFactor:1});
   await owner.route('**/vendor/supabase.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:OWNER}));
   await owner.route('**/functions/v1/academy-tutor',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(route.request().method()==='GET'?{configured:true,model:'visual-mock',dailyLimit:30}:{reply:'В твоём описании пока нет последовательности шагов и фактического результата. Добавь сначала точные шаги воспроизведения: что нажал и что увидел?',model:'visual-mock'})}));
   await owner.goto(ROOT+'ai.html?subject=qa&lesson=6',{waitUntil:'domcontentloaded'});
   await owner.locator('#aiStatus').getByText(/Наставник подключён/).waitFor({timeout:15000});
   await owner.locator('button[data-mode="review"]').click();
   await owner.locator('#question').fill('Кнопка входа не работает. Ожидаю, что она откроет личный кабинет.');
   await owner.locator('#send').click();
   await owner.locator('.chat-message.assistant').getByText(/В твоём описании/).waitFor({timeout:15000});
   await owner.screenshot({path:`screenshots/${config.name}-ai-owner-mock.png`,fullPage:true,animations:'disabled'});
   assert.ok(await owner.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2,`${config.name}/ai-owner: overflow`);
   await owner.close();
   console.log(`PASS: guest and mocked tutor screenshots and overflow at ${config.width}px`);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
