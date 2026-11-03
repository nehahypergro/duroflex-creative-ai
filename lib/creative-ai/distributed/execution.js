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
  const scope=context.brandId+'/'+context.jobId,bytes=Buffer.from(JSON.stringify({kind,body,...(identityHash?{identityHash}:{})})),inputHash=digest(bytes),payload=await this.objects.put(scope,bytes);
  await this.coordinator.enqueue({jobId:context.jobId,brandId:context.brandId,kind,requestKey,inputHash,payload,limitUsd:context.limitUsd,reservationUsd:context.reservationUsd[kind],deadline:Math.min(context.deadline,Date.now()+timeoutMs)});
  const until=Math.min(context.deadline,Date.now()+timeoutMs);
  while(Date.now()<until){const r=await this.coordinator.get(context.jobId,kind,requestKey);if(r.state==='completed'){const result=JSON.parse((await this.objects.get(r.response,scope)).toString('utf8'));return new Response(result.body,{status:result.status,headers:result.headers});}if(['unknown','cancelled'].includes(r.state)){const e=Error('Shared execution '+r.state+': '+r.error_code);e.code=r.state==='unknown'?'REMOTE_OUTCOME_UNKNOWN':'REMOTE_NOT_DISPATCHED';throw e;}await delay(Math.min(500,Math.max(1,until-Date.now())));}
  const e=Error('Shared execution is still pending. Its request identity and reservation remain saved; do not redispatch.');e.code='REMOTE_EXECUTION_PENDING';throw e;
 }
}
async function executeClaim(coordinator,objects,request,{apiKey,fetchImpl=fetch,leaseMs=30000}={}){
 const {rows:[job]}=await coordinator.pool.query('SELECT brand_id FROM creative_execution_jobs WHERE id=$1',[request.job_id]);if(!job)throw Error('Shared job missing');
 const scope=job.brand_id+'/'+request.job_id,controller=new AbortController();let dispatched=false,timer,beat=Promise.resolve();
 try{
  const bytes=await objects.get(request.payload,scope);if(digest(bytes)!==request.input_hash)throw Error('Shared request payload changed');const payload=JSON.parse(bytes.toString('utf8'));if(payload.kind!==request.kind||!payload.body||typeof payload.body!=='object')throw Error('Shared request kind changed');
  const remaining=new Date(request.deadline).getTime()-Date.now();if(remaining<=0)throw Error('Shared request deadline passed');
  timer=setInterval(()=>{beat=beat.then(()=>coordinator.heartbeat(request,{leaseMs})).catch(()=>controller.abort());},Math.max(250,Math.floor(leaseMs/3)));timer.unref?.();
  await coordinator.dispatch(request);dispatched=true;
  const response=await fetchImpl('https://api.openai.com/v1/'+(request.kind==='image'?'images/edits':'responses'),{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':request.request_key,'X-Client-Request-Id':request.request_key,Connection:'close'},body:JSON.stringify(payload.body),redirect:'error',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(remaining)])});
  const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>160*1024*1024)throw Error('Provider response exceeds bounded size');chunks.push(chunk);}const body=Buffer.concat(chunks).toString('utf8');JSON.parse(body);
  const headers=Object.fromEntries(['content-type','x-request-id','retry-after'].map(k=>[k,response.headers.get(k)]).filter(([,v])=>v));
  const saved=await objects.put(scope,Buffer.from(JSON.stringify({status:response.status,headers,body})));await coordinator.complete(request,saved);return {status:'completed'};
 }catch(e){if(dispatched)await coordinator.unknown(request).catch(()=>{});else await coordinator.pool.query("UPDATE creative_execution_requests SET state='cancelled',error_code='PAYLOAD_OR_DEADLINE_INVALID' WHERE job_id=$1 AND kind=$2 AND request_key=$3 AND lease_token=$4 AND state='leased'",[request.job_id,request.kind,request.request_key,request.lease_token]);throw e;
 }finally{clearInterval(timer);await beat;}
}
module.exports={ExecutionClient,executeClaim};
