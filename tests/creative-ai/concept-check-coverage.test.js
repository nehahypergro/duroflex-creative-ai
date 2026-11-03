'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('../../lib/creative-ai/creative-director/examples/synthetic'),cd=require('../../lib/creative-ai/creative-director'),wire=require('../../lib/creative-ai/runtime/decision-wire');
test('all mandatory concept check IDs and exact count are explicit in wire schema, including clarification',()=>{
 const input=fixture.inputExample();input.strategyInput.guardian.requirements.push({id:'campaign-clarification',text:'Use current approved identity',sourceIds:[]});
 const w=wire.concepts({schema:cd.coreOutputSchema,instructions:'fixture',input:{context:input}},input),s=w.schema.properties.concepts.properties.continuity.properties.qualityReview.properties.mandatoryChecks,ids=input.strategyInput.guardian.requirements.map(r=>r.id);
 assert.equal(s.minItems,ids.length);assert.equal(s.maxItems,ids.length);assert.deepEqual(s.items.properties.requirementId.enum,ids);assert.match(w.instructions,/campaign-clarification/);
});
test('missing check diagnostic names omitted IDs instead of generic coverage mismatch',()=>{
 const input=fixture.inputExample(),core=fixture.coreExample(input),id=core.concepts[0].qualityReview.mandatoryChecks.pop().requirementId;
 assert.throws(()=>cd.finalizeOutput(core,input),e=>e.message.includes('missing: '+id));
});
