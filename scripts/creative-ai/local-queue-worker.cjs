'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
process.env.PATH=[path.dirname(process.execPath),'/opt/homebrew/bin',process.env.PATH||'/usr/bin:/bin'].join(':');
const root=path.resolve(__dirname,'../..'),{Queue}=require('../../lib/creative-ai/local-queue/store.cjs');
const arg=k=>process.argv[process.argv.indexOf(k)+1],dir=arg('--queue-dir'),key=arg('--key');
let q,runtime,jobId,heartbeat,finished=false;
const send=m=>new Promise(resolve=>{if(!process.connected)return resolve();process.send(m,()=>resolve());});
// An orphan must not continue submitting after its supervisor has gone away.
process.on('disconnect',()=>process.exit(finished?0:75));
async function finish(state,error,result,halt){await send({type:'result',state,error,result,halt});}
async function main(){
 q=new Queue(path.join(dir,'queue.sqlite'));const row=q.get(key);if(!row)throw Error('Queue row missing');q.close();q=null;
 heartbeat=setInterval(()=>send({type:'heartbeat',rss:process.memoryUsage().rss,heapUsed:process.memoryUsage().heapUsed}),3000);
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');runtime=new CreativeRuntime({root,dossierStore:require('../../lib/brand-dossier').createDossierStore(path.join(root,'output/brand-dossiers'))});require('../../lib/group-workspace').groupPolicy(root).mount(runtime);
 runtime.config.maxConcurrentJobs=1;
 // Admission and execution are explicit; never let create() start work early.
 runtime.schedule=()=>{};
 jobId=row.job_id;
 if(!jobId){const existing=await runtime.store.findRequest('parallel-static-20261103-'+key);jobId=existing?.id;}
 if(!jobId){
  const exposure=await require('../../lib/creative-ai/local-queue/cost-preflight.cjs').preflight(root);
  await fs.writeFile(path.join(dir,key+'-cost-admission-'+row.attempts+'.json'),JSON.stringify(exposure,null,2));
  if(exposure.remainingInr<exposure.perJobInr+exposure.additionalUnknownReserveInr)return finish('waiting-budget','Overall cost exposure has insufficient remaining allowance.',null,'Overall budget allowance reached; no further jobs admitted.');
  const source=path.join(root,'work/all-static-option1-20261027',path.basename(row.payload.intakeFile));const bytes=await fs.readFile(source),request=JSON.parse(bytes);
  if(request.brandId!==row.payload.brandId||JSON.stringify(request.conceptRoutes)!=='["continuity"]')throw Error('Saved brief brand or Option 1 identity mismatch');
  const b=await runtime.brands.read(request.brandId),research=await runtime.researchSessions.store.read(b.latestResearchId);
  if(research.intake.brandId!==request.brandId)throw Error('Brand research mismatch');
  Object.assign(request,{researchId:b.latestResearchId,editableCanvas:true,editableTextVersion:1,composedTextVersion:1,requestKey:'parallel-static-20261103-'+key,campaignName:row.payload.brand+' · Parallel QA · '+row.payload.name+' · Option 1'});
  await fs.writeFile(path.join(dir,key+'-intake.json'),JSON.stringify({sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),request},null,2));
  runtime.config.estimatedSpend.maxUsd=exposure.perJobInr/exposure.fx.usdToInr;
  jobId=await runtime.createRequest(request);
 }
 await send({type:'admitted',jobId});
 let job=await runtime.store.read(jobId,{hydrate:false});
 await fs.writeFile(path.join(dir,key+'-before-attempt-'+row.attempts+'.json'),JSON.stringify(job,null,2),{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
 if(!['running','queued','preparing'].includes(job.status))return finish(job.status,job.error,summary(job));
 const check=await require('../../lib/creative-ai/local-queue/recovery.cjs').inspect(job,runtime.store.dir(jobId));
 await fs.writeFile(path.join(dir,key+'-recovery-'+row.attempts+'.json'),JSON.stringify({at:new Date().toISOString(),jobId,previousStatus:job.status,previousStage:job.stage,check},null,2));
 if(!check.safe||job.status==='preparing'){
  const error=!check.safe?'Interrupted provider request has no saved response. Automatic resubmission blocked to avoid duplicate charges.':'Admission was interrupted before preparation finished; retained for inspection.';
  await runtime.store.update(jobId,j=>{j.localExecution={queueDir:dir,key,status:'held',reason:error,unresolved:check.unresolved};j.status='needs-input';j.error=error;return j;});return finish('held',error,{jobId,...check});
 }
 await runtime.store.update(jobId,j=>{
  const deadline=require('../../lib/creative-ai/runtime/processing-deadline')(j);
  if(deadline<=Date.now()){j.processingContinuations??=[];j.processingContinuations.push({recordedAt:new Date().toISOString(),previousDeadline:deadline,deadline:Date.now()+45*60*1000,reason:'User authorised local isolated-worker recovery and testing on 3 November 2026.',previousStatus:j.status,previousError:j.error});}
  j.localExecution={queueDir:dir,key,pid:process.pid,status:'running',startedAt:new Date().toISOString()};j.status='queued';return j;
 });
 try{await runtime.execute(jobId);}catch(e){await runtime.store.update(jobId,j=>{j.status='failed';j.error=e.message.slice(0,4000);return j;});}
 job=await runtime.store.read(jobId,{hydrate:false});
 if(['running','queued','preparing'].includes(job.status))throw Error('Runtime returned without a terminal checkpoint (possible competing owner).');
 const result=summary(job);result.generatedImages=(await fs.readdir(runtime.store.dir(jobId))).filter(n=>/^composed-source-.*\.png$/.test(n));
 await runtime.store.update(jobId,j=>{j.localExecution={...j.localExecution,status:j.status,finishedAt:new Date().toISOString()};return j;});
 await finish(job.status,job.error,result,job.providerBlock?'Provider unavailable; unstarted queue retained.':null);
}
function summary(j){return {jobId:j.id,status:j.status,stage:j.stage,imageCalls:j.budget?.imageCalls,reasoningCalls:j.budget?.reasoningCalls,issues:[...(j.unitErrors||[]),...(j.planningFamilyErrors||[]),...(j.deliveryErrors||[])],results:(j.results||[]).map(r=>({route:r.route,placementId:r.placementId,status:r.status,ready:r.ready,imageUrl:r.imageUrl,error:r.error})),completeSet:j.selection?.every(s=>j.results?.some(r=>r.placementId===s.id&&r.imageUrl))};}
main().catch(async e=>{console.error(e.stack);if(runtime&&jobId)await runtime.store.update(jobId,j=>{if(['running','queued','preparing'].includes(j.status)){j.status='needs-input';j.error=e.message.slice(0,4000);j.localExecution={...j.localExecution,status:'held',reason:j.error};}return j;}).catch(()=>{});await finish('held',e.message.slice(0,4000),{jobId:jobId||null});}).finally(()=>{clearInterval(heartbeat);q?.close();finished=true;process.disconnect?.();});
