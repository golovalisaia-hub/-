/* QA-first learning path. Only paired, server-confirmed QA + English closes its linked SEVER calendar task. */
(()=>{'use strict';
const API='https://vdhazibkfpgclcwyvvbi.supabase.co';
const KEY='sb_publishable_eRp5yJyhKF9EBTDdhi77_Q_iGaZJaUj';
const $=id=>document.getElementById(id);
/* Подпись кнопки меняется, иконка остаётся на месте. */
const setLabel=(node,text)=>{const span=node.querySelector('.btn-label');(span||node).textContent=text;};
const setIcon=(node,glyph)=>{const span=node.querySelector('.btn-icon');if(span)span.textContent=glyph;};
const iconButton=(glyph,text,className)=>{const b=document.createElement('button');b.type='button';if(className)b.className=className;const i=document.createElement('span');i.className='btn-icon';i.setAttribute('aria-hidden','true');i.textContent=glyph;const l=document.createElement('span');l.className='btn-label';l.textContent=text;b.append(i,l);return b;};
const program=window.AcademyPathLessons;
const SUBJECTS={qa:'qa_foundation',english:'english_foundation'};
const total=14;
let db=null,user=null,ready=false,lesson=1,subject='qa',saving=false;
/* The cloud columns that store зачёт evidence are optional: until the migration
   academy_three_stage_assessment is applied the page stays usable and says so. */
let schemaReady=true;
const exam=window.AcademyAssessment;
const progress=new Map(),passed=new Map(),examState=new Map();
const key=(n,s)=>`${SUBJECTS[s]}:${n}`;
const localKey=(n,s)=>`academy-path-draft-v1:${user?.id||'preview'}:${key(n,s)}`;
function status(text,type=''){$('cloudStatus').textContent=text;$('cloudStatus').className=`status ${type}`;}
function feedback(text,type=''){$('feedback').textContent=text;$('feedback').className=`feedback ${type}`;}
function localSave(){try{localStorage.setItem(localKey(lesson,subject),$('answer').value);}catch{feedback('Не получилось сохранить резервный черновик в браузере. Скопируй текст вручную.','bad');}}
function localLoad(n,s){try{return localStorage.getItem(localKey(n,s));}catch{return null;}}
function localClear(n,s){try{localStorage.removeItem(localKey(n,s));}catch{}}
const record=(n,s)=>progress.get(key(n,s));
/* Three explicit stages. Each one needs its own evidence; none of them is granted
   just because text was saved. */
const certified=(n,s)=>Boolean(record(n,s)?.certified_at);
const practiced=(n,s)=>record(n,s)?.status==='practiced';
const acquainted=(n,s)=>Number(record(n,s)?.quiz_score)===2||practiced(n,s);
const pairDone=n=>practiced(n,'qa')&&practiced(n,'english');
const qaCertified=()=>Array.from({length:total},(_,i)=>i+1).filter(n=>certified(n,'qa')).length;
function examStateFor(n,s){
 const id=key(n,s);
 if(!examState.has(id))examState.set(id,{cases:new Map(),rubric:new Set(),skills:{}});
 return examState.get(id);
}
function progressUI(){
 const count=Array.from({length:total},(_,i)=>i+1).filter(pairDone).length;
 $('progressNumber').textContent=`${count} / ${total}`;$('heroCount').textContent=`${count} из ${total}`;
 $('progressFill').style.width=`${count/total*100}%`;
 $('progressDetail').textContent=`Практика QA: ${Array.from({length:total},(_,i)=>i+1).filter(n=>practiced(n,'qa')).length}/14 · English: ${Array.from({length:total},(_,i)=>i+1).filter(n=>practiced(n,'english')).length}/14`;
 $('qaMark').textContent=practiced(lesson,'qa')?'✓':'○';$('englishMark').textContent=practiced(lesson,'english')?'✓':'○';
 $('resultTitle').textContent=pairDone(lesson)?'Обе практики зафиксированы':'Два предмета — один понятный шаг';
 $('resultText').textContent=pairDone(lesson)?'QA и английский подтверждены: связанная задача Academy в календаре SEVER закрыта автоматически. Это отметка практики, а не экзамен.':'Выполни QA и English в любом порядке. Только после сохранения обеих практик связанная задача SEVER закроется автоматически. Python не требуется.';
 $('continue').hidden=!pairDone(lesson)||lesson===total;
 for(const option of $('lessonSelect').options){const n=Number(option.value);option.textContent=`${String(n).padStart(2,'0')} · ${pairDone(n)?'✓ ':''}${program.qa[n-1].title}`;}
}
function choiceButton(text,optionIndex,correctIndex,quizId){
 const button=document.createElement('button');button.type='button';button.textContent=text;
 if(passed.get(key(lesson,subject))?.has(quizId)){
   button.disabled=true;if(optionIndex===correctIndex)button.classList.add('correct');
 }else button.addEventListener('click',()=>{
   if(optionIndex===correctIndex){
     const current=passed.get(key(lesson,subject))||new Set();current.add(quizId);passed.set(key(lesson,subject),current);
     feedback('Верно. Продолжай разбирать тему.','good');renderQuiz();
     if(current.size===2){markViewed(lesson,subject);renderStages();}
   }else{button.classList.add('incorrect');feedback('Пока неверно. Вернись к объяснению и попробуй другой вариант.','bad');}
 });
 return button;
}
function renderQuiz(){
 const root=$('questions');root.replaceChildren();
 const questions=program[subject][lesson-1].quiz;
 const done=passed.get(key(lesson,subject))?.size||0;
 for(let i=0;i<questions.length;i++){
   const [prompt,options,answer,explanation]=questions[i];
   const section=document.createElement('div');section.className='question';
   const heading=document.createElement('strong');heading.textContent=`${i+1}. ${prompt}`;section.append(heading);
   const choices=document.createElement('div');choices.className='choices';
   options.forEach((name,index)=>choices.append(choiceButton(name,index,answer,i)));
   section.append(choices);
   if(passed.get(key(lesson,subject))?.has(i)){
     const note=document.createElement('p');note.className='choice-note';note.textContent=`✓ ${explanation}`;section.append(note);
   }
   root.append(section);
 }
 $('quizStatus').textContent=done===2?'✓ Два вопроса пройдены. Теперь выполни самостоятельную работу.':`Верные ответы: ${done} / 2. Ошибки можно исправлять без штрафа.`;
}
/* ---- Зачёт: objective checks, an explicit rubric and a kept attempt history ---- */
const speechReady=()=>'speechSynthesis'in window&&'SpeechSynthesisUtterance'in window;
/* Телефоны и macOS сами подставляют типографские кавычки: I’m, don’t. Без этого
   правильный ответ ученика считался бы ошибкой. skills.js делает то же самое. */
const normalise=text=>String(text||'').toLowerCase()
 .replace(/[\u2018\u2019\u02bc\u0060\u00b4]/g,"'")
 .replace(/[\u201c\u201d\u201e]/g,'"')
 .replace(/[.,!?;:'"\u00ab\u00bb]/g,'')
 .replace(/\s+/g,' ').trim();
function speak(phrase){
 if(!speechReady())return;
 window.speechSynthesis.cancel();
 const voice=new SpeechSynthesisUtterance(phrase);voice.lang='en-US';voice.rate=.85;window.speechSynthesis.speak(voice);
}
/* Одно правило на все три места: раньше обработчик поля письма пересчитывал его
   без schemaReady и включал кнопку, которая не могла записать зачёт. */
const examSubmitLocked=(busy=saving)=>busy||!ready||certified(lesson,subject)||!schemaReady;
function examVerdict(n,s){
 const data=exam?.[s]?.[n-1],state=examStateFor(n,s);
 if(!data)return {ok:false,reason:'Материалы зачёта для этого урока не загрузились.'};
 if(s==='qa'){
   const answered=data.cases.every((item,index)=>state.cases.get(index)===item[2]);
   if(!answered)return {ok:false,reason:'Все три задачи зачёта должны быть решены верно. Разбери объяснение и попробуй снова.'};
   if(state.rubric.size!==data.rubric.length)return {ok:false,reason:'Отметь каждый пункт рубрики только после того, как он действительно выполнен в твоей работе.'};
   return {ok:true,evidence:{cases:data.cases.map((item,index)=>state.cases.get(index)===item[2]),rubric:data.rubric.slice()}};
 }
 const skills=state.skills;
 const missing=['reading','writing','speaking'].filter(skill=>!skills[skill]);
 if(missing.length)return {ok:false,reason:'Зачёт по английскому требует чтения, письма и произнесения вслух. Не отмечено: '+missing.join(', ')+'.'};
 if(!skills.listening&&speechReady())return {ok:false,reason:'Осталось аудирование: включи фразу и выбери услышанное.'};
 return {ok:true,evidence:{skills:{reading:true,writing:true,speaking:'самооценка',listening:skills.listening?true:'не проверено: устройство без синтеза речи'}}};
}
function examLine(label,ok){
 const line=document.createElement('p');line.className=`exam-line${ok?' done':''}`;line.textContent=`${ok?'✓':'○'} ${label}`;return line;
}
function renderExamQa(root,data,state,locked){
 data.cases.forEach((item,index)=>{
   const [prompt,options,answer,why]=item;
   const block=document.createElement('div');block.className='question';
   const heading=document.createElement('strong');heading.textContent=`${index+1}. ${prompt}`;block.append(heading);
   const choices=document.createElement('div');choices.className='choices';
   options.forEach((name,option)=>{
     const button=document.createElement('button');button.type='button';button.textContent=name;
     const chosen=state.cases.get(index);
     if(chosen===option)button.classList.add(option===answer?'correct':'incorrect');
     button.disabled=locked;
     button.addEventListener('click',()=>{state.cases.set(index,option);renderExam();});
     choices.append(button);
   });
   block.append(choices);
   if(state.cases.has(index)){
     const note=document.createElement('p');note.className='choice-note';
     note.textContent=state.cases.get(index)===answer?`✓ ${why}`:`Пока неверно. ${why}`;block.append(note);
   }
   root.append(block);
 });
 const rubric=document.createElement('div');rubric.className='rubric';
 const title=document.createElement('p');title.className='eyebrow';title.textContent='РУБРИКА САМОПРОВЕРКИ';rubric.append(title);
 data.rubric.forEach((item,index)=>{
   const label=document.createElement('label');label.className='confirmation';
   const box=document.createElement('input');box.type='checkbox';box.checked=state.rubric.has(index);box.disabled=locked;
   box.addEventListener('change',()=>{box.checked?state.rubric.add(index):state.rubric.delete(index);renderExam();});
   label.append(box,document.createTextNode(item));rubric.append(label);
 });
 root.append(rubric);
}
function renderExamEnglish(root,data,state,locked){
 const block=(goal,build)=>{
   const section=document.createElement('div');section.className='skill';
   const head=document.createElement('p');head.className='skill-goal';head.textContent=goal;section.append(head);
   build(section);root.append(section);
 };
 block(data.reading.goal,section=>{
   const prompt=document.createElement('p');prompt.className='skill-prompt';prompt.textContent=data.reading.prompt;section.append(prompt);
   const question=document.createElement('strong');question.textContent=data.reading.question;section.append(question);
   const choices=document.createElement('div');choices.className='choices';
   data.reading.options.forEach((name,index)=>{
     const button=document.createElement('button');button.type='button';button.textContent=name;button.disabled=locked;
     if(state.skills.readingChoice===index)button.classList.add(index===data.reading.answer?'correct':'incorrect');
     button.addEventListener('click',()=>{state.skills.readingChoice=index;state.skills.reading=index===data.reading.answer;renderExam();});
     choices.append(button);
   });
   section.append(choices,examLine('Чтение засчитано',Boolean(state.skills.reading)));
 });
 block(data.listening.goal,section=>{
   if(!speechReady()){
     section.append(examLine('Аудирование недоступно: устройство не умеет синтезировать речь. В зачёте будет отмечено «не проверено».',false));
     return;
   }
   const play=iconButton('♬','Прослушать фразу','subtle');play.disabled=locked;
   play.addEventListener('click',()=>speak(data.listening.phrase));
   const question=document.createElement('strong');question.textContent=data.listening.question;
   const choices=document.createElement('div');choices.className='choices';
   data.listening.options.forEach((name,index)=>{
     const button=document.createElement('button');button.type='button';button.textContent=name;button.disabled=locked;
     if(state.skills.listeningChoice===index)button.classList.add(index===data.listening.answer?'correct':'incorrect');
     button.addEventListener('click',()=>{state.skills.listeningChoice=index;state.skills.listening=index===data.listening.answer;renderExam();});
     choices.append(button);
   });
   section.append(play,question,choices,examLine('Аудирование засчитано',Boolean(state.skills.listening)));
 });
 block(data.writing.goal,section=>{
   const task=document.createElement('strong');task.textContent=data.writing.task;section.append(task);
   const field=document.createElement('input');field.type='text';field.className='skill-input';field.value=state.skills.writingText||'';
   field.setAttribute('aria-label',data.writing.task);field.disabled=locked;
   /* Подсказка вместо молчаливого «○»: называет правило, но не готовую фразу,
      и появляется только после реальной попытки. Исправлять ответ можно сколько угодно раз. */
   const hint=document.createElement('p');hint.className='skill-hint';hint.setAttribute('role','status');
   const refreshHint=()=>{
     const typed=normalise(field.value);
     const show=!state.skills.writing&&typed.length>=3&&Boolean(data.writing.hint);
     hint.textContent=show?`Пока не засчитано. ${data.writing.hint}`:'';
     hint.hidden=!show;
   };
   field.addEventListener('input',()=>{
     state.skills.writingText=field.value;
     state.skills.writing=data.writing.accept.includes(normalise(field.value));
     $('examSubmit').disabled=examSubmitLocked();
     const mark=section.querySelector('.exam-line');
     if(mark){mark.textContent=`${state.skills.writing?'✓':'○'} Письмо засчитано`;mark.className=`exam-line${state.skills.writing?' done':''}`;}
     refreshHint();
   });
   section.append(field,examLine('Письмо засчитано',Boolean(state.skills.writing)),hint);
   refreshHint();
 });
 block(data.speaking.goal,section=>{
   const phrase=document.createElement('p');phrase.className='skill-prompt';phrase.textContent=data.speaking.phrase;section.append(phrase);
   if(speechReady()){
     const play=iconButton('♫','Образец произношения','subtle');play.disabled=locked;
     play.addEventListener('click',()=>speak(data.speaking.phrase));section.append(play);
   }
   const label=document.createElement('label');label.className='confirmation';
   const box=document.createElement('input');box.type='checkbox';box.checked=Boolean(state.skills.speaking);box.disabled=locked;
   box.addEventListener('change',()=>{state.skills.speaking=box.checked;renderExam();});
   label.append(box,document.createTextNode('Я произнёс фразу вслух целиком. Это самооценка: произношение здесь никто не проверяет.'));
   section.append(label);
 });
}
function renderExam(){
 const root=$('examBody');if(!root)return;
 root.replaceChildren();
 const data=exam?.[subject]?.[lesson-1],state=examStateFor(lesson,subject),done=certified(lesson,subject);
 $('examIntro').textContent=subject==='qa'
   ?'Три прикладные задачи с одним верным ответом и рубрика по твоей работе. Зачёт не ставится за сохранённый текст.'
   :'По одной измеримой цели на каждый навык CEFR: чтение, аудирование, письмо, говорение. Это учебные цели по дескрипторам Pre-A1/A1, а не присвоение уровня и не экзамен; говорение отмечается как самооценка.';
 if(!data){root.append(examLine('Материалы зачёта не загрузились.',false));$('examSubmit').disabled=true;return;}
 if(subject==='qa')renderExamQa(root,data,state,done);else renderExamEnglish(root,data,state,done);
 const history=record(lesson,subject)?.attempts||[];
 const list=$('examHistory');list.replaceChildren();
 for(const item of history.slice(-10).reverse()){
   const line=document.createElement('li');
   line.textContent=`${new Date(item.at).toLocaleString('ru-RU')} — ${item.ok?'зачёт':'не сдан'}${item.note?`: ${item.note}`:''}`;
   list.append(line);
 }
 $('examHistoryBox').hidden=history.length===0;
 $('examSubmit').disabled=examSubmitLocked();
 setLabel($('examSubmit'),done?'Зачёт сдан':'Сдать зачёт');
 if(done)$('examFeedback').textContent='✓ Зачёт сдан. Переcдавать не нужно; повторить материал можно в любой момент.';
 else if(!schemaReady)$('examFeedback').textContent='Запись зачёта отключена: в облаке нет колонок certified_at, assessment и attempts. Примени миграцию academy_three_stage_assessment.';
 else if(!practiced(lesson,subject))$('examFeedback').textContent='Зачёт открывается после того, как практика зафиксирована.';
}
function renderStages(){
 const map=[['stageViewed',acquainted(lesson,subject)],['stagePractised',practiced(lesson,subject)],['stagePassed',certified(lesson,subject)]];
 for(const [id,done] of map){const node=$(id);if(node)node.className=done?'done':'';}
 const gate=$('stageGate');
 if(gate){
   const count=qaCertified();
   $('gateFill').style.width=`${count/total*100}%`;
   $('gateTag').textContent=count===total?'ОТКРЫВАЕТСЯ':'ЗАКРЫТ';
   $('gateText').textContent=count===total
     ?'Зачёт по всем 14 урокам QA сдан. Материалы этапа 2 (Python + English) ещё не опубликованы: как только они появятся, этап откроется здесь.'
     :`Этап 2 откроется после зачёта по всем 14 урокам QA. Сдано: ${count} из ${total}. Практика без зачёта этап не открывает.`;
 }
}
function showDraftNotice(cloud,draft){
 const differs=draft!==null&&draft!==(cloud?.answer||'');
 $('draftNotice').hidden=!differs;
 $('draftNoticeText').textContent=cloud?'На этом устройстве есть несохранённый текст, отличающийся от облачной версии. Не перезаписывай облако, пока не сравнишь ответы.':'Текст пока есть только на этом устройстве. Сохрани его в облако, чтобы не потерять.';
 $('useCloud').hidden=!cloud;
}
function render(){
 const data=program[subject][lesson-1];if(!data)return;
 $('lessonSelect').value=String(lesson);$('lessonNumber').textContent=String(lesson).padStart(2,'0');
 $('lessonTitle').textContent=program.qa[lesson-1].title;
 $('qaTab').setAttribute('aria-pressed',String(subject==='qa'));$('englishTab').setAttribute('aria-pressed',String(subject==='english'));
 $('subjectLabel').textContent=subject==='qa'?'ТЕСТИРОВАНИЕ · С НУЛЯ':'АНГЛИЙСКИЙ · С НУЛЯ';
 for(const field of ['title','theory','example','practice','criteria']){
   const id=field==='title'?'topic':field;$(id).textContent=data[field];
 }
 $('say').hidden=subject!=='english'||!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window);
 const cloud=record(lesson,subject),draft=localLoad(lesson,subject);
 $('answer').value=draft!==null?draft:(cloud?.answer||'');$('reviewed').checked=false;$('criteriaBox').open=false;
 $('answer').disabled=!ready||saving;
 if(cloud?.quiz_score===2&&!passed.has(key(lesson,subject)))passed.set(key(lesson,subject),new Set([0,1]));
 $('save').disabled=!ready||saving;$('complete').disabled=!ready||saving;
 $('previous').disabled=lesson===1||saving;$('next').disabled=lesson===total||saving;
 showDraftNotice(cloud,draft);
 feedback(cloud?.status==='practiced'?'Практика уже сохранена в облаке. Если сохранить новый черновик, отметка этой практики снимется; календарь обновится соответственно.':'');
 renderQuiz();renderExam();renderStages();progressUI();
}
function navigate(n,s=subject){if(saving||n<1||n>total||!SUBJECTS[s]){if(!saving)$('lessonSelect').value=String(lesson);return;}lesson=n;subject=s;render();}
function lockSaving(locked){
 $('answer').disabled=locked||!ready;
 for(const id of ['qaTab','englishTab','lessonSelect','continue','useCloud'])$(id).disabled=locked;
 $('previous').disabled=locked||lesson===1;$('next').disabled=locked||lesson===total;
 $('save').disabled=locked||!ready;$('complete').disabled=locked||!ready;
 $('examSubmit').disabled=examSubmitLocked(locked);
}
const columns=()=>`user_id,track,lesson_number,answer,quiz_score,status,updated_at${schemaReady?',certified_at,assessment,attempts':''}`;
/* Keep the last 20 attempts: enough to see progress, small enough for one row. */
const history=(stored,entry)=>{
 const kept=Array.isArray(stored?.attempts)?stored.attempts:[];
 return (entry?[...kept,entry]:kept).slice(-20);
};
/* A failed зачёт is part of the record, not something to hide. */
async function pushAttempt(n,s,ok,note){
 const stored=record(n,s);
 if(!schemaReady||!db||!user||!stored)return;
 const payload={user_id:user.id,track:SUBJECTS[s],lesson_number:n,answer:stored.answer,quiz_score:stored.quiz_score,status:stored.status,certified_at:stored.certified_at??null,assessment:stored.assessment??null,attempts:history(stored,{at:new Date().toISOString(),ok,note:note?String(note).slice(0,160):''}),updated_at:new Date().toISOString()};
 try{
   const result=await db.from('academy_path_progress').upsert(payload,{onConflict:'user_id,track,lesson_number'}).select(columns()).single();
   if(!result.error&&result.data)progress.set(key(n,s),result.data);
 }catch(err){console.error('Academy attempt history',err);}
}
/* "Ознакомился" is recorded once both comprehension questions are correct and nothing is stored yet. */
async function markViewed(n,s){
 if(!db||!user||!ready||saving||record(n,s))return;
 const payload={user_id:user.id,track:SUBJECTS[s],lesson_number:n,answer:'',quiz_score:2,status:'viewed',updated_at:new Date().toISOString()};
 if(schemaReady){payload.assessment=null;payload.attempts=[];}
 try{
   const result=await db.from('academy_path_progress').upsert(payload,{onConflict:'user_id,track,lesson_number'}).select(columns()).single();
   if(!result.error&&result.data){progress.set(key(n,s),result.data);renderStages();progressUI();}
 }catch(err){console.error('Academy viewed marker',err);}
}
async function write(desired){
 if(!db||!user||!ready||saving){feedback('Для облачного сохранения войди в свой аккаунт и проверь подключение.','bad');return;}
 const answer=$('answer').value.trim(),n=lesson,s=subject,quiz=passed.get(key(n,s))?.size||0;
 if(desired==='practiced'){
   if(quiz!==2){feedback('Сначала правильно ответь на оба вопроса.','bad');$('questions').scrollIntoView({block:'center'});return;}
   if(answer.length<(s==='qa'?40:20)){feedback('Напиши самостоятельный ответ подробнее — одной короткой фразы недостаточно.','bad');$('answer').focus();return;}
   if(!$('criteriaBox').open||!$('reviewed').checked){feedback('Раскрой критерии, сравни с ними работу и отметь самопроверку.','bad');return;}
 }
 let evidence=null;
 if(desired==='passed'){
   if(!schemaReady){feedback('Зачёт нельзя записать: в облаке нет колонок для его доказательств. Примени миграцию academy_three_stage_assessment.','bad');return;}
   if(!practiced(n,s)){feedback('Сначала зафиксируй практику: зачёт идёт после неё.','bad');return;}
   const verdict=examVerdict(n,s);
   if(!verdict.ok){feedback(verdict.reason,'bad');$('examFeedback').textContent=verdict.reason;await pushAttempt(n,s,false,verdict.reason);renderExam();return;}
   evidence=verdict.evidence;
 }
 if(desired==='draft'&&practiced(n,s)&&!window.confirm('Сохранение нового черновика снимет предыдущую отметку о практике и при необходимости снова откроет задачу в SEVER. Продолжить?'))return;
 if(!$('draftNotice').hidden&&record(n,s)&&!window.confirm('На этом устройстве и в облаке разные ответы. Сохранение перезапишет облачную версию. Ты сравнил их и хочешь продолжить?'))return;
 saving=true;lockSaving(true);feedback('Сохраняем в облаке…');
 const stored=record(n,s);
 const certifying=desired==='passed';
 const keptAnswer=certifying?(stored?.answer??answer):answer;
 /* The calendar trigger only ever reads `status`, so a зачёт keeps it at 'practiced'. */
 const storedStatus=certifying?'practiced':desired;
 const payload={user_id:user.id,track:SUBJECTS[s],lesson_number:n,answer:keptAnswer,quiz_score:quiz,status:storedStatus,updated_at:new Date().toISOString()};
 if(schemaReady){
   payload.certified_at=certifying?payload.updated_at:(desired==='draft'?null:(stored?.certified_at??null));
   payload.assessment=certifying?{...evidence,at:payload.updated_at}:(desired==='draft'?null:(stored?.assessment??null));
   payload.attempts=history(stored,certifying?{at:payload.updated_at,ok:true}:null);
 }
 try{
   const result=await db.from('academy_path_progress').upsert(payload,{onConflict:'user_id,track,lesson_number'}).select(columns()).single();
   if(result.error||result.data?.user_id!==user.id||result.data?.track!==payload.track||result.data?.lesson_number!==n||result.data?.status!==storedStatus||result.data?.answer!==keptAnswer||Number(result.data?.quiz_score)!==quiz||(certifying&&schemaReady&&!result.data?.certified_at))throw result.error||Error('Server did not confirm expected row.');
   progress.set(key(n,s),result.data);localClear(n,s);$('draftNotice').hidden=true;
   feedback(desired==='passed'?'✓ Зачёт сдан и записан в облако вместе с историей попыток.':desired==='practiced'?(pairDone(n)?'✓ Обе практики сохранены: задача Academy в SEVER закрыта автоматически.':'✓ Практика сохранена. Выполни второй предмет, чтобы задача SEVER закрылась.'):(pairDone(n)?'✓ Черновик сохранён.':'✓ Черновик сохранён; если обе практики больше не отмечены, задача SEVER снова открыта.'),'good');
   renderExam();renderStages();progressUI();status('✓ Ответ подтверждён облаком Academy; календарь SEVER связан с обеими практиками.','good');
 }catch(err){console.error('Academy path save error',err);localSave();feedback('Облако не подтвердило сохранение. Текст оставлен в поле и резервном черновике браузера — проверь интернет и повтори. Задача в SEVER не должна считаться закрытой без подтверждения.','bad');}
 finally{saving=false;lockSaving(false);}
}
async function loadCloud(){
 ready=false;lockSaving(true);
 /* Ask for the зачёт columns first; an older database simply does not have them yet. */
 let result=await db.from('academy_path_progress').select(`track,lesson_number,answer,quiz_score,status,updated_at,certified_at,assessment,attempts`).eq('user_id',user.id).limit(750);
 if(result.error){
   schemaReady=false;
   result=await db.from('academy_path_progress').select('track,lesson_number,answer,quiz_score,status,updated_at').eq('user_id',user.id).limit(750);
 }
 if(result.error)throw result.error;
 progress.clear();passed.clear();examState.clear();for(const row of result.data||[])progress.set(`${row.track}:${row.lesson_number}`,row);
 ready=true;
 const first=Array.from({length:total},(_,i)=>i+1).find(n=>!pairDone(n));lesson=first||total;subject=!practiced(lesson,'qa')?'qa':!practiced(lesson,'english')?'english':'qa';
 status(schemaReady?'✓ Вход подтверждён. Прогресс QA + English загружен; календарь SEVER закрывает урок после обеих практик.':'✓ Вход подтверждён, но колонок зачёта в облаке нет: доступны только «ознакомился» и «попрактиковался». Примени миграцию academy_three_stage_assessment.',schemaReady?'good':'bad');
 setLabel($('account'),'Аккаунт');setIcon($('account'),'✓');$('logout').hidden=false;render();lockSaving(false);
}
async function authorize(){
 if(!db){status('Не загрузился модуль облака. Уроки можно читать, но сохранение пока недоступно.','bad');return;}
 try{
   /* Detect the absence of a session before getUser, which otherwise throws AuthSessionMissingError.
      Session presence never grants access: getUser and the owner profile remain mandatory. */
   if(typeof db.auth.getSession==='function'){
    const session=await db.auth.getSession();if(session.error)throw session.error;
    if(!session.data?.session){user=null;ready=false;status('Гостевой просмотр: для выполнения и сохранения заданий войди в тот же аккаунт, что используешь в SEVER.');render();return;}
   }
   const result=await db.auth.getUser();if(result.error)throw result.error;
   if(!result.data.user){user=null;ready=false;status('Гостевой просмотр: для выполнения и сохранения заданий войди в тот же аккаунт, что используешь в SEVER.');render();return;}
   const profile=await db.from('profiles').select('role').eq('id',result.data.user.id).single();
   if(profile.error||profile.data?.role!=='owner'){user=null;ready=false;status('Эта персональная программа открыта только владельцу. Войди в свой аккаунт.','bad');$('logout').hidden=false;render();return;}
   user=result.data.user;await loadCloud();
 }catch(err){console.error('Academy path auth/load error',err);ready=false;lockSaving(false);status('Облако сейчас не подтвердило вход или загрузку. Не отмечай практику: попробуй обновить страницу.','bad');render();}
}
async function login(event){
 event.preventDefault();if(!db){$('loginError').textContent='Модуль входа недоступен. Обнови страницу.';return;}
 $('loginSubmit').disabled=true;$('loginError').textContent='Проверяем вход…';
 try{
   const result=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
   if(result.error)throw result.error;
   $('password').value='';await authorize();if(!ready){$('loginError').textContent='Вход выполнен, но учебное облако пока не подтвердило доступ. Проверь статус на странице.';return;}
   $('loginDialog').close();$('loginError').textContent='';
 }catch(err){console.error('Academy path login',err);$('loginError').textContent='Не удалось войти. Проверь почту и пароль или состояние сети.';}
 finally{$('loginSubmit').disabled=false;}
}
async function logout(){if(!db)return;try{const result=await db.auth.signOut();if(result.error)throw result.error;user=null;ready=false;progress.clear();passed.clear();$('logout').hidden=true;setLabel($('account'),'Войти');setIcon($('account'),'⇥');$('loginDialog').close();lesson=1;subject='qa';status('Ты вышел из Academy. Для сохранения снова войди.');render();}catch(err){console.error('Academy path logout',err);$('loginError').textContent='Не получилось завершить сессию. Попробуй ещё раз.';}}
function init(){
 if(!program||program.qa.length!==total||program.english.length!==total){status('Ошибка загрузки учебной программы. Обнови страницу.','bad');return;}
 const notice=document.createElement('div');notice.id='draftNotice';notice.className='status';notice.hidden=true;
 const noticeText=document.createElement('span');noticeText.id='draftNoticeText';notice.append(noticeText);
 const useCloud=iconButton('☁','Вернуться к облачной версии','subtle');useCloud.id='useCloud';useCloud.style.margin='9px 0 0';notice.append(document.createElement('br'),useCloud);
 $('answer').after(notice);
 useCloud.addEventListener('click',()=>{if(saving||!record(lesson,subject))return;if(!window.confirm('Удалить только локальный несохранённый черновик и показать сохранённую облачную версию?'))return;localClear(lesson,subject);render();});
 for(let n=1;n<=total;n++){
   const option=document.createElement('option');option.value=String(n);$('lessonSelect').append(option);
 }
 $('previous').addEventListener('click',()=>navigate(lesson-1));$('next').addEventListener('click',()=>navigate(lesson+1));$('continue').addEventListener('click',()=>navigate(lesson+1));
 $('lessonSelect').addEventListener('change',event=>navigate(Number(event.target.value)));
 $('qaTab').addEventListener('click',()=>navigate(lesson,'qa'));
 $('englishTab').addEventListener('click',()=>navigate(lesson,'english'));
 $('answer').addEventListener('input',localSave);
 $('save').addEventListener('click',()=>write('draft'));$('complete').addEventListener('click',()=>write('practiced'));
 $('examSubmit').addEventListener('click',()=>write('passed'));
 if(!exam||exam.qa?.length!==total||exam.english?.length!==total)$('examIntro').textContent='Материалы зачёта не загрузились: обнови страницу.';
 $('say').addEventListener('click',()=>{if(subject!=='english'||!window.speechSynthesis)return;window.speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance(program.english[lesson-1].speech);voice.lang='en-US';voice.rate=.85;window.speechSynthesis.speak(voice);});
 $('account').addEventListener('click',()=>{$('loginError').textContent='';$('loginDialog').showModal();});
 $('closeLogin').addEventListener('click',()=>$('loginDialog').close());$('loginForm').addEventListener('submit',login);$('logout').addEventListener('click',logout);
 render();
 if(!window.supabase?.createClient){status('Модуль облачного входа не загрузился. Уроки доступны для чтения, но сохранение отключено.','bad');return;}
 try{db=window.supabase.createClient(API,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'sever-academy-auth-v1'}});authorize();}
 catch(err){console.error('Academy path client error',err);status('Не удалось подключить облако. Проверь сеть и обнови страницу.','bad');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
