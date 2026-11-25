'use strict';
// Regression (25 Nov 2026, local website sale banners, Neha: "Yes, fix both"). Both failed planning before any picture:
//  - Duroflex Cresendo (creative-0b70f9f6): "Cresendo 3 Seater …\n20–31 Dec 2026" citing the product was refused for
//    "20, 31, dec, 2026" (the brief's own sale dates); the repair moved the offer and dates onto lines of their own and broke
//    the 3-block website-hero limit ("this plan has 5"). Its first answer also carried a decision "client-creative-direction-v1"
//    for the creativeDirection input section, which was refused as an unknown rule ID.
//  - Sleepyhead Sofa Kiki (creative-b4c073e1): "Sink into deep seats with Sofa Kiki" was refused for "sink, into, seats", the
//    repair "Choose deep-set seating with Sofa Kiki" for "choose".
// Now the brief's own offer words (offer, offer product, terms, offer dates) are supported on any line, plain words of use and
// invitation sit beside the product name, a fact's word counts in singular or plural, a decision named after an input section in
// another spelling is dropped, and the 3-block error says how to group lines. Claim words still need a fact. Fails before; no
// paid calls; both brands.
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./lean-marketing-fixture');
const PAGE={id:'custom_studio-web-banner',description:{name:'Website banner',formatId:'custom:studio-web-banner',dimensions:{width:1920,height:640}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}};
const OFFER={promotionMode:'Yes',offer:'Year-End Sale: Flat 20% off',offerSku:'',offerValidity:'Date range',offerStart:'2026-12-20',offerEnd:'2026-12-31',terms:'None'};
const brief=(name,offer=OFFER)=>'Website sales banner for the year-end sale on '+name+'.\n\nAsset-specific inputs: '+JSON.stringify({...offer,offerSku:name,websiteType:'Banner',brandedHost:'Yes'});
const CASES={Duroflex:{name:'Cresendo 3 Seater with LH Lounger Leatherette fabric - Golden Orange',fact:{id:'sku-fact-5',status:'supported',sourceIds:[],text:'7-way adjustable headrests'}},
 Sleepyhead:{name:'Sofa Kiki - 3 Seater Sofa (Fabric, Sapling Green)',fact:{id:'sku-fact-3',status:'supported',sourceIds:[],text:'The sofa has a sculpted bucket-seat build and deep-set seating.'}}};
const plan=(f,lines)=>fixture(f.t,{brand:f.brand,productName:f.c.name,brief:brief(f.c.name,f.offer),selection:[PAGE],facts:[f.c.fact],citeFacts:true,copyFor:(input)=>lines(input.product.id,f.c.fact.id),planEdit:f.edit});

for(const [brand,c] of Object.entries(CASES)){
 test(brand+': the brief\'s own sale dates may sit on the product-name line, so a 3-block sale banner plans',async t=>{
  const f=await plan({t,brand,c},(pid,fid)=>[{role:'headline',text:'Year-End Sale: Flat 20% off',factIds:[]},{role:'supporting',text:c.name.split(' - ')[0]+'\n20–31 Dec 2026',factIds:[pid,fid]},{role:'cta',text:'Shop now',factIds:[]}]);
  assert.equal(f.planError,null);
 });
 test(brand+': plain words of use sit beside the product name; a fact counts in its plural; claim words still need a fact',async t=>{
  const short=c.name.split(' - ')[0].split(' with ')[0];
  const ok=await plan({t,brand,c},(pid,fid)=>[{role:'headline',text:'Sink into deep seats with '+short,factIds:[pid,fid]},{role:'cta',text:'Shop now',factIds:[]}]);
  if(brand==='Duroflex')assert.match(String(ok.planError?.message),/words not in the product name or its cited facts: deep, seats/,'Cresendo\'s cited fact is about headrests, not seats');
  else assert.equal(ok.planError,null);
  const choose=await plan({t,brand,c},(pid,fid)=>[{role:'headline',text:'Choose and settle into '+short+' tonight',factIds:[pid,fid]},{role:'cta',text:'Shop now',factIds:[]}]);
  assert.equal(choose.planError,null);
  const claim=await plan({t,brand,c},(pid,fid)=>[{role:'headline',text:'The softest, coolest '+short,factIds:[pid,fid]},{role:'cta',text:'Shop now',factIds:[]}]);
  assert.match(String(claim.planError?.message),/words not in the product name or its cited facts: softest, coolest/,'claim words still need a cited fact');
 });
 test(brand+': offer words count only when the brief has a live offer',async t=>{
  const off=await plan({t,brand,c,offer:{...OFFER,promotionMode:'No'}},(pid)=>[{role:'headline',text:c.name.split(' - ')[0]+'\nFlat 20% off',factIds:[pid]},{role:'cta',text:'Shop now',factIds:[]}]);
  assert.match(String(off.planError?.message),/words not in the product name or its cited facts: flat, 20, off/);
 });
 test(brand+': a decision named after an input section in another spelling is dropped, not a planning failure',async t=>{
  const f=await plan({t,brand,c,edit:out=>out.guidanceDecisions.push({id:'client-product-scale-v1',decision:'apply',reason:'Planner note'},{id:'checklist_v1',decision:'apply',reason:'Planner note'})},(pid,fid)=>[{role:'headline',text:'Year-End Sale: Flat 20% off',factIds:[]},{role:'cta',text:'Shop now',factIds:[]}]);
  assert.equal(f.planError,null);
  const bad=await plan({t,brand,c,edit:out=>out.guidanceDecisions.push({id:'client-bleed-rule',decision:'apply',reason:'Invented'})},(pid,fid)=>[{role:'headline',text:'Year-End Sale: Flat 20% off',factIds:[]},{role:'cta',text:'Shop now',factIds:[]}]);
  assert.match(String(bad.planError?.message),/not rule IDs: client-bleed-rule/,'other unknown IDs still fail');
 });
 test(brand+': a banner with too many lines says how to group them',async t=>{
  const f=await plan({t,brand,c},(pid,fid)=>[{role:'headline',text:'Year-End Sale',factIds:[]},{role:'offer',text:'Flat 20% off',factIds:[]},{role:'dates',text:'20–31 Dec 2026',factIds:[]},{role:'cta',text:'Shop now',factIds:[]}]);
  assert.match(String(f.planError?.message),/at most three text blocks.*this plan has 4\. Each copy entry counts as one block: write lines that sit together as ONE entry with a line break/);
 });
}
