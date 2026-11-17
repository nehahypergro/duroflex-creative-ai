'use strict';
// Regression from the live Sleepyhead batch (17 Nov 2026): when the hosted Studio restarted, running projects were
// saved as "Planning could not prepare artwork: The operation was aborted" or stayed "running". On a shutdown signal,
// work this process runs is now marked interrupted (continuable, nothing resent). Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),{JobStore}=require('../../lib/creative-ai/runtime/store');
for(const brandId of ['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'])test('shutdown marks running work interrupted and continuable, and starts nothing new: '+brandId,async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'shutdown-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),runtime=Object.create(CreativeRuntime.prototype);Object.assign(runtime,{store,root,config:{maxConcurrentJobs:2,jobTimeoutMs:60000},active:new Set(),pending:[],log:async()=>{}});
 const make=async status=>{const j=await store.create({brandId,conceptRoutes:['continuity']},{jobTimeoutMs:60000,maxReasoningCalls:5,estimatedSpend:{maxUsd:5,reasoningUsd:1,imageUsd:1}},[{id:'a'}]);await store.update(j.id,x=>{x.status=status;x.stage='strategy';x.budget.deadline=Date.now()+30*60e3;return x;});return j.id;};
 const running=await make('running'),queued=await make('queued'),other=await make('running');runtime.active.add(running);runtime.pending.push(queued);
 const before=await store.read(running,{hydrate:false});
 const marked=await runtime.interruptActive();assert.deepEqual(marked.sort(),[running,queued].sort());
 for(const id of [running,queued]){const j=await store.read(id,{hydrate:false});assert.equal(j.status,'failed');assert.equal(j.errorCode,'PROCESSING_INTERRUPTED');assert.match(j.error,/Studio was restarting/);assert.equal(j.startupInterruptions.at(-1).evidence,'graceful-shutdown');}
 assert.deepEqual((await store.read(running,{hydrate:false})).budget,before.budget,'charges stay exactly as recorded');
 assert.equal((await store.read(other,{hydrate:false})).status,'running','work of another process is left to its owner');
 await runtime.recordFailure(running,Object.assign(Error('The operation was aborted'),{name:'AbortError'}));assert.match((await store.read(running,{hydrate:false})).error,/Studio was restarting/,'a cut-off call does not overwrite the interruption');
 let started=0;runtime.execute=async()=>{started++;};runtime.pending.push(other);runtime.pump();await new Promise(r=>setImmediate(r));assert.equal(started,0,'nothing new starts while shutting down');
 const next=Object.assign(Object.create(CreativeRuntime.prototype),{store,root,config:runtime.config,active:new Set(),pending:[]}); // the server that starts after the restart
 const info=await require('../../lib/creative-ai/runtime/resume-work').inspect(next,running,brandId);assert.equal(info.canResume,true,info.reason);
});
test('both Studio start scripts mark work interrupted before closing',async()=>{
 assert.match(await fs.readFile(path.resolve('scripts/admin/local-studio.js'),'utf8'),/runtime\?\.interruptActive\?\.\(\)/);
 assert.match(await fs.readFile(path.resolve('admin-server.js'),'utf8'),/runtime\?\.interruptActive\?\.\(\)/);
});
