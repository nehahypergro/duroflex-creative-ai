'use strict';
// Regression (live A+ Premium run, 9 Nov 2026, job creative-aa4adc3f…): the technology panel pages
// (premium-03 desktop, premium-04 mobile) failed before any image request with "Brand isolation: a
// generation attachment was not collected for this brand and job." The SKU's official technology
// picture is re-read from the brand's product library and resized to a derived PNG at planning time;
// the brand-isolation check at image generation only accepted research pictures and bound job
// artwork, so the derived picture could never pass. technology-visual.test.js missed it because its
// fake provider bypasses BrandScopedProvider. These tests drive the REAL BrandScopedProvider.
// Offline only: the inner image provider is a counter.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const {BrandStore}=require('../../lib/creative-ai/runtime/brands'),{JobStore}=require('../../lib/creative-ai/runtime/store');
const {snapshot,BrandScopedProvider}=require('../../lib/creative-ai/runtime/brand-isolation'),tv=require('../../lib/creative-ai/runtime/technology-visual');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

// Saves a product page with one stored A+ technology picture in the brand's own product library.
async function saveProduct(brands,brand,slug,colour){
 const pageUrl=brand.brandUrl+'products/'+slug,id='product-'+sha(brand.id+slug).slice(0,20),url=brand.brandUrl+'cdn/shop/files/'+slug+'-tech.png';
 const bytes=await sharp({create:{width:1200,height:400,channels:3,background:colour}}).png().toBuffer(),dir=path.join(brands.products.dir(brand.id),id);
 await fs.mkdir(path.join(dir,'snap-1'),{recursive:true});await fs.writeFile(path.join(dir,'snap-1','tech.png'),bytes);
 const profile={id,brandId:brand.id,pageUrl,snapshot:'snap-1',assets:[{type:'image',status:'stored',group:'a-plus-content',url,file:'snap-1/tech.png',sha256:sha(bytes),width:1200,height:400,label:'Zone support layers'}]};
 await fs.writeFile(path.join(dir,'profile.json'),JSON.stringify(profile));
 return {pageUrl,pin:{productId:id,brandId:brand.id,url,sha256:sha(bytes),label:'Zone support layers',group:'a-plus-content',width:1200,height:400}};
}
async function fixture(t,name){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'technology-isolation-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const brands=new BrandStore(root),store=new JobStore(path.join(root,'output/creative-ai/jobs'));
 // Two real workspaces (the store resolves each brand URL, as existing isolation tests do).
 const [ownUrl,otherUrl]=name==='Duroflex'?['https://example.com/','https://example.org/']:['https://example.org/','https://example.com/'];
 const own=await brands.create({name,brandUrl:ownUrl}),other=await brands.create({name:name==='Duroflex'?'Sleepyhead':'Duroflex',brandUrl:otherUrl});
 const product=await saveProduct(brands,own,'ortho','#aa3322'),sibling=await saveProduct(brands,own,'other-sku','#2233aa'),foreign=await saveProduct(brands,other,'ortho','#33aa22');
 const create=async(patch={})=>{const intake={brandId:own.id,brandUrl:own.brandUrl,leanWorkflowVersion:1,productPageUrl:product.pageUrl+'?variant=queen',technologyImage:product.pin,...patch};intake.brandKnowledge=await snapshot(intake,brands);return store.create(intake,{maxReasoningCalls:8,jobTimeoutMs:60000},[]);};
 let calls=0;const provider=new BrandScopedProvider({generate:async()=>{calls++;return {ok:true};}},brands);
 const job=await create();
 // Exactly what lean-workflow attaches: loadImage at planning, then {assetId, roles, imageData}.
 const loaded=await tv.loadImage({brands},job.intake),attachment={assetId:loaded.assetId,roles:['technology'],imageData:loaded.imageData};
 const request=(attachments=[attachment])=>({prompt:'Technology panel',attachments,scope:{conceptId:'c',route:'continuity',placementId:'aplus-03'},resolvedLeanBrief:true,size:'1536x1024'});
 return {root,brands,store,own,other,product,sibling,foreign,create,provider,job,attachment,request,calls:()=>calls};
}
// Rejected by the technology-picture check itself, not by the generic "not collected" fallback.
const isolation=e=>e.code==='BRAND_ISOLATION'&&/technology picture/.test(e.message);

for(const name of ['Duroflex','Sleepyhead']){
 test(name+': the SKU\'s own derived technology picture passes the real brand-isolation check at image generation',async t=>{
  const f=await fixture(t,name);
  assert.deepEqual(await f.provider.generate(f.request(),f.store.budget(f.job.id)),{ok:true});assert.equal(f.calls(),1);
  // Saved queue records keep it as a hash-bound raster reference; the hydrated bytes must still pass.
  const saved=await require('../../lib/creative-ai/runtime/reference-storage').encode({a:f.attachment},{file:path.join(f.store.dir(f.job.id),'image-queue-x.json'),brandId:f.own.id});
  const hydrated=await require('../../lib/creative-ai/runtime/reference-storage').decode(saved,{file:path.join(f.store.dir(f.job.id),'image-queue-x.json')});
  await f.provider.generate(f.request([hydrated.a]),f.store.budget(f.job.id));assert.equal(f.calls(),2);
 });
 test(name+': another brand\'s or another SKU\'s technology picture, changed bytes, a wrong role or a missing pin are rejected before any image request',async t=>{
  const f=await fixture(t,name);
  // Another brand's picture (pin points at the other workspace's product).
  const foreignJob=await f.create({technologyImage:f.foreign.pin});
  await assert.rejects(()=>f.provider.generate(f.request(),f.store.budget(foreignJob.id)),isolation);
  // Another SKU of the same brand: the pinned product page is not the job's product page.
  const siblingJob=await f.create({technologyImage:f.sibling.pin});
  await assert.rejects(()=>f.provider.generate(f.request(),f.store.budget(siblingJob.id)),isolation);
  // The other SKU's own derived picture attached to this job.
  const siblingPicture=await tv.loadImage({brands:f.brands},{...f.job.intake,productPageUrl:f.sibling.pageUrl,technologyImage:f.sibling.pin});
  await assert.rejects(()=>f.provider.generate(f.request([{...f.attachment,imageData:siblingPicture.imageData}]),f.store.budget(f.job.id)),isolation);
  // Changed bytes: the same picture re-encoded differently.
  const raw=Buffer.from(f.attachment.imageData.split(',')[1],'base64'),changed=await sharp(raw).png({compressionLevel:1}).toBuffer();
  assert.notEqual(sha(changed),sha(raw));
  await assert.rejects(()=>f.provider.generate(f.request([{...f.attachment,imageData:'data:image/png;base64,'+changed.toString('base64')}]),f.store.budget(f.job.id)),isolation);
  // A picture claiming another role, and a job with no pinned technology picture.
  await assert.rejects(()=>f.provider.generate(f.request([{...f.attachment,roles:['product']}]),f.store.budget(f.job.id)),isolation);
  const unpinned=await f.create({technologyImage:undefined});
  await assert.rejects(()=>f.provider.generate(f.request(),f.store.budget(unpinned.id)),isolation);
  // The saved source picture in the product library changed after planning.
  const profile=JSON.parse(await fs.readFile(path.join(f.brands.products.dir(f.own.id),f.product.pin.productId,'profile.json'),'utf8'));
  await fs.writeFile(path.join(f.brands.products.dir(f.own.id),profile.id,profile.assets[0].file),await sharp({create:{width:1200,height:400,channels:3,background:'#000000'}}).png().toBuffer());
  await assert.rejects(()=>f.provider.generate(f.request(),f.store.budget(f.job.id)),isolation);
  assert.equal(f.calls(),0,'no image request was sent');
 });
}

// Regression (redo run, 9 Nov 2026, job creative-4e94f6f9…): the A+ technology panel still failed with
// "Brand isolation: the technology picture bytes changed" although the re-made picture was identical.
// The live engine hands BrandScopedProvider a cut-down brand object (read/revision/dir) with no
// product library, so the check could not re-make the picture. The tests above passed a full
// BrandStore and missed it; this one drives the engine's OWN provider.
for(const name of ['Duroflex','Sleepyhead'])test(name+': the engine\'s own brand-scoped provider can check the technology picture',async t=>{
 const f=await fixture(t,name);let calls=0;
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
 const runtime=new CreativeRuntime({root:f.root,provider:{generate:async()=>{calls++;return {ok:true};},checkAccess:()=>true}});
 assert.deepEqual(await runtime.provider.generate(f.request(),f.store.budget(f.job.id)),{ok:true});assert.equal(calls,1);
});
// labelGenerationVersion 1 (9 Nov 2026): the label close-up must be the exact deterministic crop of an
// exact product photo in the same request; anything else is refused before any image request.
for(const name of ['Duroflex','Sleepyhead'])test(name+': a forged or altered label close-up is refused at image generation',async t=>{
 const f=await fixture(t,name),sku=require('../../lib/creative-ai/lean/sku-check');
 const photo=await sharp({create:{width:800,height:600,channels:3,background:'#d8dde6'}}).composite([{input:await sharp({create:{width:120,height:60,channels:3,background:'#13306b'}}).png().toBuffer(),left:400,top:400}]).png().toBuffer();
 const product={assetId:'sku-1',roles:['product'],imageData:'data:image/png;base64,'+photo.toString('base64')},box={left:340,top:360,width:240,height:140};
 const good='data:image/png;base64,'+(await sku.cropLabel(photo,box)).toString('base64'),labelSource={sourceAssetId:'sku-1',sourceSha256:sha(photo),box};
 const label=(patch={})=>({assetId:'label-close-up',roles:['label'],labelSource,imageData:good,...patch});
 const labelError=e=>e.code==='BRAND_ISOLATION'&&/label close-up/.test(e.message);
 await assert.rejects(()=>f.provider.generate(f.request([label()]),f.store.budget(f.job.id)),labelError,'no source photo in the request');
 await assert.rejects(()=>f.provider.generate(f.request([product,label({labelSource:{...labelSource,box:{...box,left:100}}})]),f.store.budget(f.job.id)),labelError,'another box');
 await assert.rejects(()=>f.provider.generate(f.request([product,label({imageData:f.attachment.imageData})]),f.store.budget(f.job.id)),labelError,'other bytes');
 await assert.rejects(()=>f.provider.generate(f.request([product,label({roles:['product']})]),f.store.budget(f.job.id)),labelError,'wrong role');
 // The genuine crop passes the label check (the uncollected test photo is then refused by the general check).
 await assert.rejects(()=>f.provider.generate(f.request([product,label()]),f.store.budget(f.job.id)),e=>e.code==='BRAND_ISOLATION'&&!/label close-up/.test(e.message));
 assert.equal(f.calls(),0);
});
// Creative reference v1 (10 Nov 2026): the user's reference picture reaches only the reference-reading step,
// and only as this job's own saved picture (bound by hash). Both brands.
for(const name of ['Duroflex','Sleepyhead'])test(name+': only the job\'s own reference picture reaches the reference step',async t=>{
 const f=await fixture(t,name),cr=require('../../lib/creative-ai/runtime/creative-reference'),sharp=require('sharp');
 const pic=await sharp({create:{width:640,height:400,channels:3,background:'#c0a080'}}).png().toBuffer();
 const ref=await cr.save(f.root,f.own.id,{name:'ref.png',use:['layout'],imageData:'data:image/png;base64,'+pic.toString('base64')});
 const job=await f.create({creativeReference:ref}),imageData=await cr.load(f.root,f.own.id,ref);let reads=0;
 const provider=new BrandScopedProvider({reason:async()=>{reads++;return {layout:'x',look:'y',idea:'z',avoid:[]};},generate:async()=>({ok:true})},f.brands);
 const ask=(images,kind='lean-reference')=>provider.reason({contextKind:kind,instructions:'Describe',input:{use:['layout']},images,schema:cr.schema},f.store.budget(job.id));
 await ask([{id:'creative-reference',imageData}]);assert.equal(reads,1,'its own picture is read');
 const other=await sharp({create:{width:640,height:400,channels:3,background:'#203040'}}).jpeg().toBuffer();
 await assert.rejects(ask([{id:'creative-reference',imageData:'data:image/jpeg;base64,'+other.toString('base64')}]),/does not match this job/);
 await assert.rejects(ask([{id:'creative-reference',imageData}],'lean-planning'),/only be read by the reference step/);
 assert.equal(reads,1,'nothing else was sent');
 assert.ok((await fs.readdir(cr.dir(f.root,f.own.id))).includes(ref.sha256+'.jpg'),'saved in this brand\'s own store');
});
// Live run, 10 Nov 2026 (Sleepyhead post with its own earlier banner as the reference): the "do not copy" list
// included "sleepyhead", the brand's own name. The job's own brand name, and the brand's own product and
// technology names, are never on that list.
for(const name of ['Duroflex','Sleepyhead'])test(name+': the reference avoid-list never blocks the brand\'s own name',()=>{
 const cr=require('../../lib/creative-ai/runtime/creative-reference');
 const r=cr.section({layout:'x',look:'y',idea:'z',avoid:['“'+name.toLowerCase()+'”','“'+name.toUpperCase()+' logo”','“Try the Original.”','Acme Beds']},{name:'ref.png',use:['layout']},{brandName:name});
 assert.deepEqual(r.creativeReference.avoid,['“Try the Original.”','Acme Beds']);assert.doesNotMatch(r.rule.text,new RegExp('"“?'+name,'i'));
});
