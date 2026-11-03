'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const moduleUnderTest=require('../../lib/creative-ai/treatment-knowledge/brief-evidence'),knowledge=require('../../lib/creative-ai/treatment-knowledge');
const {resolve}=require('../../lib/creative-ai/runtime/placements'),strategy=require('../../lib/creative-ai/marketing-strategist');
const fixture=require('../../lib/creative-ai/marketing-strategist/examples/input.json');
const briefs=['Offer: ₹25,000 for selected Queen only; valid 24–31 October. Terms apply.','Festive sale: 10% off selected SKUs. Excludes other promotions.','EMI: no-cost EMI for 6 months on the supplied bank cards only.','Bank offer: 5% cashback up to ₹1,500 on eligible cards.','Price: INR 19999 including the supplied taxes.','Expert quote: “Use the supplied words exactly.” — Named expert, client-supplied approval.'];
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': authored offer and expert proof become eligible source-bound facts without re-verification',()=>{
 for(const brief of briefs){const r=resolve({placementIds:['custom:studio-social-story']}),snapshot=knowledge.capture(r),input=structuredClone(fixture);input.assignment.productName=brand+' selected SKU';input.assignment.brief=brief;input.additionalSources.push({id:'user-brief',kind:'user',status:'available',label:'User-authored brief',reference:'user-supplied:brief',collectedAt:'2026-10-24T00:00:00Z'});input.assignment.formats=r.selections.map(s=>({id:s.id,label:s.description.name,channel:s.description.platform,specificationStatus:'supplied',constraints:[]}));const before=structuredClone(input),out=knowledge.apply(input,snapshot,r.selections);strategy.validateInput(out);const accepted=out.facts.find(f=>f.id.startsWith('client-brief-'));assert.ok(accepted,brief);assert.equal(accepted.text,brief);assert.deepEqual(accepted.sourceIds,['user-brief']);assert.ok(strategy.analyzeInput(out).eligibleFacts.some(f=>f.id===accepted.id));assert.deepEqual(input,before);assert.deepEqual(out.research,input.research);assert.equal(out.assignment.productName,before.assignment.productName);assert.deepEqual(knowledge.apply(out,snapshot,r.selections).facts,out.facts);}
});
test('no fabricated offers from a festive theme, negative instruction, hypothetical example or missing value',()=>{
 for(const text of ['Create a festive Story.','Do not offer 10% off.','Example: offer ₹100 off.','No offers, only a greeting.','Create an EMI visual with bank details later.'])assert.deepEqual(moduleUnderTest.extract(text),[]);
 assert.deepEqual(moduleUnderTest.extract('Offer: ₹100 off. '+('Long qualifier. '.repeat(160))),[],'never truncate terms to fit the schema');
});
test('historical treatment and unavailable brief sources do not acquire new client approval',()=>{
 const input={assignment:{brief:briefs[0]},facts:[],additionalSources:[{id:'user-brief',kind:'user',status:'unavailable'}]},snapshot={packs:[{rules:[{id:'client-brief-source-authority',tier:'contract'}]}]};assert.deepEqual(moduleUnderTest.apply(input,snapshot),input);input.additionalSources[0].status='available';assert.deepEqual(moduleUnderTest.apply(input,{packs:[]}),input);
});
