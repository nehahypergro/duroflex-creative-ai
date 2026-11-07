'use strict';
const crypto=require('node:crypto'),{setTimeout:delay}=require('node:timers/promises');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
class ExecutionClient{
 constructor(coordinator,objects){this.coordinator=coordinator;this.objects=objects;}
 async recover({kind,requestKey,body,identityHash,context}){
  const r=await this.coordinator.get(context.jobId,kind,requestKey);if(!r)return null;
  const scope=context.brandId+'/'+context.jobId;
  const original=await this.objects.get(r.payload,scope);if(digest(original)!==r.input_hash)throw Error('Shared request integrity mismatch');
  const payload=JSON.parse(original.toString('utf8'));
  if(payload.kind!==kind||(identityHash?payload.identityHash!==identityHash:JSON.stringify(payload.body)!==JSON.stringify(body)))throw Error('Shared response input mismatch');
  if(r.state!=='completed')return null;
  const result=JSON.parse((await this.objects.get(r.response,scope)).toString('utf8'));
  return new Response(result.body,{status:result.status,headers:result.headers});
 }
 async execute({kind,requestKey,body,identityHash,context,timeoutMs}){
  const scope=context.brandId+'/'+context.jobId,bytes=Buffer.from(JSON.stringify({kind,body,...(context.pricing?{pricing:context.pricing}:{}),...(identityHash?{identityHash}:{})})),inputHash=digest(bytes),payload=await this.objects.put(scope,bytes);
  await this.coordinator.enqueue({jobId:context.jobId,brandId:context.brandId,kind,requestKey,inputHash,payload,limitUsd:context.limitUsd,reservationUsd:context.reservationUsd[kind],deadline:Math.min(context.deadline,Date.now()+timeoutMs)});
  const until=Math.min(context.deadline,Date.now()+timeoutMs);
  while(Date.now()<until){const r=await this.coordinator.get(context.jobId,kind,requestKey);if(r.state==='completed'){const result=JSON.parse((await this.objects.get(r.response,scope)).toString('utf8'));return new Response(result.body,{status:result.status,headers:result.headers});}if(['unknown','cancelled'].includes(r.state)){const e=Error('Shared execution '+r.state+': '+r.error_code);e.code=r.state==='unknown'?'REMOTE_OUTCOME_UNKNOWN':'REMOTE_NOT_DISPATCHED';throw e;}await delay(Math.min(500,Math.max(1,until-Date.now())));}
  const e=Error('Shared execution is still pending. Its request identity and reservation remain saved; do not redispatch.');e.code='REMOTE_EXECUTION_PENDING';throw e;
 }
}
async function executeClaim(coordinator,objects,request,{apiKey,fetchImpl=fetch,leaseMs=30000,metadataRetries=3}={}){
 const {rows:[job]}=await coordinator.pool.query('SELECT brand_id FROM creative_execution_jobs WHERE id=$1',[request.job_id]);if(!job)throw Error('Shared job missing');
 const scope=job.brand_id+'/'+request.job_id;let dispatched=false,timer,beating=false,beat=Promise.resolve();
 try{
  const bytes=await objects.get(request.payload,scope);if(digest(bytes)!==request.input_hash)throw Error('Shared request payload changed');const payload=JSON.parse(bytes.toString('utf8'));if(payload.kind!==request.kind||!payload.body||typeof payload.body!=='object')throw Error('Shared request kind changed');
  const remaining=new Date(request.deadline).getTime()-Date.now();if(remaining<=0)throw Error('Shared request deadline passed');
  timer=setInterval(()=>{if(beating)return;beating=true;beat=Promise.resolve().then(()=>coordinator.heartbeat(request,{leaseMs})).catch(()=>{ /* Losing database contact is not permission to abort a paid call. Completion remains fenced by its lease token. */ }).finally(()=>{beating=false;});},Math.max(250,Math.floor(leaseMs/3)));timer.unref?.();
  await coordinator.dispatch(request);dispatched=true;
  const response=await fetchImpl('https://api.openai.com/v1/'+(request.kind==='image'?'images/edits':'responses'),{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':request.request_key,'X-Client-Request-Id':request.request_key,Connection:'close'},body:JSON.stringify(payload.body),redirect:'error',signal:AbortSignal.timeout(remaining)});
  const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>160*1024*1024)throw Error('Provider response exceeds bounded size');chunks.push(chunk);}const body=Buffer.concat(chunks).toString('utf8');JSON.parse(body);
  const headers=Object.fromEntries(['content-type','x-request-id','retry-after'].map(k=>[k,response.headers.get(k)]).filter(([,v])=>v));
  const saved=await objects.put(scope,Buffer.from(JSON.stringify({status:response.status,headers,body})));if(objects.saveCompletion)await objects.saveCompletion(scope,request,saved);await retryMetadata(()=>coordinator.complete(request,saved,usageCost(payload,body)),metadataRetries);return {status:'completed'};
 }catch(e){if(dispatched)await coordinator.unknown(request).catch(()=>{});else if(coordinator.cancel)await coordinator.cancel(request,'PAYLOAD_OR_DEADLINE_INVALID').catch(()=>{});throw e;
 }finally{clearInterval(timer);await beat;}
}
async function retryMetadata(fn,attempts=3){let error;for(let n=0;n<attempts;n++){try{return await fn();}catch(e){error=e;if(e?.code==='REMOTE_LEASE_LOST')throw e;if(n+1<attempts)await delay(100*(2**n));}}throw error;}
const reconciliationCursors=new WeakMap();
async function reconcileCompletions(coordinator,objects,kind){
 if(!objects.loadCompletion||!coordinator.pendingCompletions)return;
 const cursors=reconciliationCursors.get(coordinator)||{};reconciliationCursors.set(coordinator,cursors);
 const rows=await coordinator.pendingCompletions(kind,cursors[kind]);cursors[kind]=rows.length?{jobId:rows.at(-1).job_id,key:rows.at(-1).request_key}:undefined;
 for(const r of rows){try{const response=await objects.loadCompletion(r.brand_id+'/'+r.job_id,r);if(response){const scope=r.brand_id+'/'+r.job_id,payload=JSON.parse((await objects.get(r.payload,scope)).toString()),saved=JSON.parse((await objects.get(response,scope)).toString());await coordinator.complete(r,response,usageCost(payload,saved.body));}}catch{console.error(JSON.stringify({jobId:r.job_id,kind,requestKey:r.request_key,status:'completion-reconciliation-pending'}));}}
}

function usageCost(payload,body){if(!payload.pricing)return null;const json=JSON.parse(body);return require('../../cost-tracker').estimate({kind:payload.kind,model:payload.body.model,usage:json.usage||{}},payload.pricing);}
module.exports={usageCost,ExecutionClient,executeClaim,reconcileCompletions};
