'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
for(const brand of ['Duroflex','Sleepyhead'])for(const isolated of [false,true])test(brand+(isolated?' isolated option':' legacy pair')+' planning group reads scoped checkpoints and retains corrected wording on resume',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'streaming-engine-'));try{
 const runtime=new CreativeRuntime({root,provider:{reason:async()=>{throw Error('Unexpected model call');}}});
 const job=await runtime.store.create({brandId:'brand-'+brand.toLowerCase()},runtime.config,[{id:'p1'}]);
 const group={id:'group-one',placementIds:['p1'],...(isolated?{conceptIds:['c']}:{})},copy={decks:[{conceptId:'c',placementId:'p1',fields:[]}]},drafts={drafts:[{conceptId:'c',placementId:'p1'}]};
 await runtime.store.save(job.id,'plan-group-one-copy.json',copy);await runtime.store.save(job.id,'plan-group-one-art-drafts.json',drafts);
 runtime.activity.project=async()=>({tasks:{}});runtime.beginTask=async()=>{};runtime.finishTask=async()=>{};runtime.artifact=async()=>({});
 // Stop at reconciliation; reaching it proves cache paths and group scoping worked.
 runtime.reconcileBatches=async(id,input)=>{assert.deepEqual(input.placements.map(p=>p.id),['p1']);assert.deepEqual(input.activeConceptIds,isolated?['c']:undefined);assert.deepEqual(input.directorOutput.concepts.map(c=>c.conceptId),['c','sibling']);assert.equal(input.copy.length,1);throw Error('CHECKPOINT_REACHED');};
 const context={job,intake:job.intake,budget:{},research:{facts:[]},guardian:{visualRules:[]},directorInput:{strategy:{}},directorOutput:{concepts:[{conceptId:'c',route:'continuity'},{conceptId:'sibling',route:'exploration'}]},placements:[{id:'p1'},{id:'p2'}],assets:[],catalog:{},base:{placements:[{id:'p1'},{id:'p2'}],concepts:[{conceptId:'c'},...(isolated?[{conceptId:'sibling'}]:[])]}};
 // Avoid a paid fit revision after the intentional stop.
 runtime.planInBatches=async()=>{throw Error('CHECKPOINT_REACHED');};
 await assert.rejects(()=>runtime.planOutputGroup(job.id,context,group),/CHECKPOINT_REACHED/);
 const saved=await runtime.store.read(job.id);const paths=isolated?saved.planningFilesByUnit:saved.planningFilesByPlacement;assert.equal(paths[isolated?'c|p1':'p1']['art-input.json'],'plan-group-one-art-input.json');assert.equal(paths[isolated?'c|p2':'p2'],undefined);assert.equal(paths['sibling|p1'],undefined);if(isolated)assert.equal(saved.planningFilesByPlacement,undefined);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
