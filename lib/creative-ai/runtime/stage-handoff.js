'use strict';
const fs=require('./artifact-fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const eligible=j=>j.intake.rawArtworkExperimentVersion===2||j.intake.originalArtworkVersion===1;
async function saveUnit(runtime,id,record){
 const file='image-queue-'+hash([record.conceptId,record.placementId]).slice(0,24)+'.json';
 await runtime.store.save(id,file,record);
 return {file,hash:hash(record),conceptId:record.conceptId,placementId:record.placementId,route:record.route};
}
async function publish(runtime,id,units,expected,errors){
 const job=await runtime.store.read(id);if(!eligible(job))throw Error('Stage handoff requires original artwork delivery');
 await runtime.store.save(id,'image-queue.json',{version:1,jobId:id,brandId:job.intake.brandId,units,expected,errors});
 await runtime.store.update(id,j=>{j.status='queued';j.stageQueue={version:1,phase:'image',queuedAt:new Date().toISOString()};return j;});
}
async function generate(runtime,id){
 const release=await require('./file-lock').acquire(path.join(runtime.store.dir(id),'.runner.lock'),{timeoutMs:100});
 try{
 const job=await runtime.store.read(id),manifest=await fs.readJson(path.join(runtime.store.dir(id),'image-queue.json'));
 if(!eligible(job)||manifest.jobId!==id||manifest.brandId!==job.intake.brandId)throw Error('Image queue binding mismatch');
 // Validate the entire handoff before any paid dispatch. No fresh planning here.
 const records=[];for(const unit of manifest.units){
  if(!/^image-queue-[a-f0-9]{24}\.json$/.test(unit.file))throw Error('Invalid queued package path');
  const record=await fs.readJson(path.join(runtime.store.dir(id),unit.file));
  if(hash(record)!==unit.hash||record.assignmentId!==id||record.placementId!==unit.placementId||record.conceptId!==unit.conceptId||record.route!==unit.route)throw Error('Queued package changed');records.push(record);
 }
 await runtime.store.update(id,j=>{j.status='running';j.stageQueue={...j.stageQueue,phase:'image',startedAt:new Date().toISOString()};return j;});
 const lean=require('./lean-policy').enabled(job.intake),budget=runtime.store.budget(id),plan=lean?null:await runtime.readCarouselPlan(id);
 const settled=await require('./unit-scheduler').run(records,{limit:runtime.config.maxConcurrentUnits||1,carouselPlan:plan,execute:async record=>require('./lean-policy').enabled(job.intake)?require('./lean-workflow').generate(runtime,id,record,budget):runtime.unit(id,await runtime.carouselPackage(id,record),budget)});
 const errors=[...manifest.errors];settled.forEach((r,i)=>{if(r.status==='rejected')errors.push({conceptId:records[i].conceptId,route:records[i].route,placementId:records[i].placementId,error:String(r.reason?.message||r.reason)});});
 await runtime.store.update(id,j=>{j.status=lean&&errors.length?((j.results||[]).length?'partial':'failed'):require('./output-completion').classify(j.results,manifest.expected);j.unitErrors=errors;j.error=errors.length?errors.map(e=>e.error).join(' · ').slice(0,800):null;j.stageQueue={...j.stageQueue,phase:'complete',finishedAt:new Date().toISOString()};return j;});
 }finally{await release();}
}
module.exports={eligible,saveUnit,publish,generate};
