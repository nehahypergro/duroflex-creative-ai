'use strict';
// Activity events are the source of stage truth. Status remains separate from artwork approval.
function stageState(job,projection){
 const active=Object.values(projection.tasks||{}).filter(t=>t.status==='running').sort((a,b)=>a.startSequence-b.startSequence);
 const activeStages=[...new Set(active.map(t=>t.kind))];
 if(['finished','partial','failed','needs-input'].includes(job.status))return {stage:job.status,activeStages:[]};
 return {stage:activeStages.at(-1)||projection.progress?.stage||job.status,activeStages};
}
async function sync(runtime,id){const projection=await runtime.activity.project(id);return runtime.store.update(id,j=>Object.assign(j,stageState(j,projection)));}
module.exports={stageState,sync};
