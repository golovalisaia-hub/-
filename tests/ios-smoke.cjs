/* Public site smoke with WebKit (Safari engine). Guest only: never signs in or writes cloud records. */
const assert=require('node:assert/strict');
const {webkit,devices}=require('playwright');
const ORIGIN='https://golovalisaia-hub.github.io/-/';
(async()=>{
  const browser=await webkit.launch({headless:true});
  try{
    for(const preset of [
      {name:'iPhone 13',device:devices['iPhone 13']},
      {name:'small iPhone',device:{...devices['iPhone 13'],viewport:{width:320,height:690},screen:{width:320,height:690}}}
    ]){
      const context=await browser.newContext({...preset.device});
      const page=await context.newPage();
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      const response=await page.goto(ORIGIN,{waitUntil:'domcontentloaded',timeout:45000});
      assert.equal(response?.status(),200,`${preset.name}: public root`);
      await page.waitForURL(/studio\.html/,{timeout:20000});
      await page.waitForFunction(()=>document.querySelector('#topic')?.textContent!=='Тема урока'&&document.querySelector('#topic')?.textContent?.length>0,undefined,{timeout:25000});
      assert.equal(await page.locator('#heading').textContent(),'Урок 01 / 84');
      assert.ok(await page.locator('#tabPython').isVisible(),'Python tab visible');
      await page.locator('#tabEnglish').click();
      await page.locator('#qualityPanel').waitFor({timeout:10000});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
      assert.ok(overflow<=2,`${preset.name}: horizontal overflow ${overflow}px`);
      assert.deepEqual(errors,[],`${preset.name}: JS errors: ${errors.join(' | ')}`);
      console.log(`PASS: ${preset.name} WebKit public root redirect, lesson, English and responsive layout.`);
      await context.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
