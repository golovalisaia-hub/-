/* Regression test for python-full/index.html — the offline reader of justxor/pythonroamap2026.
   GitHub is replaced by an in-memory fake built from tests/fixtures/python-full, so the test
   needs no network and checks the reader's own logic: Markdown rendering, sanitising,
   anchors, progress keys and their migration, history, search, sync and mobile layout. */
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const PAGE=fs.readFileSync(path.join(ROOT,'python-full/index.html'));
const FIXTURES=path.join(__dirname,'fixtures/python-full');
const URL_BASE='http://reader.test/';
const REPO='justxor/pythonroamap2026';

function walk(dir,base=''){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name),base+e.name+'/'):[[base+e.name,fs.readFileSync(path.join(dir,e.name),'utf8')]]);
}
const blobSha=text=>{const b=Buffer.from(text);return crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex')};

/* A fake GitHub: commits/main, git/trees and raw files, with switches for failures. */
function fakeGitHub(){
  const gh={files:new Map(walk(FIXTURES)),commit:'1'.repeat(40),calls:{commits:0,trees:0,raw:0},rateLimited:false,down:false,failRaw:new Set()};
  gh.bump=()=>{gh.commit=crypto.randomBytes(20).toString('hex')};
  gh.install=async ctx=>{
    const cors={'access-control-allow-origin':'*','access-control-expose-headers':'x-ratelimit-reset'};
    await ctx.route(URL_BASE+'**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:PAGE}));
    await ctx.route(`https://api.github.com/repos/${REPO}/**`,r=>{
      const u=new URL(r.request().url());
      if(gh.down)return r.fulfill({status:503,headers:cors,body:''});
      if(gh.rateLimited)return r.fulfill({status:403,headers:{...cors,'x-ratelimit-reset':String(Math.floor(Date.now()/1000)+1800)},body:'{}'});
      if(u.pathname.endsWith('/commits/main')){gh.calls.commits++;return r.fulfill({status:200,headers:cors,contentType:'text/plain',body:gh.commit})}
      if(u.pathname.includes('/git/trees/')){
        gh.calls.trees++;
        assert.equal(u.pathname.split('/').pop(),gh.commit,'the tree must be requested for the exact commit');
        const tree=[...gh.files].map(([p,t])=>({path:p,type:'blob',sha:blobSha(t),size:Buffer.byteLength(t)}));
        return r.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({sha:'t'+gh.commit.slice(1),tree,truncated:false})});
      }
      return r.fulfill({status:404,headers:cors,body:''});
    });
    await ctx.route('https://raw.githubusercontent.com/**',r=>{
      const parts=new URL(r.request().url()).pathname.split('/').slice(3);
      const ref=parts.shift(),p=parts.map(decodeURIComponent).join('/');
      if(/\.(png|svg|jpe?g)$/.test(p))return r.fulfill({status:404,body:''});
      gh.calls.raw++;
      if(ref!==gh.commit||gh.failRaw.has(p)||!gh.files.has(p))return r.fulfill({status:500,headers:cors,body:''});
      return r.fulfill({status:200,headers:cors,contentType:'text/plain; charset=utf-8',body:gh.files.get(p)});
    });
  };
  return gh;
}

async function openReader(ctx,hash=''){
  const page=await ctx.newPage();
  page.errors=[];
  page.on('pageerror',e=>page.errors.push(e.message));
  page.on('dialog',d=>(page.nextDialog??'accept')==='accept'?d.accept():d.dismiss());
  await page.goto(URL_BASE+'index.html'+hash);
  await page.waitForFunction(()=>/файл/.test(document.querySelector('#syncLabel').textContent)&&document.querySelector('#syncOverlay').classList.contains('hidden'),null,{timeout:15000});
  return page;
}
const evalIn=(page,fn,arg)=>page.evaluate(fn,arg);
const waitOverlayHidden=page=>page.waitForFunction(()=>document.querySelector('#syncOverlay').classList.contains('hidden'),null,{timeout:15000});

(async()=>{
  const browser=await chromium.launch();
  const results=[];
  const check=async(name,fn)=>{await fn();results.push(name)};
  try{
    const gh=fakeGitHub();
    const ctx=await browser.newContext({viewport:{width:1400,height:900}});
    await gh.install(ctx);
    const page=await openReader(ctx);
    const total=gh.files.size;

    await check('first sync downloads every text file once, pinned to the commit',async()=>{
      assert.deepEqual(gh.calls,{commits:1,trees:1,raw:total});
      assert.match(await page.textContent('#syncLabel'),new RegExp(`^${total} файл`));
    });

    await check('the right sidebar is hidden outside the reader',async()=>{
      assert.equal(await evalIn(page,()=>getComputedStyle(document.querySelector('#rightSide')).display),'none');
    });

    await check('book order: introduction, map, stages by number',async()=>{
      await page.click('.topnav [data-view=book]');
      const order=await evalIn(page,()=>[...document.querySelectorAll('#leftNav [data-open]')].map(b=>b.dataset.open));
      assert.deepEqual(order,['course/README.md','course/MAP.md','course/stage-00-environment.md','course/stage-01-basics.md','course/stage-02-idiomatic.md']);
      assert.equal(await evalIn(page,()=>state.currentPath),'course/README.md');
    });

    await check('every rendered section checkbox and TOC anchor matches the parsed document',async()=>{
      const bad=await evalIn(page,()=>{const out=[];for(const f of state.files.filter(f=>isMd(f.path))){
        const el=document.createElement('div');setSafeHtml(el,markdownToHtml(f.text,f.path),f.path);
        const rendered=[...el.querySelectorAll('.section-check')].map(b=>b.dataset.section).join();
        if(rendered!==doc(f.path).sections.map(s=>s.key).join())out.push('keys '+f.path);
        for(const s of doc(f.path).sections)if(!el.querySelector(`[id="${CSS.escape(s.anchor)}"]`))out.push('anchor '+s.anchor);
      }return out});
      assert.deepEqual(bad,[]);
    });

    await check('stage 1 parses headings like GitHub, fenced "##" is not a section',async()=>{
      const d=await evalIn(page,()=>doc('course/stage-01-basics.md').sections.map(s=>s.anchor));
      assert.deepEqual(d,['введение','пример','пример-1','детали-code','toc','пример-2']);
    });

    await page.evaluate(()=>openDoc('course/stage-01-basics.md'));
    await check('inline Markdown: code is literal, escapes, emphasis, autolinks, entities, inline HTML',async()=>{
      const r=await evalIn(page,()=>{const a=document.querySelector('#article');const intro=a.querySelector('#введение').nextElementSibling;return{
        codes:[...intro.querySelectorAll('code')].map(c=>c.textContent),
        strongInCode:a.querySelectorAll('code strong, code em').length,
        strong:[...intro.querySelectorAll('strong')].map(x=>x.textContent),
        em:[...intro.querySelectorAll('em')].map(x=>x.textContent),
        text:intro.textContent,
        links:[...intro.querySelectorAll('a')].map(x=>[x.textContent,x.getAttribute('href'),x.target||'',x.dataset.doc||'']),
        kbd:intro.querySelectorAll('kbd').length,br:intro.querySelectorAll('br').length,
        quoteBr:a.querySelector('blockquote').querySelectorAll('br').length};});
      assert.deepEqual(r.codes,['__init__','**kwargs']);
      assert.equal(r.strongInCode,0);
      assert.deepEqual(r.strong,['жирный']);
      assert.deepEqual(r.em,['курсив']);
      assert.match(r.text,/snake_case_name/);
      assert.match(r.text,/`не код` и \*звёздочки\*/);
      assert.match(r.text,/Сущность & и/);
      assert.equal(r.kbd,2);assert.equal(r.br,1);assert.equal(r.quoteBr,1);
      const byText=Object.fromEntries(r.links.map(l=>[l[0],l]));
      assert.equal(byText['https://example.com'][2],'_blank');
      assert.equal(byText['https://docs.python.org/3/'][1],'https://docs.python.org/3/');
      assert.equal(byText['второй пример'][3],'course/stage-01-basics.md#пример-1');
      assert.equal(byText['окружение'][3],'course/stage-00-environment.md#установка-uv');
      assert.equal(byText['шаблон'][3],'templates/demo/');
      assert.equal(byText['сайт'][1],'https://example.org/x');
    });

    await check('ordered list keeps numbering around a code block; nested and task items',async()=>{
      const r=await evalIn(page,()=>{const ol=document.querySelector('#article ol');return{items:ol.children.length,start:ol.getAttribute('start'),
        codeInItem:!!ol.children[0].querySelector('pre'),nested:ol.children[1].querySelectorAll('ul>li').length,
        tasks:[...ol.querySelectorAll('.task')].map(t=>t.textContent),olCount:document.querySelectorAll('#article ol').length}});
      assert.deepEqual(r,{items:3,start:null,codeInItem:true,nested:3,tasks:['☑','☐'],olCount:1});
    });

    await check('table: alignment, escaped pipe, empty cell, horizontal scroll wrapper',async()=>{
      const r=await evalIn(page,()=>{const t=document.querySelector('#article .table-wrap table');const row=[...t.querySelectorAll('tbody tr')[0].children];
        return{th:[...t.querySelectorAll('th')].map(x=>x.className),cells:row.map(c=>c.textContent),cols:row.length}});
      assert.deepEqual(r.th,['al-left','al-center','al-right']);
      assert.deepEqual(r.cells,['a | b','1','']);
    });

    await check('raw HTML is sanitised before it reaches the page',async()=>{
      const r=await evalIn(page,()=>({xss:window.__xss,scripts:document.querySelectorAll('#article script').length,
        onerror:document.querySelectorAll('#article [onerror]').length,
        bad:[...document.querySelectorAll('#article a')].filter(a=>a.textContent==='плохая ссылка').map(a=>a.getAttribute('href'))}));
      assert.deepEqual(r,{xss:undefined,scripts:0,onerror:0,bad:[null]});
    });

    await check('a heading with id "toc" does not hijack the sidebar',async()=>{
      assert.ok(await evalIn(page,()=>document.querySelectorAll('#rightSide #toc .toc-item').length===6));
      assert.equal(await evalIn(page,()=>document.querySelectorAll('#article #toc .toc-item').length),0);
    });

    await check('Python code is highlighted',async()=>{
      const r=await evalIn(page,()=>{const c=[...document.querySelectorAll('#article code[data-lang=python]')].pop();
        return{kw:[...c.querySelectorAll('.tk-kw')].map(x=>x.textContent),fn:[...c.querySelectorAll('.tk-fn')].map(x=>x.textContent),
          str:c.querySelector('.tk-str').textContent,com:c.querySelector('.tk-com').textContent,text:c.textContent}});
      assert.deepEqual(r.kw,['class','def','None']);
      assert.deepEqual(r.fn,['A','__init__']);
      assert.equal(r.str,'"s"');assert.equal(r.com,'# комментарий');
      assert.match(r.text,/def __init__\(self, x: int = 42\) -> None:/);
    });

    await page.evaluate(()=>openDoc('course/stage-00-environment.md'));
    await check('ticking a section keeps the reading position and uses the anchor key',async()=>{
      const btn=page.locator('#article #проверка .section-check');
      await btn.scrollIntoViewIfNeeded();await page.waitForTimeout(100);
      const y0=await evalIn(page,()=>scrollY);await btn.click();
      assert.equal(await evalIn(page,()=>scrollY),y0);
      assert.equal(await evalIn(page,()=>state.progress['course/stage-00-environment.md#проверка']),true);
      assert.match(await page.textContent('#readerHead .meta'),/50% пройдено/);
    });

    await check('marking a chapter; un-marking asks first',async()=>{
      await page.click('#markFile');
      assert.equal(await evalIn(page,()=>fileProgress('course/stage-00-environment.md')),100);
      page.nextDialog='dismiss';await page.click('#markFile');
      assert.equal(await evalIn(page,()=>fileProgress('course/stage-00-environment.md')),100);
      page.nextDialog='accept';await page.click('#markFile');
      assert.equal(await evalIn(page,()=>fileProgress('course/stage-00-environment.md')),0);
    });

    await check('cross-document anchor link, then Back restores the previous position',async()=>{
      await page.evaluate(()=>openDoc('course/stage-01-basics.md'));
      await page.evaluate(()=>window.scrollTo({top:400,behavior:'instant'}));
      const y0=await evalIn(page,()=>scrollY);
      await page.click('#article a:text("окружение")');
      assert.equal(await evalIn(page,()=>state.currentPath),'course/stage-00-environment.md');
      const top=await evalIn(page,()=>document.getElementById('установка-uv').getBoundingClientRect().top);
      assert.ok(top>=0&&top<120,`anchor should be at the top, got ${top}`);
      await page.goBack();await page.waitForTimeout(100);
      assert.equal(await evalIn(page,()=>state.currentPath),'course/stage-01-basics.md');
      assert.equal(await evalIn(page,()=>scrollY),y0);
    });

    await check('in-document anchor and folder link',async()=>{
      await page.click('#article a:text("второй пример")');await page.waitForTimeout(600);
      const top=await evalIn(page,()=>document.getElementById('пример-1').getBoundingClientRect().top);
      assert.ok(top>=0&&top<120,`in-doc anchor should scroll, got ${top}`);
      await page.click('#article a:text("шаблон")');
      assert.equal(await evalIn(page,()=>state.currentPath),'templates/demo/README.md');
      await page.goBack();
    });

    await check('Ctrl+click on an internal link is left to the browser',async()=>{
      const prevented=await evalIn(page,()=>{const a=[...document.querySelectorAll('#article a[data-doc]')][0];let p=null;
        const spyFn=e=>{p=e.defaultPrevented;e.preventDefault()};document.addEventListener('click',spyFn);
        a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true,button:0}));
        document.removeEventListener('click',spyFn);return p});
      assert.equal(prevented,false);
    });

    await check('code files: no fake sections from comments, readable titles, highlighting',async()=>{
      await page.evaluate(()=>openDoc('templates/demo/Dockerfile'));
      const r=await evalIn(page,()=>({sections:doc('templates/demo/Dockerfile').sections.length,checks:document.querySelectorAll('#article .section-check').length,
        title:document.querySelector('#readerHead h1').textContent,kw:[...document.querySelectorAll('#article .tk-kw')].map(x=>x.textContent.trim()),
        pyTitle:extractTitle('templates/demo/src/app/main.py'),pySections:doc('templates/demo/src/app/main.py').sections.length,
        groups:[...document.querySelectorAll('#leftNav .group-toggle span')].map(s=>s.textContent)}));
      assert.deepEqual(r,{sections:0,checks:0,title:'Dockerfile',kw:['FROM','WORKDIR','RUN'],pyTitle:'src/app/main.py',pySections:0,groups:['⌘ demo · 3']});
    });

    await check('search: count, highlight, Enter opens the section of the first hit',async()=>{
      await page.keyboard.press('Escape');
      await page.keyboard.press('/');
      assert.equal(await evalIn(page,()=>state.currentView),'search');
      await page.fill('#bigSearch','uv sync');await page.waitForTimeout(250);
      assert.match(await page.textContent('#searchCount'),/Найдено: \d+/);
      assert.ok(await page.locator('#searchResults mark').count()>0);
      await page.press('#bigSearch','Enter');
      assert.equal(await evalIn(page,()=>state.currentView),'book');
    });

    await check('reload keeps the route, including an encoded Cyrillic anchor',async()=>{
      await page.evaluate(()=>openDoc('course/stage-01-basics.md#toc'));
      assert.match(await evalIn(page,()=>location.hash),/^#\/course\/stage-01-basics\.md#toc$/);
      await page.evaluate(()=>openDoc('course/stage-00-environment.md#проверка'));
      await page.reload();await waitOverlayHidden(page);
      assert.equal(await evalIn(page,()=>state.currentPath),'course/stage-00-environment.md');
      const top=await evalIn(page,()=>document.getElementById('проверка').getBoundingClientRect().top);
      assert.ok(top>=0&&top<120,`anchor after reload, got ${top}`);
    });

    await check('continue goes back to the section where reading stopped',async()=>{
      await page.evaluate(()=>openDoc('course/stage-00-environment.md'));
      await page.evaluate(()=>{document.getElementById('проверка').scrollIntoView({behavior:'instant'});});
      await page.waitForTimeout(150);
      await page.click('.topnav [data-view=home]');
      assert.equal(await evalIn(page,()=>continueTarget()),'course/stage-00-environment.md#проверка');
      await page.click('#continueHome');
      const top=await evalIn(page,()=>document.getElementById('проверка').getBoundingClientRect().top);
      assert.ok(top>=0&&top<150,`continue should scroll to the section, got ${top}`);
    });

    await check('the TOC highlights the last short section at the bottom of the page',async()=>{
      await page.evaluate(()=>openDoc('course/stage-01-basics.md'));
      await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
      await page.waitForTimeout(150);
      assert.equal(await evalIn(page,()=>document.querySelector('#toc .toc-item.current')?.dataset.anchor),'пример-2');
    });

    await check('"mark and continue" finishes the chapter and opens the next one',async()=>{
      await page.evaluate(()=>openDoc('course/stage-01-basics.md'));
      await page.click('#readerFoot [data-done-next]');
      assert.equal(await evalIn(page,()=>fileProgress('course/stage-01-basics.md')),100);
      assert.equal(await evalIn(page,()=>state.currentPath),'course/stage-02-idiomatic.md');
      await page.evaluate(()=>{setFileDone('course/stage-01-basics.md',false)});
    });

    await check('navigation groups collapse and remember it',async()=>{
      await page.click('#leftNav [data-group="Учебник"]');
      assert.equal(await page.locator('#leftNav [data-open]').count(),0);
      assert.deepEqual(await evalIn(page,()=>JSON.parse(localStorage.getItem('pa-collapsed'))),['Учебник']);
      await page.click('#leftNav [data-group="Учебник"]');
      assert.ok(await page.locator('#leftNav [data-open]').count()>0);
    });

    await check('two tabs: progress from one tab appears in the other',async()=>{
      const other=await openReader(ctx,'#/course/stage-02-idiomatic.md');
      await page.evaluate(()=>openDoc('course/stage-02-idiomatic.md'));
      if(await evalIn(page,()=>fileProgress('course/stage-02-idiomatic.md'))===100)await page.evaluate(()=>setFileDone('course/stage-02-idiomatic.md',false));
      await other.waitForFunction(()=>fileProgress('course/stage-02-idiomatic.md')===0);
      await page.click('#markFile');
      await other.waitForFunction(()=>fileProgress('course/stage-02-idiomatic.md')===100);
      assert.match(await other.textContent('#readerHead .meta'),/100% пройдено/);
      await other.close();
    });

    await check('update: only changed files are downloaded, removed files disappear',async()=>{
      gh.files.set('course/stage-02-idiomatic.md','# Этап 2. Идиоматичный Python\n\n## Генераторы\n\nОбновлённый текст главы.\n');
      gh.files.delete('course/prompts/01-generate-tests.md');gh.bump();
      const before={...gh.calls};
      await page.evaluate(()=>openDoc('course/stage-02-idiomatic.md'));
      await page.click('#syncBtn');await waitOverlayHidden(page);
      assert.deepEqual({c:gh.calls.commits-before.commits,t:gh.calls.trees-before.trees,r:gh.calls.raw-before.raw},{c:1,t:1,r:1});
      assert.match(await page.textContent('#article'),/Обновлённый текст главы/);
      assert.equal(await evalIn(page,()=>state.fileMap.has('course/prompts/01-generate-tests.md')),false);
      assert.equal(await evalIn(page,()=>fileProgress('course/stage-02-idiomatic.md')),100,'progress survives an unrelated edit');
      await page.click('.topnav [data-view=prompts]');
      assert.match(await page.textContent('#article'),/Здесь пока нет файлов/);
    });

    await check('no change upstream: one light API call, no tree, no downloads',async()=>{
      const before={...gh.calls};
      await page.click('#syncBtn');await waitOverlayHidden(page);
      assert.deepEqual({c:gh.calls.commits-before.commits,t:gh.calls.trees-before.trees,r:gh.calls.raw-before.raw},{c:1,t:0,r:0});
    });

    await check('a failed download is retried next time and keeps stale files',async()=>{
      gh.files.set('course/MAP.md','# Карта обучения\n\nНовая карта.\n');gh.failRaw.add('course/MAP.md');gh.bump();
      await page.click('#syncBtn');
      await page.waitForFunction(()=>/не загрузил/.test(document.querySelector('#syncText').textContent));
      await waitOverlayHidden(page);
      assert.equal(await evalIn(page,()=>state.meta.failed),1);
      gh.failRaw.clear();const before={...gh.calls};
      await page.click('#syncBtn');await waitOverlayHidden(page);
      assert.equal(gh.calls.raw-before.raw,1);
      assert.match(await evalIn(page,()=>state.fileMap.get('course/MAP.md').text),/Новая карта/);
    });

    await check('rate limit is explained with the reset time',async()=>{
      gh.rateLimited=true;
      await page.click('#syncBtn');
      await page.waitForFunction(()=>/Лимит сбросится в \d\d:\d\d/.test(document.querySelector('#syncLog').textContent));
      gh.rateLimited=false;await waitOverlayHidden(page);
    });

    await check('importing an old export migrates its progress keys',async()=>{
      await page.click('.topnav [data-view=progress]');
      const file={name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:3,progress:{'course/stage-01-basics.md#пример-2':true},notes:{'course/stage-01-basics.md':'моя заметка'},bookmarks:['course/MAP.md']}))};
      await page.setInputFiles('#importData',file);
      await page.waitForFunction(()=>state.progress['course/stage-01-basics.md#пример']===true);
      assert.deepEqual(await evalIn(page,()=>Object.keys(state.progress)),['course/stage-01-basics.md#пример']);
      assert.match(await page.textContent('#progressView'),/Мои заметки · 1/);
    });

    await check('mobile: drawer has all sections, closes after a choice, no horizontal scroll',async()=>{
      const m=await ctx.newPage();m.errors=[];m.on('pageerror',e=>m.errors.push(e.message));
      await m.setViewportSize({width:390,height:844});
      await m.goto(URL_BASE+'index.html#/course/stage-01-basics.md');await waitOverlayHidden(m);
      assert.equal(await evalIn(m,()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.ok(await m.isVisible('#noteBox'),'notes are reachable on a phone');
      await m.click('#mobileMenu');await m.waitForTimeout(250);
      await m.click('.drawer-nav [data-view=search]');
      assert.equal(await evalIn(m,()=>state.currentView),'search');
      assert.equal(await evalIn(m,()=>document.querySelector('#leftSide').classList.contains('open')),false);
      await m.click('#mobileMenu');await m.waitForTimeout(250);
      await m.mouse.click(370,500);
      assert.equal(await evalIn(m,()=>document.querySelector('#leftSide').classList.contains('open')),false,'tap outside closes the drawer');
      assert.deepEqual(m.errors,[]);await m.close();
    });

    assert.deepEqual(page.errors,[]);
    await ctx.close();

    await check('old progress keys are migrated exactly once',async()=>{
      const g=fakeGitHub(),c=await browser.newContext();await g.install(c);
      const p=await openReader(c);
      await p.evaluate(()=>{localStorage.setItem('pa-progress',JSON.stringify({'course/stage-01-basics.md#пример-2':true,'course/stage-01-basics.md#детали-code-4':true}));localStorage.removeItem('pa-keys')});
      await p.reload();await waitOverlayHidden(p);
      const expected=['course/stage-01-basics.md#детали-code','course/stage-01-basics.md#пример'];
      assert.deepEqual(await evalIn(p,()=>Object.keys(JSON.parse(localStorage.getItem('pa-progress'))).sort()),expected);
      await p.reload();await waitOverlayHidden(p);
      assert.deepEqual(await evalIn(p,()=>Object.keys(state.progress).sort()),expected);
      await c.close();
    });

    await check('without IndexedDB the reader still works from memory and says so',async()=>{
      const g=fakeGitHub(),c=await browser.newContext();await g.install(c);
      await c.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get(){throw new Error('blocked')}})});
      const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
      await p.goto(URL_BASE+'index.html');
      await p.waitForFunction(()=>/файл/.test(document.querySelector('#syncLabel').textContent));
      assert.match(await p.textContent('#syncLog'),/Хранилище браузера недоступно/);
      assert.deepEqual(errs,[]);await c.close();
    });

    await check('first launch offline offers a retry',async()=>{
      const g=fakeGitHub();g.down=true;const c=await browser.newContext();await g.install(c);
      const p=await c.newPage();await p.goto(URL_BASE+'index.html');
      await p.waitForSelector('#syncActions:not(.hidden) #syncRetry');
      g.down=false;await p.click('#syncRetry');
      await p.waitForFunction(()=>state.files.length>0);
      await c.close();
    });

    console.log(results.map(r=>'  ✓ '+r).join('\n'));
    console.log(`PASS: python-full reader — ${results.length} checks.`);
  }catch(error){
    console.log(results.map(r=>'  ✓ '+r).join('\n'));
    console.error(error);process.exitCode=1;
  }finally{await browser.close()}
})();
