'use strict';
// Wardrobe preferences (22 Nov 2026). Neha shared a clothing style for each brand ("Yes, save it", twice) and said
// "remember this is only for these brands, keep it certain to that". Each brand's wardrobe rule lives only in its own
// preference file, and a new design reaches only its own brand's rule: the planner and section 3 of the image brief.
// The rules are preferences, so the image check does not judge them. No paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
const memoryDir=path.join(__dirname,'../../output/creative-ai/memory');
const BRANDS={
 Duroflex:{id:'brand-1923d633-e03e-44cc-84b2-bbfb5c152710',rule:'preference-c7ff3af2-75a3-4b40-b44f-d8ec599d8a9d',start:'Wardrobe for people in at-home scenes'},
 Sleepyhead:{id:'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de',rule:'preference-f21d9199-6693-4ac1-9edf-6db1851311dd',start:'Wardrobe for people in Sleepyhead scenes'}};
const saved=brand=>require(path.join(memoryDir,BRANDS[brand].id+'.json'));
const other=brand=>brand==='Duroflex'?'Sleepyhead':'Duroflex';
test('each wardrobe rule is saved once, active, in its own brand only',()=>{
 for(const brand of Object.keys(BRANDS)){
  const s=saved(brand),mine=s.preferences.filter(p=>p.id===BRANDS[brand].rule);
  assert.equal(s.brandId,BRANDS[brand].id);assert.equal(mine.length,1);
  assert.equal(mine[0].active,true,brand+' wardrobe rule is switched off; update this test if Neha retired it');
  assert.equal(mine[0].brandId,BRANDS[brand].id);assert.equal(mine[0].provenance.brandName,brand);assert.equal(mine[0].scope,'brand');
  assert.ok(mine[0].text.startsWith(BRANDS[brand].start));
  const theirs=saved(other(brand)).preferences.map(p=>p.id+' '+p.text);
  assert.ok(!theirs.some(t=>t.includes(BRANDS[brand].rule)||t.includes(BRANDS[brand].start)),brand+' rule never in '+other(brand)+'\'s file');
 }
});
for(const brand of Object.keys(BRANDS)){
 test(brand+': a new design gets its own wardrobe rule and never the other brand\'s',async t=>{
  const create=JobStore.prototype.create;t.after(()=>{JobStore.prototype.create=create;});
  // The saved brand memory as a new job pins it (the fixture's brand id stands in for the real one).
  JobStore.prototype.create=async function(...a){const job=await create.apply(this,a),s=saved(brand);job.preferenceMemory={version:1,brandId:job.intake.brandId,revision:s.revision,policy:'test',preferences:s.preferences.filter(p=>p.active).map(p=>({...p,brandId:job.intake.brandId}))};return job;};
  const {fixture,square}=require('./lean-marketing-fixture');
  const f=await fixture(t,{brand,selection:[square(1)]});assert.equal(f.planError,null);
  const plan=f.calls.find(c=>c.kind==='lean-planning');
  assert.ok(plan.input.brand.preferences.some(p=>p.text.startsWith(BRANDS[brand].start)),'the planner gets it');
  const brief=f.records[0].prompt,section=brief.slice(brief.indexOf('3. Brand requirements'));
  assert.ok(section.includes(BRANDS[brand].start),'section 3 of the image brief carries it');
  assert.ok(!brief.includes(BRANDS[other(brand)].start),'never the other brand\'s rule');
 });
}
