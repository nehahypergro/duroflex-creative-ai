'use strict';
// Regression (22 Nov 2026, Neha: "sometimes the person is as big as the mattress, or … unusually long for a mattress …
// from the SKU we already know the width, height, length" → "I am not happy with random codes added [to the image
// brief]" → "Yes, planner writes it"). Before, nothing told the planner or the checker the product's real size, so a
// person drawn as big as the mattress passed. New lean jobs pin scaleCheckVersion 1: the planner gets the SKU's stated
// size and writes the scale in its own page plan (no fixed line in the image brief), and the check asks "People to
// scale" with the same size, a layout finding that gets the one redraw. Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const {fixture,square}=require('./lean-marketing-fixture');
const MATTRESS={id:'sku-selected-variant',status:'supported',sourceIds:[],text:'The explicitly selected official product variant is Queen / 72 x 60 / 8; SKU EXACT-1; variant ID v1. Exact saved options: Size: Queen; Dimension: 72 x 60 (183 cm x 152 cm); Height: 8 (20.3 cm).'};
const SOFA={id:'sku-fact-7',status:'supported',sourceIds:[],text:'Dimensions: 206.5cm x 84cm x 93.5cm (81.2" x 33" x 36.6").'};
const CASES=[['Duroflex',MATTRESS,'Dimension: 72 x 60 (183 cm x 152 cm); Height: 8 (20.3 cm)'],['Sleepyhead',SOFA,'Dimensions: 206.5cm x 84cm x 93.5cm (81.2" x 33" x 36.6")']];
const TOO_BIG='The woman lying on the bed is as long as the whole mattress and her head is wider than the pillow; she is clearly out of scale with the bed.';
const PLANNER_SCALE='She lies along the mattress, head on the pillow near the headboard, feet a hand short of the foot end.';
const planEdit=(out,input)=>{if(input.productScale)for(const p of out.pages)p.artDirection+=' '+PLANNER_SCALE;};
function flag(id,evidence,on){let n=0;return out=>{n++;if(!on.includes(n))return;const c=out.checks.find(x=>x.id===id);if(c){c.result='clear_mismatch';c.evidence=evidence;}};}
const planning=f=>f.calls.find(c=>c.kind==='lean-planning'),reviews=f=>f.calls.filter(c=>c.kind==='lean-review');
const scaleCheck=c=>(c.input.requirements||[]).find(r=>r.id==='people-scale');
test('new lean jobs pin scaleCheckVersion and the snapshot keeps it',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.scaleCheckVersion,1);assert.equal(pc.snapshot(c).scaleCheckVersion,1);assert.equal(pc.snapshot({}).scaleCheckVersion,undefined);
});
test('the stated size is read word for word from the product facts, never guessed',()=>{
 const {statedSize}=require('../../lib/creative-ai/lean/product-scale');
 assert.deepEqual(statedSize([MATTRESS]),{text:'Dimension: 72 x 60 (183 cm x 152 cm); Height: 8 (20.3 cm)',factId:'sku-selected-variant'});
 assert.equal(statedSize([{id:'sku-selected-variant',text:'… Exact saved options: Title: Default Title.'},SOFA]).factId,'sku-fact-7','a sofa\'s dimensions fact');
 assert.equal(statedSize([{id:'sku-fact-6',text:'The product information lists dimensions as 153 cm × 84 cm × 93.5 cm; the page’s FAQ gives a conflicting length, so the dimensions are unresolved.'}]),null,'a conflicting size is not used');
 assert.equal(statedSize([{id:'sku-fact-2',text:'Dimension: 59" x 22" x 6"'}]).text,'Dimension: 59" (150 cm) x 22" (56 cm) x 6" (15 cm)','inches get centimetres beside them');
 assert.equal(statedSize([{id:'sku-fact-1',text:'A pocket spring mattress with memory foam.'}]),null);
});
for(const [brand,sizeFact,stated] of CASES){
 test(brand+': the planner gets the stated size and writes the scale itself; the image brief gets no fixed scale line',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)],facts:[sizeFact],planEdit});assert.equal(f.planError,null);await f.run();
  const scale=planning(f).input.productScale;assert.equal(scale.statedSize,stated);assert.equal(scale.sourceFactId,sizeFact.id);assert.match(scale.rule,/If a person or pet appears/);assert.ok(scale.rule.includes(stated));
  const images=f.calls.filter(c=>c.kind==='image');assert.equal(images.length,1);
  assert.ok(images[0].prompt.includes(PLANNER_SCALE),'the planner\'s own words reach the image model');assert.doesNotMatch(images[0].prompt,/Typical adults|If a person or pet appears/,'no fixed scale line is added to the image brief');
  const check=scaleCheck(reviews(f)[0]);assert.ok(check,'the check asks People to scale');assert.ok(check.expected.includes(stated));assert.match(check.expected,/as big as the mattress or sofa/);assert.match(check.expected,/No person or pet in the image: no_mismatch/);
 });
 test(brand+': a person clearly out of scale is redrawn once with the finding described',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)],facts:[sizeFact],reviewEdit:flag('people-scale',TOO_BIG,[1])});await f.run();
  const images=f.calls.filter(c=>c.kind==='image');assert.equal(images.length,2);assert.ok(images[1].prompt.includes(TOO_BIG.slice(0,50)));
  assert.equal(f.calls.filter(c=>c.kind==='lean-correction').length,0,'a scale problem is not sent to a local repaint');
  const r=(await f.read()).results[0];assert.match(r.imageUrl,/candidate/);assert.equal(r.correction.action,'redraw');
 });
 test(brand+': a product with no stated size gets general adult-size wording only',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)]});await f.run();
  const scale=planning(f).input.productScale;assert.equal(scale.statedSize,null);assert.match(scale.rule,/states no size/);assert.match(scaleCheck(reviews(f)[0]).expected,/Typical adults are about 155–180 cm/);
 });
 test(brand+': jobs admitted before the pin keep their planner input and check',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)],facts:[sizeFact],pinned:false,unpin:['scaleCheckVersion']});await f.run();
  assert.equal(planning(f).input.productScale,undefined);assert.equal(scaleCheck(reviews(f)[0]),undefined);
 });
}
