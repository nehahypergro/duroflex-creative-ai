'use strict';
const {fingerprint}=require('../art-director');
const key=id=>'studio-restart-'+id;
async function source(runtime,id,brandId){
 const job=await runtime.store.read(id);
 if(brandId&&job.intake.brandId!==brandId)throw Error('This project belongs to another brand.');
 if(!['failed','partial'].includes(job.status))throw Error('Only an interrupted or incomplete project can be restarted.');
 return job;
}
async function prepare(runtime,id,brandId){
 const job=await source(runtime,id,brandId),existing=(await runtime.store.list({metadataOnly:true})).find(j=>j.intake.requestKey===key(id)&&j.intake.brandId===job.intake.brandId);
 if(existing)return {brandId:job.intake.brandId,existingId:existing.id};
 const dimensions=job.selection?.[0]?.description?.dimensions||{};
 return {brandId:job.intake.brandId,token:fingerprint({id,intake:job.intake,status:job.status,config:runtime.config}),cost:await require('./studio-estimate').estimateBrief(runtime,job.intake.brandId,{...dimensions,unitCount:job.selection?.length||1}),message:'Start a new attempt using the saved brief and selected product. Your original project and its costs will be kept. New generation charges apply; unresolved earlier charges remain separate.'};
}
async function submit(runtime,id,input){
 // One child per failed attempt, including simultaneous clicks and lost responses.
 const previous=runtime.studioRestartQueue||Promise.resolve();
 const next=previous.catch(()=>{}).then(()=>require('./submission-lock')(runtime,'restart:'+id,async()=>{
  if(!input.brandId)throw Error('Choose the original brand.');
  const prepared=await prepare(runtime,id,input.brandId);
  if(prepared.existingId)return {id:prepared.existingId,reused:true};
  if(input.confirmPaid!==true||input.token!==prepared.token)throw Error('Review the restart details before starting this paid attempt.');
  const job=await source(runtime,id,input.brandId),intake=structuredClone(job.intake);
  delete intake.retryMode;delete intake.studioReadinessToken;
  intake.requestKey=key(id);intake.restartSourceJobId=id;
  return {id:await runtime.create(intake),reused:false};
 }));runtime.studioRestartQueue=next;return next;
}
module.exports={prepare,submit};
