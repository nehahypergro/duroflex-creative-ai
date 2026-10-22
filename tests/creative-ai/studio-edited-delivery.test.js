'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path');
const {fixture}=require('./editor-qa-fixture.cjs');
test('both brands: latest edit preview and recovery copy preserve originals and concurrent saved work',{timeout:60000},async()=>{
 const f=await fixture();try{const delivery=require('../../lib/creative-ai/runtime/editable-delivery');
 for(const job of f.jobs){const initial=await f.runtime.editable.convert(job.id,'continuity','square',{imageUrl:job.results[0].imageUrl}),doc=structuredClone(initial.document);doc.objects.push({id:'user-test',role:'headline',type:'text',left:20,top:20,width:400,height:80,text:'Client edit',fontId:doc.fonts[0].id,fontSize:30,fill:'#ffffff',align:'left',lineHeight:1.2,charSpacing:0});const saved=await f.runtime.editable.save(job.id,{route:'continuity',placementId:'square',expectedRevision:0,document:doc});
 const entries=await delivery.list(f.runtime,job.id);assert.equal(entries.length,1);assert.equal(entries[0].revision,1);assert.equal(entries[0].sourceImageUrl,job.results[0].imageUrl);
 const png=await delivery.preview(f.runtime,job.id,'continuity','square',1);assert.ok(png.length>100);assert.deepEqual(await delivery.preview(f.runtime,job.id,'continuity','square',1),png);
 await assert.rejects(()=>delivery.preview(f.runtime,job.id,'continuity','square',0),/changed|revision/);
 const recovered=await delivery.saveCopy(f.runtime,job.id,'continuity','square',{document:initial.document,baseRevision:0});assert.equal(recovered.revision,1);assert.equal(recovered.copies.length,1);assert.deepEqual(recovered.document,doc);assert.deepEqual(recovered.original,initial.original);assert.deepEqual(await delivery.readCopy(f.runtime,job.id,'continuity','square',recovered.copies[0].id),initial.document);
 const foreign=structuredClone(doc);foreign.brandId='brand-other';await assert.rejects(()=>delivery.saveCopy(f.runtime,job.id,'continuity','square',{document:foreign}),/brand/);
 assert.equal((await f.runtime.store.read(job.id)).budget.imageCalls,0);assert.equal(saved.revision,1);
 }
 }finally{await f.cleanup();}
});
