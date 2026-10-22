'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path');
const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),{stageState}=require('../../lib/creative-ai/runtime/job-stage');
test('stage projection includes parallel work and terminal status never implies approval',()=>{
 const p={tasks:{copy:{kind:'copy',status:'running',startSequence:1},art:{kind:'art',status:'running',startSequence:2}},progress:{stage:'brand'}};
 assert.deepEqual(stageState({status:'running'},p),{stage:'art',activeStages:['copy','art']});p.tasks.art.status='completed';assert.deepEqual(stageState({status:'running'},p),{stage:'copy',activeStages:['copy']});
 for(const status of ['finished','partial','failed','needs-input'])assert.deepEqual(stageState({status},p),{stage:status,activeStages:[]});
});
test('runtime persists activity-derived stage, survives reopen, and clears terminal stages when resuming',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'stage-regression-'));try{const r=new CreativeRuntime({root,provider:{}}),job=await r.store.create({},r.config,[]),id=job.id;await r.store.update(id,j=>{j.status='running';return j;});
 const config={jobId:id,assignmentId:id,mode:'production',concepts:[{id:'c1',route:'continuity'},{id:'c2',route:'exploration'}],placements:[{id:'p1',label:'Story'}]};
 await r.log(id,'job.created','created',{details:{config}});await r.beginTask(id,'start-strategy',{agent:'marketing-strategist',details:{taskId:'strategy',taskKind:'strategy'}});assert.equal((await r.store.read(id)).stage,'strategy');
 const reopened=new CreativeRuntime({root,provider:{}});assert.equal((await reopened.store.read(id)).stage,'strategy');assert.equal((await reopened.view(id)).stage,'strategy');
 await r.log(id,'task.failed','failed-strategy',{agent:'marketing-strategist',details:{taskId:'strategy',taskKind:'strategy'}});await r.store.update(id,j=>{j.status='failed';return j;});assert.deepEqual((await r.store.read(id)).activeStages,[]);assert.equal((await r.store.read(id)).stage,'failed');
 await r.store.update(id,j=>{j.status='queued';return j;});assert.equal((await r.store.read(id)).stage,'queued');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
