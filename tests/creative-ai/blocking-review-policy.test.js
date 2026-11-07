'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const reviewer=require('../../lib/creative-ai/creative-reviewer'),fixture=require('../../lib/creative-ai/creative-reviewer/examples/synthetic'),{fingerprint}=require('../../lib/creative-ai/art-director');
function bind(input){const {packageHash,...body}=input.package;input.package.packageHash=fingerprint(body);input.evidence.packageHash=input.package.packageHash;}
test('new policy never rejects artwork on subjective score alone; historical policy stays unchanged',async()=>{
 const input=await fixture.inputExample({score:40});assert.equal(reviewer.evaluate(await reviewer.assembleContext(input)).decision,'revise');
 input.package.blockingPolicyVersion=1;bind(input);const context=await reviewer.assembleContext(input),result=reviewer.evaluate(context);assert.equal(result.decision,'ready');assert.ok(result.score<75);assert.equal(reviewer.validateOutput(result,context).valid,true);
 const lifecycle=require('../../lib/creative-ai/creative-reviewer/lifecycle'),state=await lifecycle.createState(input.package,input.artifact.imageData),consumed=lifecycle.consumeReview(state,result);
 const delivery=await require('../../lib/creative-ai/creative-reviewer/delivery').buildDelivery(consumed.state,result,input.package,input.artifact);assert.equal(delivery.ready,true);
 const legacy=structuredClone(state);delete legacy.blockingPolicyVersion;assert.throws(()=>lifecycle.consumeReview(legacy,result),/blocking policy/);
});
test('new policy still rejects an actual critical defect at any creative score',async()=>{const input=await fixture.inputExample({score:95,criticalFailure:true});input.package.blockingPolicyVersion=1;bind(input);assert.equal(reviewer.evaluate(await reviewer.assembleContext(input)).decision,'revise');});
test('missing subjective quality observations cannot hold delivery when critical checks pass',async()=>{const input=await fixture.inputExample();input.package.blockingPolicyVersion=1;input.evidence.quality=[];bind(input);const r=reviewer.evaluate(await reviewer.assembleContext(input));assert.equal(r.decision,'ready');assert.equal(r.qualityVerified,false);assert.ok(!r.verificationDependencies.some(d=>d.criterion==='creative-quality'));});
test('runtime print metadata passes review schema without dropping it or claiming printer approval',async()=>{
 const input=await fixture.inputExample(),print=require('../../lib/creative-ai/runtime/print-production');
 const spec=print.specFor({print:{trimWidthMm:600,trimHeightMm:900,bleedMm:3,safeMm:5,proofPpi:150,requiredPpi:300,fold:'none',panelWidthsMm:[],keepoutTopMm:0,keepoutBottomMm:0}});
 input.package=print.decorate(input.package,{description:{name:'Board',print:spec,printSet:{id:'board',name:'Board',count:1,index:1,label:'Artwork'}}});bind(input);
 const ctx=await reviewer.assembleContext(input);assert.equal(ctx.input.package.printProduction.printerAccepted,false);
 input.package.printProduction.printerAccepted=true;bind(input);await assert.rejects(()=>reviewer.assembleContext(input),/print|Print/);
});
