'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cache=require('../../lib/creative-ai/runtime/prompt-cache');
for(const brandId of ['brand-duroflex','brand-sleepyhead'])test(brandId+': equivalent object order preserves all evidence and cache identity',()=>{
 const options={brandId,stage:'copy',model:'fixture',instructions:'Keep exact copy',schema:{type:'object'}};
 const a={brandId,z:{qualifier:'Only Queen — 72 × 60',claim:'Exact'},rules:['second','first'],unknown:null};
 const b={unknown:null,rules:['second','first'],z:{claim:'Exact',qualifier:'Only Queen — 72 × 60'},brandId};
 const x=cache.prepare(a,options),y=cache.prepare(b,options);
 assert.equal(x.key,y.key);assert.equal(x.text,y.text);assert.deepEqual(JSON.parse(x.text),a);assert.deepEqual(a.rules,['second','first']);
 assert.notEqual(cache.prepare({...a,rules:['first','second']},options).key,x.key);
 assert.throws(()=>cache.prepare(a,{...options,brandId:'other'}),/Cross-brand/);
 assert.notEqual(cache.prepare(a,{...options,instructions:'Changed'}).key,x.key);
});
test('unknown usage stays unknown, and cached tokens are validated',()=>{
 assert.deepEqual(cache.usage({}),{cacheWriteTokens:null,inputTokens:null,cachedTokens:null,cachedInputFraction:null});
 assert.equal(cache.usage({input_tokens:100,input_tokens_details:{cached_tokens:80}}).cachedInputFraction,.8);
 assert.equal(cache.usage({input_tokens:100,input_tokens_details:{cached_tokens:101}}).cachedTokens,null);
});
test('cache policy pins new jobs and never upgrades a reused job',async()=>{
 const fs=require('fs/promises'),os=require('os'),path=require('path'),{JobStore}=require('../../lib/creative-ai/runtime/store');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'cache-policy-'));
 try{const store=new JobStore(path.join(root,'jobs')),intake={brandId:'brand-duroflex',requestKey:'cache-old-job'},config={jobTimeoutMs:10000,maxReasoningCalls:2};
 const old=await store.create(intake,config,[]);const reused=await store.create(intake,{...config,promptCacheVersion:1},[]);
 assert.equal(reused.promptCacheVersion,undefined);assert.equal((await store.budget(old.id).stageContext()).promptCacheVersion,0);
 const next=await store.create({...intake,requestKey:'cache-new-job'},{...config,promptCacheVersion:1},[]);
 assert.equal((await store.budget(next.id).stageContext()).promptCacheVersion,1);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('provider cache policy changes identity only for pinned requests and preserves results',async()=>{
 const {OpenAIProvider}=require('./offline-provider.cjs'),prior=global.fetch,bodies=[],receipts=[];
 global.fetch=async(url,opts)=>{bodies.push(JSON.parse(opts.body));return {ok:true,json:async()=>({id:'cache-'+bodies.length,status:'completed',usage:{input_tokens:100,input_tokens_details:{cached_tokens:80}},output:[{content:[{type:'output_text',text:'{"result":"Exact"}'}]}]})};};
 try{const provider=new OpenAIProvider({reasoningModel:'fixture',reasoningTimeoutMs:1000,maxOutputTokens:100,maxRecoveryOutputTokens:100,inputContextPreflight:false});
 for(const pin of [undefined,0,1]){const result=await provider.reason({instructions:'Keep exact',input:{brief:'Exact'},schema:{type:'object',properties:{result:{type:'string'}},required:['result'],additionalProperties:false}}, {stageContext:async()=>({version:0,brandId:'brand-duroflex',promptCacheVersion:pin}),reserve:async()=>{},receipt:async r=>receipts.push(r)});assert.equal(result.result,'Exact');}
 assert.deepEqual(bodies[0],bodies[1]);assert.equal(receipts[0].operationKey,receipts[1].operationKey);assert.notEqual(receipts[1].operationKey,receipts[2].operationKey);assert.match(bodies[2].prompt_cache_key,/^creative-pc1-/);assert.equal(receipts[2].optimisation.promptCache.cachedInputFraction,.8);
 }finally{global.fetch=prior;}
});
