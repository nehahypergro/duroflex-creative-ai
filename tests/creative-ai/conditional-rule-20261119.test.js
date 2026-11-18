'use strict';
// Regression (19 Nov 2026, live QA): a Duroflex web push in a Hindi campaign (Airboost Duo Topper) failed planning with
// "Mandatory rule cannot be omitted: feature-demonstration". That rule applies only "when a page's message is a physical
// product feature"; the planner judged that it was not and wrote not-applicable. New jobs pin conditionalRuleVersion 1:
// a written not-applicable is recorded as applied with the planner's note, and the rule still reaches the check.
// Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const {brands,fixture}=require('./lean-marketing-fixture');
const mark=(decision,reason)=>out=>{const d=out.guidanceDecisions.find(d=>d.id==='feature-demonstration');assert.ok(d,'the plan has a feature-demonstration note');Object.assign(d,{decision,reason});};
test('new lean jobs pin conditional rules v1 and the snapshot keeps it',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.conditionalRuleVersion,1);assert.equal(pc.snapshot(c).conditionalRuleVersion,1);assert.equal(pc.snapshot({}).conditionalRuleVersion,undefined);
});
for(const brand of brands){
 test(brand+': feature-demonstration written as not-applicable with a reason is applied, and still reaches the check',async t=>{
  const f=await fixture(t,{brand,planEdit:mark('not-applicable','The page message is comfort, not a physical feature.')});assert.equal(f.planError,null);
  const d=f.records[0].plan.guidanceDecisions.find(d=>d.id==='feature-demonstration');
  assert.equal(d.decision,'apply');assert.match(d.reason,/^Condition not met \(planner\): The page message is comfort/);
  assert.ok(JSON.stringify(f.records[0].reviewContract).includes('feature-demonstration'),'the check still judges it');
 });
 test(brand+': other mandatory rules written as not-applicable still fail',async t=>{
  const f=await fixture(t,{brand,planEdit:out=>{Object.assign(out.guidanceDecisions.find(d=>d.id==='identity'),{decision:'not-applicable',reason:'Not needed'});}});
  assert.match(String(f.planError?.message),/Mandatory rule cannot be omitted: identity/);
 });
 test(brand+': jobs admitted before the pin still fail',async t=>{
  const f=await fixture(t,{brand,pinned:false,unpin:['conditionalRuleVersion'],planEdit:mark('not-applicable','Not a feature message.')});
  assert.match(String(f.planError?.message),/Mandatory rule cannot be omitted: feature-demonstration/);
 });
}
