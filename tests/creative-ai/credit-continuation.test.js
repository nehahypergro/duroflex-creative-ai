'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const continuation=require('../../lib/creative-ai/runtime/credit-continuation');
const key='a'.repeat(64),auth={id:'credit-retry-fixture',at:'2026-11-05T01:00:00Z',reason:'user-confirmed-credits-added'};
for(const brandId of ['duroflex','sleepyhead'])test(brandId+': confirmed quota failure receives one stable replacement key, original response is preserved',async()=>{
 const job={id:'fixture-'+brandId,intake:{brandId}},saved={version:1,json:{status:'failed',error:{code:'credit_balance_exhausted'}}};
 const original=JSON.stringify(saved),record=continuation.plan(job,[{kind:'reasoning',key,saved}],auth),next=continuation.resolve(record,'reasoning',key);
 assert.notEqual(next,key);assert.equal(next,continuation.resolve(record,'reasoning',key));assert.equal(continuation.resolve(record,'reasoning',next),next);assert.equal(JSON.stringify(saved),original);
 const transport=require('../../lib/creative-ai/runtime/reasoning-transport'),responses=new Map([[key,{version:1,operation:'fixture',attempt:0,json:saved.json}]]);let calls=0;
 const options={operation:'fixture',attempt:0,prepare:async()=>{},budget:{loadResponse:async(k,id)=>responses.get(id),saveResponse:async(k,id,v)=>responses.set(id,v),reserve:async()=>{}},send:async()=>{calls++;return {ok:true,json:async()=>({status:'completed',output:[]})};}};
 assert.equal((await transport({...options,key})).json.status,'failed');assert.equal(calls,0);
 assert.equal((await transport({...options,key:next})).json.status,'completed');assert.equal(calls,1);
 await transport({...options,key:next});assert.equal(calls,1);assert.equal(responses.get(key).json.status,'failed');
});
test('missing, pending, successful and non-quota failures are not automatically retried',()=>{
 for(const saved of [undefined,{json:{status:'queued'}},{json:{status:'completed'}},{json:{data:[{b64_json:'saved'}]}},{json:{status:'failed',error:{code:'server_error'}}}]){
  const p=continuation.plan({id:'fixture'},[{kind:'image',key,saved}],auth);assert.equal(continuation.resolve(p,'image',key),key);
 }
});
test('image rejection requires matching credit block and terminal HTTP failure; timeout stays unresolved',()=>{
 const job={id:'fixture',providerBlock:{code:'PROVIDER_CREDITS_EXHAUSTED',requestKey:key},imageWaits:{[key]:{status:'failed',httpStatus:429}}};
 assert.notEqual(continuation.resolve(continuation.plan(job,[{kind:'image',key}],auth),'image',key),key);
 job.imageWaits[key].status='attention';assert.equal(continuation.resolve(continuation.plan(job,[{kind:'image',key}],auth),'image',key),key);
 assert.throws(()=>continuation.plan(job,[],{}),/authorization/);
});
