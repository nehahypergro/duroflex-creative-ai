'use strict';
// Regression (25 Nov 2026, local picture test, job creative-e51b694a, Neha: "Yes, fix them"). The WhatsApp design's main
// planner was still answering when the job's 45-minute processing window ended, so the Studio cancelled it (cancel
// confirmed, saved with reason "processing-window-ended"). Every "Resume interrupted work" (a new window) replayed that
// saved cancelled answer and failed in about 3 s with "The provider could not complete this agent response", while the free
// recovery check kept offering Resume. The 8 Nov rule let an explicit Continue start a fresh request pair only after
// confirmed call-limit cancellations; a confirmed stop at the end of the window now ends its pair the same way.
// Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const transport=require('../../lib/creative-ai/runtime/reasoning-transport'),{fingerprint}=require('../../lib/creative-ai/art-director'),{JobStore}=require('../../lib/creative-ai/runtime/store');
const done={id:'resp_resumed',status:'completed',output:[{content:[{type:'output_text',text:'{"ok":true}'}]}]};
const windowStop=id=>({version:1,operation:'plan',attempt:0,json:{id,status:'cancelled',output:[]},dispatchedAt:Date.now()-8*60e3,cancellation:{reason:'processing-window-ended',at:new Date().toISOString()}});
function memory(entries=[]){const saved=new Map(entries),reserved=[];return {saved,reserved,budget:{reserve:async(k,key)=>reserved.push(key),loadResponse:async(k,key)=>saved.get(key),saveResponse:async(k,key,v)=>saved.set(key,v),waiting:async()=>{},remainingMs:async()=>40*60e3}};}
function args(budget,extra={}){const calls={sends:0,replacements:[]};return {calls,args:{key:'7'.repeat(64),operation:'plan',attempt:0,budget,durablePending:true,callTimeLimitMs:600000,prepare:async()=>{},send:async()=>{calls.sends++;return {ok:true,json:async()=>done};},retrieve:async id=>({ok:true,json:async()=>({id,status:'cancelled',output:[]})}),cancel:async()=>({ok:true,json:async()=>({})}),prepareReplacement:async({reason})=>calls.replacements.push(reason),sleep:async()=>{},...extra}};}

test('an explicit Resume after a confirmed stop at the end of the window sends the planner once more, to the main model',async()=>{
 const m=memory([['7'.repeat(64),windowStop('resp_window')]]),{calls,args:a}=args(m.budget);
 // Automatic replay (no explicit continuation) still sends nothing: the saved stop is the outcome.
 const replay=await transport(a);assert.equal(replay.json.status,'cancelled');assert.equal(calls.sends,0);
 // The explicit Resume (continuation 1) starts the next pair with its own key; the main model gets its full wait.
 const out=await transport({...a,continuation:1});
 assert.equal(out.json.id,'resp_resumed');assert.equal(calls.sends,1);assert.deepEqual(calls.replacements,[],'not moved to the backup model');
 assert.equal(out.requestKey,fingerprint({operation:'plan',attempt:0,continuationRetry:1}));assert.deepEqual(m.reserved,[out.requestKey],'the new request has its own reservation');
 // Replaying the same Resume reuses the saved answer.
 assert.equal((await transport({...a,continuation:1})).json.id,'resp_resumed');assert.equal(calls.sends,1);
});
test('a call-limit cancel whose one replacement was stopped at the end of the window also ends its pair',async()=>{
 const key='7'.repeat(64),second=fingerprint({operation:'plan',attempt:0,callTimeLimitRetry:1});
 const m=memory([[key,{version:1,operation:'plan',attempt:0,json:{id:'resp_slow',status:'cancelled',output:[]},cancellation:{reason:'call-time-limit',limitMs:600000}}],[second,windowStop('resp_backup')]]),{calls,args:a}=args(m.budget);
 const out=await transport({...a,continuation:1});assert.equal(out.json.id,'resp_resumed');assert.equal(calls.sends,1);
 assert.equal(out.requestKey,fingerprint({operation:'plan',attempt:0,continuationRetry:1}));
});
test('a stop at the end of the window that had already finished is used, and an unexplained cancel is never resent',async()=>{
 const finished=memory([['7'.repeat(64),{...windowStop('resp_done'),json:{...done,id:'resp_done'}}]]),f=args(finished.budget);
 assert.equal((await transport({...f.args,continuation:1})).json.id,'resp_done');assert.equal(f.calls.sends,0);
 const unexplained=memory([['7'.repeat(64),{version:1,operation:'plan',attempt:0,json:{id:'resp_gone',status:'cancelled',output:[]}}]]),u=args(unexplained.budget);
 assert.equal((await transport({...u.args,continuation:1})).json.status,'cancelled');assert.equal(u.calls.sends,0,'a cancel the Studio did not confirm on purpose is reconciled, not duplicated');
});
// The same through the real job store: the Resume count comes from the saved job (both brands).
for(const brandId of ['brand-duroflex','brand-sleepyhead']){
 test(brandId+': Resume of a job whose planner was stopped at the end of the window sends one new planner request',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'window-cancel-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const store=new JobStore(path.join(root,'jobs')),job=await store.create({brandId,conceptRoutes:['continuity']},{jobTimeoutMs:600000,maxReasoningCalls:10,estimatedSpend:{maxUsd:20,reasoningUsd:1,imageUsd:2}},[{id:'a'}]),budget=store.budget(job.id),key='7'.repeat(64);
  await budget.saveResponse('reasoning',key,windowStop('resp_window'));
  const {calls,args:a}=args(budget);a.prepare=async()=>({kind:'reasoning',usd:0.01});
  assert.equal((await transport({...a,continuation:await budget.continuations()})).json.status,'cancelled');assert.equal(calls.sends,0,'before Resume nothing is sent');
  await store.update(job.id,j=>{j.continuations=[{at:new Date().toISOString(),fromStatus:'failed',mode:'same-job-checkpoints'}];return j;});
  const out=await transport({...a,continuation:await budget.continuations()});
  assert.equal(out.json.id,'resp_resumed');assert.equal(calls.sends,1);
  assert.equal((await budget.loadResponse('reasoning',out.requestKey)).json.id,'resp_resumed');
  assert.equal((await budget.loadResponse('reasoning',key)).cancellation.reason,'processing-window-ended','the stopped request stays saved as it was');
 });
}
