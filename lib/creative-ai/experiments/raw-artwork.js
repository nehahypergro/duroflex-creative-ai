'use strict';
// Opt-in, saved-plan experiment. Never installed into the main generation pipeline.
const fs=require('../runtime/artifact-fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const version=1;
function unit(route,placementId){if(!['continuity','exploration'].includes(route)||!/^[-a-zA-Z0-9_]+$/.test(placementId||''))throw Error('Choose a saved image placement');return route+'-'+placementId;}
async function source(runtime,{sourceId,route,placementId}){
 const k=unit(route,placementId),job=await runtime.store.read(sourceId),dir=runtime.store.dir(sourceId);
 if(job.intake.rawArtworkExperimentVersion)throw Error('Choose the original planned project as the source');
 const record=await fs.readJson(path.join(dir,'editable-source-package-'+k+'.json'));
 if(record.assignmentId!==sourceId||record.route!==route||record.placementId!==placementId)throw Error('Saved plan does not match this project');
 const layout=await fs.readJson(path.join(dir,'composition-overlay-'+k+'.json'));
 if(layout.brandId!==job.intake.brandId)throw Error('Saved layout belongs to a different brand');
 const name='composed-source-'+k+'.png';await fs.access(path.join(dir,name));
 return {job,record,layout,k,name,dir};
}
async function preview(runtime,input){
 const s=await source(runtime,input),brand=await runtime.brands.read(s.job.intake.brandId);
 return {sourceId:s.job.id,brandId:brand.id,brand:brand.name,product:s.job.intake.productName,brief:s.job.intake.brief,canvas:s.record.canvas,route:input.route,placementId:input.placementId,imageUrl:'/creative-ai/api/experiments/raw-artwork?image=1&'+new URLSearchParams({sourceId:s.job.id,route:input.route,placementId:input.placementId}),status:'unreviewed',note:'Original generated artwork. Automated reviews and editable conversion are skipped in this experiment.'};
}
async function prepare(runtime,input){
 if(!/^raw-artwork-[a-zA-Z0-9-]{8,70}$/.test(input.requestKey||''))throw Error('A stable experiment request key is required');
 const s=await source(runtime,input),brand=await runtime.brands.read(s.job.intake.brandId);
 if(brand.latestResearchId!==s.job.intake.researchId||runtime.brands.revision(brand)!==s.job.intake.brandKnowledge.revision)throw Error('Brand guidance changed. Create a fresh planned project before using this experiment.');
 const intake={...s.job.intake,requestKey:input.requestKey,rawArtworkExperimentVersion:version,rawArtworkSource:{id:s.job.id,route:input.route,placementId:input.placementId},clientVisibility:'internal',campaignName:'Raw artwork experiment · '+(s.job.intake.productName||brand.name)};
 const prior=await runtime.store.findRequest(input.requestKey);
 if(prior){const old=await runtime.store.read(prior.id);if(JSON.stringify(old.intake.rawArtworkSource)!==JSON.stringify(intake.rawArtworkSource)||old.intake.rawArtworkExperimentVersion!==version)throw Error('Request key already belongs to a different experiment');return {id:old.id,reused:true};}
 const cost=await require('../local-queue/cost-preflight.cjs').preflight(runtime.root);
 if(cost.remainingInr<cost.additionalUnknownReserveInr+cost.perJobInr)throw Error('Testing allowance is insufficient; existing outputs are preserved');
 const selection=s.job.selection.filter(x=>x.id===input.placementId||x.id.replace(':','_')===input.placementId);
 if(selection.length!==1)throw Error('Select one saved static placement');
 const job=await runtime.store.create(intake,{...runtime.config,initialStatus:'preparing',estimatedSpend:{...runtime.config.estimatedSpend,maxUsd:cost.perJobInr/cost.fx.usdToInr}},selection);
 if(job.reused)return {id:job.id,reused:true};
 try{
  await runtime.store.update(job.id,j=>{j.budget.maxImageCalls=1;j.budget.maxReasoningCalls=0;j.preferenceMemory=s.job.preferenceMemory;j.brandStyleMemory=s.job.brandStyleMemory;j.brandStyleExecutionHashes=s.job.brandStyleExecutionHashes;return j;});
  await runtime.store.save(job.id,'experiment-cost-admission.json',cost);
  // Copy evidence, never old receipts, verdicts, checkpoints or user edits.
  for(const name of await fs.readdir(s.dir))if(/^research(?:-[a-z0-9-]+)?\.json$/.test(name))await runtime.store.save(job.id,name,await fs.readJson(path.join(s.dir,name)));
  const record={...s.record,assignmentId:job.id},doc=require('../runtime/editable-composition').documentFor(record,intake.canvasAssets,'',s.layout);
  require('../runtime/editable-composition').applyPolicies(doc,intake);
  const request=await require('../runtime/composed-text').sourceRequest(await runtime.store.read(job.id),record,doc,job.id,s.k);
  // Reuse the saved composition guide without running another layout check.
  const guideName='composed-type-guide-'+s.k+'.png',guide=await fs.readFile(path.join(s.dir,guideName));
  const binding=await fs.readJson(path.join(s.dir,'composed-type-guide-'+s.k+'.json'));
  await runtime.store.save(job.id,guideName,guide);await runtime.store.save(job.id,'composed-type-guide-'+s.k+'.json',{...binding,jobId:job.id});
  request.attachments.push({assetId:'composed-type-guide',ownership:'generated-project-reference',roles:['composition-guide'],brandId:intake.brandId,jobId:job.id,sha256:hash(guide),imageData:'data:image/png;base64,'+guide.toString('base64')});
  await runtime.store.save(job.id,'raw-artwork-request.json',request);
  await runtime.store.save(job.id,'raw-artwork-provenance.json',{version,sourceId:s.job.id,brandId:intake.brandId,route:input.route,placementId:input.placementId,sourcePlanHash:hash(JSON.stringify({record:s.record,layout:s.layout})),reviewStatus:'skipped',editableReconstruction:'skipped',repair:'skipped',ocr:'skipped'});
  await runtime.store.update(job.id,j=>{j.status='running';return j;});
  return {id:job.id,reused:false};
 }catch(e){await runtime.store.update(job.id,j=>{j.status='failed';j.error=String(e.message||e);return j;});throw e;}
}
async function run(runtime,id){
 return require('../runtime/file-lock').withLock(path.join(runtime.store.dir(id),'.raw-artwork.lock'),async()=>{
 const job=await runtime.store.read(id);
 if(job.intake.rawArtworkExperimentVersion!==version)throw Error('Raw artwork runner accepts experiment jobs only');
 if(job.status==='finished')return;
 const request=await fs.readJson(path.join(runtime.store.dir(id),'raw-artwork-request.json'));
 try{
  const out=await runtime.provider.generate(request,runtime.store.budget(id));
  const bytes=Buffer.from(out.imageData.split(',')[1],'base64'),meta=await sharp(bytes).metadata();
  // Save exact provider bytes. No resize, crop, OCR, review, erasure or overlays.
  const name='raw-artwork.'+({jpeg:'jpg',png:'png',webp:'webp'}[meta.format]||'bin');
  if(name.endsWith('.bin'))throw Error('The provider did not return a supported image');
  await runtime.store.save(id,name,bytes);
  await runtime.store.update(id,j=>{j.status='finished';j.error=null;j.updatedAt=new Date().toISOString();j.results=[{route:request.scope.route,placementId:request.scope.placementId,imageUrl:'/creative-ai/api/jobs/'+id+'/files/'+name,editable:false,ready:false,qualityVerified:false,status:'unreviewed',userNote:'Experiment: original generated artwork; reviews skipped.',width:meta.width,height:meta.height,sha256:hash(bytes)}];return j;});
 }catch(e){await runtime.store.update(id,j=>{j.status='failed';j.error=String(e.message||e);return j;});throw e;}
 });
}
async function status(runtime,id){const j=await runtime.store.read(id);if(j.intake.rawArtworkExperimentVersion!==version)throw Error('Not a raw artwork experiment');return {id,status:j.status,error:j.error,createdAt:j.createdAt,updatedAt:j.updatedAt,results:(j.results||[]).map(r=>({...r,imageUrl:'/creative-ai/api/experiments/raw-artwork?image=1&id='+encodeURIComponent(id)})),reviewStatus:'skipped'};}
async function submit(runtime,input){const result=await prepare(runtime,input);if(!result.reused){runtime.rawArtworkTasks??=new Map();const task=run(runtime,result.id).catch(e=>console.error('Raw artwork experiment '+result.id+': '+String(e.message||e))).finally(()=>runtime.rawArtworkTasks.delete(result.id));runtime.rawArtworkTasks.set(result.id,task);}return result;}
async function image(runtime,input){
 let dir,name;
 if(input.id){const j=await runtime.store.read(input.id);if(j.intake.rawArtworkExperimentVersion!==version||j.status!=='finished')throw Error('Experiment image unavailable');name=j.results?.[0]?.imageUrl?.split('/').pop();if(!/^raw-artwork\.(png|jpg|webp)$/.test(name||''))throw Error('Invalid experiment image');dir=runtime.store.dir(input.id);}
 else{const saved=await source(runtime,input);dir=saved.dir;name=saved.name;}
 return {bytes:await fs.readFile(path.join(dir,name)),mime:name.endsWith('.jpg')?'image/jpeg':name.endsWith('.webp')?'image/webp':'image/png'};
}
module.exports={version,unit,source,preview,prepare,run,status,submit,image};
