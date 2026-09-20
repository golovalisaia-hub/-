/* Guided self-check: it is not an LLM or a claim of automatic semantic grading. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
function init(){
  if(!window.AcademyChecks||!window.AcademyGuide||!$('topic')||!$('finishBlock'))return;
  const checks=window.AcademyChecks,guide=window.AcademyGuide;
  const completedReview=new Set();let quizLesson=0,question=0;
  const nav=document.querySelector('.rail-bottom');
  if(nav&&!nav.querySelector('a[href="library.html"]')){
    const link=document.createElement('a');link.href='library.html';link.className='library-link';
    const glyph=document.createElement('span');glyph.className='nav-glyph';glyph.setAttribute('aria-hidden','true');glyph.textContent='▧';
    const caption=document.createElement('span');caption.textContent='Конспекты';
    link.append(glyph,caption);nav.prepend(link);
  }
  const panel=document.createElement('section');panel.id='qualityPanel';panel.className='quality-panel';panel.setAttribute('aria-label','Проверка знаний и учебный помощник');
  $('answerLabel').parentElement.insertBefore(panel,$('answerLabel'));
  const message=(value,good=false)=>{const node=$('feedback');node.textContent=value;node.className=`feedback ${good?'good':'bad'}`;};
  const current=()=>({n:Number($('lessonSelect').value)||1,b:['qa','python','english'].find(name=>$(`tab${name==='qa'?'Qa':name==='python'?'Python':'English'}`)?.getAttribute('aria-pressed')==='true')||'qa'});
  const element=(tag,value,cls='')=>{const item=document.createElement(tag);item.textContent=value;if(cls)item.className=cls;return item;};
  function quiz(n){
    const words=guide.english(n);if(!words)return;
    const box=element('div','','review-quiz');panel.append(box);
    const paint=()=>{
      box.replaceChildren();
      if(completedReview.has(n)){box.append(element('p','✓ Повторение завершено. Теперь переведи новое слово и заверши блок.','quiz-success'));return;}
      const word=words.review[question];if(!word){completedReview.add(n);paint();return;}
      box.append(element('span',`ПОВТОРЕНИЕ ${question+1} / ${words.review.length}`,'eyebrow'),element('h4',`Как переводится «${word.word}»?`));
      const buttons=element('div','','quiz-choices');
      for(const choice of checks.reviewChoices(word,[words.main,...words.review],n+question*3)){
        const button=element('button',choice,'quiet');button.type='button';
        button.addEventListener('click',()=>{
          if(checks.englishMatches(choice,word.translation)){
            question++;
            if(question===words.review.length){completedReview.add(n);message('Повторение пройдено. Переведи новое слово в поле ответа.',true);}
            else message('Верно! Следующее слово.',true);
            paint();
          }else{message('Не совпало. Попробуй ещё раз или раскрой карточку с переводом выше.');button.classList.add('incorrect');}
        });buttons.append(button);
      }
      box.append(buttons,element('p','Лучше вспомнить смысл, чем угадать.','quality-small'));
    };paint();
  }
  function help(n,b){
    const details=document.createElement('details');details.className='mentor-help';details.append(element('summary','Нужна помощь? Разбор задания и подсказки'));
    const inside=element('div','','mentor-inner'),reply=element('p','Выбери подсказку. Это подготовленные объяснения, а не живой ИИ.','mentor-message');
    const actions=element('div','','mentor-actions');
    const buttons=[
      ['◍','Объясни тему',()=>b==='english'?guide.english(n)?.grammar?.example||'Прочитай пример и карточки.':guide.guide(n,b)?.theory||'Прочитай теорию в начале блока.'],
      ['⚑','С чего начать?',()=>b==='qa'?'Выбери требование. Запиши предусловие, конкретные шаги, ожидаемый результат, затем проверь фактическое поведение.':b==='python'?'Начни с одной команды print(). Добавляй строки постепенно, запускай код, читай последнюю строку ошибки. Для input() укажи тестовые данные в отдельном поле.':'Закрой переводы карточек, попробуй вспомнить слова и выполни четыре вопроса. Затем переведи новое слово.'],
      ['⚖','Проверь мой ответ',()=>{
        if(b==='qa'){const issues=checks.qaIssues($('answer').value);return issues.length?issues.join(' '):'В ответе есть действия и ожидаемый результат. Сверь его правильность с настоящим требованием: автоматической экспертной оценки нет.';}
        if(b==='python'){const issues=checks.pythonIssues($('answer').value,$('code').value);if(issues.length)return issues.join(' ');return 'Код и объяснение заполнены. Проверь вывод и условие самостоятельно: отсутствие ошибки не доказывает правильность алгоритма.';}
        return completedReview.has(n)?'Повторение завершено. Переведи новое слово, затем заверши блок.':'Сначала пройди четыре вопроса на повторение. Карточки выше помогут вспомнить перевод.';
      }]
    ];
    for(const [glyph,title,answer] of buttons){
      const button=document.createElement('button');button.type='button';button.className='quiet';
      const icon=element('span',glyph,'btn-icon');icon.setAttribute('aria-hidden','true');
      button.append(icon,element('span',title,'btn-label'));
      button.addEventListener('click',()=>{reply.textContent=answer();});actions.append(button);
    }
    inside.append(actions,reply,element('p','Более сложные вопросы можно обсудить со мной в чате ChatGPT; полноценный AI-наставник непосредственно в Academy ещё не подключён.','quality-small'));
    details.append(inside);panel.append(details);
  }
  function render(){
    const {n,b}=current();if(!window.ACADEMY_DAYS?.[n-1])return;
    if(quizLesson!==n){quizLesson=n;question=0;}
    panel.replaceChildren();panel.append(element('span','ПРОВЕРКА ЗНАНИЙ','eyebrow'));
    if(b==='english'){panel.append(element('h4','Повтори четыре слова перед завершением'));quiz(n);}
    else if(b==='qa')panel.append(element('p','Запиши воспроизводимые действия и ожидаемый результат. Academy проверяет структуру ответа, но не фактическую правильность требования.','quality-small'));
    else panel.append(element('p','Напиши код, запусти его и объясни результат своими словами. Успешный запуск не является проверкой правильности алгоритма.','quality-small'));
    help(n,b);
  }
  new MutationObserver(render).observe($('topic'),{childList:true,characterData:true,subtree:true});
  $('finishBlock').addEventListener('click',event=>{
    const {n,b}=current();if($('finishBlock').disabled)return;
    let error='';
    if(b==='qa')error=checks.qaIssues($('answer').value).join(' ');
    if(b==='python')error=checks.pythonIssues($('answer').value,$('code').value).join(' ');
    if(b==='english'&&!completedReview.has(n))error='Сначала пройди четыре вопроса повторения. Если трудно, раскрой карточки выше.';
    if(error){event.preventDefault();event.stopImmediatePropagation();message(error);panel.scrollIntoView({behavior:'smooth',block:'center'});}
  },true);
  window.addEventListener('beforeunload',event=>{
    // Warn about an unfinished timer; text inputs already have per-account local drafts.
    if($('timerSave')&&!$('timerSave').disabled){event.preventDefault();event.returnValue='';}
  });
  render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
