'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../../public/creative-ai/studio-model');
test('retail presets and physical settings connect independently for both brands',()=>{
 for(const brand of ['Duroflex','Sleepyhead'])for(const entry of M.retailEntries){
  const d=M.startDraft(brand,'quick',entry.featureId);M.applyRetailPreset(d.outputs[0],entry.key);d.focus='brand';
  const o=d.outputs[0],recipe=M.staticRecipeForOutput(o);assert.ok(recipe.fields.length);assert.equal(o.staticValues.retailPreset,entry.key);
  const p=M.generationProfile(d);if(entry.planningOnly)assert.equal(p,null);else assert.ok(p,entry.key);
  if(p?.printOptions){const f=require('../../lib/creative-ai/runtime/output-formats');const r=f.expand({placementIds:[p.placementId],printOptions:p.printOptions});assert.equal(r.rows.length,p.unitCount);assert.ok(r.rows.every(x=>x.canvas.width>0));}
 }
});
test('retail screen orientation, custom sizes and print units remain explicit',()=>{
 const d=M.startDraft('Duroflex','quick',10),o=d.outputs[0];M.applyRetailPreset(o,'screen');o.staticValues.sizePreset='Portrait · 1080 × 1920';M.applyRetailPreset(o,'screen');assert.equal(o.height,1920);assert.match(M.generationProfile(d).customProfiles[0].displayContext,/screen/i);
 M.applyRetailPreset(o,'standee');Object.assign(o.staticValues,{physicalWidth:'85',physicalHeight:'200',unit:'cm'});const p=M.generationProfile(d);assert.equal(p.printOptions[p.placementId].trimWidthMm,850);
 o.staticValues.physicalWidth='bad';assert.equal(M.generationProfile(d),null);
});
test('both brands: physical exclusions and screen delivery settings survive the selected brief',()=>{
 for(const brand of ['Duroflex','Sleepyhead']){
 const d=M.startDraft(brand,'quick',11),o=d.outputs[0];M.applyRetailPreset(o,'window');
 const fields=M.staticRecipeForOutput(o).fields.map(f=>f[0]);for(const k of ['cutShape','foldNotes','mountingNotes'])assert.ok(fields.includes(k),k);
 Object.assign(o.staticValues,{cutShape:'Arch supplied by vendor',foldNotes:'No folds',mountingNotes:'Leave handles clear'});
 let p=M.generationProfile(d);assert.match(p.printOptions[p.placementId].templateNote,/handles clear/);
 M.applyRetailPreset(o,'screen');Object.assign(o.staticValues,{fileFormat:'JPEG',maxFileKb:'700',cropMode:'Fit / letterbox',edgeClearance:'20 px all edges'});
 p=M.generationProfile(d);assert.deepEqual(p.customProfiles[0].exportContract,{formats:['jpeg'],maxBytes:716800});assert.match(p.customProfiles[0].displayContext,/Fit \/ letterbox/);assert.match(p.customProfiles[0].displayContext,/20 px/);
 o.staticValues.maxFileKb='invalid';assert.equal(M.generationProfile(d),null);
 }
});
