'use strict';
const fs = require('./artifact-fs');
const path = require('path');
const {zip} = require('./carousel-export');

function imageFile(job, result) {
  const prefix = '/creative-ai/api/jobs/' + job.id + '/files/';
  if (!result.imageUrl?.startsWith(prefix)) throw Error('Campaign image belongs to another job.');
  const name = result.imageUrl.slice(prefix.length);
  if (!/^static-[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(name)) throw Error('Invalid campaign image.');
  return name;
}
function titleFor(job) {
  return job.intake.campaignName || job.productSummary?.name || job.intake.productName ||
    job.intake.brief?.split(/[\n.!?]/)[0]?.slice(0,90) || 'Brand campaign';
}
function reviewState(job) {
  const total = job.selection.length * 2;
  const ready = job.results.filter(r => r.ready && r.qualityVerified && r.imageUrl).length;
  return {total,ready,images:job.results.filter(r=>r.imageUrl).length,
    passed:job.status==='finished' && ready===total && !(job.carousels||[]).some(c=>!c.ready)};
}
function downloadAssessment(job,result) {
  if(!(result.ready&&result.qualityVerified))return {ready:false,note:result.note||'Artwork review has not passed.'};
  const placement=job.selection.find(s=>s.description.id===result.placementId)?.description;
  if(!placement?.carousel)return {ready:true};
  const set=(job.carousels||[]).find(c=>c.route===result.route&&c.carouselId===placement.carousel.id);
  return {ready:!!set?.ready,carouselId:placement.carousel.id,
    note:set?.ready?undefined:set?.note||'The full carousel review has not passed.'};
}
async function library(runtime) {
  const brands = await runtime.brands.list();
  return Promise.all((await runtime.store.list()).map(async original=>{
    const job=runtime.refinements?await runtime.refinements.effective(original):original;
    const state = reviewState(job),brand = brands.find(b=>b.id===job.intake.brandId);
    const formats = [...new Map(job.selection.map(s=>[s.description.formatId||s.description.id,
      {id:s.description.formatId||s.description.id,name:s.description.formatName||s.description.name,
        dimensions:s.description.dimensions,kind:s.description.outputKind||'static'}])).values()];
    let thumbnail=null;
    for(const r of job.results.filter(r=>r.imageUrl).sort((a,b)=>Number(b.ready)-Number(a.ready))) {
      try {const source=runtime.refinements&&r.versionId&&r.versionId!=='original'?await runtime.refinements.source(original,r.route,r.placementId,r.versionId):null;await fs.stat(source?path.join(source.dir,source.name):path.join(runtime.store.dir(job.id),imageFile(job,r)));thumbnail=r.imageUrl;break;}
      catch(e) {if(e.code!=='ENOENT')throw e;}
    }
    return {id:job.id,brandId:job.intake.brandId||null,brandName:brand?.name||new URL(job.intake.brandUrl).hostname,
      title:titleFor(job),createdAt:job.createdAt,status:job.status,
      reviewStatus:state.passed?'passed':['queued','running','preparing'].includes(job.status)?'creating':'attention',
      ...state,formats,thumbnail,brief:job.intake.brief,objective:job.intake.objective,
      productPageUrl:job.intake.productPageUrl||null,jobUrl:'/creative-ai?job='+job.id};
  }));
}
async function bundle(runtime,id,{includeFlagged=true}={}) {
  const original=await runtime.store.read(id),job=runtime.refinements?await runtime.refinements.effective(original):original,entries=[],state=reviewState(job);
  const manifest={version:1,campaign:titleFor(job),jobId:id,brandId:job.intake.brandId||null,
    createdAt:job.createdAt,brief:job.intake.brief,status:job.status,review:state,includeFlagged,outputs:[],excluded:[]};
  for(const r of job.results) {
    if(!r.imageUrl)continue;
    const downloadReview=downloadAssessment(job,r);
    if(!includeFlagged&&!downloadReview.ready){manifest.excluded.push({route:r.route,placementId:r.placementId,reason:downloadReview.note});continue;}
    const p=job.selection.find(s=>s.description.id===r.placementId)?.description;
    const source=runtime.refinements&&r.versionId&&r.versionId!=='original'?await runtime.refinements.source(original,r.route,r.placementId,r.versionId):null;
    const name=r.route+'/'+(source?.name||imageFile(job,r));
    entries.push({name,bytes:await fs.readFile(source?path.join(source.dir,source.name):path.join(runtime.store.dir(id),imageFile(job,r)))});
    manifest.outputs.push({file:name,route:r.route,format:p?.name,dimensions:p?.dimensions,
      ready:r.ready,qualityVerified:r.qualityVerified,score:r.score,note:r.note,downloadReview,versionId:r.versionId||'original',
      idea:r.conceptExplanation,composition:r.compositionRationale});
  }
  if(!entries.length)throw Error(includeFlagged?'No campaign images are available to download yet.':'No images have passed review yet. Include flagged artwork to download it for review.');
  entries.push({name:'campaign.json',bytes:JSON.stringify(manifest,null,2)});
  entries.push({name:'README.txt',bytes:titleFor(job)+'\n'+
    (manifest.outputs.every(r=>r.downloadReview.ready)?'All included artwork and applicable carousel sets passed the app review.':'REVIEW REQUIRED: included outputs or carousel sets are flagged or not yet verified. See campaign.json.')+
    '\n'+manifest.outputs.length+' / '+state.total+' images included. '+manifest.excluded.length+' flagged images excluded.\n'+
    'Artwork contains its text in the generated image. Check cropping and upload eligibility in the publishing application.\n'});
  return zip(entries);
}
module.exports={imageFile,titleFor,reviewState,downloadAssessment,library,bundle};
