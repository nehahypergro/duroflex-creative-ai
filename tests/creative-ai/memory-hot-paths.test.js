'use strict';
// Defect #6: the dedicated server repeatedly crashed with "JavaScript heap out of
// memory" inside JSON.parse after artifact reads. Saved research keeps pictures as
// small hash-bound $studioRaster references, but hot paths expanded every reference
// into base64, re-stringified the whole document and parsed it again (brand-isolated
// image generate(), Studio readiness, research view, readiness estimate). These
// tests measure which blobs are read/expanded and which JSON files go through the
// expanding text reader, while keeping every brand, byte and legacy guarantee.
const test=require('node:test'),assert=require('node:assert/strict'),fsp=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const files=require('../../lib/creative-ai/runtime/artifact-fs'),storage=require('../../lib/creative-ai/runtime/reference-storage');
const {BrandStore}=require('../../lib/creative-ai/runtime/brands'),{JobStore}=require('../../lib/creative-ai/runtime/store');
const {snapshot,bindResearch,BrandScopedProvider}=require('../../lib/creative-ai/runtime/brand-isolation');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const png=(fill,size=48*1024)=>'data:image/png;base64,'+Buffer.alloc(size,fill).toString('base64');
const rawHash=data=>sha(Buffer.from(data.split(',')[1],'base64'));
const researchFile=/^(research(?:-[a-z0-9-]+)?|corrected-research-[a-z0-9-]+)\.json$/;

// Records JSON files read through the expanding text reader, raster blobs read
// from the brand store, and characters materialised by whole-value decoding.
function instrument(t){
 const seen={expandedReads:[],blobReads:[],decodedChars:0};
 const readFile=files.readFile;t.mock.method(files,'readFile',async function(file,...rest){const out=await readFile.call(this,file,...rest);if(typeof file==='string'&&file.endsWith('.json'))seen.expandedReads.push({file:path.basename(file),chars:out.length});return out;});
 const chars=v=>typeof v==='string'?v.length:v&&typeof v==='object'?Object.values(v).reduce((n,x)=>n+chars(x),0):0;
 const decode=storage.decode;t.mock.method(storage,'decode',async function(value,options){const out=await decode.call(this,value,options);seen.decodedChars+=chars(out);return out;});
 const raw=fsp.readFile;t.mock.method(fsp,'readFile',async function(file,...rest){if(String(file).includes(path.sep+'reference-images'+path.sep))seen.blobReads.push(path.basename(String(file),'.bin'));return raw.call(this,file,...rest);});
 return seen;
}
async function fixture(fn){const root=await fs_mkdtemp('memory-hot-paths-');try{
 const brands=new BrandStore(root),store=new JobStore(path.join(root,'jobs'));
 const a=await brands.create({name:'Duroflex fixture',brandUrl:'https://example.com/'}),b=await brands.create({name:'Sleepyhead fixture',brandUrl:'https://example.org/'});
 const create=async brand=>{const intake={brandId:brand.id,brandUrl:brand.brandUrl};intake.brandKnowledge=await snapshot(intake,brands);return store.create(intake,{maxReasoningCalls:8,jobTimeoutMs:60000},[]);};
 await fn({root,brands,store,a,b,create});
}finally{await fsp.rm(root,{recursive:true,force:true});}}
function fs_mkdtemp(prefix){return fsp.mkdtemp(path.join(os.tmpdir(),prefix));}
const research=(brand,assets)=>({dossier:{brandName:brand.name,sources:[{id:'source-home',kind:'site',status:'available',reference:brand.brandUrl}],assets:assets.map(([id,imageData])=>({id,kind:'product',sourceIds:['source-home'],imageData})),findings:[]},facts:[],pages:[]});
// Three research files per job, five unrelated pictures each plus one selected picture.
async function saveResearch(store,job,brand,selected,{fill=10,legacy=false}={}){
 const names=['research.json','research-sku.json','research-product-evidence.json'];
 for(const [n,name] of names.entries()){
  const value=bindResearch(research(brand,[...Array.from({length:5},(_,i)=>['official-image-'+(i+2),png(fill+n*5+i)]),['official-image-1',selected]]),job.intake.brandKnowledge);
  if(legacy)await fsp.writeFile(path.join(store.dir(job.id),name),JSON.stringify(value,null,2));else await store.save(job.id,name,value);
 }
}

for(const brandIndex of [0,1])test('image dispatch compares research picture identities without expanding unrelated references: '+['Duroflex','Sleepyhead'][brandIndex]+' fixture',t=>fixture(async({store,brands,a,b,create})=>{
 const brand=[a,b][brandIndex];let calls=0;const provider=new BrandScopedProvider({async generate(request){calls++;return {ok:true,prompt:request.prompt};}},brands),job=await create(brand);
 const selected=png(200+brandIndex);await saveResearch(store,job,brand,selected);
 const saved=JSON.parse(await fsp.readFile(path.join(store.dir(job.id),'research-sku.json'),'utf8'));assert.ok(saved.dossier.assets.every(x=>x.imageData.$studioRaster),'fixture stores pictures as raster references');
 const seen=instrument(t);
 const result=await provider.generate({prompt:'Render',attachments:[{assetId:'official-image-1',imageData:selected}]},store.budget(job.id));
 assert.equal(result.ok,true);assert.equal(calls,1);assert.match(result.prompt,new RegExp(brand.name));
 assert.deepEqual(seen.expandedReads.filter(r=>researchFile.test(r.file)),[],'research is not expanded and re-stringified for an image call');
 assert.deepEqual([...new Set(seen.blobReads)],[rawHash(selected)],'only the attached picture blob is read for byte verification');
 assert.equal(seen.decodedChars,0,'no whole-document base64 materialisation');
}));

test('reference identity checks still reject foreign, re-encoded, tampered and cross-brand pictures before dispatch',()=>fixture(async({root,store,brands,a,b,create})=>{
 let calls=0;const provider=new BrandScopedProvider({async generate(){calls++;return {ok:true};}},brands),ja=await create(a),jb=await create(b);
 const own=png(31,48*1024+1),foreign=png(32);assert.match(own,/==$/,'fixture has padding to remove');await saveResearch(store,ja,a,own);await saveResearch(store,jb,b,foreign,{fill:60});
 const go=(imageData,job=ja)=>provider.generate({prompt:'Render',attachments:[{assetId:'official-image-1',imageData}]},store.budget(job.id));
 await assert.rejects(go(foreign),/not collected for this brand/,'another brand’s bytes with a reused ID');
 await assert.rejects(go(own.replace('data:image/png','data:image/jpeg')),/not collected for this brand/,'same bytes under a different media prefix');
 await assert.rejects(go(own.replace(/=+$/,'')),/not collected for this brand/,'non-canonical encoding of the same bytes');
 await assert.rejects(go(png(250)),/not collected for this brand/,'uncollected bytes');
 assert.equal(calls,0);assert.equal((await go(own)).ok,true);assert.equal((await go(foreign,jb)).ok,true);assert.equal(calls,2);
 // Byte-level verification: a changed blob of the same length still blocks.
 const blob=storage.blobPath(root,a.id,rawHash(own)),bytes=await fsp.readFile(blob);await fsp.rm(blob);await fsp.writeFile(blob,Buffer.alloc(bytes.length,99));
 await assert.rejects(go(own),/bytes changed/);assert.equal(calls,2);await fsp.rm(blob);await fsp.writeFile(blob,bytes);assert.equal((await go(own)).ok,true);assert.equal(calls,3);
 // An unrelated reference whose blob disappeared still fails closed, as before.
 const other=storage.blobPath(root,a.id,rawHash(png(12))),otherBytes=await fsp.readFile(other);await fsp.rm(other);await assert.rejects(go(own));assert.equal(calls,3);await fsp.writeFile(other,otherBytes);
 // A reference claiming another brand's namespace is rejected.
 const file=path.join(store.dir(ja.id),'research.json'),saved=JSON.parse(await fsp.readFile(file,'utf8'));saved.dossier.assets[0].imageData.$studioRaster.brandId=b.id;await fsp.writeFile(file,JSON.stringify(saved));
 await assert.rejects(go(own),/cross-brand/);
 // Research bound to another workspace or a stale revision still fails.
 saved.dossier.assets[0].imageData.$studioRaster.brandId=a.id;saved.brandKnowledge.revision='stale';await fsp.writeFile(file,JSON.stringify(saved));
 await assert.rejects(go(own),/pinned knowledge revision differ/);
 const foreignResearch=bindResearch(research(b,[['official-image-1',own]]),jb.intake.brandKnowledge);await fsp.writeFile(file,JSON.stringify(foreignResearch));
 await assert.rejects(go(own),/different brand workspace/);assert.equal(calls,3);
}));

test('legacy inline research without references keeps identical acceptance and rejection for both brands',()=>fixture(async({store,brands,a,b,create})=>{
 let calls=0;const provider=new BrandScopedProvider({async generate(){calls++;return {ok:true};}},brands);
 for(const [i,brand] of [a,b].entries()){
  const job=await create(brand),selected=png(120+i);await saveResearch(store,job,brand,selected,{legacy:true,fill:70+i*20});
  assert.equal(typeof JSON.parse(await fsp.readFile(path.join(store.dir(job.id),'research.json'),'utf8')).dossier.assets[0].imageData,'string');
  const go=imageData=>provider.generate({prompt:'Render',attachments:[{assetId:'official-image-1',imageData}]},store.budget(job.id));
  assert.equal((await go(selected)).ok,true);await assert.rejects(go(png(240+i)),/not collected for this brand/);
 }
 assert.equal(calls,2);
}));

test('derived detail views expand only their own source picture and keep exact-pixel verification',t=>fixture(async({store,brands,a,b,create})=>{
 const sharp=require('sharp'),detail=require('../../lib/creative-ai/runtime/product-review-images');let calls=0;
 const provider=new BrandScopedProvider({async generate(){calls++;return {ok:true};}},brands),ja=await create(a),jb=await create(b);
 const red='data:image/png;base64,'+(await sharp({create:{width:30,height:30,channels:3,background:'red'}}).png().toBuffer()).toString('base64');
 await saveResearch(store,ja,a,red);await saveResearch(store,jb,b,png(77),{fill:90});
 const attachments=await detail.generationReferences({productReference:{sourceAssetId:'official-image-1',referenceAssetIds:['official-image-1']},attachmentManifest:[{assetId:'official-image-1',roles:['product'],imageData:red}]});
 const seen=instrument(t);
 assert.equal((await provider.generate({prompt:'Render',attachments},store.budget(ja.id))).ok,true);
 assert.deepEqual([...new Set(seen.blobReads)],[rawHash(red)]);assert.deepEqual(seen.expandedReads.filter(r=>researchFile.test(r.file)),[]);
 await assert.rejects(provider.generate({prompt:'Render',attachments},store.budget(jb.id)),/source|collected|detail/i);
 const changed=structuredClone(attachments);changed[1].imageData=png(78);await assert.rejects(provider.generate({prompt:'Render',attachments:changed},store.budget(ja.id)),/detail|derived/i);assert.equal(calls,1);
}));

test('research view returns the identical dossier without expanding non-dossier pictures or re-parsing text',async t=>{
 const root=await fs_mkdtemp('memory-research-view-');try{
  const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),runtime=new CreativeRuntime({root,provider:{}});runtime.schedule=()=>{};runtime.researchSessions.schedule=()=>{};
  const rs=runtime.researchSessions.store,session=await rs.create({brandUrl:'https://example.com/',brandId:'brand-fixture-view',assets:[{name:'mood.png',role:'reference',data:png(140)}]},runtime.config,[]);
  await rs.update(session.id,j=>{j.status='finished';j.artifacts.dossier={viewUrl:'/dossiers/fixture'};return j;});
  const value={dossier:{brandName:'Fixture',completedAt:'2026-01-01T00:00:00Z',sources:[],assets:[{id:'a',kind:'logo',label:'Logo',imageData:png(141)},{id:'b',kind:'product',label:'Product',imageData:png(142)}],findings:[]},facts:[],pages:[{screenshot:png(143)}]};
  await rs.save(session.id,'research-product-evidence.json',value);
  assert.ok(JSON.parse(await fsp.readFile(path.join(rs.dir(session.id),'research-product-evidence.json'),'utf8')).pages[0].screenshot.$studioRaster);
  const seen=instrument(t),view=await runtime.researchSessions.view(session.id);
  assert.deepEqual(view.dossier,value.dossier);assert.equal(view.brandId,'brand-fixture-view');assert.equal(view.status,'finished');assert.equal(view.brandUrl,'https://example.com/');
  assert.deepEqual(seen.expandedReads,[],'neither research nor the session job is expanded through text');
  assert.ok(!seen.blobReads.includes(rawHash(png(143))),'page screenshots outside the dossier stay unread');
  assert.ok(!seen.blobReads.includes(rawHash(png(140))),'session intake uploads stay unread');
 }finally{await fsp.rm(root,{recursive:true,force:true});}
});

test('readiness estimate lists job metadata without hydrating saved pictures',async t=>{
 const root=await fs_mkdtemp('memory-estimate-');try{
  await fsp.mkdir(path.join(root,'output/cost-tracking'),{recursive:true});await fsp.writeFile(path.join(root,'output/cost-tracking/currency.json'),JSON.stringify({displayCurrency:'INR',usdToInr:90,rateDate:'2026-10-20',source:'https://example.test/fx'}));
  const store=new JobStore(path.join(root,'jobs')),receipt={kind:'image',model:'gpt-image-2',recordedAt:'2026-10-21T00:01:00Z',requestKey:'image-1',usage:{input_tokens:1000,output_tokens:5000,input_tokens_details:{text_tokens:500,image_tokens:500}}};
  for(const brandId of ['brand-duroflex-fixture','brand-sleepyhead-fixture']){const id='creative-'+brandId.slice(6);
   await store.save(id,'job.json',{id,storageVersion:1,status:'finished',createdAt:'2026-10-21T00:00:00Z',intake:{brandId,composedTextVersion:1,assets:[{name:'mood.png',data:png(brandId.length)}]},selection:[{description:{dimensions:{width:1080,height:1920}}}],results:[{imageUrl:'one'},{imageUrl:'two'}],budget:{receipts:[receipt,{...receipt,requestKey:'image-2'}],requestStates:{}}});}
  assert.ok(JSON.parse(await fsp.readFile(path.join(store.dir('creative-duroflex-fixture'),'job.json'),'utf8')).intake.assets[0].data.$studioRaster);
  const seen=instrument(t),{estimateBrief}=require('../../lib/creative-ai/runtime/studio-estimate');
  const runtime={root,config:{imageModel:'gpt-image-2',reasoningModel:'gpt-6-luna'},store};
  for(const brandId of ['brand-duroflex-fixture','brand-sleepyhead-fixture']){const result=await estimateBrief(runtime,brandId,{width:1080,height:1920});assert.equal(result.status,'historical-estimate');assert.deepEqual(result.samples.map(s=>s.jobId),['creative-'+brandId.slice(6)]);}
  assert.deepEqual(seen.blobReads,[],'estimate never reads picture blobs');
 }finally{await fsp.rm(root,{recursive:true,force:true});}
});

// Studio readiness replays the saved, read-only research fixtures of both brands.
// Only selected references may be expanded; the readiness token must stay identical
// to the value derived from fully inline (legacy) research.
let policyRoot;
test.before(async()=>{policyRoot=await fs_mkdtemp('memory-lean-policy-');await fsp.writeFile(path.join(policyRoot,'workspace.json'),JSON.stringify({artworkDelivery:'original',artworkWorkflow:'lean-v1'}));});
test.after(async()=>{if(policyRoot)await fsp.rm(policyRoot,{recursive:true,force:true});});
const cases=[['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','product-3566a343eb36f945fd10'],['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','product-985736dbde7586ad61c7']];
for(const c of cases)test('Studio readiness expands only selected reference pictures and keeps the legacy token: '+c[0],async t=>{
 const od=require('../../lib/creative-ai/runtime/original-delivery'),prepare=od.prepare;t.mock.method(od,'prepare',(_root,intake)=>prepare(policyRoot,intake));
 const repo=path.resolve(__dirname,'../..'),M=require('../../public/creative-ai/studio-model'),g=require('../../lib/creative-ai/runtime/studio-generation');
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');const runtime=new CreativeRuntime({root:repo,provider:{reason(){assert.fail('No paid call');},generate(){assert.fail('No paid call');}}});
 const session=await require('./helpers/pinned-research-fixture').pin(runtime,c[0]),p=await runtime.brands.products.read(...c),d=M.startDraft(c[0],'quick',1);
 Object.assign(d,{name:'Memory readiness',brief:'Invite friends. No price or offer.',audience:'People furnishing their shared living room',productId:p.id,variant:p.variants[0].id});
 const sessionDir=runtime.researchSessions.store.dir(session.id),evidenceFile=path.join(sessionDir,'research-product-evidence.json');
 const raw=JSON.parse(await fsp.readFile(evidenceFile,'utf8')),chosen=raw.dossier.assets.filter(x=>x.id.startsWith('supplied-asset-library-')&&x.imageData?.$studioRaster).slice(0,2);assert.equal(chosen.length,2,'fixture has library references');
 d.references=chosen.map(x=>({id:x.id.replace('supplied-asset-library-','')}));
 const seen=instrument(t),prepared=await g.prepare(runtime,d);
 assert.deepEqual(prepared.request.selectedReferenceIds,chosen.map(x=>x.id));
 assert.deepEqual(seen.expandedReads.filter(r=>researchFile.test(r.file)),[],'research is not expanded and re-stringified for readiness');
 const allowed=new Set(chosen.map(x=>x.imageData.$studioRaster.sha256)),researchBlobs=new Set(raw.dossier.assets.map(x=>x.imageData?.$studioRaster?.sha256).filter(Boolean));
 assert.deepEqual([...new Set(seen.blobReads.filter(h=>researchBlobs.has(h)&&!allowed.has(h)))],[],'unselected research pictures are not read');
 const sessionJob=JSON.parse(await fsp.readFile(path.join(sessionDir,'job.json'),'utf8')),sessionBlobs=JSON.stringify(sessionJob).match(/"sha256":"[a-f0-9]{64}"/g)||[];
 assert.deepEqual(sessionBlobs.map(s=>s.slice(10,74)).filter(h=>seen.blobReads.includes(h)&&!allowed.has(h)&&!researchBlobs.has(h)),[],'research-session intake uploads are not hydrated for readiness');
 // Legacy equivalent in a temporary workspace: selected pictures inline, no references.
 const temp=await fs_mkdtemp('memory-legacy-research-');try{
  const legacyDir=path.join(temp,'research-sessions',session.id);await fsp.mkdir(legacyDir,{recursive:true});
  const full=await files.readJson(path.join(sessionDir,'job.json'));await fsp.writeFile(path.join(legacyDir,'job.json'),JSON.stringify(full));
  const inline=await storage.decode(chosen,{file:evidenceFile});const legacy={...raw,dossier:{...raw.dossier,assets:inline}};assert.ok(inline.every(x=>typeof x.imageData==='string'&&x.imageData.startsWith('data:image/')));
  await fsp.writeFile(path.join(legacyDir,'research-product-evidence.json'),JSON.stringify(legacy));
  const dirOf=runtime.researchSessions.store.dir.bind(runtime.researchSessions.store);runtime.researchSessions.store.dir=id=>id===session.id?legacyDir:dirOf(id);
  const legacyPrepared=await g.prepare(runtime,d);assert.equal(legacyPrepared.token,prepared.token,'reference and inline research produce the same readiness token');
  assert.deepEqual(legacyPrepared.request,prepared.request);
  const unchosen=raw.dossier.assets.find(x=>x.id.startsWith('supplied-asset-library-')&&!chosen.includes(x));assert.ok(unchosen);
  await assert.rejects(g.prepare(runtime,{...d,references:[{id:unchosen.id}]}),/not available/,'the comparison really read the inline legacy copy');
 }finally{await fsp.rm(temp,{recursive:true,force:true});}
});
