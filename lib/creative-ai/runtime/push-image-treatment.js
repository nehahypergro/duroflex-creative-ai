'use strict';
// Resolve only the job's immutable, placement-scoped treatment. Never upgrade
// historical jobs or select guidance from brief keywords or image dimensions.
function forJob(job,placementId){
 const knowledge=require('../treatment-knowledge'),snapshot=knowledge.forJob(job);
 if(!snapshot)return null;
 const placement=snapshot.placements.find(p=>p.placementId===placementId);
 if(!placement)return null;
 const pack=snapshot.packs.find(p=>p.id==='push'&&p.version>=3&&placement.treatmentIds.includes(p.id));
 return pack?{snapshotHash:snapshot.hash,placementId,version:pack.version,authority:pack.authority,rules:structuredClone(pack.rules)}:null;
}
function instructions(context){return context?'\nPINNED PUSH IMAGE TREATMENT: '+JSON.stringify(context)+'\nApply this selected-format guidance when interpreting product references. Source diagrams establish facts, not a requirement to reproduce their graphic layout or annotations. Preserve authentic markings physically on the product.\n':'';}
function reviewInstructions(context){return instructions(context)+(context?'Assess the actual push image even with zero editable text: baked-in reference captions and diagram labels are still visible content. Under the existing readability and applicable brief-direction checks, describe observed unreadable explanatory labels or dependence on a dense diagram. Physical product markings are identity evidence, not required notification reading. Do not add a copy-fit check, numeric density gate or blanket small-label failure; cosmetic variation and framing retain their existing tolerances. Missing actual-device evidence remains unverified, not a claim of failure or acceptance.\n':'');}
module.exports={forJob,instructions,reviewInstructions};
