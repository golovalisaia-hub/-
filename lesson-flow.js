/* A single subject and a single stage at a time. The existing path.js alone
   owns grading, cloud persistence and SEVER integration. This script writes none. */
(()=>{'use strict';
const params=new URLSearchParams(location.search),subject=params.get('subject');
if(params.get('flow')!=='1'||!['qa','english'].includes(subject))return;
const $=id=>document.getElementById(id),lessons=window.AcademyPathLessons;
const names=['Объяснение','Проверка','Практика','Зачёт'];
const descriptions=['Прочитай объяснение и разберись с примером. Затем проверь понимание.','Ответь на оба вопроса. Ошибки можно исправить без штрафов.','Выполни самостоятельную работу, сравни с критериями и сохрани в облако.','Пройди отдельную проверку. Зачёт не ставится за чтение или черновик.'];
let stage=0,lastKey='',pending=false;
const create=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text)n.textContent=text;return n;};
const number=()=>Number($('lessonSelect')?.value)||1;
const finalLesson=()=>number()>=lessons[subject].length;
const quizDone=()=>$('stageViewed')?.classList.contains('done')||$('questions')?.querySelectorAll('.choice-note').length===2;
const practiced=()=>$('stagePractised')?.classList.contains('done');
const certified=()=>$('stagePassed')?.classList.contains('done');
const unlocked=n=>n<2||(n===2?quizDone():practiced());
function render(){
 const body=document.querySelector('.lesson-body');if(!body)return;
 const n=number(),key=`${subject}:${n}`;if(key!==lastKey){lastKey=key;stage=0;}
 const item=lessons?.[subject]?.[n-1];
 $('flowCourse').textContent=subject==='qa'?'◈ QA · Тестирование':'◎ English · Английский';
 $('flowBack').href=`courses.html?subject=${subject}`;
 $('flowTitle').textContent=`Урок ${String(n).padStart(2,'0')} · ${item?.title||'Тема'}`;
 $('flowLead').textContent=descriptions[stage];
 if(item){$('lessonTitle').textContent=item.title;
  for(const option of $('lessonSelect').options){const i=Number(option.value);option.textContent=`${String(i).padStart(2,'0')} · ${lessons[subject]?.[i-1]?.title||'Урок'}`;}}
 const theory=body.querySelector(':scope > .step:not(.practice-step)');
 const practice=body.querySelector(':scope > .practice-step:not(#aiTutorCallout):not(#mentorCallout):not(#sandboxCallout)');
 const shown=[
  [theory,body.querySelector(':scope > .example-details'),$('aiTutorCallout')],
  [body.querySelector(':scope > .quiz')],
  [practice,$('sandboxCallout'),body.querySelector(':scope > .response'),$('stageTrack')],
  [body.querySelector(':scope > .exam'),$('mentorCallout'),$('stageTrack')]
 ][stage];
 for(const el of body.children){
  if(el.id==='subjectLabel'||el.id==='topic')continue;
  el.hidden=!shown.includes(el)||(el.id==='sandboxCallout'||el.id==='mentorCallout')&&subject!=='qa';
 }
 const marks=[false,Boolean(quizDone()),Boolean(practiced()),Boolean(certified())];
 for(const [i,button] of [...$('flowSteps').children].entries()){
  button.disabled=!unlocked(i);button.setAttribute('aria-current',i===stage?'step':'false');button.dataset.done=String(i>0&&marks[i]);
 }
 $('flowPrev').disabled=stage===0;
 $('flowNext').textContent=stage===3?(finalLesson()?'К списку уроков →':'Следующий урок →'):`Дальше · ${names[stage+1]} →`;
 $('flowNext').disabled=stage===3?!certified():!unlocked(stage+1);
 $('flowInfo').textContent=stage===0?'Чтение не засчитывается автоматически: после объяснения ответь на два вопроса.':
 stage===1&&!quizDone()?'Для перехода к практике нужны два верных ответа. Ты можешь вернуться к теории.':
 stage===2&&!practiced()?'Чтобы открыть зачёт, войди в Academy и дождись подтверждения сохранения практики облаком.':
 stage===3&&!certified()?'Сдай зачёт самостоятельно. Другие темы можно открыть через список уроков сверху.':
 stage===3&&finalLesson()?'Последний урок этого предмета завершён. Вернись к списку уроков, чтобы выбрать следующий шаг.':
 stage===3?'Зачёт сохранён. Можно переходить к следующей теме.':'Продолжай в удобном темпе.';
}
function queue(){if(pending)return;pending=true;queueMicrotask(()=>{pending=false;render();});}
function go(target){
 if(target<0||target>3)return;
 if(!unlocked(target)){$('flowInfo').textContent=target===2?'Сначала правильно ответь на оба вопроса.':'Сначала сохрани практику и дождись подтверждения облака.';return;}
 stage=target;render();document.querySelector('.lesson-card')?.scrollIntoView({block:'start',behavior:'instant'});
}
function init(){
 const card=document.querySelector('.lesson-card'),body=document.querySelector('.lesson-body');if(!card||!body||!lessons?.[subject])return;
 document.body.classList.add('guided-lesson');
 const css=document.createElement('link');css.rel='stylesheet';css.href='lesson-flow.css?v=1';document.head.append(css);
 const head=create('section','flow-heading'),back=create('a','flow-back','← Все предметы и уроки');back.id='flowBack';
 const course=create('span','flow-course');course.id='flowCourse';
 const title=create('h2');title.id='flowTitle';const lead=create('p');lead.id='flowLead';head.append(back,course,title,lead);card.prepend(head);
 const nav=create('nav','flow-steps');nav.id='flowSteps';nav.setAttribute('aria-label','Этапы занятия');
 names.forEach((text,i)=>{const button=create('button','',`${i+1}. ${text}`);button.type='button';button.addEventListener('click',()=>go(i));nav.append(button);});
 card.querySelector('.lesson-toolbar')?.after(nav);
 const controls=create('div','flow-controls'),prev=create('button','flow-secondary','← Назад'),next=create('button','flow-primary');
 prev.id='flowPrev';next.id='flowNext';prev.type=next.type='button';prev.addEventListener('click',()=>go(stage-1));
 next.addEventListener('click',()=>{
  if(stage!==3){go(stage+1);return;}
  if(!certified())return;
  if(finalLesson()){location.assign($('flowBack').href);return;}
  $('next').click();stage=0;queue();document.querySelector('.lesson-card')?.scrollIntoView({block:'start',behavior:'instant'});
 });
 controls.append(prev,next);const info=create('p','flow-info');info.id='flowInfo';card.append(controls,info);
 for(const id of ['topic','quizStatus','stageViewed','stagePractised','stagePassed']){
  const node=$(id);if(!node)continue;
  const isStage=id.startsWith('stage');new MutationObserver(queue).observe(node,isStage?{attributes:true,attributeFilter:['class']}:{childList:true,characterData:true,subtree:true});
 }
 for(const id of ['previous','next','lessonSelect'])$(id)?.addEventListener(id==='lessonSelect'?'change':'click',queue);
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
