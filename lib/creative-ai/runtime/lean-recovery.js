'use strict';
const fs=require('./artifact-fs'),path=require('node:path'),crypto=require('node:crypto'),{fingerprint}=require('../art-director');
async function read(runtime,id,name){try{return await fs.readJson(path.join(runtime.store.dir(id),name));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
// A saved raster is available to the user while inspection/correction may still
// be unfinished. Recover the existing unit, never invoke the legacy reviewer.
async function inspect(runtime,job){
 const manifest=await read(runtime,job.id,'image-queue.json');
 if(!manifest)return {pending:true,resumePhase:'planning',checkpointSignature:'no-manifest'};
 if(manifest.jobId!==job.id||manifest.brandId!==job.intake.brandId)throw Error('Lean recovery handoff belongs to another project');
 let pending=false;const checkpoints=[];
 for(const unit of manifest.units){
  if(!/^image-queue-[a-f0-9]{24}\.json$/.test(unit.file))throw Error('Invalid lean recovery package path');
  const record=await read(runtime,job.id,unit.file);
  if(!record||crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex')!==unit.hash||record.assignmentId!==job.id||record.placementId!==unit.placementId||record.route!==unit.route)throw Error('Lean recovery package changed');
  const key=fingerprint([record.route,record.placementId]).slice(0,24),state=await read(runtime,job.id,'lean-state-'+key+'.json');
  if(state&&state.packageHash!==record.packageHash)throw Error('Lean recovery checkpoint changed');
  pending ||= state?.status!=='completed';checkpoints.push([unit.hash,state]);
 }
 const needsPlanning=!!manifest.errors?.length||manifest.units.length<manifest.expected;
 return {pending:pending||needsPlanning,resumePhase:needsPlanning?'planning':'image',checkpointSignature:fingerprint({manifest,checkpoints})};
}
module.exports={inspect};
