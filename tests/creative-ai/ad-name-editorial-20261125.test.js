'use strict';
// Regression (client feedback for Duroflex and Sleepyhead, relayed by Neha on 25 Nov 2026):
//  1. "No need of writing full product name or mention varaint name (example 6.8 etc)". The local variety batch printed
//     "Duropedic Airboost 6.8 / Arctic Ice Mattress", "Quboid Arctic Ice / Qube Cell Technology Mattress", "Cocoon Cool Grey
//     Fabric 3 Seater Sofa" and "Sofa Yolo 3+2 Seater Set": the short name only cut at a dash or bracket. New jobs pin
//     adNameVersion 1: ad pages name the product only by its ad name, and the plan check refuses a variant after it.
//  2. "Direct it like a lifestyle/fashion brand - editorial shoot" (both brands), and for Duroflex, with 29 reference pictures,
//     real-looking models with imperfections ("not ai-ish"), ethnic wear for festive pictures and outfits chosen for the use
//     of the picture. Each brand's own file holds its shoot line (and Duroflex its models line); both reach the planner and
//     the image brief.
// Both brands; fails before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const mr=require('../../lib/creative-ai/lean/marketing-rules'),cd=require('../../lib/creative-ai/lean/creative-direction');
const {fixture,square}=require('./lean-marketing-fixture');
const root=path.resolve(__dirname,'../..');
const IDS={Duroflex:'brand-1923d633-e03e-44cc-84b2-bbfb5c152710',Sleepyhead:'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'};
const raw=brand=>JSON.parse(fs.readFileSync(path.join(root,'output/creative-ai/brands',IDS[brand],'creative-direction.json'),'utf8'));
const pinned=(brand,edit=d=>d)=>brandId=>({version:1,brandId,sha256:'f'.repeat(64),direction:edit({...raw(brand),brandId}),range:null,at:'2026-11-25T00:00:00.000Z'});
const planning=f=>f.calls.find(c=>c.kind==='lean-planning'),images=f=>f.calls.filter(c=>c.kind==='image');

test('new lean jobs pin the ad name; the snapshot keeps it',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.adNameVersion,1);assert.equal(pc.snapshot(c).adNameVersion,1);assert.equal(pc.snapshot({}).adNameVersion,undefined);
});
test('ad names of saved products in both brands: the name without number, model code, colour, size, seats or type',()=>{
 const want={
  'Duropedic Airboost 6.8 Arctic Ice Mattress | 1 lakh+ Airknit fibres with latex and adjustable firmness | 100 nights trial':'Duropedic Airboost',
  'Quboid Arctic Ice Qube Cell Technology Mattress':'Quboid','Cocoon Cool Grey Fabric 3 Seater Sofa':'Cocoon','LiveIn 100% Latex Mattress':'LiveIn',
  'Octave 3 Seater Water & Stain Repellent Fabric - Honey':'Octave','Avalon Elite mov.E Yellow Fabric 3 Seater Sofa':'Avalon Elite',
  'Cove Simply Taupe Leatherette + Feather Brown Fabric 1 Seater Sofa':'Cove','Cresendo 3 Seater with LH Lounger Leatherette fabric - Golden Orange':'Cresendo',
  'Spine Contour Pillow':'Spine Contour Pillow','Memory Foam Topper':'Memory Foam Topper','Duro Safe - Waterproof Mattress Protector':'Duro Safe',
  'Sofa Yolo - 3+2 Seater Sofa Set (Fabric, Sesame Grey)':'Sofa Yolo','Recliner RX6 - Single Seater Fabric Recliner (Lilly Pink)':'Recliner RX6',
  'Original - 3 Layered BodyIQ Orthopedic Memory Foam Mattress - Grey':'Original','Flip - Dual Sided Foam Mattress with Firm & Soft Sides - Grey':'Flip',
  'Napster Sofa Cum Bed 3 seater (Fabric, Indigo Blue)':'Napster Sofa','Napster Mini Mattress':'Napster Mini Mattress','Sofa Drip Pro - 3 Seater Sofa (Fabric, Coco Brown)':'Sofa Drip Pro'};
 for(const [name,ad] of Object.entries(want))assert.equal(mr.adName(name),ad,name);
});
test('the check: a variant after the name or anywhere as a model number or colour name; punctuation ends the name; offers and cited facts may carry them',()=>{
 const air=mr.adNameData({name:'Duropedic Airboost 6.8 Arctic Ice Mattress',variant:{name:'Queen / 72 x 60 (183 cm x 152 cm) / 8 (20.3 cm)'}});
 assert.match(mr.adNameProblem('Duropedic Airboost 6.8\nArctic Ice Mattress',air),/model number "6\.8"/);assert.match(mr.adNameProblem('Duropedic Airboost Queen',air),/drop "queen" after it/);
 assert.equal(mr.adNameProblem('Explore Airboost',air),null);assert.equal(mr.adNameProblem('Sleep cool on Duropedic Airboost',air),null);
 assert.equal(mr.adNameProblem('Airboost 6.8: Flat 20% off',air,['Airboost 6.8: Flat 20% off']),null,'the brief\'s exact offer wording');
 assert.equal(mr.adNameProblem('Arctic Ice cover keeps you cool',air,[],'Arctic Ice fabric cover for cooling'),null,'a cited fact names it');
 const q=mr.adNameData({name:'Quboid Arctic Ice Qube Cell Technology Mattress',variant:{name:'Default Title'}});
 assert.equal(mr.adNameProblem('Quboid: Qube Cell Technology',q),null);assert.match(mr.adNameProblem('Quboid Qube Cell Technology Mattress',q),/drop "qube cell technology" after it/);
 const yolo=mr.adNameData({name:'Sofa Yolo - 3+2 Seater Sofa Set (Fabric, Sesame Grey)',variant:{name:'Default Title'}});
 assert.match(mr.adNameProblem('Sofa Yolo in Sesame Grey',yolo),/colour name "sesame grey"/);assert.equal(mr.adNameProblem('Sink into the Sofa Yolo sofa',yolo),null);
});
const LIVE={Duroflex:{name:'Duropedic Airboost 6.8 Arctic Ice Mattress | 1 lakh+ Airknit fibres with latex and adjustable firmness | 100 nights trial',bad:'Duropedic Airboost 6.8\nArctic Ice Mattress',why:/name the product only as "Duropedic Airboost" \(client direction: no full product name and no variant name\); drop the model number "6\.8"/,good:'Duropedic Airboost'},
 Sleepyhead:{name:'Sofa Yolo - 3+2 Seater Sofa Set (Fabric, Sesame Grey)',bad:'Sofa Yolo 3+2 Seater Set',why:/name the product only as "Sofa Yolo" \(client direction: no full product name and no variant name\); drop "3\+2 seater set" after it/,good:'Sofa Yolo'}};
const named=text=>(input)=>[{role:'headline',text:'Lift a cushion, lean back',factIds:[]},{role:'product name',text,factIds:[input.product.id]}];
const MARKET={id:'pdp-1',description:{name:'Marketplace product images · Key benefit',formatId:'custom:studio-marketplace-set',dimensions:{width:1600,height:1600}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}};
for(const brand of ['Duroflex','Sleepyhead']){
 const c=LIVE[brand];
 test(brand+': the planner is told the ad name; the live name with its variant is refused; the ad name plans',async t=>{
  const bad=await fixture(t,{brand,productName:c.name,selection:[square(1)],copyFor:named(c.bad)});
  assert.match(String(bad.planError?.message),c.why);
  const input=planning(bad).input,rule=input.format.guidance.mandatory.find(r=>r.id===mr.COPY_ID).text;
  assert.match(rule,new RegExp('PRODUCT NAME \\(client direction, 25 Nov 2026: no full product name and no variant name\\)\\. Name the product only as "'+c.good.replace(/[+]/g,'\\+')+'"'));
  assert.doesNotMatch(rule,/you may add the colour or size/);assert.equal(input.marketing.adName.adName,c.good);
  const good=await fixture(t,{brand,productName:c.name,selection:[square(1)],copyFor:named(c.good)});assert.equal(good.planError,null);
 });
 test(brand+': marketplace pages may keep the listing name; jobs admitted before the pin keep the old rule',async t=>{
  const market=await fixture(t,{brand,productName:c.name,selection:[MARKET],copyFor:named(c.bad)});assert.equal(market.planError,null);
  const old=await fixture(t,{brand,productName:c.name,selection:[square(1)],copyFor:named(c.bad),pinned:false,unpin:['adNameVersion']});
  assert.doesNotMatch(String(old.planError?.message||''),/client direction: no full product name/);assert.equal(planning(old).input.marketing.adName,undefined);
 });
}

// ---- Editorial shoot (both brands) and Duroflex's models ----
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': the brand\'s own shoot line reaches the planner and the image brief',async t=>{
  const d=raw(brand);assert.match(d.shoot,/editorial/);
  const f=await fixture(t,{brand,selection:[square(1)],direction:pinned(brand)});assert.equal(f.planError,null);await f.run();
  const cdIn=planning(f).input.creativeDirection;assert.equal(cdIn.brief.shoot,d.shoot);assert.match(cdIn.rule,/PHOTOGRAPHY: brief\.shoot\. Plan every page as one frame of that shoot/);
  assert.ok(images(f)[0].prompt.includes('PHOTOGRAPHY: '+d.shoot),'the image brief carries the shoot line word for word');
 });
}
test('Duroflex: real-looking models, outfits by use and festive ethnic wear reach the planner and the image brief; Sleepyhead\'s file has none of its words',async t=>{
 const d=raw('Duroflex'),s=raw('Sleepyhead');
 assert.match(d.models,/never AI-perfect/);assert.match(d.models,/pores/);assert.match(d.wardrobe,/Festive briefs[^.]*: Indian ethnic wear: a silk saree/);assert.match(d.wardrobe,/^Dress each person for the picture's moment and use/);
 assert.match(d.rooms,/limewash or plaster walls/);assert.match(d.pop,/oxblood floor lamp/);
 assert.equal(s.models,undefined);
 for(const k of ['shoot','models','wardrobe','rooms','pop'])for(const sentence of String(d[k]||'').split(/(?<=\.)\s+/).filter(x=>x.length>40))assert.ok(!JSON.stringify(s).includes(sentence),'Sleepyhead never carries Duroflex wording: '+sentence);
 const f=await fixture(t,{brand:'Duroflex',selection:[square(1)],direction:pinned('Duroflex')});assert.equal(f.planError,null);await f.run();
 const cdIn=planning(f).input.creativeDirection;assert.equal(cdIn.brief.models,d.models);assert.match(cdIn.rule,/they look like real people as brief\.models describes; .*choosing each outfit for this picture's moment and use/);
 const prompt=images(f)[0].prompt;assert.ok(prompt.includes(d.models),'the PEOPLE line names the models');assert.ok(prompt.includes('Wardrobe: '+d.wardrobe));
 const sh=await fixture(t,{brand:'Sleepyhead',selection:[square(1)],direction:pinned('Sleepyhead')});await sh.run();
 assert.equal(planning(sh).input.creativeDirection.brief.models,undefined);assert.doesNotMatch(planning(sh).input.creativeDirection.rule,/brief\.models/);
});
test('a direction pinned before the shoot and models lines keeps its planner input, image brief and allowance',async t=>{
 for(const brand of ['Duroflex','Sleepyhead']){
  const f=await fixture(t,{brand,selection:[square(1)],direction:pinned(brand,d=>{const {shoot,models,...rest}=d;return rest;})});assert.equal(f.planError,null);await f.run();
  const input=planning(f).input;assert.equal(input.creativeDirection.brief.shoot,undefined);assert.doesNotMatch(input.creativeDirection.rule,/PHOTOGRAPHY/);
  assert.equal(cd.briefAllowance(input),4000);assert.doesNotMatch(images(f)[0].prompt,/PHOTOGRAPHY:/);
 }
 assert.throws(()=>cd.validateFile({...raw('Duroflex'),shoot:'x'.repeat(1300)},IDS.Duroflex),/shoot is one paragraph/);
 assert.equal(cd.briefAllowance({creativeDirection:{brief:{shoot:'a',models:'b'}}}),7000);
});
