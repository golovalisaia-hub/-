/* No outcome promises anywhere in the product texts.
   A learning site may describe a plan; it may not promise a job, a language level or a date. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const files=fs.readdirSync('.').filter(name=>/\.(html|js|md)$/.test(name)&&!name.startsWith('.'));
/* Wording that is only acceptable next to an explicit denial. */
const claims=[
  ['трудоустройств',/трудоустройств/gi],
  ['гарантия результата',/гаранти[а-яё]*\s+(?:трудоустройств|работ|уровн|результат)/gi],
  ['уровень к дате',/уровень\s+[AB][12][^.]{0,40}(?:за|через|к)\s+\d/gi],
  ['обещание работы',/(?:найдёшь|получишь|гарантирован[а-яё]*)\s+работ/gi],
  ['свободный английский',/свободн[а-яё]+\s+(?:английск|владени)/gi]
];
/* A denial shortly before the match turns a claim into an honest limitation.
   JavaScript word boundaries are ASCII-only, so the Cyrillic edges are matched explicitly. */
const denied=(text,index)=>/(^|[^а-яёА-ЯЁ])(не|без|нельзя|никогда|никак|отсутствие|отсутствии|запрещ[а-яё]*)([^а-яёА-ЯЁ]|$)/i.test(text.slice(Math.max(0,index-90),index));
const problems=[];
for(const file of files){
  const text=fs.readFileSync(file,'utf8');
  for(const [label,pattern] of claims){
    for(const match of text.matchAll(pattern)){
      if(!denied(text,match.index))problems.push(`${file}: «${label}» без отрицания рядом — "${text.slice(Math.max(0,match.index-60),match.index+60).replace(/\s+/g,' ')}"`);
    }
  }
}
assert.deepEqual(problems,[],`Найдены обещания результата:\n - ${problems.join('\n - ')}`);
/* The CEFR goals must be presented as learning targets, not as an awarded level. */
const assessment=fs.readFileSync('path-assessment.js','utf8');
assert.ok(/not an accredited exam/i.test(assessment),'assessment content states it is not an accredited exam');
const pathScript=fs.readFileSync('path.js','utf8');
assert.ok(pathScript.includes('не присвоение уровня'),'the English зачёт says it does not award a CEFR level');
console.log(`PASS: ${files.length} файлов проверено, обещаний трудоустройства и уровня к дате нет.`);
