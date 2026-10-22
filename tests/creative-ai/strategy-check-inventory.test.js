'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fixture=require('../../lib/creative-ai/marketing-strategist/examples/synthetic'),strategy=require('../../lib/creative-ai/marketing-strategist'),wire=require('../../lib/creative-ai/runtime/decision-wire'),{check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
test('strategy wire restricts explicit requirement checks to the supplied IDs and exact count',async()=>{
 const input=await fixture.inputExample(),w=wire.strategy({schema:strategy.outputSchema,input:{assignment:input},instructions:'fixture'},input);for(const branch of w.schema.properties.directionDecision.anyOf){const s=branch.properties.requirementChecks;
 assert.equal(s.minItems,input.guardian.requirements.length);assert.equal(s.maxItems,input.guardian.requirements.length);
 assert.ok(check(s.items,{requirementId:'format-1080x1920',status:'met',summary:'Invented requirement identifier'}).length);
 assert.equal(check(s.items,{requirementId:input.guardian.requirements[0].id,status:'deferred',summary:'Cannot yet verify'}).length===0,branch.properties.status.const==='research_required');}
});
test('empty strategy requirements allow no invented checks',async()=>{
 const input=await fixture.inputExample();input.guardian.requirements=[];const w=wire.strategy({schema:strategy.outputSchema,input:{assignment:input},instructions:'fixture'},input);for(const branch of w.schema.properties.directionDecision.anyOf){const s=branch.properties.requirementChecks;
 assert.equal(check(s,[]).length,0);assert.ok(check(s,[{requirementId:'new-rule',status:'met',summary:'Invented'}]).length);}
});
