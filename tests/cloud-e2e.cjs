/* Isolated browser E2E: fake Supabase and fake Python worker; no production credentials or user records. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:850}});
    const errors=[];page.on('pageerror',err=>errors.push(err.message));
    const mockSource=fs.readFileSync('tests/mock-cloud.js','utf8');
    await page.route('**/@supabase/supabase-js@*/dist/umd/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:mockSource}));
    await page.route('**/vendor/supabase.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:mockSource}));
    await page.goto('http://127.0.0.1:4173/studio.html',{waitUntil:'domcontentloaded'});
    await page.locator('#qualityPanel').waitFor();
    await page.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('Облако подключено'));
    assert.match(await page.locator('#progressText').textContent(),/0 из 84/);
    const answer='Предусловие: у пользователя есть учебная карта. Шаги: открыть карточку, нажать кнопку удаления и подтвердить действие. Ожидаемый результат: карточка исчезает из списка.';
    await page.locator('#answer').fill(answer);
    await page.locator('#finishBlock').click();
    await page.locator('#tabPython[aria-pressed="true"]').waitFor();
    await page.locator('#code').fill('print(1 + 2)');
    await page.locator('#answer').fill('Я сложил единицу с двойкой, поэтому программа должна вывести число три.');
    await page.locator('#run').click();
    await page.waitForFunction(()=>document.querySelector('#output').textContent.includes('Python загружен.'));
    await page.locator('#run').click();
    await page.waitForFunction(()=>document.querySelector('#output').textContent.trim()==='3');
    await page.locator('#finishBlock').click();
    await page.locator('#tabEnglish[aria-pressed="true"]').waitFor();
    for(let i=0;i<4;i++){
      const word=await page.evaluate(index=>window.AcademyGuide.english(1).review[index].translation,i);
      await page.locator('.quiz-choices').getByRole('button',{name:word,exact:true}).click();
    }
    const translation=await page.evaluate(()=>window.ACADEMY_DAYS[0].english.translation);
    await page.locator('#answer').fill(translation);
    await page.locator('#finishBlock').click();
    await page.waitForFunction(()=>document.querySelector('#resultTitle').textContent.includes('✓ Урок завершён'),undefined,{timeout:15000});
    const outcome=await page.evaluate(()=>({tasks:window.__academyMock.tasks,blocks:window.__academyMock.academy_blocks,writes:window.__academyMock.writes}));
    /* The archive keeps its own cloud progress, but the calendar now belongs to the live
       QA + English path only: finishing three archived blocks must move no planner task. */
    assert.equal(outcome.blocks.filter(b=>b.lesson_number===1&&b.completed).length,3,'All blocks cloud-confirmed');
    assert.equal(outcome.tasks.filter(t=>t.completed).length,0,'The archive completes no calendar task');
    assert.equal(outcome.tasks.find(t=>t.id==='stranger').completed,false,'Another user is unchanged');
    assert.equal(outcome.writes.filter(w=>w.table==='tasks').length,0,'The archive performs zero planner writes');
    console.log('PASS: archived QA + Python + English → three cloud blocks → zero planner writes.');
    await page.goto('http://127.0.0.1:4173/library.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('загружен'));
    await page.locator('#chapter').fill('Переменные и строки');
    await page.locator('#notes').fill('Переменная связывает имя со значением. Я написал программу, которая выводит строку, и изменил входные данные.');
    await page.locator('#readingStatus').selectOption('done');
    await page.locator('#save').click();
    try{await page.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('сохранена'),undefined,{timeout:6000});}
    catch(err){const diagnostics=await page.evaluate(()=>({status:document.querySelector('#cloudStatus')?.textContent,error:document.querySelector('#formError')?.textContent,rows:window.__academyMock?.academy_reading,writes:window.__academyMock?.writes.filter(w=>w.table==='academy_reading')}));throw Error('Reading save check failed: '+JSON.stringify(diagnostics)+'; page errors: '+errors.join('; '));}
    assert.equal(await page.evaluate(()=>window.__academyMock.academy_reading.length),1,'Private chapter inserted');
    await page.locator('#records').getByRole('button',{name:'Открыть'}).click();
    await page.locator('#chapter').fill('Строки и переменные');
    await page.locator('#save').click();
    await page.waitForFunction(()=>window.__academyMock.academy_reading[0].chapter==='Строки и переменные');
    page.on('dialog',dialog=>dialog.accept());
    await page.locator('#records').getByRole('button',{name:'Удалить'}).click();
    await page.waitForFunction(()=>window.__academyMock.academy_reading.length===0);
    assert.deepEqual(errors,[],'No page errors');
    console.log('PASS: owner reading notes cloud create → update → confirmed delete.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
