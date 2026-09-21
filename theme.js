/* Theme and shared navigation. This file never writes learning progress or SEVER data. */
(()=>{'use strict';
const KEY='academy-theme-v1',root=document.documentElement;
const apply=theme=>{root.dataset.theme=theme==='light'?'light':'dark';};
let saved=null;
try{saved=localStorage.getItem(KEY);}catch{/* private browsing */}
apply(saved||'dark');

/* Real hrefs, not a click-only workaround: keyboard, new tab, copy link and
   mobile long-press should all get the same subject-first learning route. */
function normalizeLink(link){
 const raw=link.getAttribute('href')||'';
 if(!/^path\.html(?:[?#]|$)/.test(raw))return;
 const url=new URL(raw,location.href);
 const n=Number(url.searchParams.get('lesson'));
 if(!Number.isInteger(n)||n<1||n>14){
  const selected=url.searchParams.get('subject');
  const target='courses.html'+(['qa','english'].includes(selected)?`?subject=${selected}`:'');
  if(raw!==target)link.setAttribute('href',target);
  return;
 }
 if(!['qa','english'].includes(url.searchParams.get('subject')))url.searchParams.set('subject','qa');
 url.searchParams.set('flow','1');
 const target='path.html'+url.search+url.hash;
 if(raw!==target)link.setAttribute('href',target);
}
function normalizeNavigation(){
 document.querySelectorAll('a[href]').forEach(normalizeLink);
 for(const nav of document.querySelectorAll('.nav-links a[href^="courses.html"],.mobile-nav a[href^="courses.html"]')){
  const label=nav.querySelector('.nav-text')||nav.querySelector('span:last-child');
  if(label&&label.textContent.trim()==='Уроки')label.textContent='Предметы';
 }
}
let queued=false;
function scheduleNavigation(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;normalizeNavigation();});}
document.addEventListener('click',event=>{
 const link=event.target?.closest?.('a[href]');if(link)normalizeLink(link);
},true);
function mount(){
 if(document.getElementById('themeToggle'))return;
 const host=document.querySelector('.topline-actions')||document.querySelector('.top')||document.querySelector('.site-header')||document.querySelector('.topbar');
 if(!host)return;
 const button=document.createElement('button');button.id='themeToggle';button.type='button';button.className='theme-toggle';
 const icon=document.createElement('span');icon.className='btn-icon theme-icon';icon.setAttribute('aria-hidden','true');
 const label=document.createElement('span');label.className='btn-label theme-label';button.append(icon,label);
 const paint=()=>{const light=root.dataset.theme==='light';icon.textContent=light?'☾':'☀';label.textContent=light?'Тёмная':'Светлая';button.setAttribute('aria-label',light?'Включить тёмную тему':'Включить светлую тему');button.setAttribute('aria-pressed',String(light));};
 paint();button.addEventListener('click',()=>{const next=root.dataset.theme==='light'?'dark':'light';apply(next);try{localStorage.setItem(KEY,next);}catch{}paint();});host.append(button);
}
function addCss(href){if(document.querySelector(`link[href="${href}"]`))return;const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=href;document.head.append(sheet);}
function addScript(src){const script=document.createElement('script');script.src=src;script.async=false;document.head.append(script);}
function init(){
 mount();normalizeNavigation();
 // Some links are updated later by home.js as cloud progress loads.
 if(document.body)new MutationObserver(scheduleNavigation).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['href']});
 const page=location.pathname.split('/').pop();
 if(page==='courses.html')addCss('academy-scaffold.css?v=2');
 if(page==='path.html'&&new URLSearchParams(location.search).get('flow')==='1'){
  addCss('academy-scaffold.css?v=2');
  addScript('academy-scaffold.js?v=2');
  addScript('lesson-flow.js?v=2');
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
