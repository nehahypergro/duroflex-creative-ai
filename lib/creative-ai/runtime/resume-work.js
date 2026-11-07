'use strict';
const fs=require('fs/promises'),path=require('path'),{fingerprint}=require('../art-director');
const activeStatuses=['queued','running','preparing'];
const deadline=job=>job.generationRecovery?.status==='running'?job.generationRecovery.deadline:require('./processing-deadline')(job);
const locallyActive=(runtime,id)=>runtime.active?.has(id)||runtime.pending?.includes(id);
const extensionMs=runtime=>{const ms=runtime.config?.jobTimeoutMs;return Number.isSafeInteger(ms)&&ms>0?Math.min(ms,45*60*1000):45*60*1000;};
// A persisted "running" flag is not evidence that a worker still owns this job.
// Recheck under the same lock used by the runner; never steal a live lock.
async function reconcileExpired(runtime,id){
 let job=await runtime.store.read(id,{hydrate:false});
 const eligible=j=>!j.localExecution&&activeStatuses.includes(j.status)&&deadline(j)<=Date.now()&&!locallyActive(runtime,id);
 if(!eligible(job))return job;
 let release;try{release=await require('./file-lock').acquire(path.join(runtime.store.dir(id),'.runner.lock'),{timeoutMs:100});}catch(e){if(e.code==='SHARED_WRITER_BUSY')return job;throw e;}
 try{return await runtime.store.update(id,j=>{
  if(!eligible(j))return j;
  const at=new Date().toISOString(),prior={status:j.status,stage:j.stage||null,error:j.error||null,deadline:deadline(j)};
  j.startupInterruptions??=[];j.startupInterruptions.push({...prior,at,reason:'processing-window-expired'});
  j.status=(j.results||[]).length?'partial':'failed';j.error='Processing was interrupted and its time window expired. Saved work is preserved. Continue saved work after checking outstanding requests.';
  j.errorCode='PROCESSING_WINDOW_EXPIRED';j.updatedAt=at;
  if(j.generationRecovery?.status==='running'){j.generationRecovery.status='interrupted';j.generationRecovery.interruptedAt=at;}
  return j;
 },{hydrate:false});}finally{await release();}
}
async function recoverStartup(runtime,{schedule=true}={}){
 const report={scheduled:[],interrupted:[],errors:[]};
 for(const saved of await runtime.store.list({metadataOnly:true})){
  if(saved.localExecution||!activeStatuses.includes(saved.status))continue;
  try{
   const job=await reconcileExpired(runtime,saved.id);
   if(!activeStatuses.includes(job.status)){report.interrupted.push(job.id);continue;}
   if(schedule&&['queued','running'].includes(job.status)&&deadline(job)>Date.now()&&!(job.intake.retryMode==='verification'&&job.budget.maxImageCalls===0)&&!job.intake.textLayerExperimentVersion){runtime.schedule(job.id);report.scheduled.push(job.id);}
  }catch(e){report.errors.push({id:saved.id,code:e.code||'STARTUP_RECOVERY_ERROR',message:e.message});}
 }
 return report;
}
function signature(job){return fingerprint({id:job.id,brandId:job.intake.brandId,status:job.status,deadline:require('./processing-deadline')(job),results:job.results,requests:job.budget.requestStates||{}});}
async function inspect(runtime,id,brandId){
 let job=await runtime.store.read(id,{hydrate:false});if(brandId&&brandId!==job.intake.brandId)throw Error('This project belongs to another brand.');
 job=await reconcileExpired(runtime,id);
 const base={id,brandId:job.intake.brandId,canResume:false,canReconcileImages:Object.values(job.imageWaits||{}).some(s=>['attention','requesting'].includes(s.status)),sameProject:true,savedResults:(job.results||[]).length};
 if(job.localExecution)return {...base,reason:'This project is managed by the background queue. Resume it through that queue.'};
 if(job.intake.textLayerExperimentVersion||job.generationRecovery)return {...base,reason:'This project uses a dedicated recovery workflow.'};
 if(locallyActive(runtime,id))return {...base,active:true,reason:'The current worker is still finishing. Reconnect to its progress.'};
 if(['queued','running','preparing'].includes(job.status))return {...base,active:true,reason:'This project is already active; reconnect to its current progress.'};
 let lean=null;
 if(require('./lean-policy').enabled(job.intake)){
  try{lean=await require('./lean-recovery').inspect(runtime,job);}catch(e){return {...base,reason:e.message};}
 }
 if(!['failed','partial'].includes(job.status)&&!(job.status==='finished'&&lean?.pending))return {...base,reason:'Only interrupted work can resume. Completed reviews or missing brief inputs need their own resolution.'};
 if(job.providerBlock)return {...base,reason:'Resolve the saved provider/account block before continuing.'};
 const processingWindowRequired=require('./processing-deadline')(job)<=Date.now();
 const expected=(job.selection||[]).length*require('../concept-selection').routes(job.intake).length;
 if(!expected||(lean?!lean.pending:(job.results||[]).length>=expected))return {...base,reason:'All selected assets already have recorded outcomes. Review failures are not interrupted generation.'};
 for(const state of Object.values(job.budget.requestStates||{})){
  if(!['reasoning','image'].includes(state.kind)||!/^[a-f0-9]{64}$/.test(state.key||''))return {...base,reason:'A saved request has an invalid identity; inspect it before continuing.'};
  try{await fs.access(path.join(runtime.store.dir(id),'request-'+state.kind+'-'+state.key+'.json'));}
  catch(e){if(e.code!=='ENOENT')throw e;return {...base,reason:'A paid request has no saved response. Reconcile its outcome before retrying; no replacement will be submitted.',blockedRequestKey:state.key};}
 }
 return {...base,canResume:true,processingWindowRequired,...(lean?{resumePhase:lean.resumePhase,checkpointSignature:lean.checkpointSignature}:{}),token:fingerprint({job:signature(job),checkpoint:lean?.checkpointSignature||null}),reason:(processingWindowRequired?'The processing window expired. Continuing grants up to '+Math.ceil(extensionMs(runtime)/60000)+' minutes, without increasing call or spending limits. ':'')+'Continue this project using its saved checkpoints. Completed assets stay saved. Unfinished paid steps may incur charges within the existing budget.'};
}
async function resume(runtime,id,input={}){
 if(!input.brandId)throw Error('Choose the original brand.');
 return require('./submission-lock')(runtime,'resume:'+id,async()=>{
  const info=await inspect(runtime,id,input.brandId);
  if(info.active)return {id,reused:true};
  if(!info.canResume)throw Error(info.reason);
  if(input.token!==info.token)throw Error('Recovery state changed. Check recovery options again.');
  const release=await require('./file-lock').acquire(path.join(runtime.store.dir(id),'.runner.lock'),{timeoutMs:100});
  try{await runtime.store.update(id,async job=>{
   const checkpoint=require('./lean-policy').enabled(job.intake)?await require('./lean-recovery').inspect(runtime,job):null;
   if(fingerprint({job:signature(job),checkpoint:checkpoint?.checkpointSignature||null})!==info.token)throw Error('Recovery state changed before continuation.');
   job.continuations??=[];job.continuations.push({at:new Date().toISOString(),fromStatus:job.status,previousError:job.error||null,previousUnitErrors:job.unitErrors||[],preservedResults:(job.results||[]).length,mode:'same-job-checkpoints'});
   const previousDeadline=require('./processing-deadline')(job);
   if(previousDeadline<=Date.now()){job.processingContinuations??=[];job.processingContinuations.push({at:new Date().toISOString(),previousDeadline,deadline:Date.now()+extensionMs(runtime),reason:'Explicit continuation of saved work after processing expiry'});}
   job.status='queued';job.error=null;delete job.errorCode;if(checkpoint)job.stageQueue={...job.stageQueue,phase:checkpoint.resumePhase,queuedAt:new Date().toISOString()};return job;
  },{hydrate:false});}finally{await release();}
  runtime.schedule(id);return {id,reused:true,resumed:true};
 });
}
module.exports={inspect,resume,signature,reconcileExpired,recoverStartup};
