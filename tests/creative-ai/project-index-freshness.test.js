'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
test('project index notices saved artifacts without reloading unchanged details; missing folder does not break index',async()=>{
 const f=await require('./editor-qa-fixture.cjs').fixture();
 try{
  const handler=require('../../lib/creative-ai/runtime/http').createHandler({root:f.root});
  const index=async()=>{let body,status;await handler.handle({method:'GET',url:'/creative-ai/api/jobs'},{writeHead(s){status=s;},end(b){body=JSON.parse(b);}},'/creative-ai/api/jobs',()=>{});assert.equal(status,200);return body;};
  for(const job of f.jobs){
   await fs.utimes(f.runtime.store.dir(job.id),new Date(0),new Date(0));
   const before=(await index()).find(j=>j.id===job.id);assert.ok(before.freshness);
   await f.runtime.store.save(job.id,'editable-index-test.json',{revision:1});
   const after=(await index()).find(j=>j.id===job.id);assert.equal(after.updatedAt,before.updatedAt);assert.notEqual(after.freshness,before.freshness);assert.equal(after.brandId,job.intake.brandId);assert.equal(after.intake,undefined);
   assert.equal((await index()).find(j=>j.id===job.id).freshness,after.freshness);
  }
  const dir=handler.runtime.store.dir.bind(handler.runtime.store);handler.runtime.store.dir=id=>id===f.jobs[0].id?dir(id)+'/removed-after-listing':dir(id);
  assert.deepEqual((await index()).map(j=>j.id),[f.jobs[1].id]);
 }finally{await f.cleanup();}
});
