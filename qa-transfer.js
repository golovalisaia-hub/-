/* Independent exploratory QA exercise. Session-only data; no authentication or cloud writes. */
(()=>{'use strict';
const lab=window.AcademyDeliveryLab;
const $=id=>document.getElementById(id);
const journal=[];
const found=new Set();
let verified=null;
function updateProgress(){
 const covered=lab.covered(journal);
 $('coverage').textContent=`Проверено пограничных ситуаций: ${covered.length} из ${lab.PROBES.length}.`;
 $('progress').textContent=`Подтверждено расхождений: ${found.size} из 2. Охват границ: ${covered.length} из ${lab.PROBES.length}.${found.size===2&&covered.length===lab.PROBES.length?' Все два встроенных расхождения найдены и границы проверены. Шаги отчётов всё ещё требуют человеческой проверки.':''}`;
 const list=$('probeList');list.replaceChildren();
 for(const probe of lab.PROBES){
   const item=document.createElement('li');
   item.textContent=`${covered.includes(probe.id)?'✓':'○'} ${probe.label}`;
   list.append(item);
 }
}
function resetVerification(){
 verified=null;$('copy').disabled=true;
 $('review').hidden=true;$('reviewText').textContent='';
 $('reportFeedback').textContent='Отчёт ещё не проверен. Сверь факты с требованиями.';
}
function selectObservation(id){
 $('evidencePick').value=String(id);
 $('steps').value='';$('expected').value='';$('actual').value='';
 resetVerification();$('steps').focus();
}
function run(event){
 event.preventDefault();
 const raw=$('amount').value.trim();
 if(!raw){$('appResult').textContent='Введи сумму для проверки.';return;}
 const amount=Number(raw),member=$('member').checked;
 const actual=lab.observed(amount,member);
 const row={id:journal.length+1,amount,member,actual};journal.push(row);
 $('appResult').textContent=`Тест №${row.id}: приложение вернуло «${lab.label(actual)}». Зафиксируй наблюдение в отчёте, если видишь расхождение.`;
 const entry=document.createElement('li');
 const text=document.createElement('span');text.textContent=`№${row.id} · ${member?'С подпиской':'Без подписки'} · ${Number.isFinite(amount)?amount:'некорректное значение'} ₽ → ${lab.label(actual)} `;
 const button=document.createElement('button');button.type='button';button.className='secondary mini';button.textContent='В отчёт ↗';
 button.addEventListener('click',()=>selectObservation(row.id));
 entry.append(text,button);
 const list=$('journal');if(journal.length===1)list.replaceChildren();list.append(entry);
 const option=document.createElement('option');option.value=String(row.id);
 option.textContent=`№${row.id} · ${member?'С подпиской':'Без подписки'}, ${amount} ₽ → ${lab.label(actual)}`;
 $('evidencePick').append(option);
 updateProgress();
}
function report(event){
 event.preventDefault();
 const id=$('evidencePick').value,row=journal.find(item=>String(item.id)===id);
 const steps=$('steps').value;
 const result=lab.checkReport(journal,id,$('expected').value,$('actual').value,steps);
 verified=null;$('copy').disabled=true;
 $('reportFeedback').textContent=result.message;
 if(!row)return;
 $('review').hidden=false;
 $('reviewText').textContent=`Для выбранного запуска по требованиям: ${lab.label(lab.expected(row.amount,row.member))}. Симулятор показал: ${lab.label(row.actual)}. Текст шагов сайт автоматически не проверяет.`;
 if(!result.ok)return;
 found.add(row.member?'member':'regular');
 verified={row,steps:steps.trim(),expected:$('expected').value,actual:$('actual').value};
 $('copy').disabled=false;
 updateProgress();
}
async function copy(){
 if(!verified)return;
 const {row,steps,expected,actual}=verified;
 const text=`Academy · учебный баг-репорт\nПредусловие: ${row.member?'подписка активна':'подписки нет'}; сумма ${row.amount} ₽.\nШаги: ${steps}\nОжидается: ${lab.label(expected)}.\nФактически: ${lab.label(actual)}.\nИсточник: запуск №${row.id} в QA-симуляторе.\nПримечание: точные результаты сверены автоматически; качество шагов ещё не проверено наставником.`;
 try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(text);
   $('reportFeedback').textContent='Текст отчёта скопирован. Проверка содержательности шагов остаётся за наставником.';
 }catch{
   let box=$('reportExport');
   if(!box){box=document.createElement('textarea');box.id='reportExport';box.className='export';box.readOnly=true;box.setAttribute('aria-label','Текст отчёта для ручного копирования');$('reportFeedback').after(box);}
   box.value=text;box.focus();box.select();
   $('reportFeedback').textContent='Автоматическое копирование недоступно. Текст отчёта выделен ниже: нажми Ctrl+C (на телефоне — «Копировать»).';
 }
}
function restart(){
 if(journal.length&&!window.confirm('Удалить журнал и отчёты только этой открытой вкладки и начать заново?'))return;
 journal.length=0;found.clear();verified=null;
 $('journal').replaceChildren();const empty=document.createElement('li');empty.textContent='Тестов пока нет.';$('journal').append(empty);
 $('evidencePick').replaceChildren();const option=document.createElement('option');option.value='';option.textContent='Сначала проведи проверку';$('evidencePick').append(option);
 $('reportForm').reset();$('orderForm').reset();$('appResult').textContent='Начни новый эксперимент.';
 const exportBox=$('reportExport');if(exportBox)exportBox.remove();
 resetVerification();updateProgress();
}
function init(){
 if(!lab||!Array.isArray(lab.PROBES)){
   $('appResult').textContent='Не удалось загрузить симулятор. Обнови страницу.';
   for(const id of ['orderForm','reportForm'])$(id).querySelectorAll('button').forEach(button=>button.disabled=true);
   return;
 }
 $('orderForm').addEventListener('submit',run);
 $('reportForm').addEventListener('submit',report);
 $('evidencePick').addEventListener('change',event=>selectObservation(event.target.value));
 for(const id of ['steps','expected','actual'])$(id).addEventListener('input',resetVerification);
 $('copy').addEventListener('click',copy);
 $('restart').addEventListener('click',restart);
 updateProgress();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
