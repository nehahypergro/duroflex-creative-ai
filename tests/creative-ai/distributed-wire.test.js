'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {ExecutionClient,executeClaim}=require('../../lib/creative-ai/distributed/execution');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
for(let i=0;i<10;i++)test('shared request '+i+' recovers exact response without repeating dispatch',async()=>{
 const brand=i%2?'sleepyhead':'duroflex',kind=i%3?'reasoning':'image',scope='brand-'+brand+'/creative-wire',data=new Map();let sent=0,state=null,dispatches=0;
 const objects={put:async(s,b)=>{assert.equal(s,scope);const ref={key:hash(b)};data.set(ref.key,Buffer.from(b));return ref;},get:async(r,s)=>{assert.equal(s,scope);return data.get(r.key);}};
 const coordinator={pool:{query:async()=>({rows:[{brand_id:'brand-'+brand}]})},enqueue:async r=>{assert.equal(state,null);state={...r,job_id:r.jobId,request_key:r.requestKey,input_hash:r.inputHash,state:'leased',lease_token:'lease'};},get:async()=>state,dispatch:async()=>{dispatches++;state.state='dispatched';},heartbeat:async()=>{},complete:async(r,response)=>{state.state='completed';state.response=response;},unknown:async()=>{state.state='unknown';}};
 const client=new ExecutionClient(coordinator,objects),body={model:'fixture',input:'exact '+brand},identityHash=kind==='image'?hash('stable pixels'):undefined,context={brandId:'brand-'+brand,jobId:'creative-wire',limitUsd:30,reservationUsd:{reasoning:2,image:3},deadline:Date.now()+5000},requestKey=hash('request-'+i);
 const pending=client.execute({kind,body,identityHash,requestKey,context,timeoutMs:5000});while(!state)await new Promise(r=>setImmediate(r));
 await executeClaim(coordinator,objects,state,{apiKey:'fixture-key',fetchImpl:async(url,options)=>{sent++;assert.match(url,/^https:\/\/api.openai.com\/v1\/(responses|images\/edits)$/);assert.deepEqual(JSON.parse(options.body),body);return new Response(JSON.stringify({output:'exact response '+i}),{headers:{'x-request-id':'provider-fixture'}});}});
 assert.equal((await (await pending).json()).output,'exact response '+i);
 for(let j=0;j<3;j++)assert.equal((await (await client.recover({kind,body,identityHash,requestKey,context})).json()).output,'exact response '+i);
 assert.equal(sent,1);assert.equal(dispatches,1);
 await assert.rejects(()=>client.recover({kind,body:{...body,input:'changed'},identityHash:identityHash?hash('changed'):undefined,requestKey,context}),/input mismatch/);
});
test('ambiguous worker failure keeps the request unknown and never retries fetch',async()=>{
 let sent=0,unknown=0;const bytes=Buffer.from(JSON.stringify({kind:'image',body:{model:'fixture'}})),request={job_id:'creative-wire',kind:'image',request_key:hash('image'),input_hash:hash(bytes),payload:{},deadline:new Date(Date.now()+5000)};
 const coordinator={pool:{query:async()=>({rows:[{brand_id:'brand-duroflex'}]})},dispatch:async()=>{},heartbeat:async()=>{},unknown:async()=>unknown++};
 await assert.rejects(()=>executeClaim(coordinator,{get:async()=>bytes},request,{apiKey:'fixture',fetchImpl:async()=>{sent++;throw Error('connection lost after upload');}}),/connection lost/);assert.equal(sent,1);assert.equal(unknown,1);
});
test('reasoning recovery imports a saved worker response before any local reservation',async()=>{
 let saved,dispatches=0,reserves=0;const output=await require('../../lib/creative-ai/runtime/reasoning-transport')({key:hash('recover'),operation:'same-operation',attempt:0,budget:{loadResponse:async()=>saved,saveResponse:async(k,id,v)=>saved=v,reserve:async()=>reserves++},prepare:async()=>{},send:async()=>dispatches++,recover:async()=>new Response(JSON.stringify({id:'already-finished'}))});assert.equal(output.json.id,'already-finished');assert.equal(saved.operation,'same-operation');assert.equal(reserves,0);assert.equal(dispatches,0);
});
test('production settings reject insecure database and object endpoints',()=>{
 const {settings}=require('../../lib/creative-ai/distributed/settings'),base={CREATIVE_AI_EXECUTION_BACKEND:'postgres',CREATIVE_AI_DATABASE_URL:'postgres://user:example@db.example/creative',CREATIVE_AI_ARTIFACT_BUCKET:'private-fixture'};
 assert.equal(settings(base).ssl.rejectUnauthorized,true);assert.throws(()=>settings({...base,CREATIVE_AI_DATABASE_URL:base.CREATIVE_AI_DATABASE_URL+'?sslmode=disable'}),/TLS/);assert.throws(()=>settings({...base,CREATIVE_AI_S3_ENDPOINT:'http://remote.example'}),/HTTPS/);assert.throws(()=>settings({...base,CREATIVE_AI_DISTRIBUTED_LOCAL_TEST:'1'}),/loopback/);
});
test('shared review recovery uses its authorized new window while retaining the original money cap',async()=>{
 const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{JobStore}=require('../../lib/creative-ai/runtime/store');const root=await fs.mkdtemp(path.join(os.tmpdir(),'shared-window-'));try{const store=new JobStore(path.join(root,'jobs')),job=await store.create({brandId:'brand-duroflex'},{distributed:{},jobTimeoutMs:1,maxReasoningCalls:10,estimatedSpend:{maxUsd:30,reasoningUsd:2,imageUsd:3}},[]);await store.beginVerificationBudget(job.id,'review-one');const context=await store.budget(job.id,{verificationKey:'review-one'}).dispatchContext();assert.ok(context.deadline>job.budget.deadline);assert.equal(context.limitUsd,30);const historic=await store.create({brandId:'brand-sleepyhead'},{jobTimeoutMs:1000,maxReasoningCalls:10},[]);await assert.rejects(()=>store.budget(historic.id).dispatchContext(),/historical job/);}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('private storage aborts a stalled upload without returning a saved reference',async()=>{
 const {ObjectStore}=require('../../lib/creative-ai/distributed/object-store');let calls=0;const store=new ObjectStore({send:async(command,{abortSignal})=>{calls++;assert.ok(abortSignal instanceof AbortSignal);await require('node:timers/promises').setTimeout(1000,null,{signal:abortSignal});}},'fixture',{timeoutMs:10});await assert.rejects(()=>store.put('brand-duroflex/creative-wire',Buffer.from('fixture')),e=>e.name==='AbortError');assert.equal(calls,1);
});
test('private storage also bounds a download after its response headers arrive',async()=>{
 const {ObjectStore}=require('../../lib/creative-ai/distributed/object-store'),bytes=Buffer.from('complete'),scope='brand-sleepyhead/creative-wire',sha256=hash(bytes);const store=new ObjectStore({send:async()=>({Body:(async function*(){yield bytes.subarray(0,1);await require('node:timers/promises').setTimeout(50);yield bytes.subarray(1);})()})},'fixture',{timeoutMs:10});await assert.rejects(()=>store.get({key:'creative-execution/'+scope+'/'+sha256,sha256,bytes:bytes.length},scope),e=>e.name==='TimeoutError');
});
