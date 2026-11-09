'use strict';
// Reconcile expired stored background responses after a crash. This never POSTs
// a new generation. Unknown outcomes retain their original monetary reservation.
const fs=require('fs/promises'),path=require('path'),{JobStore}=require('./store');
async function sweep(root,provider){const report={reconciled:0,unconfirmed:0,errors:0};
 async function walk(dir){let entries;try{entries=await fs.readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}
 for(const entry of entries){if(!entry.isDirectory()||entry.name.startsWith('.'))continue;const folder=path.join(dir,entry.name);let job;try{job=JSON.parse(await fs.readFile(path.join(folder,'job.json'),'utf8'));}catch(e){if(e.code==='ENOENT'){await walk(folder);continue;}report.errors++;continue;}
 if(!job.runtimeConfig?.reasoningStore||job.executionBackendVersion)continue;
 const store=new JobStore(dir),budget=store.budget(job.id);
 for(const state of Object.values(job.budget?.requestStates||{})){if(state.kind!=='reasoning'||!/^[a-f0-9]{64}$/.test(state.key))continue;
 if(job.budget.receipts?.some(r=>r.kind==='reasoning'&&r.requestKey===state.key))continue;
 const wait=job.providerWaits?.[state.key],deadline=wait?.deadline||require('./processing-deadline')(job);
 if(Date.now()<deadline&&!['cancelled','stopped'].includes(job.status)&&(!['failed','partial','finished'].includes(job.status)||wait?.scoped))continue;
 try{const saved=await budget.loadResponse('reasoning',state.key),json=saved?.json;if(!['queued','in_progress'].includes(json?.status)||!/^resp_[A-Za-z0-9_-]+$/.test(json.id||''))continue;
 // Cancel is idempotent; a completed response can be returned instead.
 const response=await provider.cancelReasoning(json.id,10000);if(!response.ok)throw Error('Cancellation could not be confirmed');const terminal=await response.json();
 if(terminal.id!==json.id||!['completed','cancelled','failed','incomplete'].includes(terminal.status))throw Error('Provider request remains pending');
 await budget.saveResponse('reasoning',state.key,{...saved,json:terminal,cancellation:{reason:'expired-or-stopped',at:new Date().toISOString()}});
 await budget.receipt({kind:'reasoning',requestId:terminal.id,requestKey:state.key,model:state.model||terminal.model||job.runtimeConfig.reasoningModel,usage:terminal.usage||{},responseStatus:terminal.status});
 await budget.waiting({requestKey:state.key,responseId:terminal.id,status:terminal.status});report.reconciled++;
 }catch{report.unconfirmed++;}}
 }}await walk(path.join(root,'output/creative-ai'));return report;
}
function start(root,provider){let busy=false;const tick=async()=>{if(busy)return;busy=true;try{await require('./media-outbox').resume(root);if(provider?.cancelReasoning){const report=await sweep(root,provider);if(report.unconfirmed||report.errors)console.error('Background reconciliation pending: '+JSON.stringify(report));}}catch(e){console.error('Background maintenance pending: '+(e.code||'storage-or-provider-unavailable'));}finally{busy=false;}};const timer=setInterval(tick,60000);timer.unref();void tick();return ()=>clearInterval(timer);}
// Startup reconciliation for work left by a process that no longer exists (crash, restart,
// reboot or power loss). Automatic resumption stays disabled: this records evidence, flags
// in-flight image requests and releases provably stale locks. It never calls a provider,
// schedules work, or changes budgets, reservations or receipts.
const activeStatuses=['queued','running','preparing'];
const jobScopedLock=/^\.(request|diagnostic)-(reasoning|image)-[a-f0-9]{64}\.lock$/;
const names=async dir=>{try{return await fs.readdir(dir);}catch(e){if(['ENOENT','ENOTDIR'].includes(e.code))return [];throw e;}};
async function sharedLocks(root){
 const out=(await names(root)).filter(n=>/^\.(submission-[a-f0-9]{64}|create)\.lock$/.test(n)).map(n=>path.join(root,n)),capacity=path.join(root,'.provider-capacity');
 for(const kind of await names(capacity))for(const pool of ['active','waiting'])for(const slot of await names(path.join(capacity,kind,pool)))if(/^\d+$/.test(slot))out.push(path.join(capacity,kind,pool,slot));
 return out;
}
async function reconcileStartup(runtime,{only}={}){
 const locks=require('./file-lock'),identity=require('./process-identity'),store=runtime.store,report={interrupted:[],deferred:[],skipped:[],released:[],errors:[],retryAfterMs:0};
 const relative=file=>path.relative(store.root,file);
 const release=async file=>{try{if((await locks.classify(file)).state==='stale'&&await locks.reclaim(file))report.released.push(relative(file));}catch(e){report.errors.push({lock:relative(file),code:e.code||'LOCK_RECONCILIATION_ERROR',message:e.message});}};
 const defer=(id,verdict)=>{report.deferred.push(id);report.retryAfterMs=Math.max(report.retryAfterMs,Math.min(locks.STALE_LOCK_GRACE_MS,(verdict.retryAfterMs||0)+1000));};
 const locallyActive=id=>runtime.active?.has(id)||runtime.pending?.includes(id)||runtime.stageQueues?.known?.has(id);
 // Background-queue jobs belong to their own supervisor; text-layer experiments to their runner.
 const eligible=j=>!!j&&!j.localExecution&&activeStatuses.includes(j.status)&&!j.intake?.textLayerExperimentVersion&&!locallyActive(j.id);
 // Recorded for evidence only, with the same queued-time credit resume-work applies.
 const deadline=j=>j.generationRecovery?.status==='running'?j.generationRecovery.deadline:require('./processing-deadline')(j)+(require('./store').queueCredit?.(j)||0);
 if(!only)for(const file of await sharedLocks(store.root))await release(file);
 const ids=only||(await store.list({metadataOnly:true})).filter(eligible).map(j=>j.id);
 for(const id of ids){try{
  const dir=store.dir(id),runner=path.join(dir,'.runner.lock');
  if(!eligible(await store.read(id,{hydrate:false})))continue;
  const prior=await locks.classify(runner);let releaseRunner;
  try{releaseRunner=await locks.acquire(runner,{timeoutMs:100});}catch(e){if(e.code!=='SHARED_WRITER_BUSY')throw e;const now=await locks.classify(runner);if(now.state==='fresh')defer(id,now);else report.skipped.push({id,reason:now.state==='live'?'live-runner':'runner-lock-unverified'});continue;}
  try{
   // Recheck under the same lock the runner uses; a live runner would still hold it.
   const job=await store.read(id,{hydrate:false});if(!eligible(job))continue;
   const update=await locks.classify(path.join(dir,'.update.lock'));if(update.state==='fresh'){defer(id,update);continue;}if(['live','foreign','manual'].includes(update.state)){report.skipped.push({id,reason:'job-writer-busy'});continue;}
   for(const name of await names(dir))if(jobScopedLock.test(name))await release(path.join(dir,name));
   const written=(await fs.stat(path.join(dir,'job.json'))).mtimeMs,evidence=prior.state==='stale'?'dead-runner-owner':written<identity.bootTime()?'previous-boot':'no-live-owner';
   const unresolved=[];for(const state of Object.values(job.budget?.requestStates||{})){if(!['reasoning','image'].includes(state?.kind)||!/^[a-f0-9]{64}$/.test(state.key||''))continue;
    try{await fs.access(path.join(dir,'request-'+state.kind+'-'+state.key+'.json'));}catch(e){if(e.code!=='ENOENT')throw e;unresolved.push({kind:state.kind,key:state.key,recovery:state.kind==='image'&&job.imageWaits?.[state.key]?'image-wait':state.kind==='reasoning'&&job.providerWaits?.[state.key]?'background-response':'no-saved-response'});}}
   const at=new Date().toISOString();
   const saved=await store.update(id,j=>{if(!eligible(j))return j;
    const flagged=[];for(const [key,wait] of Object.entries(j.imageWaits||{}))if(wait?.status==='requesting'){j.imageWaits[key]={...wait,status:'attention',chargeStatus:'unknown',reason:'The Studio stopped while this image request was in flight. Recover the original response before continuing; no replacement was submitted.',interruptedAt:at,updatedAt:at};flagged.push(key);}
    j.startupInterruptions??=[];j.startupInterruptions.push({status:j.status,stage:j.stage||null,error:j.error||null,deadline:deadline(j),at,reason:'owner-process-ended',evidence,unresolvedRequests:unresolved,flaggedImageRequests:flagged});
    j.status=(j.results||[]).length?'partial':'failed';j.errorCode='PROCESSING_INTERRUPTED';j.updatedAt=at;
    j.error='Processing stopped because the Studio process ended (restart, crash or shutdown). Saved work is preserved and nothing was resubmitted. '+(unresolved.length?'Recover the outstanding provider request before continuing.':'Choose Continue saved work to resume.');
    if(j.generationRecovery?.status==='running'){j.generationRecovery.status='interrupted';j.generationRecovery.interruptedAt=at;}
    return j;
   },{hydrate:false});
   if(saved.startupInterruptions?.at(-1)?.at===at)report.interrupted.push({id,brandId:saved.intake?.brandId||null,evidence,unresolvedRequests:unresolved.length});
  }finally{await releaseRunner();}
 }catch(e){report.errors.push({id,code:e.code||'STARTUP_RECONCILIATION_ERROR',message:e.message});}}
 return report;
}
// One pass before the Studio serves requests, plus one re-check of jobs whose lock folder
// was too recent to judge. Returns stop() so shutdown can cancel the pending re-check.
async function startupPass(runtime,{log=console}={}){
 const summarize=r=>{if(r.interrupted.length||r.released.length)log.log('Studio startup reconciliation: '+r.interrupted.length+' interrupted project(s) can be continued by choice; '+r.released.length+' stale lock(s) released. Nothing was resubmitted.');if(r.errors.length||r.skipped.length)log.error('Studio startup reconciliation needs inspection: '+JSON.stringify({errors:r.errors.map(e=>e.code),skipped:r.skipped.map(s=>s.reason)}));};
 let report,timer=null;
 // Apply .env concurrency limits to idle shared capacity policies before serving (8 Nov 2026).
 try{const changed=(await module.exports.alignCapacity(runtime)).filter(r=>r.changed||r.busy);if(changed.length)log.log('Studio capacity limits: '+changed.map(r=>r.kind+' '+r.from+'→'+r.to+(r.busy?' (busy, unchanged)':'')).join(', '));}catch(e){log.error('Studio capacity alignment failed: '+e.message);}
 try{report=await reconcileStartup(runtime);}catch(e){report={interrupted:[],deferred:[],skipped:[],released:[],errors:[{code:e.code||'STARTUP_RECONCILIATION_ERROR',message:e.message}],retryAfterMs:0};}
 summarize(report);
 if(report.deferred.length){timer=setTimeout(()=>{timer=null;reconcileStartup(runtime,{only:report.deferred}).then(retry=>{report.retry=retry;summarize(retry);},e=>{report.retry={errors:[{code:e.code||'STARTUP_RECONCILIATION_ERROR',message:e.message}]};});},report.retryAfterMs);timer.unref?.();}
 return {report,stop:()=>{if(timer)clearTimeout(timer);timer=null;}};
}
// Shared provider capacity is a saved policy per store; align idle policies with this
// process's configured limits (render limits are code constants and are left alone).
async function alignCapacity(runtime){
 const capacity=require('./shared-capacity'),config=runtime.config||{},out=[];
 const roots=[...new Set([runtime.store?.root,runtime.researchSessions?.store?.root].filter(Boolean))];
 for(const root of roots){const kinds=root===runtime.store?.root?{reasoning:config.maxConcurrentReasoningCalls??4,image:config.maxConcurrentImageCalls??2}:{reasoning:config.maxConcurrentReasoningCalls??4};
  for(const [kind,limit] of Object.entries(kinds))out.push({root,kind,...await capacity.reconfigure(require('node:path').join(root,'.provider-capacity'),kind,limit)});}
 return out;
}
module.exports={sweep,start,reconcileStartup,startupPass,alignCapacity};
