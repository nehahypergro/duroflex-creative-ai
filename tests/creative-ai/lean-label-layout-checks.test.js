'use strict';
// Checker items 6 and 7 (user, 9 Nov 2026). Offline only: fake providers, stubbed local text reading.
// 6. Wrong product label slipped through: live images drew the front label as a large angled badge while
//    the real SKU has a smaller label on the front; the reviewer flagged it once (PMax portrait,
//    Benefit 3) and passed it elsewhere. It only had whole-product photos and a general product check.
//    New records (labelCheckVersion 1) bind a deterministic, hash-checked close-up crop of the genuine
//    label in the official exact-SKU photo and add a separate "Product label/markings" requirement,
//    only when that photo shows a label.
// 7. Layout checks were too strict: clear_mismatch for planned-position percentages ("CTA at 41–46%
//    instead of 77–81%", "logo one-third width vs one-fifth"). New records (layoutCheckVersion 1) flag
//    only real defects; approximate-position differences are advisory notes that never block or
//    trigger a correction.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),sharp=require('sharp');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),flow=require('../../lib/creative-ai/runtime/lean-workflow'),policy=require('../../lib/creative-ai/runtime/lean-policy');
const sku=require('../../lib/creative-ai/lean/sku-check'),visual=require('../../lib/creative-ai/lean/visual-review'),planning=require('../../lib/creative-ai/lean/planning');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),uri=b=>'data:image/png;base64,'+b.toString('base64');
const solid=(w,h,c)=>sharp({create:{width:w,height:h,channels:3,background:c}}).png().toBuffer();
// A product photo with a small rectangular label low on the front (pixels 900..1100 x 900..980).
const labelled=async()=>sharp(await solid(1600,1200,'#d8dde6')).composite([{input:await solid(200,80,'#13306b'),left:900,top:900}]).png().toBuffer();
// What the local text reader returns for that photo (normalised boxes, top-left origin).
const labelRows=[{text:'BRANDMARK',confidence:1,box:{x:920/1600,y:915/1200,width:160/1600,height:28/1200}},{text:'POSTURE',confidence:1,box:{x:940/1600,y:948/1200,width:120/1600,height:20/1200}}];
function planFor(input){return {message:'Comfort at home',audience:'Shoppers',objective:'Consideration',insight:{text:'A comfortable home matters',basis:'hypothesis'},desiredAction:'Explore',concept:'A clear choice',guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].map(r=>({id:r.id,decision:'apply',reason:'Applicable supplied requirement'})),pages:input.format.pages.map(p=>({id:p.id,purpose:p.name,copy:[{role:'headline',text:'Comfort at home',factIds:[]}],artDirection:'Product on the right, copy left',hierarchy:'Headline then product',palette:'Use brand colours',typography:input.brand.fonts[0].family+' Bold 700',spatial:Object.fromEntries(planning.spatialFields.map(k=>[k,k==='ctaPlacement'?'CTA bottom right at 77-81% height':k==='logoPlacement'?'Follow resolved logo inclusion and corner policy':'Follow this page’s hierarchy'])),formatConstraints:['Flat artwork, no mockup']})),omitted:[]};}
async function fixture(t,{brand='Duroflex',pinned=true,rows=labelRows,reply=null}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'label-layout-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),brandId='brand-'+brand.toLowerCase(),site='https://'+brand.toLowerCase()+'.test/';
 const shots=[await labelled(),await solid(1600,1200,'#1f5a7a')],ids=['sku-1','sku-2'];
 const intake={brandId,brandUrl:site,brief:'Introduce this exact SKU.',productName:brand+' Product',productPageUrl:site+'products/exact',productVariantId:'queen',originalArtworkVersion:1,leanWorkflowVersion:1,conceptRoutes:['continuity'],approvedLogoReference:{assetId:'approved-logo'},productReferencePolicy:{sourceAssetId:ids[0],referenceAssetIds:ids,variant:{id:'queen',sku:'EXACT-Q',name:'Queen'}}};
 const selection=[{id:'page-1',description:{name:'Flyer',formatId:'flyer',dimensions:{width:2048,height:2048}},jobInputs:{logoPolicy:{treatment:'omit',reason:'No logo on this page'}}}];
 const config=policy.configure({maxConcurrentUnits:2,maxReasoningCalls:100,jobTimeoutMs:3600000},intake);if(!pinned){delete config.labelCheckVersion;delete config.layoutCheckVersion;delete config.labelGenerationVersion;}if(pinned==='no-label-generation')delete config.labelGenerationVersion;
 const job=await store.create(intake,config,selection);
 const sources=shots.map((_,i)=>({id:'src-'+(i+1),kind:'product',label:'Product photo',reference:site+'cdn/photo-'+(i+1)+'.jpg',collectedAt:'2026-11-09T00:00:00.000Z',status:'available'}));
 const assets=shots.map((b,i)=>({id:ids[i],kind:'product',label:'Exact SKU photo '+(i+1),sourceIds:['src-'+(i+1)],imageData:uri(b)}));
 const context={job,intake,brand:{id:brandId,name:brand,canvasAssets:{fonts:[{approved:true,brandId,family:brand==='Duroflex'?'Poppins':'Source Sans Pro',weight:700,style:'normal'}]}},research:{brandKnowledge:{brandId},dossier:{version:1,event:'research.completed',researchId:'test-'+brand.toLowerCase(),brandName:brand,demo:false,completedAt:'2026-11-09T00:00:00.000Z',sources,assets,findings:[]},productBriefEvidence:{productProfileId:'product-exact',assetIds:ids,evidence:[]},facts:[]},guardian:{requirements:[],preferences:[],visualRules:[]}};
 const calls=[],ocrCalls=[];
 const runtime={store,config,readCarouselPlan:async()=>null,labelOcr:async file=>{ocrCalls.push(file);return {status:'measured',rows};},provider:{reason:async request=>{calls.push({kind:request.contextKind,request});const out=request.contextKind==='lean-planning'?planFor(request.input):reply?reply(request.input.requirements):{checks:request.input.requirements.map(r=>({id:r.id,result:'no_mismatch',evidence:'Observed '+r.name,location:'Whole image'}))};if(request.validate)request.validate(out);return out;},generate:async request=>{calls.push({kind:'image',request});return {imageData:uri(await solid(2048,2048,'#e9e2d6'))};}}};
 runtime.activity=new (require('../../lib/creative-ai/workflow-producer').ActivityLedger)(path.join(root,'output/creative-ai/activity'));runtime.eventQueues=new Map();
 const proto=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype;for(const key of ['log','beginTask','finishTask','artifact','stage'])runtime[key]=proto[key].bind(runtime);
 await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'production',conceptRoutes:intake.conceptRoutes,concepts:intake.conceptRoutes.map(route=>({id:require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:job.id},route),route})),placements:selection.map(s=>({id:s.id,label:s.description.name}))}}});
 await flow.plan(runtime,job.id,{...context,budget:store.budget(job.id),phase:'planning'});
 const manifest=JSON.parse(await fs.readFile(path.join(store.dir(job.id),'image-queue.json'))),file=path.join(store.dir(job.id),manifest.units[0].file),record=await require('../../lib/creative-ai/runtime/reference-storage').decode(JSON.parse(await fs.readFile(file)),{file});
 return {store,job,record,calls,ocrCalls,runtime,shots,ids};
}
const reviews=f=>f.calls.filter(c=>c.kind==='lean-review');
const result=async f=>(await f.store.read(f.job.id)).results[0];

for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': a label in the official photo binds a hash-checked close-up crop and a separate label requirement',async t=>{
  const f=await fixture(t,{brand});
  const label=f.record.skuCheck.label;
  assert.equal(label.status,'found');assert.equal(label.sourceAssetId,f.ids[0]);assert.equal(label.sourceSha256,sha(f.shots[0]));
  // The crop covers the whole label (900..1100 x 900..980) with margin, inside the photo.
  const b=label.box;assert.ok(b.left<=900&&b.top<=900&&b.left+b.width>=1100&&b.top+b.height>=980&&b.left>=0&&b.top>=0&&b.left+b.width<=1600&&b.top+b.height<=1200,JSON.stringify(b));
  const req=f.record.reviewContract.requirements.find(r=>r.id==='product-label');
  assert.equal(req.name,'Product label/markings');assert.match(req.expected,/same shape, size, position and wording as the official label/i);assert.match(req.expected,/unable_to_verify/);
  await flow.generate(f.runtime,f.job.id,f.record,f.store.budget(f.job.id));
  const sent=reviews(f)[0].request.images,crop=sent.find(i=>i.id==='label-close-up');
  assert.ok(crop,'the reviewer receives the label close-up');assert.match(crop.label,/close-up/i);assert.match(crop.label,/angle 1/);
  assert.ok(sent.findIndex(i=>i.id==='label-close-up')>sent.findIndex(i=>i.id===f.ids[1]),'after the product angles');
  // Deterministic and hash-bound: same bytes on resume; a changed source photo is refused before any request.
  const again=await sku.labelCrop(f.record),once=await sku.labelCrop(f.record);assert.equal(sha(again.bytes),sha(once.bytes));
  const swapped={...f.record,attachments:f.record.attachments.map(a=>a.assetId===f.ids[0]?{...a,imageData:uri(f.shots[1])}:a)};
  await assert.rejects(()=>sku.labelCrop(swapped),e=>e.code==='REVIEW_IMAGE_CHANGED');
  // Only the planning step reads text; review uses the saved box.
  assert.equal(f.ocrCalls.length,1);
 });
 test(brand+': no label in the official photo, captions everywhere, or an older record: no label requirement or crop',async t=>{
  const none=await fixture(t,{brand,rows:[]});
  assert.equal(none.record.skuCheck.label.status,'none');assert.ok(!none.record.reviewContract.requirements.some(r=>r.id==='product-label'));
  const captions=await fixture(t,{brand,rows:Array.from({length:9},(_,i)=>({text:'Caption line '+i,confidence:1,box:{x:0.05+0.1*(i%3),y:0.1+0.25*Math.floor(i/3),width:0.2,height:0.02}}))});
  assert.equal(captions.record.skuCheck.label.status,'none','infographic captions are not a label');
  const old=await fixture(t,{brand,pinned:false});
  assert.equal(old.record.skuCheck.label,undefined);assert.equal(old.ocrCalls.length,0);assert.ok(!old.record.reviewContract.requirements.some(r=>r.id==='product-label'));
  await flow.generate(old.runtime,old.job.id,old.record,old.store.budget(old.job.id));assert.ok(!reviews(old)[0].request.images.some(i=>i.id==='label-close-up'));
 });
 test(brand+': planned-position differences are advisory notes, not defects; real layout defects still block',async t=>{
  const f=await fixture(t,{brand,reply:requirements=>({checks:requirements.map(r=>r.id==='spatial-layout'?{id:r.id,result:'clear_mismatch',evidence:'Advisory: the CTA sits at about 41–46% height instead of the planned 77–81%.',location:'CTA'}:{id:r.id,result:'no_mismatch',evidence:'Observed '+r.name,location:'Whole image'})})});
  const spatial=f.record.reviewContract.requirements.find(r=>r.id==='spatial-layout');
  assert.match(spatial.expected,/advisory/i);assert.match(spatial.expected,/cut off|cropped/);assert.match(spatial.expected,/reading order/);
  assert.match(f.record.reviewInstructions,/Advisory:/);assert.equal(f.record.layoutCheckVersion,1);
  await flow.generate(f.runtime,f.job.id,f.record,f.store.budget(f.job.id));
  const r=await result(f);assert.equal(r.ready,true);assert.equal(r.visualReview.conclusion,'no_mismatch');
  assert.match(r.visualReview.advisories.map(a=>a.note).join(' '),/41–46%/);
  assert.equal(f.calls.filter(c=>c.kind==='lean-correction').length,0,'no correction for an advisory note');
  assert.equal(f.calls.filter(c=>c.kind==='image').length,1);
  // A real defect (cut-off CTA) stays a clear_mismatch and goes to the existing correction step.
  const g=await fixture(t,{brand,reply:requirements=>({checks:requirements.map(r=>r.id==='spatial-layout'?{id:r.id,result:'clear_mismatch',evidence:'The CTA is cut off by the right canvas edge.',location:'CTA'}:{id:r.id,result:'no_mismatch',evidence:'Observed '+r.name,location:'Whole image'})})});
  await flow.generate(g.runtime,g.job.id,g.record,g.store.budget(g.job.id));
  assert.equal((await result(g)).visualReview.conclusion,'clear_mismatch');
  // Older records keep their wording and treat the reviewer's result as before.
  const old=await fixture(t,{brand,pinned:false});
  assert.doesNotMatch(old.record.reviewContract.requirements.find(r=>r.id==='spatial-layout').expected,/advisory/i);assert.equal(old.record.layoutCheckVersion,undefined);
 });
}

// Redo run, 9 Nov 2026 (Posture Perfect): the checker flagged the label on every image. The real
// label is a larger angled badge; gpt-image-2 kept drawing a small rectangular tag because it only
// saw whole-product photos. New jobs (labelGenerationVersion 1) also send the SAME deterministic
// label close-up to the image request, as the last image, with a prompt line naming it.
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': the image request carries the official label close-up and says what it is',async t=>{
  const f=await fixture(t,{brand});
  assert.equal(f.record.labelGenerationVersion,1);
  await flow.generate(f.runtime,f.job.id,f.record,f.store.budget(f.job.id));
  const req=f.calls.find(c=>c.kind==='image').request,atts=req.attachments,last=atts[atts.length-1];
  assert.equal(last.assetId,'label-close-up');assert.deepEqual(last.roles,['label']);
  assert.equal(last.imageData,uri((await sku.labelCrop(f.record)).bytes),'exactly the reviewer\'s close-up bytes');
  assert.deepEqual(last.labelSource,{sourceAssetId:f.record.skuCheck.label.sourceAssetId,sourceSha256:f.record.skuCheck.label.sourceSha256,box:f.record.skuCheck.label.box});
  assert.match(req.prompt,new RegExp('Image '+atts.length+' is an enlarged close-up of the genuine product label'));
  assert.ok(!f.record.attachments.some(a=>a.assetId==='label-close-up'),'review references are unchanged');
 });
 test(brand+': no label found, or a job without the pin, sends no label close-up',async t=>{
  for(const opts of [{brand,rows:[]},{brand,pinned:'no-label-generation'}]){
   const f=await fixture(t,opts);
   await flow.generate(f.runtime,f.job.id,f.record,f.store.budget(f.job.id));
   const req=f.calls.find(c=>c.kind==='image').request;
   assert.ok(!req.attachments.some(a=>a.assetId==='label-close-up'));assert.doesNotMatch(req.prompt,/close-up of the genuine product label/);
  }
 });
}
