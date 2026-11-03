'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
async function preflight(root){
 const approval=JSON.parse(await fs.readFile(path.join(root,'output/cost-tracking/approvals/testing-20261024.json')));
 const snapshot=await new(require('../../cost-tracker').CostTracker)(root,JSON.parse(await fs.readFile(path.join(root,'workspace.json')))).snapshot();
 if(snapshot.warnings.some(w=>w.startsWith('Could not read')))throw Error('Cost history could not be read completely; admission held');
 const reservations=new Map();let legacy=0,activeUsd=0;
 async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else if(e.name==='job.json'){
  const j=JSON.parse(await fs.readFile(p,'utf8')),s=j.budget?.estimatedSpend;if(!s)continue;
  for(const r of s.reservations||[]){if(!Number.isFinite(r.usd)||r.usd<0)throw Error('Invalid historical reservation');reservations.set(r.kind+':'+r.key,Math.max(reservations.get(r.kind+':'+r.key)||0,r.usd));}
  legacy+=Math.max(0,(s.reservedUsd||0)-(s.reservations||[]).reduce((n,r)=>n+r.usd,0));
  if(['queued','running','preparing'].includes(j.status))activeUsd+=Math.max(0,(s.maxUsd||0)-(s.reservedUsd||0));
 }}}
 await walk(path.join(root,'output/creative-ai'));
 const knownInr=snapshot.entries.reduce((n,e)=>n+(e.actualInr??e.estimatedInr??0),0),reservedInr=([...reservations.values()].reduce((a,b)=>a+b,0)+legacy)*approval.fx.usdToInr,activeInr=activeUsd*approval.fx.usdToInr;
 return {knownInr,reservedInr,activeInr,unknownCount:snapshot.entries.filter(e=>e.actualInr==null&&e.estimatedInr==null).length,remainingInr:approval.overallInr-knownInr-reservedInr-activeInr,additionalUnknownReserveInr:100000,perJobInr:Math.min(10000,approval.perProjectInr),fx:approval.fx};
}
module.exports={preflight};
