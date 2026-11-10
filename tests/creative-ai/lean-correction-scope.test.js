'use strict';
// Regression (live run 9 Nov 2026). Job creative-a97696b5… (Facebook feed square): the review's only
// concrete mismatch was "logo spans one-third width vs one-fifth" (spatial-layout). The single
// correction repainted a masked box round the logo and its check found "A pale rectangular patch
// behind the reduced logo… absent from the original artwork" (correction-integrity). Job
// creative-4edd4f2f… (Story): "mattress cut off at the right edge"; a regenerate attempt kept the crop.
// Size, scale, position, crop and composition are not something a local masked repaint can fix.
// Fix (correctionScopeVersion 1, pinned on new lean jobs): before any paid call, findings that are only
// layout (spatial-layout, layout, structure, placement layout/logo-position rules) are not
// auto-corrected; the original stays with an honest "check before using" state and a plain note.
// Mixed findings send only the fixable ones; layout ones stay recorded as not corrected. The planner's
// own action is honoured: a whole-page "regenerate" for findings that are not a known wording, logo or
// product defect is not sent. A candidate that adds a new mismatch (correction-integrity or a new
// clear_mismatch) is never promoted. Offline fake provider; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),flow=require('../../lib/creative-ai/runtime/lean-workflow'),policy=require('../../lib/creative-ai/runtime/lean-policy'),planning=require('../../lib/creative-ai/lean/planning'),handoff=require('../../lib/creative-ai/runtime/stage-handoff');
const correction=require('../../lib/creative-ai/lean/correction'),{fingerprint}=require('../../lib/creative-ai/art-director');
function planFor(input){return {...(input?.checklist?.setRules?{setRules:['The same product colourway and label on every page','The same bright bedroom family on every page']}:{}),message:'Comfort at home',audience:'Shoppers',objective:'Consideration',insight:{text:'A comfortable home matters',basis:'hypothesis'},desiredAction:'Explore',concept:'A clear choice',guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].map(r=>({id:r.id,decision:'apply',reason:'Applicable supplied requirement'})),pages:input.format.pages.map(p=>({id:p.id,purpose:p.name,copy:[{role:'headline',text:'Comfort at home',factIds:[]}],artDirection:'Product on the right, copy left',hierarchy:'Headline then product',palette:'Use brand colours',typography:input.brand.fonts[0].family+' Bold 700',spatial:Object.fromEntries(planning.spatialFields.map(k=>[k,'Follow this page’s resolved hierarchy'])),formatConstraints:['Flat artwork, no mockup']})),omitted:[]};}
const localEdit=ids=>({action:'local_edit',requirementIds:ids,reason:'Wrong headline wording',instruction:'Correct the headline wording only',regions:[{label:'Headline',x:60,y:60,width:300,height:120}],protectedRegions:[{label:'Visible product',x:400,y:300,width:500,height:500}]});
async function fixture(t,{brand='Duroflex',review,diagnose,pinned=true}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'lean-scope-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),brandId='brand-'+brand.toLowerCase();
 const bytes=await sharp({create:{width:1024,height:1024,channels:3,background:'#345678'}}).png().toBuffer(),data='data:image/png;base64,'+bytes.toString('base64');
 const intake={brandId,brandUrl:'https://'+brand.toLowerCase()+'.test/',brief:'Introduce this exact SKU.',productName:brand+' Product',productPageUrl:'https://'+brand.toLowerCase()+'.test/products/exact',productVariantId:'queen',originalArtworkVersion:1,leanWorkflowVersion:1,conceptRoutes:['continuity'],approvedLogoReference:{assetId:'approved-logo'},productReferencePolicy:{sourceAssetId:'sku-photo',referenceAssetIds:['sku-photo'],variant:{id:'queen',sku:'EXACT-Q',name:'Queen'}}};
 const selection=[{id:'page-1',description:{name:'Social square',formatId:'custom:studio-social-square',dimensions:{width:1080,height:1080}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}}];
 const configured=policy.configure({maxConcurrentUnits:1,maxReasoningCalls:100,jobTimeoutMs:3600000},intake),config=pinned?configured:(({correctionScopeVersion,...rest})=>rest)(configured),job=await store.create(intake,config,selection);
 const context={job,intake,brand:{id:brandId,name:brand,canvasAssets:{fonts:[{approved:true,brandId,family:brand==='Duroflex'?'Poppins':'Source Sans Pro',weight:700,style:'normal'}]}},research:{brandKnowledge:{brandId},dossier:{version:1,event:'research.completed',researchId:'scope-'+brand.toLowerCase(),brandName:brand,demo:false,completedAt:'2026-11-09T00:00:00.000Z',sources:[{id:'source-product-page',kind:'product',label:'Official product page',reference:intake.productPageUrl,collectedAt:'2026-11-09T00:00:00.000Z',status:'available'}],assets:[{id:'sku-photo',kind:'product',label:'Exact SKU photo',sourceIds:['source-product-page'],imageData:data},{id:'approved-logo',kind:'logo',label:'Approved logo',sourceIds:['source-product-page'],imageData:data}],findings:[]},productBriefEvidence:{productProfileId:'product-exact',assetIds:['sku-photo'],evidence:[{factId:'fact-1'}]},facts:[{id:'fact-1',status:'supported',text:'Supported feature',sourceIds:[]}]},guardian:{requirements:[{id:'identity',text:'Preserve exact product identity'}],preferences:[],visualRules:[]}};
 const calls=[];
 const reason=async request=>{
  calls.push({kind:request.contextKind,input:request.input});
  if(request.contextKind==='lean-planning')return planFor(request.input);
  if(request.contextKind==='lean-correction'){const out=(diagnose||(()=>localEdit(request.input.findings.map(f=>f.id))))(request);if(request.validate)await request.validate(out);return out;}
  const out={checks:request.input.requirements.map(r=>({id:r.id,result:review(r,{correction:!!request.input.correction}),evidence:'Observed '+r.name,location:'Top left'}))};if(request.validate)request.validate(out);return out;
 };
 const runtime={store,config,readCarouselPlan:async()=>null,provider:{reason,generate:async request=>{calls.push({kind:'image',...request});return {imageData:data};}}};
 runtime.activity=new (require('../../lib/creative-ai/workflow-producer').ActivityLedger)(path.join(root,'output/creative-ai/activity'));runtime.eventQueues=new Map();
 const proto=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype;
 for(const key of ['log','beginTask','finishTask','artifact','stage'])runtime[key]=proto[key].bind(runtime);
 await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'production',conceptRoutes:intake.conceptRoutes,concepts:intake.conceptRoutes.map(route=>({id:require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:job.id},route),route})),placements:selection.map(s=>({id:s.id,label:s.description.name}))}}});
 await flow.plan(runtime,job.id,{...context,budget:store.budget(job.id),phase:'planning'});
 const dir=store.dir(job.id),manifest=JSON.parse(await fs.readFile(path.join(dir,'image-queue.json'))),records=await Promise.all(manifest.units.map(u=>fs.readFile(path.join(dir,u.file),'utf8').then(JSON.parse)));
 const states=async()=>Promise.all(records.map(r=>fs.readFile(path.join(dir,'lean-state-'+fingerprint([r.route,r.placementId]).slice(0,24)+'.json'),'utf8').then(JSON.parse)));
 return {store,job,dir,runtime,records,calls,states,run:()=>handoff.generate(runtime,job.id),read:()=>store.read(job.id)};
}
const count=(f,kind)=>f.calls.filter(c=>c.kind===kind).length,edits=f=>f.calls.filter(c=>c.kind==='image'&&c.attachments?.[0]?.assetId==='lean-artwork-anchor');
const logoPlacement=r=>r.id.startsWith('placement-placement-logo-');

test('the correction scope is decided from requirement IDs alone',()=>{
 const s=ids=>correction.scope(ids.map(id=>({id,result:'clear_mismatch'})));
 assert.deepEqual(s(['spatial-layout']),{version:1,layout:['spatial-layout'],fixable:[],note:'Layout differs from plan; not auto-corrected.',skipped:'layout-only'});
 assert.equal(s(['spatial-layout','placement-placement-logo-page-1','layout','structure','placement-custom:studio-social-square-layout']).skipped,'layout-only');
 for(const id of ['copy-0','campaign-copy','logo','logo-omitted','product','brand-req-logo-integrity'])assert.deepEqual(s([id]).fixable,[id],id+' can be corrected');
 const mixed=s(['copy-1','spatial-layout']);assert.deepEqual(mixed.fixable,['copy-1']);assert.deepEqual(mixed.layout,['spatial-layout']);assert.equal(mixed.skipped,null);assert.equal(mixed.note,'Layout differs from plan; not auto-corrected.');
 assert.equal(s(['copy-1']).note,null);
});

for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': a spatial-only mismatch sends no correction call and keeps the original with an honest note',async t=>{
  const f=await fixture(t,{brand,review:(r,{correction})=>r.id==='spatial-layout'&&!correction?'clear_mismatch':'no_mismatch'});
  assert.equal((await f.read()).runtimeConfig.correctionScopeVersion,1,'pinned on new lean jobs');
  await f.run();const j=await f.read();
  assert.equal(count(f,'lean-correction'),0,'no paid diagnosis');assert.equal(edits(f).length,0,'no correction image');assert.equal(count(f,'image'),1);
  assert.equal(j.status,'finished',JSON.stringify(j.unitErrors));
  const [s]=await f.states();assert.equal(s.selected,'original');assert.equal(s.candidate,undefined);assert.equal(s.correctionScope.skipped,'layout-only');assert.deepEqual(s.correctionScope.layout,['spatial-layout']);
  const [r]=j.results;assert.match(r.imageUrl,/static-lean-[a-f0-9]+\.png$/);assert.equal(r.ready,false,'check before using');assert.equal(r.qualityVerified,false);
  assert.deepEqual(r.correction,{action:null,selected:false,skipped:'layout-only',notCorrected:['spatial-layout'],note:'Layout differs from plan; not auto-corrected.'});
 });
 test(brand+': logo-position and crop findings together are also left as they are',async t=>{
  const f=await fixture(t,{brand,review:(r,{correction})=>!correction&&(logoPlacement(r)||['spatial-layout','layout'].includes(r.id))?'clear_mismatch':'no_mismatch'});
  await f.run();assert.equal(count(f,'lean-correction'),0);assert.equal(edits(f).length,0);
  const [r]=(await f.read()).results;assert.equal(r.correction.skipped,'layout-only');assert.equal(r.correction.notCorrected.length,3);
 });
 test(brand+': a wording mismatch is still corrected (local repaint) and the fixed candidate is promoted',async t=>{
  const f=await fixture(t,{brand,review:(r,{correction})=>r.id==='copy-0'&&!correction?'clear_mismatch':'no_mismatch'});
  await f.run();assert.equal(count(f,'lean-correction'),1);assert.equal(edits(f).length,1);assert.ok(Buffer.isBuffer(edits(f)[0].mask),'masked local repaint');
  const [r]=(await f.read()).results;assert.equal(r.correction.selected,true);assert.match(r.imageUrl,/candidate/);assert.equal(r.correction.note,undefined);
 });
 test(brand+': mixed wording + layout findings correct only the wording; the remaining layout difference is not a new defect',async t=>{
  const f=await fixture(t,{brand,review:(r,{correction})=>r.id==='spatial-layout'?'clear_mismatch':r.id==='copy-0'&&!correction?'clear_mismatch':'no_mismatch'});
  await f.run();const diag=f.calls.find(c=>c.kind==='lean-correction');assert.deepEqual(diag.input.findings.map(x=>x.id),['copy-0'],'only fixable findings go to the planner');
  const [s]=await f.states();assert.equal(s.selected,'candidate','fixed its own mismatch without new ones');
  const [r]=(await f.read()).results;assert.equal(r.correction.selected,true);assert.deepEqual(r.correction.notCorrected,['spatial-layout']);assert.equal(r.correction.note,'Layout differs from plan; not auto-corrected.');assert.equal(r.ready,false,'the layout difference stays visible');
 });
 test(brand+': the planner’s whole-page regenerate for a non-wording finding is not sent',async t=>{
  const f=await fixture(t,{brand,review:(r,{correction})=>r.id==='brand-identity'&&!correction?'clear_mismatch':'no_mismatch',diagnose:request=>({action:'regenerate',requirementIds:request.input.findings.map(x=>x.id),reason:'Needs a recomposed scene',instruction:'Recompose the page',regions:[],protectedRegions:[]})});
  await f.run();assert.equal(count(f,'lean-correction'),1);assert.equal(edits(f).length,0,'no regenerated picture');
  const [s]=await f.states();assert.equal(s.selected,'original');assert.equal(s.correctionScope.skipped,'needs-new-layout');
  const [r]=(await f.read()).results;assert.equal(r.correction.action,'regenerate');assert.equal(r.correction.selected,false);assert.match(r.correction.note,/not auto-corrected/);
 });
 // (b) Job creative-a97696b5: the candidate's check found a new patch (correction-integrity).
 test(brand+': a candidate that introduces a new defect is never promoted or shown; the original stays',async t=>{
  for(const newDefect of ['correction-integrity','logo']){
   const f=await fixture(t,{brand,review:(r,{correction})=>correction?(r.id===newDefect?'clear_mismatch':'no_mismatch'):r.id==='copy-0'?'clear_mismatch':'no_mismatch'});
   await f.run();assert.equal(edits(f).length,1,'one correction image');
   const [s]=await f.states();assert.equal(s.selected,'original',newDefect);assert.ok(s.candidate,'candidate preserved internally');
   const [r]=(await f.read()).results;assert.equal(r.sha256,s.original.sha256,'delivered result is the original');assert.doesNotMatch(r.imageUrl,/candidate/);assert.equal(r.correction.selected,false);assert.equal(r.ready,false);
  }
 });
 test(brand+': jobs saved before the scope pin keep the earlier correction behaviour',async t=>{
  const f=await fixture(t,{brand,pinned:false,review:(r,{correction})=>r.id==='spatial-layout'&&!correction?'clear_mismatch':'no_mismatch'});
  await f.run();assert.equal(count(f,'lean-correction'),1,'unpinned job: unchanged');
 });
}
