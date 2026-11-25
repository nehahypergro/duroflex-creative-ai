'use strict';
// Regression (25 Nov 2026, local room test, Neha: "Yes, fix it"): the Duroflex Airboost 6.8 Instagram portrait post
// (creative-37735ea7) had the mattress run off the right edge in its first drawing and in its one redraw, so it stayed
// "Check before using". Saved checks: 25 of 188 first drawings of a mattress, topper or protector were cut by a canvas
// edge (7 of 25 on tall pages), almost always at the left or right end; 0 of 166 sofa drawings. The planner had written
// "do not crop the mattress" and planned it across 80% of the width; the image model drew it larger. New lean jobs pin
// productFrameVersion 1: the planner gets a note for a long, flat product and writes the smaller size and the clear
// space beyond both ends itself (no fixed line in the image brief), and a redraw for a product cut by an edge is told
// to draw it smaller with the camera pulled back. Both brands; fails before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const {square,story,fixture}=require('./lean-marketing-fixture');
const PRODUCTS={Duroflex:{mattress:'Duropedic Airboost 6.8 Arctic Ice Mattress | 1 lakh+ Airknit fibres with latex and adjustable firmness | 100 nights trial',sofa:'Octave 3 Seater Water & Stain Repellent Fabric Sofa'},
 Sleepyhead:{mattress:'Prime - Premium BodyIQ Orthopedic Memory Foam Mattress',sofa:'Sofa Drip Pro - 3 Seater Sofa (Fabric, Coco Brown)'}};
const PLANNER_FRAME='The whole mattress spans about the middle 60% of the width, with pale floor visible beyond both ends.';
const planEdit=(out,input)=>{if(input.productFrame)for(const p of out.pages)p.spatial.productPlacement+=' '+PLANNER_FRAME;};
const CUT='The mattress extends beyond the right canvas edge, cropping the product despite the plan to keep it whole.';
const OVERLAP='The headline overlaps the logo at the top right, so the logo is partly unreadable.';
function flag(id,evidence){let n=0;return out=>{n++;if(n!==1)return;const c=out.checks.find(x=>x.id===id)||out.checks.find(x=>['spatial-layout','layout','structure'].includes(x.id));if(c){c.result='clear_mismatch';c.evidence=evidence;}};}
const planning=f=>f.calls.find(c=>c.kind==='lean-planning'),images=f=>f.calls.filter(c=>c.kind==='image');
const SMALLER=/drawn too large and ran off the edge: draw it clearly smaller this time and pull the camera back/;

test('new lean jobs pin productFrameVersion and the snapshot keeps it',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.productFrameVersion,1);assert.equal(pc.snapshot(c).productFrameVersion,1);assert.equal(pc.snapshot({}).productFrameVersion,undefined);
});
test('long, flat products are recognised by their official names; sofas, recliners and pillows are not',()=>{
 const {longProduct}=require('../../lib/creative-ai/lean/product-frame');
 for(const n of [PRODUCTS.Duroflex.mattress,PRODUCTS.Sleepyhead.mattress,'Airboost Duo Topper','Bamboo Terry Waterproof Mattress Protector, (72 x 60 inches, White)','Duro Safe - Waterproof Mattress Protector'])assert.ok(longProduct(n),n);
 for(const n of [PRODUCTS.Duroflex.sofa,PRODUCTS.Sleepyhead.sofa,'Avalon Grande Brown Fabric Recliner','Spine Contour Pillow',''])assert.ok(!longProduct(n),n);
});
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': a mattress gets the framing note and the planner writes the size itself; the image brief gets no fixed line',async t=>{
  const f=await fixture(t,{brand,productName:PRODUCTS[brand].mattress,selection:[square(1)],planEdit});assert.equal(f.planError,null);await f.run();
  const frame=planning(f).input.productFrame;assert.ok(frame,'the planner gets the note');assert.equal(frame.version,1);
  assert.match(frame.rule,/at most about two-thirds of the canvas width/);assert.match(frame.rule,/productPlacement and spacingAndCrop, in your own words/);assert.doesNotMatch(frame.rule,/60% on a tall page/,'a square page gets no tall-page wording');
  const [img]=images(f);assert.ok(img.prompt.includes(PLANNER_FRAME),'the planner\'s own words reach the image model');assert.doesNotMatch(img.prompt,/Image models draw it larger|two-thirds of the canvas width/,'no fixed framing line is added to the image brief');
 });
 test(brand+': on a tall page the note asks for about 60% of the width',async t=>{
  const f=await fixture(t,{brand,productName:PRODUCTS[brand].mattress,selection:[story()]});await f.run();
  assert.match(planning(f).input.productFrame.rule,/about 60% on a tall page/);assert.match(planning(f).input.productFrame.rule,/more than one in four on tall pages/);
 });
 test(brand+': a sofa gets no framing note (sofas have never run off the edge)',async t=>{
  const f=await fixture(t,{brand,productName:PRODUCTS[brand].sofa,selection:[square(1)]});await f.run();
  assert.equal(planning(f).input.productFrame,undefined);
 });
 test(brand+': a product cut by the edge is redrawn smaller with the camera pulled back; other layout findings are not',async t=>{
  const cut=await fixture(t,{brand,productName:PRODUCTS[brand].mattress,selection:[square(1)],reviewEdit:flag('placement-composition-layout',CUT)});await cut.run();
  const [first,redraw]=images(cut);assert.ok(redraw,'one redraw');assert.match(redraw.prompt,/ONE REDRAW/);assert.match(redraw.prompt,SMALLER);assert.doesNotMatch(first.prompt,SMALLER,'the first drawing is unchanged');
  const sofa=await fixture(t,{brand,productName:PRODUCTS[brand].sofa,selection:[square(1)],reviewEdit:flag('placement-composition-layout',CUT.replace('mattress','sofa'))});await sofa.run();
  assert.match(images(sofa)[1].prompt,SMALLER,'any product cut by an edge');
  const other=await fixture(t,{brand,productName:PRODUCTS[brand].mattress,selection:[square(1)],reviewEdit:flag('spatial-layout',OVERLAP)});await other.run();
  const [,again]=images(other);assert.ok(again,'one redraw');assert.doesNotMatch(again.prompt,SMALLER,'a finding that is not a crop gets no size line');
 });
 test(brand+': jobs admitted before the pin keep their planner input and redraw wording',async t=>{
  const f=await fixture(t,{brand,productName:PRODUCTS[brand].mattress,selection:[square(1)],pinned:false,unpin:['marketingRulesVersion','productFrameVersion'],reviewEdit:flag('placement-composition-layout',CUT)});await f.run();
  assert.equal(planning(f).input.productFrame,undefined);const [,redraw]=images(f);assert.ok(redraw);assert.doesNotMatch(redraw.prompt,SMALLER);
 });
}
