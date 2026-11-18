'use strict';
// Regression (19 Nov 2026, live QA): a Sleepyhead A+ Brand Story (brand only, no product) planned all five pages, then
// failed at the first picture with "Image provider request failed (400): Invalid 'images': empty array". Every image
// request went to the edits endpoint, which needs at least one input picture; a brand-only page has none. A request
// with no input picture and no mask now goes to the generations endpoint; requests with pictures are unchanged.
// Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const {OpenAIProvider}=require('../../lib/creative-ai/runtime/provider'),{ExecutionClient,executeClaim}=require('../../lib/creative-ai/distributed/execution');
const BRANDS=['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'];
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
async function fixture(t,brandId,attachments){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'brand-only-image-')),dir=path.join(root,'output/creative-ai/jobs/creative-fixture');t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'job.json'),JSON.stringify({intake:{brandId}}));
 const bytes=await sharp({create:{width:64,height:64,channels:3,background:'#5b6b8c'}}).png().toBuffer();let reserved=0;const saved=new Map();
 return {bytes,get reserved(){return reserved},request:{prompt:'A brand-world background with soft morning light. Synthetic fixture.',size:'1536x1024',requestKey:hash(brandId+attachments),attachments:attachments?[{assetId:'brand-logo',imageData:'data:image/png;base64,'+bytes.toString('base64')}]:[]},budget:{brandContext:async()=>({intake:{brandId},dir}),remainingMs:async()=>10000,reserve:async()=>{reserved++},receipt:async()=>{},loadResponse:async(k,key)=>saved.get(key)||null,saveResponse:async(k,key,v)=>{saved.set(key,v);}}};
}
for(const brandId of BRANDS){
 test(brandId.slice(0,14)+': a brand-only picture with no input image is created through the generations endpoint',async t=>{
  const f=await fixture(t,brandId,false),original=global.fetch,calls=[];
  global.fetch=async(url,o={})=>{calls.push(url);const body=JSON.parse(o.body);assert.equal(o.headers['Content-Type'],'application/json');assert.equal(body.images,undefined);assert.equal(body.model,'gpt-image-2');assert.equal(body.size,'1536x1024');assert.equal(body.n,1);return Response.json({data:[{b64_json:f.bytes.toString('base64')}]},{headers:{'x-request-id':'req_fixture'}});};
  try{for(const transport of ['cdn-url','multipart']){const p=new OpenAIProvider({imageModel:'gpt-image-2',imageTimeoutMs:5000,imageInputTransport:transport,apiKey:'fixture-secret'});const r=await p.generate({...f.request,requestKey:hash(brandId+transport)},f.budget);assert.ok(r);}}finally{global.fetch=original;}
  assert.deepEqual(calls,['https://api.openai.com/v1/images/generations','https://api.openai.com/v1/images/generations']);assert.equal(f.reserved,2);
 });
 test(brandId.slice(0,14)+': a picture with an input image still uses the edits endpoint',async t=>{
  const f=await fixture(t,brandId,true),original=global.fetch,calls=[];
  global.fetch=async(url,o={})=>{calls.push(url);assert.ok(o.body instanceof FormData);assert.equal(o.body.getAll('image[]').length,1);return Response.json({data:[{b64_json:f.bytes.toString('base64')}]},{headers:{'x-request-id':'req_fixture'}});};
  try{await new OpenAIProvider({imageModel:'gpt-image-2',imageTimeoutMs:5000,imageInputTransport:'multipart',apiKey:'fixture-secret'}).generate(f.request,f.budget);}finally{global.fetch=original;}
  assert.deepEqual(calls,['https://api.openai.com/v1/images/edits']);
 });
 test(brandId.slice(0,14)+': the shared executor sends a picture-less image body to generations and one with pictures to edits',async()=>{
  for(const [body,endpoint] of [[{model:'gpt-image-2',prompt:'x',n:1},'images/generations'],[{model:'gpt-image-2',prompt:'x',n:1,images:[{image_url:'https://cdn2.gro.care/ref.png'}]},'images/edits']]){
   const scope=brandId+'/creative-wire',data=new Map();let state=null,url=null;
   const objects={put:async(s,b)=>{const ref={key:hash(b)};data.set(ref.key,Buffer.from(b));return ref;},get:async r=>data.get(r.key)};
   const coordinator={pool:{query:async()=>({rows:[{brand_id:brandId}]})},enqueue:async r=>{state={...r,job_id:r.jobId,request_key:r.requestKey,input_hash:r.inputHash,state:'leased',lease_token:'lease'};},get:async()=>state,dispatch:async()=>{state.state='dispatched';},heartbeat:async()=>{},complete:async(r,response)=>{state.state='completed';state.response=response;},unknown:async()=>{state.state='unknown';}};
   const client=new ExecutionClient(coordinator,objects),context={brandId,jobId:'creative-wire',limitUsd:30,reservationUsd:{reasoning:2,image:3},deadline:Date.now()+5000};
   const pending=client.execute({kind:'image',body,identityHash:hash('pixels'+endpoint),requestKey:hash(brandId+endpoint),context,timeoutMs:5000});while(!state)await new Promise(r=>setImmediate(r));
   await executeClaim(coordinator,objects,state,{apiKey:'fixture-key',fetchImpl:async u=>{url=u;return new Response(JSON.stringify({data:[{b64_json:'eA=='}]}),{headers:{'x-request-id':'provider-fixture'}});}});
   await pending;assert.equal(url,'https://api.openai.com/v1/'+endpoint);void scope;
  }
 });
}
