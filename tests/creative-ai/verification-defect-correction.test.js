'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const reviewer=require('../../lib/creative-ai/creative-reviewer'),fixture=require('../../lib/creative-ai/creative-reviewer/examples/synthetic'),life=require('../../lib/creative-ai/creative-reviewer/lifecycle'),{buildDelivery}=require('../../lib/creative-ai/creative-reviewer/delivery'),{fingerprint}=require('../../lib/creative-ai/art-director');
async function example({pending=false,defect=false,unknown=false,current=true,legacyDecision=false}={}){
 const input=await fixture.inputExample({pending,criticalFailure:defect});
 if(current){input.package.blockingPolicyVersion=1;delete input.package.packageHash;input.package.packageHash=fingerprint(input.package);input.evidence.packageHash=input.package.packageHash;}
 if(unknown){const row=input.evidence.critical.find(c=>c.criterion==='required-text-legibility');row.status='unknown';row.confidence=0;}
 if(defect)input.evidence.findings=[fixture.findingExample(input.package)];
 const report=reviewer.evaluate(await reviewer.assembleContext(input));
 if(legacyDecision){report.decision='unable-to-verify';delete report.reviewHash;report.reviewHash=fingerprint(report);}
 return {input,report};
}
for(const current of [false,true])test('mixed known defect and unknown check uses the single cycle: '+(current?'current':'historical decision'),async()=>{
 const {input,report}=await example({defect:true,unknown:true,current,legacyDecision:!current});
 const result=life.consumeReview(await life.createState(input.package,input.artifact.imageData),report);
 assert.equal(result.state.phase,'correction-planned');assert.equal(result.state.correctionCycles,1);assert.equal(result.plan.corrections.length,1);assert.ok(result.plan.verificationDependencies.some(d=>d.criterion==='required-text-legibility'));
});
test('verification can authorize unused correction; final review and delivery use the new verdict',async()=>{
 const {input,report:pending}=await example({pending:true}),{report:failed}=await example({defect:true,unknown:true}),{report:ready}=await example();
 let state=life.consumeReview(await life.createState(input.package,input.artifact.imageData),pending,{technicalFailure:true}).state;
 const original=structuredClone(state);state=life.consumeVerification(life.reserveVerification(state,pending),failed);
 assert.equal(state.phase,'correction-planned');assert.equal(state.delivery,'none');assert.equal(state.correctionCycles,1);assert.equal(state.initialReportHash,original.initialReportHash);
 assert.throws(()=>life.consumeVerification(state,failed),/not reserved/);
 state=await life.bindCorrection(state,input.package,input.artifact.imageData,{authorizationId:state.authorizationId});
 state=life.consumeReview(state,ready).state;assert.equal(state.delivery,'ready');
 assert.equal((await buildDelivery(state,ready,input.package,input.artifact)).ready,true);
 assert.equal(require('../../lib/creative-ai/workflow-producer').reviewLinkFor(state).reviewHash,ready.reviewHash);
 assert.equal(state.verificationRecovery.reportHash,failed.reviewHash,'keep the intermediate failure for audit');
});
test('unknown evidence alone never reserves a creative correction',async()=>{
 const {input,report:pending}=await example({pending:true}),{report:unknown}=await example({unknown:true});
 const first=life.consumeReview(await life.createState(input.package,input.artifact.imageData),pending,{technicalFailure:true}).state;
 const recovered=life.consumeVerification(life.reserveVerification(first,pending),unknown);
 assert.equal(recovered.delivery,'verification-pending');assert.equal(recovered.correctionCycles,0);
});
test('verification after an exhausted correction cannot authorize another cycle',async()=>{
 const {input,report:failed}=await example({defect:true}),{report:pending}=await example({pending:true});
 let state=life.consumeReview(await life.createState(input.package,input.artifact.imageData),failed).state;
 state=await life.bindCorrection(state,input.package,input.artifact.imageData,{authorizationId:state.authorizationId});state=life.consumeReview(state,pending,{technicalFailure:true}).state;
 state=life.consumeVerification(life.reserveVerification(state,pending),failed);
 assert.equal(state.phase,'terminal');assert.equal(state.delivery,'flagged-cap-reached');assert.equal(state.correctionCycles,1);
 assert.equal((await buildDelivery(state,failed,input.package,input.artifact)).ready,false);
});

async function runtimeFixture(t,brand){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'verified-correction-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),{JobStore}=require('../../lib/creative-ai/runtime/store');
 const runtime=Object.create(CreativeRuntime.prototype);runtime.store=new JobStore(path.join(root,'jobs'));runtime.reviews=new life.ReviewLedger(path.join(root,'reviews'));
 const input=(await example()).input,record=input.package;
 record.assignmentDemo=false;record.upstreamContext.strategyInput.research.demo=false;
 for(const f of record.upstreamContext.strategyInput.research.findings)f.basis='inference';
 record.conceptHash=require('../../lib/creative-ai/creative-director').conceptFingerprint({assignmentId:record.assignmentId,strategy:record.upstreamContext.strategy,strategyInput:record.upstreamContext.strategyInput},record.upstreamContext.concept);
 delete record.packageHash;record.packageHash=fingerprint(record);
 const makeReport=async({pending=false,defect=false,unknown=false,imageData=input.artifact.imageData}={})=>{
  const r=structuredClone(input);r.package=record;r.artifact={origin:imageData==='missing'?'missing':'generated',imageData};
  r.evidence.mode=pending?'pending':'runtime-attestation';r.evidence.packageHash=record.packageHash;
  r.evidence.artifactHash=imageData==='missing'?'missing':(await require('../../lib/creative-ai/graphic-designer/results').inspectArtifact(imageData)).artifactHash;
  if(pending){r.evidence.critical=[];r.evidence.quality=[];r.evidence.findings=[];}
  else {for(const row of [...r.evidence.critical,...r.evidence.quality])row.evidence.method='vision-attestation';
   if(defect){r.evidence.critical.find(c=>c.criterion==='exact-required-copy').status='fail';const f=fixture.findingExample(record);f.evidence.method='vision-attestation';r.evidence.findings=[f];}
   if(unknown){const row=r.evidence.critical.find(c=>c.criterion==='required-text-legibility');row.status='unknown';row.confidence=0;}
  }
  return reviewer.evaluate(await reviewer.assembleContext(r));
 };
 const pending=await makeReport({pending:true}),failed=await makeReport({defect:true,unknown:true});
 const config={maxReasoningCalls:40,jobTimeoutMs:600000,estimatedSpend:{maxUsd:100,reasoningUsd:1,imageUsd:2}};
 const job=await runtime.store.create({brandId:"brand-"+brand.toLowerCase(),brandUrl:'https://example.com'},config,[{id:record.placementId}]);
 const id=job.id,scope={conceptId:record.conceptId,route:record.route,placementId:record.placementId},prefix=record.route+'-'+record.placementId,name='static-'+prefix+'-0.png';
 await runtime.store.save(id,'placement-catalog.json',require('../../lib/creative-ai/placement-knowledge').loadCatalog());
 for(const [file,data]of Object.entries({['package-'+prefix+'-0.json']:record,['review-'+prefix+'-0.json']:pending,['review-error-'+prefix+'-0.json']:{error:'fetch failed'},[name]:Buffer.from(input.artifact.imageData.split(',')[1],'base64')}))await runtime.store.save(id,file,data);
 let state=await runtime.reviews.start(record,input.artifact.imageData);state=await runtime.reviews.review(state.unitKey,pending,{technicalFailure:true});
 const originalResult={...scope,ready:false,status:'verification-pending',imageUrl:'/creative-ai/api/jobs/'+id+'/files/'+name,reviewUrl:'/files/review-'+prefix+'-0.json'};
 await runtime.store.save(id,'delivery-'+prefix+'.json',originalResult);
 const sibling={conceptId:'other-concept',route:'continuity',placementId:'other-placement',ready:true,imageUrl:'/files/other.png'};
 await runtime.store.update(id,j=>{j.results=[originalResult,sibling];return j;});
 runtime.artifact=async(id,name,kind,value)=>{await runtime.store.save(id,name,value);return name.replace(/\./g,'-');};runtime.reviewerEvent=async()=>{};
 runtime.finishCarousels=async()=>{};runtime.finishPdp=async()=>{};runtime.readCarouselPlan=async()=>null;
 const stats={planning:0,generation:0,verification:0,finalReview:0},corrected='data:image/png;base64,'+(await require('sharp')({create:{width:record.canvas.width,height:record.canvas.height,channels:3,background:'#abcdef'}}).png().toBuffer()).toString('base64');
 runtime.correctionPackage=async(id,old,plan,budget)=>{stats.planning++;assert.equal(plan.corrections.length,1);assert.ok(plan.verificationDependencies.length);await budget.reserve('reasoning','c'.repeat(64));return old;};
 runtime.generateImage=async(id,record,budget,scope,attempt)=>{assert.equal(attempt,1);const name='static-'+prefix+'-1.png';try{await fs.access(path.join(runtime.store.dir(id),name));}catch{await budget.reserve('image','d'.repeat(64));stats.generation++;await runtime.store.save(id,name,Buffer.from(corrected.split(',')[1],'base64'));}return {imageData:corrected,name,ref:name.replace(/\./g,'-')};};
 runtime.inspect=async(id,record,image,budget,scope,attempt)=>{let report;if(attempt==='recovery'){stats.verification++;await budget.reserve('reasoning','b'.repeat(64));report=failed;}else{stats.finalReview++;report=await makeReport({pending:image.imageData==='missing',imageData:image.imageData});}await runtime.store.save(id,'review-'+prefix+'-'+attempt+'.json',report);return report;};
 return {runtime,id,scope,prefix,state,pending,failed,input,record,stats,sibling,originalResult,makeReport};
}
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': retry endpoint corrects only the affected asset and is idempotent',async t=>{
 const c=await runtimeFixture(t,brand),{runtime,id,scope,prefix}=c,originalFiles=['review-'+prefix+'-0.json','static-'+prefix+'-0.png','delivery-'+prefix+'.json'];
 const originals=await Promise.all(originalFiles.map(f=>fs.readFile(path.join(runtime.store.dir(id),f))));
 const result=await runtime.retryChecks(id,scope);assert.equal(result.ready,true);assert.equal(result.correctionCycles,1);assert.equal(result.verificationRecovered,true);assert.match(result.imageUrl,/-1.png$/);assert.match(result.reviewUrl,/-1.json$/);
 const job=await runtime.store.read(id);assert.deepEqual(job.results.find(r=>r.placementId==='other-placement'),c.sibling);assert.equal(job.budget.imageCalls,1);assert.equal(job.budget.reasoningCalls,2);assert.equal(job.budget.estimatedSpend.reservedUsd,4);
 assert.deepEqual(await runtime.retryChecks(id,scope),result);assert.deepEqual(c.stats,{planning:1,generation:1,verification:1,finalReview:1});
 assert.deepEqual(await Promise.all(originalFiles.map(f=>fs.readFile(path.join(runtime.store.dir(id),f)))),originals);
});
test('restart after corrected pixels were saved resumes without another image reservation',async t=>{
 const c=await runtimeFixture(t,'Duroflex'),bind=c.runtime.reviews.correction.bind(c.runtime.reviews);let interrupted=false;
 c.runtime.reviews.correction=async(...args)=>{if(!interrupted){interrupted=true;throw Error('Fixture process interruption after saved image');}return bind(...args);};
 await assert.rejects(c.runtime.retryChecks(c.id,c.scope),/process interruption/);
 const result=await c.runtime.retryChecks(c.id,c.scope);assert.equal(result.ready,true);assert.deepEqual(c.stats,{planning:1,generation:1,verification:1,finalReview:1});assert.equal((await c.runtime.store.read(c.id)).budget.imageCalls,1);
});
test('correction cannot bypass the original campaign spend limit through verification allowance',async t=>{
 const c=await runtimeFixture(t,'Sleepyhead');await c.runtime.store.update(c.id,j=>{j.budget.estimatedSpend.maxUsd=1;return j;});
 const result=await c.runtime.retryChecks(c.id,c.scope);assert.equal(result.ready,false);assert.equal(result.status,'flagged-cap-reached');assert.match(result.error,/spend reservation limit/);assert.match(result.imageUrl,/-0.png$/);assert.equal(c.stats.generation,0);
 assert.equal((await c.runtime.store.read(c.id)).budget.imageCalls,0);
});
test('saved-response-only recovery records the plan without any paid correction dispatch',async t=>{
 const c=await runtimeFixture(t,'Duroflex'),{runtime,id,state,pending,failed,record,scope,prefix}=c;
 await runtime.store.save(id,'review-'+prefix+'-recovery.json',failed);await runtime.reviews.reserveVerification(state.unitKey,pending);await runtime.reviews.verification(state.unitKey,failed);
 const deferred=await runtime.continueVerifiedCorrection(id,record,{execute:false});assert.equal(deferred.correctionPending,true);assert.equal(deferred.ready,false);assert.equal(deferred.verificationRetryAvailable,false);assert.deepEqual(c.stats,{planning:0,generation:0,verification:0,finalReview:0});assert.equal((await runtime.store.read(id)).budget.imageCalls,0);
 const result=await runtime.retryChecks(id,scope);assert.equal(result.ready,true);assert.equal(c.stats.verification,0);assert.equal(c.stats.generation,1);
});
test('unresolved final evidence remains unapproved after the recovered correction',async t=>{
 const c=await runtimeFixture(t,'Sleepyhead'),inspect=c.runtime.inspect;
 c.runtime.inspect=async(id,record,image,budget,scope,attempt,...rest)=>{if(attempt!==1)return inspect(id,record,image,budget,scope,attempt,...rest);const report=await c.makeReport({unknown:true,imageData:image.imageData});await c.runtime.store.save(id,'review-'+c.prefix+'-1.json',report);return report;};
 const result=await c.runtime.retryChecks(c.id,c.scope);assert.equal(result.ready,false);assert.equal(result.status,'flagged-cap-reached');assert.ok(result.unresolved.some(r=>r.criterion==='required-text-legibility'));assert.equal(result.correctionCycles,1);
 await c.runtime.retryChecks(c.id,c.scope);assert.equal(c.stats.generation,1);
});
