'use strict';
const drop=(s,key)=>{delete s.properties[key];s.required=s.required.filter(x=>x!==key);};
function configure(schema){
 const candidate=structuredClone(schema.properties.alternatives.items),checks=structuredClone(schema.properties.requirementChecks),readyChecks=structuredClone(checks);readyChecks.items.properties.status={const:'met'};
 const branch=(status,chosen,requirementChecks)=>({type:'object',additionalProperties:false,required:['status','chosen','requirementChecks'],properties:{status:{const:status},chosen,requirementChecks}});
 schema.properties.directionDecision={anyOf:[branch('ready',candidate,readyChecks),branch('research_required',{anyOf:[candidate,{type:'null'}]},checks)]};schema.required.push('directionDecision');drop(schema,'status');drop(schema,'requirementChecks');drop(schema.properties.selection,'directionId');
 // The chosen candidate occupies one slot in the authoritative output inventory.
 schema.properties.alternatives.maxItems=Math.max(0,(schema.properties.alternatives.maxItems||10)-1);
}
function decode(out){const r=structuredClone(out),d=r.directionDecision;delete r.directionDecision;r.status=d.status;r.requirementChecks=d.requirementChecks;r.selection.directionId=d.chosen?.id||'none';if(d.chosen){if(r.alternatives.some(x=>x.id===d.chosen.id))throw Error('Chosen direction must not be duplicated in other alternatives');r.alternatives.unshift(d.chosen);}return r;}
// Explicit replay/test migration. Never invent a missing candidate or upgrade readiness.
function fromRecorded(out){const r=structuredClone(out);if(!r.directionDecision){const chosen=r.alternatives.find(x=>x.id===r.selection.directionId)||null;if(r.status==='ready'&&!chosen)throw Error('Historical ready response omitted its chosen direction');r.directionDecision={status:r.status,chosen};r.alternatives=r.alternatives.filter(x=>x!==chosen);delete r.status;delete r.selection.directionId;}if(r.requirementChecks){r.directionDecision.requirementChecks=r.requirementChecks;delete r.requirementChecks;}return r;}
module.exports={configure,decode,fromRecorded};
