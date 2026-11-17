'use strict';
// Regression (18 Nov 2026, Neha: "amazon marketplace or anything that is huge is not getting ready"): every picture of a
// 12-image product-page set was asked to judge three gallery-wide rules (pdp-distinct-purpose, pdp-review-boundary,
// pdp-test-source-authority). One picture cannot show them, so they came back unable_to_verify on 23, 19 and 2 of 24 saved
// images and no product-page set was ever fully checked. New jobs pin setRuleCheckVersion 1: those rules stay in planning
// and are listed as not judged per picture. Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config'),visual=require('../../lib/creative-ai/lean/visual-review'),tk=require('../../lib/creative-ai/treatment-knowledge');
const {brands,fixture}=require('./lean-marketing-fixture');
const SET=['pdp-distinct-purpose','pdp-review-boundary','pdp-test-source-authority'];
const slot=i=>({id:'custom_studio-pdp-pack-slot-0'+i,description:{name:'Product page image '+i,formatId:'custom:studio-pdp-pack-slot-0'+i,dimensions:{width:1600,height:1600},pdp:{key:i===1?'hero':'detail',name:'Slot '+i,readingClass:'commerce-photo',direction:'Show the product.',requiresFacts:false,index:i,count:2,contractVersion:2,id:'custom:studio-pdp-pack'}},jobInputs:{logoPolicy:{treatment:'omit',reason:'Gallery image'}}});
const selection=[slot(1),slot(2)];
const treatment={version:1,placements:selection.map(s=>({placementId:s.id,treatmentIds:['owned-pdp'],rules:[]})),packs:[tk.loadPack?tk.loadPack('owned-pdp'):require('../../lib/creative-ai/treatment-knowledge/owned-pdp.json')],limits:'test'};
const heads=['Legs that lift the look','Arms that angle outward'];
const copyFor=(input,p,i)=>[{role:'headline',text:heads[i],factIds:[]}];
// The checker cannot judge a gallery-wide rule from one picture.
const unable=out=>{for(const c of out.checks)if(SET.some(id=>c.id==='placement-'+id))Object.assign(c,{result:'unable_to_verify',evidence:'One image cannot show the whole gallery.'});};

test('new lean jobs pin set-level rules v1 and the snapshot keeps it',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.setRuleCheckVersion,1);assert.equal(pc.snapshot(c).setRuleCheckVersion,1);assert.equal(pc.snapshot({}).setRuleCheckVersion,undefined);
});
for(const brand of brands){
 test(brand+': gallery-wide product-page rules are planned but not judged on each picture, so the set can be fully checked',async t=>{
  const f=await fixture(t,{brand,selection,copyFor,treatment,reviewEdit:unable});assert.equal(f.planError,null);
  const plan=f.calls.find(c=>c.kind==='lean-planning');for(const id of SET)assert.ok(plan.input.format.guidance.mandatory.some(r=>r.id===id),id+' still reaches planning');
  for(const r of f.records){const ids=r.reviewContract.requirements.map(x=>x.id);for(const id of SET){assert.ok(!ids.includes('placement-'+id),id+' not judged per picture');assert.ok(r.notVisuallyVerifiable.some(x=>x.id==='placement-'+id&&x.method==='whole-set'),id+' listed');}
   assert.ok(ids.includes('placement-pdp-gallery-context'),'picture-level product-page rules are still judged');assert.ok(ids.includes('slot-purpose'));assert.equal(r.setRuleCheckVersion,1);}
  await f.run();const results=(await f.read()).results;assert.equal(results.length,2);
  for(const r of results){assert.equal(r.ready,true);assert.equal(r.qualityVerified,true);assert.deepEqual(r.visualReview.unverified,[]);}
 });
 test(brand+': jobs admitted before the pin keep judging those rules on each picture',async t=>{
  const f=await fixture(t,{brand,selection,copyFor,treatment,reviewEdit:unable,pinned:false,unpin:['setRuleCheckVersion']});assert.equal(f.planError,null);
  const ids=f.records[0].reviewContract.requirements.map(x=>x.id);for(const id of SET)assert.ok(ids.includes('placement-'+id));assert.equal(f.records[0].setRuleCheckVersion,undefined);
  await f.run();const r=(await f.read()).results[0];assert.equal(r.ready,true);assert.equal(r.qualityVerified,false);
 });
}

// Local A+ re-run (18 Nov 2026): "A+ PICTURE JOBS" came back unable_to_verify on 2 of 14 pages ("other module artwork is
// not supplied, so repetition of the hero view ... cannot be established"). Pinned records judge only this page's job.
for(const brand of brands)test(brand+': picture-job rules ask only about this page for pinned records',async t=>{
 const f=await fixture(t,{brand});assert.equal(f.planError,null);const rec=f.records[0],input=structuredClone(rec.input);
 input.format.guidance.mandatory.push(...['aplus-picture-jobs','pmax-picture-jobs','carousel-picture-jobs'].map(id=>({id,text:id+' rule text.'})));input.format.guidance.rulePlacements={};
 const text=(opts,id)=>visual.contract(input,rec.plan,rec.placementId,{conformance:1,...opts}).requirements.find(r=>r.id==='placement-'+id).expected;
 for(const id of visual.PAGE_JOB){assert.match(text({setRules:true},id),/Judge only whether THIS page does its own picture job/);assert.equal(text({},id),id+' rule text.','earlier records keep the rule text');}
 assert.doesNotMatch(text({setRules:true},'composition-layout'),/THIS page/);
});
