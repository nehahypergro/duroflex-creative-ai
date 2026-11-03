const {fingerprint}=require('../art-director');
// A complete, recorded HTTP error permits one separately budgeted attempt.
// A lost response never does: the reservation remains unresolved.
function retryDelay(value,now){
 const numeric=typeof value==='string'&&/^\d+(?:\.\d+)?$/.test(value.trim())?Number(value)*1000:NaN;
 const date=typeof value==='string'&&/[A-Za-z]{3},/.test(value)?Date.parse(value)-now:NaN;
 return Math.max(1000,Number.isFinite(numeric)?numeric:Number.isFinite(date)?date:1000);
}
const pending=json=>['queued','in_progress'].includes(json?.status);
async function transport({key,operation,attempt,budget,send,prepare,recover,retrieve,correctInvalid,timeoutMs=900000,maxHttpRetries=1,durablePending=false,now=Date.now,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 const deadline=now()+timeoutMs;
 async function finish(json,requestKey,source,elapsed){
  if(!pending(json)){if(durablePending)await budget.waiting?.({requestKey,responseId:json.id,status:json.status||'completed'});return {json,requestKey,source,elapsed};}
  // Legacy/synchronous envelopes still reach the provider's terminal-status validator.
  if(!retrieve||!/^resp_[A-Za-z0-9_-]+$/.test(json.id||''))return {json,requestKey,source,elapsed};
  const id=json.id,pollStarted=performance.now();let failures=0,polls=0;
  const waiting=async(status,extra={})=>{if(durablePending)await budget.waiting?.({requestKey,responseId:id,status,...extra});};
  await waiting('waiting');
  while(pending(json)){
   // Once accepted, the POST timeout no longer governs asynchronous work.
   // Keep the original job allowance and all monetary/call limits unchanged.
   const remaining=durablePending&&budget.remainingMs?await budget.remainingMs():Math.min(deadline-now(),budget.remainingMs?await budget.remainingMs():Infinity);
   if(remaining<=1000){await waiting('attention',{reason:'Processing window ended; retrieve this saved request before continuing.'});throw Object.assign(Error('Planning response is still pending. Its saved response ID can be retrieved without another submission.'),{code:'REASONING_PENDING',providerRequestKey:requestKey,responseSaved:true,providerResponseId:id});}
   await sleep(Math.min(remaining-1000,durablePending?Math.min(15000,1000*2**Math.min(4,failures||Math.floor(polls/8))):1000));
   polls++;
   try{
    const response=await retrieve(id,Math.max(1,Math.min(30000,remaining-1000)));
    if(!response.ok){const error=Object.assign(Error('Saved planning response retrieval failed ('+response.status+'). No replacement was submitted.'),{code:'REASONING_RETRIEVAL_FAILED',httpStatus:response.status});throw error;}
    const next=await response.json();
    if(next.id!==id)throw Object.assign(Error('Retrieved planning response identity mismatch'),{code:'REASONING_RESPONSE_IDENTITY'});
    json=next;failures=0;
    await budget.saveResponse?.('reasoning',requestKey,{version:1,operation,attempt,json});
   }catch(error){
    error.providerRequestKey=requestKey;error.responseSaved=true;error.providerResponseId=id;
    const retryable=!error.code||['EPIPE','ECONNRESET','UND_ERR_SOCKET','ETIMEDOUT'].includes(error.code)||['TimeoutError','AbortError','TypeError'].includes(error.name)||error.httpStatus===429||error.httpStatus>=500;
    failures++;
    if(!retryable||(!durablePending&&failures>=3)){await waiting('attention',{httpStatus:error.httpStatus||null,reason:error.message});throw error;}
    await waiting('waiting',{httpStatus:error.httpStatus||null,reason:'Connection interrupted; retrieving the same saved response automatically.'});
   }
  }
  await waiting(json.status||'completed');
  return {json,requestKey,source:source==='saved'?'retrieved':'provider',elapsed:(elapsed||0)+performance.now()-pollStarted};
 }
 let retryNotBefore=0;
 for(let recovery=0;recovery<=maxHttpRetries;recovery++){
  const requestKey=recovery?fingerprint({operation,attempt,httpRetry:1}):key;
  let saved=await budget.loadResponse?.('reasoning',requestKey);
  if(!saved&&recover){const response=await recover(requestKey);if(response){const json=await response.json();saved=response.ok?{version:1,operation,attempt,json}:{version:1,operation,attempt,httpFailure:{status:response.status,...require('./provider-error-fields').fields(json),...require('./provider-credit-stop').classify(response.status,json),chargeStatus:'unknown',retryNotBefore:now()+retryDelay(response.headers?.get?.('retry-after'),now())}};await budget.saveResponse?.('reasoning',requestKey,saved);}}
  if(saved&&(saved.version!==1||saved.operation!==operation||saved.attempt!==attempt||(!saved.json&&!saved.httpFailure)))throw Error('Saved reasoning response identity mismatch');
  if(saved?.json)return finish(saved.json,requestKey,'saved',null);
  let failure=saved?.httpFailure;
  if(!failure){
   if(recovery&&retryNotBefore>now()){
    const delay=retryNotBefore-now(),remaining=budget.remainingMs?await budget.remainingMs():Infinity;
    if(delay>=remaining){const e=Error('Provider retry delay exceeds the remaining job budget. Saved work is preserved.');e.code='PROVIDER_RETRY_DEFERRED';throw e;}
    // Sleep in bounded slices; persisted timestamp survives a process restart.
    let left=delay;while(left>0){const slice=Math.min(left,1000);await sleep(slice);left-=slice;}
   }
   await prepare(requestKey);
   await budget.reserve('reasoning',requestKey);
   const started=performance.now();let response,json;try{response=await send();json=await response.json();}catch(error){error.providerRequestKey=requestKey;throw error;}
   if(response.ok){await budget.saveResponse?.('reasoning',requestKey,{version:1,operation,attempt,json});return finish(json,requestKey,'provider',performance.now()-started);}
   failure={status:response.status,...require('./provider-error-fields').fields(json),...require('./provider-credit-stop').classify(response.status,json),chargeStatus:'unknown',retryNotBefore:now()+retryDelay(response.headers?.get?.('retry-after'),now())};
   await budget.saveResponse?.('reasoning',requestKey,{version:1,operation,attempt,httpFailure:failure});
  }
  if(failure.creditsExhausted){await budget.providerUnavailable?.({code:'PROVIDER_CREDITS_EXHAUSTED',status:failure.status,requestKey});throw require('./provider-credit-stop').error();}
  if(maxHttpRetries>0&&recovery===0&&failure.status===400&&correctInvalid&&await correctInvalid(failure)){retryNotBefore=0;continue;}
  if(maxHttpRetries>0&&recovery===0&&failure.retryable&&budget.saveResponse){retryNotBefore=failure.retryNotBefore||0;continue;}
  const error=Error('Reasoning provider request failed ('+failure.status+')'+(failure.parameter?' at '+failure.parameter:'')+'. Saved work is preserved.');error.code='PROVIDER_HTTP_ERROR';error.httpStatus=failure.status;error.providerParameter=failure.parameter||null;error.providerErrorCode=failure.errorCode||null;error.retryableReview=failure.retryable;throw error;
 }
};

module.exports=async function lockedTransport(args){
 return args.budget.withRequestLock?args.budget.withRequestLock('reasoning',args.key,()=>transport(args)):transport(args);
};
