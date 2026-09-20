/* Local adaptive practice, not a language model. No user text, passwords or SEVER writes. */
(()=>{'use strict';
const TOTAL=14,STORE='academy-qa-review-v1',DAY=86400000;
const $=id=>document.getElementById(id);
const lessons=window.AcademyPathLessons?.qa,bank=window.AcademyAssessment?.qa;
let state={topics:{}},storageOk=true,card=null;
const date=()=>new Date().toISOString().slice(0,10);
const validLesson=n=>Number.isInteger(n)&&n>=1&&n<=TOTAL;
const entry=n=>state.topics[String(n)]||null;
function load(){
 try{const stored=localStorage.getItem(STORE);if(stored){const data=JSON.parse(stored);if(data&&data.version===1&&data.topics&&typeof data.topics==='object'&&!Array.isArray(data.topics)){
   for(let n=1;n<=TOTAL;n++){const item=data.topics[String(n)];if(item&&typeof item==='object'&&!Array.isArray(item)&&Number.isInteger(item.attempts)&&item.attempts>=0&&Number.isInteger(item.lastCase)&&item.lastCase>=0&&item.lastCase<=2&&typeof item.dueAt==='string'&&Number.isFinite(Date.parse(item.dueAt))){
     state.topics[String(n)]={attempts:Math.min(item.attempts,100000),streak:Number.isInteger(item.streak)?Math.max(0,Math.min(4,item.streak)):0,lastCase:item.lastCase,dueAt:item.dueAt,lastDay:typeof item.lastDay==='string'?item.lastDay:'',lastIndependentDay:typeof item.lastIndependentDay==='string'?item.lastIndependentDay:'',lastResult:['independent','assisted','wrong'].includes(item.lastResult)?item.lastResult:'wrong'};
   }}
 }}}catch{storageOk=false;}
}
function persist(){if(!storageOk)return;try{localStorage.setItem(STORE,JSON.stringify({version:1,topics:state.topics}));}catch{storageOk=false;}}
const due=n=>Boolean(entry(n))&&Date.parse(entry(n).dueAt)<=Date.now();
function nextDue(){return Array.from({length:TOTAL},(_,i)=>i+1).filter(due).sort((a,b)=>Date.parse(entry(a).dueAt)-Date.parse(entry(b).dueAt))[0]||null;}
function readable(timestamp){return new Date(timestamp).toLocaleDateString('ru-RU',{day:'numeric',month:'long'});}
function summary(){
 const records=Object.values(state.topics),dueTopics=Array.from({length:TOTAL},(_,i)=>i+1).filter(due);
 $('dueCount').textContent=String(dueTopics.length);
 $('attemptCount').textContent=String(records.reduce((sum,topic)=>sum+topic.attempts,0));
 const last=records.length?records.reduce((min,topic)=>Date.parse(topic.dueAt)<Date.parse(min.dueAt)?topic:min):null;
 $('summary').textContent=storageOk?'Повторение основано на твоих ответах на этом устройстве.':'Хранилище браузера недоступно: ответы работают сейчас, но могут исчезнуть после закрытия страницы.';
 $('dueButton').disabled=dueTopics.length===0;
 $('recommendation').textContent=dueTopics.length?`Сегодня стоит повторить: «${lessons[dueTopics[0]-1].title}». Ошибки не скрываются.`:last?`На сегодня запланированных повторений нет. Следующая проверка — ${readable(last.dueAt)}. Любую тему можно открыть вручную.`:'Начни с первого изученного урока: ответь без подсказки и посмотри объяснение.';
 for(const option of $('lessonPick').options){const n=Number(option.value);option.textContent=`${String(n).padStart(2,'0')} · ${lessons[n-1].title}${due(n)?' · повторить':''}`;}
}
function updateUrl(n){const target=new URL(location.href);target.searchParams.set('lesson',String(n));history.replaceState(null,'',target.pathname+target.search+target.hash);}
function chooseTopic(n){if(!validLesson(n))return;
 const previous=entry(n),idx=previous?(previous.lastCase+1)%3:0;
 card={n,idx,selected:null,hints:0,answered:false};
 $('lessonPick').value=String(n);$('lessonLink').href=`path.html?lesson=${n}&subject=qa`;updateUrl(n);
 $('reason').value='';$('reason').disabled=false;$('check').disabled=true;$('unknown').disabled=false;$('hint').disabled=false;
 $('hint').textContent='Нужна подсказка';$('hintBox').hidden=true;$('hintBox').textContent='';$('result').hidden=true;$('result').className='result';$('result').replaceChildren();$('next').hidden=true;
 $('lessonBadge').textContent=`УРОК ${String(n).padStart(2,'0')} / ${TOTAL}`;$('cardBadge').textContent=`ЗАДАЧА ${idx+1} / 3`;
 $('exerciseTitle').textContent=lessons[n-1].title;$('prompt').textContent=bank[n-1].cases[idx][0];
 const options=bank[n-1].cases[idx][1],choices=$('choices');choices.replaceChildren();
 options.forEach((value,i)=>{
   const button=document.createElement('button');button.type='button';button.className='choice';button.textContent=`${i+1}. ${value}`;button.setAttribute('aria-pressed','false');
   button.addEventListener('click',()=>{if(card.answered)return;card.selected=i;
      for(const el of choices.children)el.setAttribute('aria-pressed',String(el===button));$('check').disabled=false;
   });choices.append(button);
 });
 summary();
}
function hint(){if(!card||card.answered||card.hints>=2)return;
 card.hints++;
 const text=card.hints===1?'Подсказка 1: отдели то, что требует спецификация, от того, что ты лишь предполагаешь. Сформулируй проверяемый результат.':`Подсказка 2 · объяснение темы: ${lessons[card.n-1].theory}\n\nРазобранный пример: ${lessons[card.n-1].example}`;
 $('hintBox').textContent=text;$('hintBox').hidden=false;
 $('hint').textContent=card.hints===1?'Ещё одна подсказка':'Подсказки закончились';$('hint').disabled=card.hints===2;
}
function submit(unknown=false){if(!card||card.answered||(!unknown&&card.selected===null))return;
 const {n,idx}=card,question=bank[n-1].cases[idx],correct=!unknown&&card.selected===question[2],independent=correct&&card.hints===0;
 const prev=entry(n),today=date();
 /* A repeated correct answer on the SAME DAY never advances the interval. */
 const streak=independent?(prev?.lastIndependentDay===today?Math.max(1,prev.streak):Math.min(4,(prev?.streak||0)+1)):0;
 const interval=independent?[1,3,7,14][streak-1]:1;
 const dueAt=new Date(Date.now()+interval*DAY).toISOString();
 state.topics[String(n)]={attempts:(prev?.attempts||0)+1,streak,lastCase:idx,dueAt,lastDay:today,lastIndependentDay:independent?today:(prev?.lastIndependentDay||''),lastResult:independent?'independent':correct?'assisted':'wrong'};
 persist();card.answered=true;
 for(const button of $('choices').children)button.disabled=true;
 $('reason').disabled=true;$('hint').disabled=true;$('unknown').disabled=true;$('check').disabled=true;$('next').hidden=false;
 const result=$('result');result.replaceChildren();result.hidden=false;result.className=`result${correct?'':' bad'}`;
 const head=document.createElement('strong');head.textContent=independent?'✓ Самостоятельный ответ верный.':correct?'✓ Верно с подсказкой — повторим позже.':'Пока неверно или ответ неизвестен — разберём без штрафа.';
 const correctLine=document.createElement('p');correctLine.textContent=`Проверяемый ответ: ${question[1][question[2]]}`;
 const why=document.createElement('p');why.textContent=`Почему: ${question[3]}`;
 const tomorrow=document.createElement('p');tomorrow.textContent=`Следующее повторение: ${readable(dueAt)}. ${independent?'Зачёт и облачный прогресс этим ответом не меняются.':'Повтори объяснение урока и попробуй другую задачу.'}`;
 const study=document.createElement('a');study.href=`path.html?lesson=${n}&subject=qa`;study.textContent='Вернуться к объяснению →';
 result.append(head,correctLine,why,tomorrow,study);
 summary();
}
function next(){if(!card||!card.answered)return;
 const scheduled=nextDue();const target=scheduled??(card.n%TOTAL+1);chooseTopic(target);
}
function init(){if(!lessons||!bank||lessons.length!==TOTAL||bank.length!==TOTAL||bank.some(item=>!Array.isArray(item.cases)||item.cases.length!==3)){
 $('summary').textContent='Не загрузились материалы повторения. Обнови страницу.';for(const id of ['dueButton','hint','check','unknown','next'])$(id).disabled=true;return;
 }
 for(let n=1;n<=TOTAL;n++){const option=document.createElement('option');option.value=String(n);$('lessonPick').append(option);}
 load();$('lessonPick').addEventListener('change',event=>chooseTopic(Number(event.target.value)));
 $('hint').addEventListener('click',hint);$('check').addEventListener('click',()=>submit(false));$('unknown').addEventListener('click',()=>submit(true));$('next').addEventListener('click',next);
 $('dueButton').addEventListener('click',()=>{const n=nextDue();if(n)chooseTopic(n);});
 const requested=Number(new URLSearchParams(location.search).get('lesson'));
 chooseTopic(validLesson(requested)?requested:nextDue()||1);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();