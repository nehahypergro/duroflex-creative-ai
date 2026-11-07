'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {OpenAIProvider}=require('./offline-provider.cjs');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
const staging=require('../../lib/creative-ai/runtime/image-reference-stage');
const retry=require('../../lib/creative-ai/runtime/connect-retry');
const request={instructions:'Synthetic contract',input:{},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false},images:[{id:'source',label:'Exact SKU',imageData:'data:image/png;base64,'+Buffer.from('unchanged pixels').toString('base64')}]};

for(const brand of ['duroflex','sleepyhead'])test(brand+': reference failure spends nothing, successful retry is cached, original pixels stay unchanged',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'reasoning-media-'));
 const store=new JobStore(path.join(root,'jobs')),config={reasoningModel:'fixture',reasoningTimeoutMs:3000,maxOutputTokens:1000,maxReasoningCalls:10,jobTimeoutMs:60000,reasoningInputTransport:'cdn-url'};
 const job=await store.create({brandId:'brand-'+brand},config,[]),budget=store.budget(job.id),provider=new OpenAIProvider(config);
 const original=staging.stage;let transfers=0,dispatches=0;
 t.after(async()=>{staging.stage=original;await fs.rm(root,{recursive:true,force:true});});
 staging.stage=async(rasters,b)=>{
  transfers++;assert.equal((await b.brandContext()).intake.brandId,'brand-'+brand);
  assert.equal(rasters[0].bytes.toString(),'unchanged pixels');
  assert.equal((await store.read(job.id)).budget.reasoningCalls,0);
  if(transfers===1)throw Error('Interrupted media transfer');
  return [{url:'https://cdn2.gro.care/'+brand+'-fixture.png'}];
 };
 provider.sendReasoning=async body=>{
  dispatches++;assert.equal((await store.read(job.id)).budget.reasoningCalls,1);
  const part=body.input.flatMap(m=>m.content).find(p=>p.type==='input_image');
  assert.equal(part.image_url,'https://cdn2.gro.care/'+brand+'-fixture.png');assert.equal(part.detail,'high');
  return {ok:true,json:async()=>({id:'synthetic-'+brand,status:'completed',usage:{input_tokens:10,output_tokens:2},output:[{content:[{type:'output_text',text:'{"ok":true}'}]}]})};
 };
 await assert.rejects(provider.reason(request,budget),e=>e.code==='REASONING_REFERENCE_UPLOAD_FAILED');
 assert.equal(dispatches,0);assert.equal((await store.read(job.id)).budget.reasoningCalls,0);
 assert.deepEqual(await provider.reason(request,budget),{ok:true});
 assert.deepEqual(await provider.reason(request,store.budget(job.id)),{ok:true});
 assert.equal(transfers,2);assert.equal(dispatches,1);assert.equal((await store.read(job.id)).budget.receipts.length,1);
 assert.ok(request.images[0].imageData.startsWith('data:'));
});

const cases=[['EAI_AGAIN',null,true],['ENOTFOUND',null,true],['ECONNREFUSED',null,true],['UND_ERR_CONNECT_TIMEOUT',null,true],['EPIPE',{bytesWritten:0},false],['EPIPE',{bytesWritten:1000},false],['UND_ERR_SOCKET',{bytesWritten:0},false],['UND_ERR_SOCKET',{bytesWritten:14911973},false],['ECONNRESET',{bytesWritten:1024},false],['ETIMEDOUT',null,false],['ENOTFOUND',{bytesWritten:10},false]];
for(const [code,socket,safe] of cases)test('transport '+code+' '+JSON.stringify(socket)+' only retries proven pre-connect failure',async()=>{
 let calls=0;const error=Object.assign(new TypeError('fetch failed'),{cause:{code,socket}});
 const promise=retry(async()=>{calls++;if(calls===1)throw error;return 'recovered';},{sleep:async()=>{}});
 if(safe){assert.equal(await promise,'recovered');assert.equal(calls,2);}else{await assert.rejects(promise,e=>e===error);assert.equal(calls,1);}
});
test('persistent connection failure is bounded to two attempts',async()=>{
 let calls=0;await assert.rejects(retry(async()=>{calls++;throw Object.assign(Error('connect'),{code:'EAI_AGAIN'});},{sleep:async()=>{}}));assert.equal(calls,2);
});
for(const brand of ['duroflex','sleepyhead'])test(brand+': inline localization bypasses a rejected CDN URL without changing pixels',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'reasoning-inline-')),store=new JobStore(path.join(root,'jobs')),config={reasoningModel:'fixture',reasoningTimeoutMs:3000,maxOutputTokens:1000,maxReasoningCalls:10,jobTimeoutMs:60000,reasoningInputTransport:'cdn-url'},job=await store.create({brandId:'brand-'+brand},config,[]),provider=new OpenAIProvider(config),original=staging.stage;
 t.after(async()=>{staging.stage=original;await fs.rm(root,{recursive:true,force:true});});staging.stage=async()=>{throw Error('Inline path must not stage');};let calls=0;
 provider.sendReasoning=async body=>{calls++;assert.equal(body.input.flatMap(m=>m.content).find(p=>p.type==='input_image').image_url,request.images[0].imageData);return {ok:true,json:async()=>({id:'inline-'+brand,status:'completed',output:[{content:[{type:'output_text',text:'{"ok":true}'}]}]})};};
 assert.deepEqual(await provider.reason({...request,inlineImageInput:true},store.budget(job.id)),{ok:true});assert.deepEqual(await provider.reason({...request,inlineImageInput:true},store.budget(job.id)),{ok:true});assert.equal(calls,1);
});
