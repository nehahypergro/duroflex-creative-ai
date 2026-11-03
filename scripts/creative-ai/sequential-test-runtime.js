'use strict';
const {Gate}=require('../../lib/creative-ai/runtime/image-upload');
function configure(runtime){
 // Worker-wide admission limits must agree with the running Studio. Apply
 // this test's narrower limit locally without rewriting its shared policy.
 Object.assign(runtime.config,{maxConcurrentJobs:1,maxConcurrentPlanning:1,maxConcurrentUnits:1});
 for(const method of ['reason','generate']){
  const call=runtime.provider[method].bind(runtime.provider),gate=new Gate(1);
  runtime.provider[method]=(...args)=>gate.run(()=>call(...args));
 }
 return runtime;
}
const stopBatch=message=>/still pending|no credits|insufficient_quota|account cannot access|Shared capacity|provider queue is full|provider capacity wait expired/i.test(message||'');
function resumeAction(job){
 if(!job)return 'create';
 if(['queued','running','preparing'].includes(job.status))return 'resume';
 if(job.status==='failed'&&/Planning response is still pending|Shared capacity configuration|Runner stopped before provider dispatch/.test(job.error||''))return 'resume';
 return 'skip';
}
async function continueJob(runtime,id,processingWindow){
 const job=await runtime.store.read(id);
 if(resumeAction(job)!=='resume')throw Error('This job is not a recoverable checkpoint. Its results and failures remain unchanged.');
 const deadline=require('../../lib/creative-ai/runtime/processing-deadline')(job);
 if(deadline<=Date.now()&&!processingWindow)throw Error('The processing window ended. Retrieve saved responses and record an authorised continuation before resuming.');
 if(processingWindow&&(!Number.isInteger(processingWindow.durationMs)||processingWindow.durationMs<60000||processingWindow.durationMs>120*60*1000||typeof processingWindow.reason!=='string'||!processingWindow.reason.trim()))throw Error('Invalid processing continuation');
 await runtime.store.update(id,j=>{
  if(j.status!==job.status||j.error!==job.error)throw Error('Checkpoint changed before continuation');
  if(deadline<=Date.now()){
   j.processingContinuations??=[];
   j.processingContinuations.push({recordedAt:new Date().toISOString(),previousDeadline:deadline,deadline:Date.now()+processingWindow.durationMs,reason:processingWindow.reason,previousStatus:j.status,previousError:j.error});
  }
  j.status='queued';j.error=null;return j;
 });
 runtime.schedule(id);
}
async function pendingRows(rows,order,read){
 const rank=new Map(order.map((r,i)=>[r.key,r.order??i]));
 const sorted=rows.filter(r=>r.intakeFile&&!['needs-input','deferred'].includes(r.status)).sort((a,b)=>(rank.get(a.key)??Infinity)-(rank.get(b.key)??Infinity));
 const pending=[];for(const row of sorted){if(!row.id||resumeAction(await read(row.id))!=='skip')pending.push(row);}return pending;
}
module.exports={configure,stopBatch,resumeAction,continueJob,pendingRows};
