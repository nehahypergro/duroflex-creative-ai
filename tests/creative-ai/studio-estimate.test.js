'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path');
const {estimateBrief}=require('../../lib/creative-ai/runtime/studio-estimate');
test('INR readiness estimate uses scoped known receipts, excludes inherited and unknown spend, and keeps FX basis',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-estimate-'));try{await fs.mkdir(path.join(root,'output/cost-tracking'),{recursive:true});await fs.writeFile(path.join(root,'output/cost-tracking/currency.json'),JSON.stringify({displayCurrency:'INR',usdToInr:90,rateDate:'2026-10-20',source:'https://example.test/fx'}));
 const receipt={kind:'image',model:'gpt-image-2',recordedAt:'2026-10-21T00:01:00Z',requestKey:'image-1',usage:{input_tokens:1000,output_tokens:5000,input_tokens_details:{text_tokens:500,image_tokens:500}}};
 const good={id:'good',status:'finished',createdAt:'2026-10-21T00:00:00Z',intake:{brandId:'duroflex',composedTextVersion:1},selection:[{description:{dimensions:{width:1080,height:1920}}}],results:[{imageUrl:'one'},{imageUrl:'two'}],budget:{receipts:[receipt,{...receipt,requestKey:'image-2'},{...receipt,recordedAt:'2026-10-19T00:00:00Z',usage:null}],requestStates:{}}};
 const unknown=structuredClone(good);unknown.id='unknown';unknown.budget.requestStates={lost:{kind:'reasoning',key:'lost',reservedAt:'2026-10-21T00:01:00Z'}};
 const bad=structuredClone(good);bad.id='missing';bad.budget.receipts[0].usage=null;
 const short=structuredClone(good);short.id='short';short.budget.imageCalls=5;
 const foreign={...good,id:'foreign',intake:{brandId:'sleepyhead'}};
 const runtime={root,config:{imageModel:'gpt-image-2',reasoningModel:'gpt-6-luna'},store:{list:async()=>[unknown,bad,short,foreign,good]}};
 const result=await estimateBrief(runtime,'duroflex',{width:1080,height:1920});assert.equal(result.status,'historical-estimate');assert.deepEqual(result.samples.map(s=>s.jobId),['good']);assert.equal(result.rateDate,'2026-10-20');assert.match(result.message,/₹14–₹15/);assert.match(result.message,/not a quote or confirmed bill/);
 assert.equal((await estimateBrief(runtime,'duroflex',{width:1080,height:1080})).status,'unavailable');runtime.store.list=async()=>[unknown,bad];assert.equal((await estimateBrief(runtime,'duroflex',{width:1080,height:1920})).low,undefined);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('only bounded same-studio editable preview URLs pass the asset guard',()=>{const {safeAsset}=require('../../public/creative-ai/studio-model');assert.ok(safeAsset('/creative-ai/api/jobs/creative-test/editable/continuity/square/preview?revision=2'));for(const url of ['https://other.test/x','/creative-ai/api/jobs/x/editable/continuity/square/preview?revision=2&url=https://other.test','/creative-ai/api/jobs/../editable/continuity/square/preview?revision=2'])assert.equal(safeAsset(url),'');});

// Regression (8 Nov 2026): the lean estimate rejected every run that used gpt-6.1-sol (the pinned
// lean planner) because its allowed reasoning models were hard-coded to gpt-6-astra/gpt-6-luna, so
// most formats showed "estimate unavailable". It now accepts the models the job itself pinned.
// Also: new jobs make one design per format, so a past two-option run is scaled to one option.
test('lean estimates use runs planned by the pinned planner and scale two-option runs to one design',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-estimate-lean-'));try{await fs.mkdir(path.join(root,'output/cost-tracking'),{recursive:true});await fs.writeFile(path.join(root,'output/cost-tracking/currency.json'),JSON.stringify({displayCurrency:'INR',usdToInr:100,rateDate:'2026-10-20',source:'https://example.test/fx'}));await fs.writeFile(path.join(root,'workspace.json'),JSON.stringify({artworkDelivery:'original',artworkWorkflow:'lean-v1'}));
 const at='2026-11-08T00:01:00Z',r=(kind,model,key,out)=>({kind,model,recordedAt:at,requestKey:key,usage:kind==='image'?{input_tokens:0,output_tokens:out,input_tokens_details:{text_tokens:0,image_tokens:0}}:{input_tokens:0,output_tokens:out}});
 const job={id:'two-option',status:'finished',createdAt:'2026-11-08T00:00:00Z',intake:{brandId:'duroflex',leanWorkflowVersion:1},runtimeConfig:{roleModels:{'lean-planning':{model:'gpt-6.1-sol'},'lean-review':{model:'gpt-6-luna'}},leanImageOptions:[{route:'continuity',model:'gpt-image-2'},{route:'exploration',model:'gpt-image-2.6-sunburst'}]},selection:[{description:{dimensions:{width:1080,height:1080}}}],results:[{imageUrl:'a'},{imageUrl:'b'}],
  budget:{receipts:[r('reasoning','gpt-6.1-sol','plan',100000),r('image','gpt-image-2','img-a',10000),r('image','gpt-image-2.6-sunburst','img-b',10000),r('reasoning','gpt-6-luna','rev-a',100000),r('reasoning','gpt-6-luna','rev-b',100000)],requestStates:{}}};
 const runtime={root,config:{imageModel:'gpt-image-2',reasoningModel:'gpt-6-luna'},store:{list:async()=>[job]}};
 const two=await estimateBrief(runtime,'duroflex',{width:1080,height:1080},2),one=await estimateBrief(runtime,'duroflex',{width:1080,height:1080},1);
 assert.equal(two.status,'historical-estimate','a run planned by gpt-6.1-sol is a valid sample');assert.equal(one.status,'historical-estimate');
 assert.ok(one.samples[0].inr<two.samples[0].inr,'one design costs less than two options');assert.equal(one.samples[0].adjustedFromOptions,2);assert.match(one.message,/one design per format/);assert.match(one.message,/scaled to one option/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
