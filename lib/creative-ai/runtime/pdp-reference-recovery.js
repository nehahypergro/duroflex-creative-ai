'use strict';
const fs=require('./artifact-fs'),path=require('path'),{fingerprint}=require('../art-director'),life=require('../creative-reviewer/lifecycle');
const reason='Exact SKU source must remain an attached product reference.';
function eligible(job,record,result){
 if(record.status!=='blocked'||!record.dependencies.length||record.dependencies.some(d=>d.reason!==reason)||result?.imageUrl||result?.correctionCycles) return false;
 for(const attempt of [0,1,'preflight']){const key=fingerprint({id:job.id,route:record.route,placementId:record.placementId,attempt});if(job.budget.imageReservations?.includes(key)||job.budget.requestStates?.['image:'+key]||job.budget.receipts?.some(r=>r.kind==='image'&&r.requestKey===key))throw Error('Image dispatch exists for this unit; reference repair cannot retry it');}
 return true;
}
async function prepare(runtime,id){
 const job=await runtime.store.read(id);if(['running','queued','preparing'].includes(job.status))throw Error('Wait for the active PDP run before reference recovery');if(!require('./pdp').groups(job.selection).length)throw Error('Only full PDP packs use this recovery');
 const prepared=await require('./generation-recovery').prepare(runtime,id);runtime.access=await runtime.provider.checkAccess();if(!runtime.access.configured)throw Error('Configured image provider is unavailable');
 const dir=runtime.store.dir(id),read=async name=>{try{return JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}},recovered=[];
 for(const raw of prepared.packages.records){const repaired=runtime.activatePackage(raw),prefix=repaired.route+'-'+repaired.placementId;if(job.pdpPreflightRecoveries?.[prefix])continue;const original=await read('package-'+prefix+'-0.json');if(!original)continue;const result=job.results.find(r=>r.route===repaired.route&&r.placementId===repaired.placementId);if(!eligible(job,original,result))continue;
  const {packageHash,...body}=original;if(fingerprint(body)!==packageHash)throw Error('Original preflight package changed');
  for(const key of ['artHash','copyHash','conceptHash','brandHash','placementHash'])if(original[key]!==repaired[key])throw Error('Reference recovery cannot change creative decisions');
  const name='package-'+prefix+'-preflight.json',saved=await read(name);if(saved&&saved.packageHash!==repaired.packageHash)throw Error('Recovery package changed');if(!saved)await runtime.store.save(id,name,repaired);
  let state;try{state=await runtime.reviews.read(life.unitKey(original));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(state){if(state.preflightRecovery){if(state.preflightRecovery.packageHash!==repaired.packageHash||state.phase!=='preflight-generation')throw Error('Existing recovery is not the same pending initial generation');}else{const report=await read('review-'+prefix+'-0.json');await runtime.reviews.reservePreflight(state.unitKey,report,original,repaired);}}
  const entry={recordedAt:new Date().toISOString(),originalPackageHash:original.packageHash,packageHash:repaired.packageHash,originalResult:result||null,reason:'Restore the hash-checked mandatory identity anchor before the first image request. No previous image or correction is replaced.'};
  await runtime.store.update(id,j=>{if(['running','queued','preparing'].includes(j.status))throw Error('PDP resumed during repair');j.pdpPreflightRecoveries??={};j.pdpPreflightRecoveries[prefix]=entry;j.results=j.results.filter(r=>!(r.route===repaired.route&&r.placementId===repaired.placementId));j.status='partial';return j;});recovered.push(prefix);
 }
 return {id,recovered};
}
module.exports={eligible,prepare};
