'use strict';
// Additive diagnostic projection. Never rewrites historical evidence or approves an unknown check.
const text=v=>typeof v==='string'?v.trim():'';
function classify(f,scope={},policy=require('../creative-reviewer/profiles').forRecord({}).policy){
 const evidence=text(f.evidence?.observation)||text(f.evidence)||text(f.observation);
 const requirement=text(f.requirement)||text(f.evidence?.expected)||text(f.expected);
 const suggested=f.category==='suggestion'||f.severity==='advisory'||f.authority==='inferred';
 const uncertain=f.category==='verification'||['unknown','uncertain','unavailable','pending'].includes(f.status)||Number.isFinite(f.confidence)&&f.confidence<require('../creative-reviewer/profiles').confidenceFloor(policy);
 const defect=f.category==='blocker'||f.status==='fail'||f.severity==='critical';
 const category=suggested?'suggestion':!uncertain&&defect&&requirement&&evidence?'blocker':'verification';
 return {category,requirement:requirement||null,evidence:evidence||null,criterion:f.criterion||f.check||f.fieldId||'review',scope:{...scope,...(f.placementId?{placementId:f.placementId}:{}),...(f.fieldId?{fieldId:f.fieldId}:{})},nextAction:category==='suggestion'?'Optional improvement':category==='blocker'?'Repair the affected component':'Verify the affected check; preserve saved artwork'};
}
function report(report){const scope={placementId:report.placementId,conceptId:report.conceptId};return [...(report.criticalChecks||[]).filter(f=>!['pass','not-applicable'].includes(f.status)),...(report.findings||[]),...(report.verificationDependencies||[]).map(f=>({...f,status:'unknown',evidence:f.request}))].map(f=>classify(f,scope,report.policy));}
const instructions='FINDING SCOPE: Distinguish actual blockers, optional suggestions and verification problems. A blocker must name the applicable explicit requirement, affected field/placement/component, and concrete visible or source-backed evidence. Never turn a style preference, internal writing target, numeric heuristic or missing sibling asset into an artwork defect. Brand inferences are suggestions unless an explicit current rule requires them. Judge readability from visible words at the supplied viewing context, not a numeric deviation alone. Preserve SKU identity, claim qualifiers, locked wording, genuine product markings and explicit central brief action. Cosmetic variation is allowed. Missing evidence, ambiguous region assignment and unavailable review are verification problems, not failed artwork. Use saved exact copy as wording authority; text detection locates lettering and never authorizes changing words. Assess only the supplied asset; collection completeness belongs to collection review. Do not propose pixel regeneration for a processing or evidence problem. Preserve frozen/user-edited layers; a repair requires a separate candidate.';
module.exports={classify,report,instructions};
