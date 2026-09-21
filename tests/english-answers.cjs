/* Regression: how the зачёт judges written English.
   The normaliser is taken out of the real path.js, so this test cannot drift from shipped code. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync(__dirname+'/../path.js','utf8');
const match=source.match(/const normalise=text=>[\s\S]*?\.trim\(\);/);
assert.ok(match,'path.js must still define the shared answer normaliser');
const normalise=vm.runInNewContext(match[0]+'normalise');

const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(__dirname+'/../path-assessment.js','utf8'),sandbox,{timeout:2000});
const english=sandbox.window.AcademyAssessment.english;

/* 1. Case, padding and punctuation must never decide a writing answer. */
for(const [a,b] of [
  ['English','english'],['ENGLISH','english'],['  english  ','english'],
  ['Hello! My name is Anna.','hello my name is anna'],
  ['I am a student','i am a student'],
]) assert.equal(normalise(a),b,`normalising ${JSON.stringify(a)}`);

/* 2. Phone and macOS keyboards insert typographic apostrophes; the learner must not be
      punished for a correct answer. skills.js already did this, path.js did not. */
for(const [curly,straight] of [
  ['I’m a student',"I'm a student"],
  ['I don’t understand',"I don't understand"],
  ['I can’t save it',"I can't save it"],
  ['“Hello”','"Hello"'],
]) assert.equal(normalise(curly),normalise(straight),`typographic punctuation in ${JSON.stringify(curly)}`);
assert.equal(normalise('I’m a student'),'im a student');

/* 3. Every accepted answer is already normalised, so a correct learner answer always matches. */
english.forEach((item,index)=>{
  const where=`English lesson ${index+1}`;
  assert.ok(item.writing.accept.length>0,`${where}: at least one accepted answer`);
  for(const accepted of item.writing.accept)
    assert.equal(accepted,normalise(accepted),`${where}: accepted answers must be stored normalised`);
});

/* 4. The course must not accept forms it teaches as mistakes. */
const forbidden=[
  ['i am student','after I the article a is taught in lesson 5'],
  ['there is a error in the form','"a error" contradicts the a/an rule of lesson 5'],
  ['i work everyday','"everyday" is an adjective, the adverbial is "every day"'],
];
english.forEach((item,index)=>{
  for(const [wrong,why] of forbidden)
    assert.ok(!item.writing.accept.includes(wrong),
      `English lesson ${index+1} accepts "${wrong}": ${why}`);
});

/* 5. A wrong answer must teach, and must not simply hand over the sentence. */
english.forEach((item,index)=>{
  const where=`English lesson ${index+1}`;
  const hint=item.writing.hint;
  assert.ok(typeof hint==='string'&&hint.length>=20,`${where}: a wrong answer needs a real hint`);
  for(const accepted of item.writing.accept)
    assert.ok(!normalise(hint).includes(accepted),
      `${where}: the hint gives away the accepted answer "${accepted}"`);
});

console.log(`PASS: writing answers ignore case, spacing and typographic punctuation; ${english.length} lessons reject taught mistakes and hint without revealing the answer.`);
