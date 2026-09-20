/* Телефон и планшет: навигация закреплена ВНИЗУ экрана (там, где большой палец),
   но ничего не перекрывает — снизу страницы зарезервирована её высота.
   Проверяем: одна навигация на страницу, четыре пункта, тач-цели 44px,
   нижняя панель не накрывает последнюю кнопку страницы, нет второго меню и переполнения. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const pages=['/','/path.html','/library.html','/mentor.html','/sandbox.html','/skills.html','/ai.html','/studio.html'];
 for(const width of [320,390,600,700,750])for(const route of pages){
  const page=await browser.newPage({viewport:{width,height:780},isMobile:true,hasTouch:true});const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173'+route,{waitUntil:'domcontentloaded'});
  const nav=page.locator('body > .mobile-nav,body > .mobile');assert.equal(await nav.count(),1,`${route} must have exactly one mobile navigation`);
  const result=await page.evaluate(()=>{
   const el=document.querySelector('body > .mobile-nav,body > .mobile'),r=el.getBoundingClientRect(),style=getComputedStyle(el);
   const header=document.querySelector('body>.top nav,body>.site-header .library-top-nav');
   return {
    position:style.position,
    top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight,
    reserved:parseFloat(getComputedStyle(document.body).paddingBottom)||0,
    overflow:document.documentElement.scrollWidth-innerWidth,
    links:[...el.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),height:a.getBoundingClientRect().height,glyph:(a.querySelector('.nav-glyph')||{}).textContent||''})),
    duplicateHeader:!!header&&getComputedStyle(header).display!=='none'
   };
  });
  assert.equal(result.position,'fixed',`${route} ${width}: bottom navigation must stay pinned to the screen`);
  assert.ok(Math.abs(result.bottom-result.viewport)<=2,`${route} ${width}: navigation at the bottom, not at the top`);
  assert.ok(result.top>result.viewport/2,`${route} ${width}: navigation must live in the lower half of the screen`);
  assert.ok(result.reserved>=result.height,`${route} ${width}: page must reserve ${result.height}px under the bar, reserved ${result.reserved}px`);
  assert.ok(result.overflow<=2,`${route} ${width}: horizontal overflow ${result.overflow}`);
  assert.equal(result.duplicateHeader,false,`${route} ${width}: never show a second header menu`);
  assert.equal(result.links.length,4,`${route} ${width}: exactly four direct destinations`);
  assert.ok(result.links.every(link=>link.height>=44),`${route} ${width}: touch targets >=44px`);
  assert.ok(result.links.every(link=>link.glyph.trim().length>0),`${route} ${width}: every destination carries its own icon`);
  assert.equal(new Set(result.links.map(link=>link.glyph)).size,4,`${route} ${width}: four different icons`);
  /* Прокручиваем до конца страницы: панель остаётся внизу и не накрывает ни одну кнопку. */
  await page.evaluate(async()=>{
   for(let step=0;step<20;step++){
    const before=scrollY;scrollTo(0,document.documentElement.scrollHeight);
    await new Promise(done=>setTimeout(done,60));
    if(Math.abs(scrollY-before)<1)break;
   }
  });
  const afterScroll=await page.evaluate(()=>{
   const el=document.querySelector('body > .mobile-nav,body > .mobile'),r=el.getBoundingClientRect();
   const covered=[...document.querySelectorAll('button,a,select,textarea,summary')]
    .filter(node=>!el.contains(node))
    .map(node=>({node,box:node.getBoundingClientRect()}))
    .filter(({box})=>box.height>0&&box.top>=0&&box.bottom<=innerHeight)
    .filter(({node,box})=>{
     const hit=document.elementFromPoint(Math.max(2,Math.min(innerWidth-2,box.left+box.width/2)),box.top+box.height/2);
     return !!hit&&el.contains(hit);
    })
    .map(({node})=>node.id||node.className||node.textContent.trim().slice(0,24));
   return {bottom:r.bottom,viewport:innerHeight,covered};
  });
  assert.ok(Math.abs(afterScroll.bottom-afterScroll.viewport)<=2,`${route} ${width}: bar stays pinned to the bottom while scrolling`);
  assert.deepEqual(afterScroll.covered,[],`${route} ${width}: bottom bar covers controls`);
  if(route==='/'){await page.locator('body>.mobile-nav a[href="path.html"]').click();await page.waitForURL('**/path.html');assert.ok(await page.locator('#lessonSelect').count());}
  assert.deepEqual(errors,[],`${route} ${width}: JavaScript errors`);
  console.log(`PASS bottom navigation ${width}px ${route}`);await page.close();
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
