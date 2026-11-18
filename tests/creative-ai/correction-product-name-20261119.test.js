'use strict';
// Regression (19 Nov 2026, live rerun test after the 18 Nov redeploy): 3 of 7 rerun jobs (two Sleepyhead stories and a
// Sleepyhead homepage hero) had a wording mistake the single local correction should fix, but every diagnosis was refused
// with "Local repair requires product protection" and no correction ran; 4 earlier live jobs had the same error. The
// diagnosis protected the product by its type ("Teal sofa"), and only the word "product" was accepted once label repair
// (which carried the broader naming) was turned off for new jobs. New jobs pin productNameProtectionVersion 1.
const test=require('node:test'),assert=require('node:assert/strict');
const correction=require('../../lib/creative-ai/lean/correction'),policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const {brands,fixture}=require('./lean-marketing-fixture');
// The shape of the refused diagnoses: fix stray wording, protect the product and the headline by name.
const copyFix=product=>({action:'local_edit',requirementIds:['copy-2'],reason:'Unplanned words on the props',instruction:'Remove the printed titles from the books',
 regions:[{label:'Book titles on the side table',x:620,y:540,width:180,height:120}],
 protectedRegions:[{label:product,x:80,y:420,width:500,height:420},{label:'Headline copy',x:80,y:80,width:700,height:180}]});

test('new lean jobs pin product-name protection; earlier jobs keep their rule',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.productNameProtectionVersion,1);
 assert.equal(pc.snapshot(c).productNameProtectionVersion,1);assert.equal(pc.snapshot({}).productNameProtectionVersion,undefined);
 assert.equal(c.labelRepairVersion,undefined,'label repair stays off');
});
test('protection named after the product type is accepted for pinned records',()=>{
 for(const name of ['Teal sofa','Visible mattress','Memory foam topper','Recliner','Spine contour pillow']){
  const d=copyFix(name);
  assert.throws(()=>correction.validateDecision(d,[{id:'copy-2'}]),/product protection/,name+': unpinned records keep the old rule');
  assert.equal(correction.validateDecision(d,[{id:'copy-2'}],{productNames:true}),d,name);
 }
});
test('the pin does not let a repair touch the product or other protected copy',()=>{
 const opts={productNames:true};
 const onProduct=copyFix('Teal sofa');onProduct.regions=[{label:'Sofa arm',x:100,y:450,width:100,height:100}];
 assert.throws(()=>correction.validateDecision(onProduct,[{id:'copy-2'}],opts),/overlaps protected content/);
 const noProduct=copyFix('Side table');assert.throws(()=>correction.validateDecision(noProduct,[{id:'copy-2'}],opts),/product protection/);
 const productFinding={...copyFix('Teal sofa'),requirementIds:['product']};
 assert.throws(()=>correction.validateDecision(productFinding,[{id:'product'}],opts),/whole-page candidate/,'a product defect still needs a whole page');
});
for(const brand of brands)test(brand+': new design records carry the product-name pin',async t=>{
 const f=await fixture(t,{brand});assert.equal(f.planError,null);assert.equal(f.records[0].productNameProtectionVersion,1);assert.equal(f.records[0].labelRepairVersion,undefined);
});
