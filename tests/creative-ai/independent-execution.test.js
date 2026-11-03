'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const art=require('../../lib/creative-ai/art-director'),fixture=require('../../lib/creative-ai/art-director/examples/synthetic');
const pdp=require('../../lib/creative-ai/runtime/pdp'),pipeline=require('../../lib/creative-ai/runtime/streaming-pipeline');
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': a scoped option reconciles without manufacturing sibling copy',async()=>{
  const input=await fixture.inputExample();const id=input.directorOutput.concepts[0].conceptId;
  const original=structuredClone(input.directorOutput),fullCore=fixture.coreExample(await art.assembleContext(input));input.activeConceptIds=[id];input.copy=input.copy.filter(c=>c.conceptId===id);
  const ctx=await art.assembleContext(input,{includeMessages:false});
  const core=fullCore;core.inputHash=ctx.inputHash;core.specifications=core.specifications.filter(s=>s.conceptId===id);
  const output=art.finalizeOutput(core,ctx);assert.equal(output.specifications.length,1);
  const graphic=require('../../lib/creative-ai/graphic-designer');const spec=output.specifications[0];const job={conceptId:id,placementId:spec.placementId,canvas:{width:200,height:200,sourceStatus:'verified-primary',ruleIds:['google-upload-small-square']},outputFormat:'png',productAssetRequired:false,logoAssetRequired:false,fontStatus:'not-required',displayContext:'Synthetic scoped option',conflicts:[]};
  const packages=graphic.buildGenerationPackages(await graphic.assembleContext({version:1,artInput:input,artOutput:output,jobs:[job]},{includeMessages:false}));assert.equal(packages.records.length,1);assert.equal(packages.records[0].conceptId,id);
  assert.deepEqual(input.directorOutput,original);assert.equal(input.copy.length,1);
  await assert.rejects(()=>art.assembleContext({...input,activeConceptIds:['foreign-concept']},{includeMessages:false}),/concept|scope/i);
 });
 test(brand+': any missing PDP slot holds only that concept/slot under isolated execution',()=>{
  const selection=[{id:'hero',description:{pdp:{key:'hero'}}},{id:'detail',description:{pdp:{key:'detail'}}}];
  const plan={sets:['a','b'].map(conceptId=>({conceptId,slots:selection.map(s=>({placementId:s.id,status:conceptId==='a'&&s.id==='hero'?'needs-source':'ready',missingEvidence:['fixture gap']}))}))};
  const out=pdp.dispatchPlan(plan,selection,null,{isolateUnits:true});assert.equal(out.deferred.length,1);assert.deepEqual(out.selection,selection);assert.equal(out.expectedUnits,4);
  assert.throws(()=>pdp.dispatchPlan(plan,selection,null),/source evidence/,'old pinned jobs keep their strict contract');
 });
 for(let scenario=0;scenario<10;scenario++)test(brand+': independent option survives failed sibling, ordering variant '+scenario,async()=>{
  const isolation=require('../../lib/creative-ai/runtime/execution-isolation');
  const concepts=[{conceptId:'a',route:'continuity'},{conceptId:'b',route:'exploration'}],placements=[{id:'hero'},{id:'detail'}];
  const groups=isolation.groups(concepts,placements,[]);assert.equal(groups.length,4);
  const done=[];const outcomes=await pipeline.run(scenario%2?groups.toReversed():groups,{planningLimit:scenario%3+1,unitLimit:scenario%2+1,prepare:async g=>{if(g.units[0].conceptId==='a'&&g.units[0].placementId==='hero')throw Error('fixture failed draft');return g.units;},execute:async r=>{done.push(r.conceptId+'|'+r.placementId);return r;}});
  assert.equal(outcomes.filter(x=>x.status==='rejected').length,1);assert.equal(done.length,3);assert.ok(done.includes('b|hero'));assert.ok(done.includes('a|detail'));
 });
}

test('delivery failure does not prevent other delivery families from finishing',async()=>{
 const isolation=require('../../lib/creative-ai/runtime/execution-isolation'),seen=[];
 const failures=await isolation.finish([{stage:'carousel',run:async()=>{throw Error('fixture export unavailable');}},{stage:'pdp',run:async()=>seen.push('pdp')},{stage:'print',run:async()=>seen.push('print')}]);
 assert.deepEqual(seen,['pdp','print']);assert.deepEqual(failures,[{stage:'carousel',error:'fixture export unavailable'}]);
});
test('partial gallery inspection continues after one review batch disconnects',async()=>{
 const sharp=require('sharp'),inspect=require('../../lib/creative-ai/runtime/pdp-review-batches').inspect;
 const bytes=await sharp({create:{width:32,height:32,channels:3,background:'white'}}).png().toBuffer();
 const rows=Array.from({length:6},(_,i)=>({index:i+1,placementId:'p'+i,role:'detail',imageUrl:'image.png',bytes}));let calls=0;
 const criteria=['slot-coverage','visual-consistency','product-truth'];const output={checks:criteria.map(criterion=>({criterion,status:'pass',evidence:'Synthetic test'}))};
 const result=await inspect({rows,previews:[],binding:'fixture',continueOnError:true,load:async()=>null,save:async()=>{},budget:{},request:{instructions:'Fixture',input:{set:{slots:rows},manifest:rows},schema:{properties:{checks:{items:{properties:{criterion:{enum:criteria}}}}}},validate:()=>{}},provider:{reason:async()=>{if(++calls===1)throw Error('fetch failed');return output;}}});
 assert.equal(calls,3);assert.ok(result.checks.every(c=>c.status==='unknown'));
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': in-flight guidance uses its pinned document authority after a library update',async()=>{
 const isolation=require('../../lib/creative-ai/runtime/execution-isolation');
 const scope=await require('../../lib/creative-ai/runtime/brand-isolation').snapshot({brandId:brand,brandUrl:'https://example.invalid'}, {read:async()=>({id:brand,name:brand,brandUrl:'https://example.invalid',documents:[{id:'old-guide',draft:true}],assets:[]}),revision:()=> 'v1'});
 const job={executionIsolationVersion:1,intake:{brandId:brand,brandKnowledge:scope}};
 assert.deepEqual(isolation.draftDocuments(job,{id:brand,documents:[{id:'new-guide',draft:false}]},'v2'),['old-guide']);
 assert.throws(()=>isolation.draftDocuments(job,{id:'foreign',documents:[]},'v2'),/brand/i);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': failed family plan holds its children, while an independent family finishes',async()=>{
 const isolation=require('../../lib/creative-ai/runtime/execution-isolation');let visited=false;
 const outcome=await isolation.planFamilies([{stage:'pdp-plan',placementIds:['hero','detail'],run:async()=>{throw Error('fixture plan disconnected');}},{stage:'carousel-plan',placementIds:['slide1'],run:async()=>{visited=true;return {sets:['carousel']};}}]);
 assert.equal(visited,true);assert.deepEqual(outcome.plans['carousel-plan'],{sets:['carousel']});assert.equal(outcome.plans['pdp-plan'],null);assert.deepEqual(outcome.failures,[{stage:'pdp-plan',placementIds:['hero','detail'],error:'fixture plan disconnected'}]);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': a broken carousel pack does not suppress its sibling pack',async()=>{
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pack-isolation-'));try{
 const runtime=new CreativeRuntime({root,provider:{reason:async()=>{throw Error('Unexpected model call');}}});const job=await runtime.store.create({brandId:'brand-'+brand.toLowerCase()},runtime.config,[]);await runtime.store.update(job.id,j=>{j.executionIsolationVersion=1;return j;});
 const visited=[];runtime.finishCarouselSet=async(id,set)=>{visited.push(set.conceptId);if(set.conceptId==='a')throw Error('fixture pack error');};
 await assert.rejects(()=>runtime.finishCarousels(job.id,{sets:[{conceptId:'a'},{conceptId:'b'}]},{}),/fixture pack error/);assert.deepEqual(visited,['a','b']);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('isolated PDP admission budgets separate option planning without enlarging the approved money cap',()=>{
 const config={streamingPlanning:true,executionIsolation:true,maxReasoningCalls:160,estimatedSpend:{maxUsd:343,reasoningUsd:2,imageUsd:3}};
 assert.throws(()=>pdp.admission(config),e=>e.code==='PDP_BUDGET_REQUIRED'&&e.minimumReservation.reasoning===136&&e.minimumReservation.amount===344);
 const admitted=pdp.admission({...config,estimatedSpend:{...config.estimatedSpend,maxUsd:344}});assert.equal(admitted.estimatedSpend.maxUsd,344);assert.equal(admitted.maxReasoningCalls,200);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': corrupt print artwork holds its proof but saves the other proofs',async()=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),sharp=require('sharp'),print=require('../../lib/creative-ai/runtime/print-production');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'print-isolation-'));
 try{const id='fixture-print',conceptId=require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:id},'continuity');
 await fs.writeFile(path.join(dir,'static-good.png'),await sharp({create:{width:16,height:16,channels:3,background:'white'}}).png().toBuffer());await fs.writeFile(path.join(dir,'static-bad.png'),'corrupt');
 const geometry={artboard:{width:10,height:10}};let job={id,intake:{brandId:'brand-'+brand.toLowerCase()},executionIsolationVersion:1,selection:['bad','good'].map(id=>({id,description:{printSet:{id,name:id,index:1,count:1},print:{geometry,bleedMm:0,trimWidthMm:10,trimHeightMm:10,requiredPpi:300}}})),results:['bad','good'].map(placementId=>({conceptId,route:'continuity',placementId,imageUrl:'/creative-ai/api/jobs/'+id+'/files/static-'+placementId+'.png',ready:true}))};
 const runtime={store:{read:async()=>job,dir:()=>dir,save:async(id,name,value)=>fs.writeFile(path.join(dir,name),Buffer.isBuffer(value)?value:JSON.stringify(value)),update:async(id,fn)=>job=fn(job)}};
 await assert.rejects(()=>print.finish(runtime,id),/print|image|buffer/i);assert.ok(job.printProofs.some(p=>p.formatId==='good'&&p.route==='continuity'&&p.downloadUrl));assert.ok(job.printProofs.some(p=>p.formatId==='bad'&&p.status==='proof-processing-failed'));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
