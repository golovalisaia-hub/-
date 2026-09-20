/* Public, guest-only browser check. Never logs in or modifies user data. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const GUEST='window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})};';
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const config of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844},{name:'small-mobile',width:320,height:720}]){
      const page=await browser.newPage({viewport:{width:config.width,height:config.height},deviceScaleFactor:1});
      await page.route('**/@supabase/supabase-js@*/dist/umd/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:GUEST}));
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto('http://127.0.0.1:4173/studio.html',{waitUntil:'domcontentloaded'});
      await page.locator('#qualityPanel').waitFor({timeout:20000});
      assert.equal(await page.locator('#heading').textContent(),'Урок 01 / 84');
      assert.equal(await page.locator('#topic').count(),1);
      assert.equal(await page.locator('#academyCompanion').count(),1);
      const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
      assert.ok(horizontal<=2,`${config.name}: horizontal overflow ${horizontal}px`);
      await page.locator('#tabEnglish').click();
      await page.locator('.quiz-choices button').first().waitFor();
      for(let index=0;index<4;index++){
        const answer=await page.evaluate(i=>window.AcademyGuide.english(1).review[i].translation,index);
        await page.locator('.quiz-choices').getByRole('button',{name:answer,exact:true}).click();
      }
      assert.match(await page.locator('#qualityPanel').innerText(),/Повторение завершено/);
      await page.locator('#lessonSelect').selectOption('2');
      assert.equal(await page.locator('#heading').textContent(),'Урок 02 / 84');
      await page.locator('#tabQa').click();
      assert.match(await page.locator('#qualityPanel').innerText(),/ожидаемый результат/);
      assert.deepEqual(errors,[],`${config.name}: page errors ${errors.join('; ')}`);
      console.log(`PASS: ${config.name}: lesson navigation, revision quiz and layout`);
      await page.close();
    }
    const page=await browser.newPage();
    await page.route('**/@supabase/supabase-js@*/dist/umd/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:GUEST}));
    await page.goto('http://127.0.0.1:4173/studio.html',{waitUntil:'domcontentloaded'});
    await page.locator('#tabPython').click();
    await page.locator('#code').fill('print(1 + 2)');
    await page.locator('#answer').fill('Я складываю два числа и ожидаю, что программа выведет число три.');
    await page.locator('#run').click();
    await page.waitForFunction(()=>document.querySelector('#output').textContent.includes('Python загружен.')||document.querySelector('#output').textContent.includes('Не удалось загрузить Python'),undefined,{timeout:90000});
    assert.match(await page.locator('#output').textContent(),/Python загружен/,'Python worker needs to load.');
    await page.locator('#run').click();
    await page.waitForFunction(()=>document.querySelector('#output').textContent.trim()==='3',undefined,{timeout:25000});
    console.log('PASS: actual Pyodide runs print(1 + 2) in a worker.');
    await page.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
