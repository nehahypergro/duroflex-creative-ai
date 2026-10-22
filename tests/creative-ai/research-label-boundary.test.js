'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validateAssetLabels,researchRequest}=require('../../lib/creative-ai/runtime/research');
const images=[{id:'visible'}],valid={assetId:'visible',kind:'reference',label:'Source-backed appearance'};
test('research accepts only typed, unique labels for images actually attached',()=>{
 validateAssetLabels([valid],images);
 for(const label of [{...valid,assetId:'unseen'},{...valid,kind:'anything'},{...valid,extra:'silently dropped?'},{...valid,label:JSON.stringify({text:'nested'}) ,extra:true}])assert.throws(()=>validateAssetLabels([label],images));
 assert.throws(()=>validateAssetLabels([valid,valid],images),/Duplicate/);
 assert.throws(()=>validateAssetLabels(JSON.stringify([valid]),images),/array/);
});
test('research request advertises exact attachment IDs and nested label schema',()=>{
 const assets=Array.from({length:12},(_,i)=>({id:'reference-'+i,kind:'reference',label:'Reference '+i,sourceIds:['source'],imageData:'data:image/png;base64,YQ=='}));
 const before=structuredClone(assets),r=researchRequest({brief:'Fresh brief'},{pages:[],sources:[],assets});
 assert.equal(r.images.length,8);
 assert.deepEqual(r.schema.properties.assetLabels.items.properties.assetId.enum,r.images.map(x=>x.id));
 assert.equal(r.schema.properties.assetLabels.items.additionalProperties,false);
 assert.deepEqual(assets,before);
 assert.throws(()=>r.validate({assetLabels:[{...valid,assetId:'reference-11'}]}),/not among inspected/);
});

test('text-only research has no impossible empty enum and cannot label unseen images',()=>{
 const r=researchRequest({}, {pages:[],sources:[],assets:[]});
 assert.equal(r.schema.properties.assetLabels.maxItems,0);
 assert.equal(r.schema.properties.assetLabels.items.properties.assetId.enum,undefined);
 validateAssetLabels([],[]);
 assert.throws(()=>validateAssetLabels([valid],[]),/not among inspected/);
});
