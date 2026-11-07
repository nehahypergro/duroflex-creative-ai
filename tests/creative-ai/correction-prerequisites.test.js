'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('../../lib/creative-ai/creative-reviewer/examples/synthetic'),reviewer=require('../../lib/creative-ai/creative-reviewer'),life=require('../../lib/creative-ai/creative-reviewer/lifecycle'),routing=require('../../lib/creative-ai/creative-reviewer/routing'),{fingerprint}=require('../../lib/creative-ai/art-director');
async function example(cause,{mixed=false,current=true}={}){
 const input=await fixture.inputExample({criticalFailure:mixed});
 if(current){input.package.blockingPolicyVersion=1;delete input.package.packageHash;input.package.packageHash=fingerprint(input.package);input.evidence.packageHash=input.package.packageHash;}
 const finding=fixture.findingExample(input.package,{cause});finding.id='missing-prerequisite';finding.criterion=cause==='source-logo-wrong'?'logo-identity':'verified-upload-constraints';input.evidence.findings=[finding];
 if(mixed)input.evidence.findings.push({...fixture.findingExample(input.package),id:'known-typo'});
 const report=reviewer.evaluate(await reviewer.assembleContext(input)),state=await life.createState(input.package,input.artifact.imageData);return {input,report,state};
}
for(const cause of ['placement-spec-missing','source-logo-wrong']){
 test(cause+' waits for a verified input without reserving the artwork correction',async()=>{
  const {report,state}=await example(cause);assert.notEqual(report.decision,'ready');assert.equal(report.routing[0].status,'focused-diagnostic-required');assert.deepEqual(report.routing[0].downstream,[]);
  const result=life.consumeReview(state,report);assert.equal(result.state.phase,'terminal');assert.equal(result.state.delivery,'verification-pending');assert.equal(result.state.correctionCycles,0);assert.equal(result.plan,null);assert.ok(report.verificationDependencies.length);
 });
 test(cause+' also prevents a mixed correction from dispatching with an unresolved prerequisite',async()=>{
  const {report,state}=await example(cause,{mixed:true});assert.ok(report.routing.some(r=>r.status==='targeted-correction'));
  const result=life.consumeReview(state,report);assert.equal(result.state.correctionCycles,0);assert.equal(result.state.delivery,'verification-pending');
 });
 test(cause+' in a saved older targeted route is stopped before any source or paid operation',async()=>{
  const {report,state,input}=await example(cause,{current:false});
  report.routing[0]={...report.routing[0],status:'targeted-correction',downstream:['graphic-designer','creative-reviewer']};delete report.reviewHash;report.reviewHash=fingerprint(report);
  assert.equal(life.consumeReview(state,report).state.correctionCycles,0);
  const original=structuredClone(input.package),{CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');let reads=0;
  const runtime={store:{read:()=>{reads++;throw Error('Must not read planning or collect sources');}}};
  await assert.rejects(CreativeRuntime.prototype.correctionPackage.call(runtime,'fixture',original,{cycle:1,maxCorrectionCycles:1,authorizationId:'fixture',corrections:[report.routing[0]]},{},{}),e=>e.code==='CORRECTION_INPUT_REQUIRED');assert.equal(reads,0);assert.deepEqual(original,input.package);
 });
}
test('rendered logo distortion still has an executable image-correction route',async()=>{
 const {input,state}=await example('source-logo-wrong');input.evidence.findings=[fixture.findingExample(input.package,{cause:'logo-render-distorted'})];
 const report=reviewer.evaluate(await reviewer.assembleContext(input)),result=life.consumeReview(state,report);assert.equal(result.state.correctionCycles,1);assert.equal(result.plan.corrections[0].owner,'graphic-designer');
});
test('an advisory source suggestion cannot block an independently confirmed typo',async()=>{
 const {input,state}=await example('source-logo-wrong',{mixed:true});input.evidence.findings[0].severity='advisory';
 const report=reviewer.evaluate(await reviewer.assembleContext(input));assert.equal(life.consumeReview(state,report).state.phase,'correction-planned');
});
test('verification cannot spend a cycle while its confirmed source prerequisite is unresolved',async()=>{
 const {input,report,state}=await example('source-logo-wrong'),pending=structuredClone(input);pending.evidence={mode:'pending',packageHash:input.package.packageHash,artifactHash:report.artifactHash,critical:[],quality:[],findings:[]};
 const unavailable=reviewer.evaluate(await reviewer.assembleContext(pending)),first=life.consumeReview(state,unavailable,{technicalFailure:true}).state;
 const recovered=life.consumeVerification(life.reserveVerification(first,unavailable),report);assert.equal(recovered.correctionCycles,0);assert.equal(recovered.delivery,'verification-pending');
});
