/* Personal Academy overview. Read-only progress; never changes planner tasks or awards fictional badges. */
(()=>{'use strict';
const API='https://vdhazibkfpgclcwyvvbi.supabase.co';
const KEY='sb_publishable_eRp5yJyhKF9EBTDdhi77_Q_iGaZJaUj';
const STORAGE='sever-academy-auth-v1',TOTAL=14,QA='qa_foundation',EN='english_foundation';
const $=id=>document.getElementById(id);
const lessons=window.AcademyPathLessons;
let db=null,owner=false,rows=new Map();
const record=(n,track)=>rows.get(`${track}:${n}`);
const practiced=(n,track)=>record(n,track)?.status==='practiced';
const completed=n=>practiced(n,QA)&&practiced(n,EN);
const count=(start,end)=>Array.from({length:end-start+1},(_,i)=>start+i).filter(completed).length;
const topic=n=>lessons?.qa?.[n-1]?.title||`Урок ${String(n).padStart(2,'0')}`;
const url=(n,track='qa')=>`path.html?lesson=${n}&subject=${track}`;
const firstPending=(start,end)=>Array.from({length:end-start+1},(_,i)=>start+i).find(n=>!completed(n))||end;
function status(message,kind=''){$('cloudStatus').textContent=message;$('cloudStatus').className=`cloud-status ${kind}`.trim();}
function link(n,label,track){const node=document.createElement('a');node.href=url(n,track);node.textContent=label;return node;}
function renderLessons(start,end,target){
 const root=$(target);root.replaceChildren();
 for(let n=start;n<=end;n++){
  const item=link(n,'');const num=document.createElement('small');num.className='lesson-number';num.textContent=String(n).padStart(2,'0');
  const title=document.createElement('span');title.textContent=topic(n);
  const state=document.createElement('b');state.textContent=owner?(completed(n)?'✓ Готово':practiced(n,QA)||practiced(n,EN)?'1 / 2':'Открыть'):'↗';
  item.append(num,title,state);root.append(item);
 }
}
function renderModule(start,end,prefix){
 const achieved=count(start,end),tag=$(`${prefix}State`),text=$(`${prefix}Text`),value=$(`${prefix}Count`);
 text.textContent=owner?'Завершено уроков':'Прогресс после входа';value.textContent=owner?`${achieved} / 7`:'—';
 $(`${prefix}Fill`).style.width=owner?`${achieved/7*100}%`:'0%';
 tag.classList.toggle('done',owner&&achieved===7);
 if(owner&&achieved===7)tag.textContent='ПРОЙДЕНО';
 else if(prefix==='weekOne')tag.textContent='НАЧАЛО';
 else tag.textContent=owner&&count(1,7)===7?'ТЕКУЩИЙ':'СЛЕДУЮЩИЙ';
 const startLink=document.querySelector(`#${prefix==='weekOne'?'weekOneLessons':'weekTwoLessons'}`).parentElement.querySelector('.module-buttons a');
 if(startLink)startLink.href=url(owner?firstPending(start,end):start);
 renderLessons(start,end,`${prefix}Lessons`);
}
function render(){
 if(!lessons||lessons.qa?.length!==TOTAL||lessons.english?.length!==TOTAL){status('Не удалось загрузить программу. Обнови страницу.','bad');return;}
 const done=count(1,TOTAL),q=Array.from({length:TOTAL},(_,i)=>i+1).filter(n=>practiced(n,QA)).length,e=Array.from({length:TOTAL},(_,i)=>i+1).filter(n=>practiced(n,EN)).length;
 const current=owner?firstPending(1,TOTAL):1;
 const nextTrack=owner&&practiced(current,QA)&&!practiced(current,EN)?'english':'qa';
 $('heroContinue').href=url(current,nextTrack);$('currentLink').href=url(current,nextTrack);
 $('currentHeading').textContent=owner&&done===TOTAL?'Все 14 уроков пройдены':`Урок ${String(current).padStart(2,'0')} / 14`;
 $('currentTopic').textContent=owner&&done===TOTAL?'Ты завершил доступный модуль. Повтори сложные темы или открой свои конспекты.':topic(current);
 $('currentQa').textContent=owner?(practiced(current,QA)?'✓ Сохранено':record(current,QA)?.status==='draft'?'Черновик':'К выполнению'):'После входа';
 $('currentEnglish').textContent=owner?(practiced(current,EN)?'✓ Сохранено':record(current,EN)?.status==='draft'?'Черновик':'К выполнению'):'После входа';
 $('percent').textContent=owner?`${Math.round(done/TOTAL*100)}%`:'—';
 $('progressRing').style.setProperty('--ring-angle',owner?`${done/TOTAL*360}deg`:'0deg');
 if(owner)$('progressRing').setAttribute('aria-valuenow',String(done));else $('progressRing').removeAttribute('aria-valuenow');
 $('progressHeading').textContent=owner?`${done} из ${TOTAL} уроков`:'Войди для прогресса';
 $('progressDescription').textContent=owner?'Урок засчитывается только после двух сохранённых практик — QA и английского.':'Без входа уроки можно читать. Данные не подменяются вымышленными процентами.';
 $('qaProgress').textContent=owner?`${q} / ${TOTAL}`:'— / 14';$('englishProgress').textContent=owner?`${e} / ${TOTAL}`:'— / 14';
 $('qaFill').style.width=owner?`${q/TOTAL*100}%`:'0%';$('englishFill').style.width=owner?`${e/TOTAL*100}%`:'0%';
 $('account').textContent=owner?'Аккаунт ✓':'Войти';$('logout').hidden=!owner;
 renderModule(1,7,'weekOne');renderModule(8,14,'weekTwo');
}
async function load(){
 owner=false;rows.clear();render();
 if(!db){status('Модуль облака недоступен. Уроки можно открыть без входа; прогресс пока не загрузится.','bad');return;}
 try{
  const auth=await db.auth.getUser();if(auth.error)throw auth.error;
  if(!auth.data?.user){status('Гостевой просмотр. Войди, чтобы увидеть свой настоящий прогресс.');return;}
  const profile=await db.from('profiles').select('role').eq('id',auth.data.user.id).single();
  if(profile.error||profile.data?.role!=='owner'){status('Эта личная программа доступна только владельцу. Войди в свой аккаунт.','bad');return;}
  const result=await db.from('academy_path_progress').select('track,lesson_number,status').eq('user_id',auth.data.user.id).limit(100);
  if(result.error)throw result.error;
  rows=new Map((result.data||[]).filter(item=>[QA,EN].includes(item.track)&&Number.isInteger(item.lesson_number)&&item.lesson_number>=1&&item.lesson_number<=TOTAL).map(item=>[`${item.track}:${item.lesson_number}`,item]));
  owner=true;render();status('✓ Облачный прогресс загружен. Перейди к любому уроку — черновики останутся на месте.','good');
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
 $('account').addEventListener('click',()=>{if(owner){$('logout').hidden=false;}$('loginError').textContent='';$('loginDialog').showModal();});
 $('closeLogin').addEventListener('click',()=>$('loginDialog').close());$('loginForm').addEventListener('submit',login);$('logout').addEventListener('click',logout);
 render();
 if(!window.supabase?.createClient){status('Модуль входа не загрузился. Уроки можно открыть, но прогресс пока не виден.','bad');return;}
 try{db=window.supabase.createClient(API,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:STORAGE}});void load();}
 catch(error){console.error('Academy overview client error',error);status('Не удалось подключить облако. Обнови страницу.','bad');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
