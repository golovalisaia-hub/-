/* Additive original lesson companion; no changes to the SEVER planner application. */
(()=>{'use strict';
function init(){
  const guide=window.AcademyGuide,topic=document.getElementById('topic'),select=document.getElementById('lessonSelect');
  if(!guide||!topic||!select)return;
  const $=id=>document.getElementById(id),insertBefore=$('answerLabel');if(!insertBefore)return;
  const nav=document.querySelector('.rail-bottom');
  if(nav&&!nav.querySelector('a[href="library.html"]')){
    const links=nav.querySelectorAll('a');
    if(links[0]){links[0].textContent='◈ Уроки';links[0].setAttribute('aria-current','page');}
    if(links[1])links[1].textContent='↗ Календарь';
    const book=document.createElement('a');book.href='library.html';book.textContent='▤ Книги';
    book.setAttribute('aria-label','Открыть книги и конспекты Academy');
    nav.insertBefore(book,links[1]||null);
  }
  const panel=document.createElement('section');panel.id='academyCompanion';panel.className='companion';panel.setAttribute('aria-label','Дополнительные объяснения и повторение');insertBefore.parentElement.insertBefore(panel,insertBefore);
  const faq=document.createElement('details');faq.className='companion-faq';
  faq.innerHTML='<summary>Не понял задание? Подсказки для самостоятельной работы</summary><div class="faq-content"><p><strong>QA:</strong> выпиши шаги и ожидаемый результат. Если требования неизвестны, сформулируй вопрос, а не придумывай баг.</p><p><strong>Python:</strong> изучи последнюю строку ошибки, проверь отступы, типы и ввод. Меняй одну строку за раз и снова запускай.</p><p><strong>English:</strong> произнеси слово, вспомни перевод, затем раскрой карточку и проверь себя. Возвращайся к старым словам.</p><p>Проверка здесь учебная: Python-консоль подтверждает только запуск без ошибки, а не правильность решения. Это не живой ИИ-чат.</p></div>';
  panel.after(faq);
  const p=(text,className='')=>{const node=document.createElement('p');node.textContent=text;if(className)node.className=className;return node;};
  const title=text=>{const node=document.createElement('h4');node.textContent=text;return node;};
  function render(){
    const n=Number(select.value)||1,day=window.ACADEMY_DAYS?.[n-1];if(!day)return;
    const active=['qa','python','english'].find(b=>$('tab'+(b==='qa'?'Qa':b==='python'?'Python':'English'))?.getAttribute('aria-pressed')==='true')||'qa';
    panel.replaceChildren();
    if(active==='qa'||active==='python'){
      const data=guide.guide(n,active);if(!data)return;
      $('theory').textContent=data.theory;$('how').textContent=data.how;$('example').textContent=data.example;$('question').textContent=data.question;
      panel.append(title('Что нужно уметь после блока'),p(active==='qa'?'Самостоятельно объяснить правило, написать воспроизводимые шаги и указать ожидаемое поведение.':'Объяснить синтаксис своими словами, самостоятельно изменить пример и проверить результат выполнения.'));
      if(active==='python'){
        const help=p('На телефоне код можно вводить прямо здесь. На компьютере полезно повторить упражнение в VS Code. Код с сайта выполняется только в отдельном браузерном окружении.','companion-note');
        const insert=document.createElement('button');insert.type='button';insert.className='quiet example-insert';insert.textContent='Вставить учебный пример в редактор ↓';
        insert.addEventListener('click',()=>{const input=$('code');if(!input||input.disabled)return;if(input.value.trim()&&!confirm('Заменить введённый код учебным примером?'))return;input.value=data.example;input.dispatchEvent(new Event('input',{bubbles:true}));input.scrollIntoView({behavior:'smooth',block:'center'});input.focus();});
        panel.append(help,insert);
      }else panel.append(p('Не выдавай учебный пример ошибки за действительно обнаруженную проблему. Сначала повтори её и запиши фактическое поведение.','companion-note'));
      return;
    }
    const english=guide.english(n);if(!english)return;
    $('theory').textContent=`Новое слово: ${english.main.word}. В этом уроке учим одно новое слово и повторяем четыре знакомых. Вспомни перевод, а затем проверь себя по карточкам ниже.`;
    $('how').textContent='Порядок: произнеси новое слово → вспомни перевод → раскрой карточку → прочитай грамматический пример → напиши перевод в поле ответа. Одного случайного нажатия недостаточно для освоения слова.';
    $('example').textContent=english.grammar.example;
    $('question').textContent=`Переведи «${english.main.word}» на русский. Затем составь короткую фразу по сегодняшнему правилу: ${english.grammar.task}`;
    panel.append(title('Английский: правило дня'),p(english.grammar.title,'companion-grammar'),p(english.grammar.example),p(english.grammar.task,'companion-note'),title('Словарные карточки · 1 новое + 4 повторения'));
    const cards=document.createElement('div');cards.className='vocab-grid';
    [english.main,...english.review].forEach((item,i)=>{
      const details=document.createElement('details');details.className='vocab-card';const summary=document.createElement('summary');summary.textContent=`${i===0?'НОВОЕ':'ПОВТОР'} · ${item.word}`;
      details.append(summary,p(item.translation));cards.append(details);
    });
    panel.append(cards,p('Коснись слова, чтобы открыть перевод. Закрой карточку и попробуй вспомнить его ещё раз. После занятия повтори слова без подсказки.','companion-note'));
  }
  new MutationObserver(render).observe(topic,{childList:true,characterData:true,subtree:true});render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
/* Versioned same-origin enhancements are loaded in order. Brand theme comes last so it wins the cascade. */
const css=document.createElement('link');css.rel='stylesheet';css.href='academy-quality.css?v=1';document.head.append(css);
const design=document.createElement('link');design.rel='stylesheet';design.href='academy-design.css?v=1';document.head.append(design);
for(const name of ['learning-checks.js?v=1','academy-quality.js?v=1']){const script=document.createElement('script');script.src=name;script.async=false;document.head.append(script);}
})();