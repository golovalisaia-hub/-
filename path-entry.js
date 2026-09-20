/* Deep-link adapter: the lesson engine remains authoritative for all answers and cloud writes. */
(()=>{'use strict';
const params=new URLSearchParams(location.search);
const requested=Number(params.get('lesson'));
const valid=Number.isInteger(requested)&&requested>=1&&requested<=14;
const track=params.get('subject')==='english'?'english':'qa';
let initial=false,afterCloud=false;
const $=id=>document.getElementById(id);
function selectRequested(){
 const picker=$('lessonSelect');if(!valid||!picker||picker.options.length!==14)return;
 picker.value=String(requested);picker.dispatchEvent(new Event('change',{bubbles:true}));
 const tab=$(track==='english'?'englishTab':'qaTab');if(tab)tab.click();
}
function apply(){
 if(!valid)return;
 const status=$('cloudStatus')?.textContent||'';
 if(!initial){selectRequested();initial=true;}
 if(!afterCloud&&status.includes('Вход подтверждён')){selectRequested();afterCloud=true;}
}
function reflect(){
 const picker=$('lessonSelect'),n=Number(picker?.value);if(!Number.isInteger(n)||n<1||n>14)return;
 const subject=$('englishTab')?.getAttribute('aria-pressed')==='true'?'english':'qa';
 const target=new URL(location.href);target.searchParams.set('lesson',String(n));target.searchParams.set('subject',subject);
 history.replaceState(null,'',target.pathname+target.search+target.hash);
}
function init(){
 const picker=$('lessonSelect'),status=$('cloudStatus');if(!picker||!status)return;
 const observer=new MutationObserver(apply);observer.observe(status,{childList:true,characterData:true,subtree:true});
 apply();
 picker.addEventListener('change',reflect);
 for(const id of ['previous','next','continue','qaTab','englishTab'])$(id)?.addEventListener('click',()=>queueMicrotask(reflect));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
