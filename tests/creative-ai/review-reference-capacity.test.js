'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
const views=require('../../lib/creative-ai/runtime/product-review-images'),preflight=require('../../lib/creative-ai/runtime/deterministic-preflight');
async function example(n){const data='data:image/png;base64,'+(await sharp({create:{width:16,height:16,channels:3,background:'#123456'}}).png().toBuffer()).toString('base64');return {data,record:{productReference:{sourceAssetId:'sku-0',referenceAssetIds:Array.from({length:n},(_,i)=>'sku-'+i)},attachmentManifest:Array.from({length:n},(_,i)=>({assetId:'sku-'+i,roles:['product'],imageData:data}))}};}
for(const n of [4,6])test(n+' original SKU references fit with target/preview and only affordable derived views',async()=>{
 const {data,record}=await example(n),before=structuredClone(record),out=await views.build(record,data),all=[{id:'actual-target-static',imageData:data},{id:'display-size-stress-preview',imageData:data},...out.images];
 await assert.doesNotReject(preflight.images(all));assert.ok(record.attachmentManifest.every(a=>out.images.some(i=>i.id===a.assetId)));assert.deepEqual(out.references.map(a=>a.assetId),record.attachmentManifest.map(a=>a.assetId));assert.deepEqual(record,before);assert.ok(out.selection.omittedDerivedIds.length);
});
test('required originals exceeding capacity are never silently dropped',async()=>{const {data,record}=await example(7);await assert.rejects(views.build(record,data),e=>e.code==='REFERENCE_CAPACITY'&&e.requiredCount===9&&e.limit===8);});
test('active review prompt describes runtime evidence and pinned policy, without foundation contradictions',()=>{
 const text=require('fs').readFileSync(require.resolve('../../lib/creative-ai/creative-reviewer/instructions.md'),'utf8');
 assert.doesNotMatch(text,/OCR, vision, semantic evaluation and live generation are not connected|>=75\/100|for both concept routes/);assert.match(text,/qualityGate/);
 const art=require('fs').readFileSync(require.resolve('../../lib/creative-ai/art-director/instructions.md'),'utf8');assert.doesNotMatch(art,/not an implemented Copywriter/);
});
