/* Pure functions for a standalone, fictional QA exercise. Never writes user data or SEVER state. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.AcademyDeliveryLab=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const PROBES=[
    {id:'regular-below',member:false,amount:999,label:'Обычный заказ: 999 ₽'},
    {id:'regular-at',member:false,amount:1000,label:'Обычный заказ: 1000 ₽'},
    {id:'regular-above',member:false,amount:1001,label:'Обычный заказ: 1001 ₽'},
    {id:'member-below',member:true,amount:499,label:'Подписка: 499 ₽'},
    {id:'member-at',member:true,amount:500,label:'Подписка: 500 ₽'},
    {id:'member-above',member:true,amount:501,label:'Подписка: 501 ₽'},
    {id:'invalid',member:false,amount:-1,label:'Отрицательная сумма: −1 ₽'}
  ];
  const validNumber=n=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=5000;
  function expected(amount,member){
    if(!validNumber(amount))return 'rejected';
    return amount>=(member?500:1000)?'free':'fee';
  }
  /* Intentional bugs: both inclusive threshold values are rejected by a strict > check. */
  function observed(amount,member){
    if(!validNumber(amount))return 'rejected';
    return amount>(member?500:1000)?'free':'fee';
  }
  function label(outcome){return {free:'Доставка 0 ₽',fee:'Доставка 150 ₽',rejected:'Заказ отклонён'}[outcome]||'Неизвестно';}
  function covered(journal){
    return PROBES.filter(probe=>journal.some(row=>row.amount===probe.amount&&row.member===probe.member)).map(item=>item.id);
  }
  /* Validate only deterministic observations. The free-form reproduction steps need human review. */
  function checkReport(journal,id,claimedExpected,claimedActual,steps){
    const row=journal.find(item=>String(item.id)===String(id));
    if(!row)return {ok:false,code:'no-evidence',message:'Сначала запусти тест в приложении и выбери запись из журнала.'};
    if(!String(steps||'').trim())return {ok:false,code:'missing-steps',message:'Запиши реальные шаги воспроизведения. Сайт проверит только их наличие, не качество.'};
    if(claimedExpected!==expected(row.amount,row.member))return {ok:false,code:'expected',message:'Ожидаемый результат не соответствует требованиям. Проверь порог и знак «включительно».'};
    if(claimedActual!==row.actual)return {ok:false,code:'actual',message:'Фактический результат не совпадает с записью в журнале. Смотри, что показало приложение.'};
    if(claimedExpected===claimedActual)return {ok:false,code:'not-a-bug',message:'Здесь поведение соответствует требованию. Это полезный контрольный тест, но не дефект.'};
    return {ok:true,code:'observed-difference',message:'Расхождение воспроизведено, ожидаемый и фактический результаты указаны верно. Шаги написаны, но их качество сайт не оценивал.'};
  }
  return Object.freeze({PROBES,expected,observed,label,covered,checkReport});
});
