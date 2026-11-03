'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model'),placements=require('../../lib/creative-ai/runtime/placements'),knowledge=require('../../lib/creative-ai/treatment-knowledge');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': RCS presets bind shape, ordered images and treatment without WhatsApp fallback',()=>{
 for(const preset of Object.keys(M.rcsPresets))for(const count of [2,3,10]){
  const d=M.startDraft(brand,'quick',14),o=d.outputs[0];M.applyRcsPreset(o,preset);o.staticValues.cardCount=String(count);M.applyRcsPreset(o,preset);o.staticParts[0].visualIntent='Show exact fabric';
  const p=M.generationProfile(JSON.parse(JSON.stringify(d))),n=preset.startsWith('Carousel')?count:1;
  assert.equal(p.unitCount,n);assert.equal(M.units(d),n);assert.equal(M.staticParts(o)[0].visualIntent,'Show exact fabric');
  const resolved=placements.resolve(p),snap=knowledge.capture(resolved);assert.equal(resolved.selections.length,n);assert.ok(snap.placements.every(x=>x.treatmentIds.includes('rcs')));
  assert.ok(p.customProfiles.every(x=>x.platform==='RCS'&&x.displayContext.includes('native')));
  const collections=M.assetCollections({placements:p.customProfiles});assert.equal(collections.length,1);assert.equal(collections[0].grouped,n>1);
  assert.ok(M.rcsPreview(p.placementId));o.width+=1;assert.equal(M.generationProfile(d),null);
 }
 const d=M.startDraft(brand,'quick',14),o=d.outputs[0];o.staticValues={channel:'RCS'};assert.equal(M.generationProfile(d),null,'legacy RCS must never dispatch WhatsApp');
 M.applyRcsPreset(o,'Carousel medium · medium image');o.staticValues.cardCount='11';assert.equal(M.generationProfile(d),null);o.staticValues.cardCount='1';assert.equal(M.generationProfile(d),null);
});
test('RCS strategist adapter receives selected rules and image-only wording stays optional',async()=>{
 const d=M.startDraft('Duroflex','quick',14);M.applyRcsPreset(d.outputs[0],'Single card · medium image');const p=M.generationProfile(d),r=placements.resolve(p),snapshot=knowledge.capture(r),input=structuredClone(require('../../lib/creative-ai/marketing-strategist/examples/input.json'));
 input.assignment.formats=r.selections.map(s=>({id:s.id,label:s.description.name,channel:s.description.platform,specificationStatus:'supplied',constraints:[]}));
 await assert.rejects(()=>require('../../lib/creative-ai/runtime/agents').strategist(knowledge.apply(input,snapshot,r.selections),{reason:async req=>{const f=req.wire.input.assignment.assignment.formats[0];for(const k of ['purpose','copy','visual','action','sequence','checks'])assert.ok(f.constraints.some(x=>x.includes('rcs-'+k)));throw Error('Verified before dispatch');}},{}),/Verified before dispatch/);
 const wire=require('../../lib/creative-ai/runtime/copy-wire').wire({concepts:[{conceptId:'continuity'}],placements:r.selections},'');assert.equal(wire.schema.properties.units.properties.unit0.properties.fields.minItems,0);
});
test('RCS complete-set download order follows cards and never mixes options or hides missing images',()=>{
 const d=M.startDraft('Sleepyhead','quick',14),o=d.outputs[0];M.applyRcsPreset(o,'Carousel medium · tall image');const profile=M.generationProfile(d),p={placements:profile.customProfiles,results:profile.placementIds.flatMap((id,i)=>['continuity','exploration'].map(route=>({placementId:id,route,imageUrl:'/creative-ai/api/jobs/test/files/'+route+'-'+i+'.png'}))).reverse()};
 assert.deepEqual(M.completeSet(p,'continuity',profile.placementId).map(r=>r.placementId),profile.placementIds);p.results=p.results.filter(r=>!(r.route==='continuity'&&r.placementId===profile.placementIds[1]));assert.equal(M.completeSet(p,'continuity',profile.placementId),null);assert.equal(M.completeSet(p,'exploration',profile.placementId).length,3);
});
