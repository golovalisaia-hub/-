/* Focused reading -> comprehension -> practice -> assessment. Navigation only;
   path.js remains sole authority for answers, cloud writes, grades and SEVER. */
(()=>{'use strict';
const params=new URLSearchParams(location.search);
if(params.get('flow')!=='1')return;
const subject=params.get('subject');
if(!['qa','english'].includes(subject))return;
const $=id=>document.getElementById(id);
const lessons=window.AcademyPathLessons;
const names=['Изучи тему','Проверь понимание','Сделай практику','Сдай зачёт'];
const descriptions=['Прочитай объяснение и разберись с примером. Затем ответь на два вопроса.','Ответь на оба вопроса. Если ошибся, вернись к объяснению — попытки не штрафуются.','Выполни задание сам, сравни с критериями и сохрани практику в облако.','Пройди отдельную проверку. Она не заменяет практику и не ставится автоматически.'];
let stage=0,lastKey='',renderQueued=false;
const create=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;};
const lessonNumber=()=>Number($('lessonSelect')?.value)||1;
const quizDone=()=>Boolean($('stageViewed')?.classList.contains('done'))||($('questions')?.querySelectorAll('.choice-note').length===2);
const practiced=()=>Boolean($('stagePractised')?.classList.contains('done'));
const certified=()=>Boolean($('stagePassed')?.classList.contains('done'));
const allowed=target=>target<2||(target===2?quizDone():practiced());
function render(){
 const body=document.querySelector('.lesson-body');if(!body)return;
 const number=lessonNumber(),key=`${subject}:${number}`;
 if(key!==lastKey){stage=0;lastKey=key;}
 const lesson=lessons?.[subject]?.[number-1];
 $('flowCourse').textContent=subject==='qa'?'◈ QA · Тестирование':'◎ English · Английский';
 $('flowBack').href=`courses.html?subject=${subject}`;
 $('flowTitle').textContent=`Урок ${String(number).padStart(2,'0')} · ${lesson?.title||'Тема'}`;
 $('flowLead').textContent=descriptions[stage];
 if(lesson){$('lessonTitle').textContent=lesson.title;
  for(const option of $('lessonSelect').options){const n=Number(option.value),title=lessons[subject]?.[n-1]?.title||'Урок';option.textContent=`${String(n).padStart(2,'0')} · ${title}${option.value===String(number)?'':''}`;}
 }
 const theory=body.querySelector(':scope > .step:not(.practice-step)');
 const practice=body.querySelector(':scope > .practice-step:not(#aiTutorCallout):not(#mentorCallout):not(#sandboxCallout)');
 const show=[
  [theory,body.querySelector(':scope > .example-details'),$('aiTutorCallout')],
  [body.querySelector(':scope > .quiz')],
  [practice,$('sandboxCallout'),body.querySelector(':scope > .response'),$('stageTrack')],
  [body.querySelector(':scope > .exam'),$('mentorCallout'),$('stageTrack')]
 ][stage];
 for(const node of body.children){
  if(['subjectLabel','topic'].includes(node.id))continue;
  node.hidden=!show.includes(node)||node.id==='sandboxCallout'&&subject!=='qa'||node.id==='mentorCallout'&&subject!=='qa';
 }
 const done=[true,quizDone(),practiced(),certified()];
 for(const [index,button] of [...$('flowSteps').children].entries()){
  button.disabled=!allowed(index);button.setAttribute('aria-current',index===stage?'step':'false');
  button.dataset.done=String(index>0&&done[index]);
 }
 $('flowPrev').disabled=stage===0;
 $('flowNext').textContent=stage===3?'Следующий урок →':`Дальше · ${names[stage+1]} →`;
 $('flowNext').disabled=stage===3?(number===14||!certified()):!allowed(stage+1);
 const notice=$('flowInfo');
 notice.textContent=stage===0?'Твоя работа не засчитывается за одно чтение. Сначала проверь понимание.':
 stage===1&&!quizDone()?'Для перехода к практике нужны два верных ответа. Можно возвращаться к теории.':
 stage===2&&!practiced()?'Запись практики подтвердит облако. Если ты гость, войди в аккаунт перед сохранением.':
 stage===3&&!certified()?'Зачёт нужно пройти самостоятельно. Следующий урок также можно выбрать в списке сверху.':
 stage===3?'Зачёт подтверждён. Можешь перейти к следующей теме.':'Продолжай в своём темпе.';
 notice.hidden=false;
}
function queue(){if(renderQueued)return;renderQueued=true;queueMicrotask(()=>{renderQueued=false;render();});}
function go(next){
 if(next<0||next>3)return;
 if(!allowed(next)){const note=$('flowInfo');note.textContent=next===2?'Сначала ответь правильно на два вопроса выше.':'Сначала зафиксируй практику в облаке. Без подтверждения зачёт не откроется.';note.hidden=false;return;}
 stage=next;render();document.querySelector('.lesson-card')?.scrollIntoView({block:'start',behavior:'instant'});
}
function init(){
 const card=document.querySelector('.lesson-card'),body=document.querySelector('.lesson-body');
 if(!card||!body||!lessons?.[subject])return;
 document.body.classList.add('guided-lesson');
 const style=document.createElement('link');style.rel='stylesheet';style.href='lesson-flow.css?v=1';document.head.append(style);
 const intro=create('section','flow-heading');intro.id='flowHeading';
 const back=create('a','flow-back','← Все предметы и уроки');back.id='flowBack';back.href=`courses.html?subject=${subject}`;
 const course=create('span','flow-course');course.id='flowCourse';
 const title=create('h2');title.id='flowTitle';
 const lead=create('p');lead.id='flowLead';intro.append(back,course,title,lead);
 card.prepend(intro);
 const nav=create('nav','flow-steps');nav.id='flowSteps';nav.setAttribute('aria-label','Этапы занятия');
 names.forEach((name,index)=>{const button=create('button','',`${index+1}. ${name}`);button.type='button';button.addEventListener('click',()=>go(index));nav.append(button);});
 const toolbar=card.querySelector('.lesson-toolbar');toolbar?.after(nav);
 const controls=create('div','flow-controls'),prev=create('button','flow-secondary','← Назад'),next=create('button','flow-primary');
 prev.id='flowPrev';next.id='flowNext';prev.type=next.type='button';prev.addEventListener('click',()=>go(stage-1));
 next.addEventListener('click',()=>{if(stage===3){if(lessonNumber()>=14||!certified())return;$('next').click();stage=0;queue();document.querySelector('.lesson-card')?.scrollIntoView({block:'start',behavior:'instant'});}else go(stage+1);});
 controls.append(prev,next);const note=create('p','flow-info');note.id='flowInfo';card.append(controls,note);
 // Observe only authoritative cloud/quiz state; never write it from the tour.
 for(const id of ['topic','quizStatus','stageViewed','stagePractised','stagePassed']){
  const node=$(id);if(!node)continue;
  new MutationObserver(queue).observe(node,{childList:true,characterData:true,subtree:id==='quizStatus',attributes:id.startsWith('stage'),attributeFilter:['class']});
 }
 for(const id of ['previous','next','lessonSelect'])$(id)?.addEventListener(id==='lessonSelect'?'change':'click',queue);
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
