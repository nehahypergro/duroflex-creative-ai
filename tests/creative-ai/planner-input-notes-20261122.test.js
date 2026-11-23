'use strict';
// Regression (22 Nov 2026, paid local brochure test). The Sleepyhead Original A4 bi-fold failed planning with
// "Agent output failed validated contract after bounded recovery: Invalid guidance decision IDs" (about ₹30 for the
// planner and its one repair). Both answers added guidance decisions for three planner input notes (foldPanels,
// productConstruction, productScale), which are not rules, and the error did not say which IDs were wrong, so the
// repair repeated them. Input-note decisions are now dropped and listed on the unit record; any other bad ID still fails and the
// error names it. No paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {fixture,square}=require('./lean-marketing-fixture');
const BASE={Duroflex:'https://duroflex.test/cdn/shop/files/',Sleepyhead:'https://sleepyhead.test/cdn/shop/files/'};
const gallery=base=>[
 {id:'sku-product-image-1',label:'Mattress on a bed',url:base+'M_1.jpg'},
 {id:'sku-product-image-2',label:'Mattress cutaway showing its foam layers and outer fabric',url:base+'M_2.jpg'}];
const NOTES=['foldPanels','productConstruction','productScale','technologyVisual'];
const addNotes=(out,input)=>{for(const id of NOTES.filter(k=>Object.prototype.hasOwnProperty.call(input,k)))out.guidanceDecisions.push({id,decision:'apply',reason:'Applied as written'});};
async function savedPlan(f){const name=(await fs.readdir(f.dir)).find(n=>/^lean-plan-/.test(n));return JSON.parse(await fs.readFile(path.join(f.dir,name),'utf8'));}
for(const brand of Object.keys(BASE)){
 test(brand+': decisions written for planner input notes are dropped, recorded and the plan goes on',async t=>{
  let added=[];
  const f=await fixture(t,{brand,selection:[square(1)],gallery:gallery(BASE[brand]),planEdit:(out,input)=>{addNotes(out,input);added=NOTES.filter(k=>Object.prototype.hasOwnProperty.call(input,k));}});
  assert.ok(added.includes('productConstruction'),'the live input note is present');
  assert.equal(f.planError,null);
  const plan=await savedPlan(f);assert.ok(!plan.guidanceDecisions.some(d=>NOTES.includes(d.id)),'not in the saved plan');
  assert.deepEqual(f.records[0].droppedDecisions,added,'listed on the unit record');
  await f.run();assert.ok((await f.read()).results[0].imageUrl,'the design is drawn');
 });
 test(brand+': any other unknown or repeated decision ID still fails, and the error names it',async t=>{
  const unknown=await fixture(t,{brand,selection:[square(1)],planEdit:out=>{out.guidanceDecisions.push({id:'made-up-rule',decision:'apply',reason:'x'});}});
  assert.match(String(unknown.planError?.message),/Invalid guidance decision IDs; not rule IDs: made-up-rule\./);
  const repeated=await fixture(t,{brand,selection:[square(1)],planEdit:out=>{out.guidanceDecisions.push({...out.guidanceDecisions[0]});}});
  assert.match(String(repeated.planError?.message),/Invalid guidance decision IDs; listed more than once: /);
 });
}
