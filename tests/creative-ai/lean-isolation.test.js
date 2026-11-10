'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),{JobStore}=require('../../lib/creative-ai/runtime/store'),{OpenAIProvider}=require('./offline-provider.cjs');
const base={apiKey:'offline',reasoningModel:'gpt-6-luna',imageModel:'gpt-image-2',roleModels:{art:{model:'unused-legacy-model',reasoningEffort:'high'}},maxOutputTokens:100,maxRecoveryOutputTokens:300,reasoningTimeoutMs:5000,maxReasoningCalls:20,jobTimeoutMs:60000};
const schema={type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false};
async function storeFor(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'lean-isolation-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return new JobStore(path.join(root,'jobs'));}
for(const brand of ['duroflex','sleepyhead'])test(brand+': lean wire preserves supported facts without legacy ownership or copy-check instructions',async t=>{
 const store=await storeFor(t),job=await store.create({brandId:'brand-'+brand,leanWorkflowVersion:1},policy.configure({...base,stageContextVersion:3,promptCacheVersion:1},{leanWorkflowVersion:1}),[]),p=new OpenAIProvider(base),bodies=[];
 p.sendReasoning=async body=>{bodies.push(body);return {ok:true,json:async()=>({id:'resp_'+bodies.length,status:'completed',output:[{content:[{type:'output_text',text:'{"ok":true}'}]}],usage:{output_tokens:5}})};};
 const input={brand:{mandatory:[{id:'font',text:'Approved Font Bold'}]},product:{facts:[{id:'sku-feature',text:'Supported feature with its exact qualifier',sourceIds:['official-page']}]}};
 for(const contextKind of ['lean-planning','lean-review','lean-correction'])await p.reason({contextKind,input,instructions:'Use the resolved contract.',schema,strictSchema:true,maxOutputTokens:100},store.budget(job.id));
 for(const body of bodies){const data=JSON.parse(body.input.at(-1).content[0].text.split('Return JSON matching this contract. ')[1]);assert.equal(data.input.handoffAuthority,undefined);assert.deepEqual(data.input.product.facts,input.product.facts);assert.doesNotMatch(JSON.stringify(body),/Copywriter owns|code computes exact-copy verdicts|creative director chooses/i);}
 // Image checker switched to gpt-6.1-sol medium for new jobs (user decision, 10 Nov 2026, checker trial).
 assert.deepEqual(bodies.map(b=>b.model),['gpt-6.1-sol','gpt-6.1-sol','gpt-6-luna']);assert.deepEqual(bodies.map(b=>b.reasoning.effort),['high','medium','medium']);
});
test('new lean jobs do not require unused legacy role-model access',async t=>{
 const store=await storeFor(t),config=policy.configure(base,{leanWorkflowVersion:1}),job=await store.create({leanWorkflowVersion:1},config,[]),p=new OpenAIProvider(base);
 t.mock.method(global,'fetch',async()=>({ok:true,json:async()=>({data:['gpt-6-luna','gpt-6.1-sol',...policy.options.map(o=>o.model)].map(id=>({id}))})}));
 assert.equal((await p.checkAccess(store.budget(job.id))).configured,true);assert.equal(config.roleModels.art,undefined);assert.equal(base.roleModels.art.model,'unused-legacy-model');
});
test('raster identity preparation needs approved font names, not editor binaries or unused logos',async()=>{
 const brand={id:'brand-duroflex',canvasAssets:{fonts:[{approved:true,brandId:'brand-duroflex',family:'Poppins',weight:700,style:'normal',filename:'no-file.ttf'}],logo:{filename:'missing-logo.png'}}},runtime={brands:{read:async()=>brand}};
 const intake={brandId:brand.id},selection=[{id:'web',description:{formatId:'studio-web-banner'},jobInputs:{logoPolicy:{treatment:'omit'}}}];
 const assets=await require('../../lib/creative-ai/runtime/lean-context').prerequisites(runtime,intake,selection);assert.equal(assets.fonts[0].family,'Poppins');
 brand.canvasAssets.fonts=[];await assert.rejects(()=>require('../../lib/creative-ai/runtime/lean-context').prerequisites(runtime,intake,selection),/Named approved brand fonts/);
 selection[0].jobInputs.formatIntent={textPolicy:'none'};assert.equal((await require('../../lib/creative-ai/runtime/lean-context').prerequisites(runtime,intake,selection)).fonts.length,0);
});
for(const name of ['duroflex','sleepyhead'])test(name+': raster identity snapshot passes the scoped provider without editor font files',async t=>{
 const brand={id:'brand-'+name,name,brandUrl:'https://'+name+'.example/',documents:[],assets:[],canvasAssets:{fonts:[{id:'asset-0123456789abcdef01234567',kind:'font',approved:true,brandId:'brand-'+name,family:'Approved Font',weight:700,style:'normal',filename:'missing.ttf',sourceReference:'Approved brand registry'}]}};
 const brands={read:async()=>brand,revision:()=>1,dir:()=>'/unavailable-editor-files'};
 const intake={brandId:brand.id,brandUrl:brand.brandUrl,leanWorkflowVersion:1};
 intake.canvasAssets=await require('../../lib/creative-ai/runtime/lean-context').prerequisites({brands},intake,[{id:'web',description:{formatId:'studio-web-banner'},jobInputs:{logoPolicy:{treatment:'omit'}}}]);
 const scoped=new (require('../../lib/creative-ai/runtime/brand-isolation').BrandScopedProvider)({},brands),budget={brandContext:async()=>({intake,dir:'/unused'})};
 assert.equal((await scoped.context(budget)).scope.brandId,brand.id);
 // Already-saved lean jobs omitted the outer brandId; each asset still has
 // explicit server-pinned ownership and must be checked on continuation.
 delete intake.canvasAssets.brandId;
 assert.equal((await scoped.context(budget)).scope.brandId,brand.id);
 intake.canvasAssets.fonts[0].brandId='brand-other';
 await assert.rejects(()=>scoped.context(budget),e=>e.code==='BRAND_ISOLATION');
});
test('legacy retry and component repair reject lean jobs before touching old checkpoints',async()=>{
 const job={id:'job',intake:{leanWorkflowVersion:1},selection:[{id:'web'}],results:[{route:'continuity',placementId:'web'}]},runtime={store:{read:async()=>job}};
 await assert.rejects(()=>require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype.retryChecks.call(runtime,'job',{route:'continuity',placementId:'web'}),e=>e.code==='LEAN_WORKFLOW_ACTION_UNAVAILABLE');
 await assert.rejects(()=>require('../../lib/creative-ai/runtime/component-repair').inspect(runtime,'job',{route:'continuity',placementId:'web'}),e=>e.code==='LEAN_WORKFLOW_ACTION_UNAVAILABLE');
 assert.equal(await require('../../lib/creative-ai/runtime/component-recovery').view(runtime,job),null);
});
test('explicit editor conversion cannot start OCR on a lean raster',async()=>{
 const runtime={store:{read:async()=>({intake:{leanWorkflowVersion:1}})}};
 const editor=new (require('../../lib/creative-ai/runtime/editable').EditableCanvases)(runtime);
 await assert.rejects(()=>editor.convert('job','continuity','web',{}),e=>e.code==='LEAN_WORKFLOW_ACTION_UNAVAILABLE');
});
test('request compiler isolation is pinned; old request bodies retain their recovery identity',async t=>{
 const store=await storeFor(t),job=await store.create({brandId:'brand-duroflex',leanWorkflowVersion:1},base,[]),p=new OpenAIProvider(policy.configure(base,{leanWorkflowVersion:1}));let sent;
 p.sendReasoning=async body=>{sent=body;return {ok:true,json:async()=>({id:'resp_old',status:'completed',output:[{content:[{type:'output_text',text:'{"ok":true}'}]}],usage:{output_tokens:5}})};};
 await p.reason({contextKind:'lean-planning',input:{product:{facts:[]}},instructions:'Existing request.',schema,maxOutputTokens:100},store.budget(job.id));
 assert.match(JSON.stringify(sent),/handoffAuthority/);assert.equal((await store.read(job.id)).runtimeConfig.leanContextVersion,0);
});
