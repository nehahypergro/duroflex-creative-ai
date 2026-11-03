'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const reviewer=require('../../lib/creative-ai/creative-reviewer'),fixture=require('../../lib/creative-ai/creative-reviewer/examples/synthetic'),{fingerprint}=require('../../lib/creative-ai/art-director');
async function pdpInput(){const input=await fixture.inputExample();input.package.placementContext.selection.pin.profileId='custom:studio-pdp-pack-slot-01';const {packageHash,...body}=input.package;input.package.packageHash=fingerprint(body);input.evidence.packageHash=input.package.packageHash;return input;}
test('PDP does not request, score or retain emotional audience appeal, even as advice',async()=>{
 const input=await pdpInput();input.evidence.quality.find(q=>q.criterion==='emotionalAudienceFit').confidence=0;
 const report=reviewer.evaluate(await reviewer.assembleContext(input));
 assert.equal(report.decision,'ready');assert.equal(report.qualityScores.length,4);assert.ok(!Object.hasOwn(report.policy.weights,'emotionalAudienceFit'));
 assert.equal(report.policy.reviewProfile.id,'pdp');
 const state=await require('../../lib/creative-ai/creative-reviewer/lifecycle').createState(input.package,input.artifact.imageData);
 assert.equal(require('../../lib/creative-ai/creative-reviewer/lifecycle').consumeReview(state,report).state.delivery,'ready');
});
test('PDP excludes emotional-only findings without weakening required-copy checks',async()=>{
 const input=await pdpInput(),finding=fixture.findingExample(input.package,{severity:'creative',cause:'uncertain'});finding.criterion='emotionalAudienceFit';input.evidence.findings=[finding];
 let report=reviewer.evaluate(await reviewer.assembleContext(input));assert.equal(report.decision,'ready');assert.deepEqual(report.findings,[]);
 input.evidence.critical.find(c=>c.criterion==='exact-required-copy').status='fail';report=reviewer.evaluate(await reviewer.assembleContext(input));assert.equal(report.decision,'revise');
});
test('PDP selection is based on saved format IDs, not a brief keyword, brand or aspect ratio',async()=>{
 const input=await fixture.inputExample(),profiles=require('../../lib/creative-ai/creative-reviewer/profiles');
 for(const id of ['custom:studio-pdp-pack-slot-01','custom:studio-pdp-pack-slot-12','custom:recipe-product-image-01','custom:studio-commerce-gallery']){input.package.placementContext.selection.pin.profileId=id;assert.equal(profiles.forRecord(input.package).id,'pdp');}
 for(const id of ['custom:studio-social-square','custom:studio-pdp-pack-slot-99','custom:recipe-marketplace-module-01']){input.package.placementContext.selection.pin.profileId=id;assert.equal(profiles.forRecord(input.package).id,'general');}
});
test('PDP model request omits emotional scoring and findings from its actual response contract',async t=>{
 const input=await pdpInput(),dir=await fs.mkdtemp(path.join(os.tmpdir(),'pdp-review-profile-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await fs.writeFile(path.join(dir,'placement-catalog.json'),'{}');
 const done=Error('Captured request; no provider call');let called=false;
 await assert.rejects(require('../../lib/creative-ai/runtime/review').review(input.package,input.artifact.imageData,{dir,attempt:'test',budget:{},provider:{reason:async request=>{
  called=true;assert.equal(request.input.reviewScope.reviewProfile.id,'pdp');assert.ok(!Object.hasOwn(request.input.weights,'emotionalAudienceFit'));
  assert.ok(!JSON.stringify(request.wire.schema).includes('emotionalAudienceFit'));assert.match(request.instructions,/PDP.*not.*emotional/is);throw done;
 }}}),e=>e===done);assert.equal(called,true);
});
test('PDP planners and reviewers get the same format criteria from the saved treatment source',()=>{
 const treatment=require('../../lib/creative-ai/treatment-knowledge'),placements=require('../../lib/creative-ai/runtime/placements');
 const selected=placements.resolve({placementIds:['custom:studio-pdp-pack']}),snapshot=treatment.capture(selected);
 assert.equal(snapshot.placements.length,12);
 for(const p of snapshot.placements){assert.deepEqual(p.reviewProfile.excludedQualityCriteria,['emotionalAudienceFit']);assert.match(treatment.constraints(snapshot,p.placementId).join('\n'),/FORMAT REVIEW PURPOSE/);}
 const legacy=structuredClone(snapshot);legacy.placements.forEach(p=>delete p.reviewProfile);const {hash,...data}=legacy;legacy.hash=require('node:crypto').createHash('sha256').update(JSON.stringify(data)).digest('hex');assert.doesNotThrow(()=>treatment.validate(legacy,selected.selections));
});
