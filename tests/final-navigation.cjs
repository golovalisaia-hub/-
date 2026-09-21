/* Isolated navigation regression: no account, cloud writes or API billing. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/../lesson-flow.js', 'utf8');

function scenario({subject='qa', lesson=14, certified=true, practiced=true}) {
  const all=[];
  class Element {
    constructor(tag='div',id='') {
      this.tag=tag; this.id=id; this.children=[]; this.listeners={}; this.dataset={};
      this.value=''; this.textContent=''; this.className=''; this.disabled=false; this.hidden=false;
      this._classes=new Set(); this.classList={contains:value=>this._classes.has(value),add:value=>this._classes.add(value)};
      all.push(this);
    }
    append(...nodes){this.children.push(...nodes);}
    prepend(...nodes){this.children.unshift(...nodes);}
    after(){}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
    setAttribute(name,value){this[name]=value;}
    scrollIntoView(){}
    click(){if(this.disabled)return;for(const fn of this.listeners.click||[])fn();}
  }
  const fixedIds=['lessonSelect','stageViewed','stagePractised','stagePassed','questions','lessonTitle','flowCourse','flowBack','flowTitle','flowLead','flowPrev','flowNext','flowInfo','flowSteps','previous','next','topic','quizStatus'];
  const nodes=Object.fromEntries(fixedIds.map(id=>[id,new Element('div',id)]));
  nodes.lessonSelect.value=String(lesson);
  nodes.lessonSelect.options=Array.from({length:14},(_,i)=>({value:String(i+1),textContent:''}));
  nodes.stageViewed.classList.add('done');
  if(practiced)nodes.stagePractised.classList.add('done');
  if(certified)nodes.stagePassed.classList.add('done');
  nodes.questions.querySelectorAll=()=>[];
  nodes.next.addEventListener('click',()=>{nodes.lessonSelect.value=String(Number(nodes.lessonSelect.value)+1)});
  const toolbar=new Element('div'),card=new Element('section'),body=new Element('div');
  const sectionIds=['subjectLabel','topic','theory','example','practice','quiz','aiTutorCallout','sandboxCallout','mentorCallout','response','stageTrack','exam'];
  const sections=Object.fromEntries(sectionIds.map(id=>[id,new Element('div',id)]));
  body.children=Object.values(sections);
  body.querySelector=selector=>({
    ':scope > .step:not(.practice-step)':sections.theory,
    ':scope > .practice-step:not(#aiTutorCallout):not(#mentorCallout):not(#sandboxCallout)':sections.practice,
    ':scope > .example-details':sections.example,
    ':scope > .quiz':sections.quiz,
    ':scope > .response':sections.response,
    ':scope > .exam':sections.exam
  })[selector]||null;
  card.querySelector=selector=>selector==='.lesson-toolbar'?toolbar:null;
  const bodyClasses=new Set();
  const document={readyState:'complete',body:{classList:{add:name=>bodyClasses.add(name)}},head:{append(){}},
    createElement:tag=>new Element(tag), getElementById:id=>all.findLast(element=>element.id===id)||null,
    querySelector:selector=>selector==='.lesson-card'?card:selector==='.lesson-body'?body:null};
  const location={search:`?flow=1&subject=${subject}`,destination:null,assign(url){this.destination=url;}};
  const context={window:{AcademyPathLessons:{qa:Array.from({length:14},(_,i)=>({title:`QA ${i+1}`})),english:Array.from({length:14},(_,i)=>({title:`English ${i+1}`}))}},
    document,location,URLSearchParams,MutationObserver:class{observe(){}},queueMicrotask};
  vm.runInNewContext(source,context,{filename:'lesson-flow.js'});
  for(const id of ['flowNext','flowPrev','flowInfo','flowSteps','flowBack']) nodes[id]=document.getElementById(id);
  return {nodes,location};
}
function toAssessment(nodes){for(let i=0;i<3;i++)nodes.flowNext.click();}
(async()=>{
  for(const subject of ['qa','english']){
    const {nodes,location}=scenario({subject});
    toAssessment(nodes);
    assert.equal(nodes.flowNext.disabled,false,`${subject} final completion button should be enabled`);
    assert.equal(nodes.flowNext.textContent,'К списку уроков →');
    nodes.flowNext.click();
    assert.equal(location.destination,`courses.html?subject=${subject}`);
    console.log(`PASS ${subject}: completed final lesson returns to correct subject course list`);
  }
  {
    const {nodes,location}=scenario({certified:false});
    toAssessment(nodes);
    assert.equal(nodes.flowNext.disabled,true,'No exit labelled as completion without certification');
    nodes.flowNext.click();assert.equal(location.destination,null);
    console.log('PASS unearned certification cannot enable final completion');
  }
  {
    const {nodes,location}=scenario({lesson:13});
    toAssessment(nodes);
    assert.equal(nodes.flowNext.textContent,'Следующий урок →');
    nodes.flowNext.click();
    await new Promise(resolve=>queueMicrotask(resolve));
    assert.equal(nodes.lessonSelect.value,'14');
    assert.equal(location.destination,null);
    console.log('PASS penultimate lesson continues to lesson 14 without redirect');
  }
  {
    const {nodes}=scenario({practiced:false});
    nodes.flowNext.click();nodes.flowNext.click();
    assert.equal(nodes.flowNext.disabled,true,'Assessment must remain locked without practice');
    console.log('PASS assessment remains gated by practice');
  }
})().catch(error=>{console.error(error);process.exitCode=1});
