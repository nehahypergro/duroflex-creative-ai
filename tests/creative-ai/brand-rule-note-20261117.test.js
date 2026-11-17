'use strict';
// Regression from the live Duroflex test batch (17 Nov 2026): Display banners (Cocoon) failed planning with
// "Missing brand requirement/preference decision: strategy-as-intent" because the planner skipped its note for one
// Duroflex brand-guide requirement. User decision (17 Nov 2026): for new jobs a skipped note is filled as "apply"
// instead of failing. Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const {brands,fixture}=require('./lean-marketing-fixture');
const skip=id=>out=>{out.guidanceDecisions=out.guidanceDecisions.filter(d=>d.id!==id);};

test('new lean jobs pin brand-rule notes v1 and the snapshot keeps it',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.brandRuleNoteVersion,1);assert.equal(pc.snapshot(c).brandRuleNoteVersion,1);assert.equal(pc.snapshot({}).brandRuleNoteVersion,undefined);
});
for(const brand of brands){
 test(brand+': a skipped brand-rule note is filled as applied, and the rule still reaches the check',async t=>{
  const f=await fixture(t,{brand,planEdit:skip('identity')});assert.equal(f.planError,null);
  const d=f.records[0].plan.guidanceDecisions.find(d=>d.id==='identity');
  assert.equal(d.decision,'apply');assert.match(d.reason,/did not write a note/);
  assert.ok(f.records[0].reviewContract.requirements.length);
 });
 test(brand+': a mandatory brand rule written as not-applicable still fails',async t=>{
  const f=await fixture(t,{brand,planEdit:out=>{Object.assign(out.guidanceDecisions.find(d=>d.id==='identity'),{decision:'not-applicable',reason:'Not needed'});}});
  assert.match(String(f.planError?.message),/Mandatory rule cannot be omitted: identity/);
 });
 test(brand+': jobs admitted before the pin still fail on a skipped note',async t=>{
  const f=await fixture(t,{brand,pinned:false,unpin:['brandRuleNoteVersion'],planEdit:skip('identity')});
  assert.match(String(f.planError?.message),/Missing brand requirement\/preference decision: identity/);
 });
}

