'use strict';
// Regression (19 Nov 2026 evening, live recheck after the redeploy): the carousel ZIP / LinkedIn PDF download (19 Nov fix) said
// "This carousel is not complete yet." for a finished Sleepyhead Instagram carousel with all five slides. The saved job
// has no slide list (`placements`); the project page adds one when it shows the job, and the 19 Nov test had built that
// list in by hand. The download now rebuilds the slide order from the job's own formats (output-formats `expand`) and its
// pinned selection, as the job was created. Fails before.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const exp=require('../../lib/creative-ai/runtime/lean-carousel-export'),formats=require('../../lib/creative-ai/runtime/output-formats');
const BRANDS=[{id:'brand-1923d633-e03e-44cc-84b2-bbfb5c152710',name:'Duroflex'},{id:'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de',name:'Sleepyhead'}];
// A job as job.json stores it: intake.placementIds, a pinned selection per slide (id with "_" for ":"), results; no placements.
async function savedJob(t,brandId,preset){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lean-carousel-saved-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const intake={brandId,placementIds:[preset]},profileIds=formats.expand(intake).placementIds,selection=[],results=[];
 for(const [i,profileId] of profileIds.entries()){const id=profileId.replace(':','_'),bytes=await sharp({create:{width:96,height:96,channels:3,background:{r:30*(i+1),g:60,b:90}}}).png().toBuffer(),name='static-lean-saved'+i+'.png';
  await fs.writeFile(path.join(dir,name),bytes);selection.push({id,formatId:id,selectionStatus:'pinned',pin:{profileId}});
  results.push({route:'continuity',placementId:id,imageUrl:'/creative-ai/api/jobs/job-1/files/'+name,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),ready:true});}
 const job={id:'job-1',intake,productSummary:{name:'Test product'},selection,results:[...results].reverse()};
 return {job,count:profileIds.length,runtime:{store:{read:async()=>job,dir:()=>dir}}};
}
for(const b of BRANDS){
 test(b.name+': a saved feed carousel (no slide list in job.json) downloads as a ZIP in slide order',async t=>{
  const f=await savedJob(t,b.id,'custom:studio-carousel-portrait');
  const list=exp.slides(f.job,'continuity');assert.ok(list,'the saved carousel is complete');
  assert.deepEqual(list.map(s=>s.index),Array.from({length:f.count},(_,i)=>i+1));assert.equal(list[0].linkedin,false);
  const zip=await exp.build(f.runtime,'job-1','continuity','zip');assert.equal(zip.type,'application/zip');assert.equal(zip.bytes.subarray(0,2).toString(),'PK');
  await assert.rejects(()=>exp.build(f.runtime,'job-1','continuity','pdf'),/Only LinkedIn/);
 });
 test(b.name+': a saved LinkedIn carousel downloads as a PDF; a missing slide still means not complete',async t=>{
  const f=await savedJob(t,b.id,'custom:studio-linkedin-carousel-square');
  const pdf=await exp.build(f.runtime,'job-1','continuity','pdf');assert.equal(pdf.bytes.subarray(0,4).toString(),'%PDF');
  assert.equal((await require('pdf-lib').PDFDocument.load(pdf.bytes)).getPageCount(),f.count);
  f.job.results.pop();assert.equal(exp.slides(f.job,'continuity'),null);
  await assert.rejects(()=>exp.build(f.runtime,'job-1','continuity','zip'),/not complete/);
 });
}
