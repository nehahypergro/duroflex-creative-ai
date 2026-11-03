'use strict';
const fs=require('fs/promises'),path=require('path'),{fingerprint}=require('../art-director');
function signature(job){return fingerprint({id:job.id,brandId:job.intake.brandId,status:job.status,deadline:require('./processing-deadline')(job),results:job.results,requests:job.budget.requestStates||{}});}
async function inspect(runtime,id,brandId){
 const job=await runtime.store.read(id,{hydrate:false});if(brandId&&brandId!==job.intake.brandId)throw Error('This project belongs to another brand.');
 const base={id,brandId:job.intake.brandId,canResume:false,canReconcileImages:Object.values(job.imageWaits||{}).some(s=>['attention','requesting'].includes(s.status)),sameProject:true,savedResults:(job.results||[]).length};
 if(job.localExecution)return {...base,reason:'This project is managed by the background queue. Resume it through that queue.'};
 if(job.intake.textLayerExperimentVersion||job.generationRecovery)return {...base,reason:'This project uses a dedicated recovery workflow.'};
 if(runtime.active?.has(id))return {...base,active:true,reason:'The current worker is still finishing. Reconnect to its progress.'};
 if(['queued','running','preparing'].includes(job.status))return {...base,active:true,reason:'This project is already active; reconnect to its current progress.'};
 if(!['failed','partial'].includes(job.status))return {...base,reason:'Only interrupted work can resume. Completed reviews or missing brief inputs need their own resolution.'};
 if(job.providerBlock)return {...base,reason:'Resolve the saved provider/account block before continuing.'};
 if(require('./processing-deadline')(job)<=Date.now())return {...base,reason:'The original processing window has ended. No budgets or deadlines were reset.'};
 const expected=(job.selection||[]).length*require('../concept-selection').routes(job.intake).length;
 if(!expected||job.results.length>=expected)return {...base,reason:'All selected assets already have recorded outcomes. Review failures are not interrupted generation.'};
 for(const state of Object.values(job.budget.requestStates||{})){
  if(!['reasoning','image'].includes(state.kind)||!/^[a-f0-9]{64}$/.test(state.key||''))return {...base,reason:'A saved request has an invalid identity; inspect it before continuing.'};
  try{await fs.access(path.join(runtime.store.dir(id),'request-'+state.kind+'-'+state.key+'.json'));}
  catch(e){if(e.code!=='ENOENT')throw e;return {...base,reason:'A paid request has no saved response. Reconcile its outcome before retrying; no replacement will be submitted.',blockedRequestKey:state.key};}
 }
 return {...base,canResume:true,token:signature(job),reason:'Continue this project using its saved checkpoints. Completed assets stay saved. Unfinished paid steps may incur charges within the existing budget.'};
}
async function resume(runtime,id,input={}){
 if(!input.brandId)throw Error('Choose the original brand.');
 return require('./submission-lock')(runtime,'resume:'+id,async()=>{
  const info=await inspect(runtime,id,input.brandId);
  if(info.active)return {id,reused:true};
  if(!info.canResume)throw Error(info.reason);
  if(input.token!==info.token)throw Error('Recovery state changed. Check recovery options again.');
  const release=await require('./file-lock').acquire(path.join(runtime.store.dir(id),'.runner.lock'),{timeoutMs:100});
  try{await runtime.store.update(id,job=>{
   if(signature(job)!==info.token)throw Error('Recovery state changed before continuation.');
   job.continuations??=[];job.continuations.push({at:new Date().toISOString(),fromStatus:job.status,previousError:job.error||null,previousUnitErrors:job.unitErrors||[],preservedResults:job.results.length,mode:'same-job-checkpoints'});
   job.status='queued';job.error=null;return job;
  });}finally{await release();}
  runtime.schedule(id);return {id,reused:true,resumed:true};
 });
}
module.exports={inspect,resume,signature};
