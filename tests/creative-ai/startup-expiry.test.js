'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),resume=require('../../lib/creative-ai/runtime/resume-work');
async function fixture(t,brand='brand-duroflex'){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'startup-expiry-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const store=new JobStore(path.join(root,'jobs')),scheduled=[];
 const job=await store.create({brandId:brand,conceptRoutes:['continuity']},{jobTimeoutMs:60000,maxReasoningCalls:10,estimatedSpend:{maxUsd:20,reasoningUsd:1,imageUsd:2}},[{id:'a'},{id:'b'}]);
 await store.update(job.id,j=>{j.status='running';j.budget.deadline=Date.now()-1000;j.stage='image';j.activeStages=['image'];return j;});
 return {runtime:{store,config:{jobTimeoutMs:60000},active:new Set(),pending:[],schedule:id=>scheduled.push(id)},id:job.id,brand,scheduled};
}
for(const brand of ['brand-duroflex','brand-sleepyhead'])test('expired startup state becomes recoverable without resetting charges: '+brand,async t=>{
 const {runtime:r,id,scheduled}=await fixture(t,brand);await r.store.save(id,'copy.json',{text:'Exact approved copy'});
 await r.store.update(id,j=>{j.results=[{placementId:'a',ready:true,imageUrl:'saved.png'}];return j;});const before=await r.store.read(id);
 await resume.recoverStartup(r);const after=await r.store.read(id);assert.equal(after.status,'partial');assert.deepEqual(after.budget,before.budget);assert.deepEqual(after.results,before.results);assert.deepEqual(after.activeStages,[]);assert.equal(scheduled.length,0);
 const info=await resume.inspect(r,id,brand);assert.equal(info.canResume,true);assert.equal(info.processingWindowRequired,true);
 await Promise.all([resume.resume(r,id,{brandId:brand,token:info.token}),resume.resume(r,id,{brandId:brand,token:info.token})]);
 const continued=await r.store.read(id);assert.equal(continued.status,'queued');assert.deepEqual(continued.budget,before.budget);assert.equal(continued.processingContinuations.length,1);assert(require('../../lib/creative-ai/runtime/processing-deadline')(continued)>Date.now());assert.deepEqual(scheduled,[id]);
 assert.equal(JSON.parse(await fs.readFile(path.join(r.store.dir(id),'copy.json'))).text,'Exact approved copy');
});
test('expired job with unknown provider outcome stops being active but cannot redispatch',async t=>{
 const {runtime:r,id}=await fixture(t),key='a'.repeat(64);await r.store.update(id,j=>{j.budget.requestStates={['image:'+key]:{kind:'image',key}};j.budget.estimatedSpend.reservedUsd=2;return j;});const before=await r.store.read(id);
 await resume.recoverStartup(r);assert.equal((await r.store.read(id)).status,'failed');const info=await resume.inspect(r,id);assert.equal(info.canResume,false);assert.equal(info.blockedRequestKey,key);assert.deepEqual((await r.store.read(id)).budget,before.budget);
});
test('startup respects live runner locks and separately owned queues',async t=>{
 const {runtime:r,id,scheduled}=await fixture(t),release=await require('../../lib/creative-ai/runtime/file-lock').acquire(path.join(r.store.dir(id),'.runner.lock'));
 try{await resume.recoverStartup(r);assert.equal((await r.store.read(id)).status,'running');}finally{await release();}
 await r.store.update(id,j=>{j.localExecution={owner:'queue'};return j;});await resume.recoverStartup(r);assert.equal((await r.store.read(id)).status,'running');assert.equal(scheduled.length,0);
});
test('startup schedules unexpired interrupted work and leaves completed outcomes unchanged',async t=>{
 const {runtime:r,id,scheduled}=await fixture(t);await r.store.update(id,j=>{j.budget.deadline=Date.now()+60000;return j;});await resume.recoverStartup(r);assert.deepEqual(scheduled,[id]);
 await r.store.update(id,j=>{j.status='finished';j.budget.deadline=0;return j;});await resume.recoverStartup(r);assert.equal((await r.store.read(id)).status,'finished');assert.deepEqual(scheduled,[id]);
});
test('login deployment reconciles expired status with automatic generation disabled',async t=>{
 const {runtime:r,id,scheduled}=await fixture(t);const report=await resume.recoverStartup(r,{schedule:false});assert.deepEqual(report.interrupted,[id]);assert.equal((await r.store.read(id)).status,'failed');assert.deepEqual(scheduled,[]);
 await r.store.update(id,j=>{j.status='queued';j.budget.deadline=Date.now()+60000;return j;});await resume.recoverStartup(r,{schedule:false});assert.deepEqual(scheduled,[]);assert.equal((await r.store.read(id)).status,'queued');
});
test('metadata recovery survives unavailable raster blobs without rewriting references',async t=>{
 const {runtime:r,id}=await fixture(t),reference={$studioRaster:{version:1,brandId:'brand-duroflex',sha256:'a'.repeat(64),prefix:'data:image/png;base64,',bytes:12}};
 await r.store.update(id,j=>{j.intake.savedImage=reference;return j;});await assert.rejects(r.store.read(id),/ENOENT/);
 const report=await resume.recoverStartup(r),job=await r.store.read(id,{hydrate:false});assert.deepEqual(report.errors,[]);assert.equal(job.status,'failed');assert.deepEqual(job.intake.savedImage,reference);
});
test('fresh processing window is usable but cannot reset call or spending limits',async t=>{
 const {runtime:r,id}=await fixture(t);await r.store.update(id,j=>{j.status='failed';j.budget.reasoningCalls=j.budget.maxReasoningCalls;return j;});
 const info=await resume.inspect(r,id);await resume.resume(r,id,{brandId:info.brandId,token:info.token});assert(await r.store.budget(id).remainingMs()>0);
 await assert.rejects(r.store.budget(id).reserve('reasoning','b'.repeat(64)),/call limit/);
 await r.store.update(id,j=>{j.budget.reasoningCalls=0;j.budget.estimatedSpend.reservedUsd=j.budget.estimatedSpend.maxUsd;return j;});
 await assert.rejects(r.store.budget(id).reserve('reasoning','c'.repeat(64)),/spend reservation limit/);
});
test('startup isolates a recovery error and continues to the next project',async t=>{
 const {runtime:r,id}=await fixture(t),read=r.store.read.bind(r.store),list=r.store.list.bind(r.store);
 r.store.list=async opts=>[{id:'creative-unavailable',status:'running'},...await list(opts)];r.store.read=async(key,opts)=>{if(key==='creative-unavailable')throw Object.assign(Error('Unavailable record'),{code:'EIO'});return read(key,opts);};
 const report=await resume.recoverStartup(r);assert.equal(report.errors[0].id,'creative-unavailable');assert.deepEqual(report.interrupted,[id]);assert.equal((await read(id)).status,'failed');
});
test('HTTP runtime startup actually reconciles expired jobs before offering recovery',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'http-startup-expiry-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const store=new JobStore(path.join(root,'output/creative-ai/jobs'));
 const config={jobTimeoutMs:60000,maxReasoningCalls:10,estimatedSpend:{maxUsd:20,reasoningUsd:1,imageUsd:2}},expired=await store.create({brandId:'brand-duroflex',conceptRoutes:['continuity']},config,[{id:'a'}]),fresh=await store.create({brandId:'brand-sleepyhead',conceptRoutes:['continuity']},config,[{id:'a'}]);
 await store.update(expired.id,j=>{j.status='running';j.budget.deadline=0;return j;});
 const {runtime}=require('../../lib/creative-ai/runtime/http').createHandler({root,resumeJobs:true,provider:{}}),scheduled=[];runtime.schedule=id=>scheduled.push(id);
 const report=await runtime.startupRecovery;await runtime.publishing.ready;assert.deepEqual(report.errors,[]);assert.deepEqual(report.interrupted,[expired.id]);assert.deepEqual(scheduled,[fresh.id]);assert.equal((await store.read(expired.id)).status,'failed');
});
