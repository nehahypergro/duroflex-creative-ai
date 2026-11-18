'use strict';
// Lean carousel export (19 Nov 2026, live QA): the lean flow saves each carousel slide as its own design but never built
// the carousel package the old flow made (finishCarouselSet), so new carousels offered no carousel ZIP and LinkedIn
// carousels no PDF, although the format card promises "PDF slides". This builds both on request from the saved,
// hash-checked original slides, in publishing order. No provider call; nothing is saved.
const path=require('path'),crypto=require('crypto'),fs=require('./artifact-fs'),exporter=require('./carousel-export');
const SLIDE=/Slide (\d+) of (\d+)/i;
// The carousel's slides for one route, in order, or null when the set is incomplete. Placements carry
// carousel {id,index,count,delivery}; older records fall back to "Slide i of n" in the name.
function placementsOf(job){
 const withMeta=(job.placements||[]).filter(p=>p.carousel?.id&&Number.isInteger(p.carousel.index));
 if(withMeta.length){const id=withMeta[0].carousel.id,set=withMeta.filter(p=>p.carousel.id===id);return set.map(p=>({p,index:p.carousel.index,count:p.carousel.count,linkedin:p.carousel.delivery==='linkedin-document'}));}
 return (job.placements||[]).map(p=>({p,m:SLIDE.exec(p.name||'')})).filter(x=>x.m).map(x=>({p:x.p,index:Number(x.m[1]),count:Number(x.m[2]),linkedin:/linkedin/i.test(x.p.name)}));
}
function slides(job,route){
 const rows=placementsOf(job);if(rows.length<2)return null;
 const total=rows[0].count;if(rows.length!==total||rows.some(x=>x.count!==total))return null;
 rows.sort((a,b)=>a.index-b.index);if(rows.some((x,i)=>x.index!==i+1))return null;
 const out=[];
 for(const x of rows){const r=(job.results||[]).find(r=>r.route===route&&r.placementId===x.p.id&&r.imageUrl);if(!r)return null;out.push({index:x.index,placementId:x.p.id,name:x.p.name,linkedin:x.linkedin,imageUrl:r.imageUrl,artifactHash:r.sha256||null,ready:r.ready===true});}
 return out;
}
const linkedin=list=>list.every(s=>s.linkedin);
function report(job,route){
 const list=slides(job,route);if(!list)return null;
 return {version:1,title:(job.productSummary?.name||job.intake?.campaignName||'Carousel')+' carousel',route,ready:list.every(s=>s.ready),delivery:linkedin(list)?'linkedin-document':'feed',
  note:'Original generated artwork in publishing order; edited versions are downloaded from each design. Built on request from the saved slides.',slides:list};
}
async function build(runtime,id,route,format){
 const job=await runtime.store.read(id),r=report(job,route);
 if(!r)throw Object.assign(Error('This carousel is not complete yet.'),{status:404});
 const dir=runtime.store.dir(id);
 for(const s of r.slides){const name=String(s.imageUrl).split('/').pop();if(!/^static-[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(name))throw Error('Invalid carousel slide file.');const bytes=await fs.readFile(path.join(dir,name));const sha=crypto.createHash('sha256').update(bytes).digest('hex');if(s.artifactHash&&s.artifactHash!==sha)throw Error('A saved slide changed; download stopped.');s.artifactHash=sha;}
 if(format==='pdf'){if(r.delivery!=='linkedin-document')throw Object.assign(Error('Only LinkedIn carousels download as a PDF.'),{status:404});const pdf=await exporter.document(r,dir);if(!pdf)throw Error('This carousel could not be made into a PDF.');return {bytes:pdf,type:'application/pdf',name:'linkedin-carousel.pdf'};}
 return {bytes:await exporter.bundle(r,dir),type:'application/zip',name:'carousel.zip'};
}
module.exports={slides,report,build};
