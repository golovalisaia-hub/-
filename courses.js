/* Subject-first catalogue. Reading these lists never creates progress or requests the API. */
(()=>{'use strict';
const lessons=window.AcademyPathLessons;
function render(subject){
 const root=document.getElementById(subject+'List');
 const items=lessons?.[subject];
 if(!root||!Array.isArray(items)||items.length!==14){if(root)root.textContent='Не удалось загрузить уроки. Обнови страницу.';return;}
 const details=root.closest('details');
 const card=details?.closest('.course-card');
 if(details&&card){
  const label=details.querySelector('summary');
  if(label)label.firstChild.textContent='Посмотреть все 14 уроков '+(subject==='qa'?'QA':'английского')+' ';
  const start=document.createElement('a');start.className='course-first';
  start.href=`path.html?subject=${subject}&lesson=1&flow=1`;
  start.textContent=subject==='qa'?'Начать QA · Урок 01 →':'Начать English · Урок 01 →';
  const hint=document.createElement('small');hint.className='course-start-hint';
  hint.textContent='Сначала объяснение и пример. Затем вопросы, самостоятельное задание и зачёт.';
  details.before(start,hint);
 }
 for(const [index,item] of items.entries()){
  const anchor=document.createElement('a');anchor.href=`path.html?subject=${subject}&lesson=${index+1}&flow=1`;
  const number=document.createElement('span');number.className='course-lesson-num';number.textContent=String(index+1).padStart(2,'0');
  const heading=document.createElement('span');heading.className='course-lesson-title';heading.textContent=item.title;
  const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';
  anchor.append(number,heading,arrow);root.append(anchor);
 }
}
function init(){render('qa');render('english');
 const params=new URLSearchParams(location.search),selected=params.get('subject');
 if(['qa','english'].includes(selected)){
  const box=document.getElementById(selected+'Lessons');
  if(params.get('list')==='1')box.open=true;
  const card=box.closest('.course-card');card?.scrollIntoView({block:'start'});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
