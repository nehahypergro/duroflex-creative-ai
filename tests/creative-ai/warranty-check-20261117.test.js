'use strict';
// Regression (live test batch, 17 Nov 2026, Duroflex Prana Instagram post): the image check flagged the headline
// "10-year warranty." under a brand evidence rule ("without the supplied qualification that the warranty is
// conditional"), although the user decided on 11 Nov 2026 to leave "conditional" out of warranty wording. The false
// flag sent the design to "check before using" and stopped the correction of a real label typo ("naturallying").
// Failing before: the decision reached planning only. Both brands; offline fakes, no paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../../lib/creative-ai/runtime/lean-policy');
const {brands,fixture}=require('./lean-marketing-fixture');

test('new lean jobs pin warranty check v1 and the snapshot keeps it',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1}),pc=require('../../lib/creative-ai/runtime/provider-config');
 assert.equal(c.warrantyCheckVersion,1);assert.equal(pc.snapshot(c).warrantyCheckVersion,1);assert.equal(pc.snapshot({}).warrantyCheckVersion,undefined);
});

const brandChecks=r=>r.reviewContract.requirements.filter(x=>x.id.startsWith('brand-'));
const factText=r=>JSON.stringify(r.reviewContract.supportedFacts);

for(const brand of brands){
 test(brand+': the image check is told the warranty wording decision and sees the plain warranty fact',async t=>{
  const f=await fixture(t,{brand});assert.equal(f.planError,null);assert.equal(f.records.length,1);const r=f.records[0];
  assert.ok(brandChecks(r).length>0,'fixture has brand rules');
  for(const c of brandChecks(r))assert.match(c.expected,/missing "conditional" is not a mismatch/);
  assert.match(factText(r),/warranty/i);assert.doesNotMatch(factText(r),/conditional\s+warrant/i);
 });
 test(brand+': jobs admitted before the pin keep their check unchanged',async t=>{
  const f=await fixture(t,{brand,pinned:false,unpin:['warrantyCheckVersion']});assert.equal(f.planError,null);const r=f.records[0];
  for(const c of brandChecks(r))assert.doesNotMatch(c.expected,/missing "conditional" is not a mismatch/);
  assert.match(factText(r),/conditional\s+warrant/i);
 });
}

