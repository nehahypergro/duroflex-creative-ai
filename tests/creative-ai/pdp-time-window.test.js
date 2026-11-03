'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),pdp=require('../../lib/creative-ai/runtime/pdp');
test('full pack admission provides bounded processing time without raising the money allowance',()=>{const c={jobTimeoutMs:45*60000,maxReasoningCalls:40,estimatedSpend:{maxUsd:300,imageUsd:3,reasoningUsd:2}};const out=pdp.admission(c);assert.equal(out.jobTimeoutMs,120*60000);assert.deepEqual(out.estimatedSpend,c.estimatedSpend);assert.equal(c.jobTimeoutMs,45*60000);});
test('explicit bounded PDP time continuation preserves original deadline, charges, call limits and children',async()=>{
 const r=Object.create(CreativeRuntime.prototype),job={id:'pdp',createdAt:new Date(Date.now()-50*60000).toISOString(),status:'partial',selection:[{description:{pdp:{}}}],results:[{imageUrl:'saved',ready:false}],budget:{deadline:Date.now()-5*60000,imageCalls:9,maxImageCalls:48,reasoningCalls:33,maxReasoningCalls:160,estimatedSpend:{maxUsd:280,reservedUsd:50},receipts:[{unknown:true}],requestStates:{'image:unknown':{key:'unknown'}}}};
 r.store={read:async()=>job,update:async(id,fn)=>fn(job)};let calls=0;r.schedule=()=>calls++;
 const old=structuredClone(job),options={processingWindow:{durationMs:120*60000,reason:'Explicit continuation of the approved complete PDP run; retain spend ceiling'}};
 await r.resumePdp('pdp',options);assert.equal(calls,1);assert.equal(job.budget.deadline,Date.parse(job.createdAt)+120*60000);assert.equal(job.pdpTimeContinuations[0].previousDeadline,old.budget.deadline);assert.deepEqual({...job.budget,deadline:old.budget.deadline},old.budget);assert.deepEqual(job.results,old.results);
 job.status='partial';await r.resumePdp('pdp',options);assert.equal(job.pdpTimeContinuations.length,1,'repeat cannot extend from now');assert.equal(job.budget.deadline,Date.parse(job.createdAt)+120*60000);
 job.status='partial';await assert.rejects(()=>r.resumePdp('pdp',{processingWindow:{durationMs:121*60000,reason:'Too long'}}),/processing window/);
});
