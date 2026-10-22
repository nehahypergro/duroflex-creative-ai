'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const cd=require('../../lib/creative-ai/creative-director'),fixture=require('../../lib/creative-ai/creative-director/examples/synthetic'),authority=require('../../lib/creative-ai/runtime/handoff-authority');
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': reference style cannot turn people, light or interiors into requirements',()=>{
  const input={assignment:{goal:'Introduce '+brand},guardian:{requirements:[],preferences:[{id:'no-people',text:'Empty-room references'},{id:'warm-daylight',text:'Observed warm daylight'},{id:'fixed-interior',text:'Observed neutral bedroom'}]},assumptions:[{id:'photographic',text:'Photography might work'}]};
  const before=JSON.stringify(input),labels=authority.compile(input).records;assert.ok(labels.filter(x=>x.owner!=='brief').every(x=>x.authority==='proposed'));assert.equal(JSON.stringify(input),before);
  const prompt=cd.assembleContext(fixture.inputExample()).messages[0].content;
  assert.match(prompt,/People are neither required nor prohibited by default/);assert.match(prompt,/lighting/);assert.match(prompt,/at least two meaningful visual dimensions/);assert.match(prompt,/explicit requirements constrain an axis/);
 });
 test(brand+': explicit people and night-scene briefs reach both specialist handoffs unchanged',()=>{
  for(const brief of ['Show friends using the sofa outdoors at night.','No people. Use a cool-lit graphic studio setting.','Use warm daylight in this specific bedroom.']){
   const input=fixture.inputExample();input.strategyInput.assignment.brief=brand+': '+brief;const result=fixture.outputExample(input);
   assert.equal(result.handoff.context.strategyInput.assignment.brief,brand+': '+brief);assert.deepEqual(result.handoff.context.strategyInput.guardian.requirements,input.strategyInput.guardian.requirements);
  }
 });
 test(brand+': a different title or premise cannot disguise identical visual direction',()=>{
  const input=fixture.inputExample(),core=fixture.coreExample(input);core.concepts[1].workingTitle='A new route title';core.concepts[1].visualDirection='  '+core.concepts[0].visualDirection.toUpperCase()+'  ';
  assert.throws(()=>cd.finalizeOutput(core,input),/duplicate visual direction/i);
 });
 test(brand+': people and alternative lighting/treatment remain valid creative choices',()=>{
  const input=fixture.inputExample(),core=fixture.coreExample(input);core.concepts[0].visualDirection='Friends preparing for a night outing under cool street lighting.';core.concepts[1].visualDirection='A graphic symbolic sequence on a theatrical studio set, with a bold overhead composition.';
  assert.equal(cd.validateOutput(cd.finalizeOutput(core,input),input).ok,true);
 });
}
test('art execution retains director contrast instead of imposing a default room or excluding people',()=>{
 const prompt=fs.readFileSync(require.resolve('../../lib/creative-ai/art-director/instructions.md'),'utf8');
 for(const phrase of ['People are allowed when the concept calls for them','Do not replace people with empty-room styling','Neither photographic treatment nor a particular room palette or time of day is a universal default','Reconciliation must preserve these differences'])assert.ok(prompt.includes(phrase));
});
test('a changed colour or title alone cannot rescue a duplicated storytelling premise',()=>{
 const input=fixture.inputExample(),core=fixture.coreExample(input);core.concepts[1].workingTitle='A colourful variation';core.concepts[1].visualDirection+=' Use a different background colour.';core.concepts[1].creativePremise=structuredClone(core.concepts[0].creativePremise);assert.throws(()=>cd.finalizeOutput(core,input),/duplicate premises/);
});
