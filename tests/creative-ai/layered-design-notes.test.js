'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./editor-qa-fixture.cjs');
const {createHandler}=require('../../lib/creative-ai/runtime/http');
test('saved layered design notes load for both brands and reject a foreign assignment',async t=>{
 const f=await fixture();t.after(f.cleanup);const app=createHandler({root:f.root,dossierStore:{}});
 for(const job of f.jobs){
  await f.runtime.store.save(job.id,'editable-source-package-continuity-square.json',{assignmentId:job.id,route:'continuity',placementId:'square',artDirection:{focalCommunication:'A saved benefit',composition:'Product right; copy left.',scene:'A calm room',logo:{treatment:'Upper right'}}});
  let body;await app.handle({method:'GET'},{writeHead(){},end(v){body=JSON.parse(v);}},'/creative-ai/api/jobs/'+job.id+'/details',async()=>({}));
  assert.equal(body.units[0].plannedArt?.focalCommunication,'A saved benefit');assert.equal(body.units[0].plannedArt.scene,'A calm room');assert.equal(body.units[0].review,null);
  await f.runtime.store.save(job.id,'editable-source-package-continuity-square.json',{assignmentId:'foreign-job',route:'continuity',placementId:'square',artDirection:{focalCommunication:'Must not leak'}});
  await app.handle({method:'GET'},{writeHead(){},end(v){body=JSON.parse(v);}},'/creative-ai/api/jobs/'+job.id+'/details',async()=>({}));assert.equal(body.units[0].plannedArt,null);
 }
});
