'use strict';
const fs=require('./artifact-fs'),path=require('path'),sharp=require('sharp');
const editable=require('./editable'),M=require('./masked-image');
const overlaps=(a,b)=>a.left<b.left+b.width&&a.left+a.width>b.left&&a.top<b.top+b.height&&a.top+a.height>b.top;
const blocking=issues=>(issues||[]).filter(x=>!/^Advisory: /.test(x));
function rectangleMask(boxes,doc){
 const {width:w,height:h}=doc.canvas,region=Buffer.alloc(w*h);
 for(const b of boxes){if((doc.protectedRegions||[]).some(p=>overlaps(b,p)))throw Error('Repair region overlaps a protected product or person. A different composition is required.');
  const x0=Math.max(1,Math.floor(b.left)),y0=Math.max(1,Math.floor(b.top)),x1=Math.min(w-1,Math.ceil(b.left+b.width)),y1=Math.min(h-1,Math.ceil(b.top+b.height));
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)region[y*w+x]=1;
 }M.checkRegion(region,w,h);return region;
}
async function remove(runtime,id,key,source,region,budget,scope,brandId){
 const {width:w,height:h}=await sharp(source).metadata(),size=M.paddedSize(w,h),padded=await sharp(source).extend({right:size.width-w,bottom:size.height-h,background:'#ffffff'}).png().toBuffer(),paddedRegion=Buffer.alloc(size.width*size.height);
 for(let y=0;y<h;y++)region.copy(paddedRegion,y*size.width,y*w,(y+1)*w);
 const mask=await M.pngMask(paddedRegion,size.width,size.height);
 const unitKey=editable.key(scope.route,scope.placementId);await runtime.store.save(id,'composed-mask-'+unitKey+'.png',mask);await runtime.store.save(id,'composed-anchor-'+unitKey+'.png',padded);await runtime.store.save(id,'composed-binding-'+unitKey+'.json',{version:1,brandId,scope,sourceName:'composed-anchor-'+unitKey+'.png',maskName:'composed-mask-'+unitKey+'.png',sourceSha256:M.hash(padded),maskSha256:M.hash(mask)});
 const out=await runtime.provider.generate({prompt:'Repair only transparent masked campaign lettering or campaign logo. Reconstruct the same real surface seamlessly. Remove all letter strokes, antialiasing and ghost lettering inside the mask. Preserve furniture, product construction, physical labels and product markings. Preserve lighting, texture, camera, framing, colours and every unmasked pixel. Do not add lettering, panels, blur patches, logos or new objects.',scope,attachments:[{assetId:'composed-artwork-anchor',ownership:'generated-project-reference',roles:['visual-style'],sha256:M.hash(padded),imageData:'data:image/png;base64,'+padded.toString('base64')}],mask,size:size.width+'x'+size.height,quality:'high',requestKey:M.hash(id+'|component-repair|'+key+'|'+M.hash(padded)+'|'+M.hash(mask))},{...budget,...(budget.brandContext?{brandContext:async()=>({...await budget.brandContext(),dir:runtime.store.dir(id)})}:{})});
 const restored=await M.restore(padded,Buffer.from(out.imageData.split(',')[1],'base64'),paddedRegion);
 if(restored.outsideMaskChangedPixels!==0)throw Error('Repair changed protected pixels');
 await runtime.store.save(id,'repair-pixel-proof-'+key+'.json',{...restored,bytes:undefined,sourceHash:M.hash(source),maskHash:M.hash(mask)});
 return sharp(restored.bytes).extract({left:0,top:0,width:w,height:h}).png().toBuffer();
}
async function readOptional(dir,name){try{return await fs.readJson(path.join(dir,name));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function context(runtime,id,unit){
 const job=await runtime.store.read(id),dir=runtime.store.dir(id),k=editable.key(unit.route,unit.placementId),record=await readOptional(dir,'editable-source-package-'+k+'.json');
 if(!record||record.assignmentId!==id||record.route!==unit.route||record.placementId!==unit.placementId)throw Error('This asset has no compatible saved composition package. Repair requires its original planning checkpoint.');
 const state=await readOptional(dir,'editable-'+k+'.json'),layout=await readOptional(dir,'composition-overlay-'+k+'.json');
 const planned=state?.document||require('./editable-composition').documentFor(record,job.intake.canvasAssets,'/creative-ai/api/jobs/'+id+'/files/photo-'+k+'.png',layout);
 const processing=await readOptional(dir,'composed-processing-'+k+'.json');
 return {job,dir,k,record,state,planned,layout,processing};
}
async function build(runtime,id,ctx,actions,key,budget){
 const {k,record,planned,dir}=ctx,{width:w,height:h}=planned.canvas;
 let doc=structuredClone(planned),source,region=null;
 if(!(actions.length===1&&actions[0]==='export'))doc.compositionPolicy={...doc.compositionPolicy,approvedLogoOverlayVersion:1};
 if(actions.includes('typography')){
  // A NEW composition uses the already validated upstream layout. It never edits frozen reconstruction in place.
  doc=require('./editable-composition').documentFor(record,ctx.job.intake.canvasAssets,'/creative-ai/api/jobs/'+id+'/files/photo-'+k+'.png',ctx.layout);
  doc.compositionPolicy={...planned.compositionPolicy,...doc.compositionPolicy,approvedLogoOverlayVersion:1};
  if(ctx.state?.review?.protectedRegions?.length)doc.protectedRegions=structuredClone(ctx.state.review.protectedRegions);
  const sourceLayout=structuredClone(doc);
  const reflow=await require('./typography-repair').reflow(doc,d=>editable.render(runtime,id,d,'png',{preflight:true}));
  doc=reflow.document;await runtime.store.save(id,'typography-reflow.json',{version:1,attempts:reflow.attempts,changes:reflow.changes});
  require('./composed-quality').assertReadable(doc);
  source=await fs.readFile(path.join(dir,'composed-source-'+k+'.png'));
  const ocr=await require('./review').ocr(path.join(dir,'composed-source-'+k+'.png'));
  if(ocr.status!=='measured')throw Error('Local OCR is unavailable; no paid repair was dispatched');
  const fields=record.exactCopy.fields.filter(f=>f.delivery==='embedded'),selected=require('./saved-copy-layout').select(ocr.rows,fields,sourceLayout);
  if(selected.issues.length||selected.matches.length!==fields.length)throw Error('Campaign text regions are ambiguous; no paid repair was dispatched');
  const raw=await sharp(source).removeAlpha().raw().toBuffer({resolveWithObject:true});region=M.maskFromMatches(raw,selected.matches);
  const boxes=require('./composed-quality').logos(ocr.rows,doc,(await runtime.brands.read(doc.brandId)).name,{symbolPrefix:true});require('./composed-quality').addLogoMask(region,doc,boxes);
  require('./composed-text').assertProtected(selected.matches,doc,region);
  // Verify dimensions and clipping before paying to remove any lettering.
  const measured=await editable.render(runtime,id,{...doc,assets:doc.assets.filter(a=>a.kind!=='photograph'),objects:doc.objects.filter(o=>o.role!=='photograph')});
  const issues=blocking(require('./editable-quality').geometry(doc,measured.measurements));if(issues.length)throw Error('Revised text layout still needs attention: '+issues.join('; '));
 }else if(actions.includes('logo')){
  source=await fs.readFile(path.join(dir,'composed-clean-'+k+'.png'));
  const files=(await fs.readdir(dir)).filter(n=>n.startsWith('composed-frozen-')&&n.endsWith(k+'.json'));
  if(!files.length)throw Error('Frozen typography checkpoint is missing');
  const frozen=await fs.readJson(path.join(dir,files.sort().at(-1)));doc=structuredClone(frozen.document);doc.compositionPolicy={...doc.compositionPolicy,approvedLogoOverlayVersion:1};
  const ocr=await require('./review').ocr(path.join(dir,'composed-clean-'+k+'.png'));if(ocr.status!=='measured')throw Error('Logo location could not be measured');
  const boxes=require('./composed-quality').logos(ocr.rows,doc,(await runtime.brands.read(doc.brandId)).name,{symbolPrefix:true});
  if(!boxes.length)throw Error('The reported logo defect could not be reproduced; inspect before paying for repair');
  region=rectangleMask(boxes,doc);
 }else if(actions.includes('background')){
  if(record.exactCopy.fields.some(f=>f.delivery==='embedded'))throw Error('Clean-image repair is restricted to placements without campaign copy');
  const currentPhoto=doc.objects.find(o=>o.role==='photograph'),currentAsset=doc.assets.find(a=>a.id===currentPhoto?.assetId);if(!currentPhoto||currentPhoto.left!==0||currentPhoto.top!==0||currentPhoto.width!==w||currentPhoto.height!==h||currentPhoto.angle||currentPhoto.flipX||currentPhoto.flipY||(currentPhoto.scaleX??1)!==1||(currentPhoto.scaleY??1)!==1)throw Error('Edited photograph framing requires a reviewed repair candidate');
  source=await fs.readFile(path.join(dir,'composed-source-'+k+'.png'));if(currentAsset?.sha256!==M.hash(source))throw Error('The photograph changed since its review; inspect current artwork before repair');
  const observed=ctx.state?.review?.protectedRegions;
  if(!observed?.length&&planned.compositionPolicy?.productRequired)throw Error('Observed product boundaries are required before removing campaign lettering');
  doc.protectedRegions=observed||doc.protectedRegions||[];
  const ocr=await require('./review').ocr(path.join(dir,'composed-source-'+k+'.png'));if(ocr.status!=='measured')throw Error('Unwanted lettering could not be measured');
  const boxes=(ocr.rows||[]).map(row=>({left:row.box.x*w-4,top:row.box.y*h-4,width:row.box.width*w+8,height:row.box.height*h+8})).filter(b=>!doc.protectedRegions.some(p=>overlaps(b,p)));
  region=rectangleMask(boxes,doc);
 }else{
  if(!ctx.state)throw Error('A saved editable composition is required to retry review or export');
  const photo=doc.assets.find(a=>a.id===doc.objects.find(o=>o.role==='photograph')?.assetId);
  if(!photo)throw Error('Saved background is unavailable');
  source=await fs.readFile(path.join(dir,path.basename(photo.url)));
 }
 let photo=source;
 if(region)photo=await remove(runtime,id,key,source,region,budget,{route:record.route,placementId:record.placementId,conceptId:record.conceptId},doc.brandId);
 const photoName='photo-component-'+key+'.png';await runtime.store.save(id,photoName,photo);
 const photoLayer=doc.objects.find(o=>o.role==='photograph'),asset=doc.assets.find(a=>a.id===photoLayer?.assetId);if(!asset)throw Error('Background binding is unavailable');
 Object.assign(asset,{url:'/creative-ai/api/jobs/'+id+'/files/'+photoName,sha256:M.hash(photo)});delete asset.filename;delete asset.scope;
 if(region){const ocr=await require('./review').ocr(path.join(runtime.store.dir(id),photoName));if(ocr.status!=='measured')throw Error('Repaired pixels saved; OCR check unavailable');
  const residual=(ocr.rows||[]).filter(row=>{const b={left:row.box.x*w,top:row.box.y*h,width:row.box.width*w,height:row.box.height*h};return !doc.protectedRegions?.some(p=>overlaps(b,p))&&(()=>{let n=0;for(let y=Math.max(0,Math.floor(b.top));y<Math.min(h,b.top+b.height);y++)for(let x=Math.max(0,Math.floor(b.left));x<Math.min(w,b.left+b.width);x++)if(region[y*w+x])n++;return n>0;})();});
  if(residual.length)throw Error('Lettering remains inside the repaired region; candidate preserved without another image call');
 }
 require('./wording-agreement').verifyCanvas(record,doc);
 const rendered=await editable.render(runtime,id,doc),checks=require('./editable-quality').compositionChecks(doc,rendered);
 await runtime.store.save(id,'candidate-document.json',doc);await runtime.store.save(id,'after.png',Buffer.from(rendered.data.split(',')[1],'base64'));await runtime.store.save(id,'candidate-checks.json',checks);
 if(blocking(checks.issues).length)throw Error('Candidate did not pass composition checks: '+blocking(checks.issues).join('; '));
 if(actions.length===1&&actions[0]==='export'){
  const previous=ctx.state?.review;if(previous?.compositionChecks?.imageHash!==checks.imageHash)throw Error('Export rebuilt, but the existing review does not cover these exact pixels. Candidate retained for review.');
  const summary={...previous,compositionChecks:checks},readiness=require('./editable-readiness').assess(summary,rendered.issues);
  await runtime.store.save(id,'candidate-review.json',{...summary,...readiness,reusedReview:true});return {doc,rendered,summary,readiness,photoName,sourceHash:M.hash(source),outputHash:M.hash(Buffer.from(rendered.data.split(',')[1],'base64'))};
 }
 const scoped=Object.create(runtime);scoped.provider={...runtime.provider,reason:(request,b)=>runtime.provider.reason(require('./editable-composition').reviewRequest({...request,instructions:request.instructions+' Return no corrections. Inspect this candidate for residual lettering, seams and changes to protected product markings as well as all required checks.'},record),b)};
 const reviewed=await require('./editable-quality').reviewOnce(scoped,id,'component-'+key,doc,rendered,record,budget);
 const proposedCorrections=reviewed.review?.corrections||[];
 const summary={approvedLogoOverlayVersion:doc.compositionPolicy?.approvedLogoOverlayVersion,reviewChecksVersion:doc.compositionPolicy?.reviewChecksVersion,...(doc.compositionPolicy?.briefDirection?{briefDirectionPolicy:doc.compositionPolicy.briefDirection}:{}),briefDirection:reviewed.review?.briefDirection,productFidelity:reviewed.review?.productFidelity,status:reviewed.status,observations:reviewed.review?.observations||[],unresolvedOverlapIds:reviewed.review?.unresolvedOverlapIds||[],protectedRegions:reviewed.review?.protectedRegions||[],compositionChecks:checks,error:reviewed.error,correctionApplied:false,proposedCorrections,...(proposedCorrections.length?{correctionError:'The candidate review proposed changes that were not applied. Candidate retained for inspection; no additional call dispatched.'}:{}),requiresManualReview:true};
 const readiness=require('./editable-readiness').assess(summary,rendered.issues);
 await runtime.store.save(id,'candidate-review.json',{...summary,...readiness});
 return {doc,rendered,summary,readiness,photoName,sourceHash:M.hash(source),outputHash:M.hash(Buffer.from(rendered.data.split(',')[1],'base64'))};
}
module.exports={context,build,rectangleMask,overlaps,blocking};
