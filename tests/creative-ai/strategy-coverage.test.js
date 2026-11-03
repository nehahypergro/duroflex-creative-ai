'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../../public/creative-ai/studio-model');
const placements=require('../../lib/creative-ai/runtime/placements');
const knowledge=require('../../lib/creative-ai/treatment-knowledge');
const library=require('../../lib/creative-ai/treatment-knowledge/format-playbooks');
const fixture=require('../../lib/creative-ai/marketing-strategist/examples/input.json');
const expected={2:'technology-visual',3:'offer-creative',4:'proof-claim',10:'local-store',12:'partner-creative',15:'editorial-cover'};
function captureProfile(profile){const r=placements.resolve({placementIds:profile.placementIds||[profile.placementId],customProfiles:profile.customProfiles});return {...r,snapshot:knowledge.capture(r)};}
for(const brand of ['Duroflex','Sleepyhead'])test(brand+' exact asset identity reaches strategy and downstream context',async()=>{
 for(const [featureId,packId] of Object.entries(expected)){
  const d={brandId:brand,focus:'product',outputs:[{...M.output(Number(featureId)),...(Number(featureId)===15?{formatId:"custom",width:1200,height:628}:{})}]},before=JSON.stringify(d),profile=M.generationProfile(d);
  assert.ok(profile);const {selections,snapshot}=captureProfile(profile);assert.equal(JSON.stringify(d),before);
  assert.ok(snapshot.placements.every(p=>p.treatmentIds.includes(packId)),featureId+' must receive '+packId);
  const input=structuredClone(fixture);input.assignment.productName=brand+' scoped SKU';input.assignment.formats=selections.map(s=>({id:s.id,label:s.description.name,channel:s.description.platform,specificationStatus:'supplied',constraints:[]}));
  const enriched=knowledge.apply(input,snapshot,selections);assert.deepEqual(enriched.facts,input.facts);assert.deepEqual(enriched.research,input.research);
  await assert.rejects(()=>require('../../lib/creative-ai/runtime/agents').strategist(enriched,{reason:async req=>{const wire=req.wire.input.assignment.assignment;assert.equal(wire.productName,input.assignment.productName);assert.ok(wire.formats[0].constraints.some(c=>c.includes(packId+'-purpose')));throw Error('Offline: provider not dispatched');}},{}),/Offline: provider not dispatched/);
  const context=knowledge.forPlacement(snapshot,selections[0].id);assert.ok(context.packs.find(p=>p.id===packId).rules.some(r=>r.id.endsWith('-checks')));
 }
});
test('desktop and mobile website/email slots retain authored strategy',()=>{
 for(const channel of ['website','email']){
  const id='custom:client-'+channel+'-mobile-600x800';const {snapshot}=captureProfile({placementId:id,customProfiles:[{id,name:'Mobile',platform:channel,publisher:'client',placement:'mobile-image',assetType:'static',canvas:{width:600,height:800,unit:'px'},exportContract:{formats:['png']},displayContext:'Supplied fixture'}]});
  assert.equal(snapshot.placements[0].treatmentCoverage,'authored-guidance');
 }
});
test('multiple specific treatments in one family stay isolated regardless of order',()=>{
 for(const slugs of [['standee','wall-graphic'],['wall-graphic','standee']]){
  const r=placements.resolve({placementIds:slugs.map(s=>'custom:studio-print-'+s)}),snapshot=knowledge.capture(r);
  for(const [i,slug]of slugs.entries()){
   const context=knowledge.forPlacement(snapshot,r.selections[i].id),pack=context.packs.find(p=>p.selectedFormat);
   assert.equal(pack.selectedFormat,slug==='standee'?'standee':'wall');
   assert.equal(context.packs.filter(p=>p.selectedFormat).length,1);
  }
  assert.equal(new Set(snapshot.packs.flatMap(p=>p.rules.map(r=>r.id))).size,snapshot.packs.flatMap(p=>p.rules).length);
  knowledge.validate(snapshot,r.selections);
 }
});
test('every native catalog destination has explicit guidance without fuzzy routing',()=>{
 const data=library.load(),catalog=require('../../lib/creative-ai/placement-knowledge').loadCatalog();
 for(const p of catalog.profiles)assert.equal(library.select(data,{pin:{profileId:p.id},description:{}}).length,1,p.id);
 assert.deepEqual(library.select(data,{pin:{profileId:'custom:unrecognised'},description:{name:'Leadership and Reddit offer'}}),[]);
});
test('prepared catalogue guidance is complete but cannot silently enable a route',()=>{
 const data=library.load();
 for(const id of ['leadership-portrait','hiring-visual','employer-branding','award-milestone','employee-sharing','packaging-still','internal-portal','article-illustration','training-reference','comparison-battlecard','product-demo']){
  const pack=data.packs.find(p=>p.id===id);assert.ok(pack,id);assert.ok(Object.values(pack.selectors).every(a=>a.length===0));
  for(const key of ['purpose','copy','visual','action','sequence','inputs','checks','avoid'])assert.ok(pack.treatment[key].length>30,id+key);
 }
 for(const id of [16,36,37,38,39,40,41,42])assert.equal(M.generationProfile({focus:'product',outputs:[M.output(id)]}),null);
});
test('shared text guidance does not force copy into image-only formats',()=>{
 const data=library.load(),rule=data.commonRules.find(r=>r.id==='editable-text-design-handoff');
 assert.equal(rule.tier,'recommendation');assert.match(rule.statement,/without added campaign text/);assert.match(rule.statement,/Image-only work may have no overlay/);
});
test('campaign context retains both scoped treatments while duplicate same-format children deduplicate',()=>{
 const r=placements.resolve({placementIds:['custom:studio-print-brochure-trifold','custom:studio-print-brochure-zfold']}),snapshot=knowledge.capture(r),context=knowledge.context(snapshot);
 assert.equal(context.packs.filter(p=>p.familyId==='print-handout').length,2);
 for(const p of snapshot.placements){const selected=knowledge.forPlacement(snapshot,p.placementId);assert.equal(selected.packs.filter(p=>p.familyId==='print-handout').length,1);}
 const old=placements.resolve({placementIds:['custom:studio-print-brochure-trifold']}),single=knowledge.capture(old);
 assert.equal(single.packs.filter(p=>p.id==='print-handout').length,1);
});
test('assignment action preserves supplied destinations rather than injecting a product sales CTA',()=>{
 const {recipeIntent}=require('../../lib/creative-ai/runtime/studio-generation');
 for(const featureId of [3,10,15]){const intent=recipeIntent({featureId},{destination:'https://example.com/exact-destination',localCTA:'Visit this store'});assert.equal(intent.landingPageUrl,'https://example.com/exact-destination');}
 for(const featureId of [2,4,12])assert.equal(recipeIntent({featureId},{}).landingPageUrl,undefined);
 assert.match(recipeIntent({featureId:15},{}).desiredAction,/article/);assert.equal(recipeIntent({featureId:1},{}),null);
});
test('partner strategy readiness does not claim its attachment workflow is complete',async()=>{
 const d={focus:'product',outputs:[{...M.output(12),staticValues:{partner:'Supplied partner',partnerAsset:'Supplied logo name',lockup:'Lead brand first',reviewer:'Partner owner'}}]};
 await assert.rejects(()=>require('../../lib/creative-ai/runtime/studio-generation').prepare({},d),/attached partner asset and lockup/);
});
