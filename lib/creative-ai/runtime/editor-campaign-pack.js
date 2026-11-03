'use strict';
// Revision-bound campaign handoff for the editor. No model calls or approval changes.
const fs=require('./artifact-fs'),path=require('path'),sharp=require('sharp');
const delivery=require('./delivery-packages'),{zip}=require('./carousel-export');
async function build(runtime,id,input){
 const assets=input.assets,format=input.imageFormat||'png';
 if(input.format&&input.format!=='zip'||!['png','jpeg'].includes(format))throw Error('Editor campaign packages use ZIP with PNG or JPEG artwork.');
 if(!Array.isArray(assets)||!assets.length||assets.length>40||assets.some(a=>!a||!['result','edit'].includes(a.type))||new Set(assets.map(a=>a.route+'|'+a.placementId)).size!==assets.length)throw Error('Choose up to 40 campaign artworks, once each.');
 const job=await runtime.store.read(id),brand=await runtime.brands.read(job.intake.brandId),effective=runtime.refinements?await runtime.refinements.effective(job):job;
 const choices=[...assets].sort((a,b)=>a.route.localeCompare(b.route)||job.selection.findIndex(p=>p.id===a.placementId)-job.selection.findIndex(p=>p.id===b.placementId));
 const entries=[],rows=[];const slug=s=>String(s||'campaign').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,70);
 for(const [i,a] of choices.entries()){
  const source=await delivery.source(runtime,job,a);let fields=[],basis='Saved artwork wording; check before publishing.',notes=[];
  if(a.type==='edit'){
   const saved=await runtime.editable.read(id,a.route,a.placementId);if(saved.revision!==a.revision)throw Error('Saved edit changed. Reopen the campaign package.');
   if(saved.fontWarnings?.length)throw Error('Resolve missing fonts before packaging this artwork.');
   fields=saved.document.objects.filter(o=>o.visible!==false&&typeof o.text==='string'&&o.text.trim()).map(o=>({role:o.role,text:o.text}));basis='Visible editable text, in layer order. Text embedded in photographs is not transcribed. Review copy before publishing.';notes.push('Edited artwork needs review.');
  }else{
   try{const original=await runtime.refinements?.source(job,a.route,a.placementId,a.versionId||'original');fields=original?.record?.exactCopy?.fields||[];}catch(e){if(e.code!=='ENOENT'&&!e.message.includes('older creative'))throw e;}
   const result=effective.results.find(r=>r.route===a.route&&r.placementId===a.placementId);const assessment=require('./campaigns').downloadAssessment(effective,result);if(!assessment.ready)notes.push(assessment.note||'Saved artwork needs review.');
  }
  if(notes.length&&input.includeFlagged!==true)throw Error('Selected artwork needs review. Include review notes to download it.');
  let raster=sharp(source.bytes);if(format==='jpeg')raster=raster.flatten({background:'#ffffff'});const bytes=await raster.toFormat(format,{quality:95}).toBuffer(),placement=job.selection.find(p=>p.id===a.placementId);
  const name='artwork/'+String(i+1).padStart(2,'0')+'-'+slug(brand.name)+'-'+slug(placement?.description?.name||a.placementId)+'-'+slug(a.route)+'-'+source.width+'x'+source.height+(a.revision?'-r'+a.revision:'')+'.'+(format==='jpeg'?'jpg':'png');
  const row={file:name,route:a.route,placementId:a.placementId,width:source.width,height:source.height,versionId:a.versionId||'original',revision:a.revision||null,sourceHash:a.artifactHash,sha256:delivery.digest(bytes),reviewNotes:notes,copyBasis:basis,copy:fields.map(f=>f.text).join('\n\n')||'No saved copy available.'};rows.push(row);entries.push({name,bytes});
 }
 // Recheck sources after all rendering; fail instead of delivering a superseded edit.
 for(const choice of choices)await delivery.source(runtime,await runtime.store.read(id),choice);
 entries.push({name:'captions.txt',bytes:rows.map(r=>r.file+'\n'+r.copy+'\n\n'+r.copyBasis).join('\n\n---\n\n')});
 const publishing=runtime.publishing?await runtime.publishing.forExport(id,rows.filter(r=>r.revision===null),false):[];
 if(publishing.length)entries.push({name:'publishing-copy.json',bytes:JSON.stringify(publishing,null,2)},{name:'publishing-copy.txt',bytes:publishing.map(d=>d.channel+' · '+d.route+' · '+d.placementId+'\n'+d.fields.map(f=>f.id+'\n'+f.text).join('\n\n')).join('\n\n---\n\n')});
 const manifest={version:1,jobId:id,brandId:job.intake.brandId,brandName:brand.name,createdAt:new Date().toISOString(),outputs:rows,published:false};
 entries.push({name:'campaign.json',bytes:JSON.stringify(manifest,null,2)},{name:'README.txt',bytes:'Campaign download package\nNumbered images follow saved placement order within each option. Only selected, available artwork is included.\nSee campaign.json for exact versions, dimensions, hashes and review notes. captions.txt contains saved wording, not newly generated social captions. When available, publishing-copy files contain checked channel copy matched to unedited selected versions; edited artwork needs a fresh copy review. Edited and flagged images still need review. This download does not approve or publish artwork.\n'});
 const bytes=zip(entries),exportId=delivery.digest(bytes),name='campaign-'+id+'.zip',dir=path.join(runtime.store.dir(id),'exports',exportId);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,name),bytes);return {bytes,name,exportId,mime:'application/zip'};
}
module.exports={build};
