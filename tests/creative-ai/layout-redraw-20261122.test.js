'use strict';
// Regression (22 Nov 2026, Neha: "why are we getting similar error, especially in layout" → "Yes, one redraw"). On the
// hosted Studio, 84 of 231 designs since 12 Nov were flagged and only 1 was fixed automatically: layout findings got
// no redraw (9 Nov rule), edge fit was used 0 of 16 times, and the measured story redraw cannot run there (no text
// reader). New lean jobs pin layoutRedrawVersion 1: any layout finding → the page is drawn once more with every finding
// described, kept only if its check has fewer problems and nothing new. Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config'),flow=require('../../lib/creative-ai/runtime/lean-workflow');
const {brands,square,story,fixture}=require('./lean-marketing-fixture');
const CUT='The sofa\'s lounger runs into the right canvas edge, cropping the product instead of keeping it whole with a clear margin.';
// Flags the given checks on the review calls listed in `on` (1 = the first check of the drawing, 2 = the redraw's check).
function flag(plan){let n=0;return out=>{n++;for(const [id,evidence,on] of plan){if(!on.includes(n))continue;const c=out.checks.find(x=>x.id===id)||out.checks.find(x=>id==='LAYOUT'&&['spatial-layout','layout','structure'].includes(x.id));if(c){c.result='clear_mismatch';c.evidence=evidence;}}};}
test('new lean jobs pin the layout redraw and the snapshot keeps it',()=>{const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.layoutRedrawVersion,1);assert.equal(pc.snapshot(c).layoutRedrawVersion,1);assert.equal(pc.snapshot({}).layoutRedrawVersion,undefined);});
test('a redraw is kept only when it has fewer problems and nothing new',()=>{
 const r=(...ids)=>({status:'completed',report:{checks:['a','b','c'].map(id=>({id,result:ids.includes(id)?'clear_mismatch':'no_mismatch'}))}});
 assert.equal(flow.redrawBetter(r('a','b'),r()),true);assert.equal(flow.redrawBetter(r('a','b'),r('b')),true,'one of two fixed, nothing new');
 assert.equal(flow.redrawBetter(r('a'),r('a')),false,'not fixed');assert.equal(flow.redrawBetter(r('a'),r('c')),false,'fixed one, broke another');
 assert.equal(flow.redrawBetter(r('a'),{status:'failed'}),false,'a check that did not finish');
});
for(const brand of brands){
 test(brand+': a product cut by the edge is redrawn once with the finding described, and the better redraw is used',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)],reviewEdit:flag([['LAYOUT',CUT,[1]],['campaign-copy','Extra "KINFOLK" lettering on a book.',[1]]])});assert.equal(f.planError,null);
  await f.run();const images=f.calls.filter(c=>c.kind==='image');assert.equal(images.length,2,'the original and one redraw');
  assert.match(images[1].prompt,/ONE REDRAW/);assert.ok(images[1].prompt.includes(CUT.slice(0,60)),'the check\'s own words go to the image model');assert.match(images[1].prompt,/KINFOLK/,'wording findings ride along');assert.match(images[1].prompt,/complete product inside the picture with a clear margin/);
  assert.equal(f.calls.filter(c=>c.kind==='lean-correction').length,0,'no separate diagnosis or local repaint');
  const r=(await f.read()).results[0];assert.match(r.imageUrl,/candidate/);assert.equal(r.correction.action,'redraw');assert.equal(r.correction.selected,true);assert.match(r.correction.note,/Redrawn once to fix/);assert.deepEqual(r.correction.notCorrected,[]);
 });
 test(brand+': a redraw that is not better keeps the original; only one redraw is ever made',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)],reviewEdit:flag([['LAYOUT',CUT,[1,2]]])});await f.run();
  assert.equal(f.calls.filter(c=>c.kind==='image').length,2);const r=(await f.read()).results[0];assert.doesNotMatch(r.imageUrl,/candidate/);assert.match(r.correction.note,/not better, so the original is kept/);
 });
 test(brand+': on a story the redraw also keeps words out of the covered bands, with no text reader (hosted Studio)',async t=>{
  const f=await fixture(t,{brand,selection:[story()],ocrRows:[],reviewEdit:flag([['LAYOUT','The CTA sits in the bottom 20% Story footer zone.',[1]]])});await f.run();
  const images=f.calls.filter(c=>c.kind==='image');assert.equal(images.length,2);assert.match(images[1].prompt,/full-screen story: keep every word, the logo and any button inside the middle band/);assert.match((await f.read()).results[0].imageUrl,/candidate/);
 });
 test(brand+': jobs admitted before the pin keep the 9 Nov rule (layout is not redrawn)',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)],pinned:false,unpin:['layoutRedrawVersion'],reviewEdit:flag([['LAYOUT','The headline sits lower than the plan.',[1]]])});await f.run();
  assert.equal(f.calls.filter(c=>c.kind==='image').length,1);assert.equal((await f.read()).results[0].correction.note,'Layout differs from plan; not auto-corrected.');
 });
 test(brand+': a page with no findings is not redrawn',async t=>{const f=await fixture(t,{brand,selection:[square(1)]});await f.run();assert.equal(f.calls.filter(c=>c.kind==='image').length,1);});
}
