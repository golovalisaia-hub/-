/* Entirely local teaching simulator. Never talks to Academy, Supabase or SEVER. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
/* Подпись кнопки меняется, иконка остаётся на месте. */
const setLabel=(node,text)=>{const span=node.querySelector('.btn-label');(span||node).textContent=text;};
const setIcon=(node,glyph)=>{const span=node.querySelector('.btn-icon');if(span)span.textContent=glyph;};
const iconButton=(glyph,text,className)=>{const b=document.createElement('button');b.type='button';if(className)b.className=className;const i=document.createElement('span');i.className='btn-icon';i.setAttribute('aria-hidden','true');i.textContent=glyph;const l=document.createElement('span');l.className='btn-label';l.textContent=text;b.append(i,l);return b;};
let saved=[],visible=[],nextId=1,events=[],lastDeleted=null;
let evidence={boundary:false,delete:false},checked=false;
const message=(id,value,kind='')=>{const node=$(id);node.textContent=value;node.className=`status${kind?' '+kind:''}`;};
function record(value){events.push(value);const root=$('events');root.replaceChildren();for(const item of events.slice(-35)){const li=document.createElement('li');li.textContent=item;root.append(li);}root.scrollTop=root.scrollHeight;}
function render(){
 const root=$('notes');root.replaceChildren();
 if(!visible.length){const empty=document.createElement('li');empty.className='muted';empty.textContent='Пока заметок нет.';root.append(empty);}
 for(const note of visible){
   const row=document.createElement('li');row.className='note';const name=document.createElement('span');name.textContent=note.title;
   const remove=iconButton('⌫','Удалить','secondary');remove.setAttribute('aria-label',`Удалить заметку ${note.title}`);
   remove.addEventListener('click',()=>{
     visible=visible.filter(item=>item.id!==note.id);
     /* Deliberate simulator defect: saved[] is not updated on delete. */
     lastDeleted=note.id;record(`Удаление: «${note.title}» исчезла с экрана. Проверь, сохранилось ли удаление.`);
     message('appMessage','Заметка удалена с экрана.');render();
   });row.append(name,remove);root.append(row);
 }
 $('evidence').textContent=`Воспроизведено: ${Number(evidence.boundary)+Number(evidence.delete)} из 2 встроенных дефектов.`;
}
function invalidateReport(){checked=false;$('reference').hidden=true;$('reviewed').checked=false;$('copy').disabled=true;}
function reset(){
 saved=[];visible=[];nextId=1;events=[];lastDeleted=null;evidence={boundary:false,delete:false};invalidateReport();$('noteTitle').value='';
 record('Учебный стенд сброшен. Начни проверку с чистого состояния.');render();message('appMessage','Чистый стенд: заметок нет.');message('reportFeedback','Сброс выполнен. Чтобы проверить отчёт, воспроизведи расхождение заново.');
}
function reportText(){const value=id=>$(id).value.trim();return [`Учебный баг-репорт (${value('defect')==='boundary'?'граница заголовка':'удаление'})`,`Предусловие и шаги:\n${value('steps')}`,`Ожидаемый результат:\n${value('expected')}`,`Фактический результат:\n${value('actual')}`,`Риск:\n${value('risk')||'Не указан'}`,'Статус: обнаружено в учебном симуляторе Academy, не в настоящем продукте.'].join('\n\n');}
function check(event){
 event.preventDefault();invalidateReport();const defect=$('defect').value;
 if(!defect){message('reportFeedback','Выбери один дефект после эксперимента.','bad');return;}
 if(!evidence[defect]){
   message('reportFeedback',defect==='boundary'?'Нет воспроизведения: введи заголовок ровно из 21 символа и убедись, что он сохранился, хотя требование запрещает это.':'Нет воспроизведения: создай заметку, удали её и нажми «Перезагрузить симулятор». Проверь, вернулась ли та же заметка.','bad');return;
 }
 for(const [id,min,name] of [['steps',25,'шаги и предусловие'],['expected',15,'ожидаемый результат'],['actual',15,'фактический результат']]){
   if($(id).value.trim().length<min){message('reportFeedback',`Раскрой ${name} подробнее: другой тестировщик должен суметь повторить проверку без догадок. Длина текста не доказывает правильность — сравни смысл сам.`, 'bad');$(id).focus();return;}
 }
 checked=true;$('reference').hidden=false;
 $('referenceText').textContent=defect==='boundary'
   ?'Требование: допустимо 1–20 символов. Для 21 символа ожидается отказ и отсутствие новой заметки. Факт стенда: заметка из 21 символа сохранилась. Проверь, что в твоих шагах названы точная длина ввода и кнопка сохранения.'
   :'Требование: удалённая заметка не должна возвращаться. Предусловие — заметка сохранена. Шаги: удалить её, затем перезагрузить симулятор. Ожидание — её нет. Факт стенда — та же заметка вернулась. Проверь, что это именно та же заметка, а не похожая.';
 message('reportFeedback','✓ Симулятор подтвердил, что выбранная ошибка действительно была воспроизведена. Качество твоего текста автоматически НЕ оценено. Сравни отчёт с разбором ниже и исправь неточности.','ok');
 $('reference').scrollIntoView({block:'nearest',behavior:'smooth'});
}
function init(){
 $('noteForm').addEventListener('submit',event=>{
   event.preventDefault();const title=$('noteTitle').value.trim();
   if(!title||title.length>21){record(`Попытка сохранить заголовок длиной ${title.length}: отказ.`);message('appMessage','Не удалось сохранить: проверь заголовок.','bad');return;}
   const note={id:nextId++,title};saved.push(note);visible=saved.map(item=>({...item}));
   record(`Сохранение: заголовок длиной ${title.length} принят, заметка появилась.`);
   if(title.length===21){evidence.boundary=true;record('Расхождение с требованием: 21 символ принят, хотя максимум — 20.');}
   $('noteTitle').value='';message('appMessage','Сохранено. Попробуй перезагрузить стенд.','ok');render();
 });
 $('reload').addEventListener('click',()=>{
   visible=saved.map(item=>({...item}));record('Перезагрузка: экран восстановлен из имитации хранилища.');
   if(lastDeleted!==null&&visible.some(item=>item.id===lastDeleted)){
     evidence.delete=true;const note=visible.find(item=>item.id===lastDeleted);
     record(`Расхождение с требованием: удалённая заметка «${note.title}» вернулась.`);
   }
   render();message('appMessage','Экран перезагружен. Сравни со списком до перезагрузки.');
 });
 $('reset').addEventListener('click',()=>{
   const hasDraft=['steps','expected','actual','risk'].some(id=>$(id).value.trim());
   if(hasDraft&&!window.confirm('Сбросить только учебный стенд? Текст отчёта останется в форме, но наблюдения потребуется воспроизвести заново.'))return;
   reset();
 });
 $('reportForm').addEventListener('submit',check);
 for(const id of ['defect','steps','expected','actual','risk'])$(id).addEventListener('input',()=>{
   if(checked){invalidateReport();message('reportFeedback','Ты изменил отчёт. Проверь доказательства повторно, чтобы открыть сравнение.');}
 });
 $('reviewed').addEventListener('change',()=>{$('copy').disabled=!(checked&&$('reviewed').checked);$('reviewStatus').textContent=$('reviewed').checked?'Самопроверка отмечена. Скопируй отчёт и при желании попроси наставника проверить содержание.':'После сравнения отметь самопроверку; она не заменяет проверку преподавателя.';});
 $('copy').addEventListener('click',async()=>{
   if(!checked||!$('reviewed').checked)return;
   try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(reportText());message('reportFeedback','✓ Отчёт скопирован. Вставь его в задание Academy, чтобы получить содержательную проверку у наставника.','ok');}
   catch{message('reportFeedback','Не удалось скопировать автоматически. Выдели текст отчёта вручную и перенеси его в Academy; сам текст остался на этой странице.','bad');}
 });
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
