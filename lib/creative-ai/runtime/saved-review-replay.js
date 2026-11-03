'use strict';
// Replay complete recorded responses only. This capability cannot admit a new
// provider request, change accounting, or substitute an unrelated response.
function budgetFrom(original,loaded){
 const blocked=async()=>{throw Error('Saved review replay cannot dispatch or change provider accounting');};
 return {...original,loadResponse:async(kind,key)=>{const saved=await original.loadResponse(kind,key);if(!saved?.json)throw Error('Complete saved review response unavailable for '+kind+':'+key);loaded.push({kind,key});return saved;},reserve:blocked,saveResponse:blocked,receipt:async()=>{},preflight:async()=>{},invalid:async()=>{},transportFailure:async()=>{}};
}
function eligible(record,failure,report){return report.evidenceMode==='pending'&&typeof failure?.error==='string'&&/\$\.evidence\.critical\[\d+\]\.evidence\.expected: invalid string length/.test(failure.error)&&require('./copy-checks').requiredFields(record).length===0;}
async function replay(runtime,id,record,image,scope,failure,original){
 if(!eligible(record,failure,original))throw Error('Saved review does not match the repaired empty-copy contract defect');
 const job=await runtime.store.read(id),loaded=[],treatment=require('../treatment-knowledge'),treatmentContext=treatment.forPlacement(treatment.forJob(job),scope.placementId),logoOverlay=await require('./logo-overlay').verify(runtime,id,record,image.imageData,image.name);
 const outcome=await require('./review').review(record,image.imageData,{provider:runtime.provider,budget:budgetFrom(runtime.store.budget(id),loaded),dir:runtime.store.dir(id),attempt:scope.route+'-'+scope.placementId+'-contract-replay',logoOverlay,treatmentContext});
 if(!loaded.length||outcome.report.artifactHash!==original.artifactHash||outcome.report.packageHash!==original.packageHash)throw Error('Saved review replay must use recorded responses for the original image/package');
 return {...outcome,replay:{version:1,repair:'empty-required-copy-expectation-v1',originalReviewHash:original.reviewHash,loaded,paidDispatches:0}};
}
module.exports={budgetFrom,eligible,replay};
