'use strict';
// SKU product check v1 (user request, 9 Nov 2026): "make the SKU product-accuracy checker stricter".
// Original symptoms (live job creative-9a98148d…, 9 Nov 2026): the lean review sent the finished artwork
// and every reference at full resolution as base64; one review wrote 11,296,431 bytes and the socket
// dropped after ~314 s (UND_ERR_SOCKET), another timed out after 343 s, and the reviewer was never told
// that the product photos were angles of one SKU. AI edit versions had no product check at all.
// Failing before: pinned jobs had no skuCheck binding, review pictures were full-size PNG, oversized
// requests were not refused, and edits were saved "Not checked". Offline only: fake providers; no paid call.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),sharp=require('sharp');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),flow=require('../../lib/creative-ai/runtime/lean-workflow'),policy=require('../../lib/creative-ai/runtime/lean-policy'),handoff=require('../../lib/creative-ai/runtime/stage-handoff');
const sku=require('../../lib/creative-ai/lean/sku-check'),visual=require('../../lib/creative-ai/lean/visual-review'),planning=require('../../lib/creative-ai/lean/planning');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),uri=(b,t='png')=>'data:image/'+t+';base64,'+b.toString('base64');
const solid=(w,h,c)=>sharp({create:{width:w,height:h,channels:3,background:c}}).png().toBuffer();
const noise=(w,h)=>sharp({create:{width:w,height:h,channels:3,noise:{type:'gaussian',mean:128,sigma:70}}}).png().toBuffer();
function planFor(input){return {...(input?.checklist?.setRules?{setRules:['The same product colourway and label on every page','The same bright bedroom family on every page']}:{}),message:'Comfort at home',audience:'Shoppers',objective:'Consideration',insight:{text:'A comfortable home matters',basis:'hypothesis'},desiredAction:'Explore',concept:'A clear choice',guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].map(r=>({id:r.id,decision:'apply',reason:'Applicable supplied requirement'})),pages:input.format.pages.map(p=>({id:p.id,purpose:p.name,copy:[{role:'headline',text:'Comfort at home',factIds:[]}],artDirection:'Product on the right, copy left',hierarchy:'Headline then product',palette:'Use brand colours',typography:input.brand.fonts[0].family+' Bold 700',spatial:Object.fromEntries(planning.spatialFields.map(k=>[k,k==='logoPlacement'?'Follow resolved logo inclusion and corner policy':'Follow this page’s hierarchy'])),formatConstraints:['Flat artwork, no mockup']})),omitted:[]};}
// Main-flow fixture: three distinct website photos plus a resized twin of photo 1, and a transparent logo.
async function fixture(t,{brand='Duroflex',pinned=true,photos=3,art,photo=(i)=>solid(1600,1200,['#7a1f2b','#1f5a7a','#3d7a1f'][i])}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'sku-check-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),brandId='brand-'+brand.toLowerCase(),site='https://'+brand.toLowerCase()+'.test/';
 const shots=[];for(let i=0;i<photos;i++)shots.push(await photo(i));
 const twin=await sharp(shots[0]).resize(600).png().toBuffer();
 const logo=await sharp({create:{width:400,height:120,channels:4,background:{r:200,g:20,b:40,alpha:0}}}).composite([{input:await solid(300,80,'#c81428'),left:50,top:20}]).png().toBuffer();
 const ids=shots.map((_,i)=>'sku-'+(i+1)),referenceAssetIds=[ids[0],'sku-twin',...ids.slice(1)];
 const intake={brandId,brandUrl:site,brief:'Introduce this exact SKU.',productName:brand+' Product',productPageUrl:site+'products/exact',productVariantId:'queen',originalArtworkVersion:1,leanWorkflowVersion:1,conceptRoutes:['continuity'],approvedLogoReference:{assetId:'approved-logo'},productReferencePolicy:{sourceAssetId:ids[0],referenceAssetIds,variant:{id:'queen',sku:'EXACT-Q',name:'Queen'}}};
 const selection=[{id:'page-1',description:{name:'Flyer',formatId:'flyer',dimensions:{width:2048,height:2048}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}}];
 const config=policy.configure({maxConcurrentUnits:2,maxReasoningCalls:100,jobTimeoutMs:3600000},intake);if(!pinned)for(const k of ['skuCheckVersion','reviewCheckVersion','labelCheckVersion','layoutCheckVersion','reviewChecklistVersion','edgeFitVersion'])delete config[k]; // an older job has none of the 9 Nov (or later) pins
 const job=await store.create(intake,config,selection);
 const sources=[...shots.map((_,i)=>({id:'src-'+(i+1),kind:'product',label:'Product photo',reference:site+'cdn/photo-'+(i+1)+'.jpg',collectedAt:'2026-11-09T00:00:00.000Z',status:'available'})),{id:'src-twin',kind:'product',label:'Product photo (resized)',reference:site+'cdn/photo-1_600x600.jpg',collectedAt:'2026-11-09T00:00:00.000Z',status:'available'}];
 const assets=[...shots.map((b,i)=>({id:ids[i],kind:'product',label:'Exact SKU photo '+(i+1),sourceIds:['src-'+(i+1)],imageData:uri(b)})),{id:'sku-twin',kind:'product',label:'Resized twin',sourceIds:['src-twin'],imageData:uri(twin)},{id:'approved-logo',kind:'logo',label:'Approved logo',sourceIds:['src-1'],imageData:uri(logo)}];
 const context={job,intake,brand:{id:brandId,name:brand,canvasAssets:{fonts:[{approved:true,brandId,family:brand==='Duroflex'?'Poppins':'Source Sans Pro',weight:700,style:'normal'}]}},research:{brandKnowledge:{brandId},dossier:{version:1,event:'research.completed',researchId:'test-'+brand.toLowerCase(),brandName:brand,demo:false,completedAt:'2026-11-09T00:00:00.000Z',sources,assets,findings:[]},productBriefEvidence:{productProfileId:'product-exact',assetIds:referenceAssetIds,evidence:[]},facts:[]},guardian:{requirements:[],preferences:[],visualRules:[]}};
 const calls=[],artwork=art?await art():await solid(2048,2048,'#e9e2d6');
 const runtime={store,config,readCarouselPlan:async()=>null,provider:{reason:async request=>{calls.push({kind:request.contextKind,request});const out=request.contextKind==='lean-planning'?planFor(request.input):{checks:request.input.requirements.map(r=>({id:r.id,result:'no_mismatch',evidence:'Observed '+r.name,location:'Whole image'}))};if(request.validate)request.validate(out);return out;},generate:async request=>{calls.push({kind:'image',request});return {imageData:uri(artwork)};}}};
 runtime.activity=new (require('../../lib/creative-ai/workflow-producer').ActivityLedger)(path.join(root,'output/creative-ai/activity'));runtime.eventQueues=new Map();
 const proto=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype;for(const key of ['log','beginTask','finishTask','artifact','stage'])runtime[key]=proto[key].bind(runtime);
 await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'production',conceptRoutes:intake.conceptRoutes,concepts:intake.conceptRoutes.map(route=>({id:require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:job.id},route),route})),placements:selection.map(s=>({id:s.id,label:s.description.name}))}}});
 await flow.plan(runtime,job.id,{...context,budget:store.budget(job.id),phase:'planning'});
 const manifest=JSON.parse(await fs.readFile(path.join(store.dir(job.id),'image-queue.json'))),file=path.join(store.dir(job.id),manifest.units[0].file),record=await require('../../lib/creative-ai/runtime/reference-storage').decode(JSON.parse(await fs.readFile(file)),{file});
 return {root,store,job,record,calls,runtime,shots,twin,logo,ids};
}
const state=async f=>{for(const n of await fs.readdir(f.store.dir(f.job.id)))if(n.startsWith('lean-state-'))return JSON.parse(await fs.readFile(path.join(f.store.dir(f.job.id),n)));};
const decoded=img=>{const m=/^data:image\/(png|jpeg);base64,(.+)$/.exec(img.imageData);return {type:m[1],bytes:Buffer.from(m[2],'base64')};};
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': a pinned job checks three distinct SKU angles plus the logo, with shrunk, hash-recorded pictures',async t=>{
 const f=await fixture(t,{brand});
 assert.equal(f.job.runtimeConfig.skuCheckVersion,1,'new lean jobs pin SKU check v1');assert.equal(f.record.skuCheckVersion,1);
 assert.equal(f.record.skuCheck.productAngles,3);assert.equal(f.record.skuCheck.note,undefined);
 assert.deepEqual(f.record.skuCheck.references.map(r=>[r.assetId,r.role]),[[f.ids[0],'product'],[f.ids[1],'product'],[f.ids[2],'product'],['approved-logo','logo']],'the resized twin of photo 1 is not an extra angle');
 assert.deepEqual(f.record.skuCheck.references.slice(0,3).map(r=>r.sha256),f.shots.map(sha),'each angle is bound to its saved bytes');
 assert.match(f.record.reviewInstructions,/SKU check v1/);const product=f.record.reviewContract.requirements.find(r=>r.id==='product').expected;
 for(const word of [/ALL 3 attached reference angles/,/silhouette/,/quilting, stitching and border/,/genuine printed markings/,/extra, duplicated, swapped or wrong product/,/Do not infer dimensions, firmness or hidden internal layers/])assert.match(product,word);
 await handoff.generate(f.runtime,f.job.id);const j=await f.store.read(f.job.id);assert.equal(j.status,'finished',JSON.stringify(j.unitErrors));
 const review=f.calls.find(c=>c.kind==='lean-review').request;
 assert.deepEqual(review.images.map(i=>i.id),['final-artwork',f.ids[0],f.ids[1],f.ids[2],'approved-logo']);
 assert.match(review.images[1].label,/angle 1 of 3/);assert.match(review.images[3].label,/angle 3 of 3/);assert.equal(review.images[4].label,'Official logo reference');
 const art=decoded(review.images[0]),artMeta=await sharp(art.bytes).metadata();assert.equal(art.type,'jpeg');assert.equal(Math.max(artMeta.width,artMeta.height),1536,'artwork long edge capped at 1536 px');
 for(const img of review.images.slice(1,4)){const d=decoded(img),m=await sharp(d.bytes).metadata();assert.equal(d.type,'jpeg');assert.equal(Math.max(m.width,m.height),1024,'reference long edge capped at 1024 px');}
 assert.equal(decoded(review.images[4]).type,'png','a transparent logo stays PNG');
 const total=review.images.reduce((n,i)=>n+i.imageData.length,0);assert.ok(total<sku.LIMITS.maxPayloadBytes,'under the payload ceiling: '+total);
 const s=await state(f);assert.equal(s.review.skuCheck.productAngles,3);const rows=s.review.reviewImages.images;
 assert.equal(rows[0].source.sha256,s.original.sha256,'the original saved artwork hash is recorded');assert.notEqual(rows[0].sent.sha256,rows[0].source.sha256);
 assert.deepEqual(rows.slice(1,4).map(r=>r.source.sha256),f.shots.map(sha));assert.ok(rows.every(r=>/^[a-f0-9]{64}$/.test(r.sent.sha256)&&r.sent.bytes>0));
 // Deterministic: the same saved bytes always give the same smaller copy (stable request identity on resume).
 const again=await sku.reviewImages(f.record,{artwork:await fs.readFile(path.join(f.store.dir(f.job.id),s.original.filename))});assert.deepEqual(again.images.map(i=>sha(Buffer.from(i.imageData))),review.images.map(i=>sha(Buffer.from(i.imageData))));
 assert.ok(j.results.every(r=>r.ready),'checks still publish under the existing conformance rule');
});
test('an older (unpinned) job keeps full-size pictures, the original wording and request contract',async t=>{
 const f=await fixture(t,{pinned:false});assert.equal(f.record.skuCheckVersion,undefined);assert.equal(f.record.skuCheck,undefined);assert.equal(f.record.reviewInstructions,visual.mainInstructions);
 assert.doesNotMatch(f.record.reviewContract.requirements.find(r=>r.id==='product').expected,/reference angle/);
 await handoff.generate(f.runtime,f.job.id);const review=f.calls.find(c=>c.kind==='lean-review').request;
 assert.deepEqual(review.images.slice(1).map(i=>i.imageData),f.record.attachments.map(a=>a.imageData),'saved attachments are sent unchanged');assert.match(review.images[0].imageData,/^data:image\/png;base64,/);
 assert.equal((await state(f)).review.reviewImages,undefined);
});
test('fewer than three SKU photos: the check uses what exists and records it',async t=>{
 const f=await fixture(t,{brand:'Sleepyhead',photos:1});assert.equal(f.record.skuCheck.productAngles,1);assert.match(f.record.skuCheck.note,/Only 1 distinct exact-SKU photo was available/);
 assert.match(f.record.reviewContract.requirements.find(r=>r.id==='product').expected,/ALL 1 attached reference angle of/);
 await handoff.generate(f.runtime,f.job.id);assert.deepEqual(f.calls.find(c=>c.kind==='lean-review').request.images.map(i=>i.id),['final-artwork',f.ids[0],'approved-logo']);
 assert.match((await state(f)).review.skuCheck.note,/Only 1/);
});
test('pictures still too large after shrinking are refused before any paid review request',async t=>{
 const f=await fixture(t,{art:()=>noise(2048,2048),photo:()=>noise(1600,1200)});
 await handoff.generate(f.runtime,f.job.id).catch(()=>{});
 assert.equal(f.calls.filter(c=>c.kind==='lean-review').length,0,'no review request reached the provider');
 const s=await state(f);assert.equal(s.error.code,'REVIEW_PAYLOAD_TOO_LARGE');assert.match(s.error.message,/after shrinking .*No paid request was sent/);assert.ok(s.original.sha256,'the artwork is kept');
});
test('a changed saved picture is held before shrinking; JPEG/PNG choice is deterministic',async t=>{
 const bytes=await solid(3000,1000,'#336699');
 await assert.rejects(sku.shrink(bytes,{id:'x',role:'product',edge:1024,expectedSha256:'0'.repeat(64)}),e=>e.code==='REVIEW_IMAGE_CHANGED');
 const a=await sku.shrink(bytes,{id:'x',role:'product',edge:1024,expectedSha256:sha(bytes)}),b=await sku.shrink(bytes,{id:'x',role:'product',edge:1024});
 assert.equal(a.imageData,b.imageData);assert.deepEqual([a.record.sent.width,a.record.sent.height,a.record.sent.format],[1024,341,'jpeg']);assert.equal(a.record.source.sha256,sha(bytes));
 await assert.rejects(sku.prepare([{id:'big',role:'artwork',kind:'artwork',bytes}],{maxPayloadBytes:1000}),e=>e.code==='REVIEW_PAYLOAD_TOO_LARGE');
});
// ---- AI edit product check ----
const {fixture:editFixture}=require('./helpers/lean-ai-edit-fixture.cjs');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': each new AI edit gets ONE product check with the right pictures; the result and cost are saved, never Ready',async t=>{
 const logo=await sharp({create:{width:200,height:60,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toBuffer();
 const f=await editFixture(t,brand,{extraAssets:[{id:'approved-logo',kind:'logo',roles:['logo'],imageData:uri(logo)}]});
 const send={...f.unit,instruction:'Make the wall soft blue',requestKey:'edit-check-0001',sourceVersionId:'original',expectedVersionId:'original'};
 const created=await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits',send);assert.equal(created.status,202,JSON.stringify(created.body));const saved=await f.done(created.body.id);
 assert.equal(saved.status,'finished');assert.equal(f.checks.length,1,'one check');const req=f.checks[0];
 assert.equal(req.contextKind,'lean-review');assert.equal(req.maxProviderRequests,1);assert.match(req.instructions,/requested change \(the note and any pin comments\) is INTENDED/);
 assert.deepEqual(req.images.map(i=>i.id),['edited-version','before-edit','sku-photo','approved-logo']);
 // Editor test, 10 Nov 2026: the check missed a broken button, a half-recoloured cushion, a leftover leaf and
 // a lamp that was never added. It now also asks whether the request was done and whether anything broke.
 assert.deepEqual(req.input.requirements.map(r=>r.id),['product','extra-products','logo','invented-wording','unchanged-wording','request-done','edit-damage']);assert.equal(req.input.request.instruction,'Make the wall soft blue');assert.match(req.input.requirements.find(r=>r.id==='unchanged-wording').expected,/Sleep better tonight/);
 assert.match(req.input.requirements.find(r=>r.id==='request-done').expected,/only partly/);assert.match(req.input.requirements.find(r=>r.id==='edit-damage').expected,/floating/);assert.equal(req.input.editCheckVersion,2);
 assert.ok(!JSON.stringify(req.input).includes(f.other.b.name+' ('),'no other brand in the check');
 assert.equal(saved.result.check,'passed');assert.equal(saved.result.ready,false);assert.equal(saved.result.qualityVerified,false);assert.equal(saved.result.productCheck.productAngles,1);
 const child=await f.runtime.refinements.store(f.job.id).read(saved.id);assert.deepEqual(child.budget.receipts.map(r=>r.kind).sort(),['image','reasoning'],'image and check receipts on the same child budget');
 assert.equal(child.leanEdit.productCheck.images.images[0].source.sha256,saved.result.sha256,'the saved version hash is verified and recorded');assert.equal(child.leanEdit.productCheck.referenceSource,'saved-design-references');
 const record=JSON.parse(await fs.readFile(path.join(f.runtime.refinements.store(f.job.id).dir(saved.id),'ai-edit-check.json')));assert.equal(record.report.conclusion,'no_mismatch');
 const ledger=JSON.stringify(await new (require('../../lib/cost-tracker').CostTracker)(f.root,{brands:[{id:f.own.b.id,name:brand}]}).snapshot());assert.ok(ledger.includes('check-1'),'the check receipt is in the cost ledger');
 const list=await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits?route=continuity&placementId=square&brandId='+f.own.b.id);assert.ok(list.body.estimate.perCheck>0,'a per-check INR estimate is shown before Send');
 // The same Send again buys neither another edit nor another check.
 assert.equal((await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits',send)).body.id,saved.id);assert.equal(f.checks.length,1);assert.equal(f.calls.length,1);
});
test('a flagged check is shown in plain words; a failed check keeps the version; a check stopped by a restart is closed without re-sending',async t=>{
 let mode='flag';
 const f=await editFixture(t,'Sleepyhead',{check:req=>{if(mode==='fail')throw Error('Reviewer unavailable');return {checks:req.input.requirements.map(r=>({id:r.id,result:r.id==='product'&&mode==='flag'?'clear_mismatch':'no_mismatch',evidence:r.id==='product'&&mode==='flag'?'The quilting differs from the reference photo.':'Observed',location:'Mattress top'}))};}});
 const base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits',send=k=>({...f.unit,instruction:'Warmer light',requestKey:k});
 const flagged=await f.done((await f.api(base,send('edit-check-0101'))).body.id);
 assert.equal(flagged.result.check,'flagged');assert.equal(flagged.result.productCheck.problems[0].evidence,'The quilting differs from the reference photo.');assert.equal(flagged.result.ready,false);
 mode='fail';const failed=await f.done((await f.api(base,send('edit-check-0102'))).body.id);
 assert.equal(failed.status,'finished','a failed check never removes the version');assert.equal(failed.result.check,'unable');assert.match(failed.result.productCheck.error,/could not run/);
 assert.equal((await fetch(f.origin+failed.result.imageUrl)).status,200,'the edited picture is still served');
 // Restart while checking: closed as "unable", nothing re-sent.
 const store=f.runtime.refinements.store(f.job.id),before=f.checks.length;await store.update(flagged.id,c=>{c.leanEdit.productCheck={...c.leanEdit.productCheck,status:'checking'};return c;});
 const list=await f.api(base+'?route=continuity&placementId=square&brandId='+f.own.b.id),row=list.body.versions.find(v=>v.id===flagged.id);
 assert.equal(row.result.check,'unable');assert.match(row.result.productCheck.error,/stopped when the Studio restarted/);assert.equal(f.checks.length,before);
});
test('a version whose saved brand no longer matches its design is not checked and nothing is sent',async t=>{
 const f=await editFixture(t,'Duroflex'),saved=await f.done((await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits',{...f.unit,instruction:'Brighter',requestKey:'edit-check-0201'})).body.id),store=f.runtime.refinements.store(f.job.id),before=f.checks.length;
 await store.update(saved.id,c=>{c.intake.brandId=f.other.b.id;c.leanEdit.productCheck={...c.leanEdit.productCheck,status:'checking'};return c;});
 await f.runtime.leanEdits.check(f.job.id,saved.id);const child=await store.read(saved.id);
 assert.equal(child.leanEdit.productCheck.status,'unable');assert.match(child.leanEdit.productCheck.error,/brand safety check/);assert.equal(f.checks.length,before,'no check request');assert.equal(child.status,'finished');
});
// Live runs, 10 Nov 2026 (Duroflex landing feature module, Sleepyhead listing card): close-ups were flagged for a
// "much larger" label. Label size is judged only against the part of the product that is shown.
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': a close-up label is not flagged for looking larger',()=>{assert.match(sku.labelRequirement(),/in a close-up or cropped view the label naturally looks larger, which is not a defect/);});
