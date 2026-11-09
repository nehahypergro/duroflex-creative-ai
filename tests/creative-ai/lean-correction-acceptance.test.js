'use strict';
// Regressions (8 Nov 2026). Defect #2: across 26 saved lean units no correction
// candidate was ever promoted, because the reviewer was asked to certify canvas,
// export-file and provenance requirements it cannot judge from pixels, and any
// unable_to_verify blocked promotion and readiness. Defect #3: an error inside the
// optional correction (creative-d2a69df5, creative-89b2bfae: "Correction prompt
// exceeds compact limit"; masks rounded onto the canvas edge on <1000px images)
// interrupted the unit, left the job partial and replayed on resume.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),sharp=require('sharp');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),flow=require('../../lib/creative-ai/runtime/lean-workflow'),policy=require('../../lib/creative-ai/runtime/lean-policy'),planning=require('../../lib/creative-ai/experiments/lean-planner/planning'),handoff=require('../../lib/creative-ai/runtime/stage-handoff');
const visual=require('../../lib/creative-ai/experiments/lean-planner/visual-review'),correction=require('../../lib/creative-ai/experiments/lean-planner/correction'),{fingerprint}=require('../../lib/creative-ai/art-director');
const longSpatial=n=>Object.fromEntries(planning.spatialFields.map(k=>[k,(k+': keep the planned region, grouping and prominence with natural breathing room. ').repeat(Math.ceil(n/80)).slice(0,n)]));
function planFor(input,spatial){return {message:'Comfort at home',audience:'Shoppers',objective:'Consideration',insight:{text:'A comfortable home matters',basis:'hypothesis'},desiredAction:'Explore',concept:'A clear choice',guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].map(r=>({id:r.id,decision:'apply',reason:'Applicable supplied requirement'})),pages:input.format.pages.map(p=>({id:p.id,purpose:p.name,copy:[{role:'headline',text:'Comfort at home',factIds:[]}],artDirection:'Product on the right, copy left',hierarchy:'Headline then product',palette:'Use brand colours',typography:input.brand.fonts[0].family+' Bold 700',spatial:spatial||Object.fromEntries(planning.spatialFields.map(k=>[k,'Follow this page’s resolved hierarchy'])),formatConstraints:['Flat artwork, no mockup']})),omitted:[]};}
// Job-defined custom placement rules exactly as the placement catalog emits them.
const customRules=[{id:'custom:studio-web-banner-canvas',tier:'mandatory',statement:'Job-specified canvas; no publisher certification.',sourceIds:['user:custom'],check:{method:'dimensions',slot:'artwork',exact:[1920,640]}},{id:'custom:studio-web-banner-file',tier:'mandatory',statement:'Job-defined export constraint.',sourceIds:['user:custom'],check:{method:'file',slot:'artwork',formats:['png']}},{id:'custom:studio-web-banner-layout',tier:'mandatory',statement:'1920×640px Website banner; one clear message and readable type.',sourceIds:['user:custom'],check:{method:'rendered-review'}}];
const passing=()=>'no_mismatch';
async function fixture(t,{brand='Duroflex',width=1024,height=1024,review=passing,evidence=r=>'Observed '+r.name,diagnose,generate,spatial,treatment=false,identity='Preserve exact product identity',scopePin=true}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'lean-accept-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),brandId='brand-'+brand.toLowerCase();
 const bytes=await sharp({create:{width,height,channels:3,background:'#345678'}}).png().toBuffer(),data='data:image/png;base64,'+bytes.toString('base64');
 const intake={brandId,brandUrl:'https://'+brand.toLowerCase()+'.test/',brief:'Introduce this exact SKU.',productName:brand+' Product',productPageUrl:'https://'+brand.toLowerCase()+'.test/products/exact',productVariantId:'queen',originalArtworkVersion:1,leanWorkflowVersion:1,conceptRoutes:['continuity','exploration'],approvedLogoReference:{assetId:'approved-logo'},productReferencePolicy:{sourceAssetId:'sku-photo',referenceAssetIds:['sku-photo'],variant:{id:'queen',sku:'EXACT-Q',name:'Queen'}}};
 const selection=[{id:'page-1',description:{name:'Website banner',formatId:'custom:studio-web-banner',dimensions:{width:1920,height:640}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}}];
 // Saved two-option contract (the second model was retired for new jobs on 8 Nov 2026).
 const legacyTwoOptions=true,config={...policy.configure({maxConcurrentUnits:2,maxReasoningCalls:100,jobTimeoutMs:3600000},intake),...(legacyTwoOptions?{leanImageOptions:policy.jobOptions({runtimeConfig:{}}),imageOptionModels:['gpt-image-2','gpt-image-2.6-sunburst']}:{})};
 // correctionScopeVersion 1 (9 Nov 2026) leaves layout-only findings uncorrected; tests of jobs saved before it drop the pin.
 if(!scopePin)delete config.correctionScopeVersion;const job=await store.create(intake,config,selection);
 const context={job,intake,brand:{id:brandId,name:brand,canvasAssets:{fonts:[{approved:true,brandId,family:brand==='Duroflex'?'Poppins':'Source Sans Pro',weight:700,style:'normal'}]}},research:{brandKnowledge:{brandId},dossier:{version:1,event:'research.completed',researchId:'accept-'+brand.toLowerCase(),brandName:brand,demo:false,completedAt:'2026-11-08T00:00:00.000Z',sources:[{id:'source-product-page',kind:'product',label:'Official product page',reference:intake.productPageUrl,collectedAt:'2026-11-08T00:00:00.000Z',status:'available'}],assets:[{id:'sku-photo',kind:'product',label:'Exact SKU photo',sourceIds:['source-product-page'],imageData:data},{id:'approved-logo',kind:'logo',label:'Approved logo',sourceIds:['source-product-page'],imageData:data}],findings:[]},productBriefEvidence:{productProfileId:'product-exact',assetIds:['sku-photo'],evidence:[{factId:'fact-1'}]},facts:[{id:'fact-1',status:'supported',text:'Supported feature',sourceIds:[]}]},guardian:{requirements:[{id:'identity',text:identity}],preferences:[],visualRules:[]},...(treatment?{treatmentKnowledge:{placements:[{placementId:'page-1',rules:customRules,treatmentIds:[]}],packs:[]}}:{})};
 const calls=[];let attempts=0;
 const reason=async request=>{
  calls.push({kind:request.contextKind,input:request.input});
  if(request.contextKind==='lean-planning')return planFor(request.input,spatial);
  if(request.contextKind==='lean-correction'){
   // Mirror the provider's bounded contract repair: the validate callback's error is returned to the model.
   let error;for(let attempt=0;attempt<3;attempt++){attempts++;const out=(diagnose||(()=>({action:'regenerate',requirementIds:request.input.findings.map(f=>f.id),reason:'Visible defect',instruction:'Fix only the named defects',regions:[],protectedRegions:[]})))(request,attempt,error);try{if(request.validate)await request.validate(out);return out;}catch(e){error=e;}}
   throw Object.assign(Error('Agent output failed validated contract after bounded recovery: '+error.message),{code:'REASONING_CONTRACT_INVALID'});
  }
  const out={checks:request.input.requirements.map(r=>({id:r.id,result:review(r,{correction:!!request.input.correction,input:request.input}),evidence:evidence(r),location:'Top left'}))};if(request.validate)request.validate(out);return out;
 };
 const runtime={store,config,readCarouselPlan:async()=>null,provider:{reason,generate:async request=>{calls.push({kind:'image',...request});if(generate)await generate(request);return {imageData:data};}}};
 runtime.activity=new (require('../../lib/creative-ai/workflow-producer').ActivityLedger)(path.join(root,'output/creative-ai/activity'));runtime.eventQueues=new Map();
 const proto=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype;
 for(const key of ['log','beginTask','finishTask','artifact','stage'])runtime[key]=proto[key].bind(runtime);
 await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'production',conceptRoutes:intake.conceptRoutes,concepts:intake.conceptRoutes.map(route=>({id:require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:job.id},route),route})),placements:selection.map(s=>({id:s.id,label:s.description.name}))}}});
 await flow.plan(runtime,job.id,{...context,budget:store.budget(job.id),phase:'planning'});
 const dir=store.dir(job.id),manifest=JSON.parse(await fs.readFile(path.join(dir,'image-queue.json'))),records=await Promise.all(manifest.units.map(u=>fs.readFile(path.join(dir,u.file),'utf8').then(JSON.parse)));
 const states=async()=>Promise.all(records.map(r=>fs.readFile(path.join(dir,'lean-state-'+fingerprint([r.route,r.placementId]).slice(0,24)+'.json'),'utf8').then(JSON.parse)));
 const tasks=async()=>Object.values((await runtime.activity.project(job.id)).tasks).filter(x=>x.taskId.startsWith('lean-artwork-'));
 return {root,store,job,dir,runtime,records,manifest,calls,states,tasks,attempts:()=>attempts,run:()=>handoff.generate(runtime,job.id),read:()=>store.read(job.id)};
}
// Rewrites a planned unit as a record saved before conformance v1 (strict contract, no pin).
async function asHistorical(f){
 for(const [i,unit] of f.manifest.units.entries()){
  const {packageHash,leanConformanceVersion,notVisuallyVerifiable,...body}=await require('../../lib/creative-ai/runtime/artifact-fs').readJson(path.join(f.dir,unit.file));
  body.reviewContract=visual.contract(body.input,body.plan,body.placementId);body.reviewInstructions=visual.instructions;
  const record={...body,packageHash:fingerprint(body)};f.records[i]=record;
  await f.store.save(f.job.id,unit.file,record);unit.hash=crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex');
 }
 await f.store.save(f.job.id,'image-queue.json',f.manifest);
}
const correctionCalls=f=>f.calls.filter(c=>c.kind==='lean-correction').length,images=f=>f.calls.filter(c=>c.kind==='image');

// ---- Defect #2: review scope, candidate acceptance and readiness ----
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': canvas/export-file requirements stay out of the visual review and visible in the saved record',async t=>{
 const f=await fixture(t,{brand,treatment:true,review:r=>/-canvas$|-file$/.test(r.id)?'clear_mismatch':r.id.startsWith('brand-')?'unable_to_verify':'no_mismatch'});
 for(const record of f.records){
  const ids=record.reviewContract.requirements.map(r=>r.id);
  assert(!ids.some(id=>/-canvas$|-file$/.test(id)),'non-pixel requirements must not reach the reviewer: '+ids.join(','));
  assert(ids.includes('placement-custom:studio-web-banner-layout'),'visual placement rules remain');
  assert.equal(record.leanConformanceVersion,1);
  assert.deepEqual(record.notVisuallyVerifiable.map(r=>[r.id,r.method]),[['placement-custom:studio-web-banner-canvas','dimensions'],['placement-custom:studio-web-banner-file','file']]);
 }
 await f.run();
 for(const c of f.calls.filter(c=>c.kind==='lean-review'))assert(!JSON.stringify(c.input).includes('studio-web-banner-canvas'));
 assert.equal(correctionCalls(f),0,'no paid correction for requirements an image model cannot fix');assert.equal(images(f).length,2);
 const j=await f.read();assert.equal(j.status,'finished');
 for(const r of j.results){assert.equal(r.ready,true);assert.equal(r.qualityVerified,false,'uncertainty is not certification');assert.equal(r.visualReview.conclusion,'unable_to_verify');assert.deepEqual(r.visualReview.unverified,['brand-identity']);assert.deepEqual(r.visualReview.notVisuallyVerifiable,['placement-custom:studio-web-banner-canvas','placement-custom:studio-web-banner-file']);}
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': a candidate that fixes every original defect is promoted despite remaining uncertainty',async t=>{
 const f=await fixture(t,{brand,review:(r,{correction})=>r.id==='copy-0'?(correction?'no_mismatch':'clear_mismatch'):r.id==='brand-identity'?'unable_to_verify':'no_mismatch'});
 await f.run();const j=await f.read();assert.equal(j.status,'finished');
 for(const r of j.results){assert.equal(r.correction.selected,true,JSON.stringify(j.unitErrors));assert.match(r.imageUrl,/candidate/);assert.equal(r.ready,true);assert.equal(r.qualityVerified,false);}
 for(const s of await f.states()){assert.equal(s.selected,'candidate');assert(s.original.filename!==s.candidate.filename);}
});
test('candidate acceptance requires fixed defects, passed integrity and no new mismatch',()=>{
 const req=['copy-0','logo','brand-identity','correction-integrity'].map(id=>({id,name:id,expected:'x'})),base=req.slice(0,3);
 const rep=(rows,requirements=req)=>({status:'completed',report:visual.validateReport({checks:requirements.map(q=>({id:q.id,result:rows[q.id]||'no_mismatch',evidence:'Seen',location:'Top'}))},requirements)});
 const original=rep({'copy-0':'clear_mismatch','brand-identity':'unable_to_verify'},base);
 assert.equal(correction.acceptCandidate(rep({'brand-identity':'unable_to_verify'}),req,original),true);
 assert.equal(correction.acceptCandidate(rep({'copy-0':'unable_to_verify'}),req,original),false,'an original defect must be shown fixed');
 assert.equal(correction.acceptCandidate(rep({'correction-integrity':'unable_to_verify'}),req,original),false,'integrity must pass');
 assert.equal(correction.acceptCandidate(rep({logo:'clear_mismatch'}),req,original),false,'no new defect');
 assert.equal(correction.acceptCandidate({status:'completed',report:{checks:[]}},req,original),false);
 assert.equal(correction.acceptCandidate(rep({}),req,{status:'completed',report:{checks:[]}}),false,'nothing to fix means nothing to promote');
 // The experiment runner's strict contract is unchanged.
 assert.equal(correction.safeCandidate(rep({'brand-identity':'unable_to_verify'}),req),false);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': campaign packs include deliverable lean artwork without certifying it',async t=>{
 const f=await fixture(t,{brand,review:r=>r.id==='brand-identity'?'unable_to_verify':'no_mismatch'});await f.run();
 f.runtime.refinements={effective:async j=>j,source:async()=>{throw Error('Lean artwork has no refinement source');}};
 const campaigns=require('../../lib/creative-ai/runtime/campaigns'),job=await f.read();
 for(const r of job.results){const a=campaigns.downloadAssessment(job,r);assert.equal(a.ready,true);assert.match(a.note,/could not be verified visually/);}
 assert.deepEqual(campaigns.reviewState(job),{total:2,ready:2,images:2,passed:true});
 const pack=await require('../../lib/creative-ai/runtime/campaign-pack').collect(f.runtime,f.job.id,{presentation:'none'});
 assert.equal(pack.rows.length,2);assert(pack.rows.every(r=>r.ready&&r.qualityVerified===false));assert.equal(pack.excluded.length,0);
 assert(require('../../lib/creative-ai/runtime/campaign-pack').slideContent(pack).slice(1).every(s=>!/Review passed/.test(s.note)),'unverified artwork is not labelled as passed');
});
test('historical lean records keep their strict review contract, readiness and pack gate',async t=>{
 const f=await fixture(t,{treatment:true,review:r=>r.id.startsWith('brand-')||/-canvas$|-file$/.test(r.id)?'unable_to_verify':'no_mismatch'});await asHistorical(f);
 assert(f.records[0].reviewContract.requirements.some(r=>r.id==='placement-custom:studio-web-banner-canvas'));
 await f.run();const job=await f.read(),campaigns=require('../../lib/creative-ai/runtime/campaigns');
 for(const r of job.results){assert.equal(r.ready,false);assert.equal(r.qualityVerified,false);assert.equal(r.leanConformanceVersion,undefined);assert.equal(campaigns.downloadAssessment(job,r).ready,false);}
 // A result pin cannot relax artwork that its own review did not make ready.
 assert.equal(campaigns.downloadAssessment(job,{...job.results[0],leanConformanceVersion:1}).ready,false);
});

// ---- Defect #3: correction-stage failures are isolated ----
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': findings no longer repeat the spatial plan, so a live-sized correction prompt dispatches',async t=>{
 const f=await fixture(t,{brand,scopePin:false,spatial:longSpatial(800),review:(r,{correction})=>!correction&&['spatial-layout','logo','placement-placement-logo-page-1'].includes(r.id)?'clear_mismatch':'no_mismatch'});
 const brief=f.records[0].prompt,spatialJson=JSON.stringify(f.records[0].plan.pages[0].spatial);assert(brief.length>8500&&brief.length<12000,'live-sized brief '+brief.length);
 await f.run();const j=await f.read();assert.equal(j.status,'finished',JSON.stringify(j.unitErrors));
 const edits=images(f).filter(c=>c.attachments[0].assetId==='lean-artwork-anchor');assert.equal(edits.length,2);
 for(const e of edits){assert.equal(e.prompt.split(spatialJson).length-1,1,'spatial plan appears once (in the brief)');assert(e.prompt.length<28000);assert.match(e.prompt,/Planned spatial arrangement/);}
 assert(j.results.every(r=>r.correction.selected));
});
test('a saved pre-fix unit whose correction prompt cannot fit finishes with its original before any paid diagnosis',async t=>{
 const f=await fixture(t,{scopePin:false,spatial:longSpatial(800),review:r=>['spatial-layout','logo','placement-placement-logo-page-1'].includes(r.id)?'clear_mismatch':'no_mismatch'});await asHistorical(f);
 await f.run();const j=await f.read();
 assert.equal(j.status,'finished',JSON.stringify(j.unitErrors));assert.equal(correctionCalls(f),0,'no paid diagnosis for an undispatchable correction');assert.equal(images(f).length,2);
 for(const s of await f.states()){assert.equal(s.status,'completed');assert.equal(s.selected,'original');assert.equal(s.correctionFailure.stage,'preflight');assert.match(s.correctionFailure.message,/exceeds/);}
 for(const r of j.results){assert.match(r.imageUrl,/static-lean-[a-f0-9]+\.png$/);assert.equal(r.correction.selected,false);assert.match(r.correction.error,/exceeds/);}
 assert((await f.tasks()).every(x=>x.status==='completed'),'activity must not show the unit running forever');
 const recovery=require('../../lib/creative-ai/runtime/resume-work');assert.equal((await recovery.inspect(f.runtime,f.job.id)).canResume,false,'a deterministic correction failure is not replayed');
});
test('over-long correction findings are caught before the paid diagnosis on new jobs too',async t=>{
 const f=await fixture(t,{review:r=>r.id==='copy-0'?'clear_mismatch':'no_mismatch',evidence:r=>r.id==='copy-0'?'Wrong headline. '.repeat(1900):'Observed'});
 await f.run();const j=await f.read();assert.equal(j.status,'finished');assert.equal(correctionCalls(f),0);assert.equal(images(f).length,2);
 for(const s of await f.states())assert.equal(s.correctionFailure.stage,'preflight');
});
test('an over-long correction instruction is returned to the bounded diagnosis repair, not discovered after payment',async t=>{
 const f=await fixture(t,{review:(r,{correction})=>r.id==='copy-0'&&!correction?'clear_mismatch':'no_mismatch',diagnose:(request,attempt)=>({action:'regenerate',requirementIds:['copy-0'],reason:'Wrong headline',instruction:attempt?'Correct the headline wording only.':'Correct the headline. '.repeat(1500),regions:[],protectedRegions:[]})});
 await f.run();const j=await f.read();assert.equal(j.status,'finished',JSON.stringify(j.unitErrors));assert.equal(f.attempts(),4,'one repair per option');
 assert(j.results.every(r=>r.correction.selected));
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': a repair region at x=1 on a sub-1000px image stays inside the canvas',async t=>{
 const d=correction.validateDecision({action:'local_edit',requirementIds:['copy-0'],reason:'Wrong headline',instruction:'Correct the headline only',regions:[{label:'Headline',x:1,y:1,width:300,height:120},{label:'Footer',x:600,y:880,width:399,height:119}],protectedRegions:[{label:'Visible product',x:400,y:300,width:500,height:500}]},[{id:'copy-0'}]);
 const region=correction.regionsMask(d,896,1120);assert(region.some(Boolean));
 const f=await fixture(t,{brand,width:896,height:1120,review:(r,{correction})=>r.id==='copy-0'&&!correction?'clear_mismatch':'no_mismatch',diagnose:()=>d});
 await f.run();const j=await f.read();assert.equal(j.status,'finished',JSON.stringify(j.unitErrors));
 assert(j.results.every(r=>r.correction.selected));assert.equal(images(f).filter(c=>Buffer.isBuffer(c.mask)).length,2);
 for(const s of await f.states())assert.equal(s.maskProof.outsideMaskChangedPixels,0);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': a failed correction image keeps the original, records the failure and lets the job finish',async t=>{
 const f=await fixture(t,{brand,review:(r,{correction})=>r.id==='copy-0'&&!correction?'clear_mismatch':'no_mismatch',generate:request=>{if(request.attachments[0].assetId==='lean-artwork-anchor')throw Object.assign(Error('Simulated correction rejected'),{code:'IMAGE_REJECTED'});}});
 await f.run();const j=await f.read();
 assert.equal(j.status,'finished',JSON.stringify(j.unitErrors));assert.deepEqual(j.unitErrors,[]);
 for(const s of await f.states()){assert.equal(s.status,'completed');assert.equal(s.selected,'original');assert.equal(s.correctionFailure.stage,'image');assert.equal(s.correctionFailure.code,'IMAGE_REJECTED');assert.equal(s.error,undefined);}
 for(const r of j.results){assert.equal(r.correction.selected,false);assert.match(r.correction.error,/Simulated correction rejected/);assert.equal(r.ready,false,'the original still has its confirmed defect');}
 assert((await f.tasks()).every(x=>x.status==='completed'));
 const before=images(f).length;await f.run();assert.equal(images(f).length,before,'no automatic resubmission');
});
test('an interrupted unit records task.failed and resumes under a new task version',async t=>{
 let fail=true;const f=await fixture(t);const reason=f.runtime.provider.reason;
 f.runtime.provider.reason=async request=>{if(fail&&request.contextKind==='lean-review'){fail=false;throw Error('Temporary review transport failure');}return reason(request);};
 await f.run();let j=await f.read();assert.equal(j.status,'partial');
 const failed=(await f.tasks()).filter(x=>x.status==='failed');assert.equal(failed.length,1,'activity must not show "Creating artwork" running forever');
 const recovery=require('../../lib/creative-ai/runtime/resume-work'),info=await recovery.inspect(f.runtime,j.id,j.intake.brandId);assert(info.canResume,info.reason);
 f.runtime.schedule=async()=>{};await recovery.resume(f.runtime,j.id,{brandId:j.intake.brandId,token:info.token});await f.run();
 j=await f.read();assert.equal(j.status,'finished');const tasks=await f.tasks();assert(tasks.some(x=>/-resume-1$/.test(x.taskId)&&x.status==='completed'));assert(!tasks.some(x=>x.status==='running'));
});
