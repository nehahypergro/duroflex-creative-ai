'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),sharp=require('sharp');
const {OpenAIProvider}=require('../../lib/creative-ai/runtime/provider'),cdn=require('../../lib/creative-ai/runtime/cdn-media');
async function fixture(brand='brand-duroflex'){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'staged-image-')),dir=path.join(root,'output/creative-ai/jobs/creative-fixture');
 await fs.mkdir(dir,{recursive:true});await fs.mkdir(path.join(root,'config'));await fs.writeFile(path.join(root,'config/media-storage.json'),JSON.stringify({enabled:true,uploadUrl:cdn.ENDPOINT}));await fs.writeFile(path.join(dir,'job.json'),JSON.stringify({intake:{brandId:brand}}));
 const bytes=await sharp({create:{width:80,height:60,channels:3,background:'#769abc'}}).png().toBuffer();
 let reserved=0,receipts=[],saved=null;
 return {root,dir,bytes,get reserved(){return reserved},receipts,request:{prompt:'A synthetic transport fixture, no production content.',size:'1024x1024',requestKey:'a'.repeat(64),attachments:[{assetId:'sku-reference',imageData:'data:image/png;base64,'+bytes.toString('base64')}]},budget:{brandContext:async()=>({intake:{brandId:brand},dir}),remainingMs:async()=>10000,reserve:async()=>{reserved++},receipt:async r=>receipts.push(r),loadResponse:async()=>saved,saveResponse:async(k,key,v)=>{saved=v}},close:()=>fs.rm(root,{recursive:true,force:true})};
}
const provider=()=>new OpenAIProvider({imageModel:'gpt-image-2',imageTimeoutMs:5000,imageInputTransport:'cdn-url',apiKey:'fixture-secret'});
function mockTransport(f,{disconnectUpload=false,disconnectGeneration=false,corrupt=false}={}){
 const state={posts:0,generations:0,uploaded:null};
 state.fetch=async(url,o={})=>{
  if(url===cdn.ENDPOINT){state.posts++;assert.equal(f.reserved,0,'reference upload precedes the paid reservation');if(disconnectUpload&&state.posts===1)throw Object.assign(new TypeError('fetch failed'),{cause:{code:'ECONNRESET'}});state.uploaded=Buffer.from(await o.body.get('userFile').arrayBuffer());return Response.json({data:{fileUrl:'https://cdn2.gro.care/reference.png',storageKeyName:'reference.png'}});}
  if(url==='https://cdn2.gro.care/reference.png')return new Response(corrupt?Buffer.from('wrong bytes'):state.uploaded);
  assert.equal(url,'https://api.openai.com/v1/images/edits');state.generations++;
  assert.equal(o.headers['Content-Type'],'application/json');const body=JSON.parse(o.body);assert.deepEqual(body.images,[{image_url:'https://cdn2.gro.care/reference.png'}]);assert.equal(body.model,'gpt-image-2');assert.ok(Buffer.byteLength(o.body)<2048);assert.match(o.headers['X-Client-Request-Id'],/^[a-f0-9]{64}$/);
  if(disconnectGeneration)throw Object.assign(new TypeError('fetch failed'),{cause:{code:'ECONNRESET'}});
  return Response.json({data:[{b64_json:f.bytes.toString('base64')}]},{headers:{'x-request-id':'req_fixture'}});
 };return state;
}
test('paid image dispatch uses verified CDN references instead of a repeated multipart upload',async()=>{
 const f=await fixture(),original=global.fetch,m=mockTransport(f);global.fetch=m.fetch;try{await provider().generate(f.request,f.budget);assert.equal(m.posts,1);assert.equal(m.generations,1);assert.equal(f.reserved,1);await provider().generate(f.request,f.budget);assert.equal(m.generations,1,'saved image replay never resends');assert.equal(f.receipts[0].handoff.providerRequestId,'req_fixture');}finally{global.fetch=original;await f.close();}
});
test('an interrupted CDN upload recovers before reserving generation',async()=>{
 const f=await fixture(),original=global.fetch,m=mockTransport(f,{disconnectUpload:true});global.fetch=m.fetch;try{await provider().generate(f.request,f.budget);assert.equal(m.posts,2);assert.equal(m.generations,1);assert.equal(f.reserved,1);}finally{global.fetch=original;await f.close();}
});
test('wrong CDN bytes stop before any image charge',async()=>{
 const f=await fixture(),original=global.fetch,m=mockTransport(f,{corrupt:true});global.fetch=m.fetch;let diagnostic;f.budget.referenceFailure=async(key,d)=>{diagnostic=d;};try{await assert.rejects(provider().generate(f.request,f.budget),{code:'IMAGE_REFERENCE_UPLOAD_FAILED'});assert.equal(m.generations,0);assert.equal(f.reserved,0);assert.equal(diagnostic.generationDispatched,false);assert.equal(diagnostic.imageReservationCreated,false);assert.equal(JSON.stringify(diagnostic).includes('fixture-secret'),false);}finally{global.fetch=original;await f.close();}
});
test('lost generation response is never automatically resent after successful staging',async()=>{
 const f=await fixture(),original=global.fetch,m=mockTransport(f,{disconnectGeneration:true});global.fetch=m.fetch;let diagnostic;f.budget.transportFailure=async(k,key,d)=>diagnostic=d;try{await assert.rejects(provider().generate(f.request,f.budget),/fetch failed/);assert.equal(m.posts,1);assert.equal(m.generations,1);assert.equal(f.reserved,1);assert.equal(diagnostic.chargeStatus,'unknown');assert.equal(diagnostic.automaticRetry,false);}finally{global.fetch=original;await f.close();}
});

test('cached reference objects are reused within a brand and reverified on each fresh dispatch',async()=>{
 const f=await fixture(),original=global.fetch,m=mockTransport(f);global.fetch=m.fetch;try{
  await provider().generate(f.request,f.budget);
  const freshBudget={...f.budget,loadResponse:async()=>null,reserve:async()=>{}};
  await provider().generate({...f.request,requestKey:'b'.repeat(64)},freshBudget);
  assert.equal(m.posts,1);assert.equal(m.generations,2);
 }finally{global.fetch=original;await f.close();}
});
test('staging is blocked without brand ownership or when the CDN is disabled',async()=>{
 const f=await fixture(),original=global.fetch;global.fetch=async()=>assert.fail('No network dispatch');try{
  await assert.rejects(provider().generate(f.request,{...f.budget,brandContext:undefined}),{code:'IMAGE_REFERENCE_UPLOAD_FAILED'});
  await assert.rejects(provider().generate(f.request,{...f.budget,brandContext:async()=>({intake:{brandId:'brand-sleepyhead'},dir:f.dir})}),{code:'IMAGE_REFERENCE_UPLOAD_FAILED'});
  await fs.writeFile(path.join(f.root,'config/media-storage.json'),JSON.stringify({enabled:false}));
  await assert.rejects(provider().generate(f.request,f.budget),{code:'IMAGE_REFERENCE_UPLOAD_FAILED'});assert.equal(f.reserved,0);
 }finally{global.fetch=original;await f.close();}
});
test('ten reference variants across both brands preserve bytes and attachment order',async()=>{
 const original=global.fetch;
 try{for(let i=0;i<10;i++){
  const f=await fixture(i%2?'brand-sleepyhead':'brand-duroflex'),objects=new Map();let posts=0,paid=0;
  try{
   const format=['png','jpeg','webp'][i%3],bytes=await sharp({create:{width:100+i*8,height:60+i*3,channels:i%2?4:3,background:{r:i*20,g:80,b:160,alpha:0.5}}}).toFormat(format).toBuffer();
   f.request.attachments=[{assetId:'sku-'+i,imageData:'data:image/'+format+';base64,'+bytes.toString('base64')},f.request.attachments[0]];
   global.fetch=async(url,o={})=>{
    if(url===cdn.ENDPOINT){posts++;const file=o.body.get('userFile'),body=Buffer.from(await file.arrayBuffer()),link='https://cdn2.gro.care/'+cdn.digest(body)+'.'+format;objects.set(link,body);return Response.json({data:{fileUrl:link,storageKeyName:new URL(link).pathname.slice(1)}});}
    if(objects.has(url))return new Response(objects.get(url));
    paid++;assert.equal(o.headers['Content-Type'],'application/json');const b=JSON.parse(o.body);assert.equal(b.images.length,2);assert.equal(f.reserved,1);
    const actual=objects.get(b.images[0].image_url),decoded=buffer=>sharp(buffer).ensureAlpha().raw().toBuffer();assert.deepEqual(await decoded(actual),await decoded(bytes));
    return Response.json({data:[{b64_json:f.bytes.toString('base64')}]});
   };
   await provider().generate(f.request,f.budget);assert.equal(posts,2);assert.equal(paid,1);
  }finally{await f.close();}
 }}finally{global.fetch=original;}
});
test('reference transfers bound retries, honor backoff budget, and do not retry permanent failures',async()=>{
 const {transferFetch}=require('../../lib/creative-ai/runtime/image-reference-stage');
 for(const status of [400,401,403,404,413]){let calls=0;const r=await transferFetch(Date.now()+10000,100,async()=>{calls++;return new Response('rejected',{status})})('https://cdn2.gro.care/x');assert.equal(r.status,status);assert.equal(calls,1);}
 let calls=0;await assert.rejects(transferFetch(Date.now()+2000,100,async()=>{calls++;return new Response('',{status:429,headers:{'retry-after':'30'}})})('https://cdn2.gro.care/x'),/remaining time/);assert.equal(calls,1);
 calls=0;await assert.rejects(transferFetch(Date.now()+10000,100,async()=>{calls++;throw new TypeError('fetch failed')})('https://cdn2.gro.care/x'),/fetch failed/);assert.equal(calls,3);
});
test('an interrupted CDN response body can be fetched again without repeating a paid request',async()=>{
 const {transferFetch}=require('../../lib/creative-ai/runtime/image-reference-stage');let calls=0;
 const r=await transferFetch(Date.now()+5000,20,async()=>{calls++;return calls===1?new Response(new ReadableStream({start(controller){controller.error(new TypeError('terminated'));}})):new Response('complete');})('https://cdn2.gro.care/x');assert.equal(await r.text(),'complete');assert.equal(calls,2);
});

test('concurrent identical sources publish once, while a new brand cannot borrow the receipt',async()=>{
 const {stage}=require('../../lib/creative-ai/runtime/image-reference-stage'),f=await fixture(),g=await fixture('brand-sleepyhead'),original=global.fetch;let posts=0;const b=f.bytes;
 global.fetch=async(url,o={})=>{if(url===cdn.ENDPOINT){posts++;return Response.json({data:{fileUrl:'https://cdn2.gro.care/shared.png',storageKeyName:'shared.png'}});}return new Response(b);};
 try{const rasters=[{assetId:'sku',type:'png',bytes:b}];const results=await Promise.all([stage(rasters,f.budget),stage(rasters,f.budget)]);assert.equal(posts,1);assert.deepEqual(results[0][0].sha256,results[1][0].sha256);await stage(rasters,g.budget);assert.equal(posts,2);}finally{global.fetch=original;await f.close();await g.close();}
});
test('a cached URL whose content changed blocks a later paid dispatch',async()=>{
 const f=await fixture(),original=global.fetch,m=mockTransport(f);global.fetch=m.fetch;try{
  await provider().generate(f.request,f.budget);const calls=m.generations;
  global.fetch=async(url,o)=>url==='https://cdn2.gro.care/reference.png'?new Response('tampered'):m.fetch(url,o);
  await assert.rejects(provider().generate({...f.request,requestKey:'b'.repeat(64)},{...f.budget,loadResponse:async()=>null}),{code:'IMAGE_REFERENCE_UPLOAD_FAILED'});
  assert.equal(m.generations,calls);assert.equal(f.reserved,1);
 }finally{global.fetch=original;await f.close();}
});
test('resuming an ambiguous paid key remains blocked after staging',async()=>{
 const f=await fixture(),original=global.fetch,m=mockTransport(f,{disconnectGeneration:true});global.fetch=m.fetch;let reservations=0;f.budget.reserve=async()=>{if(reservations++)throw Object.assign(Error('Already reserved'),{code:'AMBIGUOUS_PROVIDER_REQUEST'});};
 try{await assert.rejects(provider().generate(f.request,f.budget),/fetch failed/);await assert.rejects(provider().generate(f.request,f.budget),{code:'AMBIGUOUS_PROVIDER_REQUEST'});assert.equal(m.generations,1);assert.equal(m.posts,1);}finally{global.fetch=original;await f.close();}
});
for(const brand of ['brand-duroflex','brand-sleepyhead'])test(brand+': exhausted image credits stop the project without inventing usage receipts',async()=>{
 const f=await fixture(brand),original=global.fetch,m=mockTransport(f);let stop;
 f.budget.providerUnavailable=async failure=>{stop=failure;};global.fetch=async(url,o)=>url==='https://api.openai.com/v1/images/edits'?Response.json({error:{message:'You have no credits remaining.'}},{status:429}):m.fetch(url,o);
 try{await assert.rejects(provider().generate(f.request,f.budget),{code:'PROVIDER_CREDITS_EXHAUSTED'});assert.equal(stop.requestKey,f.request.requestKey);assert.equal(stop.status,429);assert.equal(f.reserved,1);assert.equal(f.receipts.length,0);}finally{global.fetch=original;await f.close();}
});
