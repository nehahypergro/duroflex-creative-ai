'use strict';
// Regression (19 Nov 2026, live QA): a Duroflex web push in a Hindi campaign (Airboost Duo Topper) failed planning with
// "Mandatory rule cannot be omitted: feature-demonstration". That rule applies only "when a page's message is a physical
// product feature"; the planner judged that it was not and wrote not-applicable. New jobs pin conditionalRuleVersion 1:
// a written not-applicable is recorded as applied with the planner's note, and the rule still reaches the check.
// The same pin covers Studio process rules (a Duroflex A4 poster failed on current-source-acceptance). Failing before;
// no paid calls.
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
 // Same day, Duroflex A4 poster in Marathi: "Mandatory rule cannot be omitted: current-source-acceptance", a Studio process rule.
 test(brand+': a Studio process rule written as not-applicable is applied with the note kept',async t=>{
  const f=await fixture(t,{brand,planEdit:out=>{Object.assign(out.guidanceDecisions.find(d=>d.id==='current-source-acceptance'),{decision:'not-applicable',reason:'No source documents for a poster.'});}});assert.equal(f.planError,null);
  const d=f.records[0].plan.guidanceDecisions.find(d=>d.id==='current-source-acceptance');assert.equal(d.decision,'apply');assert.match(d.reason,/^Studio process rule, always applied\. Planner note: No source documents/);
 });
 test(brand+': other mandatory rules written as not-applicable still fail',async t=>{
  const f=await fixture(t,{brand,planEdit:out=>{Object.assign(out.guidanceDecisions.find(d=>d.id==='identity'),{decision:'not-applicable',reason:'Not needed'});}});
  assert.match(String(f.planError?.message),/Mandatory rule cannot be omitted: identity/);
 });
 test(brand+': jobs admitted before the pin still fail',async t=>{
  const f=await fixture(t,{brand,pinned:false,unpin:['conditionalRuleVersion'],planEdit:mark('not-applicable','Not a feature message.')});
  assert.match(String(f.planError?.message),/Mandatory rule cannot be omitted: feature-demonstration/);
  const g=await fixture(t,{brand,pinned:false,unpin:['conditionalRuleVersion'],planEdit:out=>{Object.assign(out.guidanceDecisions.find(d=>d.id==='current-source-acceptance'),{decision:'not-applicable',reason:'x'});}});
  assert.match(String(g.planError?.message),/Mandatory rule cannot be omitted: current-source-acceptance/);
 });
}
// The one repair is told what to do, not only what failed (19 Nov 2026: tonight's three planning failures all repeated
// "not-applicable" after their repair). Pass/fail is unchanged.
for(const brand of brands)test(brand+': a mandatory rule left as not-applicable tells the repair to write "apply"',async t=>{
 const f=await fixture(t,{brand,planEdit:out=>{Object.assign(out.guidanceDecisions.find(d=>d.id==='identity'),{decision:'not-applicable',reason:'Not needed'});}});
 assert.match(String(f.planError?.message),/Mandatory rule cannot be omitted: identity \(write decision "apply" for it, and say in its reason how this page meets it/);
});
