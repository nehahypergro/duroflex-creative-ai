'use strict';
const fs=require('./artifact-fs'),path=require('node:path'),crypto=require('node:crypto');
const {fingerprint}=require('../art-director');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
// Resolve copy from the same immutable handoff and selected pixels as delivery.
async function source(runtime,job,result){
 const dir=runtime.store.dir(job.id),manifest=await fs.readJson(path.join(dir,'image-queue.json'));
 if(manifest.jobId!==job.id||manifest.brandId!==job.intake.brandId)throw Error('Export belongs to another project');
 const unit=manifest.units.find(u=>u.route===result.route&&u.placementId===result.placementId);
 if(!unit||!/^image-queue-[a-f0-9]{24}\.json$/.test(unit.file))throw Error('Saved lean export package unavailable');
 const record=await fs.readJson(path.join(dir,unit.file));
 if(hash(JSON.stringify(record))!==unit.hash)throw Error('Saved lean export package changed');
 require('./lean-workflow').validateRecord(job,record);
 if(record.route!==result.route||record.placementId!==result.placementId)throw Error('Export placement changed');
 const key=fingerprint([record.route,record.placementId]).slice(0,24),state=await fs.readJson(path.join(dir,'lean-state-'+key+'.json'));
 const selected=state.selected==='candidate'?state.candidate:state.original;
 if(state.packageHash!==record.packageHash||!selected||!/^static-lean-[a-z0-9-]+\.png$/.test(selected.filename)||result.imageUrl.split('/').pop()!==selected.filename||result.sha256!==selected.sha256)throw Error('Selected artwork changed. Reopen the campaign pack.');
 const bytes=await fs.readFile(path.join(dir,selected.filename));if(hash(bytes)!==selected.sha256)throw Error('Saved artwork changed');
 const page=record.plan.pages.find(p=>p.id===record.placementId);
 return {id:'original',dir,name:selected.filename,record:{canvas:{width:selected.width,height:selected.height},exactCopy:{fields:page.copy.map((f,i)=>({...f,id:'copy-'+i,delivery:'artwork'}))}}};
}
module.exports={source};
