/* Responsive and touch-target audit across the unified breakpoint grid.
   Guest only: never signs in, never writes cloud records. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const GUEST='window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null}),getSession:async()=>({data:{session:null},error:null}),signOut:async()=>({error:null})}})};';
const BASE='http://127.0.0.1:4173';
/* The project breakpoint grid. Every stylesheet switches layout on these widths only. */
const WIDTHS=[
  {name:'desktop',width:1440,height:900},
  {name:'desktop-edge',width:1280,height:860},
  {name:'laptop',width:1024,height:800},
  {name:'tablet-portrait',width:834,height:1194},
  {name:'tablet-small',width:768,height:1024},
  {name:'phone-large',width:600,height:900},
  {name:'phone',width:390,height:844},
  {name:'phone-small',width:375,height:812},
  {name:'phone-tiny',width:320,height:720}
];
const PAGES=['/','/path.html','/library.html','/studio.html','/skills.html','/sandbox.html','/mentor.html','/ai.html'];
/* WCAG 2.5.5 target size: controls people tap must be at least 44x44 CSS px.
   Links flowing inside a paragraph are exempt (WCAG 2.5.8 inline exception). */
const TARGETS='button,select,summary,[role=button],input:not([type=hidden]),textarea,nav a,.button,.mobile-nav a,.library-top-nav a,.lesson-top-nav a,.rail-bottom a,.quick-card a';
const smallTargets=(page,selector)=>page.evaluate(query=>{
  const inline=node=>{
    const parent=node.parentElement;
    if(!parent)return false;
    const tag=parent.tagName;
    return (tag==='P'||tag==='LI'||tag==='SMALL')&&getComputedStyle(node).display==='inline';
  };
  /* A checkbox or radio is tapped through its label, so the label is the real target. */
  const target=node=>{
    if(node.tagName!=='INPUT'||!['checkbox','radio'].includes(node.type))return node.getBoundingClientRect();
    const label=node.closest('label')||(node.id&&document.querySelector(`label[for="${node.id}"]`));
    return (label||node).getBoundingClientRect();
  };
  return [...document.querySelectorAll(query)].filter(node=>{
    if(node.disabled||inline(node))return false;
    const box=target(node);
    if(!box.width||!box.height)return false;
    return box.height<44||box.width<44;
  }).map(node=>{
    const box=target(node);
    const id=node.id?`#${node.id}`:node.className?`.${String(node.className).trim().split(/\s+/)[0]}`:'';
    return `${node.tagName.toLowerCase()}${id} ${Math.round(box.width)}x${Math.round(box.height)} "${(node.textContent||'').trim().slice(0,22)}"`;
  });
},selector);
(async()=>{
  const browser=await chromium.launch({headless:true});
  const problems=[];
  try{
    for(const size of WIDTHS){
      for(const path of PAGES){
        const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1});
        const page=await context.newPage();
        await page.route('**/@supabase/supabase-js@*',route=>route.fulfill({status:200,contentType:'text/javascript',body:GUEST}));
        await page.addInitScript(GUEST);
        const errors=[];page.on('pageerror',error=>errors.push(error.message));
        await page.goto(BASE+path,{waitUntil:'domcontentloaded'});
        await page.waitForTimeout(700);
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
        if(overflow>2)problems.push(`${path} @${size.width}: horizontal overflow ${overflow}px`);
        for(const target of await smallTargets(page,TARGETS))problems.push(`${path} @${size.width}: small target ${target}`);
        const dialog=page.locator('#loginDialog');
        if(await dialog.count()){
          await page.evaluate(()=>document.getElementById('loginDialog')?.showModal());
          await page.waitForTimeout(150);
          for(const target of await smallTargets(page,'#loginDialog button,#loginDialog input'))problems.push(`${path} @${size.width}: small login target ${target}`);
          const dialogOverflow=await page.evaluate(()=>{
            const box=document.getElementById('loginDialog').getBoundingClientRect();
            return Math.max(0,Math.round(box.right-window.innerWidth))+Math.max(0,Math.round(-box.left));
          });
          if(dialogOverflow>0)problems.push(`${path} @${size.width}: login dialog sticks out by ${dialogOverflow}px`);
        }
        if(errors.length)problems.push(`${path} @${size.width}: page error ${errors[0]}`);
        await context.close();
      }
      console.log(`checked ${size.name} (${size.width}px)`);
    }
  }finally{await browser.close();}
  assert.deepEqual(problems,[],`Responsive audit failures:\n - ${problems.join('\n - ')}`);
  console.log(`PASS: ${PAGES.length} pages x ${WIDTHS.length} widths: no horizontal overflow, no sub-44px touch targets.`);
})().catch(error=>{console.error(error.message||error);process.exitCode=1;});
