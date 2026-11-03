'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const M=require('../../public/creative-ai/studio-model'),{resolve}=require('../../lib/creative-ai/runtime/placements'),knowledge=require('../../lib/creative-ai/treatment-knowledge');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': PMax selected ratios are one ordered image collection with no added campaign text or logo',()=>{
 for(const [choice,expected]of [['Landscape + square + portrait',['landscape','square','portrait']],['Landscape + square',['landscape','square']],['Landscape + portrait',['landscape','portrait']],['Square + portrait',['square','portrait']],['Landscape',['landscape']],['Square',['square']],['Portrait',['portrait']]]){
  const d=M.startDraft(brand,'quick',1);d.outputs[0].staticValues={platform:'PMax',imageRatios:choice};const p=M.generationProfile(d);assert.equal(p.unitCount,expected.length);assert.equal(M.units(d),expected.length);
  const r=resolve({placementIds:p.placementIds,placementLogoPolicyVersion:1,logoTreatmentByPlacement:Object.fromEntries(p.placementIds.map(id=>[id,'omit']))}),s=knowledge.capture(r);
  assert.deepEqual(r.selections.map(s=>s.description.assetSet.slot),expected);assert.ok(s.placements.every(p=>p.treatmentIds.includes('responsive-assets')));assert.ok(r.selections.every(s=>s.jobInputs.logoPolicy.treatment==='omit'));
  const group=M.assetCollections({placements:r.selections.map(s=>s.description)})[0];assert.equal(group.name,'PMax image set');assert.equal(group.count,expected.length);
  const wire=require('../../lib/creative-ai/runtime/copy-wire').wire({concepts:[{conceptId:'continuity'}],placements:r.selections.map(s=>({...s,expanded:s.expanded}))},'Fixture');for(const unit of Object.values(wire.schema.properties.units.properties))assert.equal(unit.properties.fields.maxItems,0);
  if(expected.length>1){const project={placements:r.selections.map(s=>s.description),results:r.selections.map(s=>({placementId:s.id,route:'continuity',imageUrl:'/creative-ai/api/jobs/fixture/files/static-'+s.id+'.png'}))};assert.equal(M.completeSet(project,'continuity',r.selections[0].id).length,expected.length);project.results.pop();assert.equal(M.completeSet(project,'continuity',r.selections[0].id),null);}
 }
});
test('LinkedIn feature/story carousels have dedicated presets, per-slide treatment and one grouped set',()=>{
 for(const platform of ['Feature','Story'])for(const [formatId,height]of [['square',1080],['portrait',1350]]){
  const d=M.startDraft('fixture','quick',9);Object.assign(d.outputs[0],{formatId,width:1080,height,slides:4,staticValues:{platform:'LinkedIn',narrativeType:platform}});const p=M.generationProfile(d);assert.match(p.placementId,/linkedin-carousel/);
  const r=resolve({placementIds:[p.placementId],carouselSlideCount:4}),snapshot=knowledge.capture(r);assert.equal(r.selections.length,4);assert.ok(r.selections.every(s=>s.description.carousel.delivery==='linkedin-document'));assert.ok(snapshot.placements.every(p=>p.treatmentIds.includes('linkedin-document')));assert.equal(M.assetCollections({placements:r.selections.map(s=>s.description)})[0].count,4);
 }
});
test('LinkedIn document exports ordered same-size original pages without changing review status; changed or mixed pages fail',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'linkedin-doc-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const sharp=require('sharp'),report={delivery:'linkedin-document',title:'Fixture carousel',ready:false,slides:[]};
 for(let i=1;i<=3;i++){const bytes=await sharp({create:{width:1080,height:1350,channels:3,background:i===1?'#abc':i===2?'#bca':'#cab'}}).png().toBuffer();await fs.writeFile(path.join(root,'static-'+i+'.png'),bytes);report.slides.push({index:i,imageUrl:'/creative-ai/api/jobs/fixture/files/static-'+i+'.png',artifactHash:crypto.createHash('sha256').update(bytes).digest('hex')});}
 const before=structuredClone(report),pdf=await require('../../lib/creative-ai/runtime/carousel-export').document(report,root),parsed=await require('pdf-lib').PDFDocument.load(pdf);assert.equal(parsed.getPageCount(),3);assert.ok(parsed.getPages().every(p=>p.getWidth()===810&&p.getHeight()===1012.5));assert.deepEqual(report,before);
 const missing=structuredClone(report);missing.slides[1].imageUrl=null;assert.equal(await require('../../lib/creative-ai/runtime/carousel-export').document(missing,root),null);
 const changed=structuredClone(report);changed.slides[0].artifactHash='wrong';await assert.rejects(()=>require('../../lib/creative-ai/runtime/carousel-export').document(changed,root),/source changed/);
 const other=await sharp({create:{width:1000,height:1000,channels:3,background:'#abc'}}).png().toBuffer();await fs.writeFile(path.join(root,'static-2.png'),other);const mixed=structuredClone(report);mixed.slides[1].artifactHash=crypto.createHash('sha256').update(other).digest('hex');await assert.rejects(()=>require('../../lib/creative-ai/runtime/carousel-export').document(mixed,root),/same size/);
});
