'use strict';
// Scope decisions never change evidence status or source records. Only unused
// background brand facts may be excluded from this assignment's readiness gate.
function assess(input,decisions=[]){
 const excluded=new Set(),errors=[];
 const protectedIds=new Set([...(input.guardian.establishedPositioningFactIds||[]),...(input.assignment.offerFactIds||[]),...input.conflicts.flatMap(c=>c.factIds)]);
 const requiredSources=new Set(input.guardian.requirements.flatMap(r=>r.sourceIds));
 for(const d of decisions){
  const f=input.facts.find(f=>f.id===d.factId);
  if(excluded.has(d.factId)){errors.push('Duplicate unused brand fact: '+d.factId);continue;}
  if(!f||f.kind!=='brand'||f.status==='supported'||!f.essential||protectedIds.has(f.id)||f.sourceIds.some(id=>requiredSources.has(id))){errors.push('Cannot exclude required or non-brand evidence: '+d.factId);continue;}
  if(!d.reason?.trim()||!d.avoidance?.trim()){errors.push('Unused brand fact needs a reason and an execution exclusion: '+d.factId);continue;}
  excluded.add(d.factId);
 }
 return {excluded,errors};
}
function candidates(input){
 const protectedIds=new Set([...(input.guardian.establishedPositioningFactIds||[]),...(input.assignment.offerFactIds||[]),...input.conflicts.flatMap(c=>c.factIds)]),requiredSources=new Set(input.guardian.requirements.flatMap(r=>r.sourceIds));
 return input.facts.filter(f=>f.kind==='brand'&&f.status!=='supported'&&f.essential&&!protectedIds.has(f.id)&&!f.sourceIds.some(id=>requiredSources.has(id)));
}
function resolveDecisions(input,output){
 const expected=candidates(input),decisions=output.brandDependencyDecisions;
 if(!Array.isArray(decisions)||decisions.length!==expected.length||new Set(decisions.map(d=>d.factId)).size!==expected.length||expected.some(f=>!decisions.some(d=>d.factId===f.id)))throw Error('Every background brand dependency needs exactly one scope decision');
 const unused=[];
 for(const d of decisions){
  if(!d.reason?.trim())throw Error('Brand dependency decision needs an assignment-specific reason');
  if(d.requiredForExecution===true){if(!d.executionUse?.trim())throw Error('Required brand dependency needs the concrete execution use');if(d.avoidance?.trim())throw Error('Required brand dependency cannot also claim execution avoidance');}
  else if(d.requiredForExecution===false){if(d.executionUse?.trim()||!d.avoidance?.trim())throw Error('Unused brand dependency needs execution avoidance and no claimed use');if(output.researchRequests.some(r=>r.essential&&r.relatedIds.includes(d.factId)))throw Error('An unused brand dependency cannot remain an essential research request: '+d.factId);unused.push({factId:d.factId,reason:d.reason,avoidance:d.avoidance});}
  else throw Error('Brand dependency decision must state whether execution requires it');
 }
 const checked=assess(input,unused);if(checked.errors.length)throw Error(checked.errors.join('; '));
 const result=structuredClone(output);delete result.brandDependencyDecisions;result.unusedBrandFacts=unused;
 // Keep the exact decision in unusedBrandFacts, but do not copy its wording
 // into downstream context as an unqualified prohibition on product labels.
 const rawAvoidances=new Set(unused.map(d=>d.avoidance));
 result.uncertainties=[...new Set([...(result.uncertainties||[]).filter(n=>!rawAvoidances.has(n)),...unused.map(d=>'Background proposal '+d.factId+' is outside this assignment. Proposal-only exclusion: '+d.avoidance+' This does not change approved physical product markings or independently sourced exact-SKU evidence.')])];return result;
}
module.exports={assess,candidates,resolveDecisions};
