'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('selected objective takes priority; engagement and education retain distinct wording',()=>{
 const resolve=require('../../lib/creative-ai/runtime/studio-objective');
 assert.equal(resolve({objective:'Awareness',funnelStage:'BOFU'}).objective,'awareness');
 assert.equal(resolve({objective:'Purchase'}).objective,'action');
 for(const objective of ['Engagement','Education']){const out=resolve({objective});assert.equal(out.objective,'other');assert(out.instruction.includes(objective));}
 assert.equal(resolve({funnelStage:'BOFU'}).objective,'action');
});
