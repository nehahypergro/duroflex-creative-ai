'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model'),placements=require('../../lib/creative-ai/runtime/placements'),knowledge=require('../../lib/creative-ai/treatment-knowledge');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': email image brief selects email presets instead of WhatsApp and survives reload',()=>{
 const d=M.startDraft(brand,'quick',14),o=d.outputs[0];M.applyEmailPreset(o,'Email hero');o.staticValues.visualFocus='Show product texture';
 let p=M.generationProfile(JSON.parse(JSON.stringify(d)));assert.equal(p.placementId,'custom:studio-email-hero');assert.deepEqual([p.width,p.height],[1200,600]);
 M.applyEmailPreset(o,'Email header / banner');assert.equal(M.generationProfile(d).placementId,'custom:studio-email-banner');assert.equal(o.height,400);assert.equal(o.staticValues.visualFocus,'Show product texture');
 M.applyEmailPreset(o,'Custom email image');o.width=900;o.height=500;p=M.generationProfile(d);const r=placements.resolve({...p,placementIds:[p.placementId]}),snap=knowledge.capture(r);assert.ok(snap.placements[0].treatmentIds.includes('email'));assert.equal(r.selections[0].description.dimensions.width,900);
 o.staticValues.emailPreset='Email hero';assert.equal(M.generationProfile(d),null,'preset cannot silently retain a different canvas');
});
