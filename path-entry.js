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
function addPracticalLab(){
 const anchor=document.querySelector('.quiz');if(!anchor||$('sandboxCallout'))return;
 const section=document.createElement('section');section.id='sandboxCallout';section.className='step practice-step';
 const marker=document.createElement('span');marker.className='step-number';marker.textContent='↗';
 const body=document.createElement('div');const heading=document.createElement('h5');heading.textContent='Проверь себя на работающем приложении';
 const description=document.createElement('p');description.textContent='Не ещё один тест с вариантами, а учебный стенд с настоящими воспроизводимыми ошибками. Ты сам проводишь проверку и пишешь баг-репорт. Результат не создаёт ложных отметок в облаке.';
 const link=document.createElement('a');link.id='sandboxLink';link.href='sandbox.html';link.className='primary';link.textContent='Открыть QA-лабораторию ↗';
 body.append(heading,description,link);section.append(marker,body);anchor.after(section);
}
function init(){
 const picker=$('lessonSelect'),status=$('cloudStatus');if(!picker||!status)return;
 const observer=new MutationObserver(apply);observer.observe(status,{childList:true,characterData:true,subtree:true});
 addPracticalLab();apply();
 picker.addEventListener('change',reflect);
 for(const id of ['previous','next','continue','qaTab','englishTab'])$(id)?.addEventListener('click',()=>queueMicrotask(reflect));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
