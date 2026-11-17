'use strict';
// Regression from the live Sleepyhead test batch (17 Nov 2026): every Sleepyhead design came back "brand-req-typeface:
// unable_to_verify" (a font cannot be named from a picture), so none was fully checked; 69 saved local designs were held
// back by the font alone. User decision (17 Nov 2026): for new jobs that answer is a listed note and no longer withholds
// Ready; a visibly wrong font (clear_mismatch) still blocks. Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config'),visual=require('../../lib/creative-ai/lean/visual-review');
const {brands,fixture}=require('./lean-marketing-fixture');
const TYPE={id:'req-typeface',text:'Use the brand typeface for headlines and the web typeface for body copy. Do not claim exact rendering unless verified.'};
const answer=result=>out=>{const c=out.checks.find(c=>c.id==='brand-req-typeface');if(c)Object.assign(c,{result,evidence:result==='clear_mismatch'?'The headline is set in a script font.':'The font cannot be identified by name from the picture.'});};

test('new lean jobs pin typeface notes v1 and the snapshot keeps it',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.typefaceNoteVersion,1);assert.equal(pc.snapshot(c).typefaceNoteVersion,1);assert.equal(pc.snapshot({}).typefaceNoteVersion,undefined);
});
test('only brand typeface rules become notes',()=>{
 for(const id of ['brand-req-typeface','brand-req-font','brand-typography'])assert.equal(visual.typefaceRule(id),true,id);
 for(const id of ['label-wording','brand-req-logo-integrity','brand-campaign-clarification','placement-composition-layout'])assert.equal(visual.typefaceRule(id),false,id);
});
for(const brand of brands){
 test(brand+': a typeface rule the checker cannot confirm is a note, and the design is fully checked',async t=>{
  const f=await fixture(t,{brand,requirements:[TYPE],reviewEdit:answer('unable_to_verify')});assert.equal(f.planError,null);
  assert.ok(f.records[0].reviewContract.requirements.some(r=>r.id==='brand-req-typeface'));assert.equal(f.records[0].typefaceNoteVersion,1);
  await f.run();const r=(await f.read()).results[0];
  assert.equal(r.ready,true);assert.equal(r.qualityVerified,true);assert.deepEqual(r.visualReview.unverified,[]);
  assert.equal(r.visualReview.typefaceNotes[0].id,'brand-req-typeface');assert.match(r.visualReview.typefaceNotes[0].note,/cannot be identified/);
 });
 test(brand+': a visibly wrong font still blocks',async t=>{
  const f=await fixture(t,{brand,requirements:[TYPE],reviewEdit:answer('clear_mismatch')});await f.run();const r=(await f.read()).results[0];
  assert.equal(r.qualityVerified,false);assert.equal(r.visualReview.conclusion,'clear_mismatch');
 });
 test(brand+': jobs admitted before the pin keep the font as unverified',async t=>{
  const f=await fixture(t,{brand,requirements:[TYPE],reviewEdit:answer('unable_to_verify'),pinned:false,unpin:['typefaceNoteVersion']});await f.run();const r=(await f.read()).results[0];
  assert.equal(r.ready,true);assert.equal(r.qualityVerified,false);assert.deepEqual(r.visualReview.unverified,['brand-req-typeface']);assert.equal(r.visualReview.typefaceNotes,undefined);
 });
}
