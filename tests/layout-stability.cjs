/* The lesson page must not grow under the learner after the sign-in check resolves.
   A late reflow moved the last sidebar link behind the fixed bottom navigation, which is
   how tests/mobile-nav-browser.cjs failed on a slower CI runner while passing locally.
   Guest session only: no account, no cloud writes, no API billing. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:4173/path.html';

/* The cloud module is replaced by a stub whose session check resolves late on purpose,
   so the "before" measurement is always taken while the status still says «Загружаем…». */
const DELAY=1200;
const stub=`(()=>{'use strict';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const auth={
  getSession:async()=>{await wait(${DELAY});return {data:{session:null},error:null};},
  getUser:async()=>({data:{user:null},error:null}),
  signOut:async()=>({error:null}),
  signInWithPassword:async()=>({data:{user:null},error:null})
};
const api={select(){return api;},eq(){return api;},limit(){return api;},upsert(){return api;},
  single:async()=>({data:null,error:{message:'guest'}}),
  then(resolve){return Promise.resolve({data:[],error:null}).then(resolve);}};
window.supabase={createClient:()=>({auth,from:()=>api})};
})();`;

const measure=()=>({
  page:document.documentElement.scrollHeight,
  status:Math.round(document.getElementById('cloudStatus').getBoundingClientRect().height)
});

(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const width of [320,360,375,390,414,600,768,834,1024,1440]){
      const page=await browser.newPage({viewport:{width,height:800}});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/vendor/supabase.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:stub}));
      await page.goto(BASE,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(300);
      const before=await page.evaluate(measure);
      await page.waitForTimeout(DELAY+700);
      const after=await page.evaluate(measure);

      assert.match(await page.locator('#cloudStatus').textContent(),/Гостевой просмотр/,
        `${width}px: the guest message must actually have arrived, or this test proves nothing`);
      assert.equal(after.page-before.page,0,
        `${width}px: the page grew by ${after.page-before.page}px after the sign-in check; `+
        `the status box went ${before.status}px -> ${after.status}px. Reserve its height instead.`);
      assert.deepEqual(errors,[],`${width}px: JavaScript errors`);
      await page.close();
    }
  } finally{await browser.close();}
  console.log('PASS: the lesson page keeps its height across 10 widths when the sign-in status arrives.');
})().catch(error=>{console.error(error);process.exitCode=1;});
