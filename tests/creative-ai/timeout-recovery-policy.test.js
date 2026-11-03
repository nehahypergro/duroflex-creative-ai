'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {OpenAIProvider}=require('./offline-provider.cjs');
test('request defaults allow fifteen minutes while keeping the original campaign limits',()=>{
 const c=require('../../lib/creative-ai/runtime/config').loadConfig('/nonexistent-fixture');
 assert.equal(c.imageTimeoutMs,900000);assert.equal(c.reasoningTimeoutMs,900000);assert.equal(c.jobTimeoutMs,2700000);assert.equal(c.inputTokenCountTimeoutMs,30000);
 assert.equal(require('../../lib/creative-ai/runtime/handoff-metrics').limits({},{}).timeout,900000);
});
for(const brandId of ['Duroflex','Sleepyhead'])test(brandId+': assembled review recovers one truncated response with separately accounted requests',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'review-token-recovery-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));let posts=0;const reservations=[],receipts=[],saved=new Map();
 const provider=new OpenAIProvider({reasoningModel:'fixture',reasoningTimeoutMs:1000,maxOutputTokens:25000,maxRecoveryOutputTokens:50000});
 provider.sendReasoning=async()=>({ok:true,json:async()=>++posts===1?{id:'resp_cut',status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[],usage:{output_tokens:4000}}:{id:'resp_ok',status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({observations:['readability','copy-fit','logo','subject-occlusion','photograph'].map(check=>({check,status:'pass',evidence:'Fixture observed pixels'})),corrections:[]})}]}]}});
 const doc={schemaVersion:1,engine:'fabric-6',brandId,canvas:{width:100,height:100},objects:[{id:'photo',role:'photograph',type:'image',left:0,top:0,width:100,height:100}],assets:[],fonts:[]};
 const runtime={provider,store:{dir:()=>dir,save:async(id,name,v)=>fs.writeFile(path.join(dir,name),JSON.stringify(v))}},budget={reserve:async(kind,key)=>reservations.push({kind,key}),receipt:async r=>receipts.push(r),loadResponse:async(k,key)=>saved.get(key),saveResponse:async(k,key,v)=>saved.set(key,v)};
 const result=await require('../../lib/creative-ai/runtime/editable-quality').reviewOnce(runtime,'id','unit',doc,{data:'fixture',measurements:[]},{exactCopy:{fields:[]},artDirection:{},attachmentManifest:[]},budget);
 assert.equal(result.status,'complete',result.error);assert.equal(posts,2);assert.equal(reservations.length,2);assert.notEqual(reservations[0].key,reservations[1].key);assert.equal(receipts.length,2);
 await require('../../lib/creative-ai/runtime/editable-quality').reviewOnce(runtime,'id','unit',doc,{data:'fixture',measurements:[]},{exactCopy:{fields:[]},artDirection:{},attachmentManifest:[]},budget);assert.equal(posts,2);
});
test('image timeout recovers a matching late saved response without a second POST',async t=>{
 const previous=global.fetch;t.after(()=>{global.fetch=previous;});let calls=0,reserves=0,state,late=false;const key='a'.repeat(64),json={data:[{b64_json:'YQ=='}],usage:{}};
 global.fetch=async()=>{calls++;late=true;throw new DOMException('fixture timeout','TimeoutError');};
 const provider=new OpenAIProvider({imageModel:'fixture',imageTimeoutMs:1000});
 const budget={reserve:async()=>reserves++,receipt:async()=>{},imageWaiting:async v=>{state=v;},loadResponse:async()=>late?{version:1,inputHash:state?.inputHash,json}:null};
 const out=await provider.generate({prompt:'Fixture image',attachments:[],size:'1024x1024',requestKey:key},budget);
 assert.match(out.imageData,/YQ==/);assert.equal(calls,1);assert.equal(reserves,1);assert.equal(state.status,'recovered');
});
test('unknown image outcome stays blocked on restart and retains its identity',async t=>{
 const previous=global.fetch;t.after(()=>{global.fetch=previous;});let calls=0,reserves=0;const states=[];const key='b'.repeat(64);
 global.fetch=async()=>{calls++;throw new DOMException('fixture timeout','TimeoutError');};
 const provider=new OpenAIProvider({imageModel:'fixture',imageTimeoutMs:1000}),budget={reserve:async()=>reserves++,receipt:async()=>{},imageWaiting:async v=>states.push(v),requestStatus:async()=>reserves?{kind:'image',key}:null,loadResponse:async()=>null};
 const req={prompt:'Fixture image',attachments:[],size:'1024x1024',requestKey:key};
 await assert.rejects(provider.generate(req,budget),e=>e.code==='IMAGE_OUTCOME_UNKNOWN');
 await assert.rejects(provider.generate(req,budget),e=>e.code==='IMAGE_OUTCOME_UNKNOWN');
 assert.equal(calls,1);assert.equal(reserves,1);assert.equal(states.at(-1).requestKey,key);assert.equal(states.at(-1).chargeStatus,'unknown');
});
test('review HTTP recovery and output recovery share two requests across restarts',async()=>{
 const saved=new Map(),reserved=[],provider=new OpenAIProvider({reasoningModel:'fixture',reasoningTimeoutMs:10000,maxOutputTokens:100,maxRecoveryOutputTokens:200});let posts=0;
 provider.sendReasoning=async()=>++posts===1?{ok:false,status:503,headers:new Headers(),json:async()=>({error:{code:'server_error'}})}:{ok:true,json:async()=>({id:'resp_cut',status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[]})};
 const budget={reserve:async(k,key)=>reserved.push(key),receipt:async()=>{},saveResponse:async(k,key,v)=>saved.set(key,v),loadResponse:async(k,key)=>saved.get(key)},request={maxProviderRequests:2,instructions:'fixture',input:{},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}};
 await assert.rejects(provider.reason(request,budget),e=>e.code==='REASONING_OUTPUT_LIMIT');assert.equal(posts,2);assert.equal(reserved.length,2);
 await assert.rejects(provider.reason(request,budget),e=>e.code==='REASONING_OUTPUT_LIMIT');assert.equal(posts,2);assert.equal(reserved.length,2);
});
test('output recovery cannot add a third HTTP retry',async()=>{
 const saved=new Map(),provider=new OpenAIProvider({reasoningModel:'fixture',reasoningTimeoutMs:10000,maxOutputTokens:100,maxRecoveryOutputTokens:200});let posts=0,reserves=0;
 provider.sendReasoning=async()=>++posts===1?{ok:true,json:async()=>({id:'resp_cut',status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[]})}:{ok:false,status:503,headers:new Headers(),json:async()=>({error:{code:'server_error'}})};
 const budget={reserve:async()=>reserves++,receipt:async()=>{},saveResponse:async(k,key,v)=>saved.set(key,v),loadResponse:async(k,key)=>saved.get(key)};
 await assert.rejects(provider.reason({maxProviderRequests:2,instructions:'fixture',input:{},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}},budget),e=>e.code==='PROVIDER_HTTP_ERROR');assert.equal(posts,2);assert.equal(reserves,2);
});
test('manual image reconciliation recovers shared output without dispatch and rejects another brand',async()=>{
 const key='c'.repeat(64),inputHash='d'.repeat(64),responses=new Map(),updates=[];let recoveries=0;
 const runtime={active:new Set(),store:{read:async()=>({status:'partial',intake:{brandId:'Duroflex'},imageWaits:{[key]:{requestKey:key,inputHash,status:'attention'}}}),budget:()=>({dispatchContext:async()=>({jobId:'id',brandId:'Duroflex'}),loadResponse:async(k,key)=>responses.get(key),saveResponse:async(k,key,v)=>responses.set(key,v),imageWaiting:async v=>updates.push(v)})},provider:{distributed:{client:{recover:async input=>{recoveries++;assert.equal(input.identityHash,inputHash);return new Response(JSON.stringify({data:[{b64_json:'YQ=='}]}),{status:200});},execute:async()=>assert.fail('Reconciliation cannot submit paid work')}}}};
 const R=require('../../lib/creative-ai/runtime/image-response-recovery');
 await assert.rejects(R.reconcile(runtime,'id','Sleepyhead'),/different brand/);assert.equal(recoveries,0);
 const result=await R.reconcile(runtime,'id','Duroflex');assert.equal(result.recovered,1);assert.equal(result.paidRequests,0);assert.equal(responses.get(key).inputHash,inputHash);assert.equal(updates.at(-1).status,'recovered');
});
test('repair review allowance and charges survive reload without increasing campaign limits',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'review-allowance-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const {JobStore}=require('../../lib/creative-ai/runtime/store'),store=new JobStore(root),key='e'.repeat(64),id='creative-budget';
 await store.save(id,'job.json',{id,intake:{brandId:'Duroflex'},componentRepairs:{[key]:{status:'repairing',deadline:Date.now()+60000,calls:1,maxCalls:3,imageCalls:1,maxImageCalls:1,maximumUsd:7,reservedUsd:3,requestKeys:[]}},budget:{reasoningCalls:0,maxReasoningCalls:40,imageCalls:1,maxImageCalls:4,imageReservations:[],receipts:[],estimatedSpend:{maxUsd:10,reservedUsd:3,reasoningUsd:2,imageUsd:3,reservations:[]},deadline:Date.now()+60000}});
 const b=store.budget(id,{componentKey:key});assert.equal(await b.reviewAllowance(),2);await b.reserve('reasoning','a'.repeat(64));assert.equal(await b.reviewAllowance(),1);await b.reserve('reasoning','b'.repeat(64));
 const reloaded=new JobStore(root);assert.equal(await reloaded.budget(id,{componentKey:key}).reviewAllowance(),0);await assert.rejects(reloaded.budget(id,{componentKey:key}).reserve('reasoning','c'.repeat(64)),/allowance/);
 const job=await reloaded.read(id);assert.equal(job.budget.estimatedSpend.maxUsd,10);assert.equal(job.budget.estimatedSpend.reservedUsd,7);assert.equal(job.budget.maxReasoningCalls,40);
});
