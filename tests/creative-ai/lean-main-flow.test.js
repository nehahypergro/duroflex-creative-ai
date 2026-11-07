'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),ctx=require('../../lib/creative-ai/runtime/lean-context'),flow=require('../../lib/creative-ai/runtime/lean-workflow'),policy=require('../../lib/creative-ai/runtime/lean-policy'),planning=require('../../lib/creative-ai/experiments/lean-planner/planning'),handoff=require('../../lib/creative-ai/runtime/stage-handoff');
function planFor(input){return {message:'Comfort at home',audience:'Shoppers',objective:'Consideration',insight:{text:'A comfortable home matters',basis:'hypothesis'},desiredAction:'Explore',concept:'A clear choice',guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].map(r=>({id:r.id,decision:'apply',reason:'Applicable supplied requirement'})),pages:input.format.pages.map(p=>({id:p.id,purpose:p.name,copy:p.text==='none'?[]:[{role:'headline',text:'Comfort at home',factIds:[]}],artDirection:'Product on the right, copy left; follow the brand direction',hierarchy:'Headline then product',palette:'Use brand colours',typography:p.text==='none'?'No campaign text':input.brand.fonts[0].family+' Bold 700',spatial:Object.fromEntries(planning.spatialFields.map(k=>[k,k==='logoPlacement'?'Follow resolved logo inclusion and corner policy':'Follow this page’s resolved hierarchy with natural breathing room'])),formatConstraints:['Flat artwork, no mockup']})),omitted:[]};}
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': new planner contract separates render options from requested pages and drops unused editor guidance',async t=>{
 const f=await fixture(t,{brand,pages:2}),context=structuredClone(f.context);
 context.job.runtimeConfig.leanPlanningContractVersion=2;
 context.treatmentKnowledge={placements:context.job.selection.map(s=>({placementId:s.id,rules:[],treatmentIds:['shared']})),packs:[{id:'shared',rules:[{id:'scope-and-delivery',tier:'contract',text:'Two options means two independently complete sets.'},{id:'brief-first',tier:'contract',text:'Reuse original technology artwork without reconstruction.'},{id:'editable-text-design-handoff',tier:'recommendation',text:'Generate without text, add editable layers later.'}]}]};
 const input=ctx.packet(context,context.job.selection).input,s=planning.schemaFor(input).properties.pages;
 assert.equal(input.planningContractVersion,2);assert.equal(input.assignment.conceptRoutes,undefined);
 assert.match(input.renderingContract,/same plan/);assert.equal(s.minItems,2);assert.equal(s.maxItems,2);assert.deepEqual(s.items.properties.id.enum,['page-1','page-2']);
 assert(!input.format.guidance.advice.some(r=>r.id==='editable-text-design-handoff'));
 assert.match(input.format.guidance.mandatory.find(r=>r.id==='brief-first').text,/Reference-led/);
 const output=planFor(input),errors=require('../../lib/creative-ai/marketing-strategist/schema-validator');output.pages[0].id='page-1-option-1';assert(errors.check(planning.schemaFor(input),output).length);
 context.job.runtimeConfig.leanPlanningContractVersion=0;const old=ctx.packet(context,context.job.selection).input;
 assert.equal(old.planningContractVersion,undefined);assert.deepEqual(old.assignment.conceptRoutes,['continuity','exploration']);assert(old.format.guidance.advice.some(r=>r.id==='editable-text-design-handoff'));assert.equal(planning.schemaFor(old).properties.pages.minItems,undefined);
});
async function fixture(t,{brand='Duroflex',pages=1,mismatch=false,uncertain=false,failModel=null,extraCopy=[]}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'lean-main-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),brandId='brand-'+brand.toLowerCase();
 const bytes=await sharp({create:{width:1024,height:1024,channels:3,background:'#345678'}}).png().toBuffer(),data='data:image/png;base64,'+bytes.toString('base64');
 const intake={brandId,brandUrl:'https://'+brand.toLowerCase()+'.test/',brief:'Introduce this exact SKU.',productName:brand+' Product',productPageUrl:'https://'+brand.toLowerCase()+'.test/products/exact',productVariantId:'queen',originalArtworkVersion:1,leanWorkflowVersion:1,conceptRoutes:['continuity','exploration'],approvedLogoReference:{assetId:'approved-logo'},productReferencePolicy:{sourceAssetId:'sku-photo',referenceAssetIds:['sku-photo'],variant:{id:'queen',sku:'EXACT-Q',name:'Queen'}}};
 const selection=Array.from({length:pages},(_,i)=>({id:'page-'+(i+1),description:{name:'Flyer face '+(i+1),formatId:'flyer',dimensions:{width:1024,height:1024},...(pages>1?{assetSet:{id:'flyer-set',index:i+1,count:pages}}:{})},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}}));
 const config=policy.configure({maxConcurrentUnits:2,maxReasoningCalls:100,jobTimeoutMs:3600000},intake),job=await store.create(intake,config,selection);
 const context={job,intake,brand:{id:brandId,name:brand,canvasAssets:{fonts:[{approved:true,brandId,family:brand==='Duroflex'?'Poppins':'Source Sans Pro',weight:700,style:'normal'}]}},research:{brandKnowledge:{brandId},dossier:{sources:[],assets:[{id:'sku-photo',imageData:data},{id:'approved-logo',imageData:data}]},productBriefEvidence:{productProfileId:'product-exact',assetIds:['sku-photo'],evidence:[{factId:'fact-1'}]},facts:[{id:'fact-1',status:'supported',text:'Supported feature',sourceIds:[]},{id:'foreign-fact',status:'supported',text:'Other SKU',sourceIds:[]}]},guardian:{requirements:[{id:'identity',text:'Preserve exact product identity'}],preferences:[],visualRules:[]}};
 const calls=[];
 const runtime={store,config,readCarouselPlan:async()=>null,beginTask:async()=>{},finishTask:async()=>{},artifact:async(id,name,kind,body)=>store.save(id,name,body),stage:async(id,kind,agent,file,fn)=>{try{return JSON.parse(await fs.readFile(path.join(store.dir(id),file)));}catch(e){if(e.code!=='ENOENT')throw e;}const out=await fn();await store.save(id,file,out);return out;},provider:{reason:async request=>{calls.push({kind:request.contextKind,input:request.input});let out;if(request.contextKind==='lean-planning'){out=planFor(request.input);for(const p of out.pages)p.copy.push(...extraCopy);}else if(request.contextKind==='lean-correction')out={action:'local_edit',requirementIds:['copy-0'],reason:'Visible wrong headline',instruction:'Correct headline only',regions:[{label:'Headline',x:50,y:50,width:100,height:100}],protectedRegions:[{label:'Visible product',x:400,y:400,width:500,height:500}]};else out={checks:request.input.requirements.map(r=>({id:r.id,result:r.id==='copy-0'&&!request.input.correction&&mismatch?'clear_mismatch':request.input.correction&&uncertain?'unable_to_verify':'no_mismatch',evidence:'Observed '+r.name,location:'Top left'}))};if(request.validate)request.validate(out);return out;},generate:async request=>{calls.push({kind:'image',...request});if(request.model===failModel)throw Error('Simulated model unavailable');return {imageData:data};}}};
 // Exercise the real activity ledger and stage cache, not a simulated lifecycle.
 runtime.activity=new (require('../../lib/creative-ai/workflow-producer').ActivityLedger)(path.join(root,'output/creative-ai/activity'));runtime.eventQueues=new Map();
 const proto=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype;
 for(const key of ['log','beginTask','finishTask','artifact','stage'])runtime[key]=proto[key].bind(runtime);
 await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'production',conceptRoutes:intake.conceptRoutes,concepts:intake.conceptRoutes.map(route=>({id:require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:job.id},route),route})),placements:selection.map(s=>({id:s.id,label:s.description.name}))}}});
 await flow.plan(runtime,job.id,{...context,budget:store.budget(job.id),phase:'planning'});
 const manifest=JSON.parse(await fs.readFile(path.join(store.dir(job.id),'image-queue.json'))),records=await Promise.all(manifest.units.map(u=>fs.readFile(path.join(store.dir(job.id),u.file),'utf8').then(JSON.parse)));
 return {root,store,job,context,runtime,records,calls,data,bytes};
}
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': one plan retains every page and renders two high-quality options through main queues',async t=>{
 const f=await fixture(t,{brand,pages:2});assert.equal(f.records.length,4);assert.equal(f.calls.filter(c=>c.kind==='lean-planning').length,1);assert(f.records.every(r=>r.option.quality==='high'));assert.equal(f.records[0].prompt,f.records[1].prompt);assert(!JSON.stringify(f.records[0].input).includes('base64'));assert(!JSON.stringify(f.records[0].input).includes('foreign-fact'));assert(f.records[0].prompt.includes(brand==='Duroflex'?'Poppins':'Source Sans Pro'));
 await handoff.generate(f.runtime,f.job.id);let j=await f.store.read(f.job.id);assert.equal(j.status,'finished');assert.equal(j.results.length,4);assert(j.results.every(r=>r.ready&&r.originalArtwork&&!r.editable),JSON.stringify(j.unitErrors));assert.equal(f.calls.filter(c=>c.kind==='image').length,4);
 await handoff.generate(f.runtime,f.job.id);assert.equal(f.calls.filter(c=>c.kind==='image').length,4,'completed checkpoints must not dispatch again');
 assert.deepEqual(new Set(j.results.map(r=>r.imageModel)),new Set(policy.options.map(o=>o.model)));assert.equal(j.runtimeConfig.roleModels['lean-planning'].model,'gpt-6.1-sol');assert.equal(j.runtimeConfig.roleModels['lean-planning'].reasoningEffort,'high');
});
test('a model failure preserves the other option and original plan',async t=>{const f=await fixture(t,{failModel:'gpt-image-2.6-sunburst'});await handoff.generate(f.runtime,f.job.id);const j=await f.store.read(f.job.id);assert.equal(j.status,'partial');assert.equal(j.results.length,1);assert.equal(j.results[0].route,'continuity');assert.equal(j.unitErrors.length,1,JSON.stringify(j.unitErrors));});
test('bounded local correction uses verified masks and preserves original checkpoints',async t=>{
 const f=await fixture(t,{mismatch:true});await handoff.generate(f.runtime,f.job.id);const j=await f.store.read(f.job.id);assert(j.results.every(r=>r.correction?.selected),JSON.stringify(j.unitErrors));assert.equal(f.calls.filter(c=>c.kind==='image').length,4);
 const edit=f.calls.find(c=>c.kind==='image'&&c.mask);assert(Buffer.isBuffer(edit.mask));assert.match(edit.prompt,/reference image 2/);assert.match(edit.prompt,/reference image\(s\) 2–2/);assert.match(edit.prompt,/Image 3 is the approved/);
 for(const file of await fs.readdir(f.store.dir(f.job.id)))if(file.startsWith('lean-state-')){const state=JSON.parse(await fs.readFile(path.join(f.store.dir(f.job.id),file)));assert.equal(state.maskProof.outsideMaskChangedPixels,0);assert.notEqual(state.original.filename,state.candidate.filename);}
 const {BrandScopedProvider}=require('../../lib/creative-ai/runtime/brand-isolation');let dispatched=0;const scoped=new BrandScopedProvider({generate:async()=>dispatched++},{});scoped.context=async()=>({scope:{brandId:f.context.intake.brandId,brandName:'Duroflex',brandUrl:f.context.intake.brandUrl,documentIds:[]},dir:f.store.dir(f.job.id),leanWorkflowVersion:1});await f.store.save(f.job.id,'research.json',f.context.research);
 await scoped.generate(edit,{});assert.equal(dispatched,1);await assert.rejects(()=>scoped.generate({...edit,mask:Buffer.from('wrong')},{}),/mask changed/);assert.equal(dispatched,1);
 await handoff.generate(f.runtime,f.job.id);assert.equal(f.calls.filter(c=>c.kind==='image').length,4);
});
test('unverified correction cannot replace original or make it ready',async t=>{const f=await fixture(t,{mismatch:true,uncertain:true});await handoff.generate(f.runtime,f.job.id);const j=await f.store.read(f.job.id);assert(j.results.every(r=>!r.ready&&!r.correction.selected&&!r.imageUrl.includes('candidate')));});
test('variant, brand, references, copied pages and invented facts are validated before dispatch',async t=>{
 const f=await fixture(t),context=structuredClone(f.context);context.intake.productVariantId='single';assert.throws(()=>ctx.packet(context,f.job.selection),/variant/);context.intake.productVariantId='queen';context.brand.id='another';assert.throws(()=>ctx.packet(context,f.job.selection),/same-brand/);
 const rec=structuredClone(f.records[0]);rec.prompt='Altered';assert.throws(()=>flow.validateRecord(f.job,rec),/binding changed/);
 const input=f.records[0].input,p=planFor(input);p.pages[0].copy[0].factIds=['not-real'];assert.throws(()=>planning.validatePlan(p,input),/Unknown product fact/);
});
test('mixed set text and logo policies remain per page',async t=>{const f=await fixture(t,{pages:2}),selection=structuredClone(f.job.selection);selection[0].jobInputs.logoPolicy.treatment='omit';selection[0].jobInputs.formatIntent={textPolicy:'none'};const packet=ctx.packet(f.context,selection),p=planFor(packet.input);planning.validatePlan(p,packet.input);assert.equal(p.pages[0].copy.length,0);assert(p.pages[1].copy.length);const clean=planning.imagePrompt(p,packet.input,p.pages[0]);assert.match(clean,/No added campaign text/);assert(!clean.includes('Image 2 is the approved'));});
test('native media slots keep text outside the raster without suppressing retail copy',()=>{
 for(const formatId of ['custom_push-image-ios-1200x600','custom:studio-pmax-landscape','custom_rcs-image-carousel-medium-short-01','custom:client-email-desktop-1200x600','custom_studio-email-hero','custom:recipe-marketplace-module-amazon-feature-01'])assert.equal(ctx.textPolicy({description:{formatId}}),'none',formatId);
 for(const formatId of ['custom:retail-flyer','custom:recipe-marketplace-module-01','custom:studio-web-banner'])assert.equal(ctx.textPolicy({description:{formatId}}),'adaptive',formatId);
});
test('page-specific execution and review exclude other page rules and planning-only instructions',async t=>{
 const f=await fixture(t,{pages:2}),input=structuredClone(f.records[0].input);
 input.format.guidance.mandatory.push({id:'other-face',text:'Only the second face needs contact details.'},{id:'brief-first',text:'Read every planning alternative.'});
 input.format.guidance.rulePlacements={'other-face':['page-2']};
 const p=planFor(input),prompt=planning.imagePrompt(p,input,p.pages[0]),contract=require('../../lib/creative-ai/experiments/lean-planner/visual-review').contract(input,p,'page-1');
 assert(!prompt.includes('Only the second face'));assert(!prompt.includes('Read every planning alternative'));
 assert(!contract.requirements.some(r=>['placement-other-face','placement-brief-first'].includes(r.id)));
 assert(require('../../lib/creative-ai/experiments/lean-planner/visual-review').contract(input,p,'page-2').requirements.some(r=>r.id==='placement-other-face'));
});
test('new Studio policy overrides one-option draft, strips reconstruction and does not retrofit experiments',async t=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'lean-policy-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.writeFile(path.join(root,'workspace.json'),JSON.stringify({artworkDelivery:'original',artworkWorkflow:'lean-v1'}));const prepare=require('../../lib/creative-ai/runtime/original-delivery').prepare,normalize=require('../../lib/creative-ai/runtime/campaign-input').normalize;const input={brief:'A new creative.',conceptRoutes:['continuity'],editableCanvas:true,composedTextVersion:1};const fresh=normalize(prepare(root,input));assert.equal(fresh.leanWorkflowVersion,1);assert.equal(fresh.conceptRoutes.length,2);assert(!fresh.editableCanvas&&!fresh.composedTextVersion);assert.equal(input.conceptRoutes.length,1);assert(!prepare(root,{...input,rawArtworkExperimentVersion:2,leanWorkflowVersion:1}).leanWorkflowVersion);});
test('saved raster does not conceal interrupted conformance; resume checks only and preserves completed option',async t=>{
 const f=await fixture(t),reason=f.runtime.provider.reason;let fail=true;
 f.runtime.provider.reason=async request=>{if(fail&&request.contextKind==='lean-review'){fail=false;throw Error('Temporary review transport failure');}return reason(request);};
 await handoff.generate(f.runtime,f.job.id);let j=await f.store.read(f.job.id);assert.equal(j.results.length,2);assert.equal(j.status,'partial');
 const recovery=require('../../lib/creative-ai/runtime/resume-work'),info=await recovery.inspect(f.runtime,j.id,j.intake.brandId);assert.equal(info.canResume,true,info.reason);assert.equal(info.resumePhase,'image');
 f.runtime.schedule=async()=>{};await recovery.resume(f.runtime,j.id,{brandId:j.intake.brandId,token:info.token});await handoff.generate(f.runtime,j.id);
 j=await f.store.read(j.id);assert.equal(j.status,'finished');assert.equal(f.calls.filter(c=>c.kind==='image').length,2);assert.equal(f.calls.filter(c=>c.kind==='lean-review').length,2);assert(j.results.every(r=>r.ready));
});
test('approved campaign clarification survives the lean context boundary',async t=>{
 const f=await fixture(t),context=structuredClone(f.context);context.intake.campaignClarification={version:1,text:'Use the approved alternative font for this campaign.',nonEssentialFactIds:['old-font-proposal'],createdAt:new Date().toISOString()};context.research.facts.push({id:'old-font-proposal',kind:'brand',status:'conflicted'});
 const packet=ctx.packet(context,context.job.selection);assert(packet.input.brand.mandatory.some(r=>r.id==='campaign-clarification'&&r.text===context.intake.campaignClarification.text));assert(packet.input.sourceAuthority.sources.some(s=>s.id==='user-campaign-clarification'));
 context.intake.campaignClarification.nonEssentialFactIds=['fact-1'];assert.throws(()=>ctx.packet(context,context.job.selection),/cannot waive/);
});
test('interrupted candidate inspection resumes without buying another correction',async t=>{
 const f=await fixture(t,{mismatch:true}),reason=f.runtime.provider.reason;let fail=true;
 f.runtime.provider.reason=async request=>{if(fail&&request.contextKind==='lean-review'&&request.input.correction){fail=false;throw Error('Interrupted candidate inspection');}return reason(request);};
 await handoff.generate(f.runtime,f.job.id);assert.equal(f.calls.filter(c=>c.kind==='image').length,4);
 const recovery=require('../../lib/creative-ai/runtime/resume-work'),info=await recovery.inspect(f.runtime,f.job.id,f.job.intake.brandId);assert(info.canResume,info.reason);assert.equal(info.resumePhase,'image');
 f.runtime.schedule=async()=>{};await recovery.resume(f.runtime,f.job.id,{brandId:f.job.intake.brandId,token:info.token});await handoff.generate(f.runtime,f.job.id);
 assert.equal(f.calls.filter(c=>c.kind==='image').length,4);assert((await f.store.read(f.job.id)).results.every(r=>r.correction.selected));
});
test('completed mismatch or uncertainty does not reset the bounded correction allowance',async t=>{
 const f=await fixture(t,{mismatch:true,uncertain:true});await handoff.generate(f.runtime,f.job.id);
 const recovery=require('../../lib/creative-ai/runtime/resume-work');assert.equal((await recovery.inspect(f.runtime,f.job.id)).canResume,false);
 await f.store.update(f.job.id,j=>{j.status='partial';return j;});assert.equal((await recovery.inspect(f.runtime,f.job.id)).canResume,false);
});
test('legacy-finished label cannot hide unfinished lean inspection, and checkpoints bind the resume token',async t=>{
 const f=await fixture(t),reason=f.runtime.provider.reason;let fail=true;
 f.runtime.provider.reason=async request=>{if(fail&&request.contextKind==='lean-review'){fail=false;throw Error('Interrupted inspection');}return reason(request);};
 await handoff.generate(f.runtime,f.job.id);await f.store.update(f.job.id,j=>{j.status='finished';return j;});
 const recovery=require('../../lib/creative-ai/runtime/resume-work'),info=await recovery.inspect(f.runtime,f.job.id);assert(info.canResume);
 const names=await fs.readdir(f.store.dir(f.job.id)),file=names.find(n=>n.startsWith('lean-state-'));const state=JSON.parse(await fs.readFile(path.join(f.store.dir(f.job.id),file)));state.error={message:'Changed checkpoint'};await f.store.save(f.job.id,file,state);
 await assert.rejects(()=>recovery.resume(f.runtime,f.job.id,{brandId:f.job.intake.brandId,token:info.token}),/state changed/i);
});
test('missing planning family resumes planning while completed image units stay saved',async t=>{
 const f=await fixture(t);await handoff.generate(f.runtime,f.job.id);const file=path.join(f.store.dir(f.job.id),'image-queue.json'),manifest=JSON.parse(await fs.readFile(file));manifest.errors=[{placementIds:['other-family'],error:'Interrupted independent plan'}];await f.store.save(f.job.id,'image-queue.json',manifest);await f.store.update(f.job.id,j=>{j.status='partial';return j;});
 const recovery=require('../../lib/creative-ai/runtime/resume-work'),info=await recovery.inspect(f.runtime,f.job.id);assert(info.canResume);assert.equal(info.resumePhase,'planning');
});
test('lean job view does not invoke legacy editor, set reviewer or refinement readers',async t=>{
 const f=await fixture(t);await handoff.generate(f.runtime,f.job.id);
 f.runtime.editable={read:()=>assert.fail('Legacy editor read')};f.runtime.refinements={effective:()=>assert.fail('Legacy refinement read')};f.runtime.readCarouselPlan=()=>assert.fail('Legacy set read');
 const view=await require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype.view.call(f.runtime,f.job.id);
 assert.equal(view.componentRecovery,null);assert.equal(view.copyFit,null);assert.equal(view.carouselPlan,null);assert.equal(view.results.length,2);assert(view.results.every(r=>!r.editorAvailable&&!r.verificationRetryAvailable));
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': main engine preparation dispatches only the lean planner and conformance workflow',async t=>{
 const f=await fixture(t,{brand}),runtime=f.runtime,originalStage=runtime.stage,prep=[];
 runtime.provider.checkAccess=async()=>({configured:true});runtime.dossierStore={researchCompleted:async()=>({id:'offline-dossier'})};runtime.brands={read:async()=>f.context.brand,revision:()=>undefined};
 runtime.stage=async(id,kind,agent,name,fn,options)=>{if(['research','guardian'].includes(kind)){prep.push(name);return structuredClone(kind==='research'?{...f.context.research,pages:[]}:f.context.guardian);}assert(name.startsWith('lean-'),'Unexpected legacy stage '+name);return originalStage(id,kind,agent,name,fn,options);};
 runtime.unit=()=>assert.fail('Legacy generation');runtime.readCarouselPlan=()=>assert.fail('Legacy carousel planning');runtime.finishCarousels=()=>assert.fail('Legacy set review');runtime.finishPdp=()=>assert.fail('Legacy PDP review');
 await f.store.save(f.job.id,'placement-catalog.json',{});await require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype.run.call(runtime,f.job.id,{phase:'planning'});await handoff.generate(runtime,f.job.id);
 assert(prep.includes('guardian-scoped.json'));assert.equal((await f.store.read(f.job.id)).status,'finished');assert.deepEqual(new Set(f.calls.map(c=>c.kind)),new Set(['lean-planning','image','lean-review']));assert.equal(f.calls.filter(c=>c.kind==='lean-planning').length,1);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': saved handoff resumes independently of current prompt builder and defaults',async t=>{
 const f=await fixture(t,{brand});const manifest=await require('../../lib/creative-ai/runtime/artifact-fs').readJson(path.join(f.store.dir(f.job.id),'image-queue.json'));const record=await require('../../lib/creative-ai/runtime/artifact-fs').readJson(path.join(f.store.dir(f.job.id),manifest.units[0].file));const old=planning.imagePrompt,options=structuredClone(policy.options);
 try{planning.imagePrompt=()=>{throw Error('New prompt implementation must not reinterpret saved work');};policy.options[0].model='future-default';assert.doesNotThrow(()=>flow.validateRecord(f.job,record));}
 finally{planning.imagePrompt=old;policy.options.splice(0,policy.options.length,...options);}
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': campaign captions use saved lean page copy and verify selected pixels',async t=>{
 const f=await fixture(t,{brand,extraCopy:[{role:'feature-heading',text:'Find your comfort',factIds:[]}]});await handoff.generate(f.runtime,f.job.id);f.runtime.refinements={effective:async j=>j,source:async()=>{throw Error('This older creative has no saved copy');}};
 const pack=await require('../../lib/creative-ai/runtime/campaign-pack').collect(f.runtime,f.job.id,{presentation:'none'});
 assert.equal(pack.rows.length,2);assert(pack.rows.every(r=>r.caption==='Comfort at home\n\nFind your comfort'));
 const job=await f.store.read(f.job.id),file=path.join(f.store.dir(f.job.id),job.results[0].imageUrl.split('/').pop());await fs.writeFile(file,Buffer.from('changed pixels'));await assert.rejects(()=>require('../../lib/creative-ai/runtime/campaign-pack').collect(f.runtime,f.job.id,{presentation:'none'}),/Saved artwork changed/);
});

for(const brand of ['Duroflex','Sleepyhead'])test(brand+': replanning a partial campaign preserves validated handoffs despite prompt changes',async t=>{
 const f=await fixture(t,{brand});await handoff.generate(f.runtime,f.job.id);
 const before=await fs.readFile(path.join(f.store.dir(f.job.id),'image-queue.json'),'utf8');
 const old=planning.imagePrompt;try{planning.imagePrompt=()=>{throw Error('New serializer');};await flow.plan(f.runtime,f.job.id,{...f.context,budget:f.store.budget(f.job.id),phase:'planning'});}finally{planning.imagePrompt=old;}
 assert.equal(await fs.readFile(path.join(f.store.dir(f.job.id),'image-queue.json'),'utf8'),before);
 await handoff.generate(f.runtime,f.job.id);assert.equal(f.calls.filter(c=>c.kind==='image').length,2);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': queued artwork inspection retains its saved requirements after reviewer changes',async t=>{
 const f=await fixture(t,{brand}),visual=require('../../lib/creative-ai/experiments/lean-planner/visual-review'),old=visual.contract;
 try{visual.contract=()=>{throw Error('Future requirements must not replace saved requirements');};await handoff.generate(f.runtime,f.job.id);assert.equal((await f.store.read(f.job.id)).status,'finished');}
 finally{visual.contract=old;}
});
