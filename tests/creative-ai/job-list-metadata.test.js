'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
test('history metadata does not expand saved raster references; generation reads still validate them',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-metadata-')),dir=path.join(root,'output/creative-ai/jobs'),store=new JobStore(dir);
 try{for(const [i,brandId]of ['brand-duroflex','brand-sleepyhead'].entries()){const id='creative-'+i;await fs.mkdir(path.join(dir,id),{recursive:true});await fs.writeFile(path.join(dir,id,'job.json'),JSON.stringify({id,createdAt:'2026-10-29',intake:{brandId,reference:{$studioRaster:{version:1,brandId,sha256:'a'.repeat(64),prefix:'data:image/png;base64,',bytes:12}}},results:[]}));}
 const rows=await store.list({metadataOnly:true});assert.equal(rows.length,2);assert.ok(rows.every(j=>j.intake.reference.$studioRaster));await assert.rejects(store.read('creative-0'));assert.equal((await store.read('creative-0',{hydrate:false})).id,'creative-0');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('project view and saved-edit access do not hydrate reference images',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-view-metadata-'));
 try{const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),runtime=new CreativeRuntime({root,provider:{}}),job=await runtime.store.create({brandId:'brand-duroflex'},runtime.config,[]),dir=runtime.store.dir(job.id),reference={$studioRaster:{version:1,brandId:'brand-duroflex',sha256:'a'.repeat(64),prefix:'data:image/png;base64,',bytes:12}};
 const raw=JSON.parse(await fs.readFile(path.join(dir,'job.json')));raw.intake.reference=reference;await fs.writeFile(path.join(dir,'job.json'),JSON.stringify(raw));await fs.writeFile(path.join(dir,'strategy.json'),JSON.stringify({reference,getWhoToBy:{get:'buyers'}}));
 assert.equal((await runtime.view(job.id)).strategy.get,'buyers');assert.deepEqual(await require('../../lib/creative-ai/runtime/editable-delivery').list(runtime,job.id),[]);await assert.rejects(runtime.editable.read(job.id,'continuity','square'),e=>e.code==='ENOENT'&&e.path.endsWith('editable-continuity-square.json'));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
