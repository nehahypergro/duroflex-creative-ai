'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),http=require('http');
const ROOT=path.resolve(__dirname,'../..');
test('historical no-output detail keeps absent review evidence unavailable instead of crashing',async()=>{
 const root=await fs.mkdtemp(path.join(ROOT,'work/webapp-details-test-'));
 const handler=require('../../lib/creative-ai/runtime/http').createHandler({root});
 const server=http.createServer((req,res)=>handler.handle(req,res,new URL(req.url,'http://localhost').pathname,async()=>({})));
 try{
  const job=await handler.runtime.store.create({brandId:'brand-audit',brandUrl:'https://www.duroflexworld.com/'},handler.runtime.config,[]);
  await handler.runtime.store.update(job.id,j=>{j.status='failed';j.results=[{route:'continuity',placementId:'story',imageUrl:null,reviewUrl:null,ready:false}];return j;});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/creative-ai/api/jobs/'+job.id+'/details');
  assert.equal(response.status,200);const details=await response.json();assert.equal(details.units.length,1);assert.equal(details.units[0].review,null);assert.equal(details.units[0].plannedArt,null);
  const view=await(await fetch('http://127.0.0.1:'+server.address().port+'/creative-ai/api/jobs/'+job.id)).json();
  assert.deepEqual(view.stages,[]);assert.equal(view.progress.status,'history-unavailable');assert.equal(view.progress.totalOutputs,0);assert.match(view.progress.label,/unavailable/);assert.equal(view.status,'failed');
  const saved=await handler.runtime.store.read(job.id);assert.equal(saved.results[0].ready,false);assert.equal(saved.results[0].reviewUrl,null);
 }finally{await new Promise(resolve=>server.close(resolve));await fs.rm(root,{recursive:true,force:true});}
});
