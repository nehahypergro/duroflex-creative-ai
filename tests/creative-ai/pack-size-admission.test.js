'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const formats=require('../../lib/creative-ai/runtime/output-formats'),{resolve}=require('../../lib/creative-ai/runtime/placements'),{JobStore}=require('../../lib/creative-ai/runtime/store');
const config={maxReasoningCalls:40,maxConcurrentJobs:2,maxConcurrentUnits:2,jobTimeoutMs:2700000,estimatedSpend:{maxUsd:500,reasoningUsd:2,imageUsd:3,basis:'Test reservations only'}};
test('ten varied set sizes derive planning capacity from all selected outputs without changing money or concurrency',()=>{
 for(const count of [1,4,6,7,8,10,12,16,21,24]){
  const intake={placementIds:Array.from({length:count},(_,i)=>'custom:item-'+i)},before=structuredClone(config),c=formats.admission(config,intake);
  assert.equal(c.maxReasoningCalls,Math.max(40,16+12*count));assert.deepEqual(c.estimatedSpend,config.estimatedSpend);assert.equal(c.maxConcurrentUnits,2);assert.equal(c.maxConcurrentJobs,2);assert.equal(c.jobTimeoutMs,config.jobTimeoutMs);assert.deepEqual(config,before);
 }
 const pdp=formats.admission(config,{placementIds:['custom:studio-pdp-pack']});assert.equal(pdp.maxReasoningCalls,160);assert.equal(resolve({placementIds:['custom:studio-pdp-pack']}).selections.length,12);
});
test('large sets retain every image reservation, duplicate protection and approved spend boundaries',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pack-size-'));try{
 const store=new JobStore(root),selection=Array.from({length:21},(_,i)=>({id:'module-'+i})),job=await store.create({placementIds:selection.map(x=>x.id)},formats.admission(config,{placementIds:selection.map(x=>x.id)}),selection),budget=store.budget(job.id);
 assert.equal(job.budget.maxImageCalls,84);for(let i=0;i<42;i++)await budget.reserve('image','initial-'+i);
 assert.equal((await store.read(job.id)).budget.imageCalls,42);await assert.rejects(()=>budget.reserve('image','initial-0'),/already reserved/);
 await store.update(job.id,j=>{j.budget.estimatedSpend.maxUsd=j.budget.estimatedSpend.reservedUsd;return j;});await assert.rejects(()=>budget.reserve('image','unapproved-extra'),/spend/);assert.equal((await store.read(job.id)).budget.imageCalls,42);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('runtime creation saves all selected formats and their scaled budget before scheduling',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pack-create-'));try{
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),runtime=new CreativeRuntime({root,provider:{reason(){assert.fail('No paid calls');},generate(){assert.fail('No paid calls');}}});runtime.schedule=()=>{};
 const ids=formats.presets.filter(p=>p.kind==='static').slice(0,12).map(p=>p.id),id=await runtime.create({brandUrl:'https://example.com',brief:'Offline full selection',placementIds:ids,placementPublishing:{'custom:studio-social-story':{publishing:'organic'},'custom:studio-web-hero':{brandedHost:true}}}),job=await runtime.store.read(id);
 assert.equal(job.selection.length,12);assert.equal(job.budget.maxImageCalls,48);assert.equal(job.budget.maxReasoningCalls,160);assert.equal(job.budget.imageCalls,0);assert.equal(job.budget.reasoningCalls,0);assert.equal(job.budget.estimatedSpend.maxUsd,runtime.config.estimatedSpend.maxUsd);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('placement preview includes every selected format above three and still rejects an empty selection',()=>{
 const {preview}=require('../../lib/creative-ai/runtime/placement-preview'),ids=formats.presets.filter(p=>p.kind==='static').slice(0,12).map(p=>p.id),p=preview({placementIds:ids});
 assert.deepEqual(p.placements.map(p=>p.formatId),ids);assert.throws(()=>preview({placementIds:[]}),/at least one/);
});
