'use strict';
// Regression (18 Nov 2026, local Duroflex Product Page Images run, Posture Perfect mattress): 5 of 12 images printed the
// mattress label as "PEEFCT"/"PKRFECT". Label wording is meant to go to the single local correction with the official
// label close-up, but every diagnosis was refused ("Local repair requires product protection"): the model protected the
// product as "Visible mattress …" (only the word "product" was accepted), and a repair could never sit inside the
// product, where the label is. The two decisions below are the model's real saved answers from that run (no paid calls).
// New jobs pin labelRepairVersion 1. Failing before.
const test=require('node:test'),assert=require('node:assert/strict');
const correction=require('../../lib/creative-ai/lean/correction'),policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const {brands,fixture}=require('./lean-marketing-fixture');
const saved=require('./fixtures/label-repair-decisions-20261118.json');
const findings=d=>d.requirementIds.map(id=>({id}));

test('new lean jobs pin label repair v1 and the snapshot keeps it',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.labelRepairVersion,1);assert.equal(pc.snapshot(c).labelRepairVersion,1);assert.equal(pc.snapshot({}).labelRepairVersion,undefined);
 assert.match(correction.LABEL_REPAIR,/tight box around that label/);
});
test('the saved label repairs are accepted for pinned records and refused for earlier ones',()=>{
 for(const [name,d] of Object.entries(saved)){
  assert.throws(()=>correction.validateDecision(d,findings(d)),/product protection/,name+': earlier records keep their rule');
  assert.equal(correction.validateDecision(d,findings(d),{labelRepair:true}),d,name);
 }
});
test('label repair stays narrow: small, label-only, and never over copy or logos',()=>{
 const base=saved['misspelt-label'],opts={labelRepair:true};
 const big=structuredClone(base);big.regions=[{label:'Label',x:100,y:300,width:300,height:200}];assert.throws(()=>correction.validateDecision(big,findings(big),opts),/small patch/);
 const productOnly={...structuredClone(base),requirementIds:['product']};assert.throws(()=>correction.validateDecision(productOnly,[{id:'product'}],opts),/whole-page candidate/,'a product defect that is not the label still needs a whole page');
 const mixed={...structuredClone(base),requirementIds:[...base.requirementIds,'pointers']};assert.throws(()=>correction.validateDecision(mixed,findings(mixed),opts),/whole-page candidate/);
 const overCopy=structuredClone(base);overCopy.protectedRegions.push({label:'Unaffected headline copy',...base.regions[0]});assert.throws(()=>correction.validateDecision(overCopy,findings(overCopy),opts),/overlaps protected content/);
 const noProduct=structuredClone(base);noProduct.protectedRegions=noProduct.protectedRegions.filter(r=>!/mattress/i.test(r.label));assert.throws(()=>correction.validateDecision(noProduct,findings(noProduct),opts),/product protection/);
});
test('protection named after the product type counts for other local repairs too (pinned)',()=>{
 const copyFix={action:'local_edit',requirementIds:['copy-0'],reason:'Typo',instruction:'Fix the typo',regions:[{label:'Headline typo',x:100,y:100,width:200,height:50}],protectedRegions:[{label:'Visible sofa',x:100,y:400,width:800,height:400}]};
 assert.throws(()=>correction.validateDecision(copyFix,[{id:'copy-0'}]),/product protection/);assert.doesNotThrow(()=>correction.validateDecision(copyFix,[{id:'copy-0'}],{labelRepair:true}));
});
for(const brand of brands)test(brand+': new design records carry the label repair pin; earlier ones do not',async t=>{
 const f=await fixture(t,{brand});assert.equal(f.planError,null);assert.equal(f.records[0].labelRepairVersion,1);
 const old=await fixture(t,{brand,pinned:false,unpin:['labelRepairVersion']});assert.equal(old.records[0].labelRepairVersion,undefined);
});
