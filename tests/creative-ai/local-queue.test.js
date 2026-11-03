'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {Queue}=require('../../lib/creative-ai/local-queue/store.cjs'),{run}=require('../../lib/creative-ai/local-queue/supervisor.cjs');
const worker=path.join(__dirname,'fixtures/local-queue-worker.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('five isolated rolling workers survive crashes and failures without repeating saved or unresolved requests',{timeout:30000},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'local-queue-'));try{
 const q=new Queue(path.join(dir,'queue.sqlite'));
 q.import(Array.from({length:8},(_,i)=>({key:'job-'+i,name:'Fixture '+i,brand:i%2?'Sleepyhead':'Duroflex',state:'pending',delay:i===0?50:4500,crash:i===2,ambiguous:i===3,fail:i===1})));q.close();
 const rows=await run({dir,worker,heartbeatMs:30,staleMs:5000,keepAwake:false,workerHeapMb:128});
 assert.equal(rows.filter(r=>r.state==='finished').length,6);assert.equal(rows[1].state,'failed');assert.equal(rows[3].state,'held');assert.equal(rows[2].attempts,2);
 const check=new Queue(path.join(dir,'queue.sqlite')),events=check.events();check.close();let active=0,peak=0;for(const e of events){if(e.type==='worker-started')peak=Math.max(peak,++active);if(e.type==='worker-exited')active--;}
 assert.equal(peak,5);assert.equal(active,0);
 const startNext=events.findIndex(e=>e.type==='worker-started'&&e.key==='job-5'),endSlow=events.findIndex(e=>e.type==='worker-exited'&&e.key==='job-1');assert(startNext<endSlow,'refill immediately, without waiting for slow peers');
 const dispatch=(await fs.readFile(path.join(dir,'dispatch.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);assert.equal(dispatch.length,7);assert.equal(new Set(dispatch.map(d=>d.key)).size,7);assert.deepEqual(new Set(dispatch.map(d=>d.brand)),new Set(['Duroflex','Sleepyhead']));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('supervisor process death retains queue and resumes checkpoint without duplicate dispatch',{timeout:20000},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'local-queue-restart-'));let p;try{
 const q=new Queue(path.join(dir,'queue.sqlite'));q.import([{key:'restart',name:'Restart',brand:'Sleepyhead',state:'pending',delay:3000}]);q.close();
 const script=`require(${JSON.stringify(require.resolve('../../lib/creative-ai/local-queue/supervisor.cjs'))}).run({dir:${JSON.stringify(dir)},worker:${JSON.stringify(worker)},heartbeatMs:30,keepAwake:false,workerHeapMb:128})`;
 p=spawn(process.execPath,['-e',script],{stdio:'ignore'});
 for(let i=0;i<200;i++){if(await fs.stat(path.join(dir,'restart.checkpoint')).catch(()=>null))break;await wait(20);}
 assert(await fs.stat(path.join(dir,'restart.checkpoint')));const exit=new Promise(resolve=>p.once('exit',resolve));p.kill('SIGKILL');await exit;await wait(200);
 const rows=await run({dir,worker,heartbeatMs:30,keepAwake:false,workerHeapMb:128});assert.equal(rows[0].state,'finished');assert.equal((await fs.readFile(path.join(dir,'dispatch.jsonl'),'utf8')).trim().split('\n').length,1);
 }finally{p?.kill();await fs.rm(dir,{recursive:true,force:true});}
});
test('saved recovery distinguishes both-brand safe, pending and ambiguous checkpoints',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'recovery-audit-'));try{for(const brandId of ['brand-duroflex','brand-sleepyhead']){
 const key='a'.repeat(64),job={intake:{brandId},budget:{requestStates:{x:{kind:'image',key}}}};let check=await require('../../lib/creative-ai/local-queue/recovery.cjs').inspect(job,dir);assert.equal(check.safe,false);
 await fs.writeFile(path.join(dir,'request-image-'+key+'.json'),JSON.stringify({json:{data:[{}]}}));check=await require('../../lib/creative-ai/local-queue/recovery.cjs').inspect(job,dir);assert.equal(check.safe,true);await fs.unlink(path.join(dir,'request-image-'+key+'.json'));
 job.budget.requestStates.x.kind='reasoning';await fs.writeFile(path.join(dir,'request-reasoning-'+key+'.json'),JSON.stringify({json:{id:'resp_saved',status:'in_progress'}}));check=await require('../../lib/creative-ai/local-queue/recovery.cjs').inspect(job,dir);assert.equal(check.safe,true);assert.equal(check.pending[0].responseId,'resp_saved');await fs.unlink(path.join(dir,'request-reasoning-'+key+'.json'));
 }}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('recovering status overrides abandoned activity and preserves original budget and raster references',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'queue-status-'));try{
 const id='creative-status',folder=path.join(dir,'output/creative-ai/jobs',id);await fs.mkdir(folder,{recursive:true});
 const before={id,status:'running',budget:{imageCalls:1,estimatedSpend:{reservedUsd:3}},intake:{brandId:'brand-sleepyhead',asset:{$studioRaster:{sha256:'unchanged'}}},localExecution:{status:'running'}};
 await fs.writeFile(path.join(folder,'job.json'),JSON.stringify(before));await require('../../lib/creative-ai/local-queue/job-state.cjs').interrupted(dir,id,'recovering','Worker crashed');
 const after=JSON.parse(await fs.readFile(path.join(folder,'job.json')));assert.deepEqual(after.budget,before.budget);assert.deepEqual(after.intake,before.intake);
 const stage=require('../../lib/creative-ai/runtime/job-stage').stageState(after,{tasks:{old:{kind:'generation',status:'running'}},progress:{stage:'generation'}});assert.deepEqual(stage,{stage:'recovering',activeStages:[]});
 const model=require('../../public/creative-ai/studio-model');assert.equal(model.status({...after,...stage}).label,'Recovering');assert.match(model.jobProgress({...after,...stage}).description,/will not be repeated/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('five processes honour the shared two-image limit and a missing heartbeat is recovered',{timeout:15000},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'queue-capacity-'));try{const q=new Queue(path.join(dir,'queue.sqlite'));q.import(Array.from({length:5},(_,i)=>({key:'capacity-'+i,name:'Image '+i,brand:i%2?'Sleepyhead':'Duroflex',state:'pending',capacity:true,delay:500,hang:i===0})));q.close();
 const rows=await run({dir,worker,heartbeatMs:20,staleMs:300,keepAwake:false,workerHeapMb:128});assert(rows.every(r=>r.state==='finished'));assert.equal(rows[0].attempts,2);
 const lines=(await fs.readFile(path.join(dir,'capacity.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);let active=0,peak=0;for(const r of lines){active+=r.type==='enter'?1:-1;peak=Math.max(peak,active);assert(active>=0);}assert.equal(peak,2);assert.equal(active,0);
 const check=new Queue(path.join(dir,'queue.sqlite'));assert(check.events().some(e=>e.type==='heartbeat-expired'));check.close();
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
