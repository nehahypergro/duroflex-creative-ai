'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const {withLock}=require('../../runtime/file-lock');
const pending=r=>['queued','in_progress'].includes(r?.status);
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
async function save(file,value){const tmp=file+'.recovery.tmp';await fs.writeFile(tmp,JSON.stringify(value,null,2));await fs.rename(tmp,file);}
const lockFile=dir=>path.join(dir,'execution.lock');
async function reconcile(root,id,{fetchImpl=fetch,now=Date.now,apiKey,resume}={}){
 if(!/^lean-[a-z0-9-]+$/.test(id))throw Error('Invalid experiment ID');
 const dir=path.join(root,'output/imagegen/lean-planner',id);let ready=false;
 try{await withLock(lockFile(dir),async()=>{
  const file=path.join(dir,'run.json'),run=await read(file);
  if(run.plannerRecovery?.version!==1||!(['planning','planning_pending'].includes(run.status)||run.status==='interrupted'&&run.plannerRecovery?.readyToResume)||run.models.some(m=>m.pages?.length||m.status!=='queued'))return;
  const old=await read(path.join(dir,'planner-response.json'));
  if(!/^resp_[A-Za-z0-9_-]+$/.test(old.id||'')||old.id!==run.planner?.responseId)throw Error('Saved planner response identity mismatch');
  const state=run.plannerRecovery;state.lastCheckedAt=new Date(now()).toISOString();
  try{
   let result=old;
   if(pending(old)){
    const response=await fetchImpl('https://api.openai.com/v1/responses/'+encodeURIComponent(old.id),{headers:{Authorization:'Bearer '+apiKey},signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Object.assign(Error('Planner retrieval HTTP '+response.status),{httpStatus:response.status});
    result=await response.json();if(result.id!==old.id)throw Object.assign(Error('Retrieved planner identity mismatch'),{terminal:true});
    await save(path.join(dir,'planner-response.json'),result);
   }
   state.providerStatus=result.status;delete state.lastError;
   if(pending(result)){
    run.status='planning_pending';state.message='Planning is taking longer than usual. Tracking the existing request.';
    if(now()>=Date.parse(state.deadlineAt)){
     const response=await fetchImpl('https://api.openai.com/v1/responses/'+encodeURIComponent(old.id)+'/cancel',{method:'POST',headers:{Authorization:'Bearer '+apiKey},signal:AbortSignal.timeout(30000)});
     if(!response.ok)throw Object.assign(Error('Planner cancellation unconfirmed: HTTP '+response.status),{terminal:true});
     result=await response.json();if(result.id!==old.id||!['completed','cancelled','failed','incomplete'].includes(result.status))throw Object.assign(Error('Planner cancellation not confirmed'),{terminal:true});
     await save(path.join(dir,'planner-response.json'),result);state.providerStatus=result.status;
    }
   }
   if(result.status==='completed'){run.status='interrupted';delete run.error;state.message='Saved plan received; continuing generation.';run.planner.usage=result.usage||null;run.planner.elapsedSeconds=((result.completed_at||now()/1000)-(result.created_at||Date.parse(run.createdAt)/1000));state.readyToResume=true;ready=true;}
   else if(!pending(result)){run.status='interrupted';run.error='Planner ended with '+result.status+'. No replacement was submitted.';state.message=run.error;}
  }catch(e){state.lastError=e.message;state.message='Retrieving the saved planning request; no replacement submitted.';run.status='planning_pending';if(e.terminal||[400,401,403,404].includes(e.httpStatus)||now()>=Date.parse(state.deadlineAt)){run.status='interrupted';run.error=e.message+'; reconcile the saved request before retrying.';}}
  await save(file,run);
 },{timeoutMs:0});}catch(e){if(e.code==='SHARED_WRITER_BUSY')return {status:'owned'};throw e;}
 if(ready){const run=await read(path.join(dir,'run.json'));await (resume||((r)=>require('./index').execute(root,r,{resumePlan:true})))(run);}
 return {status:ready?'continued':'checked'};
}
async function recoverPending(root,options={}){
 const dir=path.join(root,'output/imagegen/lean-planner');const rows=[];
 for(const id of await fs.readdir(dir).catch(()=>[])){if(!/^lean-[a-z0-9-]+$/.test(id))continue;try{const run=await read(path.join(dir,id,'run.json'));if(run.plannerRecovery?.version===1&&(['planning','planning_pending'].includes(run.status)||run.status==='interrupted'&&run.plannerRecovery.readyToResume))rows.push(await reconcile(root,id,options));}catch(e){rows.push({id,error:e.message});}}
 return rows;
}
module.exports={reconcile,recoverPending,lockFile};
