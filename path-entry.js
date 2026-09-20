/* Deep-link adapter: lesson engine remains authoritative for grades, answers and cloud writes. */
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
 if(!valid)return;const status=$('cloudStatus')?.textContent||'';
 if(!initial){selectRequested();initial=true;}
 if(!afterCloud&&status.includes('Вход подтверждён')){selectRequested();afterCloud=true;}
}
function syncTools(){
 const picker=$('lessonSelect'),n=Number(picker?.value),qa=$('qaTab')?.getAttribute('aria-pressed')==='true';
 if($('sandboxCallout'))$('sandboxCallout').hidden=!qa;
 if($('mentorCallout'))$('mentorCallout').hidden=!qa;
 if($('mentorLink')&&Number.isInteger(n)&&n>=1&&n<=14)$('mentorLink').href=`mentor.html?lesson=${n}`;
 const subject=qa?'qa':'english';
 for(const id of ['aiTutorLink','aiNavLink'])if($(id)&&Number.isInteger(n)&&n>=1&&n<=14)$(id).href=`ai.html?lesson=${n}&subject=${subject}`;
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
 const body=document.createElement('div'),heading=document.createElement('h5'),description=document.createElement('p'),link=document.createElement('a');
 heading.textContent='Проверь себя на работающем приложении';
 description.textContent='Учебный стенд с воспроизводимыми ошибками. Проведи проверку и напиши баг-репорт. Это не выставляет отметок в облаке.';
 link.id='sandboxLink';link.href='sandbox.html';link.className='primary';link.textContent='Открыть QA-лабораторию ↗';
 body.append(heading,description,link);section.append(marker,body);anchor.after(section);
}
function addMentor(){
 const first=document.querySelector('.lesson-body > .step');if(!first||$('mentorCallout'))return;
 const section=document.createElement('section');section.id='mentorCallout';section.className='step practice-step';
 const marker=document.createElement('span');marker.className='step-number';marker.textContent='↻';
 const body=document.createElement('div'),heading=document.createElement('h5'),description=document.createElement('p');
 heading.textContent='Тренер: повтори то, что не закрепилось';
 description.textContent='Проверяемые задачи, подсказки после попытки и повторение в другие дни. История остаётся на устройстве; это не ИИ и не экзамен.';
 const link=document.createElement('a');link.id='mentorLink';link.href='mentor.html?lesson=1';link.className='primary';link.textContent='Открыть повторение по теме ↗';
 body.append(heading,description,link);section.append(marker,body);first.before(section);
 const nav=document.querySelector('.sidebar .navigation');if(nav&&!nav.querySelector('a[href="mentor.html"]')){
  const navLink=document.createElement('a');navLink.href='mentor.html';navLink.textContent='↻ Тренер повторения QA';nav.append(navLink);
 }
}
function reviewCurrentAnswer(){
 const answer=$('answer'),notice=$('aiReviewNotice'),n=Number($('lessonSelect')?.value);
 const subject=$('englishTab')?.getAttribute('aria-pressed')==='true'?'english':'qa',text=answer?.value.trim()||'';
 if(!Number.isInteger(n)||n<1||n>14)return;
 if(!text){notice.textContent='Сначала напиши самостоятельную работу в поле ответа выше.';answer?.focus();return;}
 try{sessionStorage.setItem('academy-tutor-transfer-v1',JSON.stringify({lesson:n,subject,text:text.slice(0,2000)}));}
 catch{notice.textContent='Не удалось перенести текст в этой вкладке. Скопируй ответ вручную и открой наставника.';return;}
 location.assign(`ai.html?lesson=${n}&subject=${subject}&mode=review`);
}
function addAi(){
 const first=document.querySelector('.lesson-body > .step');if(!first||$('aiTutorCallout'))return;
 const section=document.createElement('section');section.id='aiTutorCallout';section.className='step practice-step';
 const marker=document.createElement('span');marker.className='step-number';marker.textContent='✦';
 const body=document.createElement('div'),heading=document.createElement('h5'),description=document.createElement('p');
 heading.textContent='Застрял? Спроси ИИ-наставника';
 description.textContent='Объяснит текущую тему и проверит текст по критериям. Это отдельная переписка, без автоматических зачётов. Требуется API.';
 const link=document.createElement('a');link.id='aiTutorLink';link.href='ai.html?lesson=1&subject=qa';link.className='primary';link.textContent='Разобрать урок с ИИ ↗';
 body.append(heading,description,link);section.append(marker,body);first.after(section);
 const response=document.querySelector('.response .response-actions');
 if(response&&!$('aiReviewCurrent')){
  const button=document.createElement('button');button.id='aiReviewCurrent';button.className='subtle';button.type='button';
  const icon=document.createElement('span');icon.className='btn-icon';icon.setAttribute('aria-hidden','true');icon.textContent='✧';
  const label=document.createElement('span');label.className='btn-label';label.textContent='Разобрать мой текст с ИИ';button.append(icon,label);
  button.addEventListener('click',reviewCurrentAnswer);response.append(button);
  const notice=document.createElement('p');notice.id='aiReviewNotice';notice.className='minor';notice.setAttribute('role','status');
  notice.textContent='Перенос только по нажатию. Перед отправкой ИИ ты увидишь текст и сможешь его изменить. Не вставляй пароли и ключи.';
  response.after(notice);
 }
 const nav=document.querySelector('.sidebar .navigation');if(nav&&!$('aiNavLink')){
  const navLink=document.createElement('a');navLink.id='aiNavLink';navLink.href='ai.html';navLink.textContent='✦ ИИ-наставник';nav.append(navLink);
 }
}
function init(){
 const picker=$('lessonSelect'),status=$('cloudStatus');if(!picker||!status)return;
 const observer=new MutationObserver(apply);observer.observe(status,{childList:true,characterData:true,subtree:true});
 addPracticalLab();addMentor();addAi();apply();syncTools();
 picker.addEventListener('change',reflect);
 for(const id of ['previous','next','continue','qaTab','englishTab'])$(id)?.addEventListener('click',()=>queueMicrotask(reflect));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
