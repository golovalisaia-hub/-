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
function syncTools(){
 const picker=$('lessonSelect'),n=Number(picker?.value),qa=$('qaTab')?.getAttribute('aria-pressed')==='true';
 if($('sandboxCallout'))$('sandboxCallout').hidden=!qa;
 if($('transferCallout'))$('transferCallout').hidden=!qa;
 if($('mentorCallout'))$('mentorCallout').hidden=!qa;
 if($('mentorLink')&&Number.isInteger(n)&&n>=1&&n<=14)$('mentorLink').href=`mentor.html?lesson=${n}`;
 const subject=qa?'qa':'english';
 if($('aiTutorLink')&&Number.isInteger(n)&&n>=1&&n<=14)$('aiTutorLink').href=`ai.html?lesson=${n}&subject=${subject}`;
 if($('aiNavLink')&&Number.isInteger(n)&&n>=1&&n<=14)$('aiNavLink').href=`ai.html?lesson=${n}&subject=${subject}`;
}
function reflect(){
 const picker=$('lessonSelect'),n=Number(picker?.value);if(!Number.isInteger(n)||n<1||n>14)return;
 const subject=$('englishTab')?.getAttribute('aria-pressed')==='true'?'english':'qa';
 const target=new URL(location.href);target.searchParams.set('lesson',String(n));target.searchParams.set('subject',subject);
 history.replaceState(null,'',target.pathname+target.search+target.hash);syncTools();
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
function addTransfer(){
 const anchor=$('sandboxCallout')||document.querySelector('.quiz');if(!anchor||$('transferCallout'))return;
 const section=document.createElement('section');section.id='transferCallout';section.className='step practice-step';
 const marker=document.createElement('span');marker.className='step-number';marker.textContent='◇';
 const body=document.createElement('div'),heading=document.createElement('h5'),description=document.createElement('p');
 heading.textContent='Незнакомая QA-задача: найди ошибки в доставке';
 description.textContent='Второе приложение, новые требования и семь пограничных ситуаций. Сам запусти проверки и составь отчёт на основе журнала. Сайт проверит факты, но не будет оценивать смысл твоего текста. Ничего не записывается в SEVER.';
 const link=document.createElement('a');link.href='qa-transfer.html';link.className='primary';link.textContent='Начать самостоятельное исследование ↗';
 body.append(heading,description,link);section.append(marker,body);anchor.after(section);
 const nav=document.querySelector('.sidebar .navigation');
 if(nav&&!nav.querySelector('a[href="qa-transfer.html"]')){
   const navLink=document.createElement('a');navLink.href='qa-transfer.html';navLink.textContent='◇ Самостоятельная QA-задача';nav.append(navLink);
 }
}
function addMentor(){
 const first=document.querySelector('.lesson-body > .step');if(!first||$('mentorCallout'))return;
 const section=document.createElement('section');section.id='mentorCallout';section.className='step practice-step';
 const marker=document.createElement('span');marker.className='step-number';marker.textContent='↻';
 const body=document.createElement('div'),heading=document.createElement('h5'),description=document.createElement('p');
 heading.textContent='Тренер: повтори то, что не закрепилось';
 description.textContent='Новые проверяемые задачи, подсказки после твоей попытки и возвращение к ошибкам в другие дни. История пока только на этом устройстве; это не ИИ и не экзамен.';
 const link=document.createElement('a');link.id='mentorLink';link.href='mentor.html?lesson=1';link.className='primary';link.textContent='Открыть повторение по этой теме ↗';
 body.append(heading,description,link);section.append(marker,body);first.before(section);
 const nav=document.querySelector('.sidebar .navigation');if(nav&&!nav.querySelector('a[href="mentor.html"]')){
   const navLink=document.createElement('a');navLink.href='mentor.html';navLink.textContent='↻ Тренер повторения QA';nav.append(navLink);
 }
}
function addAi(){
 const first=document.querySelector('.lesson-body > .step');if(!first||$('aiTutorCallout'))return;
 const section=document.createElement('section');section.id='aiTutorCallout';section.className='step practice-step';
 const marker=document.createElement('span');marker.className='step-number';marker.textContent='✦';
 const body=document.createElement('div'),heading=document.createElement('h5'),description=document.createElement('p');
 heading.textContent='Застрял? Спроси ИИ-наставника';
 description.textContent='Наставник разберёт именно эту тему, задаст вопрос, даст подсказку или посмотрит твой ответ. Переписка отдельная от ChatGPT; прогресс автоматически не засчитывается. Для работы нужен настроенный API.';
 const link=document.createElement('a');link.id='aiTutorLink';link.href='ai.html?lesson=1&subject=qa';link.className='primary';link.textContent='Разобрать этот урок с ИИ ↗';
 body.append(heading,description,link);section.append(marker,body);first.after(section);
 const nav=document.querySelector('.sidebar .navigation');if(nav&&!$('aiNavLink')){
   const navLink=document.createElement('a');navLink.id='aiNavLink';navLink.href='ai.html';navLink.textContent='✦ ИИ-наставник';nav.append(navLink);
 }
}
function init(){
 const picker=$('lessonSelect'),status=$('cloudStatus');if(!picker||!status)return;
 const observer=new MutationObserver(apply);observer.observe(status,{childList:true,characterData:true,subtree:true});
 addPracticalLab();addTransfer();addMentor();addAi();apply();syncTools();
 picker.addEventListener('change',reflect);
 for(const id of ['previous','next','continue','qaTab','englishTab'])$(id)?.addEventListener('click',()=>queueMicrotask(reflect));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
