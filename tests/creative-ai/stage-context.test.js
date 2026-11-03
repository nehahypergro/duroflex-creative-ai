'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path');
const context=require('../../lib/creative-ai/runtime/stage-context'),{JobStore}=require('../../lib/creative-ai/runtime/store');
for(const brandId of ['brand-duroflex','brand-sleepyhead'])for(const stage of Object.keys(context.purposes))test(stage+' retains exact evidence for '+brandId,()=>{
 const rule={brandId,text:'Exact qualified wording — only for selected Queen variant. '.repeat(30),sourceIds:['official-product'],status:'supported',mandatory:true};
 const input={brief:'Keep exact copy',rule,previous:{rule},optional:{status:'draft',text:'Advisory only'},unknowns:['No independent issuer audit']},before=structuredClone(input);
 const packed=context.compile(stage,input,{brandId});assert.deepEqual(context.expand(packed.input),input);assert.deepEqual(input,before);assert(packed.metrics.savedBytes>0);
 assert.throws(()=>context.compile(stage,input,{brandId:'brand-other'}),/Cross-brand/);
});
test('small inputs stay intact and corrupt references fail closed',()=>{
 assert.deepEqual(context.pack({text:'small'}).input,{text:'small'});
 const x={text:'locked'.repeat(300)},packed=context.pack({a:x,b:x}).input;packed.sharedContext[Object.keys(packed.sharedContext)[0]].text='changed';assert.throws(()=>context.expand(packed),/hash/);
 assert.throws(()=>context.pack({$stageContextRef:'source collision'}),/Reserved/);
});
test('new-job opt in never changes a historical/reused job',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'stage-context-')),store=new JobStore(path.join(root,'jobs')),config={maxReasoningCalls:2,jobTimeoutMs:10000};
 try{const old=await store.create({brandId:'brand-duroflex',requestKey:'old-context-request'},config,[]);assert.equal((await store.budget(old.id).stageContext()).version,0);
 const reused=await store.create(old.intake,{...config,stageContextVersion:1},[]);assert.equal(reused.stageContextVersion,undefined);
 const next=await store.create({brandId:'brand-sleepyhead'},{...config,stageContextVersion:1},[]);assert.equal((await store.budget(next.id).stageContext()).version,1);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('selected reader does not hydrate irrelevant missing images',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'stage-select-')),file=path.join(root,'input.json');
 try{await fs.writeFile(file,JSON.stringify({facts:[{text:'Exact qualified claim'}],unused:{$studioRaster:{brandId:'brand-other',sha256:'a'.repeat(64)}}}));
 assert.deepEqual(await context.readSelected(file,x=>x.facts,{brandId:'brand-duroflex'}),[{text:'Exact qualified claim'}]);
 await assert.rejects(()=>context.readSelected(file,x=>x.unused,{brandId:'brand-duroflex'}),/Cross-brand/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('provider records opted-in context diagnostics without altering legacy request keys',async()=>{
 const {OpenAIProvider}=require('../../lib/creative-ai/runtime/provider'),originalFetch=global.fetch,keys=[],receipts=[],diagnostics=[];
 global.fetch=async()=>({ok:true,json:async()=>({id:'mock-context',status:'completed',output:[{content:[{type:'output_text',text:'{"ok":true}'}]}]})});
 const provider=new OpenAIProvider({reasoningModel:'gpt-6-luna',reasoningTimeoutMs:1000,maxOutputTokens:100,maxRecoveryOutputTokens:100,inputContextPreflight:false});
 const request={instructions:'Test',input:{first:{values:Array(100).fill('qualified')},second:{values:Array(100).fill('qualified')}},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}};
 const budget={reserve:async(kind,key)=>keys.push(key),receipt:async r=>receipts.push(r),contextDiagnostic:async(key,value)=>diagnostics.push(value)};
 try{await provider.reason(request,budget);await provider.reason(request,{...budget,stageContext:async()=>({version:0,brandId:'brand-duroflex'})});assert.equal(keys[0],keys[1]);assert.equal(diagnostics.length,0);
 await provider.reason(request,{...budget,stageContext:async()=>({version:1,brandId:'brand-duroflex'})});assert.notEqual(keys[2],keys[0]);assert.equal(diagnostics.length,1);assert.equal(receipts[2].optimisation.stageContext.version,1);
 }finally{global.fetch=originalFetch;}
});
