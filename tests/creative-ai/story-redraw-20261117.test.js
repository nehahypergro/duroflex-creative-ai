'use strict';
// Regression from the live test batches (17 Nov 2026): 3 of 4 Duroflex stories put words or the logo in the bands
// Instagram covers, and that layout finding was never corrected. User decision (17 Nov 2026): a story whose measured
// safe-zone check fails is drawn once more, and the redraw is kept only if it is better. Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const {brands,story,fixture}=require('./lean-marketing-fixture');
const row=(y)=>[{text:'Lift a cushion, lean back',confidence:0.95,box:{x:0.1,y,width:0.6,height:0.03}}];
const covered=row(0.04),clear=row(0.4);
test('new lean jobs pin the story redraw and the snapshot keeps it',()=>{const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.storyRedrawVersion,1);assert.equal(pc.snapshot(c).storyRedrawVersion,1);assert.equal(pc.snapshot({}).storyRedrawVersion,undefined);});
for(const brand of brands){
 test(brand+': a story with words in the covered band is redrawn once, and the better redraw is used',async t=>{
  let reviews=0;const f=await fixture(t,{brand,selection:[story()],ocrRows:()=>++reviews===1?covered:clear});assert.equal(f.planError,null);
  await f.run();const images=f.calls.filter(c=>c.kind==='image');assert.equal(images.length,2,'the original and one redraw');assert.match(images[1].prompt,/STORY SAFE AREA \(one redraw\)/);assert.match(images[1].prompt,/top 14%/);
  const r=(await f.read()).results[0];assert.match(r.imageUrl,/candidate/);assert.ok(!(r.visualReview.checks||[]).some(c=>c.id==='story-safe-zone'&&c.result==='clear_mismatch'));
 });
 test(brand+': a redraw that is not better keeps the original; only one redraw is ever made',async t=>{
  const f=await fixture(t,{brand,selection:[story()],ocrRows:()=>covered});await f.run();
  assert.equal(f.calls.filter(c=>c.kind==='image').length,2);const r=(await f.read()).results[0];assert.doesNotMatch(r.imageUrl,/candidate/);
 });
 test(brand+': jobs admitted before the pin are not redrawn',async t=>{
  const f=await fixture(t,{brand,selection:[story()],ocrRows:()=>covered,pinned:false,unpin:['storyRedrawVersion']});await f.run();
  assert.equal(f.calls.filter(c=>c.kind==='image').length,1);
 });
}
