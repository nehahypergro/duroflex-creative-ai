'use strict';
// Amazon A+ pages (user decisions, 9 Nov 2026; docs/aplus-20261109.md). Offline only: fake provider,
// no paid calls. Original symptom (audit 8 Nov 2026, work/aplus-audit-20261108/report.md): the
// "Amazon A+ Content" card made 3 plain 1080 x 1080 squares, planned module by module, with no text,
// no copy deck, no alt text and no 2 MB rule.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp');
const M=require('../../public/creative-ai/studio-model'),placements=require('../../lib/creative-ai/runtime/placements'),ctx=require('../../lib/creative-ai/runtime/lean-context');
const flow=require('../../lib/creative-ai/runtime/lean-workflow'),policy=require('../../lib/creative-ai/runtime/lean-policy'),planning=require('../../lib/creative-ai/lean/planning'),handoff=require('../../lib/creative-ai/runtime/stage-handoff');
const aplus=require('../../lib/creative-ai/runtime/aplus'),treatments=require('../../lib/creative-ai/treatment-knowledge'),readability=require('../../lib/creative-ai/runtime/readability');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
const brands=['Duroflex','Sleepyhead'];
const sizes=type=>M.aplusSlots(type).map(s=>s.width+'x'+s.height);

for(const brand of brands)test(brand+': each A+ page type makes every module in every required size in one job',()=>{
 assert.deepEqual(sizes('premium'),['1464x600','600x450','1464x600','600x450','1464x600','600x450','1464x600','600x450','1464x600','600x450','1464x600','600x450','650x350','650x350']);
 assert.deepEqual(sizes('basic'),['970x600','970x300','300x300','300x300','300x300','300x300']);
 assert.deepEqual(sizes('brand-story'),['1464x625','463x625','362x453','362x453','362x453']);
 assert.equal(M.aplusSummary('premium').imageCount,14);assert.equal(M.aplusSummary('premium').moduleCount,6);assert.ok(M.aplusSummary('premium').moduleCount<=7,'Premium allows at most 7 modules');
 assert.equal(M.aplusSummary('basic').imageCount,6);assert.equal(M.aplusSummary('brand-story').imageCount,5);
 assert.ok(M.aplusSummary('premium').modules.find(m=>m.id==='faq').textOnly);
 for(const t of ['premium','basic','brand-story'])assert.ok(M.aplusSummary(t).later.length,'left-out modules are named');
 // The A+ card starts the whole Premium page (recommended), with Basic and Brand Story one choice away.
 const d=M.startAssetDraft('brand-'+brand.toLowerCase(),['amazon-aplus']),o=d.outputs[0];
 assert.equal(M.aplusPage(o).id,'premium');assert.equal(M.staticParts(o).length,14);
 const presets=M.staticRecipeForOutput(o,d).fields[0][3];assert.deepEqual(presets.slice(0,3),['Amazon A+ page — Premium (recommended)','Amazon A+ page — Basic','Amazon A+ page — Brand Story']);
 const rows=M.assetRequirementSummary(o,d).join('\n');assert.match(rows,/14 images in one job/);assert.match(rows,/Benefits carousel · 3 × 1464 × 600 desktop \+ 600 × 450 mobile each/);assert.match(rows,/FAQ · text only/);assert.match(rows,/alt text/);assert.match(rows,/2 MB/);assert.match(rows,/comparison/i);
 // QR codes and contact details are never asked for A+; the offer question warns about Amazon.
 const fields=M.staticRecipeForOutput(o,{...d,brief:'Add a QR code and our phone number'}).fields;
 assert.ok(!fields.some(f=>['contactMode','qrDestination','contactPhone'].includes(f[0])));assert.match(fields.find(f=>f[0]==='promotionMode')[1],/Amazon may reject prices or offers/);
 M.applyAmazonPreset(o,M.aplusPresetName('basic'));assert.equal(M.staticParts(o).length,6);M.applyAmazonPreset(o,M.aplusPresetName('brand-story'));assert.equal(M.staticParts(o).length,5);
});

function pageProfile(brand,type='premium',focus){
 const d=M.startDraft('brand-'+brand.toLowerCase(),'quick',6);if(focus)d.focus=focus;M.applyAmazonPreset(d.outputs[0],M.aplusPresetName(type));
 const p=M.generationProfile(d);return {d,p,resolved:placements.resolve({placementIds:p.placementIds,customProfiles:p.customProfiles,jobInputs:p.jobInputs,logoTreatmentByPlacement:p.logoTreatment,placementLogoPolicyVersion:1})};
}
for(const brand of brands)test(brand+': an A+ page is one coordinated set: one planning group, text rules per page, one logo on the hero',()=>{
 const {p,resolved}=pageProfile(brand);assert.equal(p.unitCount,14);assert.equal(resolved.selections.length,14);
 assert.equal(ctx.groups(resolved.selections).length,1,'every module and size is planned together');
 assert.deepEqual(resolved.selections.map(s=>ctx.textPolicy(s)),['aplus-panel','aplus-mobile','aplus-panel','aplus-mobile','aplus-panel','aplus-mobile','aplus-panel','aplus-mobile','aplus-panel','aplus-mobile','aplus-panel','aplus-mobile','aplus-label','aplus-label']);
 assert.deepEqual(resolved.selections.map(s=>s.jobInputs.logoPolicy.treatment),['include','include',...Array(12).fill('omit')]);
 assert.deepEqual(resolved.selections.map(s=>[s.description.dimensions.width,s.description.dimensions.height]),M.aplusSlots('premium').map(s=>[s.width,s.height]));
 const t=treatments.capture(resolved.selections);assert.ok(t.placements.every(x=>x.treatmentIds.includes('amazon-image-aplus-page')));
 assert.equal(readability.policyFor({id:p.placementIds[0],width:1464,height:600}).classId,'aplus-panel');assert.equal(readability.policyFor({id:p.placementIds[1],width:600,height:450}).classId,'aplus-mobile');assert.equal(readability.policyFor({id:p.placementIds[12],width:650,height:350}).classId,'aplus-image');
 const story=pageProfile(brand,'brand-story','brand');assert.ok(story.p,'Brand Story works without a product');assert.deepEqual(story.resolved.selections.map(s=>ctx.textPolicy(s)),['none','none','aplus-label','aplus-label','aplus-label']);assert.ok(story.resolved.selections.every(s=>s.jobInputs.logoPolicy.treatment==='omit'));
});

test('the A+ pin is for new A+ jobs only; earlier and non-A+ jobs keep their contract',()=>{
 assert.equal(policy.configure({},{leanWorkflowVersion:1,aplusVersion:1}).aplusVersion,1);
 assert.equal(policy.configure({},{leanWorkflowVersion:1}).aplusVersion,undefined);
 assert.equal(policy.configure({},{aplusVersion:1}).aplusVersion,undefined,'legacy (non-lean) jobs never receive it');
});

test('the Studio request pins the A+ contract, supplied wording and the same SKU\'s technology picture',()=>{
 const {d,p}=pageProfile('Duroflex');d.brief='Launch Back Magic Pro on Amazon. Flat 30% off till 15 Nov 2026.';
 const product={id:'product-abc',brandId:'brand-duroflex',assets:[{type:'image',status:'stored',file:'s/a.jpg',sha256:'a'.repeat(64),group:'a-plus-content',width:1200,height:400,url:'https://shop.test/a.jpg',label:'Product Detail Experience',mime:'image/jpeg'},{type:'image',status:'stored',file:'s/i.svg',sha256:'b'.repeat(64),group:'tiles',width:48,height:48,url:'https://shop.test/i.svg',mime:'image/svg+xml'}]};
 const r=require('../../lib/creative-ai/runtime/studio-generation').aplusRequest(p,{promotionMode:'No',offer:'Hidden'},d,product);
 assert.equal(r.aplusVersion,1);assert.deepEqual(Object.keys(r.jobInputs),p.placementIds);assert.equal(Object.values(r.logoTreatmentByPlacement).filter(v=>v==='include').length,2);
 assert.deepEqual(r.aplusSuppliedText,[d.brief],'offer fields are used only when the user says the asset has an offer');
 assert.equal(r.aplusTechnology.productId,'product-abc');assert.equal(r.aplusTechnology.group,'a-plus-content');
 assert.deepEqual(require('../../lib/creative-ai/runtime/studio-generation').aplusRequest(p,{promotionMode:'Yes',offer:'Flat 30% off',terms:'On selected sizes'},d,product).aplusSuppliedText,[d.brief,'Flat 30% off','On selected sizes']);
});

test('technology picture comes from the selected brand\'s own saved product page, for both brands',async()=>{
 const root=path.resolve(__dirname,'../..'),found={};
 for(const [brandId,name] of [['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','Back Magic Pro Plus'],['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','Sense Ortho Ultra']]){
  const dir=path.join(root,'output/creative-ai/brands',brandId,'products');let profile=null;
  for(const id of await fs.readdir(dir).catch(()=>[]))try{const p=JSON.parse(await fs.readFile(path.join(dir,id,'profile.json'),'utf8'));if(p.name.includes(name))profile=p;}catch{}
  if(!profile)continue;const pick=aplus.technologyImageCandidate(profile);found[brandId]=pick;
  assert.ok(pick,name+' has official A+ / feature media');assert.equal(pick.productId,profile.id);assert.ok(profile.assets.some(a=>a.sha256===pick.sha256&&a.group===pick.group));assert.notEqual(pick.group,'product-images');
 }
 assert.ok(Object.keys(found).length>=1,'saved product library available for at least one brand');
 const products={read:async()=>({id:'product-x',brandId:'brand-other',pageUrl:'https://other.test/p'}),savedImage:async()=>({bytes:Buffer.from('x')})};
 await assert.rejects(aplus.loadTechnologyImage({brands:{products}},{brandId:'brand-duroflex',productPageUrl:'https://other.test/p',aplusTechnology:{productId:'product-x',url:'https://other.test/a.jpg',sha256:'0'.repeat(64)}}),/another product or brand/);
});

// ---- Lean planning with a fake provider ------------------------------------------------------------
function planFor(input,{offer=null,banned=false,longAlt=false}={}){
 const a=input.aplus,font=input.brand.fonts[0].family,tech=a.technology.factIds||[];
 const name={role:'product name',text:input.product.name,factIds:[input.product.id]};
 const pages=input.format.pages.map(p=>{const info=a.pages.find(x=>x.id===p.id);let copy=[];
  if(info.textRule==='panel'){copy=[name,{role:'headline',text:info.role==='hero'?'Sleep that resets you':'Made for deep rest',factIds:[]}];if(info.role==='technology'&&tech.length)copy.push({role:'technology chip',text:'5 Zone Orthopedic Support',factIds:[tech[0]]});if(offer&&info.role==='hero')copy.push({role:'offer',text:offer,factIds:[]});if(banned&&info.role==='lifestyle')copy.push({role:'chip',text:'Rated 4.8 stars by customers',factIds:[]},{role:'chip',text:'Visit www.example.com',factIds:[]});}
  if(info.textRule==='label'&&info.unit==='detail-1')copy=[{role:'label',text:'Soft knit cover',factIds:[]}];
  return {id:p.id,purpose:info.moduleName,copy,artDirection:'Exact product, calm bedroom, one visual system',hierarchy:'Name, headline, chips',palette:'Brand colours',typography:copy.length?font+' Bold 700':'No campaign text',spatial:Object.fromEntries(planning.spatialFields.map(k=>[k,'Follow the page rule and natural space'])),formatConstraints:['Flat artwork'],altText:longAlt&&info.role==='hero'?'x'.repeat(101):'The exact mattress shown for the '+info.moduleName.toLowerCase()};});
 for(const p of pages){const info=a.pages.find(x=>x.id===p.id);if(info.textRule==='mobile'){const desk=pages.find(x=>x.id===info.pairOf);p.copy=desk.copy.slice(0,2);p.typography=font+' Bold 700';}}
 return {message:'Deep, supported rest',audience:'Shoppers',objective:'Consideration',insight:{text:'Rest matters',basis:'hypothesis'},desiredAction:'Explore',concept:'One calm story',
  guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].map(r=>({id:r.id,decision:'apply',reason:'Applies'})),pages,omitted:[],
  aplus:{native:a.units.map(u=>({unitId:u.unitId,headline:'About '+u.unitId,body:banned&&u.unitId==='hero'?'Comfort you can feel. Call us now on 1800 123 4567.':'Comfort you can feel.'})),faq:a.faq?[1,2,3].map(n=>({question:'Question '+n+'?',answer:'Answer from the product page.',factIds:[input.product.facts[0].id]})):[]}};
}
async function fixture(t,{brand='Duroflex',type='premium',techFacts=true,techImage=true,offer=null,brief='Make an Amazon A+ page for this exact mattress.',banned=false,pinned=true}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'aplus-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),brandId='brand-'+brand.toLowerCase();
 const bytes=await sharp({create:{width:1024,height:1024,channels:3,background:'#345678'}}).png().toBuffer(),data='data:image/png;base64,'+bytes.toString('base64');
 const techBytes=await sharp({create:{width:1200,height:400,channels:3,background:'#aa3322'}}).jpeg().toBuffer(),techHash=require('crypto').createHash('sha256').update(techBytes).digest('hex');
 const {p,resolved}=pageProfile(brand,type);
 const intake={brandId,brandUrl:'https://'+brand.toLowerCase()+'.test/',brief,productName:brand+' Ortho Mattress',productPageUrl:'https://'+brand.toLowerCase()+'.test/products/exact',productVariantId:'queen',originalArtworkVersion:1,leanWorkflowVersion:1,...(pinned?{aplusVersion:1}:{}),conceptRoutes:['continuity','exploration'],approvedLogoReference:{assetId:'approved-logo'},productReferencePolicy:{sourceAssetId:'sku-photo',referenceAssetIds:['sku-photo'],variant:{id:'queen',sku:'EXACT-Q',name:'Queen'}},
  placementIds:p.placementIds,customProfiles:p.customProfiles,jobInputs:p.jobInputs,logoTreatmentByPlacement:p.logoTreatment,aplusSuppliedText:[brief],...(techImage?{aplusTechnology:{productId:'product-exact',url:'https://'+brand.toLowerCase()+'.test/a.jpg',sha256:techHash,label:'Product Detail Experience',group:'a-plus-content'}}:{})};
 const selection=resolved.selections.map(s=>({id:s.id,description:s.description,jobInputs:s.jobInputs}));
 const config=policy.configure({maxConcurrentUnits:3,maxReasoningCalls:200,jobTimeoutMs:3600000},intake),job=await store.create(intake,config,selection);
 const facts=techFacts?[{id:'fact-tech',status:'supported',text:'5 Zone Orthopedic Support: targeted support layers',sourceIds:[]},{id:'fact-cover',status:'supported',text:'Washable cover',sourceIds:[]}]:[{id:'fact-cover',status:'supported',text:'Washable cover that is easy to clean',sourceIds:[]}];
 const context={job,intake,brand:{id:brandId,name:brand,canvasAssets:{fonts:[{approved:true,brandId,family:brand==='Duroflex'?'Poppins':'Source Sans Pro',weight:700,style:'normal'}]}},research:{brandKnowledge:{brandId},dossier:{version:1,sources:[{id:'source-product-page',kind:'product',label:'Official product page',reference:intake.productPageUrl,status:'available'}],assets:[{id:'sku-photo',kind:'product',label:'Exact SKU photo',sourceIds:['source-product-page'],imageData:data},{id:'approved-logo',kind:'logo',label:'Approved logo',sourceIds:['source-product-page'],imageData:data}],findings:[]},productBriefEvidence:{productProfileId:'product-exact',assetIds:['sku-photo'],evidence:facts.map(f=>({factId:f.id}))},facts},guardian:{requirements:[{id:'identity',text:'Preserve exact product identity'}],preferences:[],visualRules:[]}};
 const calls=[];
 const runtime={store,config,readCarouselPlan:async()=>null,brands:{products:{read:async(b,id)=>({id,brandId:b,pageUrl:intake.productPageUrl}),savedImage:async()=>({bytes:techBytes})}},
  provider:{reason:async request=>{calls.push({kind:request.contextKind,input:request.input,images:request.images});let out;if(request.contextKind==='lean-planning')out=planFor(request.input,{offer,banned});else out={checks:request.input.requirements.map(r=>({id:r.id,result:'no_mismatch',evidence:'Observed '+r.name,location:'Whole image'}))};if(request.validate)request.validate(out);return out;},
   generate:async request=>{calls.push({kind:'image',...request});return {imageData:data};}}};
 runtime.activity=new (require('../../lib/creative-ai/workflow-producer').ActivityLedger)(path.join(root,'output/creative-ai/activity'));runtime.eventQueues=new Map();
 const proto=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype;for(const key of ['log','beginTask','finishTask','artifact','stage'])runtime[key]=proto[key].bind(runtime);
 await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'production',conceptRoutes:intake.conceptRoutes,concepts:intake.conceptRoutes.map(route=>({id:require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:job.id},route),route})),placements:selection.map(s=>({id:s.id,label:s.description.name}))}}});
 await flow.plan(runtime,job.id,{...context,budget:store.budget(job.id),phase:'planning'});
 const manifest=JSON.parse(await fs.readFile(path.join(store.dir(job.id),'image-queue.json'))),records=await Promise.all(manifest.units.map(u=>fs.readFile(path.join(store.dir(job.id),u.file),'utf8').then(JSON.parse)));
 return {store,job,context,runtime,records,calls,techHash};
}

for(const brand of brands)test(brand+': one plan covers all 14 Premium pages; every exact size reaches generation and the exact-canvas fit',async t=>{
 const f=await fixture(t,{brand});
 assert.equal(f.calls.filter(c=>c.kind==='lean-planning').length,1,'ONE planning call for the whole page');assert.equal(f.records.length,14);
 assert.ok(f.records.every(r=>r.plan===undefined||r.plan.pages.length===14));assert.equal(new Set(f.records.map(r=>JSON.stringify(r.plan))).size,1,'every page shares the same plan');
 const input=f.records[0].input;assert.equal(input.aplus.type,'premium');assert.ok(input.format.guidance.mandatory.some(r=>r.id==='aplus-page-v1'));
 assert.ok(!f.records.some(r=>r.prompt.includes('AMAZON A+ PAGE v1')),'the page-planning rule stays out of image prompts');
 assert.match(f.records[0].prompt,/Wide panel: short, large on-image text/);assert.match(f.records[1].prompt,/Mobile version \(600 × 450\)/);assert.match(f.records[12].prompt,/Small image/);
 // The FAQ is text only: no FAQ page; Amazon text fields and FAQ are in the plan.
 assert.equal(f.records[0].plan.aplus.native.length,input.aplus.units.length);assert.equal(f.records[0].plan.aplus.faq.length,3);
 await handoff.generate(f.runtime,f.job.id);const j=await f.store.read(f.job.id);assert.equal(j.status,'finished',JSON.stringify(j.unitErrors));assert.equal(j.results.length,14);
 const images=f.calls.filter(c=>c.kind==='image');assert.equal(images.length,14);
 for(const s of j.selection){const call=images.find(c=>c.scope.placementId===s.id),d=s.description.dimensions;assert.equal(call.size,placements.generationSize(d.width,d.height).size);const r=j.results.find(r=>r.placementId===s.id),m=await sharp(path.join(f.store.dir(f.job.id),r.imageUrl.split('/').pop())).metadata();assert.deepEqual([m.width,m.height],[d.width,d.height],s.id);}
 assert.equal(j.aplus.type,'premium');assert.ok(j.aplus.notes.some(n=>/comparison/i.test(n)));
});

for(const brand of brands)test(brand+': the technology panel cites the SKU technology fact and attaches its official picture; it falls back to a benefit panel without evidence',async t=>{
 const f=await fixture(t,{brand}),tech=f.records.filter(r=>r.input.aplus.pages.find(p=>p.id===r.placementId).role==='technology');
 assert.equal(tech.length,2);assert.equal(f.records[0].input.aplus.technology.status,'available');assert.deepEqual(f.records[0].input.aplus.technology.factIds,['fact-tech']);
 const desktop=tech.find(r=>r.canvas.width===1464);assert.ok(desktop.plan.pages.find(p=>p.id===desktop.placementId).copy.some(c=>c.factIds.includes('fact-tech')&&c.text==='5 Zone Orthopedic Support'));
 for(const r of tech){assert.ok(r.attachments.some(a=>a.roles.includes('technology')),'technology picture attached');assert.match(r.prompt,/official technology picture/);}
 assert.ok(f.records.filter(r=>!tech.includes(r)).every(r=>!r.attachments.some(a=>a.roles.includes('technology'))),'only the technology panel gets it');
 assert.ok(f.calls.find(c=>c.kind==='lean-planning').images.some(i=>i.id==='aplus-technology-image'),'the planner sees the official picture');
 const bad=structuredClone(planFor(f.records[0].input));bad.pages.find(p=>p.id===desktop.placementId).copy=bad.pages.find(p=>p.id===desktop.placementId).copy.slice(0,2);
 assert.throws(()=>planning.validatePlan(bad,f.records[0].input),/technology panel must name the SKU technology/);
 const none=await fixture(t,{brand,techFacts:false});const a=none.records[0].input.aplus;
 assert.equal(a.technology.status,'missing');assert.ok(a.pages.filter(p=>p.module==='technology').every(p=>p.role==='benefit'));
 assert.ok(none.records.every(r=>!r.attachments.some(x=>x.roles.includes('technology'))));
 const j=await none.store.read(none.job.id);assert.ok(j.aplus.notes.some(n=>/replaced with a supported-benefit panel/.test(n)));assert.equal(j.aplus.technology,'missing');
 const noPicture=await fixture(t,{brand,techImage:false});assert.equal(noPicture.records[0].input.aplus.technology.status,'facts-only');assert.ok((await noPicture.store.read(noPicture.job.id)).aplus.notes.some(n=>/no official technology picture/.test(n)));
});

for(const brand of brands)test(brand+': offers appear only when the brief supplies them, with the Amazon warning; banned wording is stripped',async t=>{
 const supplied=await fixture(t,{brand,brief:'A+ page for the launch. Flat 30% off till 15 Nov 2026.',offer:'Flat 30% off'});
 const hero=supplied.records[0];assert.ok(hero.plan.pages[0].copy.some(c=>c.text==='Flat 30% off'));
 assert.ok((await supplied.store.read(supplied.job.id)).aplus.notes.includes(aplus.OFFER_NOTE));
 const invented=await fixture(t,{brand,offer:'Now 40% off'});
 assert.ok(!invented.records[0].plan.pages[0].copy.some(c=>/40% off/.test(c.text)),'an offer not in the brief is removed');
 assert.ok(!(await invented.store.read(invented.job.id)).aplus.notes.includes(aplus.OFFER_NOTE));
 const banned=await fixture(t,{brand,banned:true}),plan=banned.records[0].plan,text=JSON.stringify(plan.pages)+JSON.stringify(plan.aplus);
 for(const word of ['4.8 stars','www.example.com','1800 123 4567'])assert.ok(!text.includes(word),word+' removed');
 assert.ok(!banned.records.some(r=>/4\.8 stars|www\.example|1800 123/.test(r.prompt)));
 const saved=JSON.parse(await fs.readFile(path.join(banned.store.dir(banned.job.id),(await fs.readdir(banned.store.dir(banned.job.id))).find(n=>n.startsWith('lean-aplus-'))),'utf8'));
 assert.deepEqual(saved.removed.map(r=>r.reason).sort(),['contact','customer-review','link']);
 const raw=JSON.parse(await fs.readFile(path.join(banned.store.dir(banned.job.id),(await fs.readdir(banned.store.dir(banned.job.id))).find(n=>n.startsWith('lean-plan-'))),'utf8'));
 assert.ok(JSON.stringify(raw).includes('4.8 stars'),'the saved planner output itself is never rewritten');
 for(const [t2,why] of [['Best seller in mattresses','best-seller'],['Softer than Wakefit','competitor'],['Scan the QR code','qr-code'],['Hurry, limited time','time-sensitive'],['15-Years Warranty','warranty-not-in-brief']])assert.equal(aplus.problem(t2,{aplus:{supplied:['Make an A+ page']}}),why);
 assert.equal(aplus.problem('15-Years Warranty',{aplus:{supplied:['Mention the 15-Years Warranty']}}),null,'warranty wording only when the brief supplies it');
});

for(const brand of brands)test(brand+': Amazon text fields, alt text and on-image text limits are enforced',async t=>{
 const f=await fixture(t,{brand}),input=f.records[0].input;
 assert.throws(()=>planning.validatePlan(planFor(input,{longAlt:true}),input),/alt text/);
 const long=planFor(input);long.aplus.native[0].headline='x'.repeat(71);assert.throws(()=>planning.validatePlan(long,input),/Amazon text for hero/);
 const crowded=planFor(input);crowded.pages[0].copy.push(...[1,2,3,4].map(n=>({role:'chip',text:'Chip '+n,factIds:[]})));assert.throws(()=>planning.validatePlan(crowded,input),/wide panel needs 1-5/);
 const squashed=planFor(input);squashed.pages[1].copy=[{role:'headline',text:'A different message',factIds:[]}];assert.throws(()=>planning.validatePlan(squashed,input),/mobile version must reuse/);
 const wordy=planFor(input);wordy.pages[12].copy=[{role:'label',text:'Four words on label',factIds:[]}];assert.throws(()=>planning.validatePlan(wordy,input),/small image/);
 const noName=planFor(input);noName.pages[0].copy=noName.pages[0].copy.slice(1);assert.throws(()=>planning.validatePlan(noName,input),/hero must name the product/);
 const schema=planning.schemaFor(input);assert.equal(schema.properties.aplus.properties.native.minItems,input.aplus.units.length);assert.ok(schema.properties.pages.items.required.includes('altText'));
 // Image-only small pages may carry no words at all.
 assert.doesNotThrow(()=>planning.validatePlan(planFor(input),input));
});

test('copy deck and Amazon-ready files: PNG when 2 MB or less, JPEG fallback when the PNG is larger',async t=>{
 const f=await fixture(t,{brand:'Duroflex'});await handoff.generate(f.runtime,f.job.id);const j=await f.store.read(f.job.id);
 const deck=await aplus.deck(f.runtime,j);assert.equal(deck.page.imageCount,14);assert.equal(deck.modules.length,6);assert.equal(deck.faq.length,3);
 assert.ok(deck.modules.flatMap(m=>m.images).every(i=>i.altText&&[...i.altText].length<=100));
 const csv=aplus.deckCsv(deck);assert.match(csv,/"Amazon headline"/);assert.match(csv,/"alt text \(desktop\)"/);assert.match(csv,/"question"/);
 const noise=await sharp(Buffer.from(Array.from({length:1464*600*3},()=>Math.floor(Math.random()*256))),{raw:{width:1464,height:600,channels:3}}).png().toBuffer();
 assert.ok(noise.length>aplus.FILE_MAX,'test image is a PNG over 2 MB');
 const big=await aplus.amazonFile(noise);assert.equal(big.format,'jpeg');assert.ok(big.bytes.length<=aplus.FILE_MAX);assert.equal(big.fallback,true);assert.deepEqual([big.width,big.height],[1464,600]);
 const small=await aplus.amazonFile(await sharp({create:{width:1464,height:600,channels:4,background:'#336699'}}).png().toBuffer());assert.equal(small.format,'png');assert.equal((await sharp(small.bytes).metadata()).channels,3,'RGB, no alpha');
 const ids=j.selection.map(s=>s.id),out=await aplus.packageEntries(deck,ids.map((id,i)=>({placementId:id,bytes:i===0?noise:small.bytes})));
 assert.equal(out.files.length,14);assert.equal(out.files[0].format,'jpeg');assert.ok(out.files.every(x=>x.bytes<=aplus.FILE_MAX));
 assert.ok(['amazon-a-plus/copy-deck.json','amazon-a-plus/copy-deck.csv','amazon-a-plus/README.txt'].every(n=>out.entries.some(e=>e.name===n)));
 assert.match(out.entries.find(e=>e.name.endsWith('README.txt')).bytes,/2 MB/);
});

test('historical A+ jobs and earlier module presets keep their image-only, module-by-module contract',async t=>{
 const d=M.startDraft('brand-duroflex','quick',6);M.applyAmazonPreset(d.outputs[0],'Amazon Premium — Full-width image');
 const p=M.generationProfile(d);assert.equal(p.jobInputs,undefined);assert.equal(p.aplus,undefined);
 const r=placements.resolve({placementIds:p.placementIds,customProfiles:p.customProfiles});assert.ok(r.selections.every(s=>ctx.textPolicy(s)==='none'));assert.equal(ctx.groups(r.selections).length,2,'earlier presets are not regrouped');
 // A job saved without the pin never receives the A+ packet, even with A+ page inputs.
 const f=await fixture(t,{pinned:false}).catch(e=>e);assert.ok(f instanceof Error||!f.records[0].input.aplus);
 assert.equal(aplus.packetSection({job:{runtimeConfig:{}},intake:{},selection:[{jobInputs:{aplus:{version:1}}}],facts:[]}),null);
 assert.equal(await aplus.deck({},{runtimeConfig:{}}),null);
});

test('the A+ estimate counts every image and scales completed runs of the same brand',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'aplus-estimate-'));try{await fs.mkdir(path.join(root,'output/cost-tracking'),{recursive:true});await fs.writeFile(path.join(root,'output/cost-tracking/currency.json'),JSON.stringify({displayCurrency:'INR',usdToInr:100,rateDate:'2026-11-01',source:'https://example.test/fx'}));await fs.writeFile(path.join(root,'workspace.json'),JSON.stringify({artworkDelivery:'original',artworkWorkflow:'lean-v1'}));
  const at='2026-11-08T00:01:00Z',r=(kind,model,key,out)=>({kind,model,recordedAt:at,requestKey:key,usage:kind==='image'?{input_tokens:0,output_tokens:out,input_tokens_details:{text_tokens:0,image_tokens:0}}:{input_tokens:0,output_tokens:out}});
  const job=brandId=>({id:'one-'+brandId,status:'finished',createdAt:'2026-11-08T00:00:00Z',intake:{brandId,leanWorkflowVersion:1},runtimeConfig:{roleModels:{'lean-planning':{model:'gpt-6.1-sol'}},leanImageOptions:[{route:'continuity',model:'gpt-image-2'}]},selection:[{description:{dimensions:{width:1080,height:1080}}}],results:[{imageUrl:'a'},{imageUrl:'b'}],budget:{receipts:[r('reasoning','gpt-6.1-sol','plan',20000),r('image','gpt-image-2','i1',5000),r('image','gpt-image-2','i2',5000),r('reasoning','gpt-6-luna','v1',10000),r('reasoning','gpt-6-luna','v2',10000)],requestStates:{}}});
  const runtime={root,config:{},store:{list:async()=>[job('brand-sleepyhead'),job('brand-duroflex')]}},{estimateBrief}=require('../../lib/creative-ai/runtime/studio-estimate');
  const premium=M.generationProfile((()=>{const d=M.startDraft('brand-duroflex','quick',6);M.applyAmazonPreset(d.outputs[0],M.aplusPresetName('premium'));return d;})());
  const e=await estimateBrief(runtime,'brand-duroflex',premium,1);assert.equal(e.status,'scaled-estimate');assert.equal(e.imageCount,14);assert.match(e.message,/14 images/);assert.match(e.message,/₹\d+–₹\d+/);assert.deepEqual(e.samples.map(s=>s.jobId),['one-brand-duroflex'],'same brand only');
  const basic=M.generationProfile((()=>{const d=M.startDraft('brand-duroflex','quick',6);M.applyAmazonPreset(d.outputs[0],M.aplusPresetName('basic'));return d;})());
  const b=await estimateBrief(runtime,'brand-duroflex',basic,1);assert.ok(b.high<e.high,'6 images cost less than 14');
  runtime.store.list=async()=>[];const none=await estimateBrief(runtime,'brand-duroflex',premium,1);assert.equal(none.status,'unavailable');assert.match(none.message,/14 images/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
