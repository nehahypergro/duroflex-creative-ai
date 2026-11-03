'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
for(const brandId of ['brand-duroflex','brand-sleepyhead'])test('creation scans metadata without decoding historical images: '+brandId,async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'creation-memory-')),store=new JobStore(path.join(root,'jobs'));
 try{
  // Deliberately unavailable raster: unrelated history must not be hydrated.
  await store.save('creative-old','job.json',{id:'creative-old',createdAt:'2020-01-01',intake:{brandId,requestKey:'old-request',image:{$studioRaster:{version:1,brandId,sha256:'a'.repeat(64),prefix:'data:image/png;base64,',bytes:2}}}});
  const reads=[],original=store.read.bind(store);store.read=async(id,options)=>{reads.push({id,options});return original(id,options);};
  const config={maxReasoningCalls:4,jobTimeoutMs:10000},intake={brandId,requestKey:'new-request'};
  const j=await store.create(intake,config,[]);assert.equal(j.intake.requestKey,'new-request');assert(reads.every(r=>r.id!=='creative-old'||r.options?.hydrate===false),'unrelated history must be metadata-only');
  const reused=await store.create(intake,config,[]);assert.equal(reused.id,j.id);assert.equal(reused.reused,true);
  await assert.rejects(store.create({...intake,brief:'different'},config,[]),/different brief/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
