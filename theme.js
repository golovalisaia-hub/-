/* Переключатель темы. Тёмная — основная; выбор запоминается в этом браузере.
   Скрипт подключается без defer и выставляет тему до первой отрисовки, чтобы не было вспышки. */
(()=>{'use strict';
const KEY='academy-theme-v1';
const root=document.documentElement;
const apply=theme=>{root.dataset.theme=theme==='light'?'light':'dark';};
let saved=null;
try{saved=localStorage.getItem(KEY);}catch{/* приватный режим: просто берём тему по умолчанию */}
apply(saved||'dark');

/* Subject-first navigation, without changing home.js or progress/cloud logic. */
document.addEventListener('click',event=>{
 const link=event.target?.closest?.('a[href]');if(!link||event.defaultPrevented)return;
 const href=link.getAttribute('href')||'';if(!href.startsWith('path.html'))return;
 const url=new URL(href,location.href);
 if(!url.searchParams.has('lesson')){link.href='courses.html';return;}
 if(!['qa','english'].includes(url.searchParams.get('subject')))url.searchParams.set('subject','qa');
 url.searchParams.set('flow','1');link.href=url.pathname.split('/').pop()+url.search+url.hash;
},true);
function mount(){
  if(document.getElementById('themeToggle'))return;
  const host=document.querySelector('.topline-actions')||document.querySelector('.top')||document.querySelector('.site-header')||document.querySelector('.topbar');
  if(!host)return;
  const button=document.createElement('button');
  button.id='themeToggle';button.type='button';button.className='theme-toggle';
  const icon=document.createElement('span');icon.className='btn-icon theme-icon';icon.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.className='btn-label theme-label';
  button.append(icon,label);
  const paint=()=>{
    const light=root.dataset.theme==='light';
    icon.textContent=light?'☾':'☀';
    label.textContent=light?'Тёмная':'Светлая';
    button.setAttribute('aria-label',light?'Включить тёмную тему':'Включить светлую тему');
    button.setAttribute('aria-pressed',String(light));
  };
  paint();
  button.addEventListener('click',()=>{
    const next=root.dataset.theme==='light'?'dark':'light';
    apply(next);
    try{localStorage.setItem(KEY,next);}catch{/* сохранение недоступно: тема продержится до перезагрузки */}
    paint();
  });
  host.append(button);
}
function init(){
 mount();
 // All deferred scripts are guaranteed to have run before DOMContentLoaded.
 if(location.pathname.endsWith('/path.html')&&new URLSearchParams(location.search).get('flow')==='1'){
  const script=document.createElement('script');script.src='lesson-flow.js?v=1';document.head.append(script);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
