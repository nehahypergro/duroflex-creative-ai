'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
const {ActivityLedger}=require('../../lib/creative-ai/workflow-producer');
const fixture=require('../../lib/creative-ai/workflow-producer/examples/synthetic');
const config={maxReasoningCalls:100,jobTimeoutMs:60000};
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': ten independent writers preserve every reservation and reject duplicate dispatch',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'shared-budget-'));
 try{const stores=Array.from({length:10},()=>new JobStore(root)),job=await stores[0].create({brief:'Synthetic '+brand},config,Array(10).fill({}));
 const writes=await Promise.allSettled(stores.map((s,i)=>s.budget(job.id).reserve('reasoning','unique-'+i)));
 assert.equal(writes.filter(x=>x.status==='fulfilled').length,10);
 let saved=await stores[0].read(job.id);assert.equal(saved.budget.reasoningCalls,10);assert.equal(saved.budget.estimatedSpend.reservedUsd,20);
 const duplicates=await Promise.allSettled(stores.map(s=>s.budget(job.id).reserve('image','same-image')));
 assert.equal(duplicates.filter(x=>x.status==='fulfilled').length,1);saved=await stores[0].read(job.id);assert.equal(saved.budget.imageCalls,1);assert.equal(saved.budget.estimatedSpend.reservedUsd,23);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('simultaneous creation with one request key creates only one durable job',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'shared-create-'));
 try{const intake={brief:'Synthetic brief',requestKey:'same-request-key'},jobs=await Promise.all(Array.from({length:10},()=>new JobStore(root).create(intake,config,[{}])));assert.equal(new Set(jobs.map(j=>j.id)).size,1);assert.equal((await new JobStore(root).list()).length,1);
 await assert.rejects(()=>new JobStore(root).create({...intake,brief:'Changed'},config,[{}]),/different brief/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('ten concurrent activity writers wait, preserve order and deduplicate callbacks',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'shared-activity-')),job=fixture.config();
 try{const ledgers=Array.from({length:10},()=>new ActivityLedger(root));await ledgers[0].append(fixture.event(job.jobId,'job.created','created',{details:{config:job}}));
 const results=await Promise.allSettled(ledgers.map((l,i)=>l.append(fixture.event(job.jobId,'callback.rejected','event-'+i))));assert.equal(results.filter(r=>r.status==='fulfilled').length,10);
 await Promise.all(ledgers.map(l=>l.append(fixture.event(job.jobId,'callback.rejected','shared'))));const events=await ledgers[0].read(job.jobId);assert.equal(events.length,12);assert.deepEqual(events.map(e=>e.sequence),Array.from({length:12},(_,i)=>i+1));
 await assert.rejects(()=>ledgers[1].append(fixture.event(job.jobId,'callback.rejected','shared',{outcome:'Different'})),/Idempotency/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('ten actual worker processes cannot lose budget updates or dispatch the same request twice',{timeout:20000},async()=>{
 const {fork}=require('node:child_process'),{once}=require('node:events'),root=await fs.mkdtemp(path.join(os.tmpdir(),'process-budget-')),children=[];
 try{const store=new JobStore(root),job=await store.create({brief:'Synthetic cross-process run'},config,Array(10).fill({})),worker=path.join(root,'worker.cjs');
 await fs.writeFile(worker,`const {JobStore}=require(${JSON.stringify(require.resolve('../../lib/creative-ai/runtime/store'))});process.once('message',async()=>{try{const b=new JobStore(process.argv[2]).budget(process.argv[3]);await b.reserve('reasoning','worker-'+process.argv[4]);let winner=false;try{await b.reserve('image','same-image');winner=true;}catch(e){if(e.code!=='AMBIGUOUS_PROVIDER_REQUEST'&&!/already reserved/.test(e.message))throw e;}process.send({winner},()=>process.disconnect());}catch(e){process.send({error:e.message},()=>process.disconnect());}});process.send('ready');`);
 const tasks=Array.from({length:10},async(_,i)=>{const child=fork(worker,[root,job.id,String(i)],{stdio:['ignore','ignore','inherit','ipc']});children.push(child);await once(child,'message');return child;});
 const ready=await Promise.all(tasks),results=ready.map(child=>{const result=once(child,'message');child.send('go');return result;});const messages=(await Promise.all(results)).map(x=>x[0]);assert.ok(messages.every(m=>!m.error),JSON.stringify(messages));assert.equal(messages.filter(m=>m.winner).length,1);const saved=await store.read(job.id);assert.equal(saved.budget.reasoningCalls,10);assert.equal(saved.budget.imageCalls,1);assert.equal(saved.budget.estimatedSpend.reservedUsd,23);
 }finally{for(const child of children)if(child.exitCode===null)child.kill();await fs.rm(root,{recursive:true,force:true});}
});
