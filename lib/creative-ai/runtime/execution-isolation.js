'use strict';
const {fingerprint}=require('../art-director');
const key=(conceptId,placementId)=>conceptId+'|'+placementId;
function groups(concepts,placements,deferred=[]){
 const held=new Set(deferred.map(d=>key(d.conceptId,d.placementId)));
 return concepts.flatMap(c=>placements.filter(p=>!held.has(key(c.conceptId,p.id))).map(p=>({id:fingerprint({version:2,conceptId:c.conceptId,placementId:p.id}).slice(0,24),conceptIds:[c.conceptId],placementIds:[p.id],units:[{conceptId:c.conceptId,route:c.route,placementId:p.id}]})));
}
function scope(base,conceptIds){
 if(!conceptIds)return base;
 const concepts=base.concepts.filter(c=>conceptIds.includes(c.conceptId));
 if(!concepts.length||concepts.length!==conceptIds.length||new Set(conceptIds).size!==conceptIds.length)throw Error('Unknown or duplicate planning concept scope');
 return {...base,concepts,...(base.copy?{copy:base.copy.filter(c=>conceptIds.includes(c.conceptId))}:{}),pdpPlan:base.pdpPlan?{...base.pdpPlan,sets:base.pdpPlan.sets.filter(s=>conceptIds.includes(s.conceptId))}:null,carouselPlan:base.carouselPlan?{...base.carouselPlan,sets:base.carouselPlan.sets.filter(s=>conceptIds.includes(s.conceptId))}:null};
}
function files(job,unit){return job.planningFilesByUnit?.[key(unit.conceptId,unit.placementId)]||job.planningFilesByPlacement?.[unit.placementId]||{};}
async function finish(tasks){const settled=await Promise.allSettled(tasks.map(t=>Promise.resolve().then(t.run)));return settled.flatMap((r,i)=>r.status==='rejected'?[{stage:tasks[i].stage,error:r.reason.message}]:[]);}
function draftDocuments(job,brand,revision){const pinned=job.intake.brandKnowledge;if(brand&&brand.id!==job.intake.brandId)throw Error('Brand guidance belongs to another workspace');if(job.executionIsolationVersion===1&&pinned?.documentAuthorityVersion===1){if(pinned.brandId!==job.intake.brandId||pinned.draftDocumentIds.some(id=>!pinned.documentIds.includes(id)))throw Error('Pinned brand authority changed');return [...pinned.draftDocumentIds];}if(brand&&revision!==pinned?.revision)throw Error('Brand guidance changed during this assignment. Start a fresh brief.');return (brand?.documents||[]).filter(d=>d.draft===true).map(d=>d.id);}
async function planFamilies(tasks){
 const settled=await Promise.allSettled(tasks.map(t=>Promise.resolve().then(t.run)));
 return {plans:Object.fromEntries(settled.map((r,i)=>[tasks[i].stage,r.status==='fulfilled'?r.value:null])),failures:settled.flatMap((r,i)=>r.status==='rejected'?[{stage:tasks[i].stage,placementIds:tasks[i].placementIds,error:r.reason.message}]:[])};
}
module.exports={groups,scope,files,key,finish,draftDocuments,planFamilies};
