'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
function reservationCovered(entries,r){return entries.some(e=>e.kind===r.kind&&(e.requestKey===r.key||e.requestId===r.key)&&Number.isFinite(e.actualInr??e.estimatedInr));}
async function loadApproval(root){
 const pointer=JSON.parse(await fs.readFile(path.join(root,'config/testing-approval.json'),'utf8'));
 if(!/^[a-zA-Z0-9_-]+\.json$/.test(pointer.file||''))throw Error('Invalid testing approval pointer');
 const approval=JSON.parse(await fs.readFile(path.join(root,'output/cost-tracking/approvals',pointer.file),'utf8'));
 if(!Number.isFinite(approval.overallInr)||approval.overallInr<=0||!Number.isFinite(approval.perProjectInr)||approval.perProjectInr<=0||!require('../../cost-tracker').validFx(approval.fx))throw Error('Testing approval or exchange rate is invalid');
 return approval;
}
async function preflight(root){
 const approval=await loadApproval(root);
 const snapshot=await new(require('../../cost-tracker').CostTracker)(root,JSON.parse(await fs.readFile(path.join(root,'workspace.json')))).snapshot();
 if(snapshot.warnings.some(w=>w.startsWith('Could not read')))throw Error('Cost history could not be read completely; admission held');
 const reservations=new Map();let legacy=0,activeUsd=0;
 async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else if(e.name==='job.json'){
  const j=JSON.parse(await fs.readFile(p,'utf8')),s=j.budget?.estimatedSpend;if(!s)continue;
  for(const r of s.reservations||[]){if(!Number.isFinite(r.usd)||r.usd<0)throw Error('Invalid historical reservation');if(reservationCovered(snapshot.entries,r))continue;reservations.set(r.kind+':'+r.key,Math.max(reservations.get(r.kind+':'+r.key)||0,r.usd));}
  legacy+=Math.max(0,(s.reservedUsd||0)-(s.reservations||[]).reduce((n,r)=>n+r.usd,0));
  if(['queued','running','preparing'].includes(j.status))activeUsd+=Math.max(0,(s.maxUsd||0)-(s.reservedUsd||0));
 }}}
 await walk(path.join(root,'output/creative-ai'));
 const knownInr=snapshot.entries.reduce((n,e)=>n+(e.actualInr??e.estimatedInr??0),0),reservedInr=([...reservations.values()].reduce((a,b)=>a+b,0)+legacy)*approval.fx.usdToInr,activeInr=activeUsd*approval.fx.usdToInr;
 return {knownInr,reservedInr,activeInr,unknownCount:snapshot.entries.filter(e=>e.actualInr==null&&e.estimatedInr==null).length,remainingInr:approval.overallInr-knownInr-reservedInr-activeInr,additionalUnknownReserveInr:approval.perProjectInr,perJobInr:approval.perProjectInr,fx:approval.fx};
}
module.exports={preflight,reservationCovered,loadApproval};
