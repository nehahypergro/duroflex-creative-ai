'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EditableCanvases}=require('../../lib/creative-ai/runtime/editable');
for(const brandId of ['duroflex-fixture','sleepyhead-fixture'])test(brandId+': blocked packages stop before wording, preparation, or paid dispatch',async()=>{
 let sideEffects=0;
 const r={store:{read:async()=>({results:[],intake:{brandId}}),dir:()=>{sideEffects++;throw Error('downstream reached');}},beginTask:async()=>{sideEffects++;}};
 const e=new EditableCanvases(r,{prepareDocument:async()=>{sideEffects++;}});
 await assert.rejects(e.generate('fixture',{route:'continuity',placementId:'sales',status:'blocked',dispatchAllowed:false,dependencies:[{reason:'Final copy and product footprint cannot fit.'}]},{}),error=>error.code==='EDITABLE_PACKAGE_BLOCKED'&&error.message.includes('Final copy and product footprint cannot fit.'));
 assert.equal(sideEffects,0);
});
