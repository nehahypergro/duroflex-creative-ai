'use strict';
const {confidenceFloor}=require('./profiles');
const prerequisiteReasons={
 'placement-spec-missing':'Resolve the missing verified placement specification before correcting artwork. Do not invent specifications.',
 'source-logo-wrong':'Resolve the incorrect source logo with a verified same-brand replacement before correcting artwork. Do not rerun campaign research automatically.'
};
// Inspect causes as well as routes so saved reports using older targeted routes
// cannot consume a correction that still lacks its required source input.
function unresolvedPrerequisites(report){const floor=confidenceFloor(report.policy);return report.findings.filter(f=>prerequisiteReasons[f.cause]&&f.severity!=='advisory'&&f.authority!=='inferred'&&f.confidence>=floor);}
const routes={
 'generated-typo':{owner:'graphic-designer',stages:['artwork','copy'],downstream:['graphic-designer','creative-reviewer']},
 'copy-weak-wording':{owner:'copywriter',stages:['copy','concept'],downstream:['copywriter','art-director','graphic-designer','creative-reviewer']},
 'art-weak-hierarchy':{owner:'art-director',stages:['artwork','art'],downstream:['art-director','graphic-designer','creative-reviewer']},
 'art-direction-ignored':{owner:'graphic-designer',stages:['artwork','art'],downstream:['graphic-designer','creative-reviewer']},
 'source-logo-wrong':{owner:'brand-researcher',stages:['source-asset','brand-rules'],downstream:[]},
 'logo-render-distorted':{owner:'graphic-designer',stages:['artwork','source-asset'],downstream:['graphic-designer','creative-reviewer']},
 'concept-strategy-mismatch':{owner:'creative-director',stages:['concept','strategy'],downstream:['creative-director','copywriter','art-director','graphic-designer','creative-reviewer']},
 'brand-rule-ambiguous':{owner:'brand-guardian',stages:['brand-rules','art'],downstream:['brand-guardian','art-director','graphic-designer','creative-reviewer']},
 'placement-spec-missing':{owner:'workflow-producer',stages:['placement','generation-package'],downstream:[]}
};
function routeFinding(finding,policy) {
 const floor=confidenceFloor(policy);
 if(finding.severity==='advisory'||finding.authority==='inferred')return {findingId:finding.id,status:'advisory',owner:'none',downstream:[],reason:'Inferred preference is non-blocking.'};
 const rule=routes[finding.cause],stages=new Set(finding.comparison.map(c=>c.stage));
 if(finding.confidence<floor||!rule||rule.stages.some(s=>!stages.has(s)))return {findingId:finding.id,status:'focused-diagnostic-required',owner:'workflow-producer',downstream:[],reason:'Verify the relevant upstream comparison before assigning a correction owner.'};
 if(prerequisiteReasons[finding.cause])return {findingId:finding.id,status:'focused-diagnostic-required',owner:rule.owner,downstream:[],reason:prerequisiteReasons[finding.cause]};
 return {findingId:finding.id,status:'targeted-correction',owner:rule.owner,downstream:rule.downstream,reason:'Earliest erroneous decision supported by the declared evidence comparison.',correction:finding.correction,preserve:finding.preserve};
}
function consolidatedPlan(report,state) {
 if(state.correctionCycles!==1 || state.phase!=='correction-planned')throw Error('No remaining/authorized correction cycle');
 if(unresolvedPrerequisites(report).length)throw Object.assign(Error('Verified correction input required before reserving artwork correction'),{code:'CORRECTION_INPUT_REQUIRED'});
 const corrections=report.routing.filter(r=>r.status==='targeted-correction'),diagnostics=report.routing.filter(r=>r.status==='focused-diagnostic-required');
 const order=['workflow-producer','brand-researcher','brand-guardian','creative-director','copywriter','art-director','graphic-designer','creative-reviewer'];
 const affected=new Set(corrections.flatMap(c=>c.downstream));
 // A confirmed defect authorized this cycle; unknown evidence remains a
 // verification dependency and never creates an additional correction cycle.
 affected.add('graphic-designer');affected.add('creative-reviewer');
 return {version:1,unitKey:state.unitKey,cycle:1,maxCorrectionCycles:1,authorizationId:state.authorizationId,automatic:true,humanApprovalRequired:false,packageHash:report.packageHash,artifactHash:report.artifactHash,preserveVersions:report.versionBindings,corrections,diagnostics,verificationDependencies:report.verificationDependencies,steps:order.filter(x=>affected.has(x)),preserveUnaffected:true,instruction:'One consolidated cycle across all findings and dependent steps. Update affected downstream hashes, regenerate at most once, then perform final review. Do not allocate per-agent/per-finding retries.'};
}
module.exports={routes,routeFinding,consolidatedPlan,unresolvedPrerequisites};
