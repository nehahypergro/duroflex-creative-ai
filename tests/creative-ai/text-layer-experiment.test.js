'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const E=require('../../lib/creative-ai/experiments/text-layer'),{fingerprint}=require('../../lib/creative-ai/art-director');
function fixture(brand){
 const assets={brandId:brand,fonts:[{id:brand+'-font',brandId:brand,name:'Fixture font',weight:700}],logo:{id:brand+'-logo',brandId:brand,kind:'logo'},logos:[{id:brand+'-logo',brandId:brand,kind:'logo'}]};
 const fields=[{id:'heading',role:'headline',delivery:'embedded',text:'Exact heading'},{id:'support-1',role:'supporting-copy',delivery:'embedded',text:'First supporting line'},{id:'support-2',role:'supporting-copy',delivery:'embedded',text:'Second supporting line'},{id:'caption',role:'body',delivery:'native',text:'Outside artwork'}];
 const spec={conceptId:'concept',route:'continuity',placementId:'square',status:'ready',scene:'A real surface',text:fields.map(f=>({fieldId:f.id,delivery:f.delivery,exactText:f.text}))};
 const plan={safeMargin:.05,text:fields.filter(f=>f.delivery==='embedded').map((f,i)=>({fieldId:f.id,role:f.role,x:.1,y:.15+i*.12,width:.65,height:.1,fontId:assets.fonts[0].id,fontSize:i===0?.08:.05,colour:'#111111',align:'left',lineHeight:1.1,buttonBackground:null,buttonPadding:0,reason:'Grouped by final wording priority'})),logo:{assetId:assets.logo.id,x:.1,y:.05,width:.2,height:.06,reason:'Clear top corner'},protectedRegions:[{id:'product',kind:'product',x:.1,y:.6,width:.8,height:.3,reason:'Exact product stays clear of text'}]};
 const record={conceptId:spec.conceptId,route:spec.route,placementId:spec.placementId,canvas:{width:1080,height:1080},exactCopy:{fields},artDirection:spec,placementContext:{selection:{jobInputs:{logoPolicy:{treatment:'include'}}}}};
 const saved={version:1,brandId:brand,artHash:fingerprint(spec),layout:plan};return {assets,spec,plan,record,saved};
}
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': final wording maps by field, repeated roles keep distinct positions',()=>{
  const f=fixture(brand),d=E.documentFor(f.record,f.assets,'/clean.png',f.saved);
  assert.deepEqual(d.objects.filter(o=>o.fieldId).map(o=>o.text),f.record.exactCopy.fields.filter(f=>f.delivery==='embedded').map(f=>f.text));
  assert.notEqual(d.objects.find(o=>o.fieldId==='support-1').top,d.objects.find(o=>o.fieldId==='support-2').top);
  assert.equal(d.objects.some(o=>o.fieldId==='caption'),false);assert.ok(d.assets.every(a=>a.brandId===brand));
 });
 test(brand+': stale draft or final copy cannot silently reuse old geometry',()=>{
  const f=fixture(brand);f.record.artDirection.scene='Changed final composition';assert.throws(()=>E.documentFor(f.record,f.assets,'/clean.png',f.saved),/different wording, art or placement/);
 });
 test(brand+': changed exact copy fails instead of being silently substituted',()=>{
  const f=fixture(brand);f.record.exactCopy.fields[0].text='Longer revised heading';assert.throws(()=>E.documentFor(f.record,f.assets,'/clean.png',f.saved),/Exact wording changed/);
 });
 test(brand+': missing fields, native overlays and duplicate fields are rejected',()=>{
  for(const mutate of [p=>p.text.pop(),p=>p.text.push({...p.text[0]}),p=>p.text[0].fieldId='caption']){const f=fixture(brand);mutate(f.plan);assert.throws(()=>E.documentFor(f.record,f.assets,'/clean.png',f.saved),/every embedded field/);}
 });
 test(brand+': image-only and logo omission need no invented text or product',()=>{
  const f=fixture(brand);f.spec.text=f.spec.text.filter(t=>t.delivery==='native');f.record.exactCopy.fields=f.record.exactCopy.fields.filter(t=>t.delivery==='native');f.record.placementContext.selection.jobInputs.logoPolicy.treatment='omit';f.plan.text=[];f.plan.logo=null;f.plan.protectedRegions=[];f.saved.artHash=fingerprint(f.spec);
  assert.deepEqual(E.documentFor(f.record,f.assets,'/clean.png',f.saved).objects.map(o=>o.role),['photograph']);
 });
 test(brand+': foreign font/logo and invalid geometry fail locally',()=>{
  for(const mutate of [p=>p.text[0].fontId='foreign-font',p=>p.logo.assetId='foreign-logo',p=>p.text[0].width=1]){const f=fixture(brand);mutate(f.plan);assert.throws(()=>E.documentFor(f.record,f.assets,'/clean.png',f.saved));}
 });
}
test('existing reconciliation owns the extra coordinates; original output contract stays unchanged',()=>{
 const f=fixture('Duroflex'),seen=[];
 const request={input:{artInput:{placements:[{id:'square',jobInputs:{logoPolicy:{treatment:'include'}}}]}},wire:{kind:'typed-reconciliation-v2',input:{strategy:{purpose:'Original strategy'},placements:[{readingPolicy:{minimum:24}}]},instructions:'Existing rules',schema:{type:'object',properties:{adjustments:{type:'array',items:{type:'object',properties:{conceptId:{type:'string'},placementId:{type:'string'}},required:['conceptId','placementId'],additionalProperties:false}}},required:['adjustments'],additionalProperties:false},decode(out){assert.equal(out.adjustments[0].overlayLayout,undefined);return {specifications:[f.spec]};}}};
 const before=JSON.stringify(request),wrapped=E.makeRequest(request,f.assets,(s,p)=>seen.push({s,p}));
 const result=wrapped.wire.decode({adjustments:[{conceptId:'concept',placementId:'square',overlayLayout:f.plan}]});
 assert.deepEqual(result,{specifications:[f.spec]});assert.equal(seen.length,1);assert.equal(JSON.stringify(request),before);assert.deepEqual(wrapped.wire.input.strategy,request.wire.input.strategy);assert.deepEqual(wrapped.wire.input.placements,request.wire.input.placements);assert.match(wrapped.wire.instructions,/FINAL wording/);
});
test('installation leaves all ordinary generation and reasoning untouched',async()=>{
 let generated=0,reasoned=0;const runtime={store:{read:async()=>({intake:{}})},editable:{generate:async(...args)=>{generated++;return args;}},provider:{reason:async(...args)=>{reasoned++;return args;}}};
 E.install(runtime);assert.deepEqual(await runtime.editable.generate('old-job','old-record','budget'),['old-job','old-record','budget']);const request={contextKind:'strategy'},budget={brandContext:async()=>({intake:{}})};const result=await runtime.provider.reason(request,budget);assert.equal(result[0],request);assert.equal(result[1],budget);assert.equal(generated,1);assert.equal(reasoned,1);assert.throws(()=>E.install(runtime),/already installed/);
});
test('experiment layout checkpoint is bound to successful final validated art',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'text-layer-'));
 try{
  const f=fixture('Sleepyhead');let calls=0;
  const request={contextKind:'reconciliation',input:{artInput:{placements:[{id:'square',jobInputs:{logoPolicy:{treatment:'include'}}}]}},wire:{kind:'typed-reconciliation-v2',input:{},instructions:'Existing rules',schema:{type:'object',properties:{adjustments:{type:'array',items:{type:'object',properties:{conceptId:{type:'string'},placementId:{type:'string'}},required:['conceptId','placementId'],additionalProperties:false}}},required:['adjustments'],additionalProperties:false},decode:()=>({specifications:[structuredClone(f.spec)]})}};
  const runtime={editable:{generate(){}},store:{},provider:{async reason(r){calls++;return r.wire.decode({adjustments:[{conceptId:'concept',placementId:'square',overlayLayout:f.plan}]});}}};
  E.install(runtime);const out=await runtime.provider.reason(request,{brandContext:async()=>({dir,intake:{brandId:f.assets.brandId,canvasAssets:f.assets,textLayerExperimentVersion:1}})});
  const saved=JSON.parse(await fs.readFile(path.join(dir,E.nameFor(f.spec))));assert.equal(saved.artHash,fingerprint(out.specifications[0]));assert.equal(calls,1);assert.deepEqual(saved.layout,f.plan);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('clean-image instructions preserve product markings and reserve actual final overlay boxes',()=>{
 const f=fixture('Duroflex'),d=E.documentFor(f.record,f.assets,'/clean.png',f.saved);f.record.artDirection.logo={assetIds:[]};const prompt=require('../../lib/creative-ai/runtime/editable').photoPrompt(f.record,d);
 assert.match(prompt,/NO promotional text/);assert.match(prompt,/Preserve genuine product labels/);assert.match(prompt,/copyBoxes/);assert.match(prompt,/"top":162/);assert.doesNotMatch(prompt,/Exact heading/);
});
test('reproduces legacy repeated-role overlap; field-bound final layout removes it',()=>{
 const f=fixture('Duroflex');
 const box=(b,role)=>({role,x:b.x,y:b.y,width:b.width,height:b.height,fontId:b.fontId||f.assets.fonts[0].id,fontSize:b.fontSize||.05,colour:b.colour||'#111111',background:'#ffffff',align:'left',reason:'Legacy role-only box'});
 f.record.editableLayout={safeMargin:.05,boxes:[box(f.plan.logo,'logo'),box(f.plan.text[0],'headline'),box(f.plan.text[1],'supporting-copy')],protectedRegions:f.plan.protectedRegions};
 const legacy=require('../../lib/creative-ai/runtime/editable').layout(f.record,f.assets,'Duroflex','/clean.png');
 const old=legacy.objects.filter(o=>o.role==='supporting-copy');assert.equal(old[0].top,old[1].top,'Original symptom: duplicate-role fields overlap');
 const current=E.documentFor(f.record,f.assets,'/clean.png',f.saved).objects.filter(o=>o.role==='supporting-copy');assert.notEqual(current[0].top,current[1].top);
});
test('review receives pinned placement, final hierarchy and existing strategy',()=>{
 const f=fixture('Duroflex');f.record.upstreamContext={strategy:{brief:{objective:'Consideration'}}};const original={instructions:'Original review',input:{deterministicIssues:[]},images:[{id:'assembled'}]};const r=E.reviewRequest(original,f.record);
 assert.equal(r.images,original.images);assert.deepEqual(r.input.placementContext,f.record.placementContext);assert.deepEqual(r.input.finalArtDirection.text,f.record.artDirection.text);assert.equal(original.input.placementContext,undefined);
});
test('both brands: clean generation, final layout, assembled review, edit and export use the isolated path',{timeout:60000},async()=>{
 const sharp=require('sharp'),editable=require('../../lib/creative-ai/runtime/editable'),{CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
 for(const brand of ['brand-duroflex-fixture','brand-sleepyhead-fixture']){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'text-layer-flow-'));
  try{
   await fs.symlink(path.resolve(__dirname,'../../public'),path.join(root,'public'));
   const photo=await sharp({create:{width:1080,height:1080,channels:3,background:'#eeeeee'}}).png().toBuffer();let imageCalls=0,reviewCalls=0;
   const runtime=new CreativeRuntime({root});runtime.provider={generate:async req=>{imageCalls++;assert.match(req.prompt,/NO promotional text/);assert.match(req.prompt,/"top":162/);return {imageData:'data:image/png;base64,'+photo.toString('base64')};},reason:async req=>{reviewCalls++;assert.equal(req.contextKind,'canvas-layout-review');assert.ok(req.input.placementContext);assert.match(req.images[0].label,/ASSEMBLED|assembled/);throw Error('Synthetic unavailable review — must stay visible');}};
   await runtime.brands.save(brand,'brand.json',{id:brand,name:brand,brandUrl:'https://example.com',documents:[],researchIds:[]});
   await editable.uploadAsset(runtime,brand,{kind:'font',name:'Synthetic font',sourceReference:'Test only',approved:true,weight:700,data:'data:font/ttf;base64,'+(await fs.readFile('/System/Library/Fonts/Supplemental/Arial.ttf')).toString('base64')});
   await editable.uploadAsset(runtime,brand,{kind:'logo',name:'Synthetic logo',sourceReference:'Test only',approved:true,data:'data:image/png;base64,'+photo.toString('base64')});
   const a=await editable.assets(runtime,brand),f=fixture(brand);f.assets=a;f.plan.text.forEach(t=>t.fontId=a.fonts[0].id);f.plan.logo.assetId=a.logo.id;f.record.artDirection.logo={assetIds:[]};f.record.artDirection.product={assetIds:[]};f.record.attachmentManifest=[];f.saved.artHash=fingerprint(f.spec);
   const job=await runtime.store.create({brandId:brand,editableCanvas:true,editableWorkflowVersion:2,textLayerExperimentVersion:1,canvasAssets:a},{maxReasoningCalls:4,jobTimeoutMs:60000},[{id:'square',description:{id:'square',name:'Square',dimensions:{width:1080,height:1080}}}]);
   const log=runtime.log.bind(runtime);runtime.log=(id,type,key,options={})=>log(id,type,key,{...options,evidence:{mode:'synthetic-fixture',adapterId:'text-layer-test',receiptId:key}});
   await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'demo',concepts:[{id:'concept',route:'continuity'},{id:'exploration',route:'exploration'}],placements:[{id:'square',label:'Square'}]}}});
   await runtime.store.save(job.id,E.nameFor(f.spec),f.saved);
   await runtime.store.save(job.id,'art-drafts.json',{drafts:[{conceptId:'concept',placementId:'square',editableLayout:{invalid:'Do not use stale draft'}}]});
   E.install(runtime);
   const result=await runtime.unit(job.id,f.record,runtime.store.budget(job.id));assert.equal(imageCalls,1);assert.equal(reviewCalls,1);assert.equal(result.ready,false);
   const state=await runtime.editable.read(job.id,'continuity','square');assert.equal(state.preflight.status,'not-run');assert.equal(state.original.objects.find(o=>o.fieldId==='heading').top,162);assert.match(state.review.error,/Synthetic unavailable/);
   const edit=structuredClone(state.document);edit.objects.find(o=>o.fieldId==='heading').left=180;
   const updated=await runtime.editable.save(job.id,{route:'continuity',placementId:'square',expectedRevision:0,document:edit});assert.equal(updated.original.objects.find(o=>o.fieldId==='heading').left,108);
   const rendered=await editable.render(runtime,job.id,updated.document);assert.match(rendered.data,/^data:image\/png;base64,/);assert.equal(imageCalls,1);assert.equal(reviewCalls,1);
  }finally{await fs.rm(root,{recursive:true,force:true});}
 }
});
test('ordinary runtime cannot dispatch an experiment after a restart',async()=>{
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');let dispatched=0;
 const runtime={store:{read:async()=>({intake:{textLayerExperimentVersion:1}})},run:async()=>{dispatched++;}};
 await assert.rejects(()=>CreativeRuntime.prototype.execute.call(runtime,'experiment'),e=>e.code==='EXPERIMENT_RUNNER_REQUIRED');assert.equal(dispatched,0);
 runtime.textLayerExperimentInstalled=true;await CreativeRuntime.prototype.execute.call(runtime,'experiment');assert.equal(dispatched,1);
});
test('reading warnings use the pinned viewing width; no shrinking or new pre-image block',()=>{
 const f=fixture('Duroflex'),d=E.documentFor(f.record,f.assets,'/clean.png',f.saved);
 f.record.placementContext.context={placements:[{rules:[{id:'feed-readability',statement:'READABILITY test',check:{readingPolicy:{width:320,total:32,headlineCssPx:24,bodyCssPx:16}}}]}]};
 const head=d.objects.find(o=>o.role==='headline');head.fontSize=36;const before=JSON.stringify(d);
 assert.match(E.placementWarnings(d,f.record).join('\n'),/10.7px type at 320px/);assert.equal(JSON.stringify(d),before);
});
test('image-only review separates photographic contact from editable overlay occlusion for both brands',()=>{for(const brand of ['Duroflex','Sleepyhead']){const f=fixture(brand),original={instructions:'Review',input:{layers:[]}},r=E.reviewRequest(original,f.record);assert.match(r.instructions,/subject-occlusion checks only editable overlay layers/);assert.match(r.instructions,/photograph check/);assert.equal(original.instructions,'Review');assert.doesNotMatch(E.reviewRequest({instructions:'Review',input:{layers:[{id:'headline'}]}},f.record).instructions,/No editable overlay layers exist/);}});
