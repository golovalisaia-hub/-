/* Read-only curriculum UI: NEVER infer grades from dates, mutate progress or touch SEVER. */
(()=>{'use strict';
const plan=window.AcademySixMonths;
const create=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;};
function link(subject,n){
 const a=create('a','roadmap-lesson-link',`${subject==='qa'?'QA':'English'} · урок ${String(n).padStart(2,'0')} →`);
 a.href=`path.html?subject=${subject}&lesson=${n}&flow=1`;
 return a;
}
function published(week){
 const box=create('div','roadmap-published');
 if(!week.qa||!week.english){box.append(create('p','roadmap-unpublished','Пока только учебный план. Уроки этой недели ещё не опубликованы.'));return box;}
 const allDeep=week.qa[1]<=6&&week.english[1]<=5;
 box.append(create('p','roadmap-published-title',allDeep?'Опубликованные уроки · расширены, но не сертифицированы':'Опубликованные уроки · часть материалов ещё краткая'));
 const links=create('div','roadmap-lesson-links');
 for(const [subject,range] of [['qa',week.qa],['english',week.english]]){
  for(let n=range[0];n<=range[1];n++)links.append(link(subject,n));
 }
 box.append(links);return box;
}
function renderWeek(week,index,phase){
 const number=index+1,article=create('article','roadmap-week');article.id=`week-${number}`;
 const head=create('div','roadmap-week-head');
 const title=create('h3','',`Неделя ${String(number).padStart(2,'0')} · ${week.title}`);
 const label=create('span',week.qa?'roadmap-status available':'roadmap-status planned',week.qa?'Есть уроки':'В плане');
 head.append(title,label);article.append(head);
 article.append(create('p','roadmap-track',phase.track));
 const list=create('ol','roadmap-sessions');list.setAttribute('aria-label',`Пять занятий недели ${number}`);
 week.sessions.forEach((session,i)=>list.append(create('li','',session)));
 article.append(list);
 const outcome=create('p','roadmap-outcome');outcome.append(create('strong','','Результат недели: '),document.createTextNode(week.outcome));article.append(outcome);
 article.append(published(week));
 if(number===16)article.append(create('p','roadmap-gate','Переход к основному Python не определяется календарём: нужна самостоятельная контрольная QA. При пробелах этот этап можно продлить.'));
 if(number===26)article.append(create('p','roadmap-gate','Эта неделя — резерв для исправлений и повторения. Диплом, работа или уровень языка автоматически не присваиваются.'));
 return article;
}
function render(){
 const root=document.getElementById('roadmapStages');if(!root)return;
 const valid=Array.isArray(plan?.phases)&&plan.phases.length===6&&Array.isArray(plan?.weeks)&&plan.weeks.length===26&&
 plan.weeks.every(week=>week&&typeof week.title==='string'&&typeof week.outcome==='string'&&Array.isArray(week.sessions)&&week.sessions.length===5&&week.sessions.every(value=>typeof value==='string'&&value.trim()))&&
 plan.phases.every(phase=>Array.isArray(phase.range)&&phase.range[0]<=phase.range[1]);
 if(!valid){root.textContent='Программа временно недоступна: данные учебного маршрута неполные. Вернись к предметам.';return;}
 root.replaceChildren();
 const jumps=create('nav','roadmap-jumps');jumps.setAttribute('aria-label','Перейти к этапу');
 const stages=create('div','roadmap-stages');
 plan.phases.forEach((phase,i)=>{
  const a=create('a','','Этап '+(i+1));a.href=`#phase-${i+1}`;a.setAttribute('aria-label',`Этап ${i+1}: ${phase.name}`);jumps.append(a);
  const details=create('details','roadmap-phase');details.id=`phase-${i+1}`;details.open=i===0;
  const summary=create('summary','roadmap-phase-summary');
  const number=create('span','roadmap-phase-number',String(i+1).padStart(2,'0'));
  const info=create('span','roadmap-phase-info');info.append(create('strong','',phase.name),create('small','',`Недели ${phase.weeks} · ${phase.track}`));
  const chevron=create('span','roadmap-phase-arrow','↓');chevron.setAttribute('aria-hidden','true');
  summary.append(number,info,chevron);details.append(summary);
  const body=create('div','roadmap-phase-content');
  const gate=create('p','roadmap-stage-check');gate.append(create('strong','','Проверка этапа: '),document.createTextNode(phase.gate));body.append(gate);
  const weeks=create('div','roadmap-week-grid');
  for(let n=phase.range[0];n<=phase.range[1];n++)weeks.append(renderWeek(plan.weeks[n-1],n-1,phase));
  body.append(weeks);details.append(body);stages.append(details);
 });
 root.append(jumps,stages);
 const requested=Number(new URLSearchParams(location.search).get('week'));
 if(Number.isInteger(requested)&&requested>=1&&requested<=26){
  const index=plan.phases.findIndex(phase=>requested>=phase.range[0]&&requested<=phase.range[1]);
  const details=document.getElementById(`phase-${index+1}`);details.open=true;
  // No auto-scroll: opening the page should not jump away from the title without consent.
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
