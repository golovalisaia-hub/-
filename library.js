/* Academy reading journal. Uses the same authenticated Supabase project, never service-role credentials. */
(()=>{'use strict';
const PROJECT_URL='https://vdhazibkfpgclcwyvvbi.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_eRp5yJyhKF9EBTDdhi77_Q_iGaZJaUj';
const $=id=>document.getElementById(id);
let db=null,user=null,entries=[],editing=null,loading=false;
const fields=['book','chapter','notes','qaTask','pythonTask','readingStatus'];
const text=(tag,value,className='')=>{const el=document.createElement(tag);el.textContent=String(value||'');if(className)el.className=className;return el;};
function status(message,kind=''){const el=$('cloudStatus');el.textContent=message;el.className='status'+(kind?' '+kind:'');}
function error(message){$('formError').textContent=message||'';}
function disabled(value){for(const id of fields)$(id).disabled=value;$('save').disabled=value;$('reset').disabled=value;}
function draftKey(){return user?`academy-reading-draft-v1:${user.id}`:null;}
function payload(){return{book_title:$('book').value.trim(),chapter:$('chapter').value.trim(),notes:$('notes').value,qa_task:$('qaTask').value,python_task:$('pythonTask').value,status:$('readingStatus').value};}
function backup(){const key=draftKey();if(!key)return;try{localStorage.setItem(key,JSON.stringify({editing,payload:payload()}));}catch{status('Не удалось сделать локальную копию записи. Сохрани её в облако вручную.','bad');}}
function restore(){const key=draftKey();if(!key)return;try{const data=JSON.parse(localStorage.getItem(key)||'null');if(!data?.payload)return;editing=data.editing||null;fill(data.payload);$('formTitle').textContent=editing?'Редактирование записи':'Восстановленный черновик';}catch{}}
function clearBackup(){const key=draftKey();if(key)try{localStorage.removeItem(key);}catch{}}
function fill(data){$('book').value=data.book_title||'';$('chapter').value=data.chapter||'';$('notes').value=data.notes||'';$('qaTask').value=data.qa_task||'';$('pythonTask').value=data.python_task||'';$('readingStatus').value=data.status==='done'?'done':'reading';}
function fresh(confirmUnsaved=false){if(confirmUnsaved&&$('chapter').value.trim()&&!window.confirm('Создать новую запись? Несохранённые изменения останутся только в черновике до нового сохранения.'))return;editing=null;$('readingForm').reset();$('formTitle').textContent='Новая запись';error('');clearBackup();$('chapter').focus();}
function render(){
  $('entryTotal').textContent=`${entries.length} ${entries.length===1?'глава':entries.length>=2&&entries.length<=4?'главы':'глав'} в дневнике`;
  $('finishedTotal').textContent=`${entries.filter(r=>r.status==='done').length} изучено`;
  const list=$('records');list.replaceChildren();
  if(!entries.length){list.append(text('p','Пока записей нет. Начни с главы, которую изучаешь сегодня.','empty'));return;}
  for(const entry of entries){
    const card=text('article','','record');
    card.append(text('span',entry.status==='done'?'✓ РАЗОБРАНО':'◌ В ПРОЦЕССЕ','tag'),text('h3',entry.chapter),text('small',entry.book_title));
    if(entry.notes.trim())card.append(text('p',entry.notes.length>240?entry.notes.slice(0,240)+'…':entry.notes));
    const actions=text('div','','record-buttons');
    const edit=text('button','Открыть','secondary');edit.type='button';edit.addEventListener('click',()=>{
      editing=entry.id;fill(entry);$('formTitle').textContent='Редактирование записи';error('');backup();document.querySelector('.editor').scrollIntoView({behavior:'smooth',block:'start'});$('chapter').focus();
    });
    const remove=text('button','Удалить','secondary danger');remove.type='button';remove.addEventListener('click',()=>removeEntry(entry));
    actions.append(edit,remove);card.append(actions);list.append(card);
  }
}
async function fetchEntries(){
  if(!user||loading)return;
  loading=true;$('reload').disabled=true;
  try{
    const result=await db.from('academy_reading').select('id,user_id,book_title,chapter,notes,qa_task,python_task,status,updated_at').eq('user_id',user.id).order('updated_at',{ascending:false}).limit(200);
    if(result.error)throw result.error;
    entries=result.data||[];render();status('✓ Твой книжный дневник загружен из облака.','good');
  }catch(err){console.error('Academy reading fetch',err);status('Не получилось загрузить книжный дневник. Проверь соединение и нажми «Обновить облако».','bad');}
  finally{loading=false;$('reload').disabled=false;}
}
async function save(event){
  event.preventDefault();if(!user||!db){error('Сначала войди в Academy со своей учётной записью.');return;}
  const data=payload();
  if(!data.book_title||!data.chapter){error('Укажи название книги и главу.');return;}
  if(data.status==='done'&&!data.notes.trim()){error('Перед отметкой «Разобрал» запиши хотя бы один собственный вывод из главы.');return;}
  $('save').disabled=true;error('');backup();
  try{
    let result;
    if(editing)result=await db.from('academy_reading').update({...data,updated_at:new Date().toISOString()}).eq('id',editing).eq('user_id',user.id).select('id,user_id').single();
    else result=await db.from('academy_reading').insert({...data,user_id:user.id}).select('id,user_id').single();
    if(result.error||result.data?.user_id!==user.id)throw result.error||Error('Сервер не подтвердил запись.');
    fresh();await fetchEntries();status('✓ Запись сохранена в твоём облаке.','good');
  }catch(err){console.error('Academy reading save',err);error('Облако не подтвердило сохранение. Данные остались в форме и локальном черновике. Попробуй ещё раз.');}
  finally{$('save').disabled=false;}
}
async function removeEntry(entry){
  if(!user||!window.confirm(`Удалить запись по теме «${entry.chapter}»? Это действие нельзя отменить.`))return;
  try{
    const result=await db.from('academy_reading').delete().eq('id',entry.id).eq('user_id',user.id).select('id').single();
    if(result.error||result.data?.id!==entry.id)throw result.error||Error('Сервер не подтвердил удаление.');
    if(editing===entry.id)fresh();await fetchEntries();status('Запись удалена из облака.','good');
  }catch(err){console.error('Academy reading delete',err);status('Удаление не подтверждено сервером. Ничего не скрыто; попробуй ещё раз.','bad');}
}
async function init(){
  disabled(true);$('reload').disabled=true;
  $('readingForm').addEventListener('submit',save);
  $('readingForm').addEventListener('input',backup);
  $('reset').addEventListener('click',()=>fresh(true));$('reload').addEventListener('click',fetchEntries);
  if(!window.supabase?.createClient){status('Модуль облака не загрузился. Проверь интернет и обнови страницу.','bad');return;}
  db=window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'sever-academy-auth-v1'}});
  try{
    const result=await db.auth.getUser();if(result.error)throw result.error;
    const current=result.data.user;
    if(!current){status('Войди в Academy на странице уроков, затем вернись сюда — тогда откроется твой книжный дневник.');return;}
    const profile=await db.from('profiles').select('role').eq('id',current.id).single();
    if(profile.error||profile.data?.role!=='owner'){status('Для этой личной библиотеки нужен аккаунт владельца учебной программы.','bad');return;}
    user=current;disabled(false);$('reload').disabled=false;restore();await fetchEntries();
  }catch(err){console.error('Academy library auth',err);status('Не получилось проверить аккаунт. Проверь соединение и войди в Academy.','bad');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
