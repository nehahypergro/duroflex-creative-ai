'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model'),placements=require('../../lib/creative-ai/runtime/placements'),knowledge=require('../../lib/creative-ai/treatment-knowledge');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': push destination and custom template survive without falling through to WhatsApp',()=>{
 for(const destination of ['Android','iPhone / iOS','Web'])for(const preset of ['Landscape image · 2:1','Square image · 1:1','Custom template']){
  const d=M.startDraft(brand,'quick',14),o=d.outputs[0];M.applyPushPreset(o,destination,preset);o.staticValues.visualFocus='Show the product texture';if(preset==='Custom template'){o.width=900;o.height=600;}o.staticValues.fileLimitKb='500';
  const p=M.generationProfile(JSON.parse(JSON.stringify(d)));assert.ok(p);assert.equal(p.customProfiles[0].exportContract.maxBytes,512000);const r=placements.resolve({...p,placementIds:[p.placementId]}),snap=knowledge.capture(r);assert.ok(snap.placements[0].treatmentIds.includes('push'));assert.match(p.customProfiles[0].displayContext,/native/);assert.equal(M.pushPreview(p.placementId).width,o.width);d.focus='brand';assert.ok(M.generationProfile(d));
  const w=require('../../lib/creative-ai/runtime/copy-wire').wire({concepts:[{conceptId:'continuity'}],placements:r.selections},'');assert.equal(w.schema.properties.units.properties.unit0.properties.fields.minItems,0);
  o.staticValues.fileLimitKb='bad';assert.equal(M.generationProfile(d),null);
 }
 const d=M.startDraft(brand,'quick',14),o=d.outputs[0];o.staticValues={channel:'Push'};assert.equal(M.generationProfile(d),null);M.applyPushPreset(o,'Android','Landscape image · 2:1');o.width=1000;assert.equal(M.generationProfile(d),null);M.applyPushPreset(o,'Web','Custom template');o.width=0;assert.equal(M.generationProfile(d),null);
});
test('push strategist receives the selected treatment before any provider call',async()=>{
 const d=M.startDraft('Duroflex','quick',14);M.applyPushPreset(d.outputs[0],'iPhone / iOS','Square image · 1:1');const r=placements.resolve(M.generationProfile(d)),snapshot=knowledge.capture(r),input=structuredClone(require('../../lib/creative-ai/marketing-strategist/examples/input.json'));
 input.assignment.formats=r.selections.map(s=>({id:s.id,label:s.description.name,channel:s.description.platform,specificationStatus:'supplied',constraints:[]}));
 await assert.rejects(()=>require('../../lib/creative-ai/runtime/agents').strategist(knowledge.apply(input,snapshot,r.selections),{reason:async req=>{const f=req.wire.input.assignment.assignment.formats[0];for(const key of ['purpose','copy','visual','action','checks'])assert.ok(f.constraints.some(x=>x.includes('push-'+key)));throw Error('Verified before paid dispatch');}},{}),/Verified before paid dispatch/);
});
