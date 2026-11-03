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
test('both brands: collection delivery uses current manual edits, keeps review pending and rejects stale revisions',{timeout:60000},async()=>{
 const f=await fixture();try{const delivery=require('../../lib/creative-ai/runtime/delivery-packages');
 for(const job of f.jobs){const initial=await f.runtime.editable.convert(job.id,'continuity','square',{imageUrl:job.results[0].imageUrl});await f.runtime.editable.save(job.id,{route:'continuity',placementId:'square',expectedRevision:0,document:initial.document});
 const choices=await delivery.candidates(f.runtime,job.id),edit=choices.items.find(c=>c.type==='edit');assert.ok(edit,'edited source is available');assert.equal(edit.revision,1);
 await f.runtime.store.update(job.id,j=>{j.intake.customProfiles=[{id:'square',canvas:{width:600,height:600,unit:'px'},exportContract:{formats:['png'],maxBytes:1000000}}];return j;});
 const pack=await delivery.create(f.runtime,job.id,{kind:'static',brandName:choices.brandName,assets:[edit]});assert.equal(pack.checks.find(c=>c.id==='selected-byte-limit-0').status,'pass');assert.equal(pack.checks.find(c=>c.id==='selected-canvas-0').status,'pass');assert.equal(pack.sources[0].revision,1);assert.equal(pack.sources[0].artifactHash,edit.artifactHash);assert.equal(pack.status,'checks-pending');assert.equal(pack.sources[0].reviewStatus,'edited-review-needed');assert.ok(!pack.files.some(f=>f.name.includes('review.json')));
 await f.runtime.editable.save(job.id,{route:'continuity',placementId:'square',expectedRevision:1,document:initial.document});await assert.rejects(()=>delivery.create(f.runtime,job.id,{kind:'static',brandName:choices.brandName,assets:[edit]}),/changed|revision/);
 const latest=(await delivery.candidates(f.runtime,job.id)).items.find(c=>c.type==='edit');await assert.rejects(()=>delivery.source(f.runtime,job,{...latest,artifactHash:'wrong'}),/changed/);
 await f.runtime.store.update(job.id,j=>{j.results[0].imageUrl=j.results[0].imageUrl.replace('-0.png','-1.png');return j;});const changed=await f.runtime.store.read(job.id);await assert.rejects(()=>delivery.source(f.runtime,changed,latest),/source|changed/);
 assert.equal((await f.runtime.store.read(job.id)).budget.imageCalls,0);
 }
 }finally{await f.cleanup();}
});

test('both brands: default sets preserve exact ordered bytes, readable names and reject incomplete or outdated selections',{timeout:90000},async()=>{
 const f=await fixture();try{const delivery=require('../../lib/creative-ai/runtime/delivery-packages');
 for(const job of f.jobs){const sleepy=job.intake.brandId.includes('sleepyhead'),brand=sleepy?'Sleepyhead':'Duroflex',product=sleepy?'Napster Mini':'Airboost';await f.runtime.brands.save(job.intake.brandId,'brand.json',{...(await f.runtime.brands.read(job.intake.brandId)),name:brand});
 await f.runtime.store.update(job.id,j=>{j.intake.productName=product;j.selection[0].description.name='Product hero';j.selection.push({id:'detail',description:{id:'detail',name:'Material detail',dimensions:{width:600,height:600}}});j.results.push({...j.results[0],placementId:'detail'});return j;});
 const choices=await delivery.candidates(f.runtime,job.id),data={kind:'static',brandName:brand,clientSet:{route:'continuity',placementId:'square'},assets:choices.items.filter(a=>a.type==='result')};
 for(const assets of [data.assets.slice(0,1),[...data.assets].reverse(),[data.assets[0],data.assets[0]]])await assert.rejects(()=>delivery.create(f.runtime,job.id,{...data,assets}),/missing|order/);
 const pack=await delivery.create(f.runtime,job.id,data),files=pack.files.filter(f=>f.name.startsWith('assets/'));assert.equal(files.length,2);assert.match(files[0].name,new RegExp('01_'+brand+'_'+product.replace(/ /g,'-')+'_Product-hero_600x600_Option-1_Original.png'));assert.match(files[1].name,/02_.*Material-detail/);assert.equal(files[0].sha256,data.assets[0].artifactHash);assert.equal(files[1].sha256,data.assets[1].artifactHash);assert.equal(pack.status,'checks-pending');
 const zip=await fs.readFile(path.join(f.runtime.store.dir(job.id),pack.downloadUrl.split('/').pop()));assert.ok(!zip.includes(Buffer.from('native-fields')));assert.ok(!zip.includes(Buffer.from('manifest.json')));assert.ok(!zip.includes(Buffer.from(job.id)));assert.ok(zip.includes(Buffer.from('READ-ME.txt')));
 const jpegPack=await delivery.create(f.runtime,job.id,{...data,exportFormat:'jpeg'});assert.ok(jpegPack.files.filter(f=>f.name.startsWith('assets/')).every(f=>f.name.endsWith('.jpg')));assert.ok(jpegPack.sources.every(s=>s.format==='jpeg'&&s.width===600&&s.height===600));
 const initial=await f.runtime.editable.convert(job.id,'continuity','square',{imageUrl:job.results[0].imageUrl});await f.runtime.editable.save(job.id,{route:'continuity',placementId:'square',expectedRevision:0,document:initial.document});await assert.rejects(()=>delivery.create(f.runtime,job.id,data),/newer saved edit/);
 const current=await delivery.candidates(f.runtime,job.id),edit=current.items.find(c=>c.type==='edit');const latest={...data,assets:[edit,data.assets[1]]};const edited=await delivery.create(f.runtime,job.id,latest);assert.match(edited.files[0].name,/Edit-1.png/);assert.equal(edited.files[0].sha256,edit.artifactHash);assert.equal(edited.sources[0].reviewStatus,'edited-review-needed');
 await f.runtime.store.update(job.id,j=>{j.selection[1].description.dimensions.width=1200;return j;});await assert.rejects(()=>delivery.create(f.runtime,job.id,latest),/sizes or file/);assert.equal((await f.runtime.store.read(job.id)).budget.imageCalls,0);
 }
 }finally{await f.cleanup();}
});
