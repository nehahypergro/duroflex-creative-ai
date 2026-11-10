'use strict';
// Regression tests for provider/transport defects observed 8 November 2026:
// #5 field-scoped repair cut validation errors at 1,500 characters (art-provenance failure);
// #7 one stalled Responses call consumed the whole 45-minute job window, and stage-queue
//    waiting counted against that window;
// #9 one image HTTP error left a reserved request without a saved outcome, so the job could
//    never resume, and near-deadline renders were dispatched with seconds of timeout.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const transport=require('../../lib/creative-ai/runtime/reasoning-transport');
const {OpenAIProvider}=require('./offline-provider.cjs');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
const resume=require('../../lib/creative-ai/runtime/resume-work');
const {check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
const {fingerprint}=require('../../lib/creative-ai/art-director');
const PREFIX='Return JSON matching this contract. ';
const brands=['brand-duroflex','brand-sleepyhead'];
const completed=(id,out)=>({ok:true,json:async()=>({id,status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(out)}]}]})});
const repairOf=body=>JSON.parse(body.input[0].content[0].text.slice(PREFIX.length)).repair;

// ---------- #5 complete repair errors ----------
test('#5 field-scoped repair receives every validation error, not a 1,500-character cut',async()=>{
 const schema={type:'object',properties:{items:{type:'array',items:{type:'object',properties:{label:{type:'string',enum:['alpha','beta']}},required:['label'],additionalProperties:false}},ok:{type:'boolean'}},required:['items','ok'],additionalProperties:false};
 const bad={items:Array.from({length:80},(_,i)=>({label:'gamma-'+i})),ok:true},errors=check(schema,bad);
 assert.ok(errors.join('\n').length>1500,'fixture must exceed the old field-scoped cut');
 const provider=new OpenAIProvider({reasoningModel:'fixture',reasoningTimeoutMs:10000,maxOutputTokens:1000,maxRecoveryOutputTokens:2000}),bodies=[];
 provider.sendReasoning=async body=>{bodies.push(body);return completed('resp_field_'+bodies.length,bodies.length===1?bad:{items:[{label:'alpha'}]});};
 const out=await provider.reason({instructions:'fixture',input:{},schema},{reserve:async()=>{},receipt:async()=>{}});
 assert.equal(bodies.length,2);assert.deepEqual(out,{items:[{label:'alpha'}],ok:true});
 const repair=repairOf(bodies[1]);assert.match(repair,/Return ONLY the items field/);
 for(const e of errors)assert.ok(repair.includes(e),'missing repair error: '+e);
});
test('#5 full-object repair is bounded by whole errors and states how many were omitted',async()=>{
 const item={type:'object',properties:{label:{type:'string',enum:['alpha','beta']}},required:['label'],additionalProperties:false};
 const schema={type:'object',properties:{first:{type:'array',items:item},second:{type:'array',items:item}},required:['first','second'],additionalProperties:false};
 const bad={first:Array.from({length:110},(_,i)=>({label:'first-invalid-'+i})),second:Array.from({length:110},(_,i)=>({label:'second-invalid-'+i}))},errors=check(schema,bad);
 assert.ok(errors.join('\n').length>5000,'fixture must exceed the full-object bound');
 const provider=new OpenAIProvider({reasoningModel:'fixture',reasoningTimeoutMs:10000,maxOutputTokens:1000,maxRecoveryOutputTokens:2000}),bodies=[];
 provider.sendReasoning=async body=>{bodies.push(body);return completed('resp_full_'+bodies.length,bodies.length===1?bad:{first:[],second:[]});};
 await provider.reason({instructions:'fixture',input:{},schema},{reserve:async()=>{},receipt:async()=>{}});
 const repair=repairOf(bodies[1]),marker='correct these contract errors without adding unsupported evidence: ';
 assert.ok(repair.includes(marker));const lines=repair.slice(repair.indexOf(marker)+marker.length).split('\n');
 const note=lines.at(-1),omitted=/^\((\d+) further validation errors? omitted/.exec(note);
 assert.ok(omitted,'omission note required: '+note);const included=lines.slice(0,-1);
 for(const line of included)assert.ok(errors.includes(line),'partial or invented error line: '+line);
 assert.equal(included.length+Number(omitted[1]),errors.length);assert.ok(lines.join('\n').length<=5200);
});

test('#5 semantic errors keep the full contract even when the output also has an incidental single-field schema error',async()=>{
 const schema={type:'object',properties:{items:{type:'array',items:{type:'object',properties:{label:{type:'string',enum:['alpha','beta']}},required:['label'],additionalProperties:false}},ok:{type:'boolean'}},required:['items','ok'],additionalProperties:false};
 const provider=new OpenAIProvider({reasoningModel:'fixture',reasoningTimeoutMs:10000,maxOutputTokens:1000,maxRecoveryOutputTokens:2000}),bodies=[];
 provider.sendReasoning=async body=>{bodies.push(body);return completed('resp_semantic_'+bodies.length,bodies.length===1?{items:[{label:'gamma'}],ok:false}:{items:[{label:'alpha'}],ok:true});};
 const validate=async v=>{if(!v.ok)throw Error('Semantic rule: ok must be true when items are present');};
 const out=await provider.reason({instructions:'fixture',input:{},schema,validate},{reserve:async()=>{},receipt:async()=>{}});
 assert.deepEqual(out,{items:[{label:'alpha'}],ok:true});const repair=repairOf(bodies[1]);
 assert.match(repair,/^Return the COMPLETE supplied wire object/);assert.match(repair,/Semantic rule: ok must be true/);
});

// ---------- #7 per-call time limit ----------
function stalled({remainingMs=45*60*1000,cancelStatus='cancelled',retryStalls=false,saved=new Map()}={}){
 let time=0;const reservations=[],sleeps=[],cancels=[],waits=[],abandoned=[];let posts=0;
 const budget={remainingMs:async()=>remainingMs-time,loadResponse:async(k,key)=>structuredClone(saved.get(key)),saveResponse:async(k,key,v)=>{saved.set(key,structuredClone(v));},reserve:async(kind,key)=>{if(reservations.includes(key))throw Object.assign(Error('already reserved'),{code:'AMBIGUOUS_PROVIDER_REQUEST'});reservations.push(key);},waiting:async v=>waits.push(v)};
 const args={key:'a'.repeat(64),operation:'soft-limit',attempt:0,budget,durablePending:true,timeoutMs:900000,callTimeLimitMs:480000,maxHttpRetries:1,now:()=>time,sleep:async ms=>{sleeps.push(ms);time+=ms;},prepare:async()=>{},
  send:async()=>{posts++;return {ok:true,json:async()=>({id:posts===1?'resp_stall':'resp_retry',status:'queued'})};},
  retrieve:async id=>({ok:true,json:async()=>({id,status:id==='resp_retry'&&!retryStalls&&time>=480000+30000?'completed':'in_progress',output:[]})}),
  cancel:async id=>{cancels.push({id,time});return {ok:true,json:async()=>({id,status:cancelStatus,usage:{input_tokens:900,output_tokens:12}})};},
  abandoned:async value=>abandoned.push(value)};
 return {args,saved,reservations,sleeps,cancels,waits,abandoned,get posts(){return posts;},get time(){return time;}};
}
test('#7 a stalled background call is cancelled at its call limit and re-sent once as a separately reserved request',async()=>{
 const f=stalled(),out=await transport(f.args);
 assert.equal(out.json.id,'resp_retry');assert.equal(out.json.status,'completed');assert.notEqual(out.requestKey,f.args.key);
 assert.equal(f.posts,2);assert.equal(f.reservations.length,2);assert.notEqual(f.reservations[0],f.reservations[1]);
 assert.equal(f.cancels.length,1);assert.equal(f.cancels[0].id,'resp_stall');assert.ok(f.cancels[0].time>=480000&&f.cancels[0].time<485000,'cancel at the call limit, not the job deadline: '+f.cancels[0].time);
 const original=f.saved.get(f.args.key);assert.equal(original.json.status,'cancelled');assert.equal(original.cancellation.reason,'call-time-limit');assert.equal(original.chargeStatus,'unknown');
 assert.equal(f.abandoned.length,1);assert.equal(f.abandoned[0].json.id,'resp_stall');assert.equal(f.abandoned[0].requestKey,f.args.key);
 assert.ok(f.time<16*60*1000,'whole call stays well inside the job window');
});
test('#7 a retry that also exceeds the call limit fails cleanly; replay sends nothing more',async()=>{
 const f=stalled({retryStalls:true});
 await assert.rejects(transport(f.args),e=>e.code==='REASONING_TIMEOUT'&&e.recovery.mode==='exhausted'&&e.retryableReview===false&&/time limit/i.test(e.message));
 assert.equal(f.posts,2);assert.equal(f.reservations.length,2);assert.equal(f.cancels.length,2);assert.ok(f.time<17*60*1000);
 const again=stalled({retryStalls:true,saved:f.saved});
 await assert.rejects(transport(again.args),e=>e.code==='REASONING_TIMEOUT');assert.equal(again.posts,0);assert.equal(again.reservations.length,0);
});
test('#7 the single extra request is shared: an HTTP recovery that then stalls is cancelled, not re-sent again',async()=>{
 const f=stalled();let n=0;f.args.send=async()=>++n===1?{ok:false,status:503,headers:new Headers(),json:async()=>({error:{code:'server_error'}})}:{ok:true,json:async()=>({id:'resp_after_http',status:'queued'})};
 await assert.rejects(transport(f.args),e=>e.code==='REASONING_TIMEOUT'&&/after one provider HTTP recovery/.test(e.message)&&e.recovery.mode==='exhausted');
 assert.equal(n,2);assert.equal(f.reservations.length,2);assert.equal(f.cancels.length,1);
});
test('#7 restart after the call-limit cancellation continues with the retry key, never the original',async()=>{
 const f=stalled();let crash=true;f.args.prepare=async key=>{if(key!==f.args.key&&crash){crash=false;throw Object.assign(Error('simulated stop before retry'),{code:'SIMULATED_STOP'});}};
 await assert.rejects(transport(f.args),e=>e.code==='SIMULATED_STOP');assert.equal(f.posts,1);assert.equal(f.reservations.length,1);
 const out=await transport(f.args);assert.equal(out.json.id,'resp_retry');assert.equal(f.posts,2);assert.equal(f.reservations.length,2);assert.equal(f.cancels.length,1);
});
test('#7 unconfirmed cancellation never sends a replacement',async()=>{
 const f=stalled();f.args.cancel=async()=>{throw Error('offline');};
 await assert.rejects(transport(f.args),e=>e.code==='REASONING_PENDING'&&e.providerResponseId==='resp_stall');assert.equal(f.posts,1);assert.equal(f.reservations.length,1);
});
test('#7 no retry is dispatched when too little job time remains',async()=>{
 const f=stalled({remainingMs:9*60*1000});
 await assert.rejects(transport(f.args),e=>e.code==='REASONING_TIMEOUT'&&e.retryableReview===true&&e.recovery.mode==='resume');assert.equal(f.posts,1);assert.equal(f.reservations.length,1);
});
test('#7 polling interval is capped at four seconds',async()=>{
 const f=stalled();delete f.args.callTimeLimitMs;f.args.retrieve=async id=>({ok:true,json:async()=>({id,status:f.time>=10*60*1000?'completed':'in_progress',output:[]})});
 await transport(f.args);assert.ok(Math.max(...f.sleeps)<=4000,'max poll sleep '+Math.max(...f.sleeps));
});
// Fallbacks (user decision, 8 Nov 2026): planning now gets 4 minutes before its replacement, and a
// request still queued after 90 s is replaced.
test('#7 configured defaults: planning 4 min, queued 90 s, review 4 min, retry floor 2 min, poll 4 s, high image window 3 min',()=>{
 const c=require('../../lib/creative-ai/runtime/config').loadConfig('/nonexistent-fixture');
 assert.deepEqual(c.reasoningCallLimits,{planningMs:240000,queuedMs:90000,reviewMs:240000,retryMinimumMs:120000,pollMaxIntervalMs:4000});
 assert.deepEqual(c.imageDispatchWindowMs,{high:180000,medium:90000,low:60000});assert.equal(c.processingWindowVersion,1);assert.equal(c.jobTimeoutMs,2700000);
 const previous=process.env.CREATIVE_AI_PLANNING_CALL_LIMIT_MS;process.env.CREATIVE_AI_PLANNING_CALL_LIMIT_MS='360000';
 try{assert.equal(require('../../lib/creative-ai/runtime/config').loadConfig('/nonexistent-fixture').reasoningCallLimits.planningMs,360000);}finally{if(previous===undefined)delete process.env.CREATIVE_AI_PLANNING_CALL_LIMIT_MS;else process.env.CREATIVE_AI_PLANNING_CALL_LIMIT_MS=previous;}
});
for(const [kind,limit] of [['strategy','planningMs'],['review','reviewMs']])test('#7 provider applies the '+kind+' call limit, records the cancelled attempt as unknown usage, and counts both requests',async()=>{
 const provider=new OpenAIProvider({reasoningModel:'fixture',reasoningTimeoutMs:10000,maxOutputTokens:100,maxRecoveryOutputTokens:200,reasoningBackground:true,reasoningStore:true,reasoningCallLimits:{planningMs:kind==='strategy'?40:5000,reviewMs:kind==='review'?40:5000,retryMinimumMs:1,pollMaxIntervalMs:10}});
 let posts=0,cancelled=0;const reservations=[],receipts=[],saved=new Map();
 provider.sendReasoning=async()=>(++posts===1?{ok:true,json:async()=>({id:'resp_slow',status:'queued'})}:completed('resp_fast',{ok:true}));
 provider.retrieveReasoning=async id=>({ok:true,json:async()=>({id,status:'in_progress'})});
 provider.cancelReasoning=async id=>{cancelled++;return {ok:true,json:async()=>({id,status:'cancelled',usage:{input_tokens:50,output_tokens:5}})};};
 const budget={reserve:async(k,key)=>reservations.push(key),receipt:async r=>receipts.push(r),saveResponse:async(k,key,v)=>saved.set(key,v),loadResponse:async(k,key)=>saved.get(key)};
 const out=await provider.reason({contextKind:kind,instructions:'fixture',input:{},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}},budget);
 assert.deepEqual(out,{ok:true});assert.equal(posts,2);assert.equal(cancelled,1);assert.equal(reservations.length,2);
 const lost=receipts.find(r=>r.requestId==='resp_slow'),kept=receipts.find(r=>r.requestId==='resp_fast');
 assert.ok(lost&&kept);assert.deepEqual(lost.usage,{});assert.equal(lost.chargeStatus,'unknown');assert.equal(lost.responseStatus,'cancelled');assert.deepEqual(lost.reportedUsage,{input_tokens:50,output_tokens:5});
 assert.equal(require('../../lib/cost-tracker').estimate(lost),null,'cancelled attempt must never be priced as zero');assert.notEqual(lost.requestKey,kept.requestKey);
});

// ---------- #7 stage-queue time does not count ----------
async function storeFixture(t,brandId,config={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'provider-time-limits-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'jobs')),job=await store.create({brandId,conceptRoutes:['continuity']},{jobTimeoutMs:600000,maxReasoningCalls:10,estimatedSpend:{maxUsd:20,reasoningUsd:1,imageUsd:2},...config},[{id:'a'},{id:'b'}]);
 return {store,id:job.id,root};
}
// Simulate elapsed wall-clock time without sleeping: move every stored timestamp back.
async function elapse(store,id,ms){const j=await store.read(id,{hydrate:false});j.budget.deadline-=ms;if(j.budget.processingWindow?.queuedAt)j.budget.processingWindow.queuedAt-=ms;await store.save(id,'job.json',j);}
for(const brandId of brands){
 test('#7 '+brandId+': time spent waiting in the stage queue does not count against the job window',async t=>{
  const {store,id}=await storeFixture(t,brandId,{processingWindowVersion:1});
  await elapse(store,id,550000);await store.update(id,j=>{j.status='running';return j;});
  const remaining=await store.budget(id).remainingMs();assert.ok(remaining>598000&&remaining<=600000,'window starts on leaving the queue: '+remaining);
  const started=await store.read(id,{hydrate:false});assert.ok(started.budget.processingWindow.startedAt);
  // Image stage handoff: wait in the image queue, then resume with the same remaining time.
  await store.update(id,j=>{j.status='queued';j.stageQueue={version:1,phase:'image',queuedAt:new Date().toISOString()};return j;});
  const before=await store.budget(id).remainingMs();await elapse(store,id,300000);await store.update(id,j=>{j.status='running';return j;});
  const after=await store.budget(id).remainingMs();assert.ok(Math.abs(after-before)<3000,'image-queue wait credited: '+before+' -> '+after);
 });
 test('#7 '+brandId+': saved jobs without the processing-window pin keep their creation deadline',async t=>{
  const {store,id}=await storeFixture(t,brandId);const created=(await store.read(id,{hydrate:false})).budget.deadline;
  await store.update(id,j=>{j.status='running';return j;});const job=await store.read(id,{hydrate:false});
  assert.equal(job.budget.deadline,created);assert.equal(job.budget.processingWindow,undefined);
 });
 test('#7 '+brandId+': a queued job is not expired by startup recovery while it waits',async t=>{
  const {store,id}=await storeFixture(t,brandId,{processingWindowVersion:1});await elapse(store,id,700000);const scheduled=[];
  const report=await resume.recoverStartup({store,config:{jobTimeoutMs:600000},active:new Set(),pending:[],schedule:x=>scheduled.push(x)});
  assert.deepEqual(report.interrupted,[]);assert.deepEqual(scheduled,[id]);assert.equal((await store.read(id)).status,'queued');
 });
}

// ---------- #9 image HTTP failures ----------
function imageFetch(sequence){const calls=[];const fetch=async(url,options)=>{calls.push({url,key:options.headers['Idempotency-Key']});const next=sequence[Math.min(calls.length-1,sequence.length-1)];return new Response(JSON.stringify(next.body),{status:next.status,headers:next.headers||{}});};return {fetch,calls};}
const ok={status:200,body:{data:[{b64_json:'YQ=='}],usage:{input_tokens:10,output_tokens:20}}};
const request=(key,extra={})=>({prompt:'Fixture image',attachments:[],size:'1024x1024',requestKey:key,...extra});
async function failedJob(store,id){await store.update(id,j=>{j.status='failed';j.error='fixture';return j;});return resume.inspect({store,config:{jobTimeoutMs:600000},active:new Set(),pending:[],schedule:()=>{}},id);}
for(const brandId of brands){
 test('#9 '+brandId+': a retryable image HTTP error is saved, honours Retry-After and is retried once under a new reserved key',async t=>{
  const previous=global.fetch;t.after(()=>{global.fetch=previous;});const {store,id}=await storeFixture(t,brandId),key=fingerprint({fixture:brandId,case:'retry'});
  const mock=imageFetch([{status:503,body:{error:{code:'server_error',message:'busy'}},headers:{'retry-after':'7'}},ok]);global.fetch=mock.fetch;
  const provider=new OpenAIProvider({imageModel:'fixture',imageTimeoutMs:60000}),waits=[];provider.sleep=async ms=>waits.push(ms);
  const out=await provider.generate(request(key),store.budget(id));assert.match(out.imageData,/YQ==/);
  assert.equal(mock.calls.length,2);assert.equal(mock.calls[0].key,key);assert.notEqual(mock.calls[1].key,key);assert.ok(waits.length===1&&waits[0]>=6000&&waits[0]<=7000,'Retry-After honoured: '+waits);
  const job=await store.read(id,{hydrate:false});assert.equal(job.budget.imageCalls,2);assert.equal(Object.keys(job.budget.requestStates).length,2);
  const failure=await store.budget(id).loadResponse('image',key);assert.equal(failure.httpFailure.status,503);assert.equal(failure.httpFailure.chargeStatus,'unknown');assert.equal(failure.httpFailure.retryable,true);
  assert.equal(job.budget.receipts.length,1);assert.equal(job.budget.receipts[0].requestKey,mock.calls[1].key);
  const info=await failedJob(store,id);assert.equal(info.canResume,true,info.reason);
  global.fetch=async()=>assert.fail('replay must not dispatch');const again=await provider.generate(request(key),store.budget(id));assert.match(again.imageData,/YQ==/);
 });
 test('#9 '+brandId+': a non-retryable image 4xx fails clearly, is resolved for resume and is never re-sent',async t=>{
  const previous=global.fetch;t.after(()=>{global.fetch=previous;});const {store,id}=await storeFixture(t,brandId),key=fingerprint({fixture:brandId,case:'400'});
  const mock=imageFetch([{status:400,body:{error:{code:'invalid_value',param:'size',message:'bad size'}}}]);global.fetch=mock.fetch;const provider=new OpenAIProvider({imageModel:'fixture',imageTimeoutMs:60000});provider.sleep=async()=>assert.fail('no retry wait');
  await assert.rejects(provider.generate(request(key),store.budget(id)),e=>e.code==='IMAGE_PROVIDER_HTTP_ERROR'&&e.httpStatus===400&&e.retryable===false&&/\(400\)/.test(e.message));
  assert.equal(mock.calls.length,1);const info=await failedJob(store,id);assert.equal(info.canResume,true,info.reason);
  await assert.rejects(provider.generate(request(key),store.budget(id)),e=>e.code==='IMAGE_PROVIDER_HTTP_ERROR');assert.equal(mock.calls.length,1);assert.equal((await store.read(id,{hydrate:false})).budget.imageCalls,1);
 });
}
test('#9 a retry that fails again stops after two dispatches, including across restart',async t=>{
 const previous=global.fetch;t.after(()=>{global.fetch=previous;});const {store,id}=await storeFixture(t,'brand-duroflex'),key=fingerprint({fixture:'twice'});
 const mock=imageFetch([{status:500,body:{error:{code:'server_error'}}}]);global.fetch=mock.fetch;const provider=new OpenAIProvider({imageModel:'fixture',imageTimeoutMs:60000});provider.sleep=async()=>{};
 await assert.rejects(provider.generate(request(key),store.budget(id)),e=>e.code==='IMAGE_PROVIDER_HTTP_ERROR'&&e.httpStatus===500);assert.equal(mock.calls.length,2);
 await assert.rejects(provider.generate(request(key),store.budget(id)),e=>e.code==='IMAGE_PROVIDER_HTTP_ERROR');assert.equal(mock.calls.length,2);
 const info=await failedJob(store,id);assert.equal(info.canResume,true,info.reason);
});
test('#9 exhausted credits still stop without retry and the failure is saved',async t=>{
 const previous=global.fetch;t.after(()=>{global.fetch=previous;});const {store,id}=await storeFixture(t,'brand-sleepyhead'),key=fingerprint({fixture:'credits'});
 const mock=imageFetch([{status:429,body:{error:{code:'insufficient_quota',message:'You have no credits remaining.'}}}]);global.fetch=mock.fetch;const provider=new OpenAIProvider({imageModel:'fixture',imageTimeoutMs:60000});provider.sleep=async()=>assert.fail('no retry');
 await assert.rejects(provider.generate(request(key),store.budget(id)),e=>e.code==='PROVIDER_CREDITS_EXHAUSTED');assert.equal(mock.calls.length,1);
 assert.equal((await store.budget(id).loadResponse('image',key)).httpFailure.creditsExhausted,true);assert.ok((await store.read(id,{hydrate:false})).providerBlock);
});
test('#9 a high-quality render is not dispatched with less than the minimum window',async t=>{
 const previous=global.fetch;t.after(()=>{global.fetch=previous;});const {store,id}=await storeFixture(t,'brand-duroflex',{jobTimeoutMs:60000}),key=fingerprint({fixture:'window'});
 const mock=imageFetch([ok]);global.fetch=mock.fetch;const provider=new OpenAIProvider({imageModel:'fixture',imageTimeoutMs:900000,imageDispatchWindowMs:require('../../lib/creative-ai/runtime/config').loadConfig('/nonexistent-fixture').imageDispatchWindowMs});
 await assert.rejects(provider.generate(request(key,{quality:'high'}),store.budget(id)),e=>e.code==='IMAGE_TIME_WINDOW');
 assert.equal(mock.calls.length,0);assert.equal((await store.read(id,{hydrate:false})).budget.imageCalls,0);
 const roomy=await storeFixture(t,'brand-sleepyhead',{jobTimeoutMs:600000});await provider.generate(request(fingerprint({fixture:'window-ok'}),{quality:'high'}),roomy.store.budget(roomy.id));assert.equal(mock.calls.length,1);
});
test('#9 reconciliation resolves a historical unsaved image HTTP failure without a paid request',async t=>{
 const {store,id}=await storeFixture(t,'brand-sleepyhead'),key='9'.repeat(64),inputHash='8'.repeat(64);
 await store.update(id,j=>{j.status='failed';j.budget.requestStates={['image:'+key]:{kind:'image',key}};j.budget.imageReservations=[key];j.budget.imageCalls=1;j.imageWaits={[key]:{requestKey:key,inputHash,status:'failed',chargeStatus:'unknown',httpStatus:503}};return j;});
 const runtime={store,config:{jobTimeoutMs:600000},active:new Set(),pending:[],schedule:()=>{},provider:{distributed:null}};
 const before=await resume.inspect(runtime,id,'brand-sleepyhead');assert.equal(before.canResume,false);assert.equal(before.blockedRequestKey,key);assert.equal(before.canReconcileImages,true);
 const R=require('../../lib/creative-ai/runtime/image-response-recovery');await assert.rejects(R.reconcile(runtime,id,'brand-duroflex'),/different brand/);
 const result=await R.reconcile(runtime,id,'brand-sleepyhead');assert.equal(result.paidRequests,0);assert.equal(result.resolvedFailures,1);
 const saved=await store.budget(id).loadResponse('image',key);assert.equal(saved.httpFailure.status,503);assert.equal(saved.httpFailure.chargeStatus,'unknown');assert.equal(saved.inputHash,inputHash);
 const after=await resume.inspect(runtime,id,'brand-sleepyhead');assert.equal(after.canResume,true,after.reason);
 const job=await store.read(id,{hydrate:false});assert.equal(job.budget.imageCalls,1);assert.deepEqual(job.budget.receipts,[]);
});

// Regression (8 Nov 2026, jobs creative-7eadcda7 and creative-8ecc28b4): gpt-6.1-sol slowed to
// ~1.6 output tokens/s, so planning and its one replacement were both cancelled at the 8-minute
// call limit (both cancellations confirmed). An explicit "Resume interrupted work" then replayed
// the same two saved request keys and failed in 18 ms without sending anything, so the job could
// never recover from a provider slowdown. An explicit operator continuation may start one fresh
// request pair — only when every earlier pair ended in confirmed call-limit cancellations.
test('#7 an explicit continuation after two confirmed call-limit cancellations sends a fresh request',async()=>{
 const f=stalled({retryStalls:true});
 await assert.rejects(transport(f.args),e=>e.code==='REASONING_TIMEOUT');assert.equal(f.posts,2);
 await assert.rejects(transport(f.args),e=>e.code==='REASONING_TIMEOUT');assert.equal(f.posts,2,'automatic replay still sends nothing');
 // Provider has recovered; the operator explicitly resumes (continuation 1).
 f.args.send=async()=>({ok:true,json:async()=>({id:'resp_resumed',status:'completed',output:[]})});
 const out=await transport({...f.args,continuation:1});
 assert.equal(out.json.id,'resp_resumed');assert.notEqual(out.requestKey,f.args.key);
 assert.equal(f.reservations.length,3);assert.equal(new Set(f.reservations).size,3,'the fresh request has its own reservation');
 // Replaying the same continuation reuses its saved response instead of sending again.
 let again=0;f.args.send=async()=>{again++;return {ok:true,json:async()=>({id:'resp_x',status:'completed',output:[]})};};
 assert.equal((await transport({...f.args,continuation:1})).json.id,'resp_resumed');assert.equal(again,0);
});
test('#7 an unconfirmed cancellation never lets a continuation send a fresh request',async()=>{
 const f=stalled({cancelStatus:'in_progress'});f.args.retrieve=async id=>({ok:true,json:async()=>({id,status:'in_progress',output:[]})});
 await assert.rejects(transport(f.args),e=>e.code==='REASONING_PENDING');const posts=f.posts;
 let sent=0;f.args.send=async()=>{sent++;return {ok:true,json:async()=>({id:'resp_new',status:'completed',output:[]})};};
 await assert.rejects(transport({...f.args,continuation:1,timeoutMs:1000}),e=>['REASONING_PENDING','REASONING_TIMEOUT'].includes(e.code)||/pending|time/i.test(e.message));
 assert.equal(sent,0,'the ambiguous request is reconciled, not duplicated');assert.equal(f.posts,posts);
});

// Fallbacks (user decision, 8 Nov 2026): don't wait out a slow provider. A background request
// still "queued" after the queue limit is cancelled (confirmed) and replaced; the replacement
// hook lets the provider send it directly and, for lean planning, to the backup model.
test('fallback: a request stuck in the queue is cancelled and replaced through the replacement hook',async()=>{
 const f=stalled();f.args.callTimeLimitMs=240000;f.args.queuedLimitMs=90000;
 f.args.send=async()=>{const n=++f.sent;return {ok:true,json:async()=>(n===1?{id:'resp_queued',status:'queued'}:{id:'resp_direct',status:'completed',output:[]})};};f.sent=0;
 f.args.retrieve=async id=>({ok:true,json:async()=>({id,status:'queued',output:[]})});
 const reasons=[];f.args.prepareReplacement=async({reason})=>reasons.push(reason);
 const out=await transport(f.args);
 assert.equal(out.json.id,'resp_direct');assert.deepEqual(reasons,['queued-too-long']);
 assert.ok(f.cancels[0].time>=90000&&f.cancels[0].time<100000,'cancelled soon after 90 s in the queue: '+f.cancels[0].time);
 assert.equal(f.saved.get(f.args.key).cancellation.reason,'queued-too-long');
});
test('fallback: a request that is running (not queued) is left alone until its call limit',async()=>{
 const f=stalled();f.args.callTimeLimitMs=240000;f.args.queuedLimitMs=90000;const reasons=[];f.args.prepareReplacement=async({reason})=>reasons.push(reason);
 f.args.retrieve=async id=>({ok:true,json:async()=>({id,status:id==='resp_retry'?'completed':'in_progress',output:[]})});
 const out=await transport(f.args);assert.equal(out.json.id,'resp_retry');assert.deepEqual(reasons,['call-time-limit']);
 assert.ok(f.cancels[0].time>=240000,'running work keeps its full call limit');
});
test('fallback: lean planning replacement goes directly to the pinned backup model and the receipt says so',async()=>{
 const p=new OpenAIProvider({reasoningModel:'gpt-6-luna',roleModels:{'lean-planning':{model:'gpt-6.1-sol',reasoningEffort:'high'}},fallbackModels:{'lean-planning':{model:'gpt-6-luna',reasoningEffort:'high'}},reasoningBackground:true,reasoningStore:true,reasoningTimeoutMs:900000,maxOutputTokens:25000,maxRecoveryOutputTokens:50000,reasoningCallLimits:{planningMs:240000,reviewMs:240000,queuedMs:90000,retryMinimumMs:120000,pollMaxIntervalMs:4000}});
 let clock=0;const bodies=[],receipts=[],saved=new Map();p.sleep=async ms=>{clock+=ms;};
 const realNow=Date.now;Date.now=()=>1e12+clock;
 try{
  p.sendReasoning=async b=>{bodies.push(structuredClone(b));return b.background?{ok:true,json:async()=>({id:'resp_bg',status:'queued'})}:completed('resp_backup',{ok:true});};
  p.retrieveReasoning=async id=>{clock+=5000;return {ok:true,json:async()=>({id,status:'queued',output:[]})};};
  p.cancelReasoning=async id=>({ok:true,json:async()=>({id,status:'cancelled'})});
  const budget={reserve:async()=>{},receipt:async r=>receipts.push(r),remainingMs:async()=>40*60*1000,loadResponse:async(k,key)=>structuredClone(saved.get(key)),saveResponse:async(k,key,v)=>{saved.set(key,structuredClone(v));},waiting:async()=>{}};
  const out=await p.reason({contextKind:'lean-planning',instructions:'plan',input:{},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}},budget);
  assert.deepEqual(out,{ok:true});
  assert.equal(bodies.length,2);assert.equal(bodies[0].model,'gpt-6.1-sol');assert.equal(bodies[0].background,true);
  assert.equal(bodies[1].model,'gpt-6-luna');assert.equal(bodies[1].background,undefined,'the replacement skips the queue');assert.equal(bodies[1].reasoning.effort,'high');
  const ok=receipts.find(r=>r.requestId==='resp_backup');assert.equal(ok.model,'gpt-6-luna');assert.equal(ok.fallback.reason,'queued-too-long');assert.equal(ok.fallback.model,'gpt-6-luna');
  const lost=receipts.find(r=>r.requestId==='resp_bg');assert.equal(lost.model,'gpt-6.1-sol');assert.equal(lost.chargeStatus,'unknown');
 }finally{Date.now=realNow;}
});
// Live A+ retry, 9 Nov 2026 (job creative-d5ab6c1e): the main planner was slow, the backup wrote the plan,
// the plan failed validation, and the single repair request went back to the slow main planner, which timed
// out again. User decision, 10 Nov 2026 ("fix 5"): once the backup model has written a response, the repair
// of that response also goes directly to the backup model, and its receipt says so.
test('fallback: the repair of a backup-written plan also goes to the backup model',async()=>{
 const p=new OpenAIProvider({reasoningModel:'gpt-6-luna',roleModels:{'lean-planning':{model:'gpt-6.1-sol',reasoningEffort:'high'}},fallbackModels:{'lean-planning':{model:'gpt-6-luna',reasoningEffort:'high'}},reasoningBackground:true,reasoningStore:true,reasoningTimeoutMs:900000,maxOutputTokens:25000,maxRecoveryOutputTokens:50000,reasoningCallLimits:{planningMs:240000,reviewMs:240000,queuedMs:90000,retryMinimumMs:120000,pollMaxIntervalMs:4000}});
 let clock=0;const bodies=[],receipts=[],saved=new Map();p.sleep=async ms=>{clock+=ms;};
 const realNow=Date.now;Date.now=()=>1e12+clock;
 try{
  p.sendReasoning=async b=>{bodies.push(structuredClone(b));if(b.background)return {ok:true,json:async()=>({id:'resp_bg',status:'queued'})};return bodies.filter(x=>!x.background).length===1?completed('resp_backup',{ok:false}):completed('resp_repair',{ok:true});};
  p.retrieveReasoning=async id=>{clock+=5000;return {ok:true,json:async()=>({id,status:'queued',output:[]})};};
  p.cancelReasoning=async id=>({ok:true,json:async()=>({id,status:'cancelled'})});
  const budget={reserve:async()=>{},receipt:async r=>receipts.push(r),remainingMs:async()=>40*60*1000,loadResponse:async(k,key)=>structuredClone(saved.get(key)),saveResponse:async(k,key,v)=>{saved.set(key,structuredClone(v));},waiting:async()=>{}};
  const out=await p.reason({contextKind:'lean-planning',instructions:'plan',input:{},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false},validate:v=>{if(!v.ok)throw Error('Unknown product fact citation: sku-product-image-2 (headline)');}},budget);
  assert.deepEqual(out,{ok:true});
  assert.deepEqual(bodies.map(b=>[b.model,!!b.background]),[['gpt-6.1-sol',true],['gpt-6-luna',false],['gpt-6-luna',false]],'the repair skips the slow main model');
  const repair=receipts.find(r=>r.requestId==='resp_repair');assert.equal(repair.model,'gpt-6-luna');assert.equal(repair.fallback.reason,'repair-follows-backup');assert.equal(repair.fallback.primaryModel,'gpt-6.1-sol');
 }finally{Date.now=realNow;}
});
// User request, 10 Nov 2026 ("Can we make this longer for bigger files or more images"), after a 14-image A+ plan
// timed out twice at the fixed 4-minute planning limit. Saved runs: 10+ image plans finished in up to 235 s and half
// of their calls hit the 240 s limit; one-image plans take about 100 s. New jobs pin planningCallScaleVersion 1:
// lean planning gets 4 minutes plus 20 s per extra image, at most 8 minutes. The backup model gets the same limit.
function scaled({pin,pages}){
 const p=new OpenAIProvider({reasoningModel:'gpt-6-luna',...(pin?{planningCallScaleVersion:1}:{}),roleModels:{'lean-planning':{model:'gpt-6.1-sol',reasoningEffort:'high'}},fallbackModels:{'lean-planning':{model:'gpt-6-luna',reasoningEffort:'high'}},reasoningBackground:true,reasoningStore:true,reasoningTimeoutMs:1800000,maxOutputTokens:25000,maxRecoveryOutputTokens:50000,reasoningCallLimits:{planningMs:240000,reviewMs:240000,queuedMs:90000,retryMinimumMs:120000,pollMaxIntervalMs:4000}});
 let clock=0;const cancels=[],directLimits=[];p.sleep=async ms=>{clock+=ms;};
 p.sendReasoning=async(b,timeout)=>{if(b.background)return {ok:true,json:async()=>({id:'resp_bg',status:'in_progress'})};directLimits.push(timeout);return completed('resp_backup',{ok:true});};
 p.retrieveReasoning=async id=>{clock+=4000;return {ok:true,json:async()=>({id,status:'in_progress',output:[]})};};
 p.cancelReasoning=async id=>{cancels.push(clock);return {ok:true,json:async()=>({id,status:'cancelled'})};};
 const saved=new Map(),budget={reserve:async()=>{},receipt:async()=>{},remainingMs:async()=>40*60*1000,loadResponse:async(k,key)=>structuredClone(saved.get(key)),saveResponse:async(k,key,v)=>{saved.set(key,structuredClone(v));},waiting:async()=>{}};
 return {run:async(kind='lean-planning')=>{const realNow=Date.now;Date.now=()=>1e12+clock;try{await p.reason({contextKind:kind,callPages:pages,instructions:'plan',input:{},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}},budget);}finally{Date.now=realNow;}return {cancel:cancels[0],direct:directLimits[0]};}};
}
test('planning call limit grows with the number of images on new jobs, up to 8 minutes, and the backup gets the same limit',async()=>{
 const big=await scaled({pin:true,pages:14}).run();
 assert.ok(big.cancel>=480000&&big.cancel<490000,'a 14-image plan waits 8 minutes: '+big.cancel);
 assert.ok(big.direct<=480000&&big.direct>240000,'the backup model gets the same longer limit: '+big.direct);
 const six=await scaled({pin:true,pages:6}).run();
 assert.ok(six.cancel>=340000&&six.cancel<350000,'6 images: 4 min + 5 x 20 s: '+six.cancel);
 const one=await scaled({pin:true,pages:1}).run();
 assert.ok(one.cancel>=240000&&one.cancel<250000,'one image keeps 4 minutes: '+one.cancel);
 const old=await scaled({pin:false,pages:14}).run();
 assert.ok(old.cancel>=240000&&old.cancel<250000,'earlier jobs keep their fixed limit: '+old.cancel);
 const review=await scaled({pin:true,pages:14}).run('lean-review');
 assert.ok(review.cancel>=240000&&review.cancel<250000,'reviews are per image and keep their own limit: '+review.cancel);
});
test('new lean jobs pin the scaled planning limit; the snapshot keeps it',()=>{
 const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.planningCallScaleVersion,1);
 assert.equal(pc.snapshot(c).planningCallScaleVersion,1);assert.equal(pc.snapshot({}).planningCallScaleVersion,undefined);
});
// User decision, 10 Nov 2026 ("switch image checks to direct sending"): in the A+ rerun, 10 of 13 image checks sent
// through OpenAI's background queue stalled past the 4-minute limit, while the same checks sent directly finished in
// about 23 s. New jobs pin directCheckVersion 1: image checks (lean-review) are sent directly, never through the
// queue, with the review call limit as their timeout. Planning keeps the queue (it can be confirmed cancelled).
function checkRun({pin,kind}){
 const p=new OpenAIProvider({reasoningModel:'gpt-6-luna',...(pin?{directCheckVersion:1}:{}),reasoningBackground:true,reasoningStore:true,reasoningTimeoutMs:900000,maxOutputTokens:25000,maxRecoveryOutputTokens:50000,reasoningCallLimits:{planningMs:240000,reviewMs:240000,queuedMs:90000,retryMinimumMs:120000,pollMaxIntervalMs:4000}});
 const sent=[];p.sleep=async()=>{};
 p.sendReasoning=async(b,timeout)=>{sent.push({body:structuredClone(b),timeout});return b.background?{ok:true,json:async()=>({id:'resp_bg',status:'completed',output:[{content:[{type:'output_text',text:'{"ok":true}'}]}]})}:completed('resp_direct',{ok:true});};
 p.retrieveReasoning=async id=>completed(id,{ok:true});
 const receipts=[],saved=new Map(),budget={reserve:async()=>{},receipt:async r=>receipts.push(r),remainingMs:async()=>40*60*1000,loadResponse:async(k,key)=>structuredClone(saved.get(key)),saveResponse:async(k,key,v)=>{saved.set(key,structuredClone(v));},waiting:async()=>{}};
 return p.reason({contextKind:kind,instructions:'check',input:{},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}},budget).then(()=>({sent,receipts}));
}
test('image checks on new jobs are sent directly, not through the background queue; planning and older jobs keep the queue',async()=>{
 const check=await checkRun({pin:true,kind:'lean-review'});
 assert.equal(check.sent.length,1,'one request only');
 assert.equal(check.sent[0].body.background,undefined,'no background queue');assert.equal(check.sent[0].body.store,false);
 assert.ok(check.sent[0].timeout<=240000,'the review call limit is its timeout: '+check.sent[0].timeout);
 assert.equal(check.receipts[0].requestId,'resp_direct');assert.equal(check.receipts[0].handoff.directCheck,true,'the receipt says it was sent directly');
 const plan=await checkRun({pin:true,kind:'lean-planning'});assert.equal(plan.sent[0].body.background,true,'planning keeps the queue');
 const old=await checkRun({pin:false,kind:'lean-review'});assert.equal(old.sent[0].body.background,true,'earlier jobs keep the queue');
});
test('new lean jobs pin direct image checks; the snapshot keeps it',()=>{
 const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.directCheckVersion,1);
 assert.equal(pc.snapshot(c).directCheckVersion,1);assert.equal(pc.snapshot({}).directCheckVersion,undefined);
});
test('a Re-run check is sent directly even on an older job without the direct-check pin',async()=>{
 const p=new OpenAIProvider({reasoningModel:'gpt-6-luna',reasoningBackground:true,reasoningStore:true,reasoningTimeoutMs:900000,maxOutputTokens:25000,maxRecoveryOutputTokens:50000,reasoningCallLimits:{planningMs:240000,reviewMs:240000,queuedMs:90000,retryMinimumMs:120000,pollMaxIntervalMs:4000}});
 const sent=[];p.sleep=async()=>{};p.sendReasoning=async(b,timeout)=>{sent.push({body:structuredClone(b),timeout});return completed('resp_direct',{ok:true});};
 const saved=new Map(),receipts=[],budget={reserve:async()=>{},receipt:async r=>receipts.push(r),remainingMs:async()=>40*60*1000,loadResponse:async(k,key)=>structuredClone(saved.get(key)),saveResponse:async(k,key,v)=>{saved.set(key,structuredClone(v));},waiting:async()=>{}};
 await p.reason({contextKind:'lean-review',directCheck:true,maxProviderRequests:1,instructions:'check',input:{},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}},budget);
 assert.equal(sent.length,1);assert.equal(sent[0].body.background,undefined);assert.equal(sent[0].body.store,false);assert.ok(sent[0].timeout<=240000);
 assert.equal(receipts[0].handoff.directCheck,true);
});
