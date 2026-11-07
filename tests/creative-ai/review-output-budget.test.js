'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {OpenAIProvider}=require('./offline-provider.cjs');
const row={type:'object',properties:{observation:{type:'string'}},required:['observation'],additionalProperties:false};
function contract(n){return {type:'object',properties:{lockedRuleObservations:{type:'object',properties:Object.fromEntries(Array.from({length:n},(_,i)=>['rule-'+i,row])),required:Array.from({length:n},(_,i)=>'rule-'+i),additionalProperties:false}},required:['lockedRuleObservations'],additionalProperties:false};}
async function run({n=40,effort='medium',override,ceiling=50000,truncated=false,enabled=true}={}){
 const requests=[],receipts=[],p=new OpenAIProvider({reasoningModel:'fixture',maxRecoveryOutputTokens:ceiling,...(override?{roleModels:{review:{model:'fixture',reasoningEffort:override}}}:{})});
 p.sendReasoning=async body=>{requests.push(body);const incomplete=truncated&&requests.length===1;return {ok:true,json:async()=>({id:'fixture-'+requests.length,status:incomplete?'incomplete':'completed',...(incomplete?{incomplete_details:{reason:'max_output_tokens'}}:{}),output:[{content:[{type:'output_text',text:incomplete?'':JSON.stringify({lockedRuleObservations:Object.fromEntries(Array.from({length:n},(_,i)=>['rule-'+i,{observation:'Observed in the supplied pixels.'}]))})}]}],usage:{output_tokens:incomplete?body.max_output_tokens:3500,output_tokens_details:{reasoning_tokens:2500}}})};};
 const out=await p.reason({contextKind:'review',...(enabled?{outputBudgetPolicy:'review-evidence-v1'}:{}),instructions:'Review actual pixels',input:{record:{exactCopy:{fields:[]}}},schema:contract(n),maxOutputTokens:10000,reasoningEffort:effort},{reserve:async()=>{},receipt:async r=>receipts.push(r)});
 return {out,requests,receipts};
}
test('large review reserves JSON space plus reasoning instead of the fixed 10k total',async()=>{const r=await run();assert.ok(r.requests[0].max_output_tokens>10000);assert.equal(Object.keys(r.out.lockedRuleObservations).length,40);assert.equal(r.requests[0].reasoning.effort,'medium');assert.ok(r.receipts[0].optimisation.outputBudget.reasoningHeadroomTokens>0);});
test('effective routed reasoning effort determines headroom',async()=>{const low=await run({effort:'low'}),medium=await run({effort:'low',override:'medium'});assert.ok(medium.requests[0].max_output_tokens>low.requests[0].max_output_tokens);assert.equal(medium.receipts[0].optimisation.outputBudget.reasoningEffort,'medium');});
test('review truncation gets only one larger correction, retaining review reasoning effort',async()=>{const r=await run({truncated:true});assert.equal(r.requests.length,2);assert.ok(r.requests[1].max_output_tokens>r.requests[0].max_output_tokens);assert.ok(r.requests[1].max_output_tokens<=50000);assert.deepEqual(r.requests.map(r=>r.reasoning.effort),['medium','medium']);assert.equal(r.receipts[1].requestIntent.reason,'output-limit');});
test('configured ceiling remains binding and a shortfall is recorded',async()=>{const r=await run({ceiling:12000,n:100});assert.equal(r.requests[0].max_output_tokens,12000);assert.equal(r.receipts[0].optimisation.outputBudget.capped,true);});
test('unrelated requests retain their explicit output limit',async()=>{const r=await run({enabled:false});assert.equal(r.requests[0].max_output_tokens,10000);assert.equal(r.receipts[0].optimisation.outputBudget,undefined);});
test('every fixed evidence group and multilingual locked copy contributes without mutating the contract',()=>{
 const {plan}=require('../../lib/creative-ai/runtime/review-output-budget'),names=['lockedRuleObservations','critical','quality','copyObservations','readabilityObservations','layoutMeasurements','placementObservations','productObservations','logoPresentation'];
 const schema={type:'object',properties:Object.fromEntries(names.map(name=>[name,{type:'object',properties:{one:row}}]))},before=structuredClone(schema),bounds={initial:10000,recovery:50000,timeout:1000};
 const a=plan({schema,reasoningEffort:'medium',bounds}),b=plan({schema,reasoningEffort:'medium',bounds,record:{exactCopy:{fields:[{delivery:'embedded',locked:true,text:'आराम '.repeat(2000)}]}}});
 assert.deepEqual(Object.keys(a.metrics.groups),names);assert.ok(b.bounds.initial>a.bounds.initial);assert.deepEqual(schema,before);assert.deepEqual(bounds,{initial:10000,recovery:50000,timeout:1000});
});
test('actual review entry point enables budgeting on the complete fixed-key evidence contract',async()=>{
 const fs=require('fs/promises'),os=require('os'),path=require('path'),snapshots=require('../../lib/creative-ai/runtime/review-ocr-snapshot'),references=require('../../lib/creative-ai/runtime/product-review-images');
 const fixture=await require('../../lib/creative-ai/creative-reviewer/examples/synthetic').inputExample(),dir=await fs.mkdtemp(path.join(os.tmpdir(),'review-output-budget-')),oldLoad=snapshots.load,oldBuild=references.build,stop=Error('Request captured');let request;
 snapshots.load=async()=>({status:'unavailable',rows:[]});references.build=async()=>({images:[],references:[],instructions:''});
 try{
  await fs.writeFile(path.join(dir,'placement-catalog.json'),'{}');
  await assert.rejects(require('../../lib/creative-ai/runtime/review').review(fixture.package,fixture.artifact.imageData,{dir,attempt:0,budget:{},provider:{reason:async r=>{request=r;throw stop;}}}),e=>e===stop);
  assert.equal(request.outputBudgetPolicy,'review-evidence-v1');
  assert.deepEqual(Object.keys(request.wire.schema.properties.lockedRuleObservations.properties),fixture.package.lockedRules.map(r=>r.id));
  assert.ok(request.validate,'Authoritative validation must remain in place');
 }finally{snapshots.load=oldLoad;references.build=oldBuild;await fs.rm(dir,{recursive:true,force:true});}
});
