'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),{OpenAIProvider}=require('./offline-provider.cjs');
const base=()=>({apiKey:'private-old',reasoningModel:'model-old',imageModel:'image-old',roleModels:{strategy:{model:'strategy-old',reasoningEffort:'medium'}},maxOutputTokens:100,maxRecoveryOutputTokens:400,reasoningTimeoutMs:5000,imageTimeoutMs:5000,inputContextPreflight:false,maxReasoningCalls:20,jobTimeoutMs:60000,estimatedSpend:{maxUsd:100,reasoningUsd:1,imageUsd:1}});
const schema={type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false};
const request=brand=>({instructions:'Respect supplied facts.',contextKind:'strategy',input:{brandId:'brand-'+brand},schema});
async function setup(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'job-config-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return new JobStore(path.join(root,'output/creative-ai/jobs'));}
function sender(p,bodies){p.sendReasoning=async body=>{bodies.push(body);return {ok:true,json:async()=>({id:'resp_'+bodies.length,status:'completed',output:[{content:[{type:'output_text',text:'{"ok":true}'}]}],usage:{output_tokens:10}})};};}
for(const brand of ['duroflex','sleepyhead'])test(brand+': pinned models, effort and limits survive config mutation and restart without another paid send',async t=>{
 const store=await setup(t),config=base(),job=await store.create({brandId:'brand-'+brand},config,[]),p=new OpenAIProvider(config),bodies=[];sender(p,bodies);
 // Mutate both the original config and the provider before the FIRST request.
 config.roleModels.strategy.model='mutated-source';Object.assign(p.config,{reasoningModel:'model-new',roleModels:{strategy:{model:'strategy-new',reasoningEffort:'high'}},maxOutputTokens:200,maxRecoveryOutputTokens:800});
 await p.reason(request(brand),store.budget(job.id));assert.equal(bodies[0].model,'strategy-old');assert.equal(bodies[0].reasoning.effort,'medium');assert.equal(bodies[0].max_output_tokens,100);
 const restarted=new OpenAIProvider({...p.config,apiKey:'rotated-private',maxOutputTokens:300});sender(restarted,bodies);await restarted.reason(request(brand),store.budget(job.id));assert.equal(bodies.length,1,'resume must reuse the paid response');assert.equal((await store.read(job.id)).budget.reasoningCalls,1);
 const saved=(await store.read(job.id)).runtimeConfig;assert.equal(saved.maxRecoveryOutputTokens,400);assert.equal(saved.reasoningTimeoutMs,5000);assert(!JSON.stringify(saved).includes('private'));assert.equal(saved.roleModels.strategy.model,'strategy-old');
});
test('one provider can process concurrent jobs with different pinned models',async t=>{
 const store=await setup(t),a=await store.create({brandId:'brand-duroflex'},base(),[]),b=await store.create({brandId:'brand-sleepyhead'},{...base(),roleModels:{strategy:{model:'other-model',reasoningEffort:'low'}}},[]),p=new OpenAIProvider(base()),bodies=[];sender(p,bodies);
 await Promise.all([p.reason(request('duroflex'),store.budget(a.id)),p.reason(request('sleepyhead'),store.budget(b.id))]);assert.deepEqual(bodies.map(x=>x.model).sort(),['other-model','strategy-old']);assert.equal(p.config.roleModels.strategy.model,'strategy-old');
});
test('historical paid job with missing runtime limits is not silently redispatched under guessed settings',async t=>{
 const store=await setup(t),job=await store.create({},base(),[]);await store.update(job.id,j=>{j.runtimeConfig={reasoningModel:'old',imageModel:'old-image',roleModels:{}};j.budget.reasoningCalls=1;return j;});const p=new OpenAIProvider(base()),bodies=[];sender(p,bodies);
 await assert.rejects(p.reason(request('duroflex'),store.budget(job.id)),e=>e.code==='JOB_PROVIDER_CONFIG_UNVERIFIED');assert.equal(bodies.length,0);assert.equal((await store.read(job.id)).budget.reasoningCalls,1);
});
test('image dispatch and saved-image recovery use the pinned model after deployment changes',async t=>{
 const store=await setup(t),job=await store.create({},base(),[{id:'square'}]),p=new OpenAIProvider({...base(),imageModel:'new-image'}),bytes=await require('sharp')({create:{width:8,height:8,channels:3,background:'#ffffff'}}).png().toBuffer(),bodies=[],original=global.fetch;
 global.fetch=async(url,options)=>{assert.match(url,/images\/edits$/);bodies.push(options.body);return {ok:true,headers:new Headers(),json:async()=>({data:[{b64_json:bytes.toString('base64')}],usage:{}})};};t.after(()=>global.fetch=original);
 const args={prompt:'A product photograph.',attachments:[{assetId:'product',imageData:'data:image/png;base64,'+bytes.toString('base64')}],size:'1024x1024',requestKey:'a'.repeat(64)};
 const first=await p.generate(args,store.budget(job.id));assert.equal(first.model,'image-old');assert.equal(bodies[0].get('model'),'image-old');p.config.imageModel='third-image';const second=await p.generate(args,store.budget(job.id));assert.equal(second.imageData,first.imageData);assert.equal(bodies.length,1);assert.equal((await store.read(job.id)).budget.imageCalls,1);
});
test('two approved image options stay pinned at high quality and resume separately',async t=>{
 const store=await setup(t),config=require('../../lib/creative-ai/runtime/lean-policy').configure(base(),{leanWorkflowVersion:1}),job=await store.create({},config,[{id:'square'}]),p=new OpenAIProvider({...base(),imageModel:'changed-live'}),bytes=await require('sharp')({create:{width:8,height:8,channels:3,background:'#ffffff'}}).png().toBuffer(),bodies=[],original=global.fetch;
 global.fetch=async(url,options)=>{bodies.push(options.body);return {ok:true,headers:new Headers(),json:async()=>({data:[{b64_json:bytes.toString('base64')}],usage:{}})};};t.after(()=>global.fetch=original);
 for(const [i,model] of config.imageOptionModels.entries()){
  const args={prompt:'A selected product photograph.',attachments:[{assetId:'product',imageData:'data:image/png;base64,'+bytes.toString('base64')}],size:model==='gpt-image-2'?'1024x1024':'auto',model,quality:'high',requestKey:String(i+1).repeat(64)};
  await p.generate(args,store.budget(job.id));p.config.imageOptionModels=[];await p.generate(args,store.budget(job.id));
 }
 assert.deepEqual(bodies.map(b=>b.get('model')),config.imageOptionModels);assert(bodies.every(b=>b.get('quality')==='high'));assert.equal((await store.read(job.id)).budget.imageCalls,2);
 await assert.rejects(p.generate({prompt:'Unapproved',attachments:[],model:'unapproved-model',quality:'high',size:'auto',requestKey:'f'.repeat(64)},store.budget(job.id)),/not allowed/);assert.equal(bodies.length,2);
});
test('model access checks use the saved model list while API credentials remain live',async t=>{
 const store=await setup(t),job=await store.create({},base(),[]),p=new OpenAIProvider({...base(),apiKey:'rotated-private',reasoningModel:'unavailable-new',roleModels:{strategy:{model:'unavailable-new'}}}),original=global.fetch;
 global.fetch=async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer rotated-private');return {ok:true,json:async()=>({data:['model-old','strategy-old','image-old'].map(id=>({id}))})};};t.after(()=>global.fetch=original);
 assert.equal((await p.checkAccess(store.budget(job.id))).configured,true);
});
test('an unpaid legacy job can bind missing settings once without replacing its saved models',async t=>{
 const store=await setup(t),job=await store.create({},base(),[]);await store.update(job.id,j=>{j.runtimeConfig={reasoningModel:'historical-model',imageModel:'historical-image',roleModels:{}};return j;});
 const p=new OpenAIProvider(base()),bodies=[];sender(p,bodies);await p.reason(request('duroflex'),store.budget(job.id));assert.equal(bodies[0].model,'historical-model');assert.equal((await store.read(job.id)).runtimeConfig.providerConfigVersion,1);
});
test('output recovery retains job settings when live configuration changes during the first call',async t=>{
 const store=await setup(t),job=await store.create({},base(),[]),p=new OpenAIProvider(base()),bodies=[];
 p.sendReasoning=async body=>{bodies.push(body);const first=bodies.length===1;Object.assign(p.config,{reasoningModel:'changed',roleModels:{strategy:{model:'changed',reasoningEffort:'high'}},maxOutputTokens:500,maxRecoveryOutputTokens:1000});return {ok:true,json:async()=>({id:'resp_'+bodies.length,status:first?'incomplete':'completed',...(first?{incomplete_details:{reason:'max_output_tokens'}}:{}),output:[{content:[{type:'output_text',text:first?'{':'{"ok":true}'}]}],usage:{output_tokens:90}})};};
 await p.reason(request('duroflex'),store.budget(job.id));assert.equal(bodies.length,2);assert(bodies[1].max_output_tokens>100);assert(bodies[1].max_output_tokens<=400);assert(bodies.every(b=>b.model==='strategy-old'&&b.reasoning.effort==='medium'));
 await new OpenAIProvider(p.config).reason(request('duroflex'),store.budget(job.id));assert.equal((await store.read(job.id)).budget.reasoningCalls,2,'restart replays both responses without dispatch');
});
