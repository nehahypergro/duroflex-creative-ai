'use strict';
// Regression from the live Sleepyhead batch (17 Nov 2026): landing page modules (Bamboo Terry protector) stayed blocked
// with "A paid request has no saved response. Reconcile its outcome before retrying" after a server restart, with no
// way forward. User decision (17 Nov 2026): one explicit "Continue anyway" accepts that request's outcome as unknown and
// runs the step under a new request identity. Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),resume=require('../../lib/creative-ai/runtime/resume-work');
for(const brandId of ['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'])test('Continue anyway unblocks a step whose paid request has no saved answer, once and explicitly: '+brandId,async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'continue-anyway-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),scheduled=[],runtime={root,store,config:{jobTimeoutMs:60000},active:new Set(),pending:[],schedule:id=>scheduled.push(id)};
 const job=await store.create({brandId,conceptRoutes:['continuity']},{jobTimeoutMs:60000,maxReasoningCalls:10,estimatedSpend:{maxUsd:20,reasoningUsd:2,imageUsd:3}},[{id:'a'}]);
 const key='9'.repeat(64);await store.budget(job.id).reserve('reasoning',key);
 await store.update(job.id,j=>{j.status='failed';j.error='Processing stopped because the Studio process ended.';j.errorCode='PROCESSING_INTERRUPTED';j.budget.deadline=Date.now()+30*60e3;return j;});
 const before=await store.read(job.id,{hydrate:false});
 const info=await resume.inspect(runtime,job.id,brandId);
 assert.equal(info.canResume,false);assert.equal(info.blockedRequestKey,key);assert.equal(info.continueAnyway.requestKey,key);assert.match(info.continueAnyway.warning,/may also have been charged.*stays marked unknown/);assert.match(info.continueAnyway.message,/never saved its answer/);assert.doesNotMatch(info.continueAnyway.message+info.continueAnyway.warning,/no replacement will be submitted/,'the panel never contradicts its button');assert.equal(info.continueAnyway.estimateBasis,'reservation allowance (upper bound)');
 await assert.rejects(resume.resume(runtime,job.id,{brandId,token:'wrong',continueAnyway:key}),/Recovery state changed/);
 await assert.rejects(resume.resume(runtime,job.id,{brandId,token:info.continueAnyway.token}),/no saved response/,'a plain Continue stays blocked');
 await resume.resume(runtime,job.id,{brandId,token:info.continueAnyway.token,continueAnyway:key});
 const after=await store.read(job.id,{hydrate:false});assert.equal(after.status,'queued');assert.deepEqual(scheduled,[job.id]);
 const a=after.budget.abandonedRequests['reasoning:'+key];assert.equal(a.chargeStatus,'unknown');assert.equal(a.reason,'continue-anyway');assert.match(a.replacementKey,/^[a-f0-9]{64}$/);
 assert.deepEqual(after.budget.requestStates,before.budget.requestStates,'the earlier reservation stays recorded');
 const budget=store.budget(job.id);assert.equal(await budget.continuationKey('reasoning',key),a.replacementKey);
 await budget.reserve('reasoning',a.replacementKey);await assert.rejects(budget.reserve('reasoning',key),/already reserved/);
});
test('the transport sends a blocked step under its replacement identity',async()=>{
 const transport=require('../../lib/creative-ai/runtime/reasoning-transport'),keys=[];
 const out=await transport({key:'1'.repeat(64),operation:'plan',attempt:0,budget:{reserve:async(k,key)=>keys.push(key),loadResponse:async()=>null,saveResponse:async()=>{},continuationKey:async(kind,key)=>key==='1'.repeat(64)?'2'.repeat(64):key},prepare:async()=>{},send:async()=>({ok:true,json:async()=>({status:'completed',output:[]})})});
 assert.equal(out.json.status,'completed');assert.deepEqual(keys,['2'.repeat(64)]);
});
