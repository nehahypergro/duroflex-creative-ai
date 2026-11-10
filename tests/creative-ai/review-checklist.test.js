'use strict';
// Regression (asset evaluation of the 9-10 Nov 2026 test round): 6 of the 7 images that did not meet their
// requirements had been marked Ready by the checker:
//  - web push pillow drawn with an invented notch and tag (b2b87081)          -> product fingerprint (fix 1)
//  - A+ detail without the euro-top band (4cd1ae63 #14)                         -> product fingerprint (fix 1)
//  - Marketplace label on the white band, wrong quilt (e933d782 #02, #04)      -> product fingerprint (fix 1)
//  - A+ technology pointer on the base instead of the springs (4cd1ae63 #03)   -> pointers (fix 2)
//  - PDP "alternate angle" repeating the hero view (6dc03ab9 #02)              -> slot purpose (fix 3)
//  - RCS card copying the product photo's neon room (8a014081 #02)             -> no copied room (fix 4)
//  - garbled label words ("DUTONLEX", "BACK NAGIC")                            -> label wording + repair (fix 5)
//  - products cut off by the edge (A+ #03/#04, Marketplace #05/#06)            -> edge fit (fix 6)
//  - a different base under the mattress on each PDP page                       -> set rules (fix 7)
//  - A+ mobile product names 11-13 px, infographic labels 10-12 px              -> text size (fix 8)
//  - "A4 Poster" brief made at A3 (d83d3846)                                    -> size from the brief (fix 9)
// Failing before: none of these checks or pins existed. Both brands; offline fakes, no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp'),crypto=require('node:crypto');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),flow=require('../../lib/creative-ai/runtime/lean-workflow'),policy=require('../../lib/creative-ai/runtime/lean-policy'),planning=require('../../lib/creative-ai/lean/planning'),handoff=require('../../lib/creative-ai/runtime/stage-handoff');
const checklist=require('../../lib/creative-ai/lean/checklist'),edge=require('../../lib/creative-ai/lean/edge-extend'),correction=require('../../lib/creative-ai/lean/correction'),visual=require('../../lib/creative-ai/lean/visual-review'),{fingerprint}=require('../../lib/creative-ai/art-director');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const brands=['Duroflex','Sleepyhead'];
const FEATURES={features:[{feature:'Basket-weave quilting: pairs of long rectangles alternating with pairs of squares',where:'top surface'},{feature:'Thin white quilted top band over a tall charcoal side wall',where:'sides'},{feature:'Orange rectangular label reading "sleepyhead" on the charcoal side wall near the front-left corner',where:'front long side'}],labelWords:'sleepyhead'};

function planFor(input,{setRules=true}={}){return {...(input?.checklist?.setRules&&setRules?{setRules:['The same low grey base under the mattress on every page','The same bright bedroom family on every page']}:{}),message:'Comfort at home',audience:'Shoppers',objective:'Consideration',insight:{text:'A comfortable home matters',basis:'hypothesis'},desiredAction:'Explore',concept:'A clear choice',guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].map(r=>({id:r.id,decision:'apply',reason:'Applicable supplied requirement'})),pages:input.format.pages.map((p,i)=>({id:p.id,purpose:i?'Alternate product angle: the opposite long side, seen from front-right':p.name,copy:[{role:'headline',text:'Comfort at home'+(i?' '+(i+1):''),factIds:[]}],artDirection:'Product on the right, copy left',hierarchy:'Headline then product',palette:'Use brand colours',typography:input.brand.fonts[0].family+' Bold 700',spatial:Object.fromEntries(planning.spatialFields.map(k=>[k,k==='productPlacement'?'Whole mattress, front-right three-quarter view':'Follow this page’s resolved hierarchy'])),formatConstraints:['Flat artwork, no mockup']})),omitted:[]};}
async function fixture(t,{brand='Duroflex',pages=1,root:sharedRoot=null,review=()=>'no_mismatch',fingerprintFails=false,pinned=true,planOptions}={}){
 const root=sharedRoot||await fs.mkdtemp(path.join(os.tmpdir(),'checklist-'));if(!sharedRoot)t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),brandId='brand-'+brand.toLowerCase();
 const bytes=await sharp({create:{width:1024,height:1024,channels:3,background:brand==='Duroflex'?'#345678':'#7a3456'}}).png().toBuffer(),data='data:image/png;base64,'+bytes.toString('base64');
 const intake={brandId,brandUrl:'https://'+brand.toLowerCase()+'.test/',brief:'Introduce this exact SKU.',productName:brand+' Product',productPageUrl:'https://'+brand.toLowerCase()+'.test/products/exact',productVariantId:'queen',originalArtworkVersion:1,leanWorkflowVersion:1,conceptRoutes:['continuity'],approvedLogoReference:{assetId:'approved-logo'},productReferencePolicy:{sourceAssetId:'sku-photo',referenceAssetIds:['sku-photo'],variant:{id:'queen',sku:'EXACT-Q',name:'Queen'}}};
 const selection=Array.from({length:pages},(_,i)=>({id:'page-'+(i+1),description:{name:'Social square '+(i+1),formatId:'custom:studio-social-square',dimensions:{width:1080,height:1080},...(pages>1?{assetSet:{id:'square-set',index:i+1,count:pages}}:{})},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}}));
 const configured=policy.configure({maxConcurrentUnits:1,maxReasoningCalls:100,jobTimeoutMs:3600000},intake),config=pinned?configured:(({reviewChecklistVersion,edgeFitVersion,...rest})=>rest)(configured),job=await store.create(intake,config,selection);
 const context={job,intake,brand:{id:brandId,name:brand,canvasAssets:{fonts:[{approved:true,brandId,family:brand==='Duroflex'?'Poppins':'Source Sans Pro',weight:700,style:'normal'}]}},research:{brandKnowledge:{brandId},dossier:{version:1,event:'research.completed',researchId:'checklist-'+brand.toLowerCase(),brandName:brand,demo:false,completedAt:'2026-11-10T00:00:00.000Z',sources:[{id:'source-product-page',kind:'product',label:'Official product page',reference:intake.productPageUrl,collectedAt:'2026-11-10T00:00:00.000Z',status:'available'}],assets:[{id:'sku-photo',kind:'product',label:'Exact SKU photo',sourceIds:['source-product-page'],imageData:data},{id:'approved-logo',kind:'logo',label:'Approved logo',sourceIds:['source-product-page'],imageData:data}],findings:[]},productBriefEvidence:{productProfileId:'product-exact',assetIds:['sku-photo'],evidence:[{factId:'fact-1'}]},facts:[{id:'fact-1',status:'supported',text:'Supported feature',sourceIds:[]}]},guardian:{requirements:[{id:'identity',text:'Preserve exact product identity'}],preferences:[],visualRules:[]}};
 const calls=[];
 const reason=async request=>{
  calls.push({kind:request.contextKind,input:request.input,images:request.images,instructions:request.instructions});
  if(request.contextKind==='lean-fingerprint'){if(fingerprintFails)throw Error('Simulated provider failure');if(request.validate)request.validate(FEATURES);return structuredClone(FEATURES);}
  if(request.contextKind==='lean-planning'){const out=planFor(request.input,planOptions);if(request.validate)await request.validate(out);return out;}
  const out={checks:request.input.requirements.map(r=>{const result=review(r,{correction:!!request.input.correction});return {id:r.id,result,evidence:result==='clear_mismatch'&&r.id==='layout'?'The mattress is cut off by the right canvas edge.':'Observed '+r.name,location:'Right side'};})};if(request.validate)request.validate(out);return out;
 };
 const runtime={root,store,config,readCarouselPlan:async()=>null,checklistOcr:async()=>({status:'measured',rows:[]}),provider:{reason,generate:async request=>{calls.push({kind:'image',...request});return {imageData:data};}}};
 runtime.activity=new (require('../../lib/creative-ai/workflow-producer').ActivityLedger)(path.join(root,'output/creative-ai/activity'));runtime.eventQueues=new Map();
 const proto=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype;
 for(const key of ['log','beginTask','finishTask','artifact','stage'])runtime[key]=proto[key].bind(runtime);
 await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'production',conceptRoutes:intake.conceptRoutes,concepts:intake.conceptRoutes.map(route=>({id:require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:job.id},route),route})),placements:selection.map(s=>({id:s.id,label:s.description.name}))}}});
 let planError=null;try{await flow.plan(runtime,job.id,{...context,budget:store.budget(job.id),phase:'planning'});}catch(e){planError=e;}
 const dir=store.dir(job.id);let records=[];
 if(!planError){const manifest=JSON.parse(await fs.readFile(path.join(dir,'image-queue.json')));records=await Promise.all(manifest.units.map(u=>fs.readFile(path.join(dir,u.file),'utf8').then(JSON.parse)));}
 const state=r=>fs.readFile(path.join(dir,'lean-state-'+fingerprint([r.route,r.placementId]).slice(0,24)+'.json'),'utf8').then(JSON.parse);
 return {root,store,job,dir,runtime,records,calls,state,planError,data,bytes,run:()=>handoff.generate(runtime,job.id),read:()=>store.read(job.id)};
}

test('new lean jobs pin the review checklist and edge fit; the snapshot keeps both; older jobs have neither',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1}),pc=require('../../lib/creative-ai/runtime/provider-config');
 assert.equal(c.reviewChecklistVersion,1);assert.equal(c.edgeFitVersion,1);assert.equal(policy.roles['lean-fingerprint'].model,'gpt-6-luna');
 assert.equal(pc.snapshot(c).reviewChecklistVersion,1);assert.equal(pc.snapshot(c).edgeFitVersion,1);
 assert.equal(pc.snapshot({}).reviewChecklistVersion,undefined);assert.equal(policy.configure({},{}).reviewChecklistVersion,undefined);
});

for(const brand of brands){
 test(brand+': the product fingerprint is read once, saved in this brand\'s own store, reused, and becomes per-feature checks and image-brief must-haves',async t=>{
  const f=await fixture(t,{brand});assert.equal(f.planError,null);
  const reads=f.calls.filter(c=>c.kind==='lean-fingerprint');assert.equal(reads.length,1,'one reading');
  assert.equal(reads[0].images.length,1);assert.equal(reads[0].images[0].id,'sku-photo','only the exact product photo is sent');
  const r=f.records[0],ids=r.reviewContract.requirements.map(x=>x.id);
  assert.equal(r.reviewChecklistVersion,1);assert.deepEqual(r.productFingerprint.features,FEATURES.features);
  for(const id of ['product-feature-1','product-feature-2','product-feature-3','label-wording','pointers','slot-purpose','reference-backdrop'])assert.ok(ids.includes(id),id);
  assert.match(r.reviewContract.requirements.find(x=>x.id==='product-feature-3').expected,/on the charcoal side wall/);
  assert.match(r.reviewContract.requirements.find(x=>x.id==='label-wording').expected,/"sleepyhead"/);
  assert.match(r.prompt,/PRODUCT MUST-HAVES \(from the official photos/);assert.match(r.prompt,/Basket-weave quilting/);
  assert.match(r.reviewInstructions,/REVIEW CHECKLIST v1/);
  const brandId='brand-'+brand.toLowerCase(),saved=await fs.readdir(path.join(f.root,'output/creative-ai/brands',brandId,'product-fingerprints'));assert.equal(saved.length,1);
  // A second job for the same product photos reuses the saved reading: no new call, provenance kept.
  const g=await fixture(t,{brand,root:f.root});assert.equal(g.calls.filter(c=>c.kind==='lean-fingerprint').length,0,'reused, not read again');
  const reused=JSON.parse(await fs.readFile(path.join(g.dir,'lean-product-fingerprint.json'),'utf8'));assert.equal(reused.reused,true);assert.equal(reused.reusedFrom,f.job.id);
  assert.deepEqual(g.records[0].productFingerprint.features,FEATURES.features);
 });
 test(brand+': the other brand never reuses this brand\'s product fingerprint',async t=>{
  const f=await fixture(t,{brand});const other=brands.find(b=>b!==brand),g=await fixture(t,{brand:other,root:f.root});
  assert.equal(g.calls.filter(c=>c.kind==='lean-fingerprint').length,1,'the other brand reads its own product');
  const key=checklist.cacheKey('brand-'+brand.toLowerCase(),'product-exact','queen',['x']),otherKey=checklist.cacheKey('brand-'+other.toLowerCase(),'product-exact','queen',['x']);assert.notEqual(key,otherKey);
 });
 test(brand+': a failed fingerprint reading never blocks the plan; the job keeps the other checks',async t=>{
  const f=await fixture(t,{brand,fingerprintFails:true});assert.equal(f.planError,null);
  const ids=f.records[0].reviewContract.requirements.map(x=>x.id);assert.ok(!ids.some(id=>id.startsWith('product-feature-')));assert.ok(ids.includes('pointers'));
  assert.match(JSON.parse(await fs.readFile(path.join(f.dir,'lean-product-fingerprint-error.json'),'utf8')).error,/Simulated provider failure/);
 });
 test(brand+': a set plan writes its shared rules; every page brief carries them and every page is checked against them',async t=>{
  const f=await fixture(t,{brand,pages:2});assert.equal(f.planError,null);
  for(const r of f.records){assert.match(r.prompt,/SET RULES \(identical on every page of this set\): The same low grey base/);assert.match(r.reviewContract.requirements.find(x=>x.id==='set-rules').expected,/same low grey base/);}
  assert.match(f.records[1].reviewContract.requirements.find(x=>x.id==='slot-purpose').expected,/opposite long side, seen from front-right/);
  const bad=await fixture(t,{brand,pages:2,planOptions:{setRules:false}});assert.match(bad.planError.message,/setRules/);
 });
 test(brand+': an older job keeps its contract: no fingerprint reading, no checklist checks',async t=>{
  const f=await fixture(t,{brand,pinned:false});assert.equal(f.calls.filter(c=>c.kind==='lean-fingerprint').length,0);
  const ids=f.records[0].reviewContract.requirements.map(x=>x.id);for(const id of ['pointers','slot-purpose','reference-backdrop','label-wording'])assert.ok(!ids.includes(id),id);
  assert.equal(f.records[0].reviewChecklistVersion,undefined);assert.doesNotMatch(f.records[0].prompt,/PRODUCT MUST-HAVES/);
 });
 test(brand+': a product cut off by the edge gets one edge-fit edit; the scaled artwork is put back exactly and the candidate is used only when the crop is gone',async t=>{
  const f=await fixture(t,{brand,review:(r,{correction})=>r.id==='layout'&&!correction?'clear_mismatch':'no_mismatch'});
  await f.run();const edits=f.calls.filter(c=>c.kind==='image'&&c.attachments?.[0]?.assetId==='lean-edge-anchor');
  assert.equal(edits.length,1,'one edge-fit edit');assert.ok(Buffer.isBuffer(edits[0].mask));assert.match(edits[0].prompt,/Repaint ONLY the transparent border/);
  assert.equal(f.calls.filter(c=>c.kind==='lean-correction').length,0,'no paid diagnosis for an edge fit');
  const s=await f.state(f.records[0]);assert.equal(s.selected,'candidate');assert.equal(s.decision.action,'extend_edges');assert.deepEqual(s.decision.requirementIds,['layout']);
  assert.ok(s.decision.inner.left<(1080-s.decision.inner.width)/2,'cut on the right: the artwork moves left so the new room is on the right');
  const binding=JSON.parse(await fs.readFile(path.join(f.dir,'lean-binding-'+fingerprint([f.records[0].route,f.records[0].placementId]).slice(0,24)+'.json'),'utf8'));assert.equal(binding.kind,'edge-extend');assert.equal(binding.sourceSha256,s.original.sha256);
  const r=(await f.read()).results[0];assert.equal(r.ready,true);assert.equal(r.correction.selected,true);
 });
 test(brand+': an edge-fit candidate that still shows the crop is not used; the original stays "check before using"',async t=>{
  const f=await fixture(t,{brand,review:r=>r.id==='layout'?'clear_mismatch':'no_mismatch'});
  await f.run();const s=await f.state(f.records[0]);assert.equal(s.selected,'original');assert.equal((await f.read()).results[0].ready,false);
 });
 test(brand+': a layout finding that is not an edge crop is still not auto-corrected',async t=>{
  const f=await fixture(t,{brand,review:(r,{correction})=>r.id==='slot-purpose'&&!correction?'clear_mismatch':'no_mismatch'});
  await f.run();assert.equal(f.calls.filter(c=>c.kind==='image').length,1,'only the original image');assert.equal((await f.state(f.records[0])).selected,'original');
 });
}

test('the label close-up and text size come from one local text reading of the finished artwork (no paid call)',async t=>{
 for(const brand of brands){
  const f=await fixture(t,{brand,review:()=>'no_mismatch'});
  f.runtime.checklistOcr=async()=>({status:'measured',rows:[{text:'Comfort at home',confidence:1,box:{x:0.1,y:0.1,width:0.4,height:0.01}},{text:'sleepyhaed',confidence:1,box:{x:0.6,y:0.7,width:0.08,height:0.02}}]});
  await f.run();const review=f.calls.find(c=>c.kind==='lean-review');
  assert.ok(review.images.some(i=>i.id==='artwork-label-closeup'),'garbled label words are still located and enlarged for the checker');
  const r=(await f.read()).results[0],size=r.visualReview.checks.find(c=>c.id==='text-size');
  assert.equal(size.result,'clear_mismatch','an 11 px headline on a 1080 feed post is too small');assert.equal(r.ready,false);
  const s=await f.state(f.records[0]);assert.equal(s.review.requirements.some(x=>x.id==='text-size'),true);
  assert.equal(f.calls.filter(c=>c.kind==='image').length,1,'too-small text is not auto-corrected');
 }
});

test('checklist requirements, validation and correction scope',()=>{
 const input={format:{pages:[{id:'a'},{id:'b'}]}},page={purpose:'Alternate angle: the opposite side',spatial:{productPlacement:'front-right'}};
 const ids=checklist.requirements({fingerprint:FEATURES,page,plan:{setRules:['Same base','Same room']},input}).map(r=>r.id);
 // Live trial, 10 Nov 2026: a product with no readable label returned labelWords "" and the schema check refused it
 // ("$.labelWords: invalid string length"), failing the reading after its repair.
 const check=require('../../lib/creative-ai/marketing-strategist/schema-validator').check;
 assert.deepEqual(check(checklist.fingerprintSchema,{features:FEATURES.features,labelWords:''}),[],'no readable label is a valid answer');
 assert.equal(checklist.promptLine({features:FEATURES.features,labelWords:''}).includes('label reads exactly'),false);
 assert.ok(!checklist.requirements({fingerprint:{features:FEATURES.features,labelWords:''},page,plan:{},input}).some(r=>r.id==='label-wording'));
 assert.deepEqual(ids,['product-feature-1','product-feature-2','product-feature-3','label-wording','pointers','slot-purpose','reference-backdrop','set-rules']);
 assert.ok(!checklist.requirements({fingerprint:null,page,plan:{},input:{format:{pages:[{id:'a'}]}}}).some(r=>r.id==='set-rules'||r.id.startsWith('product-feature')));
 assert.throws(()=>checklist.validateFingerprint({features:[{feature:'Height 20 cm tall',where:'side'},{feature:'White top',where:'top'},{feature:'Grey side',where:'side'}],labelWords:''}),/dimensions/);
 assert.throws(()=>checklist.validateFingerprint({features:[{feature:'White top',where:'top'}],labelWords:''}),/3 to 8/);
 assert.throws(()=>checklist.validateSetRules({setRules:['x']},{checklist:{setRules:true}}),/2 to 6/);assert.doesNotThrow(()=>checklist.validateSetRules({},{checklist:{setRules:false}}));
 for(const id of ['slot-purpose','reference-backdrop','set-rules','text-size'])assert.equal(correction.isLayout(id),true,id+' needs a new composition');
 for(const id of ['pointers','label-wording','product-feature-2'])assert.equal(correction.isLayout(id),false,id+' stays locally fixable');
 const v=visual.contract({product:{name:'P',variant:{},appearance:'A',facts:[]},format:{name:'F',pages:[{id:'a',name:'A',size:'1x1'}]},brand:{mandatory:[]},requirements:{pages:[{id:'a',logo:{treatment:'omit'}}]}},{pages:[{id:'a',purpose:'p',copy:[]}]},'a');
 assert.ok(!v.requirements.some(r=>r.id==='pointers'),'no checklist option: the contract is unchanged');
});

test('text-size minimum follows how each format is viewed (fix 8)',()=>{
 const m=(name,w,h,id='x')=>checklist.minTextPx({id,description:{name,dimensions:{width:w,height:h}}});
 assert.equal(m('Premium A+ page · Hero · mobile',600,450).normal,16);assert.equal(m('Premium A+ page · Hero · desktop',1464,600).normal,16);
 assert.equal(m('Social square',1080,1080).normal,28);assert.equal(m('Product hero',1600,1600,'custom:recipe-pdp-01').normal,40);
 assert.equal(m('Web Push',1024,512),null,'notification images carry no words');assert.equal(checklist.minTextPx({description:{name:'Poster',dimensions:{width:1200,height:1697}}},{print:true}),null,'print keeps its own rules');
 const min={normal:16,fine:13,viewWidth:390};
 const check=checklist.textSizeCheck([{text:'Posture Perfect Pocket Spring',box:{height:12/450}},{text:'Price shown on Amazon',box:{height:0.01}}],{copy:[{role:'product name',text:'Posture Perfect Pocket Spring Orthopedic Mattress'}],min,width:600,height:450});
 assert.equal(check.result,'clear_mismatch');assert.match(check.evidence,/about 12 px tall/);
 assert.equal(checklist.textSizeCheck([{text:'Posture Perfect Pocket Spring',box:{height:20/450}}],{copy:[{role:'product name',text:'Posture Perfect Pocket Spring Orthopedic Mattress'}],min,width:600,height:450}).result,'no_mismatch');
 assert.equal(checklist.textSizeCheck([{text:'Terms apply',box:{height:14/450}}],{copy:[{role:'disclaimer',text:'Terms apply'}],min,width:600,height:450}).result,'no_mismatch','fine print may be smaller');
 assert.equal(checklist.textSizeCheck([{text:'DUROPEDIC',box:{height:0.01}}],{copy:[{role:'headline',text:'Sleep well'}],min,width:600,height:450}),null,'product labels are not planned words');
});

test('the label area is found from near-miss words (garbled labels included) and never spans the whole picture',()=>{
 const rows=[{text:'DUTONLEX',box:{x:0.6,y:0.7,width:0.06,height:0.02}},{text:'DUROPEDIC',box:{x:0.6,y:0.73,width:0.07,height:0.02}},{text:'Choose your next mattress',box:{x:0.1,y:0.1,width:0.4,height:0.05}}];
 const area=checklist.labelArea(rows,'DUROFLEX DUROPEDIC BACK MAGIC PRO +',{width:1600,height:900});
 assert.ok(area&&area.left>0.5*1600&&area.top>0.6*900,'the label region, not the headline');
 // Live landing CTA (7721718d #03): the headline repeats the product name; planned words are not the label.
 const withHeadline=[{text:'Back Magic Pro Plus',box:{x:0.05,y:0.1,width:0.3,height:0.05}},{text:'DUTONLEX',box:{x:0.6,y:0.7,width:0.06,height:0.02}},{text:'RACK HAGIC PRO',box:{x:0.6,y:0.74,width:0.08,height:0.02}}];
 const found=checklist.labelArea(withHeadline,'DUROFLEX DUROPEDIC BACK MAGIC PRO +',{width:1600,height:900,copy:[{role:'product name',text:'Back Magic Pro Plus'}]});
 assert.ok(found&&found.left>0.5*1600,'the label, not the headline that repeats its words');
 assert.equal(checklist.labelArea([{text:'Choose your next mattress',box:{x:0.1,y:0.1,width:0.4,height:0.05}}],'DUROFLEX DUROPEDIC',{width:1600,height:900}),null);
 const one=checklist.labelArea([{text:'DUROFLEX',box:{x:0.05,y:0.05,width:0.1,height:0.02}},{text:'DUROPEDIC',box:{x:0.8,y:0.9,width:0.1,height:0.02}}],'DUROFLEX DUROPEDIC',{width:1600,height:900});
 assert.ok(one&&one.width<0.3*1600&&one.height<0.3*900,'words far apart: a close-up of one group, never one box spanning the picture');
});

test('edge fit is deterministic, moves the artwork away from the cut side and keeps every scaled pixel',async()=>{
 const W=400,H=300,original=await sharp({create:{width:W,height:H,channels:3,background:'#3366aa'}}).composite([{input:await sharp({create:{width:120,height:80,channels:3,background:'#ffcc00'}}).png().toBuffer(),left:300,top:150}]).png().toBuffer();
 const findings=[{id:'layout',evidence:'The mattress is cut off by the right canvas edge.'},{id:'copy-0',evidence:'cut off by the edge'}];
 assert.deepEqual(edge.edgeFindings(findings,correction.isLayout).map(f=>f.id),['layout'],'only layout findings');
 assert.deepEqual(edge.edgeFindings([{id:'layout',evidence:'Logo overlaps the headline'}],correction.isLayout),[]);
 const inner=edge.placement(W,H,edge.sides(findings));assert.ok(inner.left<(W-inner.width)/2);
 const a=await edge.derive(original,W,H,inner),b=await edge.derive(original,W,H,inner);assert.equal(sha(a.anchor),sha(b.anchor));assert.equal(sha(a.mask),sha(b.mask));
 const edited=await sharp({create:{width:W,height:H,channels:3,background:'#ff0000'}}).png().toBuffer(),out=await sharp(await edge.restore(edited,a.small,inner,W,H)).raw().toBuffer(),small=await sharp(a.small).raw().toBuffer();
 let same=0,total=0;for(let y=edge.FEATHER;y<inner.height-edge.FEATHER;y++)for(let x=edge.FEATHER;x<inner.width-edge.FEATHER;x++){total++;const si=(y*inner.width+x)*3,oi=((y+inner.top)*W+x+inner.left)*3;if(out[oi]===small[si]&&out[oi+1]===small[si+1]&&out[oi+2]===small[si+2])same++;}
 assert.equal(same,total,'every pixel inside the blend ring is the scaled original');
 assert.equal(out[0],255,'the border comes from the edit');
});

test('brand isolation sends an edge-fit anchor only when it re-derives the same bytes from this unit\'s saved original',async t=>{
 for(const brand of brands){
  const f=await fixture(t,{brand,review:(r,{correction})=>r.id==='layout'&&!correction?'clear_mismatch':'no_mismatch'});await f.run();
  const sent=f.calls.find(c=>c.kind==='image'&&c.attachments?.[0]?.assetId==='lean-edge-anchor'),key=fingerprint([f.records[0].route,f.records[0].placementId]).slice(0,24);
  const {BrandScopedProvider}=require('../../lib/creative-ai/runtime/brand-isolation');
  const inner=[];const provider=new BrandScopedProvider({async generate(request){inner.push(request);return {imageData:f.data};}},{});
  provider.context=async()=>({scope:{brandId:f.job.intake.brandId},dir:f.dir,leanWorkflowVersion:1});
  const isolation=require('../../lib/creative-ai/runtime/brand-isolation');
  const verify=async request=>{const ctx=await provider.context();const check=isolation.verifyEdgeAnchor;return check(request,ctx);};
  await verify({scope:sent.scope,attachments:[sent.attachments[0]],mask:sent.mask});
  const tampered={...sent.attachments[0],imageData:sent.attachments[0].imageData.slice(0,-8)+'AAAAAAA='};
  await assert.rejects(verify({scope:sent.scope,attachments:[tampered],mask:sent.mask}),/edge anchor bytes changed/);
  await assert.rejects(verify({scope:{...sent.scope,placementId:'page-9'},attachments:[sent.attachments[0]],mask:sent.mask}),/invalid edge anchor|another unit/);
  await assert.rejects(verify({scope:sent.scope,attachments:[sent.attachments[0]],mask:await sharp(sent.mask).flip().png().toBuffer()}),/edge mask changed/);
  assert.equal(key.length,24);
 }
});
