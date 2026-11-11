'use strict';
// Regression (marketing-manager review of the 52-card Sleepyhead Sofa Drip Pro batch, 11 Nov 2026):
//  - about half of 85 headlines started "Make…" or "Bring…"; each card was planned with no memory of the others (fix 2)
//  - "Sofa Drip Pro - 3 Seater Sofa (Fabric, Coco Brown)" printed as ad copy on 54 images                        (fix 3)
//  - features named over a plain sofa ("Removable back cushion" on 41 images, never shown)                        (fix 5)
//  - story words and logo under the app's bars; 1920 px hero lines ~9 CSS px; standee copy too small               (fix 6)
//  - "Removable back cusshion" on the Instagram Feed Ad (2b7c10ca) was marked Ready                                (fix 7)
//  - "3-year conditional warranty" on 25 images; the user chose to leave out "conditional"                        (fix 8)
// Failing before: none of these rules, checks or the marketingRulesVersion pin existed. Both brands; offline fakes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),flow=require('../../lib/creative-ai/runtime/lean-workflow'),policy=require('../../lib/creative-ai/runtime/lean-policy'),handoff=require('../../lib/creative-ai/runtime/stage-handoff');
const mr=require('../../lib/creative-ai/lean/marketing-rules'),checklist=require('../../lib/creative-ai/lean/checklist'),correction=require('../../lib/creative-ai/lean/correction'),{fingerprint}=require('../../lib/creative-ai/art-director');
const brands=['Duroflex','Sleepyhead'];
const NAMES={Duroflex:'Duro Safe - Waterproof Mattress Protector (Queen, White)',Sleepyhead:'Sofa Drip Pro - 3 Seater Sofa (Fabric, Coco Brown)'};
const SHORT={Duroflex:'Duro Safe',Sleepyhead:'Sofa Drip Pro'};
const square=i=>({id:'page-'+i,description:{name:'Social square '+i,formatId:'custom:studio-social-square',dimensions:{width:1080,height:1080}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}});
const story=()=>({id:'story-1',description:{name:'Story · vertical',formatId:'custom:studio-social-story',dimensions:{width:1080,height:1920}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}});

function planFor(input,copyFor){return {...(input?.checklist?.setRules?{setRules:['The same room family on every page','The same product colourway on every page']}:{}),message:'Comfort at home',audience:'Couples',objective:'Purchase',insight:{text:'A first home matters',basis:'hypothesis'},desiredAction:'Buy',concept:'A clear choice',omitted:[],
 guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].map(r=>({id:r.id,decision:'apply',reason:'Applicable supplied requirement'})),
 pages:input.format.pages.map((p,i)=>({id:p.id,purpose:'Show the removable back cushion lifted off, seen from the front',copy:copyFor(input,p,i),artDirection:'A bright room',hierarchy:'Headline first',palette:'Brand colours',typography:input.brand.fonts[0].family+' 700',formatConstraints:['Keep a margin'],spatial:Object.fromEntries(require('../../lib/creative-ai/lean/planning').spatialFields.map(k=>[k,'Centred']))}))};}
const HEADS={'page-1':'Sink into the corner seat','page-2':'Arms that angle outward','story-1':'Lift a cushion, lean back','pdp-1':'Legs that lift the look'};
const freshCopy=(input,p)=>[{role:'headline',text:HEADS[p.id]+(input.marketing?.recentHeadlines?.length?' tonight':''),factIds:[]},{role:'support',text:'Backed by a 3-year conditional warranty.',factIds:['fact-1']}];

async function fixture(t,{brand='Duroflex',root:sharedRoot=null,selection=[square(1)],copyFor=freshCopy,pinned=true,ocrRows=[]}={}){
 const root=sharedRoot||await fs.mkdtemp(path.join(os.tmpdir(),'marketing-'));if(!sharedRoot)t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),brandId='brand-'+brand.toLowerCase();
 const bytes=await sharp({create:{width:1080,height:1080,channels:3,background:brand==='Duroflex'?'#345678':'#7a3456'}}).png().toBuffer(),data='data:image/png;base64,'+bytes.toString('base64');
 const intake={brandId,brandUrl:'https://'+brand.toLowerCase()+'.test/',brief:'Purchase campaign for '+NAMES[brand]+'.',productName:NAMES[brand],productPageUrl:'https://'+brand.toLowerCase()+'.test/products/exact',productVariantId:'v1',originalArtworkVersion:1,leanWorkflowVersion:1,conceptRoutes:['continuity'],approvedLogoReference:{assetId:'approved-logo'},productReferencePolicy:{sourceAssetId:'sku-photo',referenceAssetIds:['sku-photo'],variant:{id:'v1',sku:'EXACT-1',name:'Default'}}};
 const configured=policy.configure({maxConcurrentUnits:1,maxReasoningCalls:100,jobTimeoutMs:3600000},intake),config=pinned?configured:(({marketingRulesVersion,...rest})=>rest)(configured),job=await store.create(intake,config,selection);
 const context={job,intake,brand:{id:brandId,name:brand,canvasAssets:{fonts:[{approved:true,brandId,family:brand==='Duroflex'?'Poppins':'Source Sans Pro',weight:700,style:'normal'}]}},research:{brandKnowledge:{brandId},dossier:{version:1,event:'research.completed',researchId:'mk-'+brand.toLowerCase(),brandName:brand,demo:false,completedAt:'2026-11-11T00:00:00.000Z',sources:[{id:'source-product-page',kind:'product',label:'Official product page',reference:intake.productPageUrl,collectedAt:'2026-11-11T00:00:00.000Z',status:'available'}],assets:[{id:'sku-photo',kind:'product',label:'Exact SKU photo',sourceIds:['source-product-page'],imageData:data},{id:'approved-logo',kind:'logo',label:'Approved logo',sourceIds:['source-product-page'],imageData:data}],findings:[]},productBriefEvidence:{productProfileId:'product-exact',assetIds:['sku-photo'],evidence:[{factId:'fact-1'}]},facts:[{id:'fact-1',status:'supported',text:'Backed by a 3-year conditional warranty.',sourceIds:[]}]},guardian:{requirements:[{id:'identity',text:'Preserve exact product identity'}],preferences:[],visualRules:[]}};
 const calls=[];
 const reason=async request=>{calls.push({kind:request.contextKind,input:request.input,instructions:request.instructions});
  if(request.contextKind==='lean-fingerprint')throw Error('No reading in this test');
  if(request.contextKind==='lean-planning'){const out=planFor(request.input,copyFor);if(request.validate)await request.validate(out);return out;}
  if(request.contextKind==='lean-correction')throw Error('No correction in this test');
  const out={checks:request.input.requirements.map(r=>({id:r.id,result:'no_mismatch',evidence:'Observed '+r.name,location:'Whole image'}))};if(request.validate)request.validate(out);return out;};
 const runtime={root,store,config,readCarouselPlan:async()=>null,checklistOcr:async()=>({status:'measured',rows:ocrRows}),provider:{reason,generate:async request=>{calls.push({kind:'image',...request});return {imageData:data};}}};
 runtime.activity=new (require('../../lib/creative-ai/workflow-producer').ActivityLedger)(path.join(root,'output/creative-ai/activity'));runtime.eventQueues=new Map();
 const proto=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype;for(const key of ['log','beginTask','finishTask','artifact','stage'])runtime[key]=proto[key].bind(runtime);
 await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'production',conceptRoutes:intake.conceptRoutes,concepts:intake.conceptRoutes.map(route=>({id:require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:job.id},route),route})),placements:selection.map(s=>({id:s.id,label:s.description.name}))}}});
 let planError=null;try{await flow.plan(runtime,job.id,{...context,budget:store.budget(job.id),phase:'planning'});}catch(e){planError=e;}
 const dir=store.dir(job.id);let records=[];
 if(!planError){const manifest=JSON.parse(await fs.readFile(path.join(dir,'image-queue.json')));records=await Promise.all(manifest.units.map(u=>fs.readFile(path.join(dir,u.file),'utf8').then(JSON.parse)));}
 return {root,store,job,dir,runtime,records,calls,planError,run:()=>handoff.generate(runtime,job.id),read:()=>store.read(job.id)};
}

test('new lean jobs pin marketing rules v1; the snapshot keeps it; older configs have none',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1}),pc=require('../../lib/creative-ai/runtime/provider-config');
 assert.equal(c.marketingRulesVersion,1);assert.equal(pc.snapshot(c).marketingRulesVersion,1);
 assert.equal(pc.snapshot({}).marketingRulesVersion,undefined);assert.equal(policy.configure({},{}).marketingRulesVersion,undefined);
});

test('short product names from real catalogue names of both brands; a one-word remainder keeps the full name',()=>{
 assert.equal(mr.shortName('Sofa Drip Pro - 3 Seater Sofa (Fabric, Coco Brown)'),'Sofa Drip Pro');
 assert.equal(mr.shortName('Duropedic Airboost 6.8 Arctic Ice Mattress | 1 lakh+ Airknit fibres with latex and adjustable firmness | 100 nights trial'),'Duropedic Airboost 6.8 Arctic Ice Mattress');
 assert.equal(mr.shortName('Duro Safe - Waterproof Mattress Protector'),'Duro Safe');
 assert.equal(mr.shortName('Bamboo Terry Waterproof Mattress Protector, (72 x 60 inches, Queen Size, White).'),'Bamboo Terry Waterproof Mattress Protector');
 assert.equal(mr.shortName('Original - 3 Layered BodyIQ Orthopedic Memory Foam Mattress - Grey'),null);
 assert.equal(mr.shortName('Back Magic Pro Plus Orthopedic Mattress'),null);
});

test('the spelling check finds the real "cusshion" typo and ignores letters the text reader confuses',()=>{
 const copy=[{role:'headline',text:'Make your first home\nsit pretty.'},{role:'support',text:'Removable back cushion for customised comfort.'},{role:'name',text:'Sofa Drip Pro - 3 Seater Sofa'}];
 const box=(y,h=0.02)=>({x:0.1,y,width:0.5,height:h});
 // The exact local-reader rows of the saved Instagram Feed Ad (2b7c10ca), which had been marked Ready.
 const rows=[{text:'Make your first home',confidence:1,box:box(0.1,0.04)},{text:'Removable back cusshion',confidence:1,box:box(0.85)},{text:'for customised comfort.',confidence:1,box:box(0.87)}];
 const c=mr.spellingCheck(rows,{copy,height:1350});assert.equal(c.result,'clear_mismatch');assert.match(c.evidence,/"cusshion" is printed where the plan says "cushion"/);
 assert.equal(mr.spellingCheck([{text:'Removable back cushion',confidence:1,box:box(0.85)}],{copy,height:1350}).result,'no_mismatch');
 // Replay of 263 saved images: these were the reader's misreadings, not typos.
 for(const text of ['Sota Drip Pro - 3 Seater Sota','Removable back cushions'])assert.equal(mr.spellingCheck([{text,confidence:1,box:box(0.5,0.03)}],{copy,height:1080}).result,'no_mismatch',text);
 assert.equal(mr.spellingCheck([{text:'Original - 3 Layered BodylQ',confidence:1,box:box(0.5,0.03)}],{copy:[{role:'name',text:'Original - 3 Layered BodyIQ'}],height:1080}).result,'no_mismatch');
 assert.equal(mr.spellingCheck([{text:'Removable back cushoin',confidence:1,box:box(0.5,0.03)}],{copy,height:1080}).result,'clear_mismatch','two swapped letters');
 assert.equal(mr.spellingCheck([{text:'Unrelated words here',confidence:1,box:box(0.5)}],{copy,height:1080}),null,'nothing planned was read: no claim');
 assert.equal(correction.isLayout('copy-spelling'),false,'a misspelt word goes to the single correction');
});

test('story safe zone is measured on story pages; text-size minimums are bigger for desktop heroes and distance print',()=>{
 const zone={topPx:269,bottomPx:384,height:1920},copy=[{role:'headline',text:'Lift a cushion, lean back'},{role:'cta',text:'Shop now'}];
 const out=mr.storyZoneCheck([{text:'sleepyhead™',confidence:1,box:{x:0.1,y:0.04,width:0.3,height:0.02}},{text:'Shop now',confidence:1,box:{x:0.1,y:0.92,width:0.2,height:0.02}}],{copy,brandName:'Sleepyhead',zone});
 assert.equal(out.result,'clear_mismatch');assert.match(out.evidence,/top 14%/);
 assert.equal(mr.storyZoneCheck([{text:'Lift a cushion, lean back',confidence:1,box:{x:0.1,y:0.3,width:0.5,height:0.03}}],{copy,brandName:'Duroflex',zone}).result,'no_mismatch');
 assert.equal(correction.isLayout('story-safe-zone'),true);assert.equal(correction.isLayout('placement-feature-demonstration'),true);
 const hero={id:'h',description:{name:'Website desktop hero',formatId:'custom:studio-web-hero',dimensions:{width:1920,height:700}}};
 assert.equal(checklist.minTextPx(hero).normal,13,'older jobs: 8.5 CSS px');assert.equal(checklist.minTextPxV2(hero).normal,21,'14 CSS px at a 1280 px desktop view');
 const standee={id:'s',description:{name:'Roll-up standee · Artwork',formatId:'custom:studio-print-standee',dimensions:{width:1093,height:2560},print:{trimWidthMm:850,trimHeightMm:2000}}};
 assert.equal(checklist.minTextPx(standee,{print:true}),null,'older jobs: no print minimum');
 const v2=checklist.minTextPxV2(standee,{print:true});assert.equal(v2.readingMetres,2.9);assert.equal(v2.normal,Math.ceil(10*2.857142857142857*2560/2000));
 const m=checklist.textSizeCheck([{text:'Removable back cushion',box:{x:0,y:0.5,width:0.5,height:0.008}}],{copy:[{role:'support',text:'Removable back cushion'}],min:v2,width:1093,height:2560});
 assert.equal(m.result,'clear_mismatch');assert.match(m.evidence,/read from about 2.9 m it needs at least 37 px/);
});

for(const brand of brands){
 test(brand+': pinned packets carry the copy rule (planning only), the feature rule and the warranty decision; plans use the short name',async t=>{
  const f=await fixture(t,{brand,selection:[square(1),story()]});assert.equal(f.planError,null);
  const plans=f.calls.filter(c=>c.kind==='lean-planning'),input=plans.find(c=>c.input.format.pages[0].id==='page-1').input,storyInput=plans.find(c=>c.input.format.pages[0].id==='story-1').input;
  assert.equal(input.marketing.shortName,SHORT[brand]);assert.deepEqual(input.marketing.shortNamePages,['page-1']);assert.deepEqual(storyInput.marketing.shortNamePages,['story-1']);
  const ids=input.format.guidance.mandatory.map(r=>r.id);for(const id of [mr.COPY_ID,mr.FEATURE_ID])assert.ok(ids.includes(id),id);assert.ok(!ids.includes(mr.STORY_ID),'no story rule on a square post');
  assert.deepEqual(storyInput.format.guidance.rulePlacements[mr.STORY_ID],['story-1'],'story rule on the story page');
  assert.match(input.brand.mandatory.find(r=>r.id==='current-source-acceptance').text,/"conditional" is left out of warranty wording/);
  const square1=f.records.find(r=>r.placementId==='page-1'),storyRec=f.records.find(r=>r.placementId==='story-1');
  assert.equal(square1.marketingRulesVersion,1);
  assert.doesNotMatch(square1.prompt,/CAMPAIGN COPY v1/,'the copy rule shapes the plan only');assert.match(square1.prompt,/FEATURE SHOWN v1/);
  assert.doesNotMatch(square1.prompt,/STORY SAFE ZONE/);assert.match(storyRec.prompt,/STORY SAFE ZONE v1[\s\S]*keep the top 269 px and the bottom 384 px/);
  // The warranty wording is plain in the saved plan and the image brief.
  assert.match(square1.prompt,/"Backed by a 3-year warranty\."/);assert.doesNotMatch(square1.prompt,/conditional warranty\./);
  const review=square1.reviewContract.requirements.map(r=>r.id);
  assert.ok(review.includes('placement-'+mr.FEATURE_ID),'the image check judges the feature');
  assert.ok(!review.includes('placement-'+mr.COPY_ID)&&!storyRec.reviewContract.requirements.some(r=>r.id==='placement-'+mr.STORY_ID),'copy rule and story zone are not judged by eye');
 });
 test(brand+': the full catalogue name in ad copy fails the plan check; marketplace pages may use it',async t=>{
  const full=(input,p)=>[{role:'headline',text:'Lift a cushion, lean back',factIds:[]},{role:'product name',text:NAMES[brand],factIds:['product-exact']}];
  const f=await fixture(t,{brand,copyFor:full});assert.match(f.planError.message,/use the short product name "/);
  const market={id:'pdp-1',description:{name:'Marketplace product images · Key benefit',formatId:'custom:studio-marketplace-set',dimensions:{width:1600,height:1600}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}};
  const g=await fixture(t,{brand,selection:[market],copyFor:full});assert.equal(g.planError,null);
 });
 test(brand+': the next asset for the same product sees this brand\'s earlier headlines; repeats and overused openings fail',async t=>{
  const make=(input,p)=>[{role:'headline',text:p.id==='page-2'?'Make room for you':'Make your first home yours',factIds:[]}];
  // Two posts in one job are planned as two units: the second already sees the first one's headline.
  const f=await fixture(t,{brand,selection:[square(1),square(2)],copyFor:make});assert.equal(f.planError,null,'no repeat yet');
  const second=f.calls.filter(c=>c.kind==='lean-planning')[1].input;assert.deepEqual(second.marketing.recentHeadlines,['Make your first home yours']);
  const file=mr.historyFile(f.root,'brand-'+brand.toLowerCase()),saved=JSON.parse(await fs.readFile(file,'utf8'));
  assert.deepEqual(saved.entries.map(e=>e.headlines),[['Make your first home yours'],['Make room for you']]);
  const again=await fixture(t,{brand,root:f.root,copyFor:make});assert.match(again.planError.message,/already used by a recent asset|overused opening word "make"/);
  const recent=JSON.parse(await fs.readFile(path.join(again.dir,(await fs.readdir(again.dir)).find(n=>n.startsWith('lean-campaign-headlines-'))),'utf8'));
  assert.deepEqual(recent.recent,['Make room for you','Make your first home yours'],'newest first');
  const planned=again.calls.find(c=>c.kind==='lean-planning').input;assert.deepEqual(planned.marketing.avoidOpenings,['make']);
  assert.match(planned.format.guidance.mandatory.find(r=>r.id===mr.COPY_ID).text,/"Make room for you" \| "Make your first home yours"[\s\S]*overused opening words: "Make"/);
  const fresh=await fixture(t,{brand,root:f.root});assert.equal(fresh.planError,null,'a fresh headline passes');
  // The other brand never sees these headlines.
  const other=brands.find(b=>b!==brand),o=await fixture(t,{brand:other,root:f.root,copyFor:make});assert.equal(o.planError,null);
  assert.deepEqual(o.calls.find(c=>c.kind==='lean-planning').input.marketing.recentHeadlines,[]);
 });
 test(brand+': a misspelt planned word is measured at review, blocks Ready and goes to the single correction',async t=>{
  const rows=[{text:'Lift a cushion, lean back',confidence:1,box:{x:0.1,y:0.1,width:0.6,height:0.05}},{text:'Backed by a 3-year warrranty.',confidence:1,box:{x:0.1,y:0.8,width:0.6,height:0.03}}];
  const f=await fixture(t,{brand,ocrRows:rows,copyFor:(input,p,i)=>[{role:'headline',text:'Lift a cushion, lean back',factIds:[]},{role:'support',text:'Backed by a 3-year conditional warranty.',factIds:['fact-1']}]});
  assert.equal(f.planError,null);await f.run();
  const r=(await f.read()).results[0],spell=r.visualReview.checks.find(c=>c.id==='copy-spelling');
  assert.equal(spell.result,'clear_mismatch');assert.match(spell.evidence,/"warrranty" is printed where the plan says "warranty"/);assert.equal(r.ready,false);
  assert.equal(f.calls.filter(c=>c.kind==='lean-correction').length,1,'the misspelling is sent to the one correction');
 });
 test(brand+': an older job keeps its contract: no marketing rules, history or measured spelling check',async t=>{
  const f=await fixture(t,{brand,pinned:false,selection:[square(1),story()]});assert.equal(f.planError,null);
  const input=f.calls.find(c=>c.kind==='lean-planning').input;assert.equal(input.marketing,undefined);
  assert.ok(!input.format.guidance.mandatory.some(r=>[mr.COPY_ID,mr.FEATURE_ID,mr.STORY_ID].includes(r.id)));
  assert.equal(f.records[0].marketingRulesVersion,undefined);assert.match(f.records[0].prompt,/conditional warranty/,'older jobs keep the source wording');
  await assert.rejects(fs.access(mr.historyFile(f.root,'brand-'+brand.toLowerCase())));
 });
}
