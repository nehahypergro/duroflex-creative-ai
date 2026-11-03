'use strict';
// Deliberate side runner; never mounted in Studio or its background test queue.
const fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
async function allocation(runtime){
 const approval=JSON.parse(await fs.readFile(path.join(root,'output/cost-tracking/approvals/testing-20261024.json'),'utf8'));
 if(!(approval.perProjectInr>0&&approval.overallInr>=approval.perProjectInr&&approval.fx.usdToInr>0))throw Error('Saved testing allowance is unavailable');
 const jobs=[];async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else if(e.name==='job.json')jobs.push(JSON.parse(await fs.readFile(p,'utf8')));}}
 await walk(path.join(root,'output/creative-ai'));
 const reservations=new Map();let legacy=0;
 for(const j of jobs){const e=j.budget?.estimatedSpend;if(!e)continue;for(const r of e.reservations||[])reservations.set(r.kind+':'+r.key,Math.max(reservations.get(r.kind+':'+r.key)||0,r.usd));legacy+=Math.max(0,(e.reservedUsd||0)-(e.reservations||[]).reduce((s,r)=>s+r.usd,0));}
 const snapshot=await new (require('../../lib/cost-tracker').CostTracker)(root,JSON.parse(await fs.readFile(path.join(root,'workspace.json'),'utf8'))).snapshot();
 const knownInr=snapshot.entries.reduce((s,r)=>s+(r.actualInr??r.estimatedInr??0),0),unknown=snapshot.entries.filter(r=>r.actualInr==null&&r.estimatedInr==null).length;
 const historicalReservationInr=([...reservations.values()].reduce((s,n)=>s+n,0)+legacy)*approval.fx.usdToInr;
 const activeAllowanceInr=jobs.filter(j=>['queued','running','preparing'].includes(j.status)).reduce((s,j)=>s+Math.max(0,(j.budget?.estimatedSpend?.maxUsd||0)-(j.budget?.estimatedSpend?.reservedUsd||0))*approval.fx.usdToInr,0);
 const exposureInr=knownInr+historicalReservationInr+activeAllowanceInr+approval.perProjectInr;
 if(!Number.isFinite(exposureInr)||exposureInr>approval.overallInr)throw Error('Combined testing exposure exceeds the saved approval');
 runtime.config.estimatedSpend={...runtime.config.estimatedSpend,maxUsd:approval.perProjectInr/approval.fx.usdToInr};
 return {knownInr,unknown,historicalReservationInr,activeAllowanceInr,projectAllowanceInr:approval.perProjectInr,exposureInr,fx:approval.fx,note:'Conservative reservation exposure plus known costs; unknown charges remain unknown, not zero. Not a billing reconciliation.'};
}
async function main(){
 const [file,action]=process.argv.slice(2);
 if(!file||!['--check','--run','--resume'].includes(action))throw Error('Usage: node scripts/creative-ai/run-text-layer-experiment.js intake.json --check|--run OR experiment-job-id --resume');
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
 const runtime=new CreativeRuntime({root,dossierStore:require('../../lib/brand-dossier').createDossierStore(path.join(root,'output/brand-dossiers'))});
 require('../../lib/group-workspace').groupPolicy(root).mount(runtime);
 require('../../lib/creative-ai/experiments/text-layer').install(runtime);
 require('./sequential-test-runtime').configure(runtime);
 if(action==='--resume'){
  const job=await runtime.store.read(file);
  if(job.intake.textLayerExperimentVersion!==1)throw Error('Only this experiment’s jobs can resume here');
  if(require('../../lib/creative-ai/runtime/processing-deadline')(job)<=Date.now())throw Error('Experiment window ended; retain the saved outputs and costs for an explicit continuation');
  const others=(await runtime.store.list()).filter(j=>j.id!==file&&['queued','running','preparing'].includes(j.status)&&require('../../lib/creative-ai/runtime/processing-deadline')(j)>Date.now());
  if(others.length)throw Error('Wait for the active generation project before resuming this experiment');
  if(job.status==='finished'){console.log(JSON.stringify({id:job.id,status:job.status,results:job.results}));return;}
  await allocation(runtime);
  await runtime.execute(file);const result=await runtime.store.read(file);console.log(JSON.stringify({id:file,status:result.status,results:result.results,error:result.error}));return;
 }
 const raw=JSON.parse(await fs.readFile(path.resolve(file),'utf8'));
 // A fresh intake is required; do not clone a job's receipts or resume historical outputs.
 const intake=require('../../lib/creative-ai/runtime/campaign-input').normalize({...raw,editableCanvas:true,textLayerExperimentVersion:1,conceptRoutes:['continuity']});
 const brand=await runtime.brands.read(intake.brandId);
 if(!brand.latestResearchId||intake.researchId!==brand.latestResearchId)throw Error('Use this brand’s current saved research in the experiment brief');
 const research=await runtime.researchSessions.store.read(intake.researchId);
 if(research.intake.brandId!==intake.brandId)throw Error('Research belongs to another brand');
 const assets=await require('../../lib/creative-ai/runtime/editable').prerequisites(runtime,intake);
 const resolved=require('../../lib/creative-ai/runtime/placements').resolve(intake);
 if(resolved.selections.length!==1)throw Error('Start this side experiment with one dimensioned static placement');
 if(intake.placementIds.includes(require('../../lib/creative-ai/runtime/pdp').id))throw Error('Full PDP packs stay on their existing route');
 if(action==='--check'){console.log(JSON.stringify({status:'prepared-not-generated',brand:brand.name,placement:resolved.selections[0].description,fonts:assets.fonts.map(f=>f.name),strategy:'Existing strategy and concept flow',layout:'Final copy/reconciliation, same call',image:'Clean image plus Fabric text; assembled review retained',productionDefaultChanged:false}));return;}
 // Keep test projects sequential with the active Studio batch.
 const active=(await runtime.store.list()).filter(j=>['queued','running','preparing'].includes(j.status)&&require('../../lib/creative-ai/runtime/processing-deadline')(j)>Date.now());
 if(active.length)throw Error('Wait for the current generation project before starting the side experiment: '+active.map(j=>j.id).join(', '));
 const allocated=await allocation(runtime);
 intake.requestKey='text-layer-experiment-'+require('node:crypto').randomUUID();
 runtime.schedule=()=>{};
 const id=await runtime.create(intake);
 await runtime.store.save(id,'experiment-allocation.json',allocated);
 console.log(JSON.stringify({id,experiment:'text-layer-v1',status:'starting'}));
 try{await runtime.execute(id);}catch(error){await runtime.store.update(id,j=>{j.status='failed';j.error=error.message;return j;});throw error;}
 const job=await runtime.store.read(id);console.log(JSON.stringify({id,status:job.status,results:job.results,error:job.error}));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
