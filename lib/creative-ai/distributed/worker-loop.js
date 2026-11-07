'use strict';
const sleep=require('node:timers/promises').setTimeout;
async function runLoop({kind,owner,coordinator,execute,reconcile,stopped,delay=sleep,report=console.error}){
 let failures=0,nextReconcile=0;
 while(!stopped()){
  try{
   if(reconcile&&Date.now()>=nextReconcile){await reconcile(kind);nextReconcile=Date.now()+15000;}
   const request=await coordinator.claim(kind,owner);failures=0;
   if(!request){await delay(500);continue;}
   try{await execute(request);}catch(e){report(JSON.stringify({jobId:request.job_id,kind,requestKey:request.request_key,status:'check-shared-execution-record'}));}
  }catch(e){failures++;report(JSON.stringify({kind,status:'coordinator-unavailable',attempt:failures}));await delay(Math.min(15000,500*2**Math.min(failures-1,5)));}
 }
}
module.exports={runLoop};
