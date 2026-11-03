'use strict';
function context(job,receipt){const key=receipt.componentRepair?.key||Object.keys(job.componentRepairs||{}).find(k=>job.componentRepairs[k].requestKeys?.some(r=>r.key===(receipt.requestKey||receipt.key)&&r.kind===receipt.kind));const repair=key&&job.componentRepairs?.[key];if(!repair)return {};return {sourceFamily:'component-repair',parentProjectId:job.id,operation:'Targeted repair: '+repair.actions.join(', '),action:'component-repair',operationStatus:repair.status,route:repair.unit.route,placementId:repair.unit.placementId,creativeVersionId:key};}
module.exports={context};
