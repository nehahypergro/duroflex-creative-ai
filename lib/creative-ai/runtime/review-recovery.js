'use strict';
const fs=require('./artifact-fs'),path=require('path');
const MAX_ATTEMPTS=3;
function retryable(error){
 const code=error?.code||error?.errorCode,message=error?.message||error?.error||'';
 if(error?.recovery?.mode==='exhausted'||['REASONING_OUTPUT_LIMIT','INVALID_AGENT_JSON','VERIFICATION_RECOVERY_EXHAUSTED'].includes(code)||/after one bounded retry|Verification retry limit reached/i.test(message))return false;
 // Counting failed before a generation reservation; retrying this preflight
 // does not require a new semantic review or a changed request identity.
 if(error?.retryableReview===false)return false;
 if(error?.retryable===false)return false;
 if(code==='INPUT_CONTEXT_COUNT_UNAVAILABLE')return true;
 if(error?.retryableReview===true)return true;
 if(error?.retryable===true)return true;
 if(error?.recovery?.mode==='resume')return true;
 if(/Agent output failed|validated contract|spend|budget|call limit|authentication/i.test(message))return false;
 return ['TimeoutError','AbortError'].includes(error?.name)||/^(fetch failed|network (error|unavailable|offline)|socket hang up|ECONNRESET|ETIMEDOUT)|Reasoning provider request failed \((408|429|5\d\d)\)/i.test(message);
}
function failure(error){return {error:String(error.message||error.error).slice(0,1200),code:error.code||error.errorCode||null,retryable:retryable(error),...(error.recovery?{recovery:error.recovery}:{}),...(error.providerRequestKey?{providerRequestKey:error.providerRequestKey}:{}),...(error.providerResponseId?{providerResponseId:error.providerResponseId}:{})};}
async function available({dir,key,failure:failed}){
 if(!retryable(failed))return false;
 try{const state=await fs.readJson(path.join(dir,'review-recovery-'+key+'.json'));return !['complete','blocked','exhausted'].includes(state.status)&&(state.attempts.length<MAX_ATTEMPTS||state.attempts.at(-1)?.status==='waiting');}catch(e){if(e.code==='ENOENT')return true;throw e;}
}
// Reserve each verification attempt on disk BEFORE dispatch. Restarting cannot reset it.
async function inspectWithRecovery({dir,key,packageHash,artifactHash,inspect,onRetry=async()=>{}}){
 const file=path.join(dir,'review-recovery-'+key+'.json');let state;
 try{state=JSON.parse(await fs.readFile(file));}catch(e){if(e.code!=='ENOENT')throw e;state={version:1,packageHash,artifactHash,attempts:[],status:'pending'};}
 if(state.packageHash!==packageHash||state.artifactHash!==artifactHash)throw Error('Verification retry cannot change image or package');
 const save=async()=>{await fs.writeFile(file+'.pending',await fs.jsonBytes(file,state));await fs.rename(file+'.pending',file);};
 if(state.status==='complete')return state.outcome;
 while((state.attempts.length<MAX_ATTEMPTS||state.attempts.at(-1)?.status==='waiting')&&!['blocked','exhausted'].includes(state.status)){
  const waiting=state.attempts.at(-1)?.status==='waiting',attempt=waiting?state.attempts.at(-1):{number:state.attempts.length+1,status:'reserved',reservedAt:new Date().toISOString()};if(!waiting)state.attempts.push(attempt);await save();
  try{const outcome=await inspect(attempt.number);attempt.status='complete';state.status='complete';state.outcome=outcome;await save();return outcome;}
  catch(e){Object.assign(attempt,failure(e));attempt.status=e.recovery?.mode==='resume'?'waiting':'failed';state.status=attempt.retryable?'pending':'blocked';await save();if(!attempt.retryable||attempt.status==='waiting')throw e;if(state.attempts.length<MAX_ATTEMPTS)await onRetry(attempt);}
 }
 const last=state.attempts.at(-1),error=Error(last?.error||'Verification retry limit reached');Object.assign(error,last?failure(last):{});error.code=last?.code||'VERIFICATION_RECOVERY_EXHAUSTED';error.retryableReview=false;error.recovery={...last?.recovery,mode:'exhausted'};if(state.status!=='blocked'){state.status='exhausted';await save();}throw error;
}
function deadlineCanResume(job,failure,now=Date.now()){
 const amendment=job.pdpTimeContinuations?.at(-1),created=Date.parse(job.createdAt);
 return failure?.error==='Job time budget reached'&&Boolean(amendment)&&Number.isFinite(created)&&amendment.previousDeadline<amendment.deadline&&amendment.deadline===job.budget?.deadline&&now<amendment.deadline&&amendment.deadline<=created+120*60*1000;
}
module.exports={retryable,failure,available,inspectWithRecovery,MAX_ATTEMPTS,deadlineCanResume};
