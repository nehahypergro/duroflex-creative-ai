'use strict';
// Defect #8 (8 Nov 2026): crash leftovers blocked shared writers indefinitely.
// - Empty .submission-<hash>.lock folders (crash between mkdir and owner write) made
//   every resubmission of the same Studio draft fail with SHARED_WRITER_BUSY.
// - Owners from a previous boot were never reclaimed, so capacity slots, .runner.lock
//   and .request-*.lock stayed held after a reboot or power loss.
// - With automatic resumption disabled, jobs left running/queued by a dead Studio stayed
//   "active" until their processing deadline and in-flight image requests stayed unflagged.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const locks=require('../../lib/creative-ai/runtime/file-lock'),identity=require('../../lib/creative-ai/runtime/process-identity'),{JobStore}=require('../../lib/creative-ai/runtime/store');
const resume=require('../../lib/creative-ai/runtime/resume-work');
const old=Date.now()/1000-600; // ten minutes: older than any lock write gap
const bootTime=()=>Date.now()-os.uptime()*1000;
async function temp(t,prefix){const root=await fs.mkdtemp(path.join(os.tmpdir(),prefix));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
async function owner(dir,fields,{mtime}={}){await fs.mkdir(dir,{recursive:true});const token=crypto.randomUUID(),file=path.join(dir,'owner-'+token+'.json');await fs.writeFile(file,JSON.stringify({host:os.hostname(),token,createdAt:new Date().toISOString(),...fields}));if(mtime)await fs.utimes(file,mtime,mtime);return file;}
// Exactly the on-disk format written before this fix: no machine identity, previous boot UUID.
const previousBoot=(dir,extra={})=>owner(dir,{pid:process.pid,bootId:'00000000-0000-4000-8000-previousboot',processStart:'Thu Jan  1 00:00:00 2026',...extra},{mtime:(bootTime()-3600e3)/1000});
async function deadSameBoot(dir){return owner(dir,{pid:999999999,bootId:await identity.bootId(),processStart:'Thu Jan  1 00:00:00 2026'});}

test('empty or half-written lock folders are reclaimed after the grace period; fresh ones are not',async t=>{
 const root=await temp(t,'stale-empty-lock-'),file=path.join(root,'.submission-'+'a'.repeat(64)+'.lock');
 await fs.mkdir(file);await assert.rejects(locks.acquire(file,{timeoutMs:30}),{code:'SHARED_WRITER_BUSY'},'a fresh empty folder may be a live writer between mkdir and its owner file');
 await fs.utimes(file,old,old);const release=await locks.acquire(file,{timeoutMs:500});await release();
 await assert.rejects(fs.stat(file),{code:'ENOENT'});
 await fs.mkdir(file);const partial=path.join(file,'owner-'+crypto.randomUUID()+'.json');await fs.writeFile(partial,'{"pid":12');
 await assert.rejects(locks.acquire(file,{timeoutMs:30}),{code:'SHARED_WRITER_BUSY'});
 await fs.utimes(partial,old,old);await fs.utimes(file,old,old);const second=await locks.acquire(file,{timeoutMs:500});await second();
 // Unknown content is not ours to delete, however old.
 await fs.mkdir(file);await fs.writeFile(path.join(file,'notes.txt'),'operator evidence');await fs.utimes(path.join(file,'notes.txt'),old,old);await fs.utimes(file,old,old);
 await assert.rejects(locks.acquire(file,{timeoutMs:30}),{code:'SHARED_WRITER_BUSY'});assert.equal(await fs.readFile(path.join(file,'notes.txt'),'utf8'),'operator evidence');
});

test('contenders racing over one stale empty folder never hold the lock together',async t=>{
 const root=await temp(t,'stale-race-');
 for(let round=0;round<5;round++){const file=path.join(root,'lock-'+round);await fs.mkdir(file);await fs.utimes(file,old,old);
  let active=0,peak=0,count=0;await Promise.all(Array.from({length:12},()=>locks.withLock(file,async()=>{peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,2));count++;active--;},{timeoutMs:5000})));
  assert.equal(peak,1);assert.equal(count,12);await assert.rejects(fs.stat(file),{code:'ENOENT'});}
});

test('a previous-boot owner on this machine is reclaimed even if its PID is reused; foreign or unproven owners are kept',async t=>{
 const root=await temp(t,'previous-boot-lock-'),file=path.join(root,'.runner.lock');
 // process.pid is alive now, as a reused PID would be after a reboot.
 await previousBoot(file);const release=await locks.acquire(file,{timeoutMs:500});await release();
 const mine=(await identity.self()).machineId;
 if(mine){await previousBoot(file,{machineId:mine,host:'renamed-mac'});const again=await locks.acquire(file,{timeoutMs:500});await again();}
 await previousBoot(file,{machineId:'f'.repeat(32)});await assert.rejects(locks.acquire(file,{timeoutMs:30}),{code:'SHARED_WRITER_BUSY'},'another machine with the same hostname is never presumed dead');await fs.rm(file,{recursive:true});
 await previousBoot(file,{host:'another-host'});await assert.rejects(locks.acquire(file,{timeoutMs:30}),{code:'SHARED_WRITER_BUSY'});await fs.rm(file,{recursive:true});
 const marker=await previousBoot(file);await fs.utimes(marker,Date.now()/1000,Date.now()/1000);
 await assert.rejects(locks.acquire(file,{timeoutMs:30}),{code:'SHARED_WRITER_BUSY'},'a legacy marker written after this boot cannot prove a previous boot');await fs.rm(file,{recursive:true});
 const live=await locks.acquire(file);try{await assert.rejects(locks.acquire(file,{timeoutMs:30}),{code:'SHARED_WRITER_BUSY'});}finally{await live();}
});

test('previous-boot provider capacity slots no longer stall image dispatch',async t=>{
 const root=await temp(t,'capacity-boot-'),capacity=path.join(root,'.provider-capacity');
 for(const slot of ['0','1'])await previousBoot(path.join(capacity,'image','active',slot));
 let ran=0;await require('../../lib/creative-ai/runtime/shared-capacity').run(capacity,'image',2,async()=>{ran++;},{timeoutMs:500});assert.equal(ran,1);
});

async function studio(t){
 const root=await temp(t,'startup-reconcile-'),store=new JobStore(path.join(root,'output/creative-ai/jobs')),calls=[],scheduled=[];
 const provider=new Proxy({},{get:(_,name)=>name==='then'?undefined:(...args)=>{calls.push(String(name));throw Error('No provider request may be dispatched during startup reconciliation');}});
 const runtime={root,store,config:{jobTimeoutMs:60000},active:new Set(),pending:[],schedule:id=>scheduled.push(id),provider:{provider}};
 const create=async(brandId,status,mutate=j=>j)=>{const job=await store.create({brandId,conceptRoutes:['continuity']},{jobTimeoutMs:60000,maxReasoningCalls:10,estimatedSpend:{maxUsd:20,reasoningUsd:1,imageUsd:2}},[{id:'a'},{id:'b'}]);await store.update(job.id,j=>{j.status=status;j.stage='image';j.budget.deadline=Date.now()+30*60e3;return mutate(j)||j;});return job.id;};
 return {root,store,runtime,calls,scheduled,create};
}

for(const brand of ['brand-duroflex','brand-sleepyhead'])test('startup reconciliation interrupts work left by a dead Studio without dispatching or resetting charges: '+brand,async t=>{
 const {store,runtime,calls,scheduled,create}=await studio(t),maintenance=require('../../lib/creative-ai/runtime/background-maintenance');
 const key='c'.repeat(64),inputHash='d'.repeat(64);
 // Crashed mid image request (unexpired deadline) in a previous boot.
 const crashed=await create(brand,'running',j=>{j.budget.requestStates={['image:'+key]:{kind:'image',key,reservedAt:new Date().toISOString()}};j.budget.imageReservations=[key];j.budget.imageCalls=1;j.budget.estimatedSpend.reservedUsd=2;j.imageWaits={[key]:{requestKey:key,inputHash,scope:{placementId:'a'},status:'requesting',chargeStatus:'unknown'}};});
 await previousBoot(path.join(store.dir(crashed),'.runner.lock'));await deadSameBoot(path.join(store.dir(crashed),'.request-image-'+key+'.lock'));
 // Waiting in an in-memory stage queue when the Studio stopped; no lock held.
 const queued=await create(brand,'queued',j=>{j.stageQueue={version:1,phase:'image',queuedAt:new Date().toISOString()};});
 const liveRunner=await create(brand,'running'),release=await locks.acquire(path.join(store.dir(liveRunner),'.runner.lock'));
 const background=await create(brand,'running',j=>{j.localExecution={owner:'queue',status:'running'};});
 const freshEmpty=await create(brand,'running');await fs.mkdir(path.join(store.dir(freshEmpty),'.runner.lock'));
 const submission=path.join(store.root,'.submission-'+'e'.repeat(64)+'.lock');await fs.mkdir(submission);await fs.utimes(submission,old,old);
 const slot=path.join(store.root,'.provider-capacity','image','active','0');await previousBoot(slot);
 const liveSubmission=path.join(store.root,'.submission-'+'f'.repeat(64)+'.lock'),liveSubmissionRelease=await locks.acquire(liveSubmission);
 const before=await store.read(crashed,{hydrate:false});
 try{

 const report=await maintenance.reconcileStartup(runtime);
 assert.deepEqual(calls,[]);assert.deepEqual(scheduled,[]);assert.deepEqual(report.errors,[]);
 assert.deepEqual(report.interrupted.map(x=>x.id).sort(),[crashed,queued].sort());assert.deepEqual(report.deferred,[freshEmpty]);assert(report.retryAfterMs>0&&report.retryAfterMs<=locks.STALE_LOCK_GRACE_MS);
 const job=await store.read(crashed,{hydrate:false});
 assert.equal(job.status,'failed');assert.equal(job.errorCode,'PROCESSING_INTERRUPTED');assert.match(job.error,/nothing was resubmitted/i);assert.deepEqual(job.activeStages,[]);
 assert.deepEqual(job.budget,before.budget,'charges and reservations stay exactly as recorded');
 const record=job.startupInterruptions.at(-1);assert.equal(record.reason,'owner-process-ended');assert.equal(record.evidence,'dead-runner-owner');assert.equal(record.status,'running');assert.deepEqual(record.unresolvedRequests,[{kind:'image',key,recovery:'image-wait'}]);
 assert.equal(job.imageWaits[key].status,'attention');assert.equal(job.imageWaits[key].chargeStatus,'unknown');assert.equal(job.imageWaits[key].inputHash,inputHash);
 for(const gone of [path.join(store.dir(crashed),'.runner.lock'),path.join(store.dir(crashed),'.request-image-'+key+'.lock'),submission,slot])await assert.rejects(fs.stat(gone),{code:'ENOENT'},gone);
 await fs.stat(liveSubmission);
 const info=await resume.inspect(runtime,crashed,brand);assert.equal(info.canResume,false);assert.equal(info.canReconcileImages,true);assert.equal(info.blockedRequestKey,key);
 const waiting=await store.read(queued,{hydrate:false});assert.equal(waiting.status,'failed');assert.equal(waiting.startupInterruptions.at(-1).evidence,'no-live-owner');
 const resumable=await resume.inspect(runtime,queued,brand);assert.equal(resumable.canResume,true,resumable.reason);
 for(const id of [liveRunner,background,freshEmpty])assert.equal((await store.read(id,{hydrate:false})).status,'running');
 assert.deepEqual(scheduled,[],'automatic resumption stays disabled');

 // The deferred check re-evaluates only the unproven folder once it has aged.
 await fs.utimes(path.join(store.dir(freshEmpty),'.runner.lock'),old,old);
 const retry=await maintenance.reconcileStartup(runtime,{only:report.deferred});assert.deepEqual(retry.interrupted.map(x=>x.id),[freshEmpty]);
 assert.equal((await store.read(freshEmpty,{hydrate:false})).status,'failed');assert.equal((await store.read(liveRunner,{hydrate:false})).status,'running');
 assert.deepEqual(calls,[]);assert.deepEqual(scheduled,[]);
 }finally{await release();await liveSubmissionRelease();}
});

test('Studio startup wiring reconciles before serving and keeps automatic resumption disabled',async()=>{
 const source=await fs.readFile(path.resolve(__dirname,'../../admin-server.js'),'utf8');
 assert.match(source,/resumeJobs:false/);assert.match(source,/recoverStartup\(app\.runtime,\{schedule:false\}\)/);
 assert(source.indexOf('startupReconciliation')>-1&&source.indexOf('startupReconciliation')<source.indexOf('recoverStartup('),'dead-owner reconciliation runs before deadline recovery');
 const studioSource=await fs.readFile(path.resolve(__dirname,'../../scripts/admin/local-studio.js'),'utf8');assert.match(studioSource,/automaticJobResumption: false/);assert.match(studioSource,/stopStartupReconciliation/);
});
