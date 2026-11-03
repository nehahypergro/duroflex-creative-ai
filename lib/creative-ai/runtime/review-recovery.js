'use strict';
const fs=require('./artifact-fs'),path=require('path');
const MAX_ATTEMPTS=3;
function retryable(error){
 if(error?.retryableReview===false)return false;
 if(error?.retryableReview===true)return true;
 if(/Agent output failed|validated contract|spend|budget|call limit|authentication/i.test(error?.message||''))return false;
 return ['TimeoutError','AbortError'].includes(error?.name)||/^(fetch failed|network (error|unavailable|offline)|socket hang up|ECONNRESET|ETIMEDOUT)|Reasoning provider request failed \((408|429|5\d\d)\)/i.test(error?.message||'');
}
// Reserve each verification attempt on disk BEFORE dispatch. Restarting cannot reset it.
async function inspectWithRecovery({dir,key,packageHash,artifactHash,inspect,onRetry=async()=>{}}){
 const file=path.join(dir,'review-recovery-'+key+'.json');let state;
 try{state=JSON.parse(await fs.readFile(file));}catch(e){if(e.code!=='ENOENT')throw e;state={version:1,packageHash,artifactHash,attempts:[],status:'pending'};}
 if(state.packageHash!==packageHash||state.artifactHash!==artifactHash)throw Error('Verification retry cannot change image or package');
 const save=async()=>{await fs.writeFile(file+'.pending',await fs.jsonBytes(file,state));await fs.rename(file+'.pending',file);};
 if(state.status==='complete')return state.outcome;
 while(state.attempts.length<MAX_ATTEMPTS&&state.status!=='blocked'){
  const attempt={number:state.attempts.length+1,status:'reserved',reservedAt:new Date().toISOString()};state.attempts.push(attempt);await save();
  try{const outcome=await inspect(attempt.number);attempt.status='complete';state.status='complete';state.outcome=outcome;await save();return outcome;}
  catch(e){attempt.status='failed';attempt.error=String(e.message).slice(0,800);attempt.retryable=retryable(e);state.status=attempt.retryable?'pending':'blocked';await save();if(!attempt.retryable)throw e;if(state.attempts.length<MAX_ATTEMPTS)await onRetry(attempt);}
 }
 const error=Error(state.attempts.at(-1)?.error||'Verification retry limit reached');error.retryableReview=state.status!=='blocked';throw error;
}
function deadlineCanResume(job,failure,now=Date.now()){
 const amendment=job.pdpTimeContinuations?.at(-1),created=Date.parse(job.createdAt);
 return failure?.error==='Job time budget reached'&&Boolean(amendment)&&Number.isFinite(created)&&amendment.previousDeadline<amendment.deadline&&amendment.deadline===job.budget?.deadline&&now<amendment.deadline&&amendment.deadline<=created+120*60*1000;
}
module.exports={retryable,inspectWithRecovery,MAX_ATTEMPTS,deadlineCanResume};
