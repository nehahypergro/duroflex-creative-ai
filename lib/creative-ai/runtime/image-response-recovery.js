'use strict';
// Reconcile an already reserved image request. This module never submits images.
function verify(saved,inputHash){
 if(saved&&(saved.version!==1||saved.inputHash!==inputHash||!saved.json))throw Error('Saved image response identity mismatch');
 return saved;
}
function unknown(requestKey){return Object.assign(Error('Image response is unresolved after a timeout or connection interruption. Recover the saved request before continuing; no replacement image was submitted and its charge remains unknown.'),{code:'IMAGE_OUTCOME_UNKNOWN',providerRequestKey:requestKey});}
const safeId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(value)?value:null;
async function recover(provider,budget,{requestKey,inputHash,scope,providerRequestId=null}){
 let saved=verify(await budget.loadResponse?.('image',requestKey),inputHash);
 if(!saved&&provider.distributed){
  const response=await provider.distributed.client.recover({kind:'image',requestKey,identityHash:inputHash,context:await budget.dispatchContext()});
  if(response?.ok){const json=await response.json();if(!json.data?.[0]?.b64_json)throw Error('Recovered image response has no image bytes');saved={version:1,inputHash,json,timing:{providerRequestId:safeId(response.headers?.get?.('x-request-id')),inputTransport:'shared-private-response',responseElapsedMs:null}};await budget.saveResponse?.('image',requestKey,saved);}
 }
 if(saved&&!saved.json.data?.[0]?.b64_json)throw Error('Saved image response has no image bytes');
 const recoveredId=safeId(saved?.timing?.providerRequestId)||safeId(providerRequestId);
 await budget.imageWaiting?.({requestKey,inputHash,scope,status:saved?'recovered':'attention',chargeStatus:saved?'usage-recorded-on-resume':'unknown',...(recoveredId?{providerRequestId:recoveredId}:{}),...(!saved?{reason:'Recover the original response; automatic resubmission is disabled.'}:{reason:null})});
 return saved;
}
async function reconcile(runtime,id,brandId){
 const job=await runtime.store.read(id,{hydrate:false});if(!brandId||job.intake.brandId!==brandId)throw Error('Image recovery belongs to a different brand');
 if(runtime.active?.has(id)||['queued','running','preparing'].includes(job.status))throw Error('The current worker is still processing this project');
 const provider=runtime.provider.provider||runtime.provider,budget=runtime.store.budget(id),results=[];
 for(const state of Object.values(job.imageWaits||{}).filter(s=>['attention','requesting'].includes(s.status))){
  try{const response=await recover(provider,budget,state);results.push({requestKey:state.requestKey,recovered:!!response});}
  catch{results.push({requestKey:state.requestKey,recovered:false,reason:'The saved response could not be verified or retrieved. No replacement was submitted.'});}
 }
 return {id,results,recovered:results.filter(r=>r.recovered).length,unresolved:results.filter(r=>!r.recovered).length,paidRequests:0};
}
module.exports={verify,unknown,recover,reconcile};
