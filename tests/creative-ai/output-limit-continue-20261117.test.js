'use strict';
// Regression from the live Sleepyhead batch (17 Nov 2026): a LinkedIn post (Sofa Bae) failed with "The agent response
// was cut off at its output limit"; Continue replayed the saved cut-off answers and failed again within seconds. The
// same project worked locally. User decision (17 Nov 2026): after an explicit Continue, planning asks once more.
// Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),{OpenAIProvider}=require('./offline-provider.cjs');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const schema={type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false};
const response=(text,extra={})=>({id:'synthetic-response',status:'completed',output:[{content:[{type:'output_text',text}]}],...extra});
const cut=()=>response('{"ok":',{status:'incomplete',incomplete_details:{reason:'max_output_tokens'},usage:{output_tokens:25000}});
async function run(responses,{continuations=1,pinned=true,saved=new Map(),contextKind='lean-planning'}={}){
 const original=global.fetch,requests=[];global.fetch=async(url,options)=>{requests.push(JSON.parse(options.body));assert.ok(responses.length,'unexpected provider call');return {ok:true,json:async()=>responses.shift()};};
 try{const provider=new OpenAIProvider({reasoningModel:'explicit-fixture',reasoningTimeoutMs:1000,maxOutputTokens:25000,maxRecoveryOutputTokens:50000});
  const budget={reserve:async()=>{},receipt:async()=>{},loadResponse:async(k,key)=>saved.get(key),saveResponse:async(k,key,v)=>saved.set(key,v),continuations:async()=>continuations,runtimeConfig:async live=>pinned?{...live,outputLimitRetryVersion:1}:{...live}};
  let error=null,out=null;try{out=await provider.reason({contextKind,instructions:'Fixture',input:{},schema},budget);}catch(e){error=e;}return {out,error,requests,saved};}finally{global.fetch=original;}
}
test('new lean jobs pin the Continue retry and the snapshot keeps it',()=>{const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.outputLimitRetryVersion,1);assert.equal(pc.snapshot(c).outputLimitRetryVersion,1);assert.equal(pc.snapshot({}).outputLimitRetryVersion,undefined);});
test('after Continue, a cut-off plan is asked once more with the largest answer length and completes',async()=>{
 const r=await run([cut(),cut(),response('{"ok":true}')]);assert.equal(r.error,null);assert.equal(r.out.ok,true);assert.deepEqual(r.requests.map(x=>x.max_output_tokens),[25000,50000,50000]);
});
test('Continue replays the saved cut-off answers and sends only the one new request',async()=>{
 const first=await run([cut(),cut()],{continuations:0});assert.equal(first.error?.code,'REASONING_OUTPUT_LIMIT');assert.equal(first.requests.length,2);
 const again=await run([response('{"ok":true}')],{continuations:1,saved:first.saved});assert.equal(again.error,null);assert.equal(again.requests.length,1,'the two saved answers are replayed, not resent');
 const third=await run([],{continuations:2,saved:again.saved});assert.equal(third.error,null);assert.equal(third.requests.length,0,'a later Continue replays the saved retry');
});
test('the retry happens once: a cut-off retry fails clearly',async()=>{const r=await run([cut(),cut(),cut()]);assert.equal(r.error?.code,'REASONING_OUTPUT_LIMIT');assert.equal(r.requests.length,3);});
test('without Continue, without the pin, or outside planning nothing extra is sent',async()=>{
 for(const opts of [{continuations:0},{pinned:false},{contextKind:'lean-review'}]){const r=await run([cut(),cut()],opts);assert.equal(r.error?.code,'REASONING_OUTPUT_LIMIT',JSON.stringify(opts));assert.equal(r.requests.length,2);}
});
