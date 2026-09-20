/* Detect fixed-bottom overlays, repeated menus, obscured buttons and horizontal overflow. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const pages=['/','/path.html','/library.html','/mentor.html','/sandbox.html','/skills.html'];
 for(const width of [320,390,600])for(const route of pages){
  const page=await browser.newPage({viewport:{width,height:780},isMobile:true,hasTouch:true});const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173'+route,{waitUntil:'domcontentloaded'});
  const nav=page.locator('body > .mobile-nav,body > .mobile');assert.equal(await nav.count(),1,`${route} must have exactly one mobile navigation`);
  const result=await page.evaluate(()=>{const el=document.querySelector('body > .mobile-nav,body > .mobile'),r=el.getBoundingClientRect(),style=getComputedStyle(el);return {position:style.position,top:r.top,bottom:r.bottom,overflow:document.documentElement.scrollWidth-innerWidth,links:[...el.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),height:a.getBoundingClientRect().height})),bodyOrder:getComputedStyle(document.body).display};});
  assert.equal(result.position,'sticky',`${route} ${width}: no fixed bottom menu`);
  assert.ok(result.top>=-2&&result.top<6,`${route} ${width}: navigation at top, not bottom`);
  assert.ok(result.bottom<100,`${route} ${width}: navigation cannot cover bottom exercise area`);
  assert.ok(result.overflow<=2,`${route} ${width}: horizontal overflow ${result.overflow}`);
  assert.equal(result.links.length,4,`${route} ${width}: exactly four direct destinations`);
  assert.ok(result.links.every(link=>link.height>=44),`${route} ${width}: touch targets >=44px`);
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  const afterScroll=await nav.boundingBox();assert.ok(afterScroll.y>=-2&&afterScroll.y<8,`${route} ${width}: tabs stay at top without covering bottom controls`);
  if(route==='/'){await page.locator('body>.mobile-nav a[href="path.html"]').click();await page.waitForURL('**/path.html');assert.ok(await page.locator('#lessonSelect').count());}
  assert.deepEqual(errors,[],`${route} ${width}: JavaScript errors`);
  console.log(`PASS mobile non-overlay navigation ${width}px ${route}`);await page.close();
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});