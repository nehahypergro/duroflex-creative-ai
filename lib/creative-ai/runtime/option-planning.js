'use strict';
// Per-option collection dependencies. Waiting for a parent never occupies an
// image/copy worker; successful plans are reusable even if a sibling fails.
const {fingerprint}=require('../art-director');
const pdp=require('./pdp'),carousel=require('./carousels');
function create(runtime,id,{pdpInput,carouselInput,budget,planners={}}){
 const tasks=[];
 for(const [family,input,module] of [['pdp',pdpInput,pdp],['carousel',carouselInput,carousel]]){
  for(const group of module.groups(input.selection))for(const concept of input.concepts){
   const placementIds=(group.slots||group.slides).map(x=>x.placementId);
   const scoped={...input,concepts:[concept],selection:input.selection.filter(p=>placementIds.includes(p.id))};
   const file='option-plan-'+fingerprint({version:1,family,groupId:group.id,conceptId:concept.conceptId}).slice(0,24)+'.json';
   tasks.push({family,conceptId:concept.conceptId,route:concept.route,placementIds,file,input:scoped,module,status:'pending'});
  }
 }
 const waiting=new Map(tasks.map(t=>{let resolve;const promise=new Promise(r=>resolve=r);return [t.file,{promise,resolve}];}));
 let publishing=Promise.resolve();
 const snapshot=family=>{const successful=tasks.filter(t=>t.family===family&&t.status==='ready');return successful.length?{version:successful[0].plan.version,sets:successful.flatMap(t=>t.plan.sets)}:null;};
 function publish(){const next=publishing.catch(()=>{}).then(async()=>{
  for(const family of ['pdp','carousel']){const plan=snapshot(family);if(plan)await runtime.store.save(id,family+'-plan.json',plan);}
  await runtime.store.update(id,j=>{j.optionPlanning=tasks.map(({family,conceptId,route,placementIds,file,status,error})=>({family,conceptId,route,placementIds,file,status,...(error?{error}: {})}));return j;});
 });publishing=next;return next;}
 let completion;
 const start=()=>completion??=require('./unit-scheduler').run(tasks.map(t=>({conceptId:t.conceptId,placementId:t.file,task:t})),{limit:runtime.config.maxConcurrentPlanning||2,execute:async({task:t})=>{
  try{t.status='planning';await publish();
   t.plan=await runtime.stage(id,'collection-plan','creative-director',t.file,()=> (planners[t.family]||t.module.plan)(t.input,runtime.provider,budget),{scope:{conceptId:t.conceptId,route:t.route,placementId:t.placementIds[0]}});
   t.module.validatePlan(t.plan,t.input);t.status='ready';await publish();waiting.get(t.file).resolve({plan:t.plan});
  }catch(error){t.status='failed';t.error=error.message;try{await publish();}catch(persistError){t.error+='; status persistence: '+persistError.message;}waiting.get(t.file).resolve({error});}
 }});
 async function forUnit(unit){start();const t=tasks.find(t=>t.conceptId===unit.conceptId&&t.placementIds.includes(unit.placementId));if(!t)return {pdpPlan:null,carouselPlan:null};const result=await waiting.get(t.file).promise;if(result.error)throw result.error;
  if(t.family==='pdp'){const slot=result.plan.sets[0].slots.find(s=>s.placementId===unit.placementId);if(slot.status!=='ready')throw Error('PDP slot needs source: '+slot.missingEvidence.join('; '));}
  return {pdpPlan:t.family==='pdp'?result.plan:null,carouselPlan:t.family==='carousel'?result.plan:null};
 }
 const dependencies={sets:carouselInput.concepts.flatMap(c=>carousel.groups(carouselInput.selection).map(g=>({conceptId:c.conceptId,slides:g.slides})))};
 return {forUnit,get done(){return start();},snapshot,dependencies};
}
function savedFile(job,unit,family){
 if(job.optionPlanningVersion!==1)return family+'-plan.json';
 const selection=job.selection.find(p=>p.id===unit.placementId);
 if(!selection?.description?.[family])return null;
 const own=job.optionPlanning?.find(t=>t.family===family&&t.conceptId===unit.conceptId&&t.placementIds.includes(unit.placementId));
 if(!own||own.status!=='ready'||!/^option-plan-[a-zA-Z0-9-]+\.json$/.test(own.file))throw Error('The selected option has no ready '+family+' plan');
 return own.file;
}
module.exports={create,savedFile};
