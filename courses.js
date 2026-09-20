/* Subject-first catalogue. Reading these lists never creates progress or requests the API. */
(()=>{'use strict';
const lessons=window.AcademyPathLessons;
function render(subject){
 const root=document.getElementById(subject+'List');
 const items=lessons?.[subject];
 if(!root||!Array.isArray(items)||items.length!==14){if(root)root.textContent='Не удалось загрузить уроки. Обнови страницу.';return;}
 for(const [index,item] of items.entries()){
  const anchor=document.createElement('a');anchor.href=`path.html?subject=${subject}&lesson=${index+1}&flow=1`;
  const number=document.createElement('span');number.className='course-lesson-num';number.textContent=String(index+1).padStart(2,'0');
  const heading=document.createElement('span');heading.className='course-lesson-title';heading.textContent=item.title;
  const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';
  anchor.append(number,heading,arrow);root.append(anchor);
 }
}
function init(){render('qa');render('english');
 const selected=new URLSearchParams(location.search).get('subject');
 if(['qa','english'].includes(selected)){const box=document.getElementById(selected+'Lessons');box.open=true;box.scrollIntoView({block:'start'});}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
