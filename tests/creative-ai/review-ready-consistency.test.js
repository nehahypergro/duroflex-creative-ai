'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const reviewer=require('../../lib/creative-ai/creative-reviewer'),fixture=require('../../lib/creative-ai/creative-reviewer/examples/synthetic'),lifecycle=require('../../lib/creative-ai/creative-reviewer/lifecycle'),delivery=require('../../lib/creative-ai/creative-reviewer/delivery'),{fingerprint}=require('../../lib/creative-ai/art-director');
async function example({current=false,missingComparison=false,advisory=false,critical=false}={}){
 const input=await fixture.inputExample({score:95});
 if(current){input.package.blockingPolicyVersion=1;const {packageHash,...body}=input.package;input.package.packageHash=fingerprint(body);input.evidence.packageHash=input.package.packageHash;}
 const finding=fixture.findingExample(input.package,{severity:critical?'critical':advisory?'advisory':'creative',cause:critical?'generated-typo':'art-weak-hierarchy'});
 if(!critical)finding.criterion='visualCraft';if(missingComparison)finding.comparison=finding.comparison.slice(0,1);
 input.evidence.findings=[finding];
 const context=await reviewer.assembleContext(input),report=reviewer.evaluate(context),state=await lifecycle.createState(input.package,input.artifact.imageData);
 assert.equal(reviewer.validateOutput(report,context).valid,true);
 return {input,context,report,state};
}
test('legacy high score cannot approve a targeted creative correction',async()=>{
 const {input,report,state}=await example();assert.equal(report.score,95);assert.equal(report.decision,'revise');assert.equal(report.routing[0].status,'targeted-correction');
 const first=lifecycle.consumeReview(state,report);assert.equal(first.state.delivery,'none');assert.equal(first.plan.corrections.length,1);
 const corrected=await lifecycle.bindCorrection(first.state,input.package,input.artifact.imageData,{authorizationId:first.state.authorizationId}),final=lifecycle.consumeReview(corrected,report);
 const result=await delivery.buildDelivery(final.state,report,input.package,input.artifact);assert.equal(result.ready,false);assert.equal(result.status,'flagged-cap-reached');assert.ok(result.unresolved.length);
});
test('missing comparison requires verification rather than Ready or a paid correction cycle',async()=>{
 const {report,state}=await example({missingComparison:true});assert.equal(report.decision,'unable-to-verify');assert.equal(report.routing[0].status,'focused-diagnostic-required');
 const result=lifecycle.consumeReview(state,report);assert.equal(result.state.delivery,'verification-pending');assert.equal(result.state.correctionCycles,0);assert.equal(result.plan,null);
});
for(const current of [false,true])test((current?'current':'legacy')+' optional suggestions can accompany Ready without unresolved corrections',async()=>{
 const {input,report,state}=await example({current,advisory:!current});assert.equal(report.decision,'ready');assert.equal(report.findings[0].severity,'advisory');assert.equal(report.routing[0].status,'advisory');
 const consumed=lifecycle.consumeReview(state,report),result=await delivery.buildDelivery(consumed.state,report,input.package,input.artifact);assert.equal(result.ready,true);assert.deepEqual(result.unresolved,[]);
});
test('current explicit-blocker policy still blocks a concrete defect at a high score',async()=>{
 const {report}=await example({current:true,critical:true});assert.equal(report.decision,'revise');
});
test('a policy-designated advisory criterion never becomes a required creative correction',async()=>{
 const {context}=await example();context.input.evidence.findings[0].criterion='emotionalAudienceFit';
 const report=reviewer.evaluate(context);assert.equal(report.decision,'ready');assert.equal(report.findings[0].severity,'advisory');assert.equal(report.routing[0].status,'advisory');assert.doesNotThrow(()=>lifecycle.verifyReport(report));
});
test('classified evidence permits missing evidence as null but rejects invalid types without crashing',()=>{
 const {check}=require('../../lib/creative-ai/marketing-strategist/schema-validator'),schema=reviewer.outputSchema.properties.classifiedFindings;
 const row={category:'verification',requirement:null,evidence:null,criterion:'product-identity',scope:{},nextAction:'Verify the affected check'};
 assert.deepEqual(check(schema,[row]),[]);assert.ok(check(schema,[{...row,evidence:42}]).length);
});
for(const conflict of ['finding','correction','diagnosis','dependency'])test('lifecycle and delivery reject rehashed Ready with unresolved '+conflict,async()=>{
 const {input,report,state}=await example({advisory:true});
 if(conflict==='finding')report.findings[0].severity='creative';
 if(conflict==='correction')report.routing[0].status='targeted-correction';
 if(conflict==='diagnosis')report.routing[0].status='focused-diagnostic-required';
 if(conflict==='dependency')report.verificationDependencies.push({criterion:'example',target:'workflow-producer',request:'Verify required evidence'});
 delete report.reviewHash;report.reviewHash=fingerprint(report);
 assert.throws(()=>lifecycle.consumeReview(state,report),/Failed\/unverified/);
 await assert.rejects(delivery.buildDelivery({...state,phase:'terminal',delivery:'ready',initialReportHash:report.reviewHash},report,input.package,input.artifact),/Failed\/unverified/);
});
