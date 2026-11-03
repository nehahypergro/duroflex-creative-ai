'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const library=require('../../lib/creative-ai/treatment-knowledge/format-playbooks');
const knowledge=require('../../lib/creative-ai/treatment-knowledge');
const {resolve}=require('../../lib/creative-ai/runtime/placements');
const strategy=require('../../lib/creative-ai/marketing-strategist');
const fixture=require('../../lib/creative-ai/marketing-strategist/examples/input.json');
const captured=id=>{const resolved=resolve({placementIds:[id]});return {...resolved,snapshot:knowledge.capture(resolved)};};
test('authored library preserves evidence limitations and validates every route reference',()=>{
 const data=library.load(),catalog=require('../../lib/creative-ai/placement-knowledge').loadCatalog(),presets=require('../../lib/creative-ai/runtime/output-formats').presets;
 assert.equal(data.packs.length,73);assert.equal(data.packs.filter(p=>p.id.startsWith('amazon-image-')).length,14);
 for(const p of data.packs){for(const id of p.selectors.profileIds)assert.ok(catalog.profiles.some(p=>p.id===id),id);for(const id of p.selectors.formatIds)assert.ok(presets.some(p=>p.id===id),id);}
 const story=library.select(data,{pin:{profileId:'custom:studio-social-story'},description:{}})[0];
 assert.ok(story.rules.every(r=>r.tier==='recommendation'));
 assert.ok(story.sources.some(s=>s.accessStatus==='secondary-content'));
 assert.ok(story.sources.some(s=>s.accessStatus==='unavailable'));
 const invalid=structuredClone(data);invalid.packs[0].sourceIds=['fabricated'];assert.throws(()=>library.validate(invalid),/Invalid format/);
});
test('same canvas does not produce the same creative treatment across feed, messaging and commerce',()=>{
 const expected=[['custom:studio-social-square','social-feed'],['custom:studio-social-story','social-story'],['custom:studio-linkedin-square','linkedin-feed'],['custom:studio-whatsapp-card','whatsapp'],['custom:studio-commerce-gallery','product-gallery'],['custom:studio-commerce-comparison','comparison'],['custom:studio-web-banner','website-banner'],['custom:studio-email-banner','email'],['merchant-primary','marketplace-main'],['commerce-enhanced-product-content','aplus-basic'],['google-pmax','responsive-assets'],['linkedin-document','linkedin-document']];
 for(const [id,pack] of expected){const {snapshot,selections}=captured(id);assert.deepEqual(snapshot.placements[0].treatmentIds,[pack,'format-common']);const text=knowledge.constraints(snapshot,selections[0].id).join('\n');assert.ok(text.includes(pack+'-purpose'));assert.ok(text.includes(pack+'-checks'));}
});
test('expanded carousel and print children retain set-level treatment and isolated selected context',()=>{
 for(const [id,pack] of [['custom:studio-carousel-square','social-carousel'],['custom:studio-print-brochure-trifold','print-handout'],['custom:studio-print-booklet-a5','catalogue']]){
  const {snapshot}=captured(id);assert.ok(snapshot.placements.length>1);assert.ok(snapshot.placements.every(p=>p.treatmentIds.includes(pack)));
  const single=knowledge.forPlacement(snapshot,snapshot.placements[0].placementId);assert.equal(single.placements.length,1);assert.deepEqual(single.packs.map(p=>p.id),['format-common',pack]);
 }
});
test('exact recipe identities match; brief keywords and invented similar identities cannot choose a pack',()=>{
 const data=library.load();
 for(const [id,expected]of [['custom:recipe-product-image-01','product-gallery'],['custom:recipe-marketplace-module-03','aplus-basic'],['custom:client-linkedin-1080x1350','linkedin-feed']])assert.equal(library.select(data,{pin:{profileId:id},description:{}})[0].id,expected);
 assert.deepEqual(library.select(data,{pin:{profileId:'custom:unknown-square'},description:{name:'Instagram Story',width:1080,height:1920,brief:'RCS'}}),[]);
 assert.deepEqual(library.select(data,{pin:{profileId:'custom:recipe-marketplace-module-01-spoof'},description:{}}),[]);
 const conflict=structuredClone(data);conflict.packs[1].selectors.profilePatterns=['^custom:studio-social-square$'];assert.throws(()=>library.select(conflict,{pin:{profileId:'custom:studio-social-square'},description:{}}),/Ambiguous/);
});
test('every Studio preset has a bounded selected playbook, including multi-page formats',()=>{
 for(const preset of require('../../lib/creative-ai/runtime/output-formats').presets){
  const {snapshot,selections}=captured(preset.id);
  const input=structuredClone(fixture);input.assignment.formats=selections.map(s=>({id:s.id,label:s.description.name,channel:s.description.platform,specificationStatus:'supplied',constraints:[]}));
  const enriched=knowledge.apply(input,snapshot,selections);strategy.validateInput(enriched);
  for(const p of snapshot.placements){assert.equal(p.treatmentCoverage,'authored-guidance',preset.id);assert.ok(knowledge.constraints(snapshot,p.placementId).length<100);}
 }
});
test('old snapshots remain valid without new metadata; rules are shared but brand evidence is untouched',()=>{
 const {snapshot,selections}=captured('custom:studio-social-story');
 const old=structuredClone(snapshot);old.packs=[];old.placements.forEach(p=>{p.treatmentIds=[];delete p.treatmentCoverage;delete p.treatmentLimitations;});delete old.hash;old.hash=crypto.createHash('sha256').update(JSON.stringify(old)).digest('hex');
 assert.deepEqual(knowledge.validate(old,selections),old);
 for(const brand of ['Duroflex','Sleepyhead']){const input=structuredClone(fixture);input.assignment.productName=brand+' isolated SKU';input.assignment.formats=selections.map(s=>({id:s.id,label:s.description.name,channel:s.description.platform,specificationStatus:'supplied',constraints:[]}));
 const enriched=knowledge.apply(input,snapshot,selections);assert.equal(enriched.assignment.productName,input.assignment.productName);assert.deepEqual(enriched.research,input.research);assert.deepEqual(enriched.facts,input.facts);}
 const tampered=structuredClone(snapshot);tampered.packs[1].rules[0].statement='Changed later';assert.throws(()=>knowledge.validate(tampered,selections),/hash/);
});
test('unmapped destination is explicit and cannot claim a renderer or a complete family',()=>{
 const data=library.load();for(const id of ['aplus-premium','press-imagery','youtube-community','adaptation']){const p=data.packs.find(p=>p.id===id);assert.ok(p);assert.ok(Object.values(p.selectors).every(a=>a.length===0));}
 const r=resolve({placementIds:['custom:unmapped'],customProfiles:[{id:'custom:unmapped',name:'RCS test',platform:'RCS',publisher:'client',placement:'card',assetType:'static',canvas:{width:1080,height:1080,unit:'px'},exportContract:{formats:['png']},displayContext:'Supplied fixture'}]});
 const s=knowledge.capture(r);assert.equal(s.placements[0].treatmentCoverage,'placement-rules-only');assert.deepEqual(s.placements[0].treatmentIds,['format-common']);assert.ok(knowledge.constraints(s,s.placements[0].placementId).some(x=>x.includes('No dedicated treatment')));
});
test('real strategist adapter sees format-specific strategy, copy, scene, action and review guidance',async()=>{
 const r=resolve({placementIds:['custom:studio-social-square','custom:studio-social-story','custom:studio-linkedin-post']}),snapshot=knowledge.capture(r),input=structuredClone(fixture);
 input.assignment.formats=r.selections.map(s=>({id:s.id,label:s.description.name,channel:s.description.platform,specificationStatus:'supplied',constraints:[]}));
 await assert.rejects(()=>require('../../lib/creative-ai/runtime/agents').strategist(knowledge.apply(input,snapshot,r.selections),{reason:async req=>{
 const formats=req.wire.input.assignment.assignment.formats;for(const [i,id] of ['social-feed','social-story','linkedin-feed'].entries())for(const f of ['purpose','copy','visual','action','checks'])assert.ok(formats[i].constraints.some(x=>x.includes(id+'-'+f)));
 throw Error('Stopped before provider dispatch');
 }},{}),/Stopped before provider dispatch/);
});
test('retail and print select a dedicated treatment for the exact physical format',()=>{
 for(const [slug,token] of [['standee','standee'],['wobbler','wobbler'],['window-poster','window'],['wall-graphic','wall'],['price-board','price'],['brochure-trifold','letter-fold'],['brochure-zfold','z-fold']]){
  const {snapshot}=captured('custom:studio-print-'+slug),pack=snapshot.packs.find(p=>p.id!=='format-common');assert.equal(pack.selectedFormat,token);
  assert.ok(pack.rules.every(r=>r.tier==='recommendation'));
  assert.match(pack.rules.find(r=>r.id.endsWith('-visual')).statement,/./);
 }
});
test('specific format guidance cannot overwrite general rules or select by brief words',()=>{
 const data=library.load(),standee=library.select(data,{pin:{profileId:'custom:studio-print-standee-page-01'},description:{formatId:'custom:studio-print-standee',name:'wobbler'}})[0];assert.equal(standee.selectedFormat,'standee');
 assert.ok(!standee.rules.some(r=>r.statement.includes('adhesive arm')));
 const bad=structuredClone(data);bad.packs.find(p=>p.id==='retail-distance').formatTreatments['custom:unrelated']={id:'wrong',treatment:{visual:'Wrong'}};assert.throws(()=>library.validate(bad),/format treatment selector/i);
});

test('both brands: selected retail treatment reaches the real strategy adapter and downstream context',async()=>{
 for(const brand of ['Duroflex','Sleepyhead'])for(const slug of ['standee','wobbler','window-poster','wall-graphic','price-board','brochure-trifold','brochure-zfold']){
 const r=resolve({placementIds:['custom:studio-print-'+slug]}),snapshot=knowledge.capture(r),input=structuredClone(fixture);
 input.assignment.productName=brand+' isolated SKU';input.assignment.formats=r.selections.map(s=>({id:s.id,label:s.description.name,channel:s.description.platform,specificationStatus:'supplied',constraints:[]}));
 const pack=snapshot.packs.find(p=>p.selectedFormat);assert.ok(pack);
 await assert.rejects(()=>require('../../lib/creative-ai/runtime/agents').strategist(knowledge.apply(input,snapshot,r.selections),{reason:async req=>{
 const formats=req.wire.input.assignment.assignment.formats;assert.ok(formats.every(f=>f.constraints.some(c=>c.includes(pack.id+'-visual'))));throw Error('Checked without dispatch');}},{}),/Checked without dispatch/);
 assert.ok(JSON.stringify(knowledge.context(snapshot)).includes(pack.selectedFormat));assert.ok(JSON.stringify(knowledge.forPlacement(snapshot,r.selections[0].id)).includes(pack.rules.find(x=>x.id.endsWith('-visual')).statement));
 }
});
