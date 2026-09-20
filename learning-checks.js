/* Original, deterministic learning checks. They are feedback, NOT AI or proof of semantic correctness. */
(()=>{'use strict';
const normalize=value=>String(value??'').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/[.!?\s]+$/g,'').trim();
function qaIssues(value){
  const text=normalize(value),issues=[];
  if(text.length<65)issues.push('Ответ слишком короткий. Опиши конкретную проверку своими словами.');
  if(!/(шаг|наж|откр|введ|ввод|выбр|действ|прове|перей|сохран|удал|отправ)/i.test(text))issues.push('Не вижу действий. Опиши шаги, которые другой тестировщик сможет повторить.');
  if(!/(ожида|долж|результат|предполаг|после.*(появ|сохран|исчез|откры|отобраз))/i.test(text))issues.push('Укажи ожидаемый результат: что должно произойти согласно требованию?');
  return issues;
}
function pythonIssues(notes,code){
  const issues=[];
  if(!String(code||'').trim())issues.push('Напиши программу в редакторе.');
  if(String(notes||'').trim().length<20)issues.push('В поле ответа объясни своими словами, что показала программа и почему. Не ограничивайся запуском кода.');
  return issues;
}
function englishMatches(value,translation){
  const answer=normalize(value);
  return String(translation||'').split(/\s*\/\s*|\s*;\s*/).some(part=>normalize(part)===answer);
}
function reviewChoices(item,all,seed){
  const correct=String(item.translation||'');
  const alternatives=[...new Set(all.map(entry=>String(entry.translation||'')).filter(entry=>entry&&entry!==correct))];
  if(alternatives.length<2)throw Error('Not enough distinct vocabulary choices');
  const first=alternatives[seed%alternatives.length];
  const second=alternatives[(seed+1)%alternatives.length];
  const choices=[correct,first,second];
  const shift=seed%3;
  return choices.slice(shift).concat(choices.slice(0,shift));
}
window.AcademyChecks=Object.freeze({normalize,qaIssues,pythonIssues,englishMatches,reviewChoices});
})();
