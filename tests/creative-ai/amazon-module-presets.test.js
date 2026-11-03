'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../../public/creative-ai/studio-model'),{resolve}=require('../../lib/creative-ai/runtime/placements');
for(const brand of ['Duroflex','Sleepyhead'])for(const preset of ['Amazon feature module','Amazon lifestyle module','Amazon Brand Story'])test(brand+': '+preset+' chooses exact image slots and retains content across reload',()=>{
 const d=M.startDraft(brand,'quick',6),o=d.outputs[0];M.applyAmazonPreset(o,preset);
 const parts=M.staticParts(o);assert.deepEqual(parts.map(p=>[p.width,p.height]),preset==='Amazon feature module'?[[300,300]]:preset==='Amazon lifestyle module'?[[970,600]]:[[1464,625],[463,625],[362,453],[362,453]]);
 assert.equal(o.staticValues.marketplace,'Amazon');assert.equal(o.staticValues.amazonPreset,preset);
 parts[0].copy='Keep the current message';o.staticParts=parts;const saved=JSON.parse(JSON.stringify(d));assert.equal(M.staticParts(saved.outputs[0])[0].copy,'Keep the current message');
 const p=M.generationProfile(saved),r=resolve({placementIds:p.placementIds,customProfiles:p.customProfiles});assert.equal(r.selections.length,parts.length);assert.deepEqual(r.selections.map(s=>[s.description.dimensions.width,s.description.dimensions.height]),parts.map(s=>[s.width,s.height]));
 const collection=M.assetCollections({placements:r.selections.map(s=>s.description)});assert.equal(collection.length,1);assert.equal(collection[0].count,parts.length);
 const forged=structuredClone(saved);forged.outputs[0].staticParts[0].width=999;assert.equal(M.generationProfile(forged),null,'named preset rejects a changed slot canvas');
 const before=JSON.stringify(d);assert.throws(()=>M.applyAmazonPreset(o,'Unknown Amazon type'),/preset/);assert.equal(JSON.stringify(d),before);
});
