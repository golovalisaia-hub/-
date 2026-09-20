/* У каждой кнопки-действия — своя иконка.
   Проверяем на всех восьми страницах: иконка есть, она скрыта от скринридера,
   у кнопки остаётся текстовое имя, и два разных действия не делят одну иконку.
   Кнопки-ответы (варианты теста, плитки блоков, дни календаря) сюда не входят:
   их содержимое — сам вариант ответа, а не действие. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const PAGES=['/','/path.html','/library.html','/mentor.html','/sandbox.html','/skills.html','/ai.html','/studio.html'];
const SKIP='.choice,.choices button,.quiz-choices button,.foundation-option,.block,[data-day],.cal-grid button,.week-days button';
(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const width of [1280,390]){
  for(const route of PAGES){
   const page=await browser.newPage({viewport:{width,height:900}});
   await page.goto('http://127.0.0.1:4173'+route,{waitUntil:'domcontentloaded'});
   await page.waitForTimeout(220);
   const report=await page.evaluate(skip=>{
    const buttons=[...document.querySelectorAll('button')].filter(node=>!node.matches(skip));
    return buttons.map(node=>{
     const icon=node.querySelector('.btn-icon');
     const label=node.querySelector('.btn-label');
     return {
      id:node.id||node.className||node.textContent.trim().slice(0,30),
      glyph:icon?icon.textContent.trim():'',
      hidden:icon?icon.getAttribute('aria-hidden'):null,
      name:(label?label.textContent:node.textContent).trim()||node.getAttribute('aria-label')||'',
      accessible:Boolean((label?label.textContent:node.textContent).trim()||node.getAttribute('aria-label'))
     };
    });
   },SKIP);
   assert.ok(report.length>0,`${route}: no buttons found`);
   for(const button of report){
    assert.ok(button.glyph.length>0,`${route} ${width}: button "${button.id}" has no icon of its own`);
    assert.equal(button.hidden,'true',`${route} ${width}: the icon of "${button.id}" must be hidden from screen readers`);
    assert.ok(button.accessible,`${route} ${width}: button "${button.id}" has no text label`);
   }
   /* Одна иконка — одно действие: разные подписи не делят глиф. */
   const byGlyph=new Map();
   for(const button of report){
    const names=byGlyph.get(button.glyph)||new Set();names.add(button.name);byGlyph.set(button.glyph,names);
   }
   for(const [glyph,names] of byGlyph){
    assert.equal(names.size,1,`${route} ${width}: icon ${glyph} is shared by different actions: ${[...names].join(' / ')}`);
   }
   console.log(`PASS own icon on ${report.length} buttons ${width}px ${route}`);
   await page.close();
  }
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
