/* Real Chromium guest-only checks; never authenticates or modifies real user data. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const GUEST='window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})};';
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const config of [{name:'desktop',width:1440,height:900},{name:'tablet',width:834,height:1194},{name:'mobile',width:390,height:844},{name:'small-mobile',width:320,height:720}]){
      const page=await browser.newPage({viewport:{width:config.width,height:config.height},deviceScaleFactor:1});
      await page.route('**/@supabase/supabase-js@*/dist/umd/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:GUEST}));
      await page.route('**/vendor/supabase.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:GUEST}));
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto('http://127.0.0.1:4173/studio.html',{waitUntil:'domcontentloaded'});
      await page.locator('#qualityPanel').waitFor({timeout:20000});
      await page.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue('--a-accent').trim()==='#b8f08e',undefined,{timeout:15000});
      assert.equal(await page.locator('#heading').textContent(),'Урок 01 / 84');
      assert.equal(await page.locator('#topic').count(),1);
      assert.equal(await page.locator('#academyCompanion').count(),1);
      const links=page.locator('.rail-bottom a');
      assert.equal(await links.count(),3,`${config.name}: expected new-course, books, calendar links`);
      assert.equal(await links.first().getAttribute('href'),'path.html',`${config.name}: archived course must link to current lessons`);
      assert.equal(await links.nth(1).getAttribute('href'),'library.html');
      assert.equal(await links.nth(2).getAttribute('href'),'https://golovalisaia-hub.github.io/sever-planner/');
      const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
      assert.ok(horizontal<=2,`${config.name}: horizontal overflow ${horizontal}px`);
      const compact=config.width<=1024;
      assert.equal(await page.locator('#railExtra').isHidden(),compact,`${config.name}: progress block starts collapsed only below the sidebar breakpoint`);
      assert.equal(await page.locator('#resume').isVisible(),true,`${config.name}: resume button stays reachable`);
      assert.equal(await page.locator('#lessonSelect').isVisible(),true,`${config.name}: lesson picker stays reachable`);
      assert.equal(await links.first().isVisible(),true,`${config.name}: collapsing the rail must never hide the navigation`);
      if(config.width<=600){
        const nav=await links.first().evaluate(el=>getComputedStyle(el.closest('.rail-bottom')).position);
        assert.equal(nav,'static',`${config.name}: archived navigation stays in the page instead of covering exercises`);
      }
      if(compact){
        await page.locator('#railToggle').click();
        await page.locator('#railExtra').waitFor({state:'visible',timeout:5000});
        assert.equal(await page.locator('#railToggle').getAttribute('aria-expanded'),'true',`${config.name}: toggle reports the open state`);
        await page.locator('#railToggle').click();
        await page.locator('#railExtra').waitFor({state:'hidden',timeout:5000});
      }else{
        assert.ok(await page.locator('#railToggle').isHidden(),`${config.name}: the desktop rail needs no toggle`);
        if(config.width>=1400){
          const code=await page.locator('#tabPython').click().then(()=>page.locator('#code').boundingBox());
          const out=await page.locator('#output').boundingBox();
          assert.ok(out.x>code.x+code.width-5,`${config.name}: console output sits beside the editor, not below it`);
          await page.locator('#tabQa').click();
        }
      }
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
      console.log(`PASS: ${config.name}: archived lessons, non-overlay nav, revision quiz and layout`);
      await page.goto('http://127.0.0.1:4173/library.html',{waitUntil:'domcontentloaded'});
      await page.locator('#cloudStatus').waitFor();
      await page.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue('--a-accent').trim()==='#b8f08e',undefined,{timeout:15000});
      await page.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('Войди в Academy'),undefined,{timeout:10000});
      assert.equal(await page.locator('#save').isDisabled(),true,`${config.name}: guest must not edit cloud books`);
      assert.ok(await page.locator('#book').count(),`${config.name}: library form present`);
      const libraryOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
      assert.ok(libraryOverflow<=2,`${config.name}: library overflow ${libraryOverflow}px`);
      assert.deepEqual(errors,[],`${config.name}: library errors ${errors.join('; ')}`);
      console.log(`PASS: ${config.name}: branded book diary and guest privacy`);
      await page.close();
    }
    const page=await browser.newPage();
    const diagnostic=[];
    page.on('pageerror',error=>diagnostic.push('PAGE '+error.message));
    page.on('console',message=>{if(message.type()==='error')diagnostic.push('CONSOLE '+message.text());});
    page.on('requestfailed',request=>diagnostic.push('REQUEST '+request.url()+' '+request.failure()?.errorText));
    page.on('worker',worker=>diagnostic.push('WORKER '+worker.url()));
    await page.route('**/@supabase/supabase-js@*/dist/umd/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:GUEST}));
    await page.goto('http://127.0.0.1:4173/studio.html',{waitUntil:'domcontentloaded'});
    await page.locator('#tabPython').click();
    await page.locator('#code').fill('print(1 + 2)');
    await page.locator('#answer').fill('Я складываю два числа и ожидаю, что программа выведет число три.');
    await page.locator('#run').click();
    try{
      await page.waitForFunction(()=>/Python загружен|Не удалось загрузить|Ошибка Python-консоли|Не получилось|error/i.test(document.querySelector('#output').textContent),undefined,{timeout:35000});
    }catch(error){const output=await page.locator('#output').textContent();throw Error(`Python init timeout; UI output: ${output}; diagnostics: ${diagnostic.join(' | ')}`);}
    const output=await page.locator('#output').textContent();
    assert.match(output,/Python загружен/,`Worker was not ready: ${output}; diagnostics: ${diagnostic.join(' | ')}`);
    await page.locator('#run').click();
    try{await page.waitForFunction(()=>document.querySelector('#output').textContent.trim()==='3',undefined,{timeout:18000});}
    catch(error){throw Error(`Python run failed: ${await page.locator('#output').textContent()}; diagnostics: ${diagnostic.join(' | ')}`);}
    console.log('PASS: real Pyodide executes print(1 + 2) in a worker.');
    await page.close();
    const offline=await browser.newPage();
    await offline.route('**/cdn.jsdelivr.net/**',route=>route.abort());
    await offline.goto('http://127.0.0.1:4173/library.html',{waitUntil:'domcontentloaded'});
    await offline.waitForFunction(()=>Boolean(window.supabase?.createClient),undefined,{timeout:20000});
    await offline.waitForFunction(()=>!document.querySelector('#cloudStatus').textContent.includes('Проверяем доступ'),undefined,{timeout:15000});
    const guestStatus=await offline.locator('#cloudStatus').textContent();
    assert.match(guestStatus,/Войди в Academy/,`Real local SDK must show guest login guidance: ${guestStatus}`);
    console.log('PASS: unmocked guest book access uses local SDK when CDN is unavailable.');
    await offline.goto('http://127.0.0.1:4173/studio.html',{waitUntil:'domcontentloaded'});
    await offline.waitForFunction(()=>Boolean(window.supabase?.createClient),undefined,{timeout:20000});
    assert.doesNotMatch(await offline.locator('#cloudStatus').textContent(),/Модуль облачного входа не загрузился/,'The vendored copy must replace the blocked CDN module.');
    console.log('PASS: vendored Supabase copy loads when the CDN is unreachable.');
    await offline.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
