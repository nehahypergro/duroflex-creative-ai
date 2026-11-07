'use strict';
// Explicit operator continuation after a confirmed quota rejection. Never infer
// permission from a timeout, missing response, or a successful saved result.
const {fingerprint}=require('../art-director');
const quota=e=>e&&(/^(insufficient_quota|credit_balance_exhausted|billing_hard_limit_reached|billing_not_active)$/.test(e.code||e.errorCode||e.type||e.errorType||''));
function rejected(job,kind,key,saved){
 if(saved?.json?.status==='completed'||saved?.json?.data?.[0]?.b64_json)return false;
 if(saved?.json?.status==='failed'&&quota(saved.json.error))return true;
 if(saved?.httpFailure?.creditsExhausted)return true;
 const wait=job.imageWaits?.[key],block=job.providerBlock;
 return kind==='image'&&block?.code==='PROVIDER_CREDITS_EXHAUSTED'&&block.requestKey===key&&wait?.status==='failed'&&[400,402,429].includes(wait.httpStatus);
}
function plan(job,requests,authorization){
 if(!authorization?.id||!authorization?.at||authorization.reason!=='user-confirmed-credits-added')throw Error('Explicit credit continuation authorization required');
 const mappings={};
 for(const {kind,key,saved} of requests){
  if(!['reasoning','image'].includes(kind)||!/^[a-f0-9]{64}$/.test(key))throw Error('Invalid original request identity');
  if(rejected(job,kind,key,saved))mappings[kind+':'+key]={kind,parentKey:key,key:fingerprint({jobId:job.id,kind,parentKey:key,creditContinuation:authorization.id}),reason:'confirmed-quota-rejection'};
 }
 return {version:1,jobId:job.id,authorization,mappings};
}
function resolve(record,kind,key){
 const entry=record?.mappings?.[kind+':'+key];
 if(!entry)return key;
 if(entry.kind!==kind||entry.parentKey!==key||entry.reason!=='confirmed-quota-rejection'||!/^[a-f0-9]{64}$/.test(entry.key))throw Error('Invalid credit continuation binding');
 return entry.key;
}
module.exports={rejected,plan,resolve};
