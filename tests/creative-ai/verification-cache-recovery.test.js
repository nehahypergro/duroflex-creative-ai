'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {OpenAIProvider}=require('./offline-provider.cjs'),{JobStore}=require('../../lib/creative-ai/runtime/store');
const recovery=require('../../lib/creative-ai/runtime/review-recovery');
const schema={type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false};
const envelope=(id,text,cut=false)=>({id,status:cut?'incomplete':'completed',...(cut?{incomplete_details:{reason:'max_output_tokens'}}:{}),output:[{content:[{type:'output_text',text}]}],usage:{input_tokens:10,output_tokens:10}});
async function setup(t,brandId){
 brandId='brand-'+brandId.toLowerCase();
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'verification-cache-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const config={reasoningModel:'fixture',reasoningTimeoutMs:1000,maxOutputTokens:1000,maxRecoveryOutputTokens:2000,maxReasoningCalls:20,jobTimeoutMs:60000,estimatedSpend:{maxUsd:20,reasoningUsd:1,imageUsd:2}};
 const store=new JobStore(path.join(root,'jobs')),job=await store.create({brandId},config,[]);
 const provider=new OpenAIProvider(config);
 const request={contextKind:'review',instructions:'Inspect fixture pixels. Unknown evidence must remain unknown.',input:{brandId,ocr:{status:'measured',rows:[{text:'Fixture',confidence:.99}]}},schema};
 return {store,job,provider,request,dir:store.dir(job.id),budget:store.budget(job.id)};
}
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': exhausted response recovery stops automatic and button retries without losing receipts',async t=>{
 const c=await setup(t,brand);let sends=0,inspections=0;
 c.provider.sendReasoning=async()=>({ok:true,json:async()=>envelope('resp_'+(++sends),'{',true)});
 const options={dir:c.dir,key:'original',packageHash:'p',artifactHash:'a',inspect:()=>{inspections++;return c.provider.reason(c.request,c.budget);}};
 await assert.rejects(recovery.inspectWithRecovery(options),e=>e.code==='REASONING_OUTPUT_LIMIT'&&!recovery.retryable(e));
 assert.equal(inspections,1,'Outer recovery must not replay exhausted provider responses');assert.equal(sends,2);
 const before=await c.store.read(c.job.id);assert.equal(before.budget.receipts.length,2);
 assert.equal(before.budget.receipts[1].requestIntent.kind,'corrective');assert.equal(before.budget.receipts[1].requestIntent.reason,'output-limit');
 await assert.rejects(recovery.inspectWithRecovery(options),e=>!recovery.retryable(e));
 // Even a stale client requesting another outer scope cannot create a new paid attempt.
 await assert.rejects(recovery.inspectWithRecovery({...options,key:'manual'}),e=>!recovery.retryable(e));
 assert.equal(sends,2);const after=await c.store.read(c.job.id);assert.deepEqual(after.budget,before.budget);
 assert.equal(await recovery.available({dir:c.dir,key:'original',failure:{error:'fetch failed',retryable:true}}),false);
});
test('a corrective request deliberately changes output allowance and instructions; restart resumes it',async t=>{
 const c=await setup(t,'Duroflex'),bodies=[];let dispatches=0;
 c.provider.sendReasoning=async body=>{bodies.push(body);return {ok:true,json:async()=>++dispatches===1?envelope('resp_cut','{',true):envelope('resp_good','{"ok":true}')};};
 assert.deepEqual(await c.provider.reason(c.request,c.budget),{ok:true});
 assert.deepEqual(bodies.map(b=>b.max_output_tokens),[1000,2000]);assert.notDeepEqual(bodies[0].input,bodies[1].input);
 const before=await c.store.read(c.job.id);assert.deepEqual(await c.provider.reason(c.request,new JobStore(c.store.root).budget(c.job.id)),{ok:true});assert.equal(dispatches,2);
 assert.deepEqual((await c.store.read(c.job.id)).budget,before.budget);
});
test('one-call allowance also applies to malformed JSON',async t=>{
 const c=await setup(t,'Sleepyhead');let sends=0;c.provider.sendReasoning=async()=>({ok:true,json:async()=>envelope('resp_'+(++sends),'{')});
 await assert.rejects(c.provider.reason({...c.request,maxProviderRequests:1},c.budget),e=>e.code==='INVALID_AGENT_JSON'&&!recovery.retryable(e));assert.equal(sends,1);
});
test('legacy exhausted failures cannot advertise retry even with the old retryable flag',()=>{
 for(const error of ['The agent response was cut off at its output limit after one bounded retry. Saved work is preserved.','The agent returned incomplete or invalid JSON after one bounded retry. Saved work is preserved.'])assert.equal(recovery.retryable({message:error,retryableReview:true}),false);
});
test('OCR is frozen per image, package and algorithm across concurrent calls and restarts',async t=>{
 const c=await setup(t,'Sleepyhead'),snapshots=require('../../lib/creative-ai/runtime/review-ocr-snapshot');let calls=0;
 const options={dir:c.dir,record:{packageHash:'package',exactCopy:{fields:[{id:'headline',text:'Fixture'}]}},measurement:{artifactHash:'pixels'},recognize:async()=>({status:'measured',rows:[{text:'Fixture',confidence:1-(++calls)/100}]})};
 const [a,b]=await Promise.all([snapshots.load(options),snapshots.load(options)]);assert.deepEqual(a,b);assert.equal(calls,1);
 assert.deepEqual(await snapshots.load(options),a);assert.equal(calls,1);
 await snapshots.load({...options,measurement:{artifactHash:'changed-pixels'}});assert.equal(calls,2);
 await snapshots.load({...options,record:{...options.record,packageHash:'changed-package'}});assert.equal(calls,3);
});
test('malformed saved responses also stop outer retries',async t=>{
 const c=await setup(t,'Duroflex');let sends=0,inspections=0;c.provider.sendReasoning=async()=>({ok:true,json:async()=>envelope('resp_'+(++sends),'{')});
 await assert.rejects(recovery.inspectWithRecovery({dir:c.dir,key:'malformed',packageHash:'p',artifactHash:'a',inspect:()=>{inspections++;return c.provider.reason(c.request,c.budget);}}),e=>e.code==='INVALID_AGENT_JSON'&&!recovery.retryable(e));
 assert.equal(sends,2);assert.equal(inspections,1);
});
test('remaining budget can resume a saved initial response and its previously unsent correction',async t=>{
 const c=await setup(t,'Sleepyhead');let sends=0,reservations=0;
 c.provider.sendReasoning=async()=>({ok:true,json:async()=>++sends===1?envelope('resp_cut','{',true):envelope('resp_good','{"ok":true}')});
 const interrupted={...c.budget,reserve:async(...args)=>{if(++reservations===2)throw Error('Job time budget reached');return c.budget.reserve(...args);}};
 await assert.rejects(c.provider.reason(c.request,interrupted),/time budget/);assert.equal(sends,1);
 assert.deepEqual(await c.provider.reason(c.request,c.budget),{ok:true});assert.equal(sends,2);
 const j=await c.store.read(c.job.id);assert.equal(j.budget.reasoningCalls,2);assert.equal(j.budget.estimatedSpend.reservedUsd,2);
});
test('unknown network outcome never submits a replacement on resume',async t=>{
 const c=await setup(t,'Duroflex');let sends=0;c.provider.sendReasoning=async()=>{sends++;throw new TypeError('fetch failed');};
 await assert.rejects(c.provider.reason(c.request,c.budget),e=>e.recovery.mode==='reconcile'&&!recovery.retryable(e));
 await assert.rejects(c.provider.reason(c.request,c.budget),e=>e.code==='AMBIGUOUS_PROVIDER_REQUEST');assert.equal(sends,1);
 assert.equal((await c.store.read(c.job.id)).budget.reasoningCalls,1);
});
test('saved pending response is retrieved, never replaced; waiting does not exhaust correction allowance',async t=>{
 const c=await setup(t,'Sleepyhead'),transport=require('../../lib/creative-ai/runtime/reasoning-transport');
 const key='a'.repeat(64),operation='b'.repeat(64);await c.budget.reserve('reasoning',key);
 await c.budget.saveResponse('reasoning',key,{version:1,operation,attempt:0,json:{id:'resp_waiting',status:'in_progress'}});
 let remaining=0,gets=0;const budget={...c.budget,remainingMs:async()=>remaining};
 const options={dir:c.dir,key:'pending',packageHash:'p',artifactHash:'a',inspect:()=>transport({key,operation,attempt:0,budget,durablePending:true,send:()=>assert.fail('Must not POST'),prepare:()=>assert.fail('Must not prepare a replacement'),retrieve:async()=>{gets++;return {ok:true,json:async()=>envelope('resp_waiting','{"ok":true}')};},sleep:async()=>{}})};
 for(let n=0;n<4;n++)await assert.rejects(recovery.inspectWithRecovery(options),e=>e.code==='REASONING_PENDING'&&recovery.retryable(e));
 const journal=JSON.parse(await fs.readFile(path.join(c.dir,'review-recovery-pending.json')));assert.equal(journal.attempts.length,1);
 assert.equal(await recovery.available({dir:c.dir,key:'pending',failure:{retryable:true}}),true);
 remaining=5000;const outcome=await recovery.inspectWithRecovery(options);assert.equal(outcome.json.status,'completed');assert.equal(gets,1);
 assert.equal((await c.store.read(c.job.id)).budget.reasoningCalls,1);
});
for(const expiredWindow of [false,true])test('a stale retry button is rejected before spending: '+(expiredWindow?'expired window':'exhausted response'),async t=>{
 const c=await setup(t,'Duroflex'),{CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),fixture=await require('../../lib/creative-ai/creative-reviewer/examples/synthetic').inputExample({pending:true}),record=fixture.package;
 const {artifactHash}=await require('../../lib/creative-ai/graphic-designer/results').inspectArtifact(fixture.artifact.imageData),prefix=record.route+'-'+record.placementId;
 await c.store.update(c.job.id,j=>{j.selection=[{id:record.placementId}];j.results=[{route:record.route,placementId:record.placementId,verificationRetryAvailable:true}];return j;});
 for(const [name,value] of Object.entries({['package-'+prefix+'-0.json']:record,['review-'+prefix+'-0.json']:{evidenceMode:'pending'},['review-error-'+prefix+'-0.json']:{error:'The agent response was cut off at its output limit after one bounded retry. Saved work is preserved.',retryable:true},['static-'+prefix+'-0.png']:Buffer.from(fixture.artifact.imageData.split(',')[1],'base64')}))await c.store.save(c.job.id,name,value);
 if(expiredWindow){await c.store.save(c.job.id,'review-error-'+prefix+'-0.json',{error:'fetch failed',retryable:true});await c.store.update(c.job.id,j=>{j.verificationBudgets={[prefix]:{deadline:0}};return j;});}
 const runtime=Object.create(CreativeRuntime.prototype);runtime.store=c.store;runtime.reviews={read:async()=>({finalReportHash:'none',currentArtifactHash:artifactHash,currentPackageHash:record.packageHash}),reserveVerification:()=>assert.fail('Must not reserve a retry')};runtime.inspect=()=>assert.fail('Must not inspect');
 c.store.beginVerificationBudget=()=>assert.fail('Must not open an allowance');
 await assert.rejects(runtime.retryChecks(c.job.id,{route:record.route,placementId:record.placementId}),e=>e.code==='VERIFICATION_RECOVERY_EXHAUSTED');
 assert.equal((await c.store.read(c.job.id)).budget.reasoningCalls,0);
});

test('resumed inspection validates the saved wording revision, not a new recovery revision',async()=>{
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),wording=require('../../lib/creative-ai/runtime/wording-agreement'),old=wording.assertCurrent,stop=Error('Stop before inspection');
 wording.assertCurrent=async(runtime,id,record,attempt)=>{assert.equal(attempt,1);throw stop;};
 try{await assert.rejects(CreativeRuntime.prototype.inspect.call({},'fixture',{}, {imageData:'saved'}, {}, {},'recovery',{sourceAttempt:1}),e=>e===stop);}finally{wording.assertCurrent=old;}
});
