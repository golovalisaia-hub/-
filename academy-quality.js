/* A deterministic tutor layer, not a chatbot or an automated semantic examiner. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
function init(){
  if(!window.AcademyChecks||!window.AcademyGuide||!$('topic')||!$('finishBlock'))return;
  const checks=window.AcademyChecks,guide=window.AcademyGuide;
  const reviewed=new Set();let quizDay=0,quizIndex=0;
  const panel=document.createElement('section');panel.id='qualityPanel';panel.className='quality-panel';panel.setAttribute('aria-label','Проверка знаний и учебный помощник');
  $('answerLabel').parentElement.insertBefore(panel,$('answerLabel'));
  const msg=(text,good=false)=>{const node=$('feedback');node.textContent=text;node.className=`feedback ${good?'good':'bad'}`;};
  const current=()=>({n:Number($('lessonSelect').value)||1,b:['qa','python','english'].find(x=>$(`tab${x==='qa'?'Qa':x==='python'?'Python':'English'}`).getAttribute('aria-pressed')==='true')||'qa'});
  const line=(tag,text,className='')=>{const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;};
  function showQuiz(n,box){
    const items=guide.english(n);if(!items)return;
    const quiz=document.createElement('div');quiz.className='review-quiz';box.append(quiz);
    const paint=()=>{
      quiz.replaceChildren();
      if(reviewed.has(n)){quiz.append(line('p','✓ Повторение завершено. Теперь переведи новое слово и заверши блок.','quiz-success'));return;}
      const item=items.review[quizIndex];if(!item){reviewed.add(n);paint();return;}
      quiz.append(line('span',`ПОВТОРЕНИЕ ${quizIndex+1} / ${items.review.length}`,'eyebrow'),line('h4',`Как переводится «${item.word}»?`));
      const options=line('div','','quiz-choices');
      for(const choice of checks.reviewChoices(item,[items.main,...items.review],n+quizIndex*3)){
        const button=line('button',choice);button.type='button';button.className='quiet';
        button.addEventListener('click',()=>{
          if(checks.englishMatches(choice,item.translation)){
            quizIndex+=1;
            if(quizIndex===items.review.length){reviewed.add(n);msg('Повторение пройдено. Переведи новое слово в поле ответа.',true);}else msg('Верно! Следующее слово.',true);
            paint();
          }else{msg('Не совпало. Попробуй ещё раз или открой карточку-подсказку выше.');button.classList.add('incorrect');}
        });options.append(button);
      }
      quiz.append(options,line('p','Не торопись: лучше вспомнить смысл, чем угадать.','quality-small'));
    };paint();
  }
  function showMentor(n,b,box){
    const details=document.createElement('details');details.className='mentor-help';
    details.append(line('summary','Нужна помощь? Разбор задания и подсказки'));
    const inside=line('div','','mentor-inner'),message=line('p','Выбери вид подсказки. Это подготовленные объяснения, а не живой ИИ.','mentor-message');
    const actions=line('div','','mentor-actions');
    const buttons=[['Объясни тему',()=>{
      const content=b==='english'?guide.english(n)?.grammar?.example:guide.guide(n,b)?.theory;
      return content||'Прочитай теорию в начале блока и выдели незнакомые слова.';
    }],['С чего начать?',()=>{
      if(b==='qa')return 'Назови функцию и требование. Потом распиши предусловие, три конкретных действия и ожидаемый результат. Проверяй только то, к чему у тебя есть доступ.';
      if(b==='python')return 'Начни с одной команды print(). Затем добавляй по строке и запускай программу. Для input() заполни поле тестового ввода, каждая строка — отдельный ответ.';
      return 'Сначала закрой перевод в карточке и попробуй вспомнить слово. Потом раскрой перевод, пройди четыре вопроса и введи перевод нового слова.';
    }],['Проверь мой ответ',()=>{
      if(b==='qa'){const issues=checks.qaIssues($('answer').value);return issues.length?issues.join(' '):'Структура ответа выглядит пригодной для повторения. Это не проверка фактической правильности: сравни ожидание с требованиями.';}
      if(b==='python'){const issues=checks.pythonIssues($('answer').value,$('code').value);const output=$('output').textContent;return issues.length?issues.join(' '):`Объяснение и код заполнены. ${/Traceback|Error:|ошибка|остановлена/i.test(output)?'В выводе может быть ошибка — исправь её и запусти снова.':'Проверь фактический вывод и сравни его с условием. Запуск не доказывает правильность решения.'}`;}
      return reviewed.has(n)?'Повторение пройдено. Введи перевод нового слова, затем заверши блок.':'Пройди карточки повторения и четыре вопроса. После этого напиши перевод нового слова.';
    }]];
    for(const [label,handler] of buttons){const button=line('button',label);button.type='button';button.className='quiet';button.addEventListener('click',()=>{message.textContent=handler();});actions.append(button);}
    inside.append(actions,message,line('p','Если подсказки недостаточно, можно обсудить ответ со мной в чате ChatGPT; прямого подключения ИИ в Academy пока нет.','quality-small'));
    details.append(inside);box.append(details);
  }
  function render(){
    const {n,b}=current(),day=window.ACADEMY_DAYS?.[n-1];if(!day)return;
    if(quizDay!==n){quizDay=n;quizIndex=0;}
    panel.replaceChildren();panel.append(line('span','ПРОВЕРКА ЗНАНИЙ','eyebrow'));
    if(b==='english'){
      panel.append(line('h4','Повтори четыре слова перед завершением'));
      showQuiz(n,panel);
    }else if(b==='qa'){
      panel.append(line('p','Напиши воспроизводимые шаги и ожидаемый результат. Перед завершением Academy проверит структуру ответа, но не сможет определить, верно ли требование.','quality-small'));
    }else{
      panel.append(line('p','Напиши работающий код, запусти его и объясни результат своими словами. Academy проверяет запуск, но не правильность алгоритма.','quality-small'));
    }
    showMentor(n,b,panel);
  }
  $('topic').addEventListener('not-an-event',()=>{});
  new MutationObserver(render).observe($('topic'),{childList:true,characterData:true,subtree:true});
  $('finishBlock').addEventListener('click',event=>{
    const {n,b}=current();if($('finishBlock').disabled)return;
    let reason='';
    if(b==='qa'){const issues=checks.qaIssues($('answer').value);reason=issues.join(' ');}
    if(b==='python'){const issues=checks.pythonIssues($('answer').value,$('code').value);reason=issues.join(' ');}
    if(b==='english'&&!reviewed.has(n))reason='Сначала пройди четыре вопроса повторения. Если трудно, открой карточки с переводами выше.';
    if(reason){event.preventDefault();event.stopImmediatePropagation();msg(reason);panel.scrollIntoView({behavior:'smooth',block:'center'});}
  },true);
  window.addEventListener('beforeunload',event=>{
    // Warn only about an unfinished study timer; unsaved answers already have local drafts.
    if($('timerSave')&&!$('timerSave').disabled){event.preventDefault();event.returnValue='';}
  });
  render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
