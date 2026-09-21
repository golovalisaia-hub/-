/* Beginner scaffolding for guided lessons only. Presentation only: path.js remains
   the sole owner of assessment, cloud progress and SEVER integration. */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('flow')!=='1')return;
const guides={
 'qa:1':{
  goal:'После урока ты сможешь превратить одно требование в проверку и отличить ожидание от наблюдения.',
  terms:[['Требование','Правило, по которому должна работать функция.'],['Проверка','Действие с конкретными данными и сравнением результата с требованием.'],['Дефект','Подтверждённое расхождение между требованием и наблюдаемым поведением.']],
  example:['Учебное требование: после сохранения заметка с введённым названием отображается в списке.','Подготовка: открой учебное приложение заметок, используй только вымышленные данные.','Действие: введи название «Проверка 1», нажми «Сохранить».','Ожидаемый результат: заметка «Проверка 1» появилась в списке.','Фактический результат: запиши только то, что действительно увидел. Мы ещё не запускали приложение, поэтому никакого обнаруженного дефекта пока нет.'],
  task:['Назови требование, которое будешь проверять.','Укажи начальное состояние и конкретное действие.','Напиши ожидаемый результат отдельно.','Опиши, как зафиксируешь фактический результат. Не выдумывай наблюдение.'],
  reminder:'Если ничего не запускал, напиши: «Фактический результат не проверен». Это честный ответ, а не ошибка.'
 },
 'qa:2':{
  goal:'Научишься формулировать проверяемые требования и задавать вопросы вместо догадок.',
  terms:[['Непроверяемое требование','«Сайт должен работать быстро» — не указано, что измерить.'],['Проверяемое требование','«Ответ появляется не позднее двух секунд после нажатия при заданных условиях» — есть наблюдаемый критерий.'],['Неопределённость','Условие, которого пока нет в описании и которое необходимо уточнить.']],
  example:['Задача: сформулировать требования к таймеру.','Неудачный вариант: «Таймер удобный и точный». Здесь нельзя однозначно решить, пройдена ли проверка.','Уточняющий вопрос: с какого значения начинается отсчёт и что означает «Остановить» — паузу или сброс?','Проверяемый вариант после согласования: «После нажатия Старт оставшееся время уменьшается раз в секунду с установленного значения».','Другой вариант после согласования: «После нажатия Стоп отсчёт прекращается, а отображаемое время не меняется». Эти правила — примеры, не фактическая спецификация твоего приложения.'],
  task:['Напиши два отдельных требования: для запуска и остановки.','В каждом назови действие и наблюдаемый результат.','Не придумывай неизвестные условия как факты — оформи их в виде вопросов.','Проверь себя: два независимых человека поймут требования одинаково?'],
  reminder:'Не уверен, должен ли «Стоп» сбрасывать время? Это вопрос команде, а не готовый баг.'
 },
 'english:1':{
  goal:'Сможешь поздороваться и представиться двумя короткими предложениями.',
  terms:[['Hello','Привет / здравствуйте.'],['My name is…','Меня зовут…; затем добавь своё имя.'],['I am…','Я…; так можно сказать о себе: I am a student.']],
  example:['Фраза 1: Hello! — Привет!','Фраза 2: My name is Alex. — Меня зовут Алекс.','Разберём вторую фразу: My = моё, name = имя, is = есть. По-русски говорим естественно: «Меня зовут Алекс».','Свяжем: Hello! My name is Alex. Прочитай медленно и вслух, затем замени Alex на своё имя.','Ошибки новичка: «My name Alex» — пропущено is. «I name is Alex» — неверно вместо My.'],
  task:['Напиши «Hello!» в поле ответа.','Во втором предложении используй «My name is» и своё имя. Можно взять вымышленное имя.','Прочитай обе фразы вслух; кнопка озвучки поможет услышать образец, но сама речь автоматически не проверяется.','Сравни написанное с примером только после самостоятельной попытки.'],
  reminder:'Это базовое знакомство. Не нужно знать IT-термины, чтобы выполнить первый урок.'
 }
};
const $=id=>document.getElementById(id);
function line(parent,tag,text,cls){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=text;parent.append(el);return el;}
function section(cls,title){const el=document.createElement('section');el.className='academy-scaffold '+cls;line(el,'h6',title);return el;}
function render(){
 const n=Number($('lessonSelect')?.value);
 const subject=$('englishTab')?.getAttribute('aria-pressed')==='true'?'english':'qa';
 const guide=guides[`${subject}:${n}`];
 const explanation=document.querySelector('.lesson-body > .step:not(.practice-step) > div');
 const example=document.querySelector('.lesson-body > .example-details .example-inside');
 const response=document.querySelector('.lesson-body > .response');
 if(!explanation||!example||!response)return;
 for(const old of document.querySelectorAll('.academy-scaffold'))old.remove();
 if(!guide)return;
 const introduction=section('academy-scaffold-intro','Что ты сможешь сделать');
 line(introduction,'p',guide.goal);
 line(introduction,'h6','Сначала разберём понятия');
 const glossary=document.createElement('dl');
 for(const [term,meaning] of guide.terms){line(glossary,'dt',term);line(glossary,'dd',meaning);}introduction.append(glossary);explanation.append(introduction);
 const worked=section('academy-scaffold-example','Разбираем пример по шагам');
 const steps=document.createElement('ol');guide.example.forEach(text=>line(steps,'li',text));worked.append(steps);example.append(worked);
 const practice=section('academy-scaffold-task','Как выполнить самостоятельную работу');
 const instructions=document.createElement('ol');guide.task.forEach(text=>line(instructions,'li',text));practice.append(instructions);
 line(practice,'p',guide.reminder,'academy-scaffold-note');
 response.insertBefore(practice,response.firstChild);
}
function init(){
 const topic=$('topic');if(!topic)return;
 new MutationObserver(()=>queueMicrotask(render)).observe(topic,{childList:true,characterData:true,subtree:true});
 for(const id of ['lessonSelect','qaTab','englishTab'])$(id)?.addEventListener(id==='lessonSelect'?'change':'click',()=>queueMicrotask(render));
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
