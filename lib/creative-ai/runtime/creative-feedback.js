'use strict';
// Append-only examples, deliberately separate from prompt memory and running jobs.
const local=require('fs/promises'),fs=require('./artifact-fs'),path=require('path'),crypto=require('crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function invalid(message){const e=Error(message);e.status=400;return e;}
async function source(runtime,id,input){
 const job=await runtime.store.read(id),base=await runtime.memory.artifact(id,input.route,input.placementId);
 if(input.brandId!==base.brandId)throw invalid('Feedback belongs to a different brand workspace.');
 if(input.creativeVersionId!==base.creativeVersionId)throw invalid('The selected creative version changed. Reopen it before giving feedback.');
 let bytes,meta={...base,editRevision:null};
 if(input.editRevision!=null&&input.editRevision!==''){
  const revision=Number(input.editRevision);if(!Number.isInteger(revision)||revision<1)throw invalid('Choose a valid saved edit revision.');
  // This checks the edit's source image, version, revision and brand without changing them.
  const effective=runtime.refinements?await runtime.refinements.effective(job):job;
  const state=await runtime.editable.read(id,base.route,base.placementId),r=effective.results.find(r=>r.route===base.route&&r.placementId===base.placementId);
  if(state.jobId!==id||state.document.brandId!==base.brandId||state.revision!==revision||state.ocr?.sourceImageUrl&&state.ocr.sourceImageUrl!==r.imageUrl||!state.ocr?.sourceImageUrl&&base.creativeVersionId!=='original')throw invalid('The saved edit changed. Reopen it before giving feedback.');
  bytes=await require('./editable-delivery').preview(runtime,id,base.route,base.placementId,revision);
  meta={...base,editRevision:revision,sourceImageUrl:base.imageUrl,imageUrl:`/creative-ai/api/jobs/${id}/editable/${base.route}/${base.placementId}/preview?revision=${revision}`,artifactHash:hash(bytes),ready:false,qualityVerified:false,reviewStatus:'edited-review-needed'};
 }else{
  const selected=base.creativeVersionId!=='original'?await runtime.refinements.source(job,base.route,base.placementId,base.creativeVersionId):null;
  bytes=await fs.readFile(path.join(selected?.dir||runtime.store.dir(id),selected?.name||base.imageUrl.split('/').pop()));
  if(hash(bytes)!==base.artifactHash)throw invalid('The artwork changed. Reload it before giving feedback.');
 }
 if(input.imageUrl!==meta.imageUrl)throw invalid('The displayed artwork changed. Reopen it before giving feedback.');
 return {job,meta,bytes};
}
function directory(runtime,brand,id){if(!/^brand-[a-zA-Z0-9_-]+$/.test(brand)||!/^[a-zA-Z0-9_-]+$/.test(id))throw invalid('Invalid feedback workspace.');return path.join(runtime.root,'output/creative-ai/feedback',brand,id);}
async function records(runtime,id,brand){const job=await runtime.store.read(id);if(job.intake.brandId!==brand)throw invalid('Feedback belongs to a different brand workspace.');const dir=directory(runtime,brand,id);let names;try{names=await fs.readdir(dir);}catch(e){if(e.code==='ENOENT')return [];throw e;}const rows=await Promise.all(names.filter(n=>/^feedback-[a-f0-9-]{36}\.json$/.test(n)).map(async n=>JSON.parse(await fs.readFile(path.join(dir,n),'utf8'))));return rows.filter(r=>r.jobId===id&&r.brandId===brand).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));}
async function inspect(runtime,id,input){const {meta}=await source(runtime,id,input),rows=await records(runtime,id,meta.brandId);return {source:meta,latest:rows.filter(r=>r.route===meta.route&&r.placementId===meta.placementId&&r.creativeVersionId===meta.creativeVersionId&&r.editRevision===meta.editRevision&&r.artifactHash===meta.artifactHash).at(-1)||null};}
async function save(runtime,id,input){
 if(!['like','dislike'].includes(input.rating))throw invalid('Choose Like or Dislike.');
 if(typeof input.reason!=='string'||input.reason.length>2000||input.rating==='dislike'&&!input.reason.trim())throw invalid('Please explain what you disliked (up to 2,000 characters).');
 if(!/^[a-f0-9-]{36}$/.test(input.requestId||''))throw invalid('A feedback request identifier is required.');
 const identity=hash(JSON.stringify({jobId:id,brandId:input.brandId,route:input.route,placementId:input.placementId,imageUrl:input.imageUrl,creativeVersionId:input.creativeVersionId,editRevision:input.editRevision||null,artifactHash:input.artifactHash,rating:input.rating,reason:input.reason.trim()})),dir=directory(runtime,input.brandId,id),name='feedback-'+input.requestId,file=path.join(dir,name+'.json');
 const prior=async()=>{try{const row=JSON.parse(await fs.readFile(file,'utf8'));if(row.requestHash!==identity)throw invalid('This feedback request was already used. Reload before submitting again.');return row;}catch(e){if(e.code==='ENOENT')return null;throw e;}};
 const job=await runtime.store.read(id);if(job.intake.brandId!==input.brandId)throw invalid('Feedback belongs to a different brand workspace.');const existing=await prior();if(existing)return existing;
 const captured=await source(runtime,id,input);if(input.artifactHash!==captured.meta.artifactHash)throw invalid('The artwork changed. Reload it before giving feedback.');
 const imageMeta=await require('sharp')(captured.bytes).metadata(),ext=imageMeta.format==='jpeg'?'jpg':imageMeta.format;
 const record={version:1,id:name,...captured.meta,rating:input.rating,reason:input.reason.trim(),createdAt:new Date().toISOString(),requestHash:identity,imageSnapshot:name+'.'+ext,width:imageMeta.width,height:imageMeta.height,brief:captured.job.intake.brief||null,captureMode:'stored-only',trainingStatus:'unreviewed',approvedLearningExample:false,learningEligible:false,actor:{kind:'local-operator',attribution:'Not independently authenticated'}};
 const latest=await source(runtime,id,input);if(latest.meta.artifactHash!==record.artifactHash)throw invalid('The artwork changed while saving feedback. Reopen it and try again.');
 await local.mkdir(dir,{recursive:true});try{await local.writeFile(path.join(dir,record.imageSnapshot),captured.bytes,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;if(hash(await fs.readFile(path.join(dir,record.imageSnapshot)))!==record.artifactHash)throw invalid('Feedback snapshot conflict. Reload and try again.');}
 const temp=path.join(dir,'.pending-'+crypto.randomUUID());await local.writeFile(temp,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});try{await local.link(temp,file);return record;}catch(e){if(e.code==='EEXIST')return prior();throw e;}finally{await local.rm(temp,{force:true});}
}
module.exports={inspect,save,records};
