'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const planned=require('../../lib/creative-ai/experiments/planned-artwork'),catalog=require('../../lib/creative-ai/experiments/asset-catalog'),placements=require('../../lib/creative-ai/runtime/placements'),formats=require('../../lib/creative-ai/runtime/output-formats');
const source=brand=>({job:{id:'saved-'+brand,intake:{brandId:brand,brandUrl:'https://example.com',productName:brand+' exact SKU',productVariantId:'chosen',productAssetId:'photo',productPageUrl:'https://example.com/product',brief:'Required wording and qualifiers. One website banner.',objective:'consideration',language:'English',researchId:'saved-research-'+brand,editableTextVersion:1,composedTextVersion:1,canvasAssets:{old:'font'},assets:[{old:'reference'}]}},record:{prompt:'OLD GENERATED HEADLINE',artDirection:{palette:['OLD WALL COLOUR'],lighting:'OLD LIGHTING'}}});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': realistic set briefs deduplicate shared directions and retain long page requirements',()=>{
 const s=source(brand);s.job.intake.brief='Earlier required context. '.repeat(60);
 const direction='Current product facts and format-specific instruction. '.repeat(14);
 const slots=catalog.resolve([{assetId:'website-product-images',brief:direction}]);
 const out=planned.intakeFor(s,{id:'batch',source:{}},slots);
 assert.ok(out.brief.length<=5000);assert.equal(out.brief.split(direction.trim()).length-1,1);
 assert.equal(out.customProfiles.length,12);assert.ok(out.customProfiles.every(p=>p.displayContext.includes(direction.trim())));
 const large=catalog.resolve([{assetId:'social-instagram-carousel',brief:'Full current requirement. '.repeat(200),parts:Array.from({length:5},(_,i)=>({copy:'Exact page '+i,direction:'Unique instruction '+i}))}]);
 const bounded=planned.intakeFor(s,{id:'batch',source:{}},large);assert.ok(bounded.brief.length<=5000);
 large.forEach((p,i)=>{const ctx=bounded.customProfiles[i].displayContext;assert.ok(ctx.includes(p.direction));assert.ok(ctx.includes(s.job.intake.brief));assert.equal(bounded.jobInputs[planned.profileId(p)].formatIntent.exactCopy,'Exact page '+i);});
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': every raster catalogue family enters shared planning with all pages and its own use',()=>{
 for(const e of catalog.catalog().filter(e=>e.mode==='image')){
  const slots=catalog.resolve([{assetId:e.id,brief:'Current supplied factual direction.'}]),intake=planned.intakeFor(source(brand),{id:'batch',source:{}},slots);
  formats.validate(intake);const result=placements.resolve(intake).selections;
  assert.equal(result.length,slots.length,e.id);assert.equal(intake.brandId,brand);assert.equal(intake.productVariantId,'chosen');assert.ok(intake.brief.includes(source(brand).job.intake.brief));assert.match(intake.brief,/^CURRENT ASSET BRIEF:/);
  assert.equal(intake.researchId,'saved-research-'+brand);assert.equal(intake.rawArtworkExperimentVersion,2);assert.equal(intake.editableCanvas,false);
  assert.doesNotMatch(JSON.stringify(intake),/OLD GENERATED|OLD WALL|OLD LIGHTING|canvasAssets|composedTextVersion|editableTextVersion/);
  assert.deepEqual(result.map(p=>p.id),slots.map(planned.placementId));
  for(const p of result){assert.equal(p.jobInputs.formatIntent.familyId,slots[0].group);assert.equal(p.jobInputs.formatIntent.relationship,slots.length>1?'coordinated-set':'independent');if(e.text==='none')assert.equal(require('../../lib/creative-ai/runtime/copy-content-policy').contentPolicy({},'concept',p).cleanPhoto,true);}
 }
});
test('new asset directions are the primary brief; old host action is attributed context, not a locked structured field',()=>{
 const s=source('Duroflex');s.job.intake.desiredAction='Visit the website';s.job.intake.landingPageUrl='https://example.com/buy';
 const slots=catalog.resolve([{assetId:'retail-poster-flyer',brief:'Invite shoppers to try the sofa in store.'}]),out=planned.intakeFor(s,{id:'batch',source:{}},slots);
 assert.equal(out.desiredAction,undefined);assert.equal(out.landingPageUrl,undefined);assert.match(out.brief,/Earlier action, applicable only if compatible/);assert.match(out.brief,/Visit the website/);assert.match(out.brief,/https:\/\/example.com\/buy/);assert.ok(out.brief.indexOf('Invite shoppers')<out.brief.indexOf('EARLIER CAMPAIGN CONTEXT'));assert.equal(s.job.intake.desiredAction,'Visit the website');
});
test('current exact copy and page briefs stay scoped to their requested pages',()=>{
 const e=catalog.catalog().find(e=>e.id==='social-instagram-carousel'),slots=catalog.resolve([{assetId:e.id,parts:e.parts.map((p,i)=>({copy:'Page '+i,direction:'Purpose '+i}))}]);
 const out=planned.intakeFor(source('Duroflex'),{id:'batch',source:{}},slots);
 slots.forEach((s,i)=>{assert.equal(out.jobInputs[planned.profileId(s)].formatIntent.exactCopy,'Page '+i);assert.match(out.jobInputs[planned.profileId(s)].formatIntent.direction,new RegExp('Purpose '+i));});
});
test('raster print previews carry layout geometry but not production PPI or editable-file requirements',()=>{
 const slots=catalog.resolve([{assetId:'retail-poster-flyer'}]),out=planned.intakeFor(source('Duroflex'),{id:'batch',source:{}},slots),context=out.customProfiles[0].displayContext;
 assert.match(context,/no editable text layers/);assert.match(context,/preview does not promise production PPI/);assert.match(context,/trimWidthMm/);assert.doesNotMatch(context,/"requiredPpi"|"proofPpi"/);assert.equal(slots[0].print.requiredPpi,300);
});
test('five rolling planning jobs keep sets together and preserve good pages on failure',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'planned-raw-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const slots=Array.from({length:8},(_,i)=>({key:'family-'+i,group:'family-'+i,page:1,pages:1}));slots.push({...slots[0],key:'family-0-second',page:2,pages:2});
 const batch={version:3,id:'raw-web-'+'d'.repeat(24),status:'running',items:slots.map(slot=>({slot,status:'queued'})),errors:[]};
 const jobs={},starts=[],ends=[],runtime={root,active:new Set(),pending:[],store:{read:async id=>jobs[id]}};let peak=0;
 await require('../../lib/creative-ai/experiments/web-commerce').executePlanned(runtime,batch,{waitMs:1,createFamily:async family=>{
  const id=family[0].group;starts.push(id);runtime.active.add(id);peak=Math.max(peak,runtime.active.size);jobs[id]={status:'running',results:[]};
  setTimeout(()=>{jobs[id]={status:id==='family-2'?'failed':'finished',error:id==='family-2'?'fixture failure':null,results:id==='family-2'?[]:family.map(s=>({placementId:planned.placementId(s),imageUrl:'/files/'+s.key+'.png',ready:false}))};runtime.active.delete(id);ends.push(id);},id==='family-0'?100:5);return id;
 }});
 assert.equal(peak,5);assert.equal(starts.length,8);assert.ok(ends.indexOf('family-5')<ends.indexOf('family-0'));assert.equal(batch.errors.length,1);assert.equal(batch.items.filter(i=>i.status==='finished').length,8);assert.equal(batch.items[0].jobId,batch.items.at(-1).jobId);assert.equal(batch.status,'partial');
 const disk=JSON.parse(await fs.readFile(path.join(root,'output/creative-ai/raw-artwork-batches',batch.id+'.json')));assert.equal(disk.items.filter(i=>i.result).length,8);
});
test('collection planning validates all page keys and supports no optional fact claims',async()=>{
 const slots=catalog.resolve([{assetId:'social-instagram-carousel'}]),intake=planned.intakeFor(source('Sleepyhead'),{id:'batch',source:{}},slots),selection=placements.resolve(intake).selections;
 let calls=0;const runtime={stage:async(id,stage,agent,file,fn)=>{assert.equal(stage,'collection-plan');return fn();},provider:{reason:async req=>{
  calls++;assert.equal(req.reasoningEffort,'medium');assert.equal(req.input.placements.length,slots.length);
  const value={visualSystem:'One branded visual system',pages:Object.fromEntries(slots.map((s,i)=>['page'+i,{purpose:'Purpose '+i,message:'Message '+i,composition:'Composition '+i,proofFactIds:[]}]))};req.validate(value);assert.throws(()=>req.validate({...value,pages:{page0:value.pages.page0}}));return value;
 }}};
 const output=await require('../../lib/creative-ai/runtime/asset-family-plan').plan(runtime,'job',{selection,strategy:{},concepts:[{conceptId:'concept',route:'continuity'}],facts:[],guardian:{requirements:[]},budget:{}});
 assert.equal(calls,1);output.forEach((p,i)=>assert.equal(p.jobInputs.assetPagePlan.purpose,'Purpose '+i));assert.ok(selection.every(p=>!p.jobInputs.assetPagePlan));
});
async function generationFixture(t,brand){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'planned-bytes-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const {JobStore}=require('../../lib/creative-ai/runtime/store'),store=new JobStore(root),id='creative-test';
 const slot=catalog.resolve([{assetId:'social-instagram-post'}])[0],intake=planned.intakeFor(source(brand),{id:'batch',source:{}},[slot]),selection=placements.resolve(intake).selections;
 await store.save(id,'job.json',{id,intake,status:'running',selection,results:[],budget:{}});
 const bytes=await require('sharp')({create:{width:96,height:64,channels:3,background:'#ababab'}}).png().toBuffer();let calls=0;const events=[];
 const runtime={store,beginTask:async()=>{},finishTask:async()=>{},log:async(...a)=>events.push(a),artifact:async(id,name,kind,data)=>{await store.save(id,name,data);return name;},provider:{generate:async()=>{calls++;return {imageData:'data:image/png;base64,'+bytes.toString('base64')};},reason:()=>{throw Error('No reviewer allowed');}},editable:{generate:()=>{throw Error('No reconstruction allowed');}}};
 const record={assignmentId:id,conceptId:'concept',route:'continuity',placementId:selection[0].id,status:'request-ready',dispatchAllowed:true,prompt:'Fresh approved execution',packageHash:'same-package',canvas:{width:1080,height:1080},exactCopy:{fields:[]},attachmentManifest:[]};return {root,runtime,store,id,record,bytes,calls:()=>calls,events};
}
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': main unit dispatch saves planned raw bytes without review, resizing or reconstruction; repeat reads checkpoint',async t=>{
 const f=await generationFixture(t,brand),unit=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype.unit;
 const result=await unit.call(f.runtime,f.id,f.record,{},{});assert.equal(result.ready,false);assert.equal(result.status,'unreviewed');assert.equal(result.width,96);
 assert.deepEqual(await fs.readFile(path.join(f.store.dir(f.id),result.imageUrl.split('/').pop())),f.bytes);
 await unit.call(f.runtime,f.id,f.record,{},{});assert.equal(f.calls(),1);
 await assert.rejects(unit.call(f.runtime,f.id,{...f.record,packageHash:'changed'},{},{}),/binding changed/);assert.equal(f.calls(),1);
});
test('raw pre-dispatch rejects wrong job, pixel compositing and embedded copy for clean images',async t=>{
 const f=await generationFixture(t,'Duroflex');for(const patch of [{assignmentId:'other'},{protectedProduct:{}},{dispatchAllowed:false}])await assert.rejects(planned.generate(f.runtime,f.id,{...f.record,...patch},{}));
 await assert.rejects(planned.generate(f.runtime,f.id,{...f.record,status:'blocked',dependencies:[{reason:'Specific missing requirement'}]},{}),/Specific missing requirement/);
 await f.store.update(f.id,j=>{j.selection[0].jobInputs.formatIntent.textPolicy='none';return j;});await assert.rejects(planned.generate(f.runtime,f.id,{...f.record,exactCopy:{fields:[{delivery:'embedded',text:'Wrong'}]}},{}),/Image-only/);assert.equal(f.calls(),0);
});
test('raw uncertain failures preserve records and end the generation activity',async t=>{
 const f=await generationFixture(t,'Duroflex');f.runtime.provider.generate=async()=>{throw Error('Uncertain paid outcome');};await assert.rejects(planned.generate(f.runtime,f.id,f.record,{}),/Uncertain paid outcome/);assert.ok(f.events.some(e=>e[1]==='task.failed'));assert.equal((await f.store.read(f.id)).results.length,0);
});
test('real activity ledger accepts family planning and original-image completion; cached planning survives resume',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'planned-ledger-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),runtime=new CreativeRuntime({root,provider:{}}),slots=catalog.resolve([{assetId:'social-instagram-carousel'}]),intake=planned.intakeFor(source('fixture'),{id:'batch',source:{}},slots);
 delete intake.brandId;const selections=placements.resolve(intake).selections,job=await runtime.store.create(intake,runtime.config,selections),id=job.id,conceptId=require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:id},'continuity'),concepts=[{conceptId,route:'continuity'}];
 await runtime.log(id,'job.created','created',{details:{config:{jobId:id,assignmentId:id,mode:'production',conceptRoutes:['continuity'],concepts:[{id:conceptId,route:'continuity'}],placements:selections.map(p=>({id:p.id,label:p.description.name}))}},description:'Offline fixture',outcome:'No paid calls'});
 let reasonCalls=0,imageCalls=0;const bytes=await require('sharp')({create:{width:96,height:64,channels:3,background:'#ccc'}}).png().toBuffer();
 runtime.provider={reason:async req=>{reasonCalls++;const out={visualSystem:'Shared identity',pages:Object.fromEntries(slots.map((s,i)=>['page'+i,{purpose:'Purpose '+i,message:'Message '+i,composition:'Composition '+i,proofFactIds:[]}]))};req.validate(out);return out;},generate:async()=>{imageCalls++;return {imageData:'data:image/png;base64,'+bytes.toString('base64')};}};
 const module=require('../../lib/creative-ai/runtime/asset-family-plan'),input={selection:selections,strategy:{},concepts,facts:[],guardian:{requirements:[]},budget:runtime.store.budget(id)};
 const output=await module.plan(runtime,id,input);assert.equal(output.length,slots.length);await module.plan(runtime,id,input);assert.equal(reasonCalls,1);
 const record={assignmentId:id,conceptId,route:'continuity',placementId:selections[0].id,status:'request-ready',dispatchAllowed:true,prompt:'Offline execution',packageHash:'fixture-package',canvas:{width:1080,height:1080},exactCopy:{fields:[]},attachmentManifest:[]};
 await runtime.unit(id,record,input.budget,{});await runtime.unit(id,record,input.budget,{});assert.equal(imageCalls,1);
 const projection=await runtime.activity.project(id);assert.ok(Object.values(projection.tasks).filter(t=>['collection-plan','generation'].includes(t.kind)).every(t=>t.status==='completed'));
 const saved=await runtime.store.read(id);assert.equal(saved.results[0].ready,false);assert.match(saved.results[0].imageUrl,/\/static-raw-artwork-/);
});
test('selected-family continuation preserves completed and unselected historical attempts',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'planned-resume-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const make=(group,status)=>({slot:{key:group,group,page:1,pages:1},status});
 const batch={version:3,id:'raw-web-'+'e'.repeat(24),resumeFamilies:['stopped','done'],items:[make('stopped','failed'),make('done','finished'),make('old-failure','failed')],errors:[{message:'historical'}]};
 const calls=[],runtime={root,active:new Set(),pending:[],store:{read:async()=>({status:'finished',results:[{placementId:'custom_raw-planned-stopped',imageUrl:'/saved.png'}]})}};
 await require('../../lib/creative-ai/experiments/web-commerce').executePlanned(runtime,batch,{createFamily:async slots=>{calls.push(slots[0].group);return 'job';}});
 assert.deepEqual(calls,['stopped']);assert.equal(batch.items[1].status,'finished');assert.equal(batch.items[2].status,'failed');assert.equal(batch.errors[0].message,'historical');
});
test('planned continuation refuses an unresolved paid request instead of scheduling it',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'planned-unknown-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const job={id:'job',intake:{brandId:'Duroflex',conceptRoutes:['continuity']},status:'partial',selection:[{}],results:[],budget:{deadline:Date.now()+60000,requestStates:{x:{kind:'image',key:'a'.repeat(64)}}}};
 let schedules=0;const runtime={active:new Set(),pending:[],store:{read:async()=>job,dir:()=>root},schedule:()=>{schedules++;}};
 await assert.rejects(require('../../lib/creative-ai/experiments/web-commerce').resumePlannedJob(runtime,job),/no saved response/);assert.equal(schedules,0);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': original main delivery preserves bytes and skips reconstruction/review with neutral result',async t=>{
 const f=await generationFixture(t,brand);
 await f.store.update(f.id,j=>{delete j.intake.rawArtworkExperimentVersion;j.intake.originalArtworkVersion=1;return j;});
 const result=await require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype.unit.call(f.runtime,f.id,f.record,{},{});
 assert.equal(result.status,'available');assert.equal(result.originalArtwork,true);assert.equal(result.editable,false);assert.equal(result.qualityVerified,false);assert.equal(result.userNote,undefined);
 assert.deepEqual(await fs.readFile(path.join(f.store.dir(f.id),result.imageUrl.split('/').pop())),f.bytes);
 await require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype.unit.call(f.runtime,f.id,f.record,{},{});assert.equal(f.calls(),1);
});
test('original delivery is pinned only at admission and reversible without modifying supplied intake',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'original-admission-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const mod=require('../../lib/creative-ai/runtime/original-delivery'),input={brandId:'brand',brief:'Exact brief',editableCanvas:true,editableTextVersion:1,composedTextVersion:1};
 await fs.writeFile(path.join(root,'workspace.json'),JSON.stringify({artworkDelivery:'original'}));
 const out=mod.prepare(root,input);assert.equal(out.originalArtworkVersion,1);assert.equal(out.editableCanvas,false);assert.equal(out.composedTextVersion,undefined);assert.equal(out.brief,input.brief);assert.equal(input.editableCanvas,true);
 assert.equal(mod.prepare(root,{...input,rawArtworkExperimentVersion:2}).originalArtworkVersion,undefined);
 await fs.writeFile(path.join(root,'workspace.json'),JSON.stringify({artworkDelivery:'reviewed'}));assert.deepEqual(mod.prepare(root,input),input);assert.equal(mod.enabled(out),true);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': persisted image queue resumes independently, preserves bytes and rejects changed packages',async t=>{
 const f=await generationFixture(t,brand),handoff=require('../../lib/creative-ai/runtime/stage-handoff');
 f.runtime.config={maxConcurrentUnits:1};f.runtime.readCarouselPlan=async()=>null;f.runtime.carouselPackage=async(id,r)=>r;f.runtime.unit=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype.unit;
 const unit=await handoff.saveUnit(f.runtime,f.id,f.record);await handoff.publish(f.runtime,f.id,[unit],1,[]);assert.equal(f.calls(),0);
 await handoff.generate(f.runtime,f.id);assert.equal(f.calls(),1);assert.equal((await f.store.read(f.id)).status,'finished');
 await handoff.generate(f.runtime,f.id);assert.equal(f.calls(),1);
 await f.store.save(f.id,unit.file,{...f.record,prompt:'tampered'});await assert.rejects(handoff.generate(f.runtime,f.id),/changed/);assert.equal(f.calls(),1);
});

for(const brand of ['Duroflex','Sleepyhead'])test(brand+': image-only briefs never unconditionally require embedded text and logo',()=>{
 for(const assetId of ['messaging-email-header-hero','messaging-rcs-card-images','messaging-push-notification-image']){
 const slots=catalog.resolve([{assetId,brief:'Product appearance reference only.'}]);
 const intake=planned.intakeFor(source(brand),{id:'batch',source:{}},slots);
 assert.doesNotMatch(JSON.stringify(intake),/Embedded text and the supplied approved logo are rendered in the image/);
 for(const p of intake.customProfiles){assert.match(p.displayContext,/IMAGE ONLY: zero embedded campaign text/);assert.equal(intake.logoTreatmentByPlacement[p.id],'omit');}
 }
});
