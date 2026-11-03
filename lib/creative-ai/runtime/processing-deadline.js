'use strict';
// Explicit operator continuations preserve the original budget and every charge.
// They grant processing time only; never additional calls or money.
module.exports=function processingDeadline(job){
 const last=job.processingContinuations?.at(-1);
 return last&&Number.isFinite(last.deadline)?Math.max(job.budget.deadline,last.deadline):job.budget.deadline;
};
