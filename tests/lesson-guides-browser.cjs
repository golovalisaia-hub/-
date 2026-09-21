/* Teachability smoke tests: real Chromium, fake guest login, no writes or paid API. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:4173/path.html';
const GUEST='window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null})}})};';
const lessons=[
 {subject:'qa',n:3,title:'Ожидаемый и фактический результат',example:/не проверен/i},
 {subject:'qa',n:4,title:'Позитивные и негативные сценарии',example:/правильн|корректн/i},
 {subject:'qa',n:5,title:'Воспроизводимость ошибки',example:/предусловие/i},
 {subject:'qa',n:6,title:'Баг-репорт',example:/ВЫМЫШЛЕННЫЙ/i},
 {subject:'english',n:2,title:'Буквы и звуки',example:/cat/i},
 {subject:'english',n:3,title:'I am / You are',example:/You are ready/i},
 {subject:'english',n:4,title:'This is a...',example:/This is a phone/i},
 {subject:'english',n:5,title:'Артикли a и an',example:/a user/i}
];
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:820}}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/vendor/supabase.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:GUEST}));
   for(const item of lessons){
    await page.goto(`${BASE}?lesson=${item.n}&subject=${item.subject}&flow=1`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(({subject,n})=>{
     const actual=document.querySelector('#englishTab')?.getAttribute('aria-pressed')==='true'?'english':'qa';
     return document.body.classList.contains('guided-lesson')&&actual===subject&&Number(document.querySelector('#lessonSelect')?.value)===n&&document.querySelector('.academy-scaffold-task');
    },{subject:item.subject,n:item.n});
    assert.equal(await page.locator('#lessonTitle').textContent(),item.title,'Correct subject and topic');
    assert.equal(await page.locator('.academy-scaffold-intro').count(),1,'Exactly one learning goal');
    assert.equal(await page.locator('.academy-scaffold-intro dt').count(),3,'Definitions before practice');
    assert.ok(await page.locator('.academy-scaffold-example ol li').count()>=4,'Example is genuinely step by step');
    assert.ok(await page.locator('.academy-scaffold-task ol li').count()>=4,'Practice contains actionable steps');
    assert.ok(await page.locator('.academy-scaffold-example ul li').count()>=2,'Common errors are explained');
    assert.match(await page.locator('.academy-scaffold-example').textContent(),item.example,'Example covers the real lesson topic');
    assert.equal(await page.locator('.quiz').isVisible(),false,'Quiz cannot swamp learner before theory');
    assert.equal(await page.locator('.response').isVisible(),false,'Practice cannot swamp learner before theory');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(overflow<=2,`${width}px ${item.subject} ${item.n}: horizontal overflow ${overflow}`);
    assert.equal(await page.locator('#answer').isDisabled(),true,'Guest cannot create unsafe unsaved work');
    if(width===390&&((item.subject==='qa'&&item.n===6)||(item.subject==='english'&&item.n===5))){
     await page.screenshot({path:`screenshots/390-${item.subject}-lesson-${item.n}-guided.png`,fullPage:true,animations:'disabled'});
    }
    if(width===320&&item.subject==='qa'&&item.n===4){
     await page.screenshot({path:'screenshots/320-qa-positive-negative.png',fullPage:true,animations:'disabled'});
    }
    await page.locator('#flowNext').click();
    assert.equal(await page.locator('.quiz').isVisible(),true,'Comprehension comes after explanation');
    assert.equal(await page.locator('.response').isVisible(),false,'Practice still locked during questions');
    assert.equal(await page.locator('#flowNext').isDisabled(),true,'Answers needed before practice');
    console.log(`PASS: ${width}px ${item.subject} lesson ${item.n}: goal, definitions, example, common errors, practice and stage gate`);
   }
   assert.deepEqual(errors,[],`Uncaught JavaScript errors at ${width}px: ${errors.join('; ')}`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
