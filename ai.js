/* Academy AI tutor: explicit lesson context, optional user-approved draft transfer, no progress writes. */
(()=>{'use strict';
const API='https://vdhazibkfpgclcwyvvbi.supabase.co';
const KEY='sb_publishable_eRp5yJyhKF9EBTDdhi77_Q_iGaZJaUj'; // Public key, NOT the OpenAI secret.
const STORAGE='sever-academy-auth-v1',TRANSFER='academy-tutor-transfer-v1';
const $=id=>document.getElementById(id);
const lessons=window.AcademyPathLessons;
const PYTHON=[
 {title:'Строки: убираем пробелы',practice:'Напиши clean_title(title), возвращающую title.strip().',criteria:'Есть параметр, return, очистка краёв строки и пустой ввод.'},
 {title:'Условия: границы 1–20',practice:'Напиши valid_title(title) и проверь длины 0, 1, 20 и 21 после strip().',criteria:'Включительные границы, очистка, логическое значение, проверки крайних случаев.'},
 {title:'PASS или FAIL',practice:'Напиши test_result(expected, actual), сравни значения с учётом регистра.',criteria:'Оператор ==, возврат строк PASS/FAIL, разные значения и регистр.'},
 {title:'Список и цикл',practice:'Напиши count_failed(results): посчитай только точные FAIL.',criteria:'Цикл или равнозначное решение, целое число, пустой список, регистр.'}
];
const params=new URLSearchParams(location.search);
let db=null,ready=false,busy=false,mode='explain',history=[],conversation=0;
const status=(message,kind='')=>{const el=$('aiStatus');el.textContent=message;el.className=`ai-status ${kind}`.trim();};
const current=()=>{
 const subject=$('subject').value,number=Number($('lesson').value)||1;
 const items=subject==='qa'?lessons?.qa:subject==='english'?lessons?.english:PYTHON;
 const item=items?.[number-1];
 return {subject,lesson:number,title:item?.title||'Тема недоступна',theory:item?.theory||'',practice:item?.practice||'',criteria:item?.criteria||''};
};
function setReady(value){ready=value;$('question').disabled=!value;$('send').disabled=!value||busy;
 $('chatHint').textContent=value?'Отправляется только после нажатия. ИИ может ошибаться — проверяй его разбор.':'Сначала войди в Academy и подключи API.';
}
function rubric(){
 let details=$('aiRubric');if(!details){details=document.createElement('details');details.id='aiRubric';details.className='ai-criteria';
  const summary=document.createElement('summary');summary.textContent='Цель, задание и критерии проверки';
  const content=document.createElement('div');content.id='aiRubricText';details.append(summary,content);$('lessonTopic').after(details);}
 const context=current();const area=$('aiRubricText');area.replaceChildren();
 for(const [label,text] of [['Задание',context.practice],['Проверь себя',context.criteria]]){
  const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=label+': ';
  p.append(strong,document.createTextNode(text||'Для этой темы пока нет задания.'));area.append(p);
 }
 const reminder=document.createElement('p');reminder.textContent='Наставник оценивает только присланный текст; устную речь и выполнение кода он не наблюдает.';area.append(reminder);
}
function renderLesson(){const context=current();$('lessonTopic').textContent=context.title;
 $('returnToLesson').href=context.subject==='python'?'skills.html':`path.html?lesson=${context.lesson}&subject=${context.subject}`;
 rubric();}
function fillLessons(){const select=$('lesson');const count=$('subject').value==='python'?PYTHON.length:14;
 const previous=Number(select.value)||Number(params.get('lesson'))||1;select.replaceChildren();
 for(let n=1;n<=count;n++){const option=document.createElement('option');option.value=String(n);option.textContent=`Урок ${String(n).padStart(2,'0')}`;select.append(option);}
 select.value=String(Math.min(Math.max(previous,1),count));renderLesson();}
function add(role,value){const el=document.createElement('div');el.className=`chat-message ${role}`;
 const name=document.createElement('strong');name.textContent=role==='user'?'Ты':'Наставник';
 const line=document.createElement('p');line.textContent=value;el.append(name,line);$('chatMessages').append(el);
 el.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return el;
}
function resetConversation(text){conversation++;history=[];$('chatMessages').replaceChildren();add('assistant',text);}
function switchMode(next){mode=next;for(const button of document.querySelectorAll('.mode')){
 const active=button.dataset.mode===next;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
 $('question').placeholder={explain:'Что именно непонятно? Можно коротко.',hint:'Напиши, что пробовал и где застрял.',practice:'Какой навык хочешь отработать? Наставник даст одну новую задачу.',review:'Вставь свою работу. Наставник сравнит её с критериями урока.'}[next];
}
function importDraft(){let raw=null;try{raw=sessionStorage.getItem(TRANSFER);sessionStorage.removeItem(TRANSFER);}catch{return;}
 if(!raw)return;try{const value=JSON.parse(raw),context=current();
  if(value.lesson!==context.lesson||value.subject!==context.subject||typeof value.text!=='string'||!value.text.trim())return;
  $('question').value=value.text.slice(0,2000);switchMode('review');
  status('Черновик перенесён из урока. Проверь текст: он отправится ИИ только по нажатию «Отправить».','good');
 }catch{/* Corrupt session value is discarded. */}}
async function prepare(){
 if(!window.supabase?.createClient){status('Модуль входа не загрузился. Обнови страницу.','bad');return;}
 try{db=window.supabase.createClient(API,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:STORAGE}});
  const session=await db.auth.getSession();if(session.error)throw session.error;
  if(!session.data?.session?.access_token){status('Войди на главной Academy под своим аккаунтом, затем вернись.','bad');return;}
  const verified=await db.auth.getUser();if(verified.error||!verified.data?.user){status('Сессия истекла. Войди повторно.','bad');return;}
  const response=await fetch(`${API}/functions/v1/academy-tutor`,{method:'GET',headers:{Authorization:`Bearer ${session.data.session.access_token}`,apikey:KEY}});
  let info;try{info=await response.json();}catch{throw Error('INVALID_RESPONSE');}
  if(!response.ok){status(info.message||'Не получилось проверить доступ.','bad');return;}
  if(!info.configured){status('Сервер готов, но ключ OpenAI ещё не обнаружен. Добавь ACADEMY_OPENAI_API_KEY в секреты Supabase.','bad');return;}
  setReady(true);status(`Наставник подключён к серверу. Ключ обнаружен${info.model?' · '+info.model:''}; его работу подтвердит первый ответ.`,'good');
 }catch(error){console.error('Academy tutor connection unavailable',error);status('Не удалось подключиться к серверу наставника. Проверь соединение.','bad');}
}
async function send(event){event.preventDefault();if(!ready||busy)return;
 const message=$('question').value.trim();if(!message)return;
 const context=current();if(mode==='review'&&message.length<(context.subject==='english'?8:25)){
  status('Для содержательного разбора вставь свою работу, а не только название темы.','bad');$('question').focus();return;}
 busy=true;const generation=conversation;
 for(const node of [$('subject'),$('lesson'),$('clearChat'),...document.querySelectorAll('.mode')])node.disabled=true;
 $('send').disabled=true;$('send').textContent='Проверяем…';$('chatHint').textContent='Отправлен запрос. Не закрывай страницу до ответа.';
 add('user',message);$('question').value='';
 try{const session=await db.auth.getSession();if(session.error||!session.data?.session?.access_token)throw Error('AUTH');
  const response=await fetch(`${API}/functions/v1/academy-tutor`,{method:'POST',headers:{Authorization:`Bearer ${session.data.session.access_token}`,apikey:KEY,'Content-Type':'application/json'},
   body:JSON.stringify({subject:context.subject,lesson:context.lesson,mode,message,history:history.slice(-6)})});
  let data;try{data=await response.json();}catch{throw Error('Сервер вернул нечитаемый ответ.');}
  if(!response.ok)throw Error(data.message||'Наставник сейчас недоступен.');
  if(typeof data.reply!=='string'||!data.reply.trim())throw Error('Получен пустой ответ.');
  if(conversation!==generation)return;
  add('assistant',data.reply);history.push({role:'user',content:message.slice(0,900)},{role:'assistant',content:data.reply.slice(0,900)});history=history.slice(-6);
  status('✓ Ответ получен. Теперь исправь работу или ответь на следующий вопрос.','good');
 }catch(error){if(conversation!==generation)return;
  const info=error instanceof Error&&error.message==='AUTH'?'Сессия истекла. Войди снова.':error instanceof Error?error.message:'Попробуй позже.';
  add('assistant',`Ответ не получен: ${info}`);status(info,'bad');$('question').value=message;
 }finally{busy=false;for(const node of [$('subject'),$('lesson'),$('clearChat'),...document.querySelectorAll('.mode')])node.disabled=false;
  $('send').disabled=!ready;$('send').textContent='Отправить ↗';$('chatHint').textContent=ready?'Отправляется только после нажатия. Не вводи пароли и API-ключи.':'Сначала войди в Academy и подключи API.';
 }
}
function init(){
 const subject=params.get('subject');if(['qa','english','python'].includes(subject))$('subject').value=subject;
 fillLessons();
 $('subject').addEventListener('change',()=>{fillLessons();resetConversation('Предмет изменён. Разберём новую тему отдельно.');});
 $('lesson').addEventListener('change',()=>{renderLesson();resetConversation('Урок изменён. Начнём с его требований и задания.');});
 for(const button of document.querySelectorAll('.mode'))button.addEventListener('click',()=>switchMode(button.dataset.mode));
 $('clearChat').addEventListener('click',()=>{resetConversation('Новый разговор. Какой момент нужно понять?');$('question').focus();});
 $('chatForm').addEventListener('submit',send);
 $('question').addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter')$('chatForm').requestSubmit();});
 switchMode(['explain','hint','practice','review'].includes(params.get('mode'))?params.get('mode'):'explain');
 importDraft();setReady(false);void prepare();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
