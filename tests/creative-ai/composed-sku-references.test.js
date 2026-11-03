'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),sharp=require('sharp');
const composed=require('../../lib/creative-ai/runtime/composed-text'),views=require('../../lib/creative-ai/runtime/product-review-images');
async function capture(t,record,intake={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sku-reference-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));let request;
 const runtime={store:{dir:()=>dir,read:async()=>({intake}),save:async(id,name,value)=>fs.writeFile(path.join(dir,name),JSON.stringify(value))},provider:{generate:async req=>{request=req;throw Error('Offline capture');}}};
 await assert.rejects(()=>composed.prepare(runtime,'fixture','unit',record,{canvas:{width:800,height:400},objects:[],fonts:[]},{}),/Offline capture/);
 return request;
}
async function fixture(brand){
 const imageData='data:image/png;base64,'+(await sharp({create:{width:30,height:20,channels:3,background:brand==='Duroflex'?'#a21828':'#283ba2'}}).png().toBuffer()).toString('base64');
 const asset=(id,roles)=>({assetId:brand+'-'+id,label:'Catalogue name, not physical lettering',roles,imageData});
 return {route:'continuity',placementId:'fixture',conceptId:'fixture',exactCopy:{fields:[]},artDirection:{logo:{assetIds:[brand+'-logo']},product:{assetIds:[brand+'-secondary',brand+'-third']}},productReference:{sourceAssetId:brand+'-primary',referenceAssetIds:[brand+'-primary']},attachmentManifest:[asset('secondary',['product']),asset('third',['product']),asset('primary',['product','identity']),asset('mood',['visual-style']),asset('logo',['logo'])]};
}
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': composed source dispatch includes primary detail, bounded additional detail and physical-label authority',async t=>{
 const record=await fixture(brand),before=structuredClone(record),req=await capture(t,record,{skuReferenceDetailVersion:1});
 const details=req.attachments.filter(a=>a.derivation);
 assert.equal(details.length,2);assert.equal(details[0].derivation.sourceAssetId,brand+'-primary');
 assert(!req.attachments.some(a=>a.assetId===brand+'-logo'));
 for(const a of details){assert.equal(await views.verifyDerived(a,record.attachmentManifest),true);assert(req.prompt.includes(a.assetId));}
 assert.match(req.prompt,/Do not rewrite physical labels from catalogue names/);
 assert.match(req.prompt,/not additional products/);assert.match(req.prompt,/cannot recover missing detail/);
 assert.deepEqual(record,before);
 const other=await fixture(brand==='Duroflex'?'Sleepyhead':'Duroflex');
 await assert.rejects(()=>views.verifyDerived(details[0],other.attachmentManifest),/not collected/);
});
test('historical and non-product jobs keep the original source request',async t=>{
 const record=await fixture('Duroflex'),legacy=await capture(t,record,{});
 assert.deepEqual(legacy.attachments,require('../../lib/creative-ai/runtime/editable').photoAttachments(record));
 assert.equal(legacy.prompt,composed.prompt(record,{canvas:{width:800,height:400},objects:[],fonts:[]}));
 const noProduct={...record,productReference:undefined};
 assert.deepEqual(await capture(t,noProduct,{}),await capture(t,noProduct,{skuReferenceDetailVersion:1}));
});
test('typography guide remains last after product detail attachments',async t=>{
 const guide=require('../../lib/creative-ai/runtime/composed-type-guide'),record=await fixture('Sleepyhead');
 t.mock.method(guide,'create',async()=>({assetId:'composed-type-guide',roles:['composition-guide'],imageData:record.attachmentManifest[0].imageData}));
 const req=await capture(t,record,{skuReferenceDetailVersion:1,composedQualityVersion:3});
 assert.equal(req.attachments.at(-1).assetId,'composed-type-guide');
 assert.equal(req.attachments.filter(a=>a.derivation).length,2);
 assert(req.prompt.endsWith(guide.instructions));
});
test('new composed jobs automatically pin the reference policy at admission',async t=>{
 let captured;t.mock.method(require('../../lib/creative-ai/runtime/approved-identity'),'snapshot',async(runtime,intake)=>{captured=intake;throw Error('Admission captured');});
 const runtime={config:{maxReasoningCalls:40,estimatedSpend:{maxUsd:100,reasoningUsd:2,imageUsd:3}}};
 await assert.rejects(()=>require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype.createRequest.call(runtime,{brief:'Synthetic exact-SKU fixture',composedTextVersion:1,placementIds:['merchant-primary']}),/Admission captured/);
 assert.equal(captured.skuReferenceDetailVersion,1);
});
