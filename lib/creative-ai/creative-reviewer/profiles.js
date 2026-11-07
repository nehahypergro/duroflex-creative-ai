'use strict';
// Format selection is deterministic from the saved destination, never inferred
// from brief text, brand, aspect ratio or a reviewer's preference.
const general=require('./policy-v2.json'),pdp=require('./policy-pdp-v1.json');
function forRecord(record){
 const id=record.placementContext?.selection?.pin?.profileId;
 const isPdp=id==='custom:studio-commerce-gallery'||/^custom:studio-pdp-pack-slot-(?:0[1-9]|1[0-2])$/.test(id||'')||/^custom:recipe-product-image-\d+$/.test(id||'');
 return isPdp?{id:'pdp',version:1,policy:structuredClone(pdp),qualityGuidance:{
  communication:'Does this slot clearly answer its assigned buyer question? A clean product photograph can answer visually; do not require a headline, emotional hook or CTA.',
  brandRecognition:'Recognisable exact product and faithful supplied brand identity where applicable. Do not demand an added campaign logo on an omit-logo placement.',
  placementFit:'Useful product framing and readable essential information in the actual gallery viewing context. Evaluate only this slot; set coverage belongs to the pack review.',
  visualCraft:'Clear, faithful product depiction, believable construction and scene integration, with clean hierarchy and no distracting artifacts.'
 },instructions:'PDP REVIEW PROFILE: Do not evaluate emotional audience appeal, even as advice. Do not penalise neutral, functional product presentation or invent an emotional objective. Use only the four quality criteria in reviewProfile. Assess the assigned buyer question and actual image role, not advertising impact. Photography needs no overlay copy or campaign CTA; information cards need clear source-backed information. Preserve all applicable identity, claim, wording and readability checks.'}:{id:'general',version:1,policy:structuredClone(general),qualityGuidance:{},instructions:''};
}
function confidenceFloor(policy){const value=policy?.minimumEvidenceConfidence;if(!Number.isFinite(value)||value<0||value>1)throw Error('A valid review confidence policy is required');return value;}
module.exports={forRecord,confidenceFloor};
