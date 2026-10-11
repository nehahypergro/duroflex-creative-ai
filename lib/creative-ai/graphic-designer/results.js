'use strict';
const crypto=require('crypto');const sharp=require('sharp');const {check}=require('../marketing-strategist/schema-validator');const {fingerprint}=require('../art-director');const {reviewChecks}=require('.');
const resultSchema=require('./result.schema.json');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function inspectArtifact(imageData) {
 const m=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(imageData);if(!m)throw Error('Actual local raster image payload required');
 const bytes=Buffer.from(m[2],'base64');if(bytes.length>20*1024*1024||bytes.toString('base64')!==m[2])throw Error('Invalid/big image payload');
 const meta=await sharp(bytes,{limitInputPixels:40000000}).metadata();await sharp(bytes,{limitInputPixels:40000000}).raw().toBuffer();if((meta.pages||1)>1||!['png','jpeg','webp'].includes(meta.format))throw Error('Complete static raster required');
 return {artifactHash:sha(bytes),width:meta.width,height:meta.height,format:meta.format,bytes:bytes.length};
}
async function associateReviewedResults(packages,results,{demo=false}={}) {
 const matches=[],rejected=[];const seen=new Set();
 for(const result of results) {
  try {
   const errors=check(resultSchema,result);if(errors.length)throw Error(errors.join('; '));
   const record=packages.records.find(r=>r.conceptId===result.conceptId&&r.placementId===result.placementId);if(!record)throw Error('Unknown concept/placement');
   const {packageHash,...body}=record;if(fingerprint(body)!==packageHash||result.packageHash!==packageHash||result.assignmentId!==record.assignmentId||result.review.packageHash!==packageHash)throw Error('Stale package/assignment identity');
   if(result.status!=='finished'||result.review.status!=='passed')throw Error('Finished, passed review required');
   if(record.status!=='request-ready')throw Error('Unresolved production package');
   const synthetic=result.artifact.origin==='synthetic-placeholder';
   if(synthetic?(!demo||!record.assignmentDemo||result.review.evidenceStatus!=='synthetic-simulation'):(demo||record.assignmentDemo||result.review.evidenceStatus!=='runtime-review'))throw Error('Synthetic/runtime review boundary mismatch');
   if(result.review.checks.length!==reviewChecks.length||new Set(result.review.checks.map(c=>c.id)).size!==reviewChecks.length||reviewChecks.some(id=>!result.review.checks.some(c=>c.id===id&&c.status==='pass')))throw Error('Every required rendered check must pass');
   const inspected=await inspectArtifact(result.artifact.imageData);if(inspected.artifactHash!==result.review.artifactHash)throw Error('Artifact bytes do not match reviewed hash');
   if(inspected.width!==record.canvas.width||inspected.height!==record.canvas.height||inspected.format!==record.outputFormat)throw Error('Actual canvas/output mismatch');
   if(seen.has(packageHash))throw Error('Duplicate result');seen.add(packageHash);
   matches.push({conceptId:record.conceptId,placementId:record.placementId,packageHash,imageData:result.artifact.imageData,synthetic,compositionRationale:{status:synthetic?'synthetic-intended-choices':'reviewed-artifact-associated-intended-choices',text:record.compositionRationale.text,limits:'Explains intended choices; review association does not prove audience effectiveness.'}});
  } catch(e){rejected.push({conceptId:result.conceptId,placementId:result.placementId,reason:e.message});}
 }
 return {matches,rejected,limits:'Reviews are trusted external attestations bound to exact bytes; this foundation performs raster checks, not independent OCR/vision or reviewer evaluation.'};
}
function renderReviewedResultsHtml(association) {
 return '<!doctype html><html><head><meta charset="utf-8"><title>Reviewed static results</title></head><body>'+association.matches.map(r=>'<article><h2>'+escape(r.conceptId)+' · '+escape(r.placementId)+'</h2>'+(r.synthetic?'<p>Synthetic placeholder — simulated review; no image generation.</p>':'')+'<img width="320" alt="'+escape(r.synthetic?'Synthetic placeholder':'Reviewed static')+'" src="'+escape(r.imageData)+'"><p>'+escape(r.compositionRationale.text)+'</p></article>').join('')+'</body></html>';
}
module.exports={resultSchema,inspectArtifact,associateReviewedResults,renderReviewedResultsHtml};

async function buildReviewerHandoff(record,imageData) {
 const {packageHash,...body}=record;if(fingerprint(body)!==packageHash)throw Error('Production package changed');
 const measurement=await inspectArtifact(imageData);
 const actualChecks=[{id:'dimensions-format',status:measurement.width===record.canvas.width&&measurement.height===record.canvas.height&&measurement.format===record.outputFormat?'pass':'fail',evidence:'Decoded actual static image bytes.'}];
 // Preserve ambiguous byte conventions; inspect bytes without asserting publisher acceptance.
 for(const r of record.placementContext.context.placements[0]?.rules||[])if(r.check.method==='file'&&r.check.maxSize) {
  const [lo,hi]=require('../placement-knowledge').byteRange(r.check.maxSize),fits=n=>r.check.maxSize.exclusive?measurement.bytes<n:measurement.bytes<=n;
  actualChecks.push({id:r.id,status:fits(lo)?'pass':!fits(hi)?'fail':'unknown',evidence:'Actual byte count; ambiguous publisher byte convention stays unknown.',sourceIds:r.sourceIds,tier:r.tier});
 }
 return {version:1,agentId:'reviewer',automatic:true,humanApprovalRequired:false,conceptId:record.conceptId,placementId:record.placementId,packageHash,artifactHash:measurement.artifactHash,artifact:{imageData,measurement},productionStatus:actualChecks.some(c=>c.status==='fail')?'technical-revision-required':'rendered-review-required',actualChecks,pendingRenderedChecks:reviewChecks.filter(id=>id!=='dimensions-format').map(id=>({id,status:'pending',evidence:'Requires actual rendered inspection; no OCR/vision reviewer integrated.'})),exactCopy:record.exactCopy,lockedRules:record.lockedRules,referenceManifest:record.attachmentManifest,compositionRationale:record.compositionRationale};
}
module.exports.buildReviewerHandoff=buildReviewerHandoff;
