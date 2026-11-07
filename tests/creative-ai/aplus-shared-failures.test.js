'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
const product=require('../../lib/creative-ai/runtime/reference-product');
const hash=bytes=>require('crypto').createHash('sha256').update(bytes).digest('hex');
const uri=b=>'data:image/png;base64,'+b.toString('base64');
async function image(w=300,h=300){return sharp({create:{width:w,height:h,channels:3,background:'#c85020'}}).png().toBuffer();}
function observation(status,assessment){return {criterion:'product-branding',status,confidence:0.9,correction:'Restore observed letters',evidence:{method:'vision-attestation',sourceIds:['identity'],observation:'Small white label',location:'lower front'},comparison:{assessment,sourceAssetIds:['identity'],referenceObservation:'White word on orange label',outputObservation:'Letters cannot be resolved',limitation:'Insufficient final pixels'}};}
test('concept wire uses named routes instead of ambiguous ordinal slots',()=>{
 const request={schema:{type:'object',properties:{concepts:{type:'array',items:{type:'object',properties:{route:{type:'string'},conceptId:{type:'string'},idea:{type:'string'}},required:['route','conceptId','idea'],additionalProperties:false}}},required:['concepts'],additionalProperties:false},input:{},instructions:''};
 const w=require('../../lib/creative-ai/runtime/unit-wire').wire(request,'concepts',[{route:'continuity',conceptId:'c'},{route:'exploration',conceptId:'e'}],{namedBy:'route'});
 assert.deepEqual(Object.keys(w.schema.properties.concepts.properties),['continuity','exploration']);
 const result=w.decode({concepts:{exploration:{idea:'New premise'},continuity:{idea:'Source direction'}}});
 assert.deepEqual(result.concepts.map(c=>[c.route,c.idea]),[['continuity','Source direction'],['exploration','New premise']]);
 assert.throws(()=>w.decode({concepts:{unit0:{idea:'A'},unit1:{idea:'B'}}}));
});
test('new SKU contracts explicitly pin technical reference treatment without changing historical contracts',()=>{
 const old={mode:'reference-led',sourceAssetId:'identity'};
 assert.match(product.technicalInstructions(old),/reuse-only/);
 const p=product.contract({id:'i',brandId:'b',productId:'p',productName:'P',assetId:'identity',reference:{rasterHash:'hash'},variant:{id:'v',sku:'s'}});
 assert.equal(p.policyVersion,2);assert.match(product.technicalInstructions(p),/visible structure/);assert.match(product.technicalInstructions(p),/not.*whole source photograph/i);assert.equal(old.policyVersion,undefined);
});
test('unclear marks cannot become confident defects or passes without visible evidence',()=>{
 const record={productReference:{referenceAssetIds:['identity']}};
 for(const status of ['pass','fail'])assert.throws(()=>product.validateComparisons(record,[observation(status,'unresolved')]),/unresolved/);
 assert.doesNotThrow(()=>product.validateComparisons(record,[observation('unknown','unresolved')]));
});
test('a product comparison must cite an attached exact SKU image, not unrelated style',()=>{
 const o=observation('fail','mismatch');o.comparison.sourceAssetIds=['moodboard'];o.comparison.limitation='';
 assert.throws(()=>product.validateComparisons({productReference:{referenceAssetIds:['identity']}},[o]),/source/i);
});
test('real product mismatches still fail; saved legacy reviews are not rewritten',()=>{
 const o=observation('fail','mismatch');o.comparison.outputObservation='The visible marking spells a different word';o.comparison.limitation='';
 assert.doesNotThrow(()=>product.validateComparisons({productReference:{referenceAssetIds:['identity']}},[o]));
 const legacy=observation('unknown','unresolved');delete legacy.comparison;assert.doesNotThrow(()=>product.validateComparisons({productReference:{}},[legacy]));assert.equal(legacy.status,'unknown');
});
for(const brandId of ['Duroflex','Sleepyhead'])test(brandId+' review retains all selected references and labels actual detail separately',async()=>{
 const bytes=await image(),data=uri(bytes),refs=Array.from({length:4},(_,i)=>({assetId:'sku-'+i,roles:['product'],imageData:data}));
 const record={canvas:{width:300,height:300},productReference:{brandId,sourceAssetId:'sku-3',referenceAssetIds:refs.map(a=>a.assetId)},artDirection:{product:{assetIds:['sku-2']}},attachmentManifest:[{assetId:'style',roles:['style'],imageData:data},...refs]};
 const r=await require('../../lib/creative-ai/runtime/product-review-images').build(record,data);
 assert.ok(refs.every(a=>r.images.some(i=>i.id===a.assetId)));assert.equal(r.references[0].assetId,'sku-3');
 assert.ok(r.images.some(i=>i.id==='actual-target-detail'));assert.match(r.instructions,/cannot recover/);assert.equal(record.attachmentManifest.length,5);
});
test('a native render is supplementary only and must match both saved hashes',async()=>{
 const native=await image(1024,1024),target=await image(),record={canvas:{width:300,height:300},attachmentManifest:[]};
 const build=require('../../lib/creative-ai/runtime/product-review-images').build;
 const proof={sourceImageHash:hash(native),exportHash:hash(target),compositing:false};
 const r=await build(record,uri(target),{master:{imageData:uri(native),proof}});assert.ok(r.images.some(i=>i.id==='native-render-diagnostic'));assert.match(r.instructions,/final target/);
 await assert.rejects(()=>build(record,uri(target),{master:{imageData:uri(native),proof:{...proof,exportHash:'wrong'}}}),/hash/i);
 await assert.rejects(()=>build(record,uri(target),{master:{imageData:uri(native),proof:{...proof,sourceImageHash:'wrong'}}}),/hash/i);
});
test('generation includes traceable product detail references and excludes style from that inventory',async()=>{
 const bytes=await image(1000,1000),data=uri(bytes),record={productReference:{sourceAssetId:'identity',referenceAssetIds:['identity']},attachmentManifest:[{assetId:'identity',roles:['product'],imageData:data},{assetId:'style',roles:['style'],imageData:data}]};
 const refs=await require('../../lib/creative-ai/runtime/product-review-images').generationReferences(record);
 assert.equal(refs[0].assetId,'identity');assert.equal(refs.filter(a=>a.assetId.endsWith('-detail')).length,1);assert.equal(record.attachmentManifest.length,2);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+' new generation preserves native evidence, uses detail quality and resumes without another charge',async t=>{
 const fs=require('fs/promises'),path=require('path'),dir=await fs.mkdtemp(path.join(require('os').tmpdir(),'aplus-native-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const source=uri(await image(1000,1000)),native=uri(await image(1024,1024));let calls=0;
 const record={packageHash:'fixture',canvas:{width:300,height:300},outputFormat:'png',prompt:'One source-supported feature',productReference:{policyVersion:2,brandId:brand,sourceAssetId:'sku',referenceAssetIds:['sku']},attachmentManifest:[{assetId:'sku',roles:['product'],imageData:source}],artDirection:{product:{assetIds:['sku']},logo:{assetIds:[]}},placementContext:{context:{placements:[{rules:[]}]}}};
 const runtime={store:{read:async()=>({intake:{}}),dir:()=>dir,save:async(id,n,value)=>fs.writeFile(path.join(dir,n),Buffer.isBuffer(value)?value:JSON.stringify(value))},activity:{project:async()=>({tasks:{}})},beginTask:async()=>{},finishTask:async()=>{},artifact:async()=>({id:'fixture'}),log:async()=>{},provider:{generate:async args=>{calls++;assert.equal(args.quality,'high');assert.ok(args.attachments.some(a=>a.assetId==='sku-detail'));return {imageData:native};}}};
 const generate=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype.generateImage,scope={route:'continuity',placementId:'feature',conceptId:'c'};
 const output=await generate.call(runtime,'j',record,{},scope,0);await generate.call(runtime,'j',record,{},scope,0);assert.equal(calls,1);
 const views=require('../../lib/creative-ai/runtime/product-review-images'),master=await views.loadNative(dir,'export-proof-continuity-feature-0.json');
 assert.ok(master);const inspected=await views.build(record,output.imageData,{master});assert.ok(inspected.images.some(i=>i.id==='native-render-diagnostic'));
});
test('resolved comparison accepts an explicitly empty limitation in the production schema',()=>{
 const base={type:'object',properties:{criterion:{type:'string'},evidence:{type:'object',properties:{method:{type:'string'}}}},required:[]};
 const schema=product.observationSchema(base).items.properties.comparison,c=observation('pass','match').comparison;c.limitation='';
 assert.deepEqual(require('../../lib/creative-ai/marketing-strategist/schema-validator').check(schema,c),[]);
 assert.equal(product.observationSchema(base,{requireComparison:false}).items.properties.comparison,undefined);
});
test('resuming a historical job retains its exact pinned policy and rejects a changed SKU',()=>{
 const identity={id:'identity',brandId:'brand',productId:'product',assetId:'source',reference:{rasterHash:'hash'},variant:{id:'variant',sku:'SKU'}};
 const pinned={mode:'reference-led',identityId:'identity',brandId:'brand',productId:'product',variantId:'variant',sourceAssetId:'source',sourceHash:'hash',referenceAssetIds:['source'],evidenceFactIds:['saved-fact']};
 const before=structuredClone(pinned),r=product.forJob(identity,{productBriefEvidence:{evidence:[{factId:'new-fact'}]}},pinned);
 assert.deepEqual(r,before);assert.deepEqual(pinned,before);assert.equal(r.policyVersion,undefined);
 assert.throws(()=>product.forJob({...identity,brandId:'other'},{},pinned),/pinned/i);
});
