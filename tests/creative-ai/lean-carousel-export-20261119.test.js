'use strict';
// Regression (19 Nov 2026, live QA): lean carousels (Duroflex Strength Plus LinkedIn carousel, LiveIn 100% feed carousel)
// had all five slides saved but no carousel package, so the download page offered no carousel ZIP and LinkedIn
// carousels no PDF. The ZIP and the LinkedIn PDF are now built on request from the saved, hash-checked slides.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const exp=require('../../lib/creative-ai/runtime/lean-carousel-export');
const BRANDS=['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'];
async function fixture(t,brandId,{kind='LinkedIn carousel document · square',count=3,missing=false}={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lean-carousel-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const placements=[],results=[];
 for(let i=1;i<=count;i++){const bytes=await sharp({create:{width:108,height:108,channels:3,background:{r:20*i,g:40,b:90}}}).png().toBuffer();const name='static-lean-slide'+i+'.png';await fs.writeFile(path.join(dir,name),bytes);
  placements.push({id:'slide-'+i,name:kind+' · Slide '+i+' of '+count,carousel:{id:'custom:'+kind,index:i,count,name:kind,...(/LinkedIn/.test(kind)?{delivery:'linkedin-document'}:{})}});if(!(missing&&i===count))results.push({route:'continuity',placementId:'slide-'+i,imageUrl:'/creative-ai/api/jobs/job-1/files/'+name,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),ready:i!==2});}
 const job={id:'job-1',intake:{brandId},productSummary:{name:'Test mattress'},placements:[...placements].reverse(),results};
 return {dir,job,runtime:{store:{read:async()=>job,dir:()=>dir}}};
}
for(const brandId of BRANDS){
 test(brandId.slice(0,14)+': a LinkedIn carousel downloads as a PDF and a ZIP, slides in publishing order',async t=>{
  const f=await fixture(t,brandId);
  const pdf=await exp.build(f.runtime,'job-1','continuity','pdf');assert.equal(pdf.type,'application/pdf');assert.equal(pdf.bytes.subarray(0,4).toString(),'%PDF');
  const doc=await require('pdf-lib').PDFDocument.load(pdf.bytes);assert.equal(doc.getPageCount(),3);
  const zip=await exp.build(f.runtime,'job-1','continuity','zip');assert.equal(zip.type,'application/zip');
  const text=zip.bytes.toString('latin1');assert.ok(text.indexOf('slide-01.png')<text.indexOf('slide-02.png')&&text.indexOf('slide-02.png')<text.indexOf('slide-03.png'));
  assert.match(text,/REVIEW REQUIRED/,'a flagged slide is reported in the ZIP');
 });
 test(brandId.slice(0,14)+': a feed carousel gets a ZIP but no PDF; an incomplete or changed set is refused',async t=>{
  const feed=await fixture(t,brandId,{kind:'Carousel · square'});
  assert.equal((await exp.build(feed.runtime,'job-1','continuity','zip')).type,'application/zip');
  await assert.rejects(()=>exp.build(feed.runtime,'job-1','continuity','pdf'),e=>e.status===404);
  const part=await fixture(t,brandId,{missing:true});await assert.rejects(()=>exp.build(part.runtime,'job-1','continuity','zip'),e=>e.status===404);
  const changed=await fixture(t,brandId);changed.job.results[0].sha256='0'.repeat(64);await assert.rejects(()=>exp.build(changed.runtime,'job-1','continuity','zip'),/changed/);
 });
}
