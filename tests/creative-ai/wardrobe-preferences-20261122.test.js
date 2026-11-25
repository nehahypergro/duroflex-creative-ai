'use strict';
// Brand look preferences (22 Nov 2026). Neha shared a clothing style for each brand and a room look for Sleepyhead
// ("Yes, save it" each time) and said "remember this is only for these brands, keep it certain to that". Each rule
// lives only in its own brand's preference file, and a new design reaches only its own brand's rules: the planner
// and section 3 of the image brief. The rules are preferences, so the image check does not judge them. No paid calls.
// 25 Nov 2026 (client feedback for both brands, Neha: "Yes, build both"): each brand's creative-direction.json replaces these
// rules (clean athleisure for Duroflex; streetwear drip meets comfort and dopamine-high rooms for Sleepyhead). The rules
// are switched off and kept in history; each brand's file lists the ones it replaces. Still one brand only, each way.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
const memoryDir=path.join(__dirname,'../../output/creative-ai/memory');
const BRANDS={
 Duroflex:{id:'brand-1923d633-e03e-44cc-84b2-bbfb5c152710',rules:[
  {name:'wardrobe',id:'preference-c7ff3af2-75a3-4b40-b44f-d8ec599d8a9d',start:'Wardrobe for people in at-home scenes'}]},
 Sleepyhead:{id:'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de',rules:[
  {name:'wardrobe',id:'preference-f21d9199-6693-4ac1-9edf-6db1851311dd',start:'Wardrobe for people in Sleepyhead scenes'},
  {name:'room look',id:'preference-bf7b59c1-87bf-41ce-88dc-984dfb4d8b54',start:'Room look for Sleepyhead scenes'}]}};
const saved=brand=>require(path.join(memoryDir,BRANDS[brand].id+'.json'));
const other=brand=>brand==='Duroflex'?'Sleepyhead':'Duroflex';
test('each look rule is saved once, in its own brand only, and switched off now that the brand\'s direction replaces it',()=>{
 for(const brand of Object.keys(BRANDS)){
  const s=saved(brand),theirs=saved(other(brand)).preferences.map(p=>p.id+' '+p.text);assert.equal(s.brandId,BRANDS[brand].id);
  for(const rule of BRANDS[brand].rules){
   const mine=s.preferences.filter(p=>p.id===rule.id);assert.equal(mine.length,1,brand+' '+rule.name);
   assert.equal(mine[0].active,false,brand+' '+rule.name+' rule was replaced by the brand\'s creative direction on 25 Nov 2026');
   assert.ok(require(path.join(__dirname,'../../output/creative-ai/brands',BRANDS[brand].id,'creative-direction.json')).replacesPreferences.includes(rule.id),'the brand\'s own direction file names the rule it replaces');
   assert.equal(mine[0].brandId,BRANDS[brand].id);assert.equal(mine[0].provenance.brandName,brand);assert.equal(mine[0].scope,'brand');
   assert.ok(mine[0].text.startsWith(rule.start));
   assert.ok(!theirs.some(t=>t.includes(rule.id)||t.includes(rule.start)),brand+' '+rule.name+' rule never in '+other(brand)+'\'s file');
  }
 }
});
const direction=brand=>require(path.join(__dirname,'../../output/creative-ai/brands',BRANDS[brand].id,'creative-direction.json'));
for(const brand of Object.keys(BRANDS)){
 test(brand+': a new design gets its own brand\'s look from its direction, never the retired rules or the other brand\'s',async t=>{
  const create=JobStore.prototype.create;t.after(()=>{JobStore.prototype.create=create;});
  // The saved brand memory as a new job pins it (the fixture's brand id stands in for the real one).
  JobStore.prototype.create=async function(...a){const job=await create.apply(this,a),s=saved(brand);job.preferenceMemory={version:1,brandId:job.intake.brandId,revision:s.revision,policy:'test',preferences:s.preferences.filter(p=>p.active).map(p=>({...p,brandId:job.intake.brandId}))};return job;};
  const {fixture,square}=require('./lean-marketing-fixture'),own=direction(brand),theirs=direction(other(brand));
  const f=await fixture(t,{brand,selection:[square(1)],direction:brandId=>({version:1,brandId,sha256:'f'.repeat(64),direction:{...own,brandId},range:null})});assert.equal(f.planError,null);
  const plan=f.calls.find(c=>c.kind==='lean-planning'),brief=f.records[0].prompt;
  for(const rule of BRANDS[brand].rules){assert.ok(!plan.input.brand.preferences.some(p=>p.text.startsWith(rule.start)),'the retired '+rule.name+' rule is not sent');assert.ok(!brief.includes(rule.start));}
  assert.ok(brief.includes(own.wardrobe),'the brief carries this brand\'s wardrobe');assert.ok(brief.includes(own.rooms),'and its room direction');
  assert.ok(!brief.includes(theirs.wardrobe)&&!brief.includes(theirs.rooms),'never '+other(brand)+'\'s wardrobe or rooms');
  for(const rule of BRANDS[other(brand)].rules)assert.ok(!brief.includes(rule.start),'never '+other(brand)+'\'s '+rule.name+' rule');
 });
}
