'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),os=require('os');
const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),{JobStore}=require('../../lib/creative-ai/runtime/store'),{ActivityLedger}=require('../../lib/creative-ai/workflow-producer'),fixture=require('../../lib/creative-ai/workflow-producer/examples/synthetic');
for(const interruptedLegacyHandoff of [false,true]) test((interruptedLegacyHandoff?'interrupted legacy handoff: ':'')+'whole-gallery planning has its own global owner, durable artifact and no repeated paid dispatch',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pdp-stage-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const r=Object.create(CreativeRuntime.prototype);r.store=new JobStore(path.join(root,'jobs'));r.activity=new ActivityLedger(path.join(root,'activity'));r.eventQueues=new Map();
 const j=await r.store.create({brandId:'brand-isolated-test',brief:'Synthetic gallery lifecycle'},{maxReasoningCalls:160,jobTimeoutMs:60000},[]);
 const config={...fixture.config(),jobId:j.id,mode:'production'};
 await r.log(j.id,'job.created','created',{details:{config}});
 await r.artifact(j.id,'strategy.json','strategy',{synthetic:true});
 if(interruptedLegacyHandoff){const details={handoffId:'input-pdp-plan-json',targetAgent:'creative-director',taskKind:'art'};await r.log(j.id,'handoff.sent','send-input-pdp-plan-json',{details});await r.log(j.id,'handoff.accepted','accept-input-pdp-plan-json',{agent:'creative-director',details});}
 let calls=0;const value={version:2,sets:[]};
 await r.stage(j.id,'pdp-plan','creative-director','pdp-plan.json',async()=>{calls++;return value;});
 const view=await r.activity.project(j.id);const task=Object.values(view.tasks).find(t=>t.kind==='pdp-plan');assert.equal(task.status,'completed');assert.equal(view.artifacts['pdp-plan-json'].kind,'pdp-plan');assert.deepEqual(task.scope,{});
 assert.deepEqual(await r.stage(j.id,'pdp-plan','creative-director','pdp-plan.json',()=>assert.fail('Saved plan must be reused')),value);assert.equal(calls,1);
 await assert.rejects(r.beginTask(j.id,'wrong-owner',{agent:'art-director',scope:{},description:'Synthetic owner check',outcome:'No paid work',details:{taskId:'wrong-owner',taskKind:'pdp-plan'}}),/owner/);
 await assert.rejects(r.beginTask(j.id,'wrong-scope',{agent:'creative-director',scope:{conceptId:config.concepts[0].id,route:'continuity',placementId:config.placements[0].id},description:'Synthetic scope check',outcome:'No paid work',details:{taskId:'wrong-scope',taskKind:'pdp-plan'}}),/scope/);
});

test('saved image after a failed generation task resumes lifecycle without another image request',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pdp-image-resume-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const r=Object.create(CreativeRuntime.prototype);r.store=new JobStore(path.join(root,'jobs'));r.activity=new ActivityLedger(path.join(root,'activity'));r.eventQueues=new Map();
 const job=await r.store.create({brandId:'brand-isolated-test'},{maxReasoningCalls:20,jobTimeoutMs:60000},[]),config={...fixture.config(),jobId:job.id,mode:'production'};await r.log(job.id,'job.created','created',{details:{config}});const scope={conceptId:config.concepts[0].id,route:'continuity',placementId:config.placements[0].id},taskId='generation-'+scope.route+'-'+scope.placementId+'-0';await r.beginTask(job.id,'start-'+taskId,{agent:'graphic-designer',scope,description:'Initial fixture attempt',outcome:'Fixture admission',details:{taskId,taskKind:'generation'}});await r.log(job.id,'task.failed','fail-'+taskId,{agent:'graphic-designer',scope,description:'Deadline reached',outcome:'No image request was sent',details:{taskId,taskKind:'generation'}});
 const bytes=await require('sharp')({create:{width:64,height:64,channels:3,background:'#aaa'}}).png().toBuffer(),name='static-'+scope.route+'-'+scope.placementId+'-0.png';await r.store.save(job.id,name,bytes);r.provider={generate:()=>assert.fail('Saved pixels must never be generated again')};const result=await r.generateImage(job.id,{outputFormat:'png'}, {},scope,0);assert.deepEqual(Buffer.from(result.imageData.split(',')[1],'base64'),bytes);let view=await r.activity.project(job.id);assert.equal(view.tasks[taskId].status,'failed');const resumed=Object.values(view.tasks).filter(t=>t.kind==='generation'&&t.taskId!==taskId);assert.equal(resumed.length,1);assert.equal(resumed[0].status,'completed');await r.generateImage(job.id,{outputFormat:'png'}, {},scope,0);view=await r.activity.project(job.id);assert.equal(Object.values(view.tasks).filter(t=>t.kind==='generation').length,2);
});
