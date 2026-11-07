'use strict';
const {RATES,estimate}=require('../../cost-tracker');
const round=n=>Math.round(n*1e9)/1e9;
function policy(){return {version:1,rates:structuredClone(RATES),basis:'Usage-priced estimates, not invoices; unresolved calls retain their reservation.'};}
function quote(spend,kind,{model,inputTokens,outputTokens}={}){
 if(spend.accounting?.version!==1)return null;
 const rate=spend.accounting.rates.models[model];
 if(!rate)throw Object.assign(Error('No pinned pricing for '+model+'; paid dispatch held.'),{code:'BUDGET_MODEL_UNPRICED'});
 if(kind==='image')return {version:1,kind,model,usd:spend.imageUsd,basis:'Configured image allowance; reconciled to detailed token usage. Not a guaranteed invoice ceiling.'};
 if(!Number.isSafeInteger(inputTokens)||inputTokens<0||!Number.isSafeInteger(outputTokens)||outputTokens<1)throw Object.assign(Error('Token count is required for usage-based budget admission.'),{code:'BUDGET_TOKEN_COUNT_REQUIRED'});
 // No cache-hit assumption. Allow for cache writes and long-context premiums.
 const long=rate.longContextThreshold&&inputTokens>rate.longContextThreshold;
 const usd=(inputTokens*Math.max(rate.input,rate.write||0)*(long?rate.longInputMultiplier:1)+outputTokens*rate.output*(long?rate.longOutputMultiplier:1))/1e6;
 if(!Number.isFinite(usd)||usd<0)throw Error('Invalid model reservation estimate');
 return {version:1,kind,model,inputTokens,outputTokens,usd:round(usd),basis:'Pinned list rates; full output allowance including reasoning, no cache discount.'};
}
function settle(job,receipt){
 const s=job.budget.estimatedSpend;if(s?.accounting?.version!==1)return;
 const reservation=s.reservations.find(r=>r.kind===receipt.kind&&r.key===receipt.requestKey);
 if(!reservation||reservation.settlement)return;
 const usd=estimate(receipt,s.accounting.rates);if(usd===null)return; // Missing usage never means free.
 reservation.settlement={estimatedUsd:usd,requestId:receipt.requestId||null,at:new Date().toISOString(),basis:'Provider token usage at pinned list prices; invoice unknown'};
 const delta=usd-reservation.usd;s.reservedUsd=round(Math.max(0,s.reservedUsd+delta));
 for(const c of Object.values(job.componentRepairs||{}))if(c.requestKeys?.some(k=>k.kind===receipt.kind&&k.key===receipt.requestKey))c.reservedUsd=round(Math.max(0,(c.reservedUsd||0)+delta));
 s.estimatedUsageUsd=round(s.reservations.reduce((n,r)=>n+(r.settlement?.estimatedUsd||0),0));
 if(s.reservedUsd>s.maxUsd)s.overrun={estimatedUsd:round(s.reservedUsd-s.maxUsd),at:new Date().toISOString(),furtherDispatchBlocked:true};
}
module.exports={policy,quote,settle};
