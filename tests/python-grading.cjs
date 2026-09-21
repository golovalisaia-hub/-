/* Python practice is graded by expected values on several cases, not by "it ran".
   Uses the real harness() from skills.js and a local python3, so it needs no Pyodide CDN.
   This is a check of the grading logic, NOT a substitute for running Pyodide in the browser. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');

const probe=spawnSync('python3',['-c','print(1)'],{encoding:'utf8'});
if(probe.status!==0){
  console.log('SKIP: python3 is unavailable on this machine; Python grading logic not verified here.');
  process.exit(0);
}

const source=fs.readFileSync(__dirname+'/../skills.js','utf8');
const harnessSource=source.match(/function harness\(item,code\)\{[\s\S]*?\n\}/);
assert.ok(harnessSource,'skills.js must still define the Python test harness');
const harness=vm.runInNewContext(harnessSource[0]+';harness');
const listSource=source.match(/const python=(\[[\s\S]*?\]);\n/);
assert.ok(listSource,'skills.js must still define the Python exercises');
const python=vm.runInNewContext('('+listSource[1]+')');

assert.equal(python.length,4,'four published Python exercises');
for(const [index,item] of python.entries()){
  assert.ok(item.cases.length>=4,`exercise ${index+1}: needs several cases, not one happy path`);
  assert.ok(item.fn&&item.task&&item.hint&&item.starter,`exercise ${index+1}: task, starter and hint`);
}

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'academy-py-'));
const run=(index,code)=>{
  const file=path.join(tmp,`run-${index}-${Math.random().toString(36).slice(2)}.py`);
  fs.writeFileSync(file,harness(python[index],code));
  const result=spawnSync('python3',[file],{encoding:'utf8',timeout:20000});
  const output=`${result.stdout||''}${result.stderr||''}`;
  const at=output.lastIndexOf('__ACADEMY_CHECK__');
  if(at<0)return null;
  return JSON.parse(output.slice(at+'__ACADEMY_CHECK__'.length).trim());
};
const score=report=>report.filter(item=>item.ok).length;

/* 1. A correct solution passes every case. */
let report=run(1,'def valid_title(title):\n    n = len(title.strip())\n    return 1 <= n <= 20\n');
assert.ok(report,'a correct solution must produce a machine-readable report');
assert.equal(score(report),python[1].cases.length,'a correct solution passes all cases');

/* 2. Code that runs without any error but returns wrong values must NOT pass. */
report=run(1,'def valid_title(title):\n    return len(title) < 20\n');
assert.ok(report,'a running solution still produces a report');
assert.ok(score(report)<python[1].cases.length,
  'a program that runs cleanly but is wrong must not be accepted');
const failed=report.filter(item=>!item.ok);
assert.ok(failed.length>=3,'the wrong solution must fail several cases, including boundaries');
for(const item of failed){
  assert.ok(item.expected&&item.actual,'each failure names the expected and the actual value');
}
assert.ok(failed.some(item=>item.input.includes("''")),'the empty-string boundary is exercised');

/* 3. A crash is reported per case with its error, not as a pass. */
report=run(1,'def valid_title(title):\n    return 1 <= lenn(title) <= 20\n');
assert.equal(score(report),0,'a crashing solution passes nothing');
assert.ok(report.every(item=>/NameError/.test(item.actual)),'the learner is shown the real error');

/* 4. Types are compared strictly: 1 is not True. */
report=run(1,'def valid_title(title):\n    n = len(title.strip())\n    return 1 if 1 <= n <= 20 else 0\n');
assert.equal(score(report),0,'an int must not satisfy a boolean expectation');

/* 5. Case sensitivity is really enforced where the task demands it. */
report=run(2,'def test_result(expected, actual):\n    return "PASS" if expected.lower() == actual.lower() else "FAIL"\n');
assert.ok(score(report)<python[2].cases.length,'a case-insensitive comparison must fail the case-sensitivity case');

fs.rmSync(tmp,{recursive:true,force:true});
console.log('PASS: Python work is graded on expected values across cases; running without an error is not accepted as a solution.');
