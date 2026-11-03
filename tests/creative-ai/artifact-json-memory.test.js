'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const files=require('../../lib/creative-ai/runtime/artifact-fs'),{JobStore}=require('../../lib/creative-ai/runtime/store');
for(const brandId of ['brand-duroflex','brand-sleepyhead'])test('direct JSON hydration retains pixels and rejects corrupt brand blobs: '+brandId,async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'json-memory-')),store=new JobStore(path.join(root,'jobs'));
 try{const id='creative-fixture';await store.save(id,'job.json',{id,intake:{brandId},storageVersion:1});const image='data:image/png;base64,'+Buffer.alloc(1024*1024,7).toString('base64'),value={images:[image,image],note:'exact'};await store.save(id,'art.json',value);
 assert.equal(typeof files.readJson,'function');const out=await files.readJson(path.join(store.dir(id),'art.json'));assert.deepEqual(out,value);
 const raw=JSON.parse(await fs.readFile(path.join(store.dir(id),'art.json')));assert(raw.images[0].$studioRaster);raw.images[0].$studioRaster.brandId='brand-foreign';await fs.writeFile(path.join(store.dir(id),'art.json'),JSON.stringify(raw));await assert.rejects(files.readJson(path.join(store.dir(id),'art.json')),/cross-brand/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
