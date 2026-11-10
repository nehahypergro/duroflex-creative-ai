'use strict';
// Regression (live run 9 Nov 2026, job creative-9a98148d… PMax): designs were saved but their check
// failed after a paid call ("fetch failed", a 400 after a call-limit cancellation, or "Reviewer
// omitted required checks"). The only way on was "Start another paid attempt", which makes every
// picture again; the legacy "Resume checks" (verificationRetryAvailable) is computed for legacy jobs
// only (engine.view skips lean results), so it was never offered.
// Fix (user decision, 9 Nov 2026): an explicit "Re-run check" sends ONE new review request for the
// same hash-verified saved picture with a new request identity, under the job's budget, never makes a
// picture, keeps the earlier ambiguous request as unknown, and shows the cost note. Offline only: the
// real provider transport runs with a stubbed HTTP send, so request identities and reservations are real.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),flow=require('../../lib/creative-ai/runtime/lean-workflow'),policy=require('../../lib/creative-ai/runtime/lean-policy'),planning=require('../../lib/creative-ai/lean/planning'),handoff=require('../../lib/creative-ai/runtime/stage-handoff');
const recheck=require('../../lib/creative-ai/runtime/lean-recheck'),{OpenAIProvider}=require('./offline-provider.cjs'),{fingerprint}=require('../../lib/creative-ai/art-director');
const base={apiKey:'offline',reasoningModel:'gpt-6-luna',imageModel:'gpt-image-2',maxOutputTokens:16000,maxRecoveryOutputTokens:32000,reasoningTimeoutMs:5000,maxReasoningCalls:40,jobTimeoutMs:3600000,maxConcurrentUnits:1};
function planFor(input){return {...(input?.checklist?.setRules?{setRules:['The same product colourway and label on every page','The same bright bedroom family on every page']}:{}),message:'Comfort at home',audience:'Shoppers',objective:'Consideration',insight:{text:'A comfortable home matters',basis:'hypothesis'},desiredAction:'Explore',concept:'A clear choice',guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].map(r=>({id:r.id,decision:'apply',reason:'Applicable supplied requirement'})),pages:input.format.pages.map(p=>({id:p.id,purpose:p.name,copy:[{role:'headline',text:'Comfort at home',factIds:[]}],artDirection:'Product on the right, copy left',hierarchy:'Headline then product',palette:'Use brand colours',typography:input.brand.fonts[0].family+' Bold 700',spatial:Object.fromEntries(planning.spatialFields.map(k=>[k,'Follow this page’s resolved hierarchy'])),formatConstraints:['Flat artwork, no mockup']})),omitted:[]};}
async function fixture(t,{brand='Duroflex',firstReview='fetch-failed',result=()=>'no_mismatch'}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'lean-recheck-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,'output/cost-tracking'),{recursive:true});await fs.writeFile(path.join(root,'output/cost-tracking/currency.json'),JSON.stringify({displayCurrency:'INR',usdToInr:96.6149,rateDate:'2026-10-09',source:'https://www.msei.in/markets/Currency/Historical-Data/RBIReferenceRateArchives'}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),brandId='brand-'+brand.toLowerCase();
 const bytes=await sharp({create:{width:1024,height:1024,channels:3,background:'#345678'}}).png().toBuffer(),data='data:image/png;base64,'+bytes.toString('base64');
 const intake={brandId,brandUrl:'https://'+brand.toLowerCase()+'.test/',brief:'Introduce this exact SKU.',productName:brand+' Product',productPageUrl:'https://'+brand.toLowerCase()+'.test/products/exact',productVariantId:'queen',originalArtworkVersion:1,leanWorkflowVersion:1,conceptRoutes:['continuity'],approvedLogoReference:{assetId:'approved-logo'},productReferencePolicy:{sourceAssetId:'sku-photo',referenceAssetIds:['sku-photo'],variant:{id:'queen',sku:'EXACT-Q',name:'Queen'}}};
 const selection=[{id:'page-1',description:{name:'Social portrait',formatId:'custom:studio-social-portrait',dimensions:{width:1080,height:1350}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}}];
 const job=await store.create(intake,policy.configure(base,intake),selection);
 const context={job,intake,brand:{id:brandId,name:brand,canvasAssets:{fonts:[{approved:true,brandId,family:brand==='Duroflex'?'Poppins':'Source Sans Pro',weight:700,style:'normal'}]}},research:{brandKnowledge:{brandId},dossier:{version:1,event:'research.completed',researchId:'recheck-'+brand.toLowerCase(),brandName:brand,demo:false,completedAt:'2026-11-09T00:00:00.000Z',sources:[{id:'source-product-page',kind:'product',label:'Official product page',reference:intake.productPageUrl,collectedAt:'2026-11-09T00:00:00.000Z',status:'available'}],assets:[{id:'sku-photo',kind:'product',label:'Exact SKU photo',sourceIds:['source-product-page'],imageData:data},{id:'approved-logo',kind:'logo',label:'Approved logo',sourceIds:['source-product-page'],imageData:data}],findings:[]},productBriefEvidence:{productProfileId:'product-exact',assetIds:['sku-photo'],evidence:[{factId:'fact-1'}]},facts:[{id:'fact-1',status:'supported',text:'Supported feature',sourceIds:[]}]},guardian:{requirements:[{id:'identity',text:'Preserve exact product identity'}],preferences:[],visualRules:[]}};
 // Reviews go through the real provider transport (request keys, reservations, receipts); HTTP is stubbed.
 const provider=new OpenAIProvider(base),bodies=[],calls=[];let requirements=null;
 provider.sendReasoning=async body=>{bodies.push(body);if(bodies.length===1&&firstReview==='fetch-failed')throw new TypeError('fetch failed');
  const out={checks:requirements.map(r=>({id:r.id,result:result(r),evidence:'Observed '+r.name,location:'Whole image'}))};
  return {ok:true,json:async()=>({id:'resp_'+bodies.length,status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(out)}]}],usage:{input_tokens:900,output_tokens:400}})};};
 const reason=async(request,budget)=>{calls.push({kind:request.contextKind,input:request.input,directCheck:request.directCheck});if(request.contextKind==='lean-planning')return planFor(request.input);if(request.contextKind==='lean-review'){requirements=request.input.requirements;return provider.reason(request,budget);}throw Error('Unexpected '+request.contextKind);};
 const runtime={root,store,config:base,readCarouselPlan:async()=>null,provider:{reason,generate:async request=>{calls.push({kind:'image',...request});return {imageData:data};}}};
 runtime.activity=new (require('../../lib/creative-ai/workflow-producer').ActivityLedger)(path.join(root,'output/creative-ai/activity'));runtime.eventQueues=new Map();
 const proto=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype;for(const key of ['log','beginTask','finishTask','artifact','stage'])runtime[key]=proto[key].bind(runtime);
 await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'production',conceptRoutes:intake.conceptRoutes,concepts:intake.conceptRoutes.map(route=>({id:require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:job.id},route),route})),placements:selection.map(s=>({id:s.id,label:s.description.name}))}}});
 await flow.plan(runtime,job.id,{...context,budget:store.budget(job.id),phase:'planning'});
 const dir=store.dir(job.id),key=fingerprint(['continuity','page-1']).slice(0,24);
 await handoff.generate(runtime,job.id).catch(()=>{});
 const read=()=>store.read(job.id),state=async()=>JSON.parse(await fs.readFile(path.join(dir,'lean-state-'+key+'.json'),'utf8'));
 return {root,store,job,dir,key,runtime,bodies,calls,read,state,images:()=>calls.filter(c=>c.kind==='image').length};
}
const click=async(f,extra={})=>{const j=await f.read(),[r]=j.results;return recheck.start(f.runtime,f.job.id,{route:r.route,placementId:r.placementId,sha256:r.sha256,brandId:j.intake.brandId,requestId:'recheck-test-0001',...extra});};

for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': an interrupted check offers Re-run check with the cost note; one click sends one new review of the same picture',async t=>{
  const f=await fixture(t,{brand});
  let j=await f.read();assert.equal(j.status,'partial');let s=await f.state();assert.equal(s.status,'interrupted');assert.equal(s.review,undefined);assert.match(s.error.message,/fetch failed/);
  const earlierKeys=Object.keys(j.budget.requestStates||{}).filter(k=>k.startsWith('reasoning:'));assert.equal(earlierKeys.length,1,'the ambiguous earlier request stays reserved');
  assert.equal(f.bodies.length,1);const imagesBefore=f.images();assert.equal(imagesBefore,1);
  // Offered on the project view, with the plain cost note.
  await recheck.decorate(f.runtime,j);const offer=j.results[0].leanRecheck;assert.equal(offer.available,true);
  assert.match(offer.costNote,/^The earlier check may also have been charged \(about ₹\d+\); that cost stays marked unknown\.$/);assert.match(offer.message,/sends one new check of the same saved design \(about ₹\d+\)\. It never makes a new picture\./);
  // Stale or wrong-brand clicks send nothing.
  await assert.rejects(click(f,{sha256:'0'.repeat(64)}),/changed/);await assert.rejects(click(f,{brandId:'brand-other'}),/another brand/);assert.equal(f.bodies.length,1);
  const out=await click(f);assert.equal(out.status,'completed');
  assert.equal(f.bodies.length,2,'exactly one new review request');
  // User decision, 10 Nov 2026: Re-run check always skips OpenAI's background queue, older jobs too.
  const reviews=f.calls.filter(c=>c.kind==='lean-review');assert.equal(reviews.at(-1).directCheck,true,'the re-run check is sent directly');assert.notEqual(reviews[0].directCheck,true,'the first check keeps the job\'s own mode');assert.equal(f.images(),imagesBefore,'no picture is made');
  assert.ok(/recheck\\+":\{\\+"number\\+":1/.test(JSON.stringify(f.bodies[1].input)),'a new request identity');
  j=await f.read();const keys=Object.keys(j.budget.requestStates||{}).filter(k=>k.startsWith('reasoning:'));assert.equal(keys.length,2);assert.ok(keys.includes(earlierKeys[0]),'the earlier ambiguous request is kept, not overwritten');
  assert.ok(!j.budget.receipts.some(r=>r.requestKey===earlierKeys[0].slice(10)&&r.chargeStatus!=='unknown'&&r.usage&&Object.keys(r.usage).length),'the earlier request is never given a known cost');
  s=await f.state();assert.equal(s.status,'completed');assert.equal(s.review.status,'completed');assert.equal(s.rechecks.length,1);assert.equal(s.rechecks[0].imageSha256,s.original.sha256,'the same saved picture');assert.equal(s.rechecks[0].earlierCheck.chargeStatus,'unknown');assert.match(s.rechecks[0].earlierCheck.error,/fetch failed/);
  const [r]=j.results;assert.equal(r.sha256,s.original.sha256);assert.equal(r.visualReview.status,'completed');assert.equal(r.ready,true);assert.equal(j.status,'finished');assert.deepEqual(j.unitErrors,[]);
  // The same click never sends again; a passed check hides the button.
  const again=await click(f);assert.equal(again.repeated,true);assert.equal(f.bodies.length,2);
  await recheck.decorate(f.runtime,j);assert.equal(j.results[0].leanRecheck,undefined,'hidden once the check passed');
  await assert.rejects(click(f,{requestId:'recheck-test-0002'}),/already finished/);assert.equal(f.bodies.length,2);
 });
 test(brand+': after a re-run check, a remaining difference stays visible and nothing is corrected automatically',async t=>{
  const f=await fixture(t,{brand,result:r=>r.id==='copy-0'?'clear_mismatch':'no_mismatch'});
  await click(f);assert.equal(f.calls.filter(c=>c.kind==='lean-correction').length,0,'no correction call');assert.equal(f.images(),1);
  const [r]=(await f.read()).results;assert.equal(r.ready,false);assert.equal(r.correction.selected,false);assert.match(r.correction.note,/never changes the picture/);
 });
 test(brand+': a design whose check passed never offers Re-run check',async t=>{
  const f=await fixture(t,{brand,firstReview:'ok'});const j=await f.read();assert.equal(j.results[0].visualReview.status,'completed');
  await recheck.decorate(f.runtime,j);assert.equal(j.results[0].leanRecheck,undefined);await assert.rejects(click(f),/already finished/);assert.equal(f.bodies.length,1);
 });
}
