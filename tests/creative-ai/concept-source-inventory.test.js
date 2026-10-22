'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('../../lib/creative-ai/creative-director/examples/synthetic');
const cd=require('../../lib/creative-ai/creative-director'),wire=require('../../lib/creative-ai/runtime/decision-wire');
const {check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
test('concept source IDs are exact selections from accessible same-assignment sources in both routes',()=>{
 const input=fixture.inputExample();
 const exact='doc-3d51ae63-ac10-47e4-8deb-da27fd857244',typo='doc-3d51ae63-e03e-44e4-8deb-da27fd857244';
 input.strategyInput.additionalSources.push({id:exact,status:'partial'});
 const original=structuredClone(cd.coreOutputSchema);
 const w=wire.concepts({schema:cd.coreOutputSchema,instructions:'fixture',input:{context:input}},input);
 const sources=[...input.strategyInput.research.sources,...input.strategyInput.additionalSources];
 for(const unit of Object.values(w.schema.properties.concepts.properties)){
  const s=unit.properties.evidence.properties.sourceIds;
  assert.deepEqual(check(s,[exact]),[]);
  assert.ok(check(s,[typo]).length,'recorded UUID typo must fail at the wire boundary');
  for(const source of sources)assert.equal(check(s,[source.id]).length===0,source.status!=='unavailable',source.id);
 }
 assert.deepEqual(cd.coreOutputSchema,original,'never mutate the shared base schema');
});
