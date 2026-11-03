'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
function fixture(brand){return {version:1,assignmentId:'test-'+brand,strategyInput:{assignment:{focusType:'product',brief:'Choose one supported feature; preserve the selected SKU.'},facts:[{id:'preferred',kind:'product',status:'supported'},{id:'alternative',kind:'product',status:'supported'}],research:{brandName:brand,assets:[{id:'own-photo',kind:'product',imageData:'data:image/png;base64,AA=='}]},guardian:{requirements:[]}},strategy:{status:'ready',brief:{primaryProposition:{text:'Flip demonstration',factIds:['preferred']}}}};}
const blocked={status:'blocked',concepts:[{requiredAssets:[{assetId:'missing-demo',essential:true,status:'missing'}]}],workflow:{internalQuestions:[{target:'brand-researcher',relatedIds:['preferred'],question:'Missing exact SKU demonstration reference'}]}};
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': supported alternative recovery is bounded, cached and retains the original evidence',async()=>{
 const r=require('../../lib/creative-ai/runtime/feature-replanning'),input=fixture(brand),before=JSON.stringify(input),cache=new Map();let calls=0;
 const strategy={status:'ready',brief:{primaryProposition:{text:'Visible surface',factIds:['alternative']}}};
 const decision={optionalFeature:true,visualReferenceMissing:true,reason:'Brief allows a choice; use the visible surface.',factIds:['alternative'],referenceAssetIds:['own-photo']};
 const stage=async(file,fn)=>{if(!cache.has(file))cache.set(file,await fn());return cache.get(file);};
 const options={stage,replan:async()=>{calls++;return {strategy,decision};},concepts:async i=>{assert.equal(i.strategy,strategy);calls++;return {status:'ready',handoff:{recipients:[{agentId:'copywriter',dispatchAllowed:true},{agentId:'art-director',dispatchAllowed:true}]}};}};
 const a=await r.recover(input,blocked,options);await r.recover(input,blocked,options);assert.equal(calls,2);assert.equal(a.directorInput.strategy,strategy);assert.equal(JSON.stringify(input),before);
});
test('required feature, missing own references and invented alternatives cannot be waived',async()=>{
 const r=require('../../lib/creative-ai/runtime/feature-replanning'),i=fixture('one');
 const d={optionalFeature:false,visualReferenceMissing:true,reason:'Explicitly required',factIds:['alternative'],referenceAssetIds:['own-photo']},s={status:'ready',brief:{primaryProposition:{text:'other',factIds:['alternative']}}};
 assert.throws(()=>r.validateDecision({strategy:s,decision:d},i),/required|optional/i);
 assert.throws(()=>r.validateDecision({strategy:s,decision:{...d,optionalFeature:true,referenceAssetIds:['other-brand-photo']}},i),/reference/i);
 assert.throws(()=>r.validateDecision({strategy:s,decision:{...d,optionalFeature:true,factIds:['invented']}},i),/fact|supported/i);
 i.strategyInput.research.assets=[];assert.equal(r.feedback(i,blocked),null);
});
test('unresolved replacement concepts stop after one recovery; no downstream dispatch',async()=>{
 const r=require('../../lib/creative-ai/runtime/feature-replanning'),i=fixture('one');let count=0;
 await assert.rejects(()=>r.recover(i,blocked,{stage:(_,fn)=>fn(),replan:async()=>({strategy:{status:'ready',brief:{primaryProposition:{text:'other',factIds:['alternative']}}},decision:{optionalFeature:true,visualReferenceMissing:true,reason:'Optional',factIds:['alternative'],referenceAssetIds:['own-photo']}}),concepts:async()=>{count++;return blocked;}}),/Concept dependencies/);assert.equal(count,1);
});
test('same-brand but different SKU evidence cannot satisfy the selected SKU recovery',()=>{
 const r=require('../../lib/creative-ai/runtime/feature-replanning'),i=fixture('one');i.strategyInput.research.assets.push({id:'another-sku',kind:'product',imageData:'data:image/png;base64,AA=='});
 const result={strategy:{status:'ready',brief:{primaryProposition:{text:'another',factIds:['alternative']}}},decision:{optionalFeature:true,visualReferenceMissing:true,reason:'Test',factIds:['alternative'],referenceAssetIds:['another-sku']}};
 assert.throws(()=>r.validateDecision(result,i,{assetIds:['own-photo'],factIds:['preferred','alternative']}),/reference/);
 assert.throws(()=>r.validateDecision({...result,decision:{...result.decision,referenceAssetIds:['own-photo']}},i,{assetIds:['own-photo'],factIds:['preferred']}),/supported/);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': recovery decision survives the real strategist wire without altering the brief',async()=>{
 const r=require('../../lib/creative-ai/runtime/feature-replanning'),fixtures=require('../../lib/creative-ai/marketing-strategist/examples/synthetic');
 const input=await fixtures.inputExample();input.research.brandName=brand;const director={strategyInput:input},before=JSON.stringify(input);
 const feedback={questions:[{question:'Missing reference'}],availableProductReferences:[{id:'reference',label:'Actual product surface'}]};
 const decision={optionalFeature:true,visualReferenceMissing:true,reason:'The brief permits a different feature',factIds:['proof'],referenceAssetIds:['reference']};
 const result=await r.replan(director,feedback,{reason:async req=>{
  assert.deepEqual(req.wire.input.featureRecovery,feedback);assert.match(req.wire.instructions,/explicitly required/);
  const projected=require('../../lib/creative-ai/runtime/focused-context').project('strategy',req.wire.input);assert.ok(projected.featureRecovery);
  const out=fixtures.outputExample({includeStrategyChecks:true});
  for(const key of ['audience','buyingSituation']){delete out.brief[key].basis;delete out.brief[key].sourceIds;delete out.brief[key].factIds;}
  for(const key of ['customerBarrier','customerRelevance'])delete out.strategyChecks[key].basis;
  delete out.getWhoToBy;delete out.sourceIds;delete out.brief.positioningFactIds;delete out.strategyChecks.destination.expectedAction;
  out.brief.supportingClaims=out.brief.supportingClaims.map(c=>c.factId);
  out.featureRecoveryDecision=decision;
  const decoded=req.wire.decode(require('../../lib/creative-ai/runtime/strategy-choice').fromRecorded(out));req.validate(decoded);return decoded;
 }},{});
 assert.deepEqual(result.decision,decision);assert.equal(result.strategy.status,'ready');assert.equal(JSON.stringify(input),before);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': replacement passes real director validation and binds both options to the revised strategy',async()=>{
 const fixtures=require('../../lib/creative-ai/creative-director/examples/synthetic'),cd=require('../../lib/creative-ai/creative-director'),agents=require('../../lib/creative-ai/runtime/agents'),r=require('../../lib/creative-ai/runtime/feature-replanning');
 const input=fixtures.inputExample();input.strategyInput.research.brandName=brand;input.strategyInput.assignment.focusType='product';input.strategyInput.research.assets.push({id:'own-photo',kind:'product',label:'Selected bottle',sourceIds:input.strategyInput.research.assets[0].sourceIds,imageData:'data:image/png;base64,AA=='});
 const strategy=structuredClone(input.strategy);strategy.brief.primaryProposition.text='A compact bottle with a visible carrying shape.';strategy.alternatives.find(a=>a.id===strategy.selection.directionId).primaryProposition=structuredClone(strategy.brief.primaryProposition);strategy.getWhoToBy=require('../../lib/creative-ai/marketing-strategist').deriveGetWhoToBy(strategy.brief);
 const failure=structuredClone(blocked);failure.workflow.internalQuestions[0].relatedIds=['capacity'];
 const result=await r.recover(input,failure,{stage:(_,fn)=>fn(),replan:async()=>({strategy,decision:{optionalFeature:true,visualReferenceMissing:true,reason:'Use existing visible form instead of unavailable demonstration.',factIds:['capacity'],referenceAssetIds:['own-photo']}}),concepts:updated=>agents.concepts(updated,{reason:async req=>{const core=fixtures.coreExample(updated);req.validate(core);return core;}},{})});
 assert.equal(result.directorOutput.status,'ready');assert.equal(result.directorOutput.concepts.length,2);assert.notEqual(cd.strategyFingerprint(input),cd.strategyFingerprint(result.directorInput));
 for(const c of result.directorOutput.concepts)assert.equal(c.strategyLinkage.primaryProposition.text,strategy.brief.primaryProposition.text);
});
