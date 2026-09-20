(() => {
'use strict';
const SUPABASE_URL = 'https://vdhazibkfpgclcwyvvbi.supabase.co';
/* Public publishable key, NEVER a service-role key. Supabase RLS enforces ownership. */
const PUBLIC_KEY = 'sb_publishable_eRp5yJyhKF9EBTDdhi77_Q_iGaZJaUj';
const TOTAL = 84;
const DAY_MS = 86400000;
const COURSE_START = Date.parse(`${window.ACADEMY_START}T00:00:00Z`);
const DAYS = window.ACADEMY_DAYS;
const WEEKS = window.ACADEMY_WEEKS;
const BLOCKS = ['qa','python','english'];
const $ = id => document.getElementById(id);
const escapeText = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
let client = null, user = null, taskMap = new Map(), profileReady = false, selected = 1, activeBlock = 'qa', page = 'today', syncing = false;
let toastTimer = null;
const studyDay = date => {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get = key => parts.find(item => item.type === key)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};
function dateFor(n) { return new Date(COURSE_START+(n-1)*DAY_MS).toISOString().slice(0,10); }
function dateLabel(n) {
  const str=taskMap.get(n)?.scheduled_for || dateFor(n);
  const date=new Date(`${str}T12:00:00Z`);
  return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'}).format(date);
}
function indexToday() { const date = studyDay(new Date()); const num=Math.floor((Date.parse(date+'T00:00:00Z')-COURSE_START)/DAY_MS)+1; return Math.max(1,Math.min(TOTAL,num)); }
function storageKey() { return user ? `sever-academy-local-v1:${user.id}` : 'sever-academy-preview-v1'; }
function readLocal() { try { return JSON.parse(localStorage.getItem(storageKey())||'{}') || {}; } catch { return {}; } }
function saveLocal(data) { try { localStorage.setItem(storageKey(),JSON.stringify(data)); } catch { notify('Не удалось сохранить черновик. Проверь свободное место браузера.'); } }
function blockState(n) { return readLocal()[String(n)] || {}; }
function blockDone(n,name) { return Boolean(taskMap.get(n)?.completed || blockState(n).blocks?.[name]); }
function completed(n) { return Boolean(taskMap.get(n)?.completed); }
function allBlocks(n) { return BLOCKS.every(name => blockDone(n,name)); }
function setBlock(n,name,done) {
  if(completed(n)) return;
  const data=readLocal(), key=String(n); data[key] ||= {}; data[key].blocks ||= {}; data[key].blocks[name]=done; saveLocal(data);
}
function getDraft(n,name) { return readLocal()[String(n)]?.answers?.[name] || ''; }
function putDraft(n,name,value) {const data=readLocal(),key=String(n);data[key] ||= {};data[key].answers ||= {};data[key].answers[name]=value;saveLocal(data);}
function notify(message) {const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3900);}
function notice(text,type='') {const node=$('cloudNotice');node.textContent=text;node.className='notice'+(type?' '+type:'');}
function showPage(next) {
  page=next;
  $('lessonSection').hidden=next!=='today'; $('programSection').hidden=next!=='program'; $('progressSection').hidden=next!=='progress';
  [['today','goToday'],['program','goProgram'],['progress','goProgress']].forEach(([name,id])=>$(id).classList.toggle('active',name===next));
  if(next==='program') renderProgram();if(next==='progress') renderProgress();if(next==='today') renderLesson();
  $('lessonSection').scrollIntoView({behavior:'smooth',block:'start'});
}
function changeDay(number) { selected=Math.max(1,Math.min(TOTAL,number)); activeBlock='qa'; showPage('today'); }
function updateStats() {
  const count=[...taskMap.values()].filter(task=>task.completed).length;
  const pct=Math.round(count/TOTAL*100);
  $('doneCount').textContent=String(count); $('heroPercent').textContent=`${pct}%`;
  $('ringArc').style.strokeDashoffset=String(307.88*(1-count/TOTAL));
  $('todayCount').textContent=`${String(indexToday()).padStart(2,'0')} / 84`;
  $('todayDateLabel').textContent=dateLabel(indexToday());
  $('sideStatus').textContent=profileReady?'● Твоё облако подключено':user?'○ Проверка аккаунта':'○ Вход не выполнен';
  $('sideStatus').classList.toggle('connected',profileReady);
  $('accountButton').textContent=profileReady?'Аккаунт подключён ✓':'Войти в аккаунт';
  $('footerSync').textContent=profileReady?'SEVER подключён':'SEVER не подключён';
}
function exerciseText(day,block) {
  if(block==='qa') return day.number===1?'Для кнопки «Удалить карту» напиши три проверяемых сценария: шаги и ожидаемый результат для позитивной, негативной и необычной ситуации.':`Объясни тему «${day.qa}» своими словами. Затем выполни практику дня: ${day.practice}`;
  if(block==='python') return day.number===1?'Напиши Python-программу: спроси имя и учебный пароль; если пароль sever123, поприветствуй пользователя, иначе выведи сообщение об ошибке. Не используй настоящий пароль.':`В VS Code запусти пример, измени данные и напиши свой вариант. Практика: ${day.practice}`;
  return `Прочитай слово «${day.english.word}», запомни перевод, запиши слово и одно очень простое предложение с ним. Если не можешь составить предложение — напиши сначала перевод.`;
}
function lessonBody(day,block) {
  const week=WEEKS[day.week];
  if(block==='qa')return {title:day.qa,lead:week.qa,how:'Запиши, что именно проверяешь, какие действия повторит другой человек и какой результат считаешь правильным. Если требования неизвестны, сперва сформулируй вопрос к ним.',example:day.number===1?'Пример: «Ввести текст hello вместо email → нажать Войти → приложение отклоняет адрес и показывает ошибку». Ожидание нужно сверить с требованиями продукта.':'Формат: предусловие → шаги → ожидаемый результат → фактический результат. Не выдумывай найденный баг, если ещё не воспроизвёл его.'};
  if(block==='python')return {title:day.python,lead:week.py,how:'Прочитай пример и объясни каждую строку. Затем перепечатай код самостоятельно в VS Code, запусти, измени значения и исследуй результат.',example:week.example};
  return {title:`English: ${day.english.word}`,lead:`Сегодняшнее слово — «${day.english.word}». Перевод: «${day.english.translation}». Начинай с простого: прочитай слово вслух несколько раз и запомни значение.`,how:`Скажи по-английски «${day.english.word}». Затем закрой перевод, вспомни его и запиши простое предложение или словосочетание.`,example:`${day.english.word} — ${day.english.translation}`};
}
function renderLesson() {
  const day=DAYS[selected-1];const task=taskMap.get(selected);
  $('dayHeading').textContent=`День ${String(selected).padStart(2,'0')} / 84`;
  $('daySubheading').textContent=`${dateLabel(selected)} · Неделя ${day.week+1}: ${WEEKS[day.week].name}`;
  $('prevDay').disabled=selected===1;$('nextDay').disabled=selected===TOTAL;
  if(profileReady) notice(task?completed(selected)?'✓ Занятие уже выполнено в твоём календаре SEVER.':'Аккаунт подключён. После трёх блоков галочка будет поставлена только в твоей учебной задаче SEVER.':'Учебная задача этого дня не найдена в твоём SEVER. Изменять посторонние задачи сайт не будет.',task?.completed?'success':task?'':'error');
  else notice(user?'Не удалось проверить связь с календарём. Уроки доступны, но отметка в SEVER сейчас невозможна.':'Войди в тот же аккаунт, что в SEVER, чтобы завершение дня синхронизировалось с календарём.');
  const names={qa:'Тестирование',python:'Python',english:'Английский'};
  const icons={qa:'◈',python:'⌘',english:'◎'};
  $('blockList').innerHTML=BLOCKS.map((name,i)=>`<button type="button" class="block ${activeBlock===name?'active':''} ${blockDone(selected,name)?'done':''}" data-block="${name}" aria-pressed="${activeBlock===name}"><span class="topline"><span>${icons[name]} БЛОК ${i+1}</span><span>${blockDone(selected,name)?'✓ Готово':'○ Не выполнен'}</span></span><strong>${names[name]}</strong><small>${name==='qa'?'50 минут':name==='python'?'45 минут':'20 минут'}</small></button>`).join('');
  $('blockList').querySelectorAll('[data-block]').forEach(button=>button.addEventListener('click',()=>{activeBlock=button.dataset.block;renderLesson();}));
  const detail=lessonBody(day,activeBlock);const answer=getDraft(selected,activeBlock);const isDone=blockDone(selected,activeBlock);
  const label=activeBlock==='qa'?'QA • ТЕСТИРОВАНИЕ':activeBlock==='python'?'PYTHON • РАЗРАБОТКА':'ENGLISH • С НУЛЯ';
  $('lessonPanel').innerHTML=`<span class="pill">${label}</span><h3>${escapeText(detail.title)}</h3><p class="lead">${escapeText(detail.lead)}</p><h4>Как изучать</h4><p>${escapeText(detail.how)}</p><h4>${activeBlock==='python'?'Пример кода':'Пример'}</h4><pre class="example"></pre><div class="practice"><strong>Самостоятельная практика</strong><p>${escapeText(exerciseText(day,activeBlock))}</p></div><label for="workAnswer"><strong>Твой ответ / код / заметки о результате</strong></label><textarea id="workAnswer" class="writing" spellcheck="${activeBlock==='python'?'false':'true'}" placeholder="Напиши ответ самостоятельно. Сохраняется в этом браузере."></textarea><div class="panel-actions"><button class="primary" type="button" id="markBlock" ${isDone?'disabled':''}>${isDone?'✓ Блок завершён':'Завершить блок →'}</button><span class="helper">Это самопроверка, а не автоматическая оценка правильности кода.</span></div>`;
  $('lessonPanel').querySelector('.example').textContent=detail.example;
  const input=$('workAnswer');input.value=answer;input.disabled=completed(selected);
  input.addEventListener('input',()=>putDraft(selected,activeBlock,input.value));
  $('markBlock').addEventListener('click',async()=>{
    if(completed(selected))return;
    if(!input.value.trim()){notify('Сначала выполни практику и запиши короткий результат.');input.focus();return;}
    const block=activeBlock;setBlock(selected,block,true);
    const next=BLOCKS.find(name=>!blockDone(selected,name));if(next)activeBlock=next;
    renderLesson();
    if(allBlocks(selected))await synchronizeDay(selected);
    else notify('Блок сохранён. Продолжай следующий!');
  });
  const count=BLOCKS.filter(name=>blockDone(selected,name)).length;
  $('completionTitle').textContent=completed(selected)?'✓ День выполнен в SEVER':`Завершено ${count} из 3 блоков`;
  $('completionDescription').textContent=completed(selected)?'Галочка стоит в календаре. Изменения в SEVER больше не нужны.':count===3?'Все блоки готовы. Проверяем сохранение галочки в твоём облаке…':'Отметь QA, Python и английский после практики. Тогда сайт автоматически завершит календарную задачу.';
  $('retrySync').hidden=!(count===3&&!completed(selected)&&profileReady&&!syncing);
  $('retrySync').disabled=syncing;
  $('retrySync').onclick=()=>synchronizeDay(selected);
  updateStats();
}
function renderProgram() {
  $('weekList').innerHTML=WEEKS.map((week,w)=>`<article class="week"><span class="eyebrow">НЕДЕЛЯ ${w+1} / 12</span><h3>${escapeText(week.name)}</h3><div class="week-days">${DAYS.slice(w*7,w*7+7).map(day=>`<button type="button" class="${completed(day.number)?'done':''} ${selected===day.number?'current':''}" data-day="${day.number}" title="${escapeText(day.qa)}"><span>${escapeText(dateLabel(day.number))}</span>${String(day.number).padStart(2,'0')}${completed(day.number)?' ✓':''}</button>`).join('')}</div></article>`).join('');
  $('weekList').querySelectorAll('[data-day]').forEach(button=>button.addEventListener('click',()=>changeDay(Number(button.dataset.day))));
}
function renderProgress() {
  $('progressList').innerHTML=WEEKS.map((week,w)=>{const count=DAYS.slice(w*7,w*7+7).filter(day=>completed(day.number)).length;return `<div class="progress-row"><strong>${escapeText(week.name)}</strong><div class="track" aria-label="Неделя ${w+1}: ${count} из 7"><span style="width:${count/7*100}%"></span></div><span>${count}/7</span></div>`;}).join('');
}
async function loadUser() {
  if(!client)return;
  try {
    const {data:{user:current},error}=await client.auth.getUser();if(error)throw error;
    if(!current){user=null;profileReady=false;taskMap.clear();updateStats();renderLesson();return;}
    user=current;
    const profile=await client.from('profiles').select('role').eq('id',current.id).single();
    if(profile.error || profile.data?.role!=='owner'){
      user=null;profileReady=false;taskMap.clear();await client.auth.signOut();notice('Для этой личной программы нужен аккаунт владельца SEVER.','error');updateStats();renderLesson();return;
    }
    const result=await client.from('tasks').select('id,user_id,title,scheduled_for,completed,completed_at,updated_at,deleted_at,sync_versions').eq('user_id',current.id).like('title','IT · День %/84:%').is('deleted_at',null);
    if(result.error)throw result.error;
    taskMap.clear();for(const task of result.data||[]){const match=/^IT · День (\d{2})\/84:/.exec(task.title);if(match){const n=Number(match[1]);if(n>=1&&n<=84&&task.user_id===current.id)taskMap.set(n,task);}}
    profileReady=true;updateStats();renderLesson();if(page==='program')renderProgram();if(page==='progress')renderProgress();
    if(taskMap.size!==TOTAL)notice(`В твоём SEVER найдено ${taskMap.size} из 84 учебных задач. Недостающие дни нельзя автоматически завершить.`, 'error');
    if(allBlocks(selected)&&!completed(selected)&&taskMap.has(selected))await synchronizeDay(selected);
  } catch(error){profileReady=false;taskMap.clear();updateStats();renderLesson();console.error('Academy cloud read failed',error);notice('Не удалось загрузить календарь SEVER. Проверь соединение и обнови страницу.','error');}
}
function nextStamp(record) {
  const stamps=record.sync_versions?.fields||{};
  let clock=Math.max(Date.now(),Date.parse(record.updated_at)||0);
  Object.values(stamps).forEach(item=>{if(Array.isArray(item))clock=Math.max(clock,Number(item[0])||0);});
  const life=record.sync_versions?.life?.stamp;if(Array.isArray(life))clock=Math.max(clock,Number(life[0])||0);
  return clock+1;
}
async function synchronizeDay(n) {
  if(syncing||!profileReady||!user||!allBlocks(n)||completed(n))return;
  const task=taskMap.get(n);
  if(!task){notice('Учебная задача отсутствует в SEVER. Ничего не изменено.','error');return;}
  syncing=true;renderLesson();
  try {
    /* Re-read the one verified owner-owned row; never update by date or broad category. */
    const fresh=await client.from('tasks').select('id,user_id,title,completed,completed_at,updated_at,deleted_at,sync_versions').eq('id',task.id).eq('user_id',user.id).single();
    if(fresh.error)throw fresh.error;
    const row=fresh.data;
    if(row.user_id!==user.id||row.deleted_at||!row.title.startsWith(`IT · День ${String(n).padStart(2,'0')}/84:`))throw Error('Учебная задача не совпадает с ожидаемой.');
    if(row.completed){taskMap.set(n,row);updateStats();renderLesson();return;}
    if(row.sync_versions?.v!==1||!row.sync_versions.fields?.completion)throw Error('Схема синхронизации SEVER изменилась; автоматическое завершение остановлено.');
    const stamp=nextStamp(row),iso=new Date(stamp).toISOString();
    const meta=JSON.parse(JSON.stringify(row.sync_versions));
    meta.fields.completion=[stamp,`academy-${crypto.randomUUID()}`];
    const updated=await client.from('tasks').update({completed:true,completed_at:iso,updated_at:iso,sync_versions:meta})
      .eq('id',row.id).eq('user_id',user.id).eq('completed',false).select('id,user_id,title,completed,completed_at,updated_at,sync_versions').maybeSingle();
    if(updated.error)throw updated.error;
    if(!updated.data){const concurrent=await client.from('tasks').select('id,completed').eq('id',row.id).eq('user_id',user.id).single();if(concurrent.error||!concurrent.data?.completed)throw Error('Сервер не подтвердил сохранение.');}
    if(updated.data&&!updated.data.completed)throw Error('Сервер не подтвердил галочку.');
    taskMap.set(n,{...row,...updated.data,completed:true});
    notify('✓ День завершён. Галочка записана в календарь SEVER.');
    updateStats();
  } catch(error){console.error('Academy task completion failed',error);notice('Все блоки выполнены, но сервер не подтвердил галочку. Нажми «Повторить синхронизацию» при наличии связи.','error');notify('Галочка пока не сохранена в SEVER.');}
  finally {syncing=false;renderLesson();}
}
function attachNavigation(){
  $('goToday').onclick=()=>showPage('today');$('goProgram').onclick=()=>showPage('program');$('goProgress').onclick=()=>showPage('progress');
  $('startToday').onclick=()=>changeDay(indexToday());$('showCalendar').onclick=()=>showPage('program');
  $('prevDay').onclick=()=>changeDay(selected-1);$('nextDay').onclick=()=>changeDay(selected+1);
  $('accountButton').onclick=()=>{ $('loginError').textContent='';$('loginDialog').showModal();};
  $('closeLogin').onclick=()=>$('loginDialog').close();
  $('loginForm').addEventListener('submit',async event=>{
    event.preventDefault();if(!client){$('loginError').textContent='Модуль входа не загружен. Проверь интернет и перезагрузи страницу.';return;}
    const email=$('loginEmail').value.trim(),password=$('loginPassword').value;
    $('loginSubmit').disabled=true;$('loginError').textContent='';
    try {const res=await client.auth.signInWithPassword({email,password});if(res.error)throw res.error;$('loginPassword').value='';$('loginDialog').close();await loadUser();if(profileReady)notify('Вход выполнен. Подключена твоя учётная запись SEVER.');}
    catch(err){$('loginError').textContent='Не удалось войти. Проверь почту, пароль и соединение.';console.error('Academy login failed',err);}
    finally{$('loginSubmit').disabled=false;}
  });
  $('logoutButton').onclick=async()=>{if(client)await client.auth.signOut();user=null;profileReady=false;taskMap.clear();$('loginPassword').value='';$('loginDialog').close();updateStats();renderLesson();notify('Выход из академии выполнен. SEVER не затронут.');};
}
async function init(){
  if(!Array.isArray(DAYS)||DAYS.length!==TOTAL||!Array.isArray(window.ACADEMY_ENGLISH)||window.ACADEMY_ENGLISH.length!==TOTAL){notice('Ошибка состава курса: отсутствуют учебные дни.','error');return;}
  selected=indexToday();attachNavigation();renderLesson();updateStats();
  if(!window.supabase?.createClient){notice('Модуль входа не загрузился. Уроки доступны без облачной отметки. Проверь интернет.','error');return;}
  client=window.supabase.createClient(SUPABASE_URL,PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'sever-academy-auth-v1'}});
  $('logoutButton').hidden=false;
  await loadUser();
}
init();
})();