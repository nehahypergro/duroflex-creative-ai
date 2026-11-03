'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const cd=require('../../lib/creative-ai/creative-director');
const fixture=require('../../lib/creative-ai/creative-director/examples/synthetic');
const workflow=require('../../lib/creative-ai/workflow-producer');
const wf=require('../../lib/creative-ai/workflow-producer/examples/synthetic');
const campaign=require('../../lib/creative-ai/runtime/campaign-input');
test('explicit Option 1 completes a single concept and both specialist handoffs',()=>{
 const input=fixture.inputExample();input.conceptRoutes=['continuity'];
 const core=fixture.coreExample(input);core.concepts=core.concepts.slice(0,1);
 const out=cd.finalizeOutput(core,input);
 assert.equal(out.concepts.length,1);assert.equal(out.handoff.recipients.length,2);
 assert.ok(out.handoff.recipients.every(r=>r.conceptIds.length===1));
});
test('one option is opt-in and cannot silently remove or add a direction',()=>{
 const input=fixture.inputExample(),core=fixture.coreExample(input);
 assert.throws(()=>cd.finalizeOutput({...core,concepts:core.concepts.slice(0,1)},input));
 assert.throws(()=>cd.finalizeOutput(core,{...input,conceptRoutes:['continuity']}));
});
test('single-option workflow requires explicit selection; legacy two-option contract remains',()=>{
 const config=wf.config();
 config.concepts=config.concepts.slice(0,1);
 assert.throws(()=>workflow.validateJob(config));
 config.conceptRoutes=['continuity'];assert.doesNotThrow(()=>workflow.validateJob(config));
});
test('selection is validated before paid work and retained in the saved brief',()=>{
 for(const conceptRoutes of [[],['bad'],['continuity','continuity'],null])assert.throws(()=>campaign.normalize({brief:'test',conceptRoutes}));
 const intake=campaign.normalize({brief:'test',conceptRoutes:['continuity']});
 assert.deepEqual(campaign.canonical(intake).content.conceptRoutes,['continuity']);
});
test('single direction reaches art and image packages without creating an exploration slot',async()=>{
 const art=require('../../lib/creative-ai/art-director'),af=require('../../lib/creative-ai/art-director/examples/synthetic');
 const graphic=require('../../lib/creative-ai/graphic-designer'),gf=require('../../lib/creative-ai/graphic-designer/examples/synthetic');
 const input=await gf.inputExample(),a=input.artInput;
 a.directorInput.conceptRoutes=['continuity'];
 const {handoff,...core}=a.directorOutput;core.concepts=core.concepts.filter(c=>c.route==='continuity');
 a.directorOutput=cd.finalizeOutput(core,a.directorInput);
 const id=core.concepts[0].conceptId;a.copy=a.copy.filter(c=>c.conceptId===id);
 const ac=await art.assembleContext(a);input.artOutput=art.finalizeOutput(af.coreExample(ac),ac);
 input.jobs=input.jobs.filter(j=>j.conceptId===id);
 const ctx=await graphic.assembleContext(input),out=graphic.buildGenerationPackages(ctx);
 assert.equal(out.records.length,1);assert.equal(out.records[0].route,'continuity');
 assert.equal(graphic.validateOutput(out,ctx).valid,true,JSON.stringify(graphic.validateOutput(out,ctx)));
});
test('provider receives only the selected named concept slot',()=>{
 const input=fixture.inputExample();input.conceptRoutes=['continuity'];
 const request={input:{},instructions:'Fixture',schema:require('../../lib/creative-ai/concept-selection').schemaFor(cd.coreOutputSchema,input)};
 const wire=require('../../lib/creative-ai/runtime/decision-wire').concepts(request,input);
 assert.deepEqual(Object.keys(wire.schema.properties.concepts.properties),['continuity']);
 assert.deepEqual(wire.input.outputUnits.map(u=>u.route),['continuity']);
});
test('image reservation allows one initial image and one correction per selected slot only',async()=>{
 const fs=require('fs/promises'),os=require('os'),path=require('path');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'single-option-'));
 try{const {JobStore}=require('../../lib/creative-ai/runtime/store'),store=new JobStore(root);
 const job=await store.create({conceptRoutes:['continuity']},{maxReasoningCalls:3,jobTimeoutMs:10000},[{id:'image'}]);
 assert.equal(job.budget.maxImageCalls,2);
 await store.budget(job.id).reserve('image','initial');await store.budget(job.id).reserve('image','correction');
 await assert.rejects(()=>store.budget(job.id).reserve('image','unselected'),/limit reached/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('single-option activity completes its concept task and creates no phantom output unit',async()=>{
 const fs=require('fs/promises'),os=require('os'),path=require('path'),root=await fs.mkdtemp(path.join(os.tmpdir(),'single-activity-'));
 try{const ledger=new workflow.ActivityLedger(root),config=wf.config();config.conceptRoutes=['continuity'];config.concepts=config.concepts.slice(0,1);
 const add=(type,key,extra={})=>ledger.append(wf.event(config.jobId,type,key,extra));
 await add('job.created','created',{details:{config}});
 await add('task.started','started',{agent:'creative-director',details:{taskId:'concept-task',taskKind:'concepts'}});
 await add('artifact.saved','card',{scope:{conceptId:config.concepts[0].id,route:'continuity'},details:{artifact:{id:'card',kind:'concept',version:'1',reference:'Synthetic Option 1 card',hash:'none'}}});
 await add('task.completed','done',{artifactRefs:['card'],agent:'creative-director',details:{taskId:'concept-task',taskKind:'concepts'}});
 const view=await ledger.project(config.jobId);assert.equal(view.units.length,1);assert.equal(view.tasks['concept-task'].status,'completed');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('print completion reports only the selected option, including missing artwork honestly',async()=>{
 let job={intake:{conceptRoutes:['continuity']},selection:[{id:'page',description:{printSet:{id:'fixture',name:'Fixture'}}}],results:[]};
 const saved=[];const runtime={store:{read:async()=>job,dir:()=>'/tmp',save:async(id,name)=>saved.push(name),update:async(id,fn)=>{job=fn(job);}}};
 const reports=await require('../../lib/creative-ai/runtime/print-production').finish(runtime,'fixture');
 assert.equal(reports.length,1);assert.equal(reports[0].route,'continuity');assert.equal(reports[0].complete,false);assert.ok(saved.every(n=>!n.includes('exploration')));
});
