/* QA-first learning path. Progress is independent of the legacy SEVER calendar. */
(()=>{'use strict';
const API='https://vdhazibkfpgclcwyvvbi.supabase.co';
const KEY='sb_publishable_eRp5yJyhKF9EBTDdhi77_Q_iGaZJaUj';
const $=id=>document.getElementById(id);
const program=window.AcademyPathLessons;
const SUBJECTS={qa:'qa_foundation',english:'english_foundation'};
const total=14;
let db=null,user=null,ready=false,lesson=1,subject='qa',saving=false;
const progress=new Map(),passed=new Map();
const key=(n,s)=>`${SUBJECTS[s]}:${n}`;
const localKey=(n,s)=>`academy-path-draft-v1:${user?.id||'preview'}:${key(n,s)}`;
function status(text,type=''){$('cloudStatus').textContent=text;$('cloudStatus').className=`status ${type}`;}
function feedback(text,type=''){$('feedback').textContent=text;$('feedback').className=`feedback ${type}`;}
function localSave(){try{localStorage.setItem(localKey(lesson,subject),$('answer').value);}catch{feedback('Не получилось сохранить резервный черновик в браузере. Скопируй текст вручную.','bad');}}
function localLoad(n,s){try{return localStorage.getItem(localKey(n,s));}catch{return null;}}
function localClear(n,s){try{localStorage.removeItem(localKey(n,s));}catch{}}
const record=(n,s)=>progress.get(key(n,s));
const practiced=(n,s)=>record(n,s)?.status==='practiced';
const pairDone=n=>practiced(n,'qa')&&practiced(n,'english');
function progressUI(){
 const count=Array.from({length:total},(_,i)=>i+1).filter(pairDone).length;
 $('progressNumber').textContent=`${count} / ${total}`;$('heroCount').textContent=`${count} из ${total}`;
 $('progressFill').style.width=`${count/total*100}%`;
 $('progressDetail').textContent=`Практика QA: ${Array.from({length:total},(_,i)=>i+1).filter(n=>practiced(n,'qa')).length}/14 · English: ${Array.from({length:total},(_,i)=>i+1).filter(n=>practiced(n,'english')).length}/14`;
 $('qaMark').textContent=practiced(lesson,'qa')?'✓':'○';$('englishMark').textContent=practiced(lesson,'english')?'✓':'○';
 $('resultTitle').textContent=pairDone(lesson)?'Обе практики зафиксированы':'Два предмета — один понятный шаг';
 $('resultText').textContent=pairDone(lesson)?'QA и английский этого урока пройдены как самостоятельные упражнения. Это не оценка профессиональных навыков и не закрывает старые тройные задачи SEVER.':'Выполни QA и English в удобном порядке. Нажимать «Завершить» ради процента не нужно: важна самостоятельная практика.';
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
 // The server has the final say about completed work. Drafts with two saved quiz answers can resume after reload.
 if(cloud?.quiz_score===2&&!passed.has(key(lesson,subject)))passed.set(key(lesson,subject),new Set([0,1]));
 $('save').disabled=!ready||saving;$('complete').disabled=!ready||saving;
 $('previous').disabled=lesson===1||saving;$('next').disabled=lesson===total||saving;
 showDraftNotice(cloud,draft);
 feedback(cloud?.status==='practiced'?'Практика уже сохранена в облаке. При редактировании и сохранении черновика отметка будет снята.':'');
 renderQuiz();progressUI();
}
function navigate(n,s=subject){if(saving||n<1||n>total||!SUBJECTS[s]){if(!saving)$('lessonSelect').value=String(lesson);return;}lesson=n;subject=s;render();}
function lockSaving(locked){
 $('answer').disabled=locked||!ready;
 for(const id of ['qaTab','englishTab','lessonSelect','continue','useCloud'])$(id).disabled=locked;
 $('previous').disabled=locked||lesson===1;$('next').disabled=locked||lesson===total;
 $('save').disabled=locked||!ready;$('complete').disabled=locked||!ready;
}
async function write(desired){
 if(!db||!user||!ready||saving){feedback('Для облачного сохранения войди в свой аккаунт и проверь подключение.','bad');return;}
 const answer=$('answer').value.trim(),n=lesson,s=subject,quiz=passed.get(key(n,s))?.size||0;
 if(desired==='practiced'){
   if(quiz!==2){feedback('Сначала правильно ответь на оба вопроса.','bad');$('questions').scrollIntoView({block:'center'});return;}
   if(answer.length<(s==='qa'?40:20)){feedback('Напиши самостоятельный ответ подробнее — одной короткой фразы недостаточно.','bad');$('answer').focus();return;}
   if(!$('criteriaBox').open||!$('reviewed').checked){feedback('Раскрой критерии, сравни с ними работу и отметь самопроверку.','bad');return;}
 }
 if(desired==='draft'&&practiced(n,s)&&!window.confirm('Сохранение нового черновика снимет предыдущую отметку о практике. Продолжить?'))return;
 // A local version can differ from a newer answer saved on another device. Never overwrite it silently.
 if(!$('draftNotice').hidden&&record(n,s)&&!window.confirm('На этом устройстве и в облаке разные ответы. Сохранение перезапишет облачную версию. Ты сравнил их и хочешь продолжить?'))return;
 saving=true;lockSaving(true);feedback('Сохраняем в облаке…');
 const payload={user_id:user.id,track:SUBJECTS[s],lesson_number:n,answer,quiz_score:quiz,status:desired,updated_at:new Date().toISOString()};
 try{
   const result=await db.from('academy_path_progress').upsert(payload,{onConflict:'user_id,track,lesson_number'}).select('user_id,track,lesson_number,answer,quiz_score,status,updated_at').single();
   if(result.error||result.data?.user_id!==user.id||result.data?.track!==payload.track||result.data?.lesson_number!==n||result.data?.status!==desired||result.data?.answer!==answer||Number(result.data?.quiz_score)!==quiz)throw result.error||Error('Server did not confirm expected row.');
   progress.set(key(n,s),result.data);localClear(n,s);$('draftNotice').hidden=true;
   feedback(desired==='practiced'?'✓ Практика сохранена в облаке. Это ещё не экзамен.':'✓ Черновик сохранён в облаке.','good');
   progressUI();status('✓ Учебные ответы сохраняются в отдельном защищённом облаке Academy.','good');
 }catch(err){console.error('Academy path save error',err);localSave();feedback('Облако не подтвердило сохранение. Текст оставлен в поле и резервном черновике браузера — проверь интернет и повтори.','bad');}
 finally{saving=false;lockSaving(false);}
}
async function loadCloud(){
 ready=false;lockSaving(true);
 const result=await db.from('academy_path_progress').select('track,lesson_number,answer,quiz_score,status,updated_at').eq('user_id',user.id).limit(750);
 if(result.error)throw result.error;
 progress.clear();passed.clear();for(const row of result.data||[])progress.set(`${row.track}:${row.lesson_number}`,row);
 ready=true;
 const first=Array.from({length:total},(_,i)=>i+1).find(n=>!pairDone(n));lesson=first||total;subject=!practiced(lesson,'qa')?'qa':!practiced(lesson,'english')?'english':'qa';
 status('✓ Вход подтверждён. Отдельный прогресс QA + English загружен из облака.','good');
 $('account').textContent='Аккаунт';$('logout').hidden=false;render();
}
async function authorize(){
 if(!db){status('Не загрузился модуль облака. Уроки можно читать, но сохранение пока недоступно.','bad');return;}
 try{
   const result=await db.auth.getUser();if(result.error)throw result.error;
   if(!result.data.user){user=null;ready=false;status('Гостевой просмотр: для выполнения и сохранения заданий войди в тот же аккаунт, что используешь в SEVER.');render();return;}
   const profile=await db.from('profiles').select('role').eq('id',result.data.user.id).single();
   if(profile.error||profile.data?.role!=='owner'){user=null;ready=false;status('Эта персональная программа открыта только владельцу. Войди в свой аккаунт.','bad');$('logout').hidden=false;render();return;}
   user=result.data.user;await loadCloud();
 }catch(err){console.error('Academy path auth/load error',err);ready=false;status('Облако сейчас не подтвердило вход или загрузку. Не отмечай практику: попробуй обновить страницу.','bad');render();}
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
async function logout(){if(!db)return;try{const result=await db.auth.signOut();if(result.error)throw result.error;user=null;ready=false;progress.clear();passed.clear();$('logout').hidden=true;$('account').textContent='Войти';$('loginDialog').close();lesson=1;subject='qa';status('Ты вышел из Academy. Для сохранения снова войди.');render();}catch(err){console.error('Academy path logout',err);$('loginError').textContent='Не получилось завершить сессию. Попробуй ещё раз.';}}
function init(){
 if(!program||program.qa.length!==total||program.english.length!==total){status('Ошибка загрузки учебной программы. Обнови страницу.','bad');return;}
 const notice=document.createElement('div');notice.id='draftNotice';notice.className='status';notice.hidden=true;
 const noticeText=document.createElement('span');noticeText.id='draftNoticeText';notice.append(noticeText);
 const useCloud=document.createElement('button');useCloud.id='useCloud';useCloud.className='subtle';useCloud.type='button';useCloud.textContent='Вернуться к облачной версии';useCloud.style.margin='9px 0 0';notice.append(document.createElement('br'),useCloud);
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