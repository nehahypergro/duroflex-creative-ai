'use strict';
// Diagnostic projection only. Never equate saved source artwork with release approval.
function diagnose(message=''){
 const fidelity=message.match(/photograph \(fail\).*Product fidelity (\d+)\/100; threshold (\d+)/i);
 if(fidelity&&Number(fidelity[1])<Number(fidelity[2]))return {component:'product',action:'Repair product appearance',explanation:'Use exact-SKU references to correct only the observed product region, then repeat fidelity and side-effect checks.',evidence:message,automaticRepairAvailable:false};
 const rules=[
  [/below the pinned viewing-size|readability|does not fit|Editable line requires excessive spacing adjustment/i,'typography','Recompose affected text','Verify the reading-size measurement, then create a revised composition preserving required wording.'],
  [/logo remains|campaign logo.*repair/i,'logo','Repair logo region','Remove only the unwanted campaign logo and restore the approved logo asset.'],
  [/embedded.*(word|typograph|text)|baked-in|headline.*clean|clean.*(PMax|image)/i,'background','Remove campaign lettering','Repair unwanted campaign lettering while preserving physical product markings.'],
  [/\(400\)|invalid.*parameter/i,'request','Diagnose invalid request','Inspect the provider diagnostic and correct the rejected parameter before retrying this operation.'],
  [/timeout|network|\(429\)|\(5\d\d\)/i,'transport','Reconcile provider request','Retrieve an existing provider response before considering another dispatch.'],
  [/export|PDF|packag/i,'export','Rebuild affected export','Reuse the saved composition and rerun the affected export checks.']
 ];
 const r=rules.find(r=>r[0].test(message));return {component:r?.[1]||'review',action:r?.[2]||'Inspect this asset',explanation:r?.[3]||'Inspect the recorded finding before selecting a repair.',evidence:message,automaticRepairAvailable:false};
}
function project(job){
 const routes=job.intake?.conceptRoutes?.length?job.intake.conceptRoutes:[...new Set([...(job.results||[]),...(job.unitErrors||[])].map(r=>r.route).filter(Boolean))];
 const units=[];for(const s of job.selection||[]){for(const route of routes.length?routes:['continuity']){
  const result=(job.results||[]).find(r=>r.placementId===s.id&&r.route===route),failure=(job.unitErrors||[]).find(r=>r.placementId===s.id&&r.route===route);
  const planning=(job.planningIssues||[]).filter(i=>i.blocking&&(!i.placementIds?.length||i.placementIds.includes(s.id)));
  const findings=[failure?.error,...(result?.validation||[])].filter(x=>typeof x==='string'&&x.trim()&&!/^Advisory: /.test(x));
  const status=result?.ready===true?'ready':findings.length?'needs-attention':result?.imageUrl?'review-required':['running','queued'].includes(job.status)?'processing':'pending';
  units.push({placementId:s.id,route,name:s.description?.name||s.id,status:result?.ready===true?status:planning.length?'needs-attention':status,savedImage:!!result?.imageUrl,issues:[...findings.map(diagnose),...planning.map(i=>({...i,explanation:i.action}))]});
 }}
 for(const u of units)u.classifiedFindings=u.issues.map(i=>require('./finding-classification').classify({status:i.blocking?'fail':'unknown',requirement:i.rule||i.requirement||'',evidence:i.evidence||i.explanation},{placementId:u.placementId,route:u.route,component:i.component||'planning'}));
 const counts={};for(const u of units)counts[u.status]=(counts[u.status]||0)+1;
 return {version:1,units,counts,total:units.length,ready:counts.ready||0,needsAttention:(counts['needs-attention']||0)+(counts['review-required']||0)};
}
async function view(runtime,job){
 if(require('./lean-policy').enabled(job.intake))return null;
 const fs=require('./artifact-fs'),out=project(job);let names;
 try{names=new Set(await fs.readdir(runtime.store.dir(job.id)));}catch(e){if(e.code!=='ENOENT')throw e;names=new Set();out.artifactInspectionUnavailable=true;}
 for(const u of out.units){const k=u.route+'-'+u.placementId,repair=Object.values(job.componentRepairs||{}).filter(r=>r.unit.route===u.route&&r.unit.placementId===u.placementId).sort((a,b)=>(b.startedAt||'').localeCompare(a.startedAt||''))[0];
  const exists=prefix=>names.has(prefix+k+'.json'),image=names.has('composed-source-'+k+'.png'),result=job.results.find(r=>r.route===u.route&&r.placementId===u.placementId);
  u.components={copy:exists('copy-')?'saved':'pending',scene:image?'generated':'pending',typography:names.has('editable-'+k+'.json')?'assembled':'pending',logo:names.has('editable-'+k+'.json')?'assembled':'pending',composition:names.has('editable-'+k+'.json')?'saved':'pending',review:result?.ready?'passed':result?.editableReview?.status||'pending',export:result?.imageUrl?'saved':'pending'};
  if(out.artifactInspectionUnavailable)for(const c of ['copy','scene','typography','logo','composition'])u.components[c]='unknown';
  for(const issue of u.issues)if(issue.component in u.components)u.components[issue.component]='needs-attention';
  if(repair){u.repair=repair;if(repair.status==='repairing'&&repair.ownerPid){try{process.kill(repair.ownerPid,0);}catch(e){if(e.code==='ESRCH'){u.repair={...repair,status:'needs-attention',error:'Repair process interrupted. Saved candidate, requests and costs are preserved; unresolved provider work must be reconciled before continuing.'};}}}if(u.repair.status==='repairing'){u.status='repairing';for(const action of repair.actions){const c=({background:'scene',product:'scene',transport:'review',request:'review'})[action]||action;if(c in u.components)u.components[c]='repairing';}}}
  u.message=out.artifactInspectionUnavailable?'Saved component files could not be inspected.':image?'Artwork generated.':'Artwork pending.';if(u.issues.length)u.message+=' '+u.issues.map(i=>i.action+'.').join(' ');
  u.repairAvailable=(!repair||require('./component-repair').canResumePreparation(repair))&&u.issues.length>0&&u.issues.every(i=>['typography','logo','background','product','transport','export'].includes(i.component));
 }
 out.counts={};for(const u of out.units)out.counts[u.status]=(out.counts[u.status]||0)+1;out.repairing=out.counts.repairing||0;out.needsAttention=(out.counts['needs-attention']||0)+(out.counts['review-required']||0);
 return out;
}
module.exports={diagnose,project,view};
