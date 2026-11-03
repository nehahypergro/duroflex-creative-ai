'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
const {inspect}=require('../../lib/creative-ai/runtime/pdp-review-batches');
test('independent review batches overlap with a bounded limit and overview waits for all',async()=>{
 const bytes=await sharp({create:{width:8,height:8,channels:3,background:'white'}}).png().toBuffer();let active=0,max=0,completed=0;
 const rows=Array.from({length:12},(_,i)=>({index:i+1,placementId:'p'+i,role:'test',imageUrl:'x.png',bytes}));
 await inspect({rows,previews:[],binding:'overlap',load:async()=>null,save:async()=>{},budget:{},request:{instructions:'test',input:{set:{slots:rows},manifest:rows},validate:()=>{}},provider:{reason:async req=>{if(req.input.batchObservations){assert.equal(completed,3);}else{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,20));active--;completed++;}return {checks:[{criterion:'product-truth',status:'pass',evidence:'fixture'}]};}}});assert.equal(max,2);
});
test('whole-set pass cannot override a failed or unknown master/preview batch; saved batches resume',async()=>{
 const bytes=await sharp({create:{width:16,height:16,channels:3,background:'white'}}).png().toBuffer();
 const rows=Array.from({length:12},(_,i)=>({index:i+1,placementId:'p'+i,role:'test',imageUrl:'static-'+i+'.png',bytes}));
 const previews=rows.map(r=>({id:'pdp-mobile-'+r.index,imageData:'data:image/png;base64,'+bytes.toString('base64')}));
 const memory=new Map(),seen=[],request={instructions:'Synthetic review',input:{set:{slots:rows},manifest:rows.map(({bytes,...r})=>r)},validate:o=>assert.equal(o.checks.length,2)};
 let calls=0;const provider={reason:async req=>{calls++;assert.ok(req.images.length<=8);seen.push(...req.images.map(x=>x.id));return {checks:[{criterion:'product-truth',status:calls===1?'fail':'pass',evidence:'Synthetic fixture'},{criterion:'mobile-readability',status:calls===2?'unknown':'pass',evidence:'Synthetic fixture'}]};}};
 const args={rows,previews,request,provider,budget:{},binding:'test',load:async n=>memory.get(n),save:async(n,v)=>memory.set(n,v)};
 const result=await inspect(args);assert.equal(calls,4);assert.deepEqual(result.checks.map(c=>c.status),['fail','unknown']);
 for(let i=1;i<=12;i++){assert.ok(seen.includes('pdp-slot-'+i));assert.ok(seen.includes('pdp-mobile-'+i));}
 await inspect(args);assert.equal(calls,5);assert.equal(memory.size,3);
});
test('PDP work fills four unit slots while other formats retain their configured concurrency',async()=>{
 const pdp=require('../../lib/creative-ai/runtime/pdp'),scheduler=require('../../lib/creative-ai/runtime/unit-scheduler');
 const config={maxConcurrentUnits:2},selection=[{description:{pdp:{}}}];assert.equal(pdp.outputConcurrency(config,[]),2);
 let active=0,peak=0;await scheduler.run(Array.from({length:8},(_,i)=>({conceptId:'c',placementId:String(i)})),{limit:pdp.outputConcurrency(config,selection),execute:async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,10));active--;}});assert.equal(peak,4);assert.equal(config.maxConcurrentUnits,2);
});
