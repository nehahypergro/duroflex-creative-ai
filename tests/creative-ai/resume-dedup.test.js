'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),recovery=require('../../lib/creative-ai/runtime/resume-work');
async function fixture(brand,fn){const root=await fs.mkdtemp(path.join(os.tmpdir(),'resume-dedup-')),store=new JobStore(path.join(root,'jobs')),scheduled=[];try{const job=await store.create({brandId:brand,conceptRoutes:['continuity']},{jobTimeoutMs:60000,maxReasoningCalls:10},[{id:'a'},{id:'b'}]);await store.update(job.id,j=>{j.status='failed';j.error='Interrupted at unit b';j.results=[{placementId:'a',conceptId:'c',ready:true}];return j;});await fn({store,schedule:id=>scheduled.push(id)},job.id,scheduled);}finally{await fs.rm(root,{recursive:true,force:true});}}
for(const brand of ['brand-duroflex','brand-sleepyhead'])test('concurrent resume keeps job, checkpoints, results and budgets: '+brand,async()=>fixture(brand,async(runtime,id,scheduled)=>{
 await runtime.store.save(id,'copy.json',{exact:'Approved wording'});const before=await runtime.store.read(id),info=await recovery.inspect(runtime,id,brand);assert(info.canResume);
 const requests=await Promise.all(Array.from({length:5},()=>recovery.resume(runtime,id,{brandId:brand,token:info.token})));
 assert(requests.every(r=>r.id===id));assert.equal(scheduled.length,1);const after=await runtime.store.read(id);assert.deepEqual(after.budget,before.budget);assert.deepEqual(after.results,before.results);assert.equal(after.continuations.length,1);assert.equal(after.continuations[0].previousError,before.error);assert.equal(JSON.parse(await fs.readFile(path.join(runtime.store.dir(id),'copy.json'))).exact,'Approved wording');
}));
test('ambiguous paid requests block resume until a response exists',async()=>fixture('brand-duroflex',async(runtime,id,scheduled)=>{
 const key='a'.repeat(64);await runtime.store.update(id,j=>{j.budget.requestStates={['image:'+key]:{kind:'image',key}};return j;});const info=await recovery.inspect(runtime,id);assert(!info.canResume);assert.match(info.reason,/no saved response/);await assert.rejects(()=>recovery.resume(runtime,id,{brandId:'brand-duroflex',token:'x'}),/no saved response/);assert.equal(scheduled.length,0);
 await runtime.store.save(id,'request-image-'+key+'.json',{version:1,json:{data:[]}});assert((await recovery.inspect(runtime,id)).canResume);
}));
test('a live worker lock prevents a competing resume',async()=>fixture('brand-duroflex',async(runtime,id,scheduled)=>{
 const info=await recovery.inspect(runtime,id),release=await require('../../lib/creative-ai/runtime/file-lock').acquire(path.join(runtime.store.dir(id),'.runner.lock'));
 try{await assert.rejects(()=>recovery.resume(runtime,id,{brandId:'brand-duroflex',token:info.token}),e=>e.code==='SHARED_WRITER_BUSY');assert.equal(scheduled.length,0);assert.equal((await runtime.store.read(id)).status,'failed');}finally{await release();}
}));
test('completed failures, expired windows, queue ownership and stale tokens do not restart generation',async()=>fixture('brand-duroflex',async(runtime,id,scheduled)=>{
 await assert.rejects(()=>recovery.resume(runtime,id,{brandId:'brand-sleepyhead'}),/another brand/);
 await assert.rejects(()=>recovery.resume(runtime,id,{brandId:'brand-duroflex',token:'old'}),/state changed/);
 await runtime.store.update(id,j=>{j.results.push({placementId:'b',ready:false});return j;});assert.match((await recovery.inspect(runtime,id)).reason,/recorded outcomes/);
 await runtime.store.update(id,j=>{j.results=[];j.budget.deadline=0;return j;});assert.match((await recovery.inspect(runtime,id)).reason,/window/);
 await runtime.store.update(id,j=>{j.localExecution={owner:'queue'};return j;});assert.match((await recovery.inspect(runtime,id)).reason,/background queue/);assert.equal(scheduled.length,0);
}));
test('submission lock coordinates separate runtime instances and releases after failure',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'submit-lock-')),lock=require('../../lib/creative-ai/runtime/submission-lock');let active=0,peak=0,calls=0,created;
 try{const a={store:{root}},b={store:{root}};const submit=runtime=>lock(runtime,'same-confirmed-request',async()=>{active++;peak=Math.max(peak,active);try{if(created)return created;await new Promise(r=>setTimeout(r,15));calls++;return created='creative-same';}finally{active--;}});
 assert.deepEqual(await Promise.all([submit(a),submit(b),submit(a)]),['creative-same','creative-same','creative-same']);assert.equal(calls,1);assert.equal(peak,1);
 await assert.rejects(()=>lock(a,'failure',async()=>{throw Error('interrupted');}),/interrupted/);assert.equal(await lock(b,'failure',async()=>true),true);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('Studio duplicate lookup is metadata-only and never prepares or dispatches again',async()=>{
 const generation=require('../../lib/creative-ai/runtime/studio-generation'),draft={id:'draft-one',brandId:'brand-duroflex',brief:'Exact'},token='b'.repeat(64),intake={brandId:draft.brandId,sourceStudioDraftId:draft.id,studioReadinessToken:token,sourceStudioDraftHash:generation.draftHash(draft)};
 const runtime={store:{list:async opts=>{assert.equal(opts.metadataOnly,true);return [{id:'creative-saved',intake}];}},create:async()=>assert.fail('Duplicate dispatch')};
 const out=await generation.submit(runtime,{draft,token});assert.equal(out.id,'creative-saved');assert.equal(out.reused,true);
});
