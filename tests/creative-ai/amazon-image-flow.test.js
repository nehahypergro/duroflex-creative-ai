'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model'),placements=require('../../lib/creative-ai/runtime/placements'),treatments=require('../../lib/creative-ai/treatment-knowledge');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': A+ image intent remains separate from literal copy and selects specific shared treatment',()=>{
 for(const name of Object.keys(M.amazonTemplates)){const d=M.startDraft(brand,'quick',6);M.applyAmazonPreset(d.outputs[0],name);d.outputs[0].staticParts[0].visualIntent='Show stitching close up';const p=M.generationProfile(d),s=placements.resolve({placementIds:p.placementIds,customProfiles:p.customProfiles});assert.match(s.selections[0].jobInputs.displayContext,/Show stitching close up/);assert.match(p.placementId,/amazon-/);const t=treatments.capture(s);assert.ok(t.placements.every(p=>p.treatmentIds.some(id=>id.startsWith('amazon-image-'))));assert.match(treatments.constraints(t,s.selections[0].id).join('\n'),/no.*CTA|CTA.*not/i);}
});
test('Only Brand Story supports brand-only A+ images; stale product data cannot select another route',()=>{
 const d=M.startDraft('Duroflex','quick',6);d.focus='brand';d.productId='stale';M.applyAmazonPreset(d.outputs[0],'Amazon Brand Story');assert.ok(M.generationProfile(d));M.applyAmazonPreset(d.outputs[0],'Amazon feature module');assert.equal(M.generationProfile(d),null);
});

 test('Premium slot inventories use the chosen count and keep desktop/mobile pairs grouped',()=>{
  for(const [name,t] of Object.entries(M.amazonTemplates).filter(([,t])=>t.tier==='Premium')){
   for(const count of t.range?Array.from({length:t.range[1]-t.range[0]+1},(_,i)=>i+t.range[0]):[null]){
    const d=M.startDraft('Duroflex','quick',6),o=d.outputs[0];M.applyAmazonPreset(o,name);if(count){o.staticValues.imageCount=String(count);M.applyAmazonPreset(o,name);}
    const p=M.generationProfile(d);assert.ok(p,name);assert.deepEqual(p.customProfiles.map(p=>[p.canvas.width,p.canvas.height]),M.amazonImageSlots(t,o.staticValues).map(p=>p.slice(1)));
    const ss=placements.resolve(p).selections,c=M.assetCollections({placements:ss.map(s=>s.description)});assert.equal(c.length,1);assert.equal(c[0].count,p.unitCount);
    if(t.repeat==='panels')assert.equal(p.unitCount,count*2);if(t.repeat==='hotspots')assert.equal(p.unitCount,count+1);
    if(t.range){o.staticValues.imageCount=String(t.range[1]+1);assert.equal(M.generationProfile(d),null);}
   }
  }
 });
 test('Changing A+ presets keeps visual notes and legacy copy without leaking a previous count',()=>{
  const o=M.output(6);M.applyAmazonPreset(o,'Amazon Premium — Image carousel');o.staticValues.imageCount='6';M.applyAmazonPreset(o,o.staticValues.amazonPreset);o.staticParts[0].visualIntent='Keep seam visible';o.staticParts[0].copy='Legacy wording';M.applyAmazonPreset(o,'Amazon Premium — Four-column images');assert.equal(o.staticParts.length,4);assert.equal(o.staticParts[0].visualIntent,'Keep seam visible');assert.equal(o.staticParts[0].copy,'Legacy wording');assert.equal(o.staticValues.imageCount,'4');
 });
test('A+ image-only copy handoff permits zero overlay fields without forbidding explicit wording',()=>{
 const d=M.startDraft('Duroflex','quick',6);M.applyAmazonPreset(d.outputs[0],'Amazon feature module');const profile=M.generationProfile(d),ss=placements.resolve(profile).selections;
 const w=require('../../lib/creative-ai/runtime/copy-wire').wire({concepts:[{conceptId:'continuity'}],placements:ss},'');const fields=w.schema.properties.units.properties.unit0.properties.fields;
 assert.equal(fields.minItems,0);assert.notEqual(fields.maxItems,0);assert.deepEqual(w.decode({units:{unit0:{fields:[]}},rationale:'Product detail only',unknowns:[]}).decks[0].fields,[]);
});
