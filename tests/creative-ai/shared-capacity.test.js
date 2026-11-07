'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
test('ten separate stores share provider capacity across brand jobs, not one gate per project',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'provider-capacity-'));let active=0,peak=0,finished=0;
 try{await Promise.all(Array.from({length:10},(_,i)=>new JobStore(root).budget((i%2?'Sleepyhead':'Duroflex')+'-'+i).withCapacity('image',2,async()=>{peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,10));active--;finished++;},{timeoutMs:3000})));assert.equal(peak,2);assert.equal(finished,10);
 await assert.rejects(()=>new JobStore(root).budget('Duroflex').withCapacity('image',4,()=>assert.fail('must not dispatch')),/differs between workers/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('full queue and cancelled wait never invoke the provider, and released slots remain reusable',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'provider-queue-')),run=require('../../lib/creative-ai/runtime/shared-capacity').run;let release,start;const started=new Promise(r=>start=r),held=new Promise(r=>release=r);
 try{const owner=run(root,'reasoning',1,async()=>{start();await held;},{maxPending:1});await started;const abort=new AbortController();const queued=run(root,'reasoning',1,()=>assert.fail('cancelled request dispatched'),{signal:abort.signal,maxPending:1});
 // Observe the durable waiter rather than relying on a guessed sleep.
 const waitDir=path.join(root,'reasoning/waiting/0');for(let i=0;i<100;i++){try{if((await fs.readdir(waitDir)).length)break;}catch{}await new Promise(r=>setTimeout(r,2));}
 await assert.rejects(()=>run(root,'reasoning',1,()=>assert.fail('full queue dispatched'),{maxPending:1}),{code:'PROVIDER_QUEUE_FULL'});abort.abort();await assert.rejects(()=>queued,/abort/i);release();await owner;assert.equal(await run(root,'reasoning',1,()=>42,{maxPending:1}),42);
 }finally{release();await fs.rm(root,{recursive:true,force:true});}
});
test('an abandoned policy lock cannot block immutable capacity policy checks',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'capacity-policy-')),run=require('../../lib/creative-ai/runtime/shared-capacity').run;
 try{await fs.mkdir(path.join(root,'render','.policy.lock'),{recursive:true});await fs.writeFile(path.join(root,'render','policy.json'),JSON.stringify({limit:2,maxPending:64}));assert.equal(await run(root,'render',2,()=>42,{signal:AbortSignal.timeout(100)}),42);assert.deepEqual(await fs.readdir(path.join(root,'render','.policy.lock')),[]);}finally{await fs.rm(root,{recursive:true,force:true});}
});
