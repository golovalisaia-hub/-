(() => {
'use strict';
const URL='https://vdhazibkfpgclcwyvvbi.supabase.co';
// Public/publishable key only. Authorization is enforced by Supabase RLS.
const KEY='sb_publishable_eRp5yJyhKF9EBTDdhi77_Q_iGaZJaUj';
const TOTAL=84, NAMES={qa:'Тестирование',python:'Python',english:'Английский'};
const SUBJECTS=['qa','python','english'];
const $=id=>document.getElementById(id);
/* Подпись кнопки меняется, иконка остаётся на месте. */
const setLabel=(node,text)=>{const span=node.querySelector('.btn-label');(span||node).textContent=text;};
const setIcon=(node,glyph)=>{const span=node.querySelector('.btn-icon');if(span)span.textContent=glyph;};
const iconButton=(glyph,text,className)=>{const b=document.createElement('button');b.type='button';if(className)b.className=className;const i=document.createElement('span');i.className='btn-icon';i.setAttribute('aria-hidden','true');i.textContent=glyph;const l=document.createElement('span');l.className='btn-label';l.textContent=text;b.append(i,l);return b;};
const days=window.ACADEMY_DAYS||[], weeks=window.ACADEMY_WEEKS||[];
let db=null,user=null,authorized=false,selected=1,subject='qa',manuallySelected=false;
let tasks=new Map(),blocks=new Map(),sessions=[],writes=new Map(),saveTimers=new Map();
let worker=null,workerReady=false,workerLoading=false,runId=0,runTimeout=null,runEvidence=new Map();
let timer={id:null,lesson:0,startedAt:null,startedMs:0,elapsedMs:0};
const now=()=>new Date().toISOString();
const blockKey=(n,b)=>`${n}:${b}`;
const localKey=(n,b)=>`academy-studio-draft-v1:${user?.id||'preview'}:${n}:${b}`;
const safe=s=>String(s??'');
const pad=n=>String(n).padStart(2,'0');
const shortTopic=text=>{const first=safe(text).split(/[,.:;(]/)[0].trim()||safe(text).trim();return first.length>26?`${first.slice(0,25).trimEnd()}…`:first;};
const taskPrefix=n=>`IT · День ${pad(n)}/84:`;
const formatDay=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
function moscowDay(date){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const f=t=>parts.find(v=>v.type===t)?.value;return `${f('year')}-${f('month')}-${f('day')}`;}
function lessonDate(n){const start=Date.parse(`${window.ACADEMY_START}T12:00:00Z`);return new Date(start+(n-1)*86400000).toISOString().slice(0,10);}
function labelDate(n){const date=tasks.get(n)?.scheduled_for||lessonDate(n);return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));}
function toast(message){const node=$('toast');node.textContent=message;node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),4000);}
function status(message,kind=''){const node=$('cloudStatus');node.textContent=message;node.className=`message ${kind}`.trim();}
/* Archive route. It never writes to the planner and never restores learning evidence
   from a calendar checkbox: the current QA + English path owns the calendar. */
function blockDone(n,b){return Boolean(blocks.get(blockKey(n,b))?.completed);}
function allDone(n){return SUBJECTS.every(b=>blockDone(n,b));}
function isDone(n){return allDone(n);}
function recommended(){for(let n=1;n<=TOTAL;n++)if(!isDone(n))return n;return TOTAL;}
function readLocal(n,b){try{const item=JSON.parse(localStorage.getItem(localKey(n,b))||'null');return item&&typeof item.text==='string'?item:null;}catch{return null;}}
function storeLocal(n,b,text){try{localStorage.setItem(localKey(n,b),JSON.stringify({text,ts:Date.now()}));}catch{toast('Локальный черновик не сохранился: проверь свободное место.');}}
function draft(n,b){const remote=blocks.get(blockKey(n,b));const local=readLocal(n,b);if(remote?.completed)return remote.answer||'';if(local?.ts>(Date.parse(remote?.updated_at)||0))return local.text;return remote?.answer||local?.text||'';}
function serialize(){if(subject!=='python')return $('answer').value;return JSON.stringify({notes:$('answer').value,code:$('code').value,stdin:$('stdin').value});}
function deserialize(raw){try{const data=JSON.parse(raw);if(data&&typeof data==='object'&&typeof data.code==='string')return {notes:safe(data.notes),code:data.code,stdin:safe(data.stdin)};}catch{}return {notes:'',code:raw||'',stdin:''};}
function cache(){const text=serialize();storeLocal(selected,subject,text);runEvidence.delete(blockKey(selected,subject));scheduleDraft(selected,subject,text);}
function scheduleDraft(n,b,text){if(!authorized||blockDone(n,b))return;const k=blockKey(n,b);clearTimeout(saveTimers.get(k));saveTimers.set(k,setTimeout(()=>{saveTimers.delete(k);saveBlock(n,b,text,false).catch(error=>{console.error('Draft save failed',error);status('Облако не сохранило черновик. Он остался на этом устройстве; повтори сохранение при наличии связи.','bad');});},1000));}
function saveBlock(n,b,answer,finish){
  const k=blockKey(n,b),previous=writes.get(k)||Promise.resolve();
  const promise=previous.catch(()=>{}).then(async()=>{
    if(!authorized||!user)throw Error('Сначала войди в аккаунт.');
    if(blocks.get(k)?.completed)return blocks.get(k);
    const base={user_id:user.id,lesson_number:n,block:b,answer,updated_at:now()};
    let result;
    if(blocks.has(k)){
      result=await db.from('academy_blocks').update({...base,...(finish?{completed:true,completed_at:now()}:{})}).eq('user_id',user.id).eq('lesson_number',n).eq('block',b).eq('completed',false).select().maybeSingle();
    }else{
      result=await db.from('academy_blocks').insert({...base,completed:finish,completed_at:finish?now():null}).select().single();
      if(result.error?.code==='23505'){
        result=await db.from('academy_blocks').update({...base,...(finish?{completed:true,completed_at:now()}:{})}).eq('user_id',user.id).eq('lesson_number',n).eq('block',b).eq('completed',false).select().maybeSingle();
      }
    }
    if(result.error)throw result.error;
    let row=result.data;
    if(!row){const check=await db.from('academy_blocks').select('*').eq('user_id',user.id).eq('lesson_number',n).eq('block',b).single();if(check.error)throw check.error;row=check.data;}
    if(finish&&!row?.completed)throw Error('Завершение не подтверждено сервером.');
    blocks.set(k,row);
    return row;
  });
  writes.set(k,promise);
  promise.then(()=>{if(writes.get(k)===promise)writes.delete(k);},()=>{if(writes.get(k)===promise)writes.delete(k);});
  return promise;
}
function sessionElapsed(){return timer.elapsedMs+(timer.startedMs?Math.max(0,Date.now()-timer.startedMs):0);}
function clockText(ms){const sec=Math.floor(ms/1000);return [Math.floor(sec/3600),Math.floor(sec%3600/60),sec%60].map(pad).join(':');}
function renderTimer(){
  $('clock').textContent=clockText(sessionElapsed());
  $('timerStart').disabled=!authorized||Boolean(timer.startedMs)||sessionElapsed()>=21600000;
  setLabel($('timerStart'),timer.id?'Продолжить':'Начать');
  $('timerPause').disabled=!timer.startedMs;
  $('timerSave').disabled=!timer.id;
  const today=sessions.filter(s=>moscowDay(new Date(s.ended_at))===moscowDay(new Date())).reduce((sum,s)=>sum+s.duration_seconds,0);
  $('todayMinutes').textContent=today?`${Math.round(today/60)} мин`:'0 минут';
  const weekStart=Date.now()-6*86400000;
  const week=sessions.filter(s=>new Date(s.ended_at).getTime()>=weekStart).reduce((sum,s)=>sum+s.duration_seconds,0);
  $('weekMinutes').textContent=week>=3600?`${Math.floor(week/3600)} ч ${Math.round(week%3600/60)} мин`:`${Math.round(week/60)} мин`;
  $('sessionCount').textContent=String(sessions.length);
}
function clearTimer(){timer={id:null,lesson:0,startedAt:null,startedMs:0,elapsedMs:0};renderTimer();}
function startTimer(){if(!authorized){status('Для записи времени войди в свой аккаунт.','bad');$('loginDialog').showModal();return;}if(timer.startedMs)return;if(!timer.id){timer.id=crypto.randomUUID();timer.lesson=selected;timer.startedAt=now();timer.elapsedMs=0;}timer.startedMs=Date.now();renderTimer();}
function pauseTimer(){if(!timer.startedMs)return;timer.elapsedMs+=Math.max(0,Date.now()-timer.startedMs);timer.startedMs=0;renderTimer();}
async function saveTimer(){
  if(!timer.id)return;
  pauseTimer();let seconds=Math.floor(timer.elapsedMs/1000);
  if(seconds<30){toast('Для записи сессии нужно минимум 30 секунд. Продолжи таймер.');return;}
  seconds=Math.min(seconds,21600);
  const row={id:timer.id,user_id:user.id,lesson_number:timer.lesson,started_at:timer.startedAt,ended_at:now(),duration_seconds:seconds};
  $('timerSave').disabled=true;
  try{
    let result=await db.from('academy_sessions').insert(row).select('id').single();
    if(result.error?.code==='23505')result=await db.from('academy_sessions').select('id').eq('id',row.id).eq('user_id',user.id).single();
    if(result.error||!result.data)throw result.error||Error('Нет подтверждения записи времени.');
    if(!sessions.some(s=>s.id===row.id))sessions.push(row);
    clearTimer();toast('Учебная сессия записана в твоё облако.');
  }catch(error){console.error('Study timer save failed',error);status('Не получилось записать время. Сессия сохранена в этой вкладке: нажми «Закончить и сохранить» ещё раз.','bad');renderTimer();}
}
function selection(n){
  if(!Number.isInteger(n)||n<1||n>TOTAL)return;
  manuallySelected=true;selected=n;subject=SUBJECTS.find(b=>!blockDone(n,b))||'qa';runEvidence.clear();render();
  document.querySelector('.welcome').scrollIntoView({behavior:'smooth',block:'start'});
}
function render(){
  if(days.length!==TOTAL){status('Программа загружена не полностью; занятие пока недоступно.','bad');return;}
  const day=days[selected-1],week=weeks[day.week]||{};
  $('heading').textContent=`Урок ${pad(selected)} / ${TOTAL}`;
  $('subtitle').textContent=`${labelDate(selected)} по плану · Неделя ${day.week+1}: ${week.name||''}`;
  $('previous').disabled=selected<=1;$('next').disabled=selected>=TOTAL;$('lessonSelect').value=String(selected);
  const count=[...tasks.values()].filter(t=>t.completed).length;
  $('progressText').textContent=`${count} из ${TOTAL} уроков`;$('progressBar').style.width=`${count/TOTAL*100}%`;
  $('progressSub').textContent=authorized?`Следующий непройденный — урок ${recommended()}`:'Прогресс станет виден после входа.';
  setLabel($('account'),authorized?'Аккаунт':'Войти');setIcon($('account'),authorized?'✓':'⇥');
  for(const b of SUBJECTS){const button=$(`tab${b==='qa'?'Qa':b==='python'?'Python':'English'}`);button.setAttribute('aria-pressed',String(b===subject));button.classList.toggle('done',blockDone(selected,b));$(`${b}Badge`).textContent=blockDone(selected,b)?'✓':'○';}
  $('blockCount').textContent=`${SUBJECTS.filter(b=>blockDone(selected,b)).length} / 3`;
  const theory=subject==='qa'?safe(week.qa):subject==='python'?safe(week.py):`Сегодняшнее слово: ${day.english.word}. Вспомни его перевод и произнеси вслух.`;
  $('blockLabel').textContent=subject==='qa'?'QA · ТЕСТИРОВАНИЕ':subject==='python'?'PYTHON · ПРОГРАММИРОВАНИЕ':'ENGLISH · С НУЛЯ';
  $('topic').textContent=subject==='qa'?day.qa:subject==='python'?day.python:`${day.english.word}`;
  $('theory').textContent=theory;
  $('how').textContent=subject==='qa'?'Определи условия, действия и ожидаемый результат. Не называй ошибкой то, что ещё не проверил.':subject==='python'?'Прочитай пример, напиши собственный код, запусти его и изучи вывод или ошибку.':'Сначала попробуй вспомнить перевод без подсказки, затем проверь ответ.';
  $('example').textContent=subject==='python'?safe(week.example):subject==='qa'?'Предусловие → действия → ожидаемый результат → фактический результат.':'Пример: test — тест. Слово дня переведи самостоятельно.';
  $('question').textContent=subject==='qa'?`Вопрос: как проверить «${day.qa}»? Сформулируй минимум один воспроизводимый тест с ожидаемым результатом. Практика: ${day.practice}`:subject==='python'?`Как работает тема «${day.python}»? Напиши код в консоли, запусти его и кратко объясни результат. Практика: ${day.practice}`:`Как по-русски будет «${day.english.word}»? Запиши перевод в поле ниже.`;
  $('answerLabel').textContent=subject==='qa'?'Твои шаги и ожидаемый результат':subject==='python'?'Что сделал и что показала программа':'Перевод слова';
  $('pythonZone').hidden=subject!=='python';$('englishHint').hidden=subject!=='english';
  const record=blocks.get(blockKey(selected,subject));const raw=draft(selected,subject);
  if(subject==='python'){
    const item=deserialize(raw);$('answer').value=item.notes;$('code').value=item.code;$('stdin').value=item.stdin;
    $('output').textContent='Нажми «Запустить код» — здесь появится результат.';
  }else $('answer').value=raw;
  const done=blockDone(selected,subject);
  $('answer').disabled=done;$('code').disabled=done;$('stdin').disabled=done;$('run').disabled=done;
  $('saveDraft').disabled=done||!authorized;$('finishBlock').disabled=done||!authorized;
  setLabel($('finishBlock'),done?'Блок завершён':'Завершить блок');
  $('feedback').textContent=done?'Этот блок уже сохранён в твоём облаке.':'Проверяй себя по заданию. Это не автоматическая оценка качества текста и кода.';
  $('feedback').className=`feedback${done?' good':''}`;
  $('resultTitle').textContent=isDone(selected)?'✓ Урок завершён':`Завершено ${SUBJECTS.filter(b=>blockDone(selected,b)).length} из 3 блоков`;
  $('resultText').textContent=isDone(selected)?'Сервер подтвердил галочку в календаре. Можешь перейти к следующему уроку прямо сейчас.':allDone(selected)?'Все блоки сохранены. Если галочка ещё не появилась, повтори синхронизацию.':'Выполни три блока. После подтверждения сервером учебная задача календаря будет завершена.';
  $('continue').hidden=!isDone(selected)||selected>=TOTAL;$('retry').hidden=!authorized||!allDone(selected)||isDone(selected);
  if(authorized)status(isDone(selected)?'✓ Этот урок отмечен выполненным в календаре.':tasks.has(selected)?'Облако подключено. Можно выполнять уроки быстрее расписания и закрывать их по порядку.':'Не найдена соответствующая учебная задача в календаре. Другие задачи не будут изменены.',isDone(selected)?'good':tasks.has(selected)?'':'bad');
  else status('Уроки и Python-консоль доступны для просмотра. Чтобы синхронизировать блоки и календарь, войди в свой аккаунт.');
  renderTimer();
}
async function loadCloud(){
  if(!db)return;
  try{
    const auth=await db.auth.getUser();if(auth.error)throw auth.error;
    if(!auth.data.user){user=null;authorized=false;tasks.clear();blocks.clear();sessions=[];render();return;}
    const current=auth.data.user;
    const profile=await db.from('profiles').select('role').eq('id',current.id).single();
    if(profile.error||profile.data?.role!=='owner'){user=null;authorized=false;tasks.clear();blocks.clear();sessions=[];await db.auth.signOut();render();status('Личная Academy доступна только владельцу учебной программы.','bad');return;}
    user=current;
    const [taskResult,blockResult,sessionResult]=await Promise.all([
      db.from('tasks').select('id,user_id,title,scheduled_for,completed,completed_at,updated_at,deleted_at,sync_versions').eq('user_id',current.id).like('title','IT · День %/84:%').is('deleted_at',null),
      db.from('academy_blocks').select('*').eq('user_id',current.id),
      db.from('academy_sessions').select('*').eq('user_id',current.id).order('ended_at',{ascending:false}).limit(1000)
    ]);
    for(const result of [taskResult,blockResult,sessionResult])if(result.error)throw result.error;
    tasks=new Map();for(const task of taskResult.data||[]){const match=/^IT · День (\d{2})\/84:/.exec(task.title);if(match)tasks.set(Number(match[1]),task);}
    blocks=new Map();for(const item of blockResult.data||[])blocks.set(blockKey(item.lesson_number,item.block),item);
    sessions=sessionResult.data||[];
    authorized=true;if(!manuallySelected){selected=recommended();subject=SUBJECTS.find(b=>!blockDone(selected,b))||'qa';}
    render();
    if(tasks.size!==TOTAL)status(`Найдено ${tasks.size} из 84 учебных задач. Недостающие задачи не будут заменяться другими.`, 'bad');
  }catch(error){console.error('Academy cloud load failed',error);authorized=false;tasks.clear();blocks.clear();sessions=[];render();status('Не удалось проверить облачные данные. Не закрывай урок, пока соединение не восстановится.','bad');}
}
function logicalStamp(row){
  let stamp=Math.max(Date.now(),Date.parse(row.updated_at)||0);
  const versions=row.sync_versions||{};
  Object.values(versions.fields||{}).forEach(value=>{if(Array.isArray(value))stamp=Math.max(stamp,Number(value[0])||0);});
  if(Array.isArray(versions.life?.stamp))stamp=Math.max(stamp,Number(versions.life.stamp[0])||0);
  return stamp+1;
}
let syncing=false;
async function syncDay(n){
  /* Deliberately inert: the archived 84 combined lessons must not open, close or touch any
     SEVER task. The live QA + English path in path.html is the only route linked to the calendar. */
  if(!n)return;
  status('Это архив прежних уроков. Прогресс сохраняется в облаке Academy, но календарь SEVER отсюда не изменяется: текущий маршрут — QA + английский на странице «Мои уроки».');
}
function translationMatches(value,day){const normalize=text=>safe(text).toLocaleLowerCase('ru-RU').trim().replace(/[.!?\s]+$/g,'');const answer=normalize(value);return day.english.translation.split(/\s*\/\s*/).some(term=>normalize(term)===answer);}
async function finishBlock(){
  if(!authorized){$('loginDialog').showModal();return;}
  if(blockDone(selected,subject))return;
  const n=selected,b=subject,day=days[n-1],raw=serialize();
  if(b==='python'){
    if(!$('code').value.trim()||runEvidence.get(blockKey(n,b))!==`${$('code').value}\u0000${$('stdin').value}`){$('feedback').textContent='Сначала запусти свой код без ошибки. Если используешь input(), заполни поле ввода.';$('feedback').className='feedback bad';return;}
  }else if(b==='english'){
    if(!translationMatches($('answer').value,day)){$('feedback').textContent='Пока не совпало. Прочитай слово ещё раз и попробуй перевод.';$('feedback').className='feedback bad';return;}
  }else if($('answer').value.trim().length<35){$('feedback').textContent='Добавь шаги проверки и ожидаемый результат. Одного короткого слова недостаточно.';$('feedback').className='feedback bad';return;}
  clearTimeout(saveTimers.get(blockKey(n,b)));saveTimers.delete(blockKey(n,b));
  $('finishBlock').disabled=true;$('saveDraft').disabled=true;
  try{
    const saved=await saveBlock(n,b,raw,true);
    if(!saved.completed)throw Error('Облако не подтвердило завершение блока.');
    storeLocal(n,b,raw);
    if(allDone(n)){render();syncDay(n);}else{subject=SUBJECTS.find(item=>!blockDone(n,item))||'qa';render();toast('Блок сохранён. Продолжаем следующий!');}
  }catch(error){console.error('Block save failed',error);status('Не удалось сохранить завершение в облаке. Ответ остался на этом устройстве. Повтори при наличии связи.','bad');$('finishBlock').disabled=false;$('saveDraft').disabled=false;}
}
async function saveCurrent(){
  const n=selected,b=subject,raw=serialize();storeLocal(n,b,raw);
  if(!authorized){toast('Черновик сохранён только на этом устройстве. Войди для облака.');return;}
  if(blockDone(n,b))return;
  clearTimeout(saveTimers.get(blockKey(n,b)));saveTimers.delete(blockKey(n,b));
  $('saveDraft').disabled=true;
  try{await saveBlock(n,b,raw,false);toast('Черновик сохранён в твоё облако.');}
  catch(error){console.error('Manual draft save failed',error);status('Не удалось сохранить черновик в облаке. Локальная копия осталась в браузере.','bad');}
  finally{$('saveDraft').disabled=false;}
}
function stopWorker(message){
  clearTimeout(runTimeout);runTimeout=null;
  if(worker){worker.terminate();worker=null;}workerReady=false;workerLoading=false;
  $('run').disabled=blockDone(selected,'python');if(message){$('output').textContent=message;$('feedback').textContent=message;$('feedback').className='feedback bad';}
}
function createWorker(){
  if(worker)return;
  workerReady=false;workerLoading=true;worker=new Worker('python-worker.mjs',{type:'module'});
  worker.onmessage=event=>{
    const data=event.data||{};
    if(data.type==='ready'){workerReady=true;workerLoading=false;$('output').textContent='Python загружен. Код можно запускать.';if(subject==='python')$('run').disabled=false;return;}
    if(data.type==='load-error'){stopWorker('Не удалось загрузить Python. Проверь интернет и попробуй ещё раз.');return;}
    if(data.type!=='result'||data.id!==runId)return;
    clearTimeout(runTimeout);runTimeout=null;$('run').disabled=blockDone(selected,'python');
    $('output').textContent=data.output|| (data.ok?'Программа выполнена. Вывода нет.':'При выполнении произошла ошибка.');
    const key=blockKey(runLesson, 'python');
    if(data.ok){runEvidence.set(key,runCode);$('feedback').textContent='Код запустился без ошибки. Сравни вывод с заданием: корректность решения автоматически не оценивается.';$('feedback').className='feedback good';}
    else {runEvidence.delete(key);$('feedback').textContent='Есть ошибка выполнения. Исправь код и запусти ещё раз.';$('feedback').className='feedback bad';}
  };
  worker.onerror=error=>{console.error('Python worker error',error);stopWorker('Ошибка Python-консоли. Перезагрузи страницу и попробуй ещё раз.');};
}
let runLesson=1,runCode='';
function runPython(){
  const code=$('code').value,stdin=$('stdin').value;
  if(!code.trim()){toast('Напиши хотя бы одну команду Python.');return;}
  if(code.length>12000||stdin.length>3000){toast('Слишком длинная программа или тестовый ввод.');return;}
  cache();runLesson=selected;runCode=`${code}\u0000${stdin}`;
  if(!worker)createWorker();
  if(!workerReady){$('output').textContent='Загружаем Python. Нажми «Запустить» ещё раз, когда он будет готов.';return;}
  runId+=1;const id=runId;
  $('run').disabled=true;$('output').textContent='Выполняем код…';
  worker.postMessage({id,code,stdin});
  clearTimeout(runTimeout);runTimeout=setTimeout(()=>{runEvidence.delete(blockKey(runLesson,'python'));stopWorker('Программа выполнялась слишком долго и остановлена. Проверь циклы и попробуй снова.');},9000);
}
function install(){
  $('lessonSelect').innerHTML='';
  let group=null;
  days.forEach((day,i)=>{
    if(!group||Number(group.dataset.week)!==day.week){group=document.createElement('optgroup');group.dataset.week=String(day.week);group.label=`Неделя ${day.week+1}: ${safe(weeks[day.week]?.name)}`;$('lessonSelect').appendChild(group);}
    const item=document.createElement('option');item.value=String(i+1);
    item.textContent=`${pad(i+1)} · ${shortTopic(day.qa)}`;
    item.title=`${pad(i+1)} · ${day.qa} / ${day.python}`;
    group.appendChild(item);
  });
  $('lessonSelect').addEventListener('change',event=>selection(Number(event.target.value)));
  $('resume').addEventListener('click',()=>selection(recommended()));
  $('previous').addEventListener('click',()=>selection(selected-1));$('next').addEventListener('click',()=>selection(selected+1));
  $('continue').addEventListener('click',()=>selection(selected+1));$('retry').hidden=true;
  for(const b of SUBJECTS){const id=b==='qa'?'tabQa':b==='python'?'tabPython':'tabEnglish';$(id).addEventListener('click',()=>{subject=b;render();});}
  for(const id of ['answer','code','stdin'])$(id).addEventListener('input',cache);
  $('saveDraft').addEventListener('click',saveCurrent);$('finishBlock').addEventListener('click',finishBlock);
  $('run').addEventListener('click',runPython);
  $('timerStart').addEventListener('click',startTimer);$('timerPause').addEventListener('click',pauseTimer);$('timerSave').addEventListener('click',saveTimer);
  $('account').addEventListener('click',()=>{$('loginError').textContent='';$('loginDialog').showModal();});
  $('closeLogin').addEventListener('click',()=>$('loginDialog').close());
  $('loginForm').addEventListener('submit',async event=>{
    event.preventDefault();$('loginSubmit').disabled=true;$('loginError').textContent='';
    try{const response=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(response.error)throw response.error;$('password').value='';$('loginDialog').close();await loadCloud();if(authorized)toast('Аккаунт подключён. Прогресс доступен на твоих устройствах.');}
    catch(error){console.error('Academy login error',error);$('loginError').textContent='Не получилось войти. Проверь почту, пароль и соединение.';}
    finally{$('loginSubmit').disabled=false;}
  });
  $('logout').addEventListener('click',async()=>{if(timer.id){toast('Сначала сохрани текущую учебную сессию.');return;}await db.auth.signOut();user=null;authorized=false;tasks.clear();blocks.clear();sessions=[];$('password').value='';$('loginDialog').close();render();});
  setInterval(renderTimer,1000);
  window.addEventListener('online',()=>{if(db)loadCloud();});
}
function loadLocalSupabase(){
  return new Promise(resolve=>{
    const script=document.createElement('script');
    script.src='vendor/supabase.js';
    script.onload=()=>resolve(Boolean(window.supabase?.createClient));
    script.onerror=()=>resolve(false);
    document.head.append(script);
  });
}
async function init(){
  if(days.length!==TOTAL||weeks.length!==12){status('Программа повреждена или загружена не полностью.','bad');return;}
  install();render();
  if(!window.supabase?.createClient){
    status('Загружаем запасную копию модуля входа…');
    if(!await loadLocalSupabase()){status('Модуль облачного входа не загрузился. Уроки можно читать, но сохранение недоступно.','bad');return;}
  }
  db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'sever-academy-auth-v1'}});
  $('logout').hidden=false;
  await loadCloud();
}
init();
})();
