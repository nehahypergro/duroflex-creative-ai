'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
function fixture(){return {version:3,sets:[{conceptId:'own-option',visualSystem:'Own visual direction',slots:[{placementId:'ready',status:'ready',message:'Keep exactly this'}, {placementId:'use',status:'needs-source',message:'Missing rating',missingEvidence:['No firmness rating']}]}]};}
test('one targeted alternative pass changes only the affected slot and keeps ready work untouched',async()=>{
 const recover=require('../../lib/creative-ai/runtime/pdp-alternatives').recover,plan=fixture(),before=structuredClone(plan);let calls=0;
 const out=await recover({plan,input:{facts:[{id:'use-fact',status:'supported'}]},slotSchema:{type:'object'},validate:p=>assert.equal(p.sets[0].slots[0].message,'Keep exactly this'),provider:{reason:async req=>{calls++;assert.equal(req.input.affected.length,1);const patch={replacements:[{conceptId:'own-option',slot:{placementId:'use',status:'ready',message:'Supported use',proofFactIds:['use-fact'],missingEvidence:[]}}]};req.validate(patch);return patch;}},budget:{}});
 assert.equal(calls,1);assert.equal(out.sets[0].slots[1].status,'ready');assert.deepEqual(out.sets[0].slots[0],before.sets[0].slots[0]);assert.deepEqual(plan,before);
});
test('missing evidence and unavailable alternative review leave only affected work pending',async()=>{
 const recover=require('../../lib/creative-ai/runtime/pdp-alternatives').recover,plan=fixture();
 const out=await recover({plan,input:{},slotSchema:{type:'object'},validate:()=>{},provider:{reason:async()=>{throw Error('Unavailable');}},budget:{}});
 assert.equal(out.sets[0].slots[0].status,'ready');assert.equal(out.sets[0].slots[1].status,'needs-source');assert.match(out.sets[0].slots[1].missingEvidence.join(' '),/Unavailable/);
 let calls=0;await recover({plan:{...plan,sets:[]},input:{},provider:{reason:async()=>calls++}});assert.equal(calls,0);
});
test('alternative response cannot replace a ready sibling or introduce another concept',async()=>{
 const recover=require('../../lib/creative-ai/runtime/pdp-alternatives').recover;
 for(const [conceptId,placementId] of [['foreign','use'],['own-option','ready']]){
  const out=await recover({plan:fixture(),input:{},slotSchema:{type:'object'},validate:()=>{},provider:{reason:async req=>{const p={replacements:[{conceptId,slot:{placementId,status:'ready'}}]};req.validate(p);return p;}},budget:{}});
  assert.equal(out.sets[0].slots[0].message,'Keep exactly this');assert.equal(out.sets[0].slots[1].status,'needs-source');
 }
});
