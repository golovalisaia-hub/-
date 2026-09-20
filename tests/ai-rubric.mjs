/* Pure module tests; require Node 22 --experimental-strip-types. No API key or user data. */
import assert from 'node:assert/strict';
import {lessonRubric} from '../supabase/functions/academy-tutor/rubrics.ts';
for(const [subject,count] of [['qa',14],['english',14],['python',4]]){
 for(let n=1;n<=count;n++){
  const item=lessonRubric(subject,n);
  assert.ok(item,`${subject} ${n}: missing rubric`);
  assert.ok(item.goal.length>=15,`${subject} ${n}: weak goal`);
  assert.ok(item.task.length>=20,`${subject} ${n}: missing independent task`);
  assert.ok(item.checks.length>=2,`${subject} ${n}: incomplete criteria`);
  assert.ok(item.checks.every(value=>value.length>=8),`${subject} ${n}: vague criterion`);
  assert.ok(item.pitfall.length>=15,`${subject} ${n}: missing error guidance`);
 }
 assert.equal(lessonRubric(subject,count+1),null,'Cannot advertise unpublished lessons');
 assert.equal(lessonRubric(subject,0),null);
}
for(const [subject,lesson] of [['unpublished',1],['__proto__',1],['qa','1'],['english',1.5],['python',null]])
 assert.equal(lessonRubric(subject,lesson),null,'Reject invalid or untrusted lesson IDs');
console.log('PASS: 32 canonical QA, English and Python rubrics; reject missing and forged lessons.');
