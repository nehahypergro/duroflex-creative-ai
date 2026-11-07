'use strict';
// One shared continuation for new runs and interrupted-check recovery.
// Image and review deduplication remain owned by their durable page ledgers.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const review=require('./visual-review'),correction=require('./correction');
const active=new Map();
async function finishRun(root,id,options={}){
 const key=root+':'+id;if(active.has(key))return active.get(key);
 const work=finish(root,id,options);active.set(key,work);try{return await work;}finally{active.delete(key);}
}
async function finish(root,id,options){
 const dir=review.directory(root,id),run=JSON.parse(await fs.readFile(path.join(dir,'run.json'),'utf8'));
 if(run.version!==2||!['completed','partial'].includes(run.status))throw Error('Finishing requires a finished v2 comparison');
 const state={attemptId:'finishing-attempt-'+crypto.randomUUID(),startedAt:new Date().toISOString(),status:'reviewing',errors:[]};
 const persist=async()=>{await review.save(path.join(dir,state.attemptId+'.json'),state);await review.save(path.join(dir,'finishing.json'),state);};
 const results={reviews:[],corrections:[]};await persist();
 try{
  results.reviews=await (options.review||review.reviewRun)(root,id,options.reviewOptions||{});
  state.review={status:'completed',pages:results.reviews.map(r=>({artifact:r.artifact,status:r.status,binding:r.binding,error:r.error}))};
 }catch(e){const message=e?.message||String(e);state.review={status:'interrupted',error:message};state.errors.push({stage:'review',message});}
 if(run.correctionPolicy===1){
  state.status='correcting';await persist();
  try{
   results.corrections=await (options.correct||correction.correctRun)(root,id,options.correctionOptions||{});
   state.correction={status:'completed',pages:results.corrections.map(r=>({model:r.model,pageId:r.pageId,status:r.status,error:r.error}))};
  }catch(e){const message=e?.message||String(e);state.correction={status:'interrupted',error:message};state.errors.push({stage:'correction',message});}
 }else state.correction={status:'not_enabled'};
 // This is processing status, never an assertion that every artwork passed.
 const pending=results.reviews.some(r=>['pending','checking','submitting'].includes(r.status))||results.corrections.some(r=>['diagnosing','planned','correcting','checking'].includes(r.status));
 const problems=state.errors.length||results.reviews.some(r=>['unknown','verification_problem'].includes(r.status))||results.corrections.some(r=>['unknown','held','not_selected'].includes(r.status));
 state.status=pending?'pending':problems?'partial':'completed';state.finishedAt=new Date().toISOString();await persist();
 return {...results,status:state.status,errors:state.errors};
}
module.exports={finishRun};
