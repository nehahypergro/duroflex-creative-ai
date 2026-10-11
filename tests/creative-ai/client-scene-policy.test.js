'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {marker,fromMemory}=require('../../lib/creative-ai/runtime/client-scene-policy');
const {BrandScopedProvider}=require('../../lib/creative-ai/runtime/brand-isolation');
const preference={id:'preference-scene',brandId:'brand-a',scope:'brand',active:true,text:marker+' Coherent lighting; real wall negative space.',provenance:{kind:'named-brand-training'}};
const memory={brandId:'brand-a',revision:3,preferences:[preference]},scope={brandId:'brand-a',brandUrl:'https://a.example/',documentIds:[],revision:'source-r'};
test('scene policy activates only explicitly named, active, same-brand training; old and stored-only feedback cannot activate it',()=>{
 assert.equal(fromMemory(null),null);assert.equal(fromMemory({...memory,preferences:[]}),null);
 for(const change of [{brandId:'brand-b'},{active:false},{scope:'product'},{text:'Prefer warm rooms.'},{provenance:{kind:'image-feedback'}}])assert.equal(fromMemory({...memory,preferences:[{...preference,...change}]}),null);
 const policy=fromMemory(memory);assert.deepEqual(policy.preferenceIds,['preference-scene']);assert.equal(policy.brandId,'brand-a');assert.equal(policy.authority,'client-production-direction');
});
test('actual artwork review receives pinned scene requirements while fact research stays free of preferences',async()=>{
 let got;const provider=new BrandScopedProvider({reason:async r=>{got=r;return 'ok';}},{}),budget={brandContext:async()=>({intake:{brandId:'brand-a',brandUrl:scope.brandUrl,brandKnowledge:scope},preferenceMemory:memory})};
 await provider.reason({sceneReview:true,instructions:'Review actual pixels',input:{}},budget);
 assert.equal(got.input.clientScenePolicy.memoryRevision,3);assert.match(got.instructions,/contact\/cast shadows/);assert.match(got.instructions,/anatomically plausible/);assert.match(got.instructions,/white\/blank patches/);assert.match(got.instructions,/reference-boundary critical check/);assert.match(got.instructions,/Genuine pale walls/);assert.equal(got.input.clientPreferenceMemory,undefined);
 await provider.reason({instructions:'Extract product facts',input:{}},budget);assert.equal(got.input.clientScenePolicy,undefined);assert.doesNotMatch(got.instructions,/CLIENT SCENE EXECUTION REVIEW/);
 await provider.reason({sceneReview:true,instructions:'Review old pixels',input:{}},{brandContext:async()=>({intake:{brandId:'brand-a',brandUrl:scope.brandUrl,brandKnowledge:scope},preferenceMemory:{...memory,revision:2,preferences:[]}})});assert.equal(got.input.clientScenePolicy,undefined);
});
test('scene review rejects another brand memory and consumes the pinned job revision rather than live training',async()=>{
 const provider=new BrandScopedProvider({reason:async()=>{}},{});
 await assert.rejects(provider.reason({sceneReview:true,instructions:'Review',input:{}},{brandContext:async()=>({intake:{brandId:'brand-a',brandUrl:scope.brandUrl,brandKnowledge:scope},preferenceMemory:{...memory,brandId:'brand-b'}})}),/different brand/);
 const pinned=structuredClone(memory);memory.preferences.push({...preference,id:'new-live'});assert.equal(fromMemory(pinned).preferenceIds.length,1);memory.preferences.pop();
});
test('observed scene-boundary failure blocks a high aggregate score and retains the single correction cycle',async()=>{
 const reviewer=require('../../lib/creative-ai/creative-reviewer'),fixture=require('../../lib/creative-ai/creative-reviewer/examples/synthetic'),lifecycle=require('../../lib/creative-ai/creative-reviewer/lifecycle');
 const input=await fixture.inputExample({score:95});const boundary=input.evidence.critical.find(c=>c.criterion==='reference-boundary');boundary.status='fail';boundary.evidence.observation='Synthetic test: added opaque white patch behind copy violates the client scene direction.';
 const report=reviewer.evaluate(await reviewer.assembleContext(input));assert.equal(report.decision,'revise');assert.equal(report.score,95);
 let state=lifecycle.consumeReview(await lifecycle.createState(input.package,input.artifact.imageData),report).state;assert.equal(state.correctionCycles,1);state=await lifecycle.bindCorrection(state,input.package,input.artifact.imageData,{authorizationId:state.authorizationId});state=lifecycle.consumeReview(state,report).state;assert.equal(state.delivery,'flagged-cap-reached');assert.equal(state.correctionCycles,1);
});
