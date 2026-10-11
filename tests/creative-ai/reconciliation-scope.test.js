'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const art=require('../../lib/creative-ai/art-director'),agents=require('../../lib/creative-ai/runtime/agents');
const {check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
test('reconciliation rejects appended replacement layouts and foreign IDs without restricting narrative strings',async()=>{
 const before=JSON.stringify(art.coreOutputSchema),input=await require('../../lib/creative-ai/art-director/examples/synthetic').inputExample(),ctx=await art.assembleContext(input),core=require('../../lib/creative-ai/art-director/examples/synthetic').coreExample(ctx),schema=agents.reconciliationSchemaFor(core.specifications,ctx.knowledge.principles);
 assert.deepEqual(check(schema,core),[]);
 const appended=structuredClone(core);appended.specifications.push(structuredClone(appended.specifications[0]));assert.ok(check(schema,appended).length);
 const missing=structuredClone(core);missing.specifications.pop();assert.ok(check(schema,missing).length);
 for(const field of ['conceptId','placementId']){const foreign=structuredClone(core);foreign.specifications[0][field]='foreign-assignment';assert.ok(check(schema,foreign).length);}
 assert.equal(JSON.stringify(art.coreOutputSchema),before);
});
