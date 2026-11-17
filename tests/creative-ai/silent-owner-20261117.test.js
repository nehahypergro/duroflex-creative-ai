'use strict';
// Regression from the live Sleepyhead test batch (17 Nov 2026): when the hosted Studio's server instance was replaced,
// the projects it was running stayed "running" for over an hour (Continue said "already active"). Their lock owner was
// on another machine ("foreign"), which was never presumed dead, and clean-up ran only at start-up.
// Fix: lock holders refresh a heartbeat; a foreign owner silent for 10 minutes has ended; a periodic pass interrupts
// such jobs by lock evidence only (no provider call, no resubmission). Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const locks=require('../../lib/creative-ai/runtime/file-lock'),{JobStore}=require('../../lib/creative-ai/runtime/store'),maintenance=require('../../lib/creative-ai/runtime/background-maintenance');
const minutesAgo=m=>(Date.now()-m*60000)/1000;
async function temp(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'silent-owner-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
// An owner on another server instance (different host and machine), as written by the new lock code.
async function foreign(dir,{minutes,heartbeat=true}){await fs.mkdir(dir,{recursive:true});const token=crypto.randomUUID(),file=path.join(dir,'owner-'+token+'.json');await fs.writeFile(file,JSON.stringify({pid:1,host:'other-instance',bootId:'11111111-2222-4333-8444-555555555555',processStart:'1',machineId:'a'.repeat(32),token,createdAt:new Date().toISOString(),...(heartbeat?{heartbeatMs:30000}:{})}));await fs.utimes(file,minutesAgo(minutes),minutesAgo(minutes));await fs.utimes(dir,minutesAgo(minutes),minutesAgo(minutes));return file;}

test('a new lock declares a heartbeat and refreshes its owner marker while held',async t=>{
 const root=await temp(t),file=path.join(root,'.runner.lock'),saved=locks.timing.HEARTBEAT_MS;locks.timing.HEARTBEAT_MS=20;t.after(()=>{locks.timing.HEARTBEAT_MS=saved;});
 const release=await locks.acquire(file);try{const [name]=await fs.readdir(file),marker=path.join(file,name);assert.equal(JSON.parse(await fs.readFile(marker,'utf8')).heartbeatMs,20);
  await fs.utimes(marker,minutesAgo(30),minutesAgo(30));await new Promise(r=>setTimeout(r,120));assert.ok(Date.now()-(await fs.stat(marker)).mtimeMs<5000,'heartbeat refreshed the marker');}finally{await release();}
});
test('a silent foreign owner has ended; a recent one, or one without a heartbeat, is kept',async t=>{
 const root=await temp(t);
 const silent=path.join(root,'silent.lock');await foreign(silent,{minutes:11});const c=await locks.classify(silent);assert.equal(c.state,'stale');assert.equal(c.silent,true);
 const recent=path.join(root,'recent.lock');await foreign(recent,{minutes:2});assert.equal((await locks.classify(recent)).state,'foreign');
 const legacy=path.join(root,'legacy.lock');await foreign(legacy,{minutes:120,heartbeat:false});assert.equal((await locks.classify(legacy)).state,'foreign','an owner without a heartbeat is never judged by age');
 const release=await locks.acquire(silent,{timeoutMs:500});await release();
});

for(const brandId of ['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'])test('the periodic pass interrupts work of a vanished server instance only: '+brandId,async t=>{
 const root=await temp(t),store=new JobStore(path.join(root,'output/creative-ai/jobs')),calls=[],scheduled=[];
 const provider=new Proxy({},{get:(_,name)=>name==='then'?undefined:()=>{calls.push(String(name));throw Error('no provider call');}});
 const runtime={root,store,config:{jobTimeoutMs:60000},active:new Set(),pending:[],schedule:id=>scheduled.push(id),provider:{provider}};
 const create=async status=>{const job=await store.create({brandId,conceptRoutes:['continuity']},{jobTimeoutMs:60000,maxReasoningCalls:10,estimatedSpend:{maxUsd:20,reasoningUsd:1,imageUsd:2}},[{id:'a'}]);await store.update(job.id,j=>{j.status=status;j.stage='review';j.budget.deadline=Date.now()+30*60e3;return j;});return job.id;};
 const vanished=await create('running');await foreign(path.join(store.dir(vanished),'.runner.lock'),{minutes:15});
 const key='b'.repeat(64);await foreign(path.join(store.dir(vanished),'.request-reasoning-'+key+'.lock'),{minutes:15});
 const busyElsewhere=await create('running');await foreign(path.join(store.dir(busyElsewhere),'.runner.lock'),{minutes:1});
 const queuedElsewhere=await create('queued'); // no runner lock: may sit in another live instance's queue
 const before=await store.read(vanished,{hydrate:false});
 const report=await maintenance.reconcileStartup(runtime,{periodic:true});
 assert.deepEqual(report.errors,[]);assert.deepEqual(calls,[]);assert.deepEqual(scheduled,[]);
 assert.deepEqual(report.interrupted.map(x=>x.id),[vanished]);
 const job=await store.read(vanished,{hydrate:false});assert.equal(job.status,'failed');assert.equal(job.errorCode,'PROCESSING_INTERRUPTED');assert.equal(job.startupInterruptions.at(-1).evidence,'silent-runner-owner');assert.deepEqual(job.budget,before.budget);
 await assert.rejects(fs.stat(path.join(store.dir(vanished),'.request-reasoning-'+key+'.lock')),{code:'ENOENT'});
 for(const id of [busyElsewhere,queuedElsewhere])assert.equal((await store.read(id,{hydrate:false})).status,id===queuedElsewhere?'queued':'running');
 const info=await require('../../lib/creative-ai/runtime/resume-work').inspect(runtime,vanished,brandId);assert.equal(info.canResume,true,info.reason);
});

test('the Studio keeps checking while it serves, and stop() ends the checks',async()=>{
 const src=await fs.readFile(require.resolve('../../lib/creative-ai/runtime/background-maintenance'),'utf8');
 assert.match(src,/reconcileStartup\(runtime,\{periodic:true\}\)/);assert.match(src,/clearInterval\(periodic\)/);
});
