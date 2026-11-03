'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const strategy=require('../../lib/creative-ai/marketing-strategist');
const treatment=require('../../lib/creative-ai/treatment-knowledge');
const {resolve}=require('../../lib/creative-ai/runtime/placements');
const fixture=require('../../lib/creative-ai/marketing-strategist/examples/input.json');

for(const brand of ['Duroflex','Sleepyhead'])test(brand+': current scope reaches actual strategy dispatch with authored offer intact',async()=>{
 const selected=resolve({placementIds:['custom:studio-pdp-pack']});
 const original=structuredClone(fixture);
 original.assignment.productName=brand+' fixture SKU';
 original.assignment.brief='Festive sale: ₹25,000; selected Queen only; valid 24–31 October. Website price must not replace this offer.';
 original.assignment.formats=selected.selections.map(s=>({id:s.id,label:s.description.name,channel:s.description.platform,specificationStatus:'supplied',constraints:[]}));
 const saved=structuredClone(original),snapshot=treatment.capture(selected);
 const input=treatment.apply(original,snapshot,selected.selections);
 strategy.validateInput(input);
 await assert.rejects(()=>require('../../lib/creative-ai/runtime/agents').strategist(input,{reason:async request=>{
  const wire=JSON.stringify(request.wire);
  assert.match(wire,/Campaign master key visual is removed/);
  assert.match(wire,/Do not reconstruct/);
  assert.match(wire,/pdp-original-website-technology/);
  assert.match(wire,/pdp-brief-supplied-offers/);
  assert.match(wire,/pdp-optional-slot-fallback/);
  assert.match(wire,/omit unresolved warranty\/replacement claims/i);
  assert.match(wire,/exterior product view/i);
  assert.match(wire,/pdp-test-source-authority/);
  assert.match(wire,/current brief as client-approved source truth/);
  assert.ok(wire.includes(original.assignment.brief));
  throw Error('Intercepted before paid dispatch');
 }},{}),/Intercepted before paid dispatch/);
 assert.deepEqual(original,saved);
 assert.equal(treatment.forPlacement(snapshot,selected.selections[6].id).packs[0].rules.some(r=>r.id==='pdp-original-website-technology'),true);
});

test('legacy pinned treatment remains unchanged by current scope decisions',()=>{
 const selected=resolve({placementIds:['custom:studio-pdp-pack']}),snapshot=treatment.capture(selected);
 snapshot.packs[0].rules=snapshot.packs[0].rules.filter(r=>!r.id.startsWith('pdp-original-website')&&!r.id.startsWith('pdp-brief-supplied'));
 snapshot.packs[0].executionInstructions='Historical saved policy';
 const {hash,...data}=snapshot;
 snapshot.hash=require('node:crypto').createHash('sha256').update(JSON.stringify(data)).digest('hex');
 assert.deepEqual(treatment.forJob({selection:selected.selections,treatmentKnowledgeVersion:1,treatmentKnowledge:snapshot}),snapshot);
 assert.equal(treatment.execution(snapshot),'Historical saved policy');
});
