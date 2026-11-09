const {fingerprint}=require('../art-director');
// A complete, recorded HTTP error permits one separately budgeted attempt.
// A lost response never does: the reservation remains unresolved.
// A background response that outlives its per-call time limit is cancelled; only a
// CONFIRMED stop permits that same single extra attempt. Its charge stays unknown.
function retryDelay(value,now){
 const numeric=typeof value==='string'&&/^\d+(?:\.\d+)?$/.test(value.trim())?Number(value)*1000:NaN;
 const date=typeof value==='string'&&/[A-Za-z]{3},/.test(value)?Date.parse(value)-now:NaN;
 return Math.max(1000,Number.isFinite(numeric)?numeric:Number.isFinite(date)?date:1000);
}
const pending=json=>['queued','in_progress'].includes(json?.status);
const STOPPED=['completed','cancelled','failed','incomplete'];
// Completed/incomplete responses carry a real outcome for the provider's validators.
const unusable=json=>['cancelled','failed'].includes(json?.status);
// Confirmed cancellations we made on purpose: at the per-call limit, or (fallbacks, 8 Nov 2026)
// after waiting too long in the provider's queue without starting.
const limitCancelled=saved=>['call-time-limit','queued-too-long'].includes(saved?.cancellation?.reason)&&unusable(saved.json);
const duration=ms=>ms>=60000?Math.round(ms/6000)/10+'-minute':Math.max(1,Math.ceil(ms/1000))+'-second';
function callTimeout(requestKey,{json,limitMs,previous=null,retryWindow}){
 const limit=duration(limitMs||0),message=retryWindow?'The agent request exceeded its '+limit+' per-call time limit and was cancelled; too little processing time remains to send its one replacement. Saved work is preserved.':previous==='call-time-limit'?'The agent request exceeded its '+limit+' per-call time limit twice; both attempts were cancelled. Saved work is preserved.':previous==='http'?'The agent request exceeded its '+limit+' per-call time limit after one provider HTTP recovery and was cancelled; no further replacement is allowed. Saved work is preserved.':'The agent request exceeded its '+limit+' per-call time limit and was cancelled; no request allowance remains for a replacement. Saved work is preserved.';
 return Object.assign(Error(message),{code:'REASONING_TIMEOUT',providerRequestKey:requestKey,providerResponseId:json?.id,responseSaved:true,retryableReview:!!retryWindow,recovery:{version:1,mode:retryWindow?'resume':'exhausted',reason:retryWindow?'call-time-limit-retry-window':'call-time-limit',requestKey}});
}
async function transport({key,operation,attempt,requestIntent,budget,send,prepare,recover,retrieve,cancel,correctInvalid,timeoutMs=900000,maxHttpRetries=1,durablePending=false,callTimeLimitMs=0,retryMinimumMs=120000,maxPollIntervalMs=4000,abandoned,continuation=0,queuedLimitMs=0,prepareReplacement=null,now=Date.now,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 const deadline=now()+timeoutMs;
 // Cancel, then confirm a terminal state; a cancel reply may still say in_progress.
 async function stop(id,remaining){
  const ms=()=>Math.max(1,Math.min(10000,remaining-1000));
  try{const response=await cancel(id,ms());if(!response.ok)return null;let stopped=await response.json();
   for(let check=0;stopped?.id===id&&pending(stopped)&&retrieve&&check<5;check++){await sleep(1000);const next=await retrieve(id,ms());if(!next.ok)return null;stopped=await next.json();}
   return stopped?.id===id&&STOPPED.includes(stopped.status)?stopped:null;}catch{return null;}
 }
 async function finish(json,requestKey,source,elapsed,dispatchedAt){
  if(!pending(json)){if(durablePending)await budget.waiting?.({requestKey,responseId:json.id,status:json.status||'completed'});return {json,requestKey,source,elapsed};}
  // Legacy/synchronous envelopes still reach the provider's terminal-status validator.
  if(!retrieve||!/^resp_[A-Za-z0-9_-]+$/.test(json.id||''))return {json,requestKey,source,elapsed};
  const id=json.id,pollStarted=performance.now();let failures=0,polls=0;
  // Measured from the original dispatch (persisted), so a restart cannot extend it.
  const limitAt=durablePending&&cancel&&callTimeLimitMs>0?(Number.isFinite(dispatchedAt)?dispatchedAt:now())+callTimeLimitMs:Infinity;
  const queuedAt=durablePending&&cancel&&queuedLimitMs>0?(Number.isFinite(dispatchedAt)?dispatchedAt:now())+queuedLimitMs:Infinity;
  const save=(value,extra={})=>budget.saveResponse?.('reasoning',requestKey,{version:1,operation,attempt,...(requestIntent?{requestIntent}:{}),json:value,...(Number.isFinite(dispatchedAt)?{dispatchedAt}:{}),...extra});
  const waiting=async(status,extra={})=>{if(durablePending)await budget.waiting?.({requestKey,responseId:id,status,...extra});};
  await waiting('waiting');
  while(pending(json)){
   // Once accepted, the POST timeout no longer governs asynchronous work.
   // Keep the original job allowance and all monetary/call limits unchanged.
   const remaining=durablePending&&budget.remainingMs?await budget.remainingMs():Math.min(deadline-now(),budget.remainingMs?await budget.remainingMs():Infinity);
   if(remaining<=1000){
    let cancellation='not-configured';
    if(cancel)try{const response=await cancel(id,10000);if(!response.ok)throw Error('Cancellation HTTP '+response.status);const stopped=await response.json();if(stopped.id!==id||pending(stopped)||!STOPPED.includes(stopped.status))throw Error('Cancellation not confirmed');await save(stopped,{cancellation:{reason:'processing-window-ended',at:new Date().toISOString()}});await waiting(stopped.status);return {json:stopped,requestKey,source:'cancelled-or-completed',elapsed};}catch{cancellation='unconfirmed';}
    await waiting('attention',{cancellation,reason:'Processing window ended; reconcile the saved request. Cancellation does not refund usage.'});throw Object.assign(Error('Planning response is still pending. Its saved response ID can be retrieved without another submission.'),{code:'REASONING_PENDING',providerRequestKey:requestKey,responseSaved:true,providerResponseId:id,retryableReview:true,recovery:{version:1,mode:'resume',requestKey,responseId:id}});}
   const stuckInQueue=json.status==='queued'&&now()>=queuedAt;
   if(now()>=limitAt||stuckInQueue){
    const stopped=await stop(id,remaining);
    if(!stopped){await waiting('attention',{cancellation:'unconfirmed',reason:'Per-call time limit reached but cancellation was not confirmed; no replacement was sent. Reconcile the saved request.'});throw Object.assign(Error('The agent response exceeded its per-call time limit and its cancellation could not be confirmed. Its saved response ID can be retrieved without another submission.'),{code:'REASONING_PENDING',providerRequestKey:requestKey,responseSaved:true,providerResponseId:id,retryableReview:true,recovery:{version:1,mode:'resume',requestKey,responseId:id}});}
    if(!unusable(stopped)){await save(stopped);await waiting(stopped.status);return {json:stopped,requestKey,source:source==='saved'?'retrieved':'provider',elapsed:(elapsed||0)+performance.now()-pollStarted};}
    const cancellation=stuckInQueue&&now()<limitAt?{reason:'queued-too-long',limitMs:queuedLimitMs,at:new Date().toISOString()}:{reason:'call-time-limit',limitMs:callTimeLimitMs,at:new Date().toISOString()};
    await save(stopped,{cancellation,chargeStatus:'unknown'});
    await waiting(stopped.status,{cancellation:'confirmed',reason:'Per-call time limit reached; the response was cancelled. Its usage and charge remain unknown.'});
    return {abandoned:true,json:stopped,requestKey,cancellation};
   }
   await sleep(Math.max(1,Math.min(remaining-1000,limitAt-now(),json.status==='queued'?Math.max(1,queuedAt-now()):Infinity,durablePending?Math.min(maxPollIntervalMs,1000*2**Math.min(4,failures||Math.floor(polls/8))):1000)));
   polls++;
   try{
    const response=await retrieve(id,Math.max(1,Math.min(30000,remaining-1000)));
    if(!response.ok){const error=Object.assign(Error('Saved planning response retrieval failed ('+response.status+'). No replacement was submitted.'),{code:'REASONING_RETRIEVAL_FAILED',httpStatus:response.status});throw error;}
    const next=await response.json();
    if(next.id!==id)throw Object.assign(Error('Retrieved planning response identity mismatch'),{code:'REASONING_RESPONSE_IDENTITY'});
    json=next;failures=0;
    await save(json);
   }catch(error){
    error.providerRequestKey=requestKey;error.responseSaved=true;error.providerResponseId=id;error.retryableReview=true;error.recovery={version:1,mode:'resume',requestKey,responseId:id};
    const retryable=!error.code||['EPIPE','ECONNRESET','UND_ERR_SOCKET','ETIMEDOUT'].includes(error.code)||['TimeoutError','AbortError','TypeError'].includes(error.name)||error.httpStatus===429||error.httpStatus>=500;
    failures++;error.retryableReview=retryable;if(!retryable)error.recovery.mode='reconcile';
    if(!retryable||(!durablePending&&failures>=3)){await waiting('attention',{httpStatus:error.httpStatus||null,reason:error.message});throw error;}
    await waiting('waiting',{httpStatus:error.httpStatus||null,reason:'Connection interrupted; retrieving the same saved response automatically.'});
   }
  }
  await waiting(json.status||'completed');
  return {json,requestKey,source:source==='saved'?'retrieved':'provider',elapsed:(elapsed||0)+performance.now()-pollStarted};
 }
 // One extra request at most: an HTTP recovery OR a call-time-limit replacement.
 let retryNotBefore=0,requestKey=key,extra=null,generation=0;const allowance=Math.max(0,maxHttpRetries);
 // Each generation is one request plus its single call-limit replacement. Generation 0 keeps
 // the original keys. An explicit operator continuation (8 Nov 2026) may move to generation N
 // only when every earlier pair ended in confirmed call-limit cancellations; an ambiguous,
 // pending or failed request is always reconciled, never duplicated.
 const pair=g=>g?[fingerprint({operation,attempt,continuationRetry:g}),fingerprint({operation,attempt,continuationRetry:g,callTimeLimitRetry:1})]:[key,fingerprint({operation,attempt,callTimeLimitRetry:1})];
 for(let g=0;g<Math.max(0,Math.floor(Number(continuation)||0));g++){
  const [first,second]=pair(g),a=await budget.loadResponse?.('reasoning',first),b=await budget.loadResponse?.('reasoning',second);
  if(!(limitCancelled(a)&&limitCancelled(b)))break;
  generation=g+1;requestKey=pair(generation)[0];
 }
 for(;;){
  let saved=await budget.loadResponse?.('reasoning',requestKey);
  if(!saved&&recover){const response=await recover(requestKey);if(response){const json=await response.json();saved=response.ok?{version:1,operation,attempt,...(requestIntent?{requestIntent}:{}),json}:{version:1,operation,attempt,...(requestIntent?{requestIntent}:{}),httpFailure:{status:response.status,...require('./provider-error-fields').fields(json),...require('./provider-credit-stop').classify(response.status,json),chargeStatus:'unknown',retryNotBefore:now()+retryDelay(response.headers?.get?.('retry-after'),now())}};await budget.saveResponse?.('reasoning',requestKey,saved);}}
  if(saved&&(saved.version!==1||saved.operation!==operation||saved.attempt!==attempt||(!saved.json&&!saved.httpFailure)))throw Error('Saved reasoning response identity mismatch');
  let outcome=null,failure=saved?.httpFailure;
  if(saved?.json)outcome=limitCancelled(saved)?{abandoned:true,json:saved.json,requestKey,cancellation:saved.cancellation}:await finish(saved.json,requestKey,'saved',null,saved.dispatchedAt);
  else if(!failure){
   if(extra&&retryNotBefore>now()){
    const delay=retryNotBefore-now(),remaining=budget.remainingMs?await budget.remainingMs():Infinity;
    if(delay>=remaining){const e=Error('Provider retry delay exceeds the remaining job budget. Saved work is preserved.');e.code='PROVIDER_RETRY_DEFERRED';throw e;}
    // Sleep in bounded slices; persisted timestamp survives a process restart.
    let left=delay;while(left>0){const slice=Math.min(left,1000);await sleep(slice);left-=slice;}
   }
   const quote=await prepare(requestKey);
   await budget.reserve('reasoning',requestKey,quote);
   const dispatchedAt=now(),started=performance.now();let response,json;try{response=await send();json=await response.json();}catch(error){error.providerRequestKey=requestKey;error.retryableReview=Boolean(recover);error.recovery={version:1,mode:recover?'resume':'reconcile',requestKey};throw error;}
   if(response.ok){await budget.saveResponse?.('reasoning',requestKey,{version:1,operation,attempt,...(requestIntent?{requestIntent}:{}),json,dispatchedAt});outcome=await finish(json,requestKey,'provider',performance.now()-started,dispatchedAt);}
   else{failure={status:response.status,...require('./provider-error-fields').fields(json),...require('./provider-credit-stop').classify(response.status,json),chargeStatus:'unknown',retryNotBefore:now()+retryDelay(response.headers?.get?.('retry-after'),now())};
    await budget.saveResponse?.('reasoning',requestKey,{version:1,operation,attempt,...(requestIntent?{requestIntent}:{}),httpFailure:failure});}
  }
  if(outcome&&!outcome.abandoned)return outcome;
  if(outcome){
   // Record the cancelled attempt (idempotent across restarts); its usage stays unknown.
   await abandoned?.(outcome);
   const limitMs=callTimeLimitMs||outcome.cancellation?.limitMs;
   if(extra||allowance<1)throw callTimeout(requestKey,{json:outcome.json,limitMs,previous:extra});
   const remaining=budget.remainingMs?await budget.remainingMs():Infinity;
   if(remaining<retryMinimumMs)throw callTimeout(requestKey,{json:outcome.json,limitMs,retryWindow:true});
   extra='call-time-limit';requestKey=pair(generation)[1];retryNotBefore=0;
   // Fallbacks: the provider may send the replacement directly and/or to a backup model.
   await prepareReplacement?.({reason:outcome.cancellation?.reason||'call-time-limit',requestKey});continue;
  }
  if(failure.creditsExhausted){await budget.providerUnavailable?.({code:'PROVIDER_CREDITS_EXHAUSTED',status:failure.status,requestKey});throw require('./provider-credit-stop').error();}
  if(!extra&&allowance>0&&failure.status===400&&correctInvalid&&await correctInvalid(failure)){extra='http';requestKey=fingerprint(generation?{operation,attempt,httpRetry:1,continuationRetry:generation}:{operation,attempt,httpRetry:1});retryNotBefore=0;continue;}
  if(!extra&&allowance>0&&failure.retryable&&budget.saveResponse){extra='http';requestKey=fingerprint(generation?{operation,attempt,httpRetry:1,continuationRetry:generation}:{operation,attempt,httpRetry:1});retryNotBefore=failure.retryNotBefore||0;continue;}
  const error=Error('Reasoning provider request failed ('+failure.status+')'+(failure.parameter?' at '+failure.parameter:'')+'. Saved work is preserved.');error.code='PROVIDER_HTTP_ERROR';error.httpStatus=failure.status;error.providerParameter=failure.parameter||null;error.providerErrorCode=failure.errorCode||null;error.retryableReview=false;error.providerRequestKey=requestKey;error.recovery={version:1,mode:'exhausted',reason:'http-recovery-limit',requestKey};throw error;
 }
};

module.exports=async function lockedTransport(args){
 return args.budget.withRequestLock?args.budget.withRequestLock('reasoning',args.key,()=>transport(args)):transport(args);
};
module.exports.retryDelay=retryDelay;
