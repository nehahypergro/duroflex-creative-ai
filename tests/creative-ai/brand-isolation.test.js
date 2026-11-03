'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path');
const {BrandStore}=require('../../lib/creative-ai/runtime/brands');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
const {snapshot,bindResearch,BrandScopedProvider}=require('../../lib/creative-ai/runtime/brand-isolation');
async function fixture(fn){const root=await fs.mkdtemp(path.join(os.tmpdir(),'brand-isolation-'));try{
 const brands=new BrandStore(root),store=new JobStore(path.join(root,'jobs'));
 const a=await brands.create({name:'Brand A',brandUrl:'https://example.com/'}),b=await brands.create({name:'Brand B',brandUrl:'https://example.org/'});
 await brands.update(a.id,brand=>{brand.documents=[{id:'doc-a',kind:'visual',sha256:'synthetic',draft:false}];});
 const create=async brand=>{const intake={brandId:brand.id,brandUrl:brand.brandUrl};intake.brandKnowledge=await snapshot(intake,brands);return store.create(intake,{maxReasoningCalls:8,jobTimeoutMs:60000},[]);};
 await fn({root,brands,store,a,b,create});
 }finally{await fs.rm(root,{recursive:true,force:true});}}
const research=(brand,bytes)=>({dossier:{brandName:brand.name,sources:[{id:'source-home',kind:'site',status:'available',reference:brand.brandUrl}],assets:[{id:'official-image-1',kind:'logo',sourceIds:['source-home'],imageData:bytes}],findings:[]},facts:[],pages:[]});
test('a brand with no visual world never inherits another brand’s documents or guidance status',()=>fixture(async({brands,a,b})=>{
 const sa=await snapshot({brandId:a.id,brandUrl:a.brandUrl},brands),sb=await snapshot({brandId:b.id,brandUrl:b.brandUrl,brandKnowledge:{brandId:a.id}},brands);
 assert.equal(sa.visualGuidance,'supplied');assert.equal(sb.visualGuidance,'website-observations-only');assert.deepEqual(sb.documentIds,[]);assert.equal(sb.brandName,b.name);
 assert.throws(()=>bindResearch(research(a,'A'),sb),/different brand/);
 assert.throws(()=>bindResearch({dossier:{sources:[{id:'doc-a',kind:'guidelines'}],assets:[]}},sb),/outside the selected workspace/);
 assert.throws(()=>bindResearch({dossier:{sources:[],assets:[{sourceIds:['doc-a']}]}},sb),/another workspace/);
 assert.throws(()=>bindResearch({dossier:{sources:[],assets:[{brandId:a.id}]}},sb),/different brand workspace/);
 assert.throws(()=>bindResearch({dossier:{sources:[],assets:[]},guidance:{sourceRefs:[{documentId:'doc-a',slide:1}]}},sb),/document reference/);
}));
test('native generation context is read-only and rejects foreign products and incorrectly linked research',()=>fixture(async({root,brands,store,a,b})=>{
 const {context}=require('../../scripts/creative-ai/brand-generation-context');
 const sessions=new JobStore(path.join(root,'output/creative-ai/research-sessions'));
 const intake={brandId:b.id,brandUrl:b.brandUrl};intake.brandKnowledge=await snapshot(intake,brands);
 const job=await sessions.create(intake,{maxReasoningCalls:8,jobTimeoutMs:60000},[]);
 await sessions.save(job.id,'research-product-evidence.json',bindResearch(research(b,'data:image/png;base64,Qg=='),intake.brandKnowledge));
 await sessions.update(job.id,j=>{j.status='finished';return j;});await brands.researchCompleted(b.id,job.id,intake.brandKnowledge.revision);
 const before=await fs.readFile(path.join(brands.dir(b.id),'brand.json'));
 const result=await context(root,b.id,'https://example.org/products/b');assert.equal(result.brandKnowledge.brandId,b.id);assert.equal(result.brandKnowledge.visualGuidance,'website-observations-only');assert.equal(result.assets[0].imageData,undefined);
 assert.deepEqual(await fs.readFile(path.join(brands.dir(b.id),'brand.json')),before);assert.equal((await store.list()).length,0);
 await assert.rejects(()=>context(root,b.id,'https://example.com/products/a'),/this brand’s official website/);
 await sessions.update(job.id,j=>{j.intake.brandId=a.id;return j;});await assert.rejects(()=>context(root,b.id),/does not belong/);
}));
test('concurrent reasoning calls and retries resolve their own job, without a last-brand fallback',()=>fixture(async({brands,store,a,b,create})=>{
 const calls=[],provider=new BrandScopedProvider({async reason(request){await new Promise(resolve=>setImmediate(resolve));calls.push(request);return request.input.brandKnowledge;}},brands);
 const ja=await create(a),jb=await create(b),[sa,sb]=await Promise.all([provider.reason({instructions:'Plan',input:{brief:'A'}},store.budget(ja.id)),provider.reason({instructions:'Plan',input:{brief:'B'}},store.budget(jb.id))]);
 assert.equal(sa.brandId,a.id);assert.equal(sb.brandId,b.id);assert.deepEqual(sb.documentIds,[]);
 const retry=await provider.reason({instructions:'Correct',input:{brief:'B retry'}},store.budget(jb.id,{generationRecovery:true}));assert.equal(retry.brandId,b.id);
 const bCalls=calls.filter(c=>c.input.brandKnowledge.brandId===b.id);assert.equal(bCalls.length,2);for(const c of bCalls){assert.match(c.instructions,/Start a fresh/);assert.match(c.instructions,/no brand-world guide has been supplied/);assert.doesNotMatch(c.instructions,/doc-a/);}
 await assert.rejects(()=>provider.reason({instructions:'Plan',input:{research:{brandKnowledge:sa}}},store.budget(jb.id)),/different brand workspace/);assert.equal(calls.length,3);
}));
test('generation rejects foreign bytes with a reused asset ID before paid dispatch and accepts owned SKU/CDN assets',()=>fixture(async({brands,store,a,b,create})=>{
 let calls=0;const provider=new BrandScopedProvider({async generate(request){calls++;return request;}},brands),ja=await create(a),jb=await create(b);
 const bytesA='data:image/png;base64,QQ==',bytesB='data:image/png;base64,Qg==';
 const rb=research(b,bytesB);rb.dossier.sources.push({id:'source-cdn',kind:'asset',reference:'https://cdn.example.net/brand-b-photo.png'});rb.dossier.assets[0].sourceIds.push('source-cdn');
 await store.save(ja.id,'research-product-evidence.json',bindResearch(research(a,bytesA),ja.intake.brandKnowledge));await store.save(jb.id,'research-sku.json',bindResearch(rb,jb.intake.brandKnowledge));
 const request={prompt:'Render',attachments:[{assetId:'official-image-1',imageData:bytesA}]};
 await assert.rejects(()=>provider.generate(request,store.budget(jb.id)),/not collected for this brand/);assert.equal(calls,0);
 const result=await provider.generate({...request,attachments:[{assetId:'official-image-1',imageData:bytesB}]},store.budget(jb.id));assert.equal(calls,1);assert.match(result.prompt,/Brand B/);assert.match(result.prompt,/Never inherit another brand/);
}));
test('saved research from a different workspace or knowledge revision fails even during recovery',()=>fixture(async({brands,store,a,b,create})=>{
 let calls=0;const provider=new BrandScopedProvider({generate(){calls++;}},brands),ja=await create(a),jb=await create(b),bytes='data:image/png;base64,QQ==';
 await store.save(jb.id,'research.json',bindResearch(research(a,bytes),ja.intake.brandKnowledge));
 await assert.rejects(()=>provider.generate({prompt:'Render',attachments:[{imageData:bytes}]},store.budget(jb.id,{generationRecovery:true})),/different brand workspace/);assert.equal(calls,0);
 const own=bindResearch(research(b,bytes),jb.intake.brandKnowledge);own.brandKnowledge.revision='stale';await store.save(jb.id,'research.json',own);
 await assert.rejects(()=>provider.generate({prompt:'Render',attachments:[{imageData:bytes}]},store.budget(jb.id)),/pinned knowledge revision differ/);assert.equal(calls,0);
}));
test('carousel style anchors require this job’s reviewed opening slide and same concept; foreign or altered bytes stay blocked',()=>fixture(async({brands,store,a,create})=>{
 const job=await create(a),dir=store.dir(job.id),bytes=Buffer.from('synthetic anchor bytes'),name='static-continuity-slide-01-0.png';await fs.writeFile(path.join(dir,name),bytes);
 await store.update(job.id,j=>{j.selection=[{id:'slide-1',description:{carousel:{id:'carousel',index:1}}},{id:'slide-2',description:{carousel:{id:'carousel',index:2}}}];j.results=[{conceptId:'concept-a',placementId:'slide-1',ready:true,imageUrl:'/files/'+name}];return j;});
 let calls=0;const provider=new BrandScopedProvider({generate:async()=>{calls++;return {ok:true};}},brands),budget=store.budget(job.id),asset={assetId:'carousel-style-anchor',ownership:'generated-project-reference',roles:['visual-style'],imageData:'data:image/png;base64,'+bytes.toString('base64'),sha256:require('crypto').createHash('sha256').update(bytes).digest('hex')},request={prompt:'Same brand carousel.',scope:{conceptId:'concept-a',placementId:'slide-2'},attachments:[asset]};
 await provider.generate(request,budget);assert.equal(calls,1);
 await assert.rejects(provider.generate({...request,scope:{conceptId:'concept-b',placementId:'slide-2'}},budget),/reviewed opening/);
 await assert.rejects(provider.generate({...request,attachments:[{...asset,imageData:'data:image/png;base64,'+Buffer.from('foreign bytes').toString('base64')}]},budget),/bytes do not match/);
 await store.update(job.id,j=>{j.results[0].ready=false;return j;});await assert.rejects(provider.generate(request,budget),/reviewed opening/);assert.equal(calls,1);
}));

test('wire-only schema overrides preserve original review input, instructions and brand boundary',()=>fixture(async({brands,a,create,store})=>{const job=await create(a);let actual;const provider=new BrandScopedProvider({reason:async r=>{actual=r;return {}; }},brands),schema={type:'object',properties:{},required:[],additionalProperties:false};await provider.reason({instructions:'Inspect actual pixels and retain unknown evidence.',input:{record:{brandId:a.id},ocr:{status:'unavailable'}},wire:{kind:'complete-evidence',schema,decode:x=>x}},store.budget(job.id));assert.match(actual.wire.instructions,/Inspect actual pixels/);assert.doesNotMatch(actual.wire.instructions,/undefined/);assert.deepEqual(actual.wire.input.record,{brandId:a.id});assert.equal(actual.wire.input.ocr.status,'unavailable');assert.equal(actual.wire.input.brandKnowledge.brandId,a.id);}));

test('pinned canvas font and logo assets are allowed only with same-brand hash-bound files',()=>fixture(async({brands,store,a,b,create})=>{
 let calls=0;const provider=new BrandScopedProvider({reason:async()=>{calls++;return {}; }},brands);
 for(const brand of [a,b]){
 const job=await create(brand),bytes=Buffer.from('canvas-fixture-'+brand.id),sha256=require('crypto').createHash('sha256').update(bytes).digest('hex'),id='asset-'+sha256.slice(0,24),filename=id+'.woff2',dir=path.join(brands.dir(brand.id),'canvas-assets');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,filename),bytes);
 const asset={id,filename,sha256,brandId:brand.id,kind:'font',approved:true};await store.update(job.id,j=>{j.intake.canvasAssets={version:1,brandId:brand.id,fonts:[asset],logo:null};return j;});
 await provider.reason({instructions:'Plan',input:{canvasAssets:{fonts:[asset]}}},store.budget(job.id));
 await assert.rejects(()=>provider.reason({instructions:'Plan',input:{canvasAssets:{fonts:[{...asset,brandId:brand.id===a.id?b.id:a.id}]}}},store.budget(job.id)),/different brand/);
 await fs.writeFile(path.join(dir,filename),'changed');await assert.rejects(()=>provider.reason({instructions:'Plan',input:{}},store.budget(job.id)),/canvas asset/);
 }assert.equal(calls,2);
}));
test('derived product detail views require exact same-brand source bytes and reproducible pixels before dispatch',()=>fixture(async({brands,store,a,b,create})=>{
 const sharp=require('sharp'),detail=require('../../lib/creative-ai/runtime/product-review-images');let calls=0;
 const provider=new BrandScopedProvider({generate:async()=>{calls++;return {ok:true};}},brands),ja=await create(a),jb=await create(b);
 const data=async color=>'data:image/png;base64,'+(await sharp({create:{width:30,height:30,channels:3,background:color}}).png().toBuffer()).toString('base64');
 const aData=await data('red'),bData=await data('blue');
 await store.save(ja.id,'research-sku.json',bindResearch(research(a,aData),ja.intake.brandKnowledge));await store.save(jb.id,'research-sku.json',bindResearch(research(b,bData),jb.intake.brandKnowledge));
 const record={productReference:{sourceAssetId:'official-image-1',referenceAssetIds:['official-image-1']},attachmentManifest:[{assetId:'official-image-1',roles:['product'],imageData:aData}]};
 const attachments=await detail.generationReferences(record);assert.ok(attachments[1].derivation);
 await assert.rejects(()=>provider.generate({prompt:'Render',attachments},store.budget(jb.id)),/source|collected|detail/i);assert.equal(calls,0);
 assert.equal((await provider.generate({prompt:'Render',attachments},store.budget(ja.id))).ok,true);assert.equal(calls,1);
 const changed=structuredClone(attachments);changed[1].imageData=bData;
 await assert.rejects(()=>provider.generate({prompt:'Render',attachments:changed},store.budget(ja.id)),/detail|derived/i);assert.equal(calls,1);
}));
