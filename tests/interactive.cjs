/* Каждая ссылка ведёт на существующий адрес, каждая кнопка что-то делает.
   Гостевой режим: тест не входит в аккаунт и ничего не пишет в облако. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:4173';
const GUEST='window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null}),getSession:async()=>({data:{session:null},error:null}),signOut:async()=>({error:null})}})};';
const PAGES=['/','/path.html','/library.html','/studio.html'];
/* Навигация, которая на границе списка или на текущем уроке законно ничего не меняет. */
const IDEMPOTENT=new Set(['resume','continue','previous','next']);
(async()=>{
  const browser=await chromium.launch({headless:true});
  const problems=[],suspects=[];
  try{
    for(const path of PAGES){
      const context=await browser.newContext({viewport:{width:1280,height:900}});
      const page=await context.newPage();
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(GUEST);
      await page.goto(BASE+path,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(900);

      /* 1. Ссылки: адрес есть, он не заглушка, внутренние страницы существуют. */
      const links=await page.evaluate(()=>[...document.querySelectorAll('a[href]')].map(node=>({
        href:node.getAttribute('href'),
        resolved:node.href,
        text:(node.textContent||'').trim().slice(0,30),
        visible:node.getBoundingClientRect().width>0
      })));
      for(const item of links){
        if(!item.href||item.href==='#'){problems.push(`${path}: ссылка-заглушка «${item.text}»`);continue;}
        if(item.href.startsWith('http')&&!item.resolved.startsWith(BASE))continue; /* внешний адрес не дёргаем */
        if(item.href.startsWith('mailto:')||item.href.startsWith('#'))continue;
        const target=new URL(item.resolved);
        const response=await page.request.get(target.origin+target.pathname);
        if(!response.ok())problems.push(`${path}: ссылка «${item.text}» ведёт на ${target.pathname} со статусом ${response.status()}`);
      }

      /* 2. Кнопки: либо заблокированы осознанно, либо клик что-то меняет. */
      const buttons=await page.evaluate(()=>[...document.querySelectorAll('button')].map((node,index)=>({
        index,id:node.id,
        text:(node.textContent||'').trim().slice(0,34),
        visible:node.getBoundingClientRect().width>0&&node.getBoundingClientRect().height>0,
        disabled:node.disabled,
        inDialog:Boolean(node.closest('dialog'))
      })));
      for(const info of buttons){
        if(info.inDialog||!info.visible||info.disabled)continue;
        const button=page.locator('button').nth(info.index);
        /* Состояние могло измениться от предыдущих кликов: перечитываем его перед нажатием. */
        const now=await button.evaluate(node=>({
          disabled:node.disabled,
          pressed:node.getAttribute('aria-pressed'),
          visible:node.getBoundingClientRect().width>0&&node.getBoundingClientRect().height>0
        })).catch(()=>null);
        if(!now||now.disabled||!now.visible||now.pressed==='true')continue;
        const before=await page.evaluate(()=>({
          html:document.body.innerHTML.length,
          dialog:Boolean(document.querySelector('dialog[open]')),
          url:location.href
        }));
        await button.click({timeout:4000}).catch(error=>problems.push(`${path}: кнопка «${info.text}» не нажимается: ${error.message.split('\n')[0]}`));
        await page.waitForTimeout(220);
        const after=await page.evaluate(()=>({
          html:document.body.innerHTML.length,
          dialog:Boolean(document.querySelector('dialog[open]')),
          url:location.href
        }));
        const changed=before.html!==after.html||before.dialog!==after.dialog||before.url!==after.url;
        /* Соседний клик мог уже перевести группу в конечное состояние, поэтому подозрение
           проверяется отдельно на свежей странице. */
        if(!changed&&!IDEMPOTENT.has(info.id))suspects.push({path,text:info.text});
        /* Закрываем окно входа, если оно открылось, и возвращаемся к исходной странице. */
        if(after.dialog)await page.evaluate(()=>document.querySelector('dialog[open]')?.close());
        if(before.url!==after.url){await page.goto(BASE+path,{waitUntil:'domcontentloaded'});await page.waitForTimeout(700);}
      }

      if(errors.length)problems.push(`${path}: ошибка JS ${errors[0]}`);
      await context.close();
      console.log(`проверено ${path}: ${links.length} ссылок, ${buttons.filter(item=>item.visible&&!item.inDialog).length} кнопок`);
    }
    /* Повторная проверка подозрительных кнопок на чистой странице. */
    for(const suspect of suspects){
      const context=await browser.newContext({viewport:{width:1280,height:900}});
      const page=await context.newPage();
      await page.addInitScript(GUEST);
      await page.goto(BASE+suspect.path,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(900);
      const button=page.getByRole('button',{name:suspect.text,exact:false}).first();
      if(!await button.count()||!await button.isVisible()||!await button.isEnabled()){await context.close();continue;}
      const before=await page.evaluate(()=>document.body.innerHTML.length+(document.querySelector('dialog[open]')?1e6:0));
      await button.click({timeout:4000}).catch(()=>{});
      await page.waitForTimeout(300);
      const after=await page.evaluate(()=>document.body.innerHTML.length+(document.querySelector('dialog[open]')?1e6:0));
      if(before===after)problems.push(`${suspect.path}: кнопка «${suspect.text}» ничего не меняет и на чистой странице`);
      await context.close();
    }
  }finally{await browser.close();}
  assert.deepEqual(problems,[],`Неработающие элементы:\n - ${problems.join('\n - ')}`);
  console.log('PASS: все ссылки ведут на существующие страницы, все видимые кнопки работают.');
})().catch(error=>{console.error(error.message||error);process.exitCode=1;});
