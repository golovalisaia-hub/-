/* AI tutor: session-only conversation, explicitly supplied lesson context, no progress writes. */
(()=>{'use strict';
const API='https://vdhazibkfpgclcwyvvbi.supabase.co';
const KEY='sb_publishable_eRp5yJyhKF9EBTDdhi77_Q_iGaZJaUj';
const STORAGE='sever-academy-auth-v1';
const $=id=>document.getElementById(id);
/* Подпись кнопки меняется, иконка остаётся на месте. */
const setLabel=(node,text)=>{const span=node.querySelector('.btn-label');(span||node).textContent=text;};
const setIcon=(node,glyph)=>{const span=node.querySelector('.btn-icon');if(span)span.textContent=glyph;};
const iconButton=(glyph,text,className)=>{const b=document.createElement('button');b.type='button';if(className)b.className=className;const i=document.createElement('span');i.className='btn-icon';i.setAttribute('aria-hidden','true');i.textContent=glyph;const l=document.createElement('span');l.className='btn-label';l.textContent=text;b.append(i,l);return b;};
const lessons=window.AcademyPathLessons;
let db=null,token='',ready=false,busy=false,mode='explain',history=[];
const params=new URLSearchParams(location.search);
const status=(message,kind='')=>{const el=$('aiStatus');el.textContent=message;el.className=`ai-status ${kind}`.trim();};
function setReady(state){ready=state;$('question').disabled=!state;$('send').disabled=!state;$('chatHint').textContent=state?'Сообщение отправляется только после нажатия.':'Сначала подключи API и войди в Academy.';}
function current(){
 const subject=$('subject').value,number=Number($('lesson').value)||1;
 const course=subject==='qa'?lessons?.qa:subject==='english'?lessons?.english:null;
 const item=course?.[number-1];
 return {subject,lesson:subject==='python'?null:number,title:item?.title||'Пробная практика Python',theory:item?.theory||'',practice:item?.practice||''};
}
function renderLesson(){
 const context=current();$('lessonTopic').textContent=context.subject==='python'?'Пробный Python: задавай вопросы про переменные, ввод и вывод. Основной этап Python ещё не опубликован.':context.title;
 $('returnToLesson').href=context.subject==='python'?'skills.html':`path.html?lesson=${context.lesson}&subject=${context.subject}`;
}
function fillLessons(){
 const select=$('lesson'),count=$('subject').value==='python'?7:14,previous=Number(select.value)||Number(params.get('lesson'))||1;
 select.replaceChildren();for(let n=1;n<=count;n++){const option=document.createElement('option');option.value=String(n);option.textContent=`Урок ${String(n).padStart(2,'0')}`;select.append(option);}
 select.value=String(Math.min(Math.max(previous,1),count));renderLesson();
}
function add(role,value){
 const el=document.createElement('div');el.className=`chat-message ${role}`;
 const name=document.createElement('strong');name.textContent=role==='user'?'Ты':'Наставник';
 const line=document.createElement('p');line.textContent=value;el.append(name,line);$('chatMessages').append(el);
 el.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 return el;
}
function switchMode(next){mode=next;for(const button of document.querySelectorAll('.mode')){const active=button.dataset.mode===next;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
 const prompts={explain:'Напиши, что непонятно в теме.',hint:'Опиши, что уже попробовал и где застрял.',practice:'Напиши, что хочешь потренировать, и получишь одно задание.',review:'Вставь свой ответ: наставник разберёт его по существу.'};
 $('question').placeholder=prompts[next];}
async function prepare(){
 if(!window.supabase?.createClient){status('Не удалось загрузить модуль входа. Обнови страницу.','bad');return;}
 try{
  db=window.supabase.createClient(API,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:STORAGE}});
  const session=await db.auth.getSession();if(session.error)throw session.error;
  if(!session.data?.session?.access_token){status('Войди на главной странице Academy тем же аккаунтом, что используешь для уроков.','bad');return;}
  const verified=await db.auth.getUser();if(verified.error||!verified.data?.user){status('Сессия истекла. Войди в Academy повторно.','bad');return;}
  token=session.data.session.access_token;
  const response=await fetch(`${API}/functions/v1/academy-tutor`,{method:'GET',headers:{Authorization:`Bearer ${token}`,apikey:KEY}});
  const info=await response.json();if(!response.ok){status(info.message||'Не получилось проверить доступ.','bad');return;}
  if(!info.configured){status('Интерфейс и защищённый сервер готовы. Осталось добавить личный ключ OpenAI в секрет ACADEMY_OPENAI_API_KEY в Supabase.','bad');return;}
  setReady(true);status('✓ Наставник подключён. Выбери режим и напиши свой вопрос.','good');
 }catch(error){console.error('Academy tutor connection unavailable',error);status('Не удалось подключиться к наставнику. Проверь соединение и обнови страницу.','bad');}
}
async function send(event){event.preventDefault();if(!ready||busy)return;
 const message=$('question').value.trim();if(!message)return;
 busy=true;$('send').disabled=true;setLabel($('send'),'Отправляем…');$('chatHint').textContent='Ждём ответ модели. Это может занять несколько секунд.';
 add('user',message);$('question').value='';
 try{
  const session=await db.auth.getSession();if(session.error||!session.data?.session?.access_token)throw Error('AUTH');
  const response=await fetch(`${API}/functions/v1/academy-tutor`,{method:'POST',headers:{Authorization:`Bearer ${session.data.session.access_token}`,apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({...current(),mode,message,history:history.slice(-6)})});
  let data;try{data=await response.json();}catch{throw Error('Ошибка ответа сервера.');}
  if(!response.ok)throw Error(data.message||'Наставник сейчас недоступен.');
  if(typeof data.reply!=='string'||!data.reply.trim())throw Error('Наставник вернул пустой ответ.');
  add('assistant',data.reply);history.push({role:'user',content:message.slice(0,900)},{role:'assistant',content:data.reply.slice(0,900)});history=history.slice(-6);
  status('✓ Ответ получен. Теперь попробуй объяснить решение своими словами.','good');
 }catch(error){const info=error instanceof Error&&error.message==='AUTH'?'Войди повторно на главной странице Academy.':error instanceof Error?error.message:'Попробуй позже.';
  add('assistant',`Ответ пока не получен: ${info}`);status(info,'bad');$('question').value=message;
 }finally{busy=false;$('send').disabled=!ready;setLabel($('send'),'Отправить');$('chatHint').textContent=ready?'Сообщение отправляется только после нажатия.':'Сначала подключи API и войди в Academy.';}
}
function init(){
 const subject=params.get('subject');if(['qa','english','python'].includes(subject))$('subject').value=subject;
 fillLessons();$('subject').addEventListener('change',()=>{fillLessons();history=[];$('chatMessages').replaceChildren();add('assistant','Тема изменилась. Начнём новый разговор — напиши вопрос по выбранному предмету.');});
 $('lesson').addEventListener('change',()=>{renderLesson();history=[];$('chatMessages').replaceChildren();add('assistant','Урок изменился. Напиши, что хочешь разобрать.');});
 for(const button of document.querySelectorAll('.mode'))button.addEventListener('click',()=>switchMode(button.dataset.mode));
 $('clearChat').addEventListener('click',()=>{history=[];$('chatMessages').replaceChildren();add('assistant','Новый разговор. Какая часть темы вызывает вопросы?');$('question').focus();});
 $('chatForm').addEventListener('submit',send);
 $('question').addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter')$('chatForm').requestSubmit();});
 switchMode(mode);setReady(false);void prepare();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
