'use strict';
// Regression (19 Nov 2026, live QA; user decision "decide how much time to give before backup is called"): on the hosted
// Studio 6 of 8 jobs had their main planning call (gpt-6.1-sol high) cancelled at the 4-minute wait and re-sent to the
// backup (gpt-6-luna high); 4 of those 6 then failed plan validation, while both jobs the main model planned finished.
// Saved runs show why: since 17 Nov the main planner takes 148-347 s (multi-image sets 207-347 s), because its
// instructions grew; every saved main-planner answer ever finished within 437 s. The backup takes 85-220 s.
// New lean jobs pin planningWaitVersion 1: lean planning waits 7 minutes, plus 20 s per extra image, at most 10 minutes,
// before the backup takes over. The backup gets the same limit; image checks keep theirs; earlier jobs keep their wait.
const test=require('node:test'),assert=require('node:assert/strict');
const {OpenAIProvider}=require('./offline-provider.cjs');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const BRANDS=[{id:'brand-1923d633-e03e-44cc-84b2-bbfb5c152710',name:'Duroflex'},{id:'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de',name:'Sleepyhead'}];
const completed=(id,out)=>({ok:true,json:async()=>({id,status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(out)}]}]})});
const base={reasoningModel:'gpt-6-luna',reasoningBackground:true,reasoningStore:true,reasoningTimeoutMs:1800000,maxOutputTokens:25000,maxRecoveryOutputTokens:50000,reasoningCallLimits:{planningMs:240000,reviewMs:240000,queuedMs:90000,retryMinimumMs:120000,pollMaxIntervalMs:4000}};
// The job's own pinned settings, as a new Studio job of this brand gets them (or an earlier job's, without the new pin).
const jobConfig=(brandId,{earlier=false}={})=>{const c=policy.configure(base,{leanWorkflowVersion:1,brandId});if(earlier)delete c.planningWaitVersion;return c;};
// mainSecs: when the main planner's background answer is ready (Infinity = it never answers).
function run(config,{pages=1,mainSecs=Infinity,kind='lean-planning'}={}){
 const p=new OpenAIProvider(config);let clock=0;const bodies=[],cancels=[],directLimits=[],receipts=[],saved=new Map();p.sleep=async ms=>{clock+=ms;};
 p.sendReasoning=async(b,timeout)=>{bodies.push(structuredClone(b));if(b.background)return {ok:true,json:async()=>({id:'resp_main',status:'in_progress'})};directLimits.push(timeout);return completed('resp_backup',{by:'backup'});};
 p.retrieveReasoning=async id=>{clock+=4000;return clock>=mainSecs*1000?completed(id,{by:'main'}):{ok:true,json:async()=>({id,status:'in_progress',output:[]})};};
 p.cancelReasoning=async id=>{cancels.push(clock);return {ok:true,json:async()=>({id,status:'cancelled'})};};
 const budget={reserve:async()=>{},receipt:async r=>receipts.push(r),remainingMs:async()=>40*60*1000,loadResponse:async(k,key)=>structuredClone(saved.get(key)),saveResponse:async(k,key,v)=>{saved.set(key,structuredClone(v));},waiting:async()=>{}};
 return (async()=>{const realNow=Date.now;Date.now=()=>1e12+clock;let out;try{out=await p.reason({contextKind:kind,callPages:pages,instructions:'plan',input:{},schema:{type:'object',properties:{by:{type:'string'}},required:['by'],additionalProperties:false}},budget);}finally{Date.now=realNow;}
  return {by:out.by,cancel:cancels[0],direct:directLimits[0],models:bodies.map(b=>b.model),receipts};})();
}
const near=(ms,want,label)=>assert.ok(ms>=want&&ms<want+10000,label+': '+ms+' ms, want about '+want);
for(const b of BRANDS){
 test(b.name+': a new job keeps waiting for a main plan that takes 5 minutes instead of switching to the backup at 4',async()=>{
  const now=await run(jobConfig(b.id),{pages:1,mainSecs:300});
  assert.equal(now.by,'main','the main planner\'s answer is used');assert.equal(now.cancel,undefined,'nothing is cancelled');assert.deepEqual(now.models,['gpt-6.1-sol'],'no backup request is sent');
  const set=await run(jobConfig(b.id),{pages:14,mainSecs:347});
  assert.equal(set.by,'main','the slowest saved recent set plan (347 s, 14 images) finishes on the main planner');
  const before=await run(jobConfig(b.id,{earlier:true}),{pages:1,mainSecs:300});
  assert.equal(before.by,'backup','an earlier job keeps its 4-minute wait');near(before.cancel,240000,'earlier job');
 });
 test(b.name+': the wait is 7 minutes plus 20 s per extra image, at most 10 minutes; the backup gets the same; checks keep theirs',async()=>{
  for(const [pages,want] of [[1,420000],[3,460000],[6,520000],[10,600000],[14,600000]]){
   const r=await run(jobConfig(b.id),{pages});
   assert.equal(r.by,'backup',pages+' images: a main planner that never answers still hands over to the backup');near(r.cancel,want,pages+' images');
   assert.ok(r.direct<=want&&r.direct>want-10000,pages+' images: the backup gets the same limit: '+r.direct);
   const fallback=r.receipts.find(x=>x.requestId==='resp_backup')?.fallback;assert.equal(fallback?.reason,'call-time-limit');assert.equal(fallback?.model,'gpt-6-luna');
  }
  for(const [pages,want] of [[1,240000],[6,340000],[14,480000]])near((await run(jobConfig(b.id,{earlier:true}),{pages})).cancel,want,'earlier job, '+pages+' images');
  const check=await run(jobConfig(b.id),{pages:14,kind:'lean-review'});assert.equal(check.direct,240000,'an image check (sent directly on new jobs) keeps its own limit');
 });
 test(b.name+': new jobs pin the longer wait and the saved settings keep it',()=>{
  const c=jobConfig(b.id);assert.equal(c.planningWaitVersion,1);assert.equal(c.planningCallScaleVersion,1);
  assert.equal(pc.snapshot(c).planningWaitVersion,1);assert.equal(pc.snapshot(jobConfig(b.id,{earlier:true})).planningWaitVersion,undefined);
  assert.equal(policy.configure(base,{brandId:b.id}).planningWaitVersion,undefined,'non-lean jobs are unchanged');
 });
}
