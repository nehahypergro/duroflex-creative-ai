'use strict';
// Regression (18 Nov 2026, live Duroflex Instagram post creative-3ab87877, Posture Perfect mattress): the picture was
// right in every other check but was held as "check before using" because the image model drew "→" after
// "Explore the mattress". The composition rule banned every added arrow. Neha decided a small arrow beside the
// button text is fine. New lean jobs pin ctaArrowVersion 1; earlier jobs keep the strict rule. Failing before.
const test=require('node:test'),assert=require('node:assert/strict');
const rules=require('../../lib/creative-ai/lean/plan-rules'),policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const {brands,fixture}=require('./lean-marketing-fixture');
const ALLOW=/single small arrow or chevron \(→ or ›\) right after the call-to-action words is part of the button/;
const ruleIn=input=>input.format.guidance.mandatory.find(r=>r.id===rules.ID);

test('new lean jobs pin the CTA arrow allowance and the snapshot keeps it',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.ctaArrowVersion,1);assert.equal(pc.snapshot(c).ctaArrowVersion,1);assert.equal(pc.snapshot({}).ctaArrowVersion,undefined);
});
test('the composition rule allows one arrow after the call-to-action only when pinned; counters stay banned',()=>{
 const sel=[{id:'p',description:{name:'Instagram post',dimensions:{width:1080,height:1080}}}];
 const on=rules.section({},sel,{ctaArrow:true}),off=rules.section({},sel);
 assert.match(on.rule.text,ALLOW);assert.match(on.rule.text,/01 \/ 05/);assert.match(on.rule.text,/pagination dots or arrows/,'other arrows are still not allowed');assert.equal(on.planRules.ctaArrow,1);
 assert.doesNotMatch(off.rule.text,ALLOW);assert.equal(off.planRules.ctaArrow,undefined);
});
for(const brand of brands)test(brand+': the allowance reaches planning and the image check for new jobs only',async t=>{
 const f=await fixture(t,{brand});assert.equal(f.planError,null);
 assert.match(ruleIn(f.calls.find(c=>c.kind==='lean-planning').input).text,ALLOW);
 await f.run();const review=f.calls.find(c=>c.kind==='lean-review');assert.ok(review,'the image was checked');
 const req=review.input.requirements.find(r=>r.id.includes('composition-layout'));assert.ok(req,'the composition rule is checked on the picture');assert.match(JSON.stringify(req),ALLOW);
 const old=await fixture(t,{brand,pinned:false,unpin:['ctaArrowVersion']});assert.equal(old.planError,null);
 assert.doesNotMatch(ruleIn(old.calls.find(c=>c.kind==='lean-planning').input).text,ALLOW,'earlier jobs keep the strict rule');
});
