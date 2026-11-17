'use strict';
// Regression from the live Sleepyhead batch (17 Nov 2026): product page images (Sofa Bubbles 3 Seater) failed with
// "The agent response exceeded its per-call time limit and its cancellation could not be confirmed", and failed the
// same way on Continue. A response that finished after the Studio stopped waiting cannot be cancelled; the Studio read
// the refused cancel as "unconfirmed" instead of reading the finished answer. Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),transport=require('../../lib/creative-ai/runtime/reasoning-transport');
const json=v=>({ok:true,json:async()=>v}),refused={ok:false,status:400,json:async()=>({error:{code:'invalid_request'}})};
const done={id:'resp_abc',status:'completed',output:[{content:[{type:'output_text',text:'{"ok":true}'}]}]};
function store(entries=[]){const saved=new Map(entries),waits=[];return {saved,waits,budget:{reserve:async()=>{},loadResponse:async(k,key)=>saved.get(key),saveResponse:async(k,key,v)=>saved.set(key,v),waiting:async w=>waits.push(w),remainingMs:async()=>600000}};}

test('Continue reads an answer that finished after the Studio stopped waiting, without cancelling or resending',async()=>{
 const key='e'.repeat(64),s=store([[key,{version:1,operation:'plan',attempt:0,json:{id:'resp_abc',status:'in_progress'},dispatchedAt:Date.now()-30*60e3}]]);let cancels=0,sends=0;
 const out=await transport({key,operation:'plan',attempt:0,budget:s.budget,durablePending:true,callTimeLimitMs:240000,prepare:async()=>{},send:async()=>{sends++;return json(done);},retrieve:async()=>json(done),cancel:async()=>{cancels++;return refused;},sleep:async()=>{}});
 assert.equal(out.json.status,'completed');assert.equal(cancels,0);assert.equal(sends,0);assert.equal(s.saved.get(key).json.status,'completed');
});
test('at the call limit, a refused cancel of an answer that just finished uses the finished answer',async()=>{
 const s=store();let t=0,retrieves=0;
 const out=await transport({key:'f'.repeat(64),operation:'plan',attempt:0,budget:s.budget,durablePending:true,callTimeLimitMs:1000,now:()=>t,prepare:async()=>{},send:async()=>json({id:'resp_abc',status:'in_progress'}),retrieve:async()=>{retrieves++;t+=2000;return json(retrieves<2?{id:'resp_abc',status:'in_progress'}:done);},cancel:async()=>refused,sleep:async()=>{t+=500;}});
 assert.equal(out.json.status,'completed');
});
test('a still-running answer whose cancel is refused stays a clear pending failure (nothing resent)',async()=>{
 const s=store();let t=0,sends=0;
 await assert.rejects(transport({key:'0'.repeat(64),operation:'plan',attempt:0,budget:s.budget,durablePending:true,callTimeLimitMs:1000,now:()=>t,prepare:async()=>{},send:async()=>{sends++;return json({id:'resp_abc',status:'in_progress'});},retrieve:async()=>{t+=2000;return json({id:'resp_abc',status:'in_progress'});},cancel:async()=>refused,sleep:async()=>{t+=500;}}),e=>e.code==='REASONING_PENDING');
 assert.equal(sends,1);
});
