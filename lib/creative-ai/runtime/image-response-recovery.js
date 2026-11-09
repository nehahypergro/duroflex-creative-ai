'use strict';
// Reconcile an already reserved image request. This module never submits images.
const {fingerprint}=require('../art-director');
const RETRYABLE_STATUS=[429,500,502,503,504];
// A saved outcome is either the provider's image response or a complete HTTP failure.
function verify(saved,inputHash){
 if(saved&&(saved.version!==1||saved.inputHash!==inputHash||!saved.json===!saved.httpFailure))throw Error('Saved image response identity mismatch');
 return saved;
}
// A complete HTTP error is a resolved outcome. Persist identifiers only: provider messages
// can echo prompts or signed URLs. Its charge stays unknown; nothing here prices it.
function httpFailure(status,json,retryAfter,{now=Date.now(),providerRequestId=null}={}){
 return {status,...require('./provider-error-fields').fields(json),...require('./provider-credit-stop').classify(status,json),chargeStatus:'unknown',retryNotBefore:now+require('./reasoning-transport').retryDelay(retryAfter,now),...(providerRequestId?{providerRequestId}:{})};
}
// The one separately budgeted retry after a complete retryable failure has its own identity.
const retryKey=requestKey=>fingerprint({imageRequestKey:requestKey,httpRetry:1});
function httpError(failure,requestKey,{attempts=1,detail=null}={}){
 const codes=[failure.errorCode,failure.errorType,failure.parameter?'parameter '+failure.parameter:null].filter(Boolean).join(', ');
 return Object.assign(Error('Image provider request failed ('+failure.status+')'+(detail?': '+detail:codes?': '+codes:'')+'. '+(attempts>1?'Its one separately budgeted retry also failed; ':failure.retryable?'':'This error is not retryable; ')+'no further image request was sent. Saved work is preserved; the charge for the failed request remains unknown.'),{code:'IMAGE_PROVIDER_HTTP_ERROR',httpStatus:failure.status,providerErrorCode:failure.errorCode||null,retryable:false,retryableReview:false,providerRequestKey:requestKey,attempts});
}
function unknown(requestKey){return Object.assign(Error('Image response is unresolved after a timeout or connection interruption. Recover the saved request before continuing; no replacement image was submitted and its charge remains unknown.'),{code:'IMAGE_OUTCOME_UNKNOWN',providerRequestKey:requestKey});}
const safeId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(value)?value:null;
async function recover(provider,budget,{requestKey,inputHash,scope,providerRequestId=null}){
 let saved=verify(await budget.loadResponse?.('image',requestKey),inputHash);
 if(!saved&&provider.distributed){
  const response=await provider.distributed.client.recover({kind:'image',requestKey,identityHash:inputHash,context:await budget.dispatchContext()});
  if(response?.ok){const json=await response.json();if(!json.data?.[0]?.b64_json)throw Error('Recovered image response has no image bytes');saved={version:1,inputHash,json,timing:{providerRequestId:safeId(response.headers?.get?.('x-request-id')),inputTransport:'shared-private-response',responseElapsedMs:null}};await budget.saveResponse?.('image',requestKey,saved);}
  else if(response&&Number.isInteger(response.status)&&response.status>=400){let json=null;try{json=await response.json();}catch{}saved={version:1,inputHash,httpFailure:httpFailure(response.status,json,response.headers?.get?.('retry-after'),{providerRequestId:safeId(response.headers?.get?.('x-request-id'))})};await budget.saveResponse?.('image',requestKey,saved);}
 }
 if(saved?.httpFailure){await budget.imageWaiting?.({requestKey,inputHash,scope,status:'failed',chargeStatus:'unknown',httpStatus:saved.httpFailure.status,responseSaved:true,reason:null});return saved;}
 if(saved&&!saved.json.data?.[0]?.b64_json)throw Error('Saved image response has no image bytes');
 const recoveredId=safeId(saved?.timing?.providerRequestId)||safeId(providerRequestId);
 await budget.imageWaiting?.({requestKey,inputHash,scope,status:saved?'recovered':'attention',chargeStatus:saved?'usage-recorded-on-resume':'unknown',...(recoveredId?{providerRequestId:recoveredId}:{}),...(!saved?{reason:'Recover the original response; automatic resubmission is disabled.'}:{reason:null})});
 return saved;
}
// Before 8 Nov 2026 a complete image HTTP error was recorded only in imageWaits (status
// 'failed' + httpStatus), never as a saved response, so resume refused forever. That wait
// state is written only after the provider's status line was received, so it is evidence
// of a resolved failure; reconciliation saves it without any paid request.
const unsavedFailure=state=>state?.status==='failed'&&!state.responseSaved&&Number.isInteger(state.httpStatus)&&state.httpStatus>=400&&state.httpStatus<600&&/^[a-f0-9]{64}$/.test(state.requestKey||'')&&/^[a-f0-9]{64}$/.test(state.inputHash||'');
async function reconcile(runtime,id,brandId){
 const job=await runtime.store.read(id,{hydrate:false});if(!brandId||job.intake.brandId!==brandId)throw Error('Image recovery belongs to a different brand');
 if(runtime.active?.has(id)||['queued','running','preparing'].includes(job.status))throw Error('The current worker is still processing this project');
 const provider=runtime.provider.provider||runtime.provider,budget=runtime.store.budget(id),results=[];
 for(const state of Object.values(job.imageWaits||{})){
  if(['attention','requesting'].includes(state.status)){
   try{const response=await recover(provider,budget,state);results.push({requestKey:state.requestKey,recovered:!!response});}
   catch{results.push({requestKey:state.requestKey,recovered:false,reason:'The saved response could not be verified or retrieved. No replacement was submitted.'});}
  }else if(unsavedFailure(state)){
   try{
    if(await budget.loadResponse('image',state.requestKey)||!await budget.requestStatus?.('image',state.requestKey))continue;
    const block=job.providerBlock,creditsExhausted=block?.code==='PROVIDER_CREDITS_EXHAUSTED'&&block.requestKey===state.requestKey&&[400,402,429].includes(state.httpStatus);
    await budget.saveResponse('image',state.requestKey,{version:1,inputHash:state.inputHash,httpFailure:{status:state.httpStatus,errorCode:null,errorType:null,parameter:null,creditsExhausted,retryable:!creditsExhausted&&!block&&RETRYABLE_STATUS.includes(state.httpStatus),chargeStatus:'unknown',retryNotBefore:0,source:'reconciled-wait-state',reconciledAt:new Date().toISOString()}});
    results.push({requestKey:state.requestKey,recovered:false,resolvedFailure:true,httpStatus:state.httpStatus});
   }catch{results.push({requestKey:state.requestKey,recovered:false,reason:'The recorded HTTP failure could not be saved. No replacement was submitted.'});}
  }
 }
 return {id,results,recovered:results.filter(r=>r.recovered).length,resolvedFailures:results.filter(r=>r.resolvedFailure).length,unresolved:results.filter(r=>!r.recovered&&!r.resolvedFailure).length,paidRequests:0};
}
module.exports={verify,httpFailure,retryKey,httpError,unknown,recover,unsavedFailure,reconcile};
