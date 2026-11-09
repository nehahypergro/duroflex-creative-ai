'use strict';
// Planner model comparison (8 Nov 2026): paid experiment calls are saved under
// output/creative-ai/planner-experiments and must be counted by the shared cost
// ledger like any other job. Unknown usage stays unknown, never zero. The replayed
// request must be the same lean planning request the main workflow sends.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
const {CostTracker}=require('../../lib/cost-tracker');
const brand={id:'brand-22222222-2222-2222-2222-222222222222',name:'Duroflex'};

async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'planner-comparison-'));
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),config=new CreativeRuntime({root,provider:{}}).config;
 const store=new JobStore(path.join(root,'output/creative-ai/planner-experiments'));
 const job=await store.create({brandId:brand.id,costPurpose:'Testing',requestKey:'pc1108-test-argon',plannerExperiment:{version:1,model:'gemini-4-argon'}},{...config,maxReasoningCalls:2,initialStatus:'running'},[]);
 return {root,store,job,done:()=>fs.rm(root,{recursive:true,force:true})};
}

test('planner-experiment receipts are counted in the shared cost ledger as Testing',async()=>{
 const f=await fixture();try{
  const budget=f.store.budget(f.job.id);
  await budget.reserve('reasoning','planner-call-1');
  await budget.receipt({kind:'reasoning',model:'gemini-4-argon',requestId:'vertex-1',requestKey:'planner-call-1',recordedAt:'2026-11-08T12:00:00.000Z',usage:{input_tokens:1000,output_tokens:500}});
  const snap=await new CostTracker(f.root,{brands:[brand]}).snapshot();
  const rows=snap.entries.filter(e=>e.sourceFamily==='planner-experiments');
  assert.equal(rows.length,1);assert.equal(rows[0].brandId,brand.id);assert.equal(rows[0].purpose,'Testing');
  assert.ok(Math.abs(rows[0].estimatedUsd-0.007)<1e-9,'priced at the November Argon list rate');
 }finally{await f.done();}
});

test('a planner-experiment receipt without usage stays unknown, not zero',async()=>{
 const f=await fixture();try{
  const budget=f.store.budget(f.job.id);
  await budget.reserve('reasoning','planner-call-2');
  await budget.receipt({kind:'reasoning',model:'gpt-6-luna',requestId:'resp_2',requestKey:'planner-call-2',usage:{}});
  const row=(await new CostTracker(f.root,{brands:[brand]}).snapshot()).entries.find(e=>e.sourceFamily==='planner-experiments');
  assert.equal(row.estimatedUsd,null);
 }finally{await f.done();}
});

test('saved picture references resolve inside the planner-experiments namespace',()=>{
 const {namespace}=require('../../lib/creative-ai/runtime/reference-storage');
 assert.equal(namespace('/x/output/creative-ai/planner-experiments/creative-1/plan.json'),'/x/output/creative-ai');
});

test('the comparison replays the main lean planning request with at most one repair',()=>{
 const {request}=require('../../lib/creative-ai/experiments/planner-comparison/run');
 const planning=require('../../lib/creative-ai/lean/planning'),{principle}=require('../../lib/creative-ai/runtime/format-intent');
 const input={planningContractVersion:2,spatialPlanningVersion:1,format:{pages:[{id:'page-a',size:'1080x1080'}]},product:{id:'p',facts:[]}};
 const r=request({input,refs:[{assetId:'sku-1',imageData:'data:image/png;base64,AA=='}]},[]);
 assert.equal(r.contextKind,'lean-planning');assert.equal(r.strictSchema,true);assert.equal(r.maxProviderRequests,2);
 assert.equal(r.instructions,planning.instructions+'\n'+principle);
 assert.deepEqual(r.schema,planning.schemaFor(input));assert.equal(r.maxOutputTokens,12500);
 assert.deepEqual(r.images,[{id:'sku-1',label:'Exact selected SKU reference; appearance only',imageData:'data:image/png;base64,AA=='}]);
 assert.throws(()=>r.validate({}),'the workflow validator rejects an incomplete plan');
});
