/* Personal Academy overview. Read-only progress; never changes planner tasks or awards fictional badges.
   Every number on this dashboard — map nodes, character level, achievements, calendar events — is
   derived from rows the owner really has in the cloud. A guest sees placeholders, not invented values. */
(()=>{'use strict';
const API='https://vdhazibkfpgclcwyvvbi.supabase.co';
const KEY='sb_publishable_eRp5yJyhKF9EBTDdhi77_Q_iGaZJaUj';
const STORAGE='sever-academy-auth-v1',TOTAL=14,QA='qa_foundation',EN='english_foundation';
/* Published plan of the Academy tasks in SEVER: lesson N is scheduled for 20 September 2026 + (N-1) days, 18:00. */
const PLAN_START=Date.UTC(2026,8,20),PLAN_HOUR='18:00';
const $=id=>document.getElementById(id);
const lessons=window.AcademyPathLessons;
let db=null,owner=false,rows=new Map(),library=null,calendarMonth=null;
const record=(n,track)=>rows.get(`${track}:${n}`);
const practiced=(n,track)=>record(n,track)?.status==='practiced';
const certified=(n,track)=>Boolean(record(n,track)?.certified_at);
const seen=(n,track)=>Boolean(record(n,track));
const completed=n=>practiced(n,QA)&&practiced(n,EN);
const range=(start,end)=>Array.from({length:end-start+1},(_,i)=>start+i);
const count=(start,end)=>range(start,end).filter(completed).length;
const topic=n=>lessons?.qa?.[n-1]?.title||`Урок ${String(n).padStart(2,'0')}`;
const url=(n,track='qa')=>`path.html?lesson=${n}&subject=${track}`;
const firstPending=(start,end)=>range(start,end).find(n=>!completed(n))||end;
const planDate=n=>new Date(PLAN_START+(n-1)*86400000);
const sameDay=(a,b)=>a.getUTCFullYear()===b.getFullYear()&&a.getUTCMonth()===b.getMonth()&&a.getUTCDate()===b.getDate();
const plural=(n,one,few,many)=>{const tens=n%100,units=n%10;if(tens>10&&tens<20)return many;if(units===1)return one;if(units>=2&&units<=4)return few;return many;};
function status(message,kind=''){$('cloudStatus').textContent=message;$('cloudStatus').className=`cloud-status ${kind}`.trim();}

/* ---------- lessons inside a module ---------- */
function link(n,label,track){const node=document.createElement('a');node.href=url(n,track);node.textContent=label;return node;}
function renderLessons(start,end,target){
 const root=$(target);root.replaceChildren();
 for(let n=start;n<=end;n++){
  const item=link(n,'');const num=document.createElement('small');num.className='lesson-number';num.textContent=String(n).padStart(2,'0');
  const title=document.createElement('span');title.textContent=topic(n);
  const state=document.createElement('b');
  state.textContent=owner?(certified(n,QA)&&certified(n,EN)?'★ Зачёт':completed(n)?'✓ Готово':practiced(n,QA)||practiced(n,EN)?'1 / 2':'Открыть'):'↗';
  item.append(num,title,state);root.append(item);
 }
}
function renderModule(start,end,prefix){
 const achieved=count(start,end),tag=$(`${prefix}State`),text=$(`${prefix}Text`),value=$(`${prefix}Count`);
 text.textContent=owner?`${range(start,end).filter(n=>seen(n,QA)||seen(n,EN)).length} из 7 начато`:'Прогресс появится после входа';
 value.textContent=owner?`${achieved} / 7 уроков`:'7 уроков';
 $(`${prefix}Fill`).style.width=owner?`${achieved/7*100}%`:'0%';
 tag.classList.toggle('done',owner&&achieved===7);
 if(owner&&achieved===7)tag.textContent='ПРОЙДЕНО';
 else if(prefix==='weekOne')tag.textContent='НАЧАЛО';
 else tag.textContent=owner&&count(1,7)===7?'ТЕКУЩИЙ':'СЛЕДУЮЩИЙ';
 const card=$(`${prefix}Lessons`).parentElement;
 const startLink=card.querySelector('.module-buttons a');
 if(startLink)startLink.href=url(owner?firstPending(start,end):start);
 renderLessons(start,end,`${prefix}Lessons`);
}

/* ---------- course map ---------- */
const MAP_NODES=[{x:70,y:130,label:'Модуль 1'},{x:320,y:58,label:'Модуль 2'},{x:745,y:70,label:'Этап 2'}];
function renderMap(){
 const group=$('mapNodes');if(!group)return;
 group.replaceChildren();
 const done=[owner&&count(1,7)===7,owner&&count(8,14)===14,false];
 const active=[true,owner&&count(1,7)===7,false];
 MAP_NODES.forEach((node,index)=>{
  const svgns='http://www.w3.org/2000/svg';
  const marker=document.createElementNS(svgns,'circle');
  marker.setAttribute('cx',node.x);marker.setAttribute('cy',node.y);marker.setAttribute('r','13');
  marker.setAttribute('class',`map-node${done[index]?' done':active[index]?' active':' locked'}`);
  const caption=document.createElementNS(svgns,'text');
  caption.setAttribute('x',node.x);caption.setAttribute('y',node.y+34);caption.setAttribute('class','map-label');
  caption.setAttribute('text-anchor',index===MAP_NODES.length-1?'end':index===0?'start':'middle');
  caption.textContent=node.label;
  group.append(marker,caption);
 });
 $('mapTag').textContent=owner&&count(1,14)===14?'ЭТАП 1 ПРОЙДЕН':'ЭТАП 1 / 2';
}

/* ---------- character and achievements ---------- */
const ACHIEVEMENTS=[
 {id:'viewed',label:'Первая тема разобрана',test:()=>range(1,TOTAL).some(n=>seen(n,QA)||seen(n,EN))},
 {id:'practice',label:'Первая практика подтверждена',test:()=>range(1,TOTAL).some(n=>practiced(n,QA)||practiced(n,EN))},
 {id:'lesson',label:'Первый урок закрыт целиком',test:()=>range(1,TOTAL).some(completed)},
 {id:'exam',label:'Первый зачёт сдан',test:()=>range(1,TOTAL).some(n=>certified(n,QA)||certified(n,EN))},
 {id:'module',label:'Модуль 1 пройден полностью',test:()=>count(1,7)===7}
];
const LEVELS=[
 {name:'Новичок',hint:'Ты только открыл кабинет. Разбери первую тему и ответь на два вопроса.'},
 {name:'Читатель',hint:'Тема разобрана. Теперь напиши свою работу и подтверди практику.'},
 {name:'Практик',hint:'Практика пошла. Закрывай урок целиком: QA и английский вместе.'},
 {name:'Исследователь',hint:'Урок закрыт полностью. Следующий шаг — объективный зачёт.'},
 {name:'Джуниор-исследователь',hint:'Зачёт сдан. Держи темп: впереди весь модуль.'},
 {name:'Готов к этапу 2',hint:'Модуль 1 пройден. Этап 2 откроется после зачёта по всем 14 урокам QA.'}
];
function characterArt(level){
 /* Original figure: the pose stays, the palette and the data halo grow with real progress. */
 const glow=['#3a4a5c','#4d6a78','#6f9a7a','#8fd9ff','#b8f08e','#d0ffaa'][level];
 const accent=['#5c7283','#7189a0','#8ab88f','#8fd9ff','#b8f08e','#d0ffaa'][level];
 return `<svg viewBox="0 0 160 170" role="img" aria-label="Персонаж уровня ${level+1}">
  <circle cx="80" cy="150" r="46" fill="${glow}" opacity=".16"/>
  <circle cx="80" cy="44" r="21" fill="#e8f2f7"/>
  <path d="M59 40a21 21 0 0 1 42 0c0 4-4 2-8-2-6 5-20 7-28 2-3 3-6 4-6 0z" fill="#1c2b38"/>
  <path d="M55 74c0-12 11-18 25-18s25 6 25 18v42c0 6-5 10-11 10H66c-6 0-11-4-11-10z" fill="#2b3f52"/>
  <path d="M55 86l-16 26a7 7 0 0 0 11 8l14-18z" fill="#2b3f52"/>
  <path d="M105 86l16 26a7 7 0 0 1-11 8l-14-18z" fill="#2b3f52"/>
  <circle cx="80" cy="96" r="20" fill="${accent}" opacity=".9"/>
  <path d="M80 96V76a20 20 0 0 1 17 30z" fill="#1c2b38" opacity=".55"/>
  <rect x="62" y="126" width="16" height="34" rx="6" fill="#22323f"/>
  <rect x="84" y="126" width="16" height="34" rx="6" fill="#22323f"/>
 </svg>`;
}
function renderCharacter(){
 const unlocked=owner?ACHIEVEMENTS.filter(item=>item.test()):[];
 const level=owner?unlocked.length:0;
 const profile=LEVELS[Math.min(level,LEVELS.length-1)];
 $('charLevel').textContent=owner?`УРОВЕНЬ ${level+1}`:'ГОСТЬ';
 $('charName').textContent=owner?profile.name:'Войди, чтобы увидеть';
 $('charHint').textContent=owner?profile.hint:'Персонаж растёт только от подтверждённых стадий: ознакомился, попрактиковался, сдал зачёт. Без входа он не придумывается.';
 $('charArt').innerHTML=characterArt(owner?Math.min(level,5):0);
 $('charStars').textContent='★'.repeat(level)+'☆'.repeat(ACHIEVEMENTS.length-level);
 $('charStars').setAttribute('aria-label',`Достижений: ${level} из ${ACHIEVEMENTS.length}`);
 $('charCount').textContent=owner?`${level}/${ACHIEVEMENTS.length} достижений`:'—/5 достижений';
 const list=$('charList');list.replaceChildren();
 for(const item of ACHIEVEMENTS){
  const line=document.createElement('li');
  const got=owner&&item.test();
  line.className=got?'got':'';
  line.textContent=`${got?'★':'☆'} ${item.label}`;
  list.append(line);
 }
}

/* ---------- calendar ---------- */
function renderCalendar(){
 const grid=$('calGrid');if(!grid)return;
 const today=new Date();
 if(!calendarMonth)calendarMonth=new Date(today.getFullYear(),today.getMonth(),1);
 $('calMonth').textContent=calendarMonth.toLocaleDateString('ru-RU',{month:'long',year:'numeric'});
 grid.replaceChildren();
 const first=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1);
 const shift=(first.getDay()+6)%7;
 const days=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0).getDate();
 const planned=new Map(range(1,TOTAL).map(n=>[planDate(n).toISOString().slice(0,10),n]));
 let row=document.createElement('tr');
 for(let i=0;i<shift;i++)row.append(document.createElement('td'));
 for(let day=1;day<=days;day++){
  const date=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),day);
  const cell=document.createElement('td');
  const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const lesson=planned.get(key);
  cell.textContent=String(day);
  const classes=[];
  if(date.toDateString()===today.toDateString())classes.push('today');
  if(lesson){classes.push(owner&&completed(lesson)?'planned done':'planned');cell.title=`Урок ${String(lesson).padStart(2,'0')} по плану, ${PLAN_HOUR}`;}
  cell.className=classes.join(' ');
  row.append(cell);
  if((shift+day)%7===0){grid.append(row);row=document.createElement('tr');}
 }
 if(row.children.length)grid.append(row);
 const events=$('events');events.replaceChildren();
 const upcoming=range(1,TOTAL).filter(n=>!owner||!completed(n)).slice(0,2);
 for(const n of upcoming){
  const item=document.createElement('li');
  const anchor=document.createElement('a');anchor.href=url(n);
  const name=document.createElement('b');name.textContent=`Урок ${String(n).padStart(2,'0')} · ${topic(n)}`;
  const when=document.createElement('small');when.textContent=`${planDate(n).toLocaleDateString('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'})}, ${PLAN_HOUR} по плану`;
  anchor.append(name,when);item.append(anchor);events.append(item);
 }
 if(!events.children.length){
  const item=document.createElement('li');item.className='empty';item.textContent='Все 14 уроков закрыты. Плановых занятий больше нет.';events.append(item);
 }
}

/* ---------- reading diary preview ---------- */
function renderLibrary(){
 const summary=$('bonusSummary'),quick=$('quickLibrary');
 if(!summary)return;
 if(!owner){
  summary.textContent='Книга, глава, свой конспект, задание по QA и эксперимент на Python. Тексты книг не публикуются.';
  if(quick)quick.textContent='Личный дневник чтения';
  return;
 }
 if(!library){summary.textContent='Не удалось прочитать дневник чтения. Открой раздел, чтобы проверить.';return;}
 if(!library.total){
  summary.textContent='Дневник пока пуст: ни одной записи. Первая занимает пару минут.';
  if(quick)quick.textContent='Пока нет записей';
  return;
 }
 const recent=library.recent.map(item=>item.chapter?`${item.book_title} — ${item.chapter}`:item.book_title).join(' · ');
 summary.textContent=`${library.total} ${plural(library.total,'запись','записи','записей')} · ${library.books} ${plural(library.books,'книга','книги','книг')}. Последнее: ${recent}.`;
 if(quick)quick.textContent=`${library.total} ${plural(library.total,'запись','записи','записей')} в дневнике`;
}

/* ---------- dashboard ---------- */
function render(){
 if(!lessons||lessons.qa?.length!==TOTAL||lessons.english?.length!==TOTAL){status('Не удалось загрузить программу. Обнови страницу.','bad');return;}
 const done=count(1,TOTAL),q=range(1,TOTAL).filter(n=>practiced(n,QA)).length,e=range(1,TOTAL).filter(n=>practiced(n,EN)).length;
 const current=owner?firstPending(1,TOTAL):1;
 const nextTrack=owner&&practiced(current,QA)&&!practiced(current,EN)?'english':'qa';
 $('heroContinue').href=url(current,nextTrack);$('currentLink').href=url(current,nextTrack);
 $('quickLesson').href=url(current,nextTrack);
 $('quickLessonName').textContent=`Урок ${String(current).padStart(2,'0')} · ${topic(current)}`;
 $('currentHeading').textContent=owner&&done===TOTAL?'Все 14 уроков пройдены':`Урок ${String(current).padStart(2,'0')} / 14`;
 $('currentTopic').textContent=owner&&done===TOTAL?'Ты завершил доступный модуль. Повтори сложные темы или открой свои конспекты.':topic(current);
 $('currentQa').textContent=owner?(certified(current,QA)?'★ Зачёт':practiced(current,QA)?'✓ Практика':record(current,QA)?.status==='draft'?'Черновик':record(current,QA)?'Ознакомился':'К выполнению'):'После входа';
 $('currentEnglish').textContent=owner?(certified(current,EN)?'★ Зачёт':practiced(current,EN)?'✓ Практика':record(current,EN)?.status==='draft'?'Черновик':record(current,EN)?'Ознакомился':'К выполнению'):'После входа';
 $('percent').textContent=owner?`${Math.round(done/TOTAL*100)}%`:'—';
 $('progressRing').style.setProperty('--ring-angle',owner?`${done/TOTAL*360}deg`:'0deg');
 if(owner)$('progressRing').setAttribute('aria-valuenow',String(done));else $('progressRing').removeAttribute('aria-valuenow');
 $('progressHeading').textContent=owner?`${done} из ${TOTAL} уроков`:'Войди для прогресса';
 $('progressDescription').textContent=owner?'Урок засчитывается только после двух сохранённых практик — QA и английского.':'Без входа уроки можно читать. Данные не подменяются вымышленными процентами.';
 $('qaProgress').textContent=owner?`${q} / ${TOTAL}`:'— / 14';$('englishProgress').textContent=owner?`${e} / ${TOTAL}`:'— / 14';
 $('qaFill').style.width=owner?`${q/TOTAL*100}%`:'0%';$('englishFill').style.width=owner?`${e/TOTAL*100}%`:'0%';
 const examsQa=range(1,TOTAL).filter(n=>certified(n,QA)).length;
 $('stageFill').style.width=owner?`${examsQa/TOTAL*100}%`:'0%';
 $('stageNote').textContent=owner?`Зачётов по QA: ${examsQa} из ${TOTAL}`:'Зачётов по QA: — из 14';
 $('stageTag').textContent=owner&&examsQa===TOTAL?'ГОТОВ К ОТКРЫТИЮ':'ЗАКРЫТ';
 $('account').textContent=owner?'Аккаунт ✓':'Войти';$('logout').hidden=!owner;
 renderModule(1,7,'weekOne');renderModule(8,14,'weekTwo');
 renderMap();renderCharacter();renderCalendar();renderLibrary();
}

async function load(){
 owner=false;rows.clear();library=null;render();
 if(!db){status('Модуль облака недоступен. Уроки можно открыть без входа; прогресс пока не загрузится.','bad');return;}
 try{
  /* Session presence is only a guest check; getUser() and profile verify access. */
  if(typeof db.auth.getSession==='function'){
   const session=await db.auth.getSession();if(session.error)throw session.error;
   if(!session.data?.session){status('Гостевой просмотр. Войди, чтобы увидеть свой настоящий прогресс.');return;}
  }
  const auth=await db.auth.getUser();if(auth.error)throw auth.error;
  if(!auth.data?.user){status('Гостевой просмотр. Войди, чтобы увидеть свой настоящий прогресс.');return;}
  const profile=await db.from('profiles').select('role').eq('id',auth.data.user.id).single();
  if(profile.error||profile.data?.role!=='owner'){status('Эта личная программа доступна только владельцу. Войди в свой аккаунт.','bad');return;}
  /* certified_at appears only after the three-stage migration; an older database still works. */
  let result=await db.from('academy_path_progress').select('track,lesson_number,status,certified_at').eq('user_id',auth.data.user.id).limit(100);
  if(result.error)result=await db.from('academy_path_progress').select('track,lesson_number,status').eq('user_id',auth.data.user.id).limit(100);
  if(result.error)throw result.error;
  rows=new Map((result.data||[]).filter(item=>[QA,EN].includes(item.track)&&Number.isInteger(item.lesson_number)&&item.lesson_number>=1&&item.lesson_number<=TOTAL).map(item=>[`${item.track}:${item.lesson_number}`,item]));
  owner=true;
  try{
    const diary=await db.from('academy_reading').select('book_title,chapter,updated_at').eq('user_id',auth.data.user.id).order('updated_at',{ascending:false}).limit(50);
    library=diary.error?null:{total:(diary.data||[]).length,books:new Set((diary.data||[]).map(item=>item.book_title)).size,recent:(diary.data||[]).slice(0,3)};
  }catch(error){console.error('Academy library preview failed',error);library=null;}
  render();status('✓ Облачный прогресс загружен. Перейди к любому уроку — черновики останутся на месте.','good');
 }catch(error){console.error('Academy overview load failed',error);owner=false;rows.clear();render();status('Не удалось проверить прогресс. Попробуй обновить страницу при стабильном соединении.','bad');}
}
async function login(event){event.preventDefault();if(!db)return;
 $('loginError').textContent='';$('loginSubmit').disabled=true;
 try{
  const signed=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(signed.error)throw signed.error;
  $('password').value='';await load();
  if(owner)$('loginDialog').close();else $('loginError').textContent='Вход выполнен, но доступ владельца или прогресс не подтверждены. Проверь сообщение на странице.';
 }catch(error){console.error('Academy overview login failed',error);$('loginError').textContent='Вход не получился. Проверь почту, пароль и соединение.';}
 finally{$('loginSubmit').disabled=false;}
}
async function logout(){if(!db)return;try{const result=await db.auth.signOut();if(result.error)throw result.error;owner=false;rows.clear();render();status('Ты вышел из Academy. Твой прогресс остаётся в облаке.');$('loginDialog').close();$('password').value='';}catch(error){$('loginError').textContent='Не получилось выйти. Повтори попытку.';}}
function init(){
 for(const button of document.querySelectorAll('.toggle-lessons'))button.addEventListener('click',()=>{
  const target=$(button.getAttribute('aria-controls'));const expanded=button.getAttribute('aria-expanded')==='true';target.hidden=expanded;button.setAttribute('aria-expanded',String(!expanded));button.textContent=expanded?'Уроки ▾':'Скрыть ↑';
 });
 $('calPrev').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderCalendar();});
 $('calNext').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderCalendar();});
 $('account').addEventListener('click',()=>{if(owner){$('logout').hidden=false;}$('loginError').textContent='';$('loginDialog').showModal();});
 $('closeLogin').addEventListener('click',()=>$('loginDialog').close());$('loginForm').addEventListener('submit',login);$('logout').addEventListener('click',logout);
 render();
 if(!window.supabase?.createClient){status('Модуль входа не загрузился. Уроки можно открыть, но прогресс пока не виден.','bad');return;}
 try{db=window.supabase.createClient(API,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:STORAGE}});void load();}
 catch(error){console.error('Academy overview client error',error);status('Не удалось подключить облако. Обнови страницу.','bad');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
