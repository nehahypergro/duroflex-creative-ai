'use strict';
// Decisions here route planning dependencies, not artwork approval. Never upgrade
// a model verdict, invent proof, or change an existing source/strategy artifact.
const VERSION=1;
const instructions=`PLANNING BLOCKING POLICY v1: Only concrete product identity/specification conflicts, unsupported measurable/material/health/performance claims, offer/price/warranty/mandatory-qualifier conflicts, or missing genuinely required source assets may require client evidence. Identify the exact affected claim or asset and include the affected supplied placement IDs in relatedIds when local. Do not turn subjective creative language (for example Luxe feel, inviting, beautiful, premium look), stylistic taste, hierarchy suggestions or soft word-count targets into factual proof requirements. Do not mark these essential or make them research_required. Subjective language does not excuse a material, health, numerical or comparative claim embedded in the same phrase. Preserve required wording; never invent proof or claim a rendered readability pass. Resolve option count from the authoritative supplied routes; use supplied dimensions and asset inventory without asking for them again. Repair internal handoff/ID/schema conflicts internally. Printer hardware templates, bleed and production specifications gate print-ready delivery, not a labelled design proof or unrelated social placements. A validated plan may proceed with advisory concerns; final product, wording, asset, rendering and export checks still apply. Never manufacture missing physical product evidence or silently substitute approved identity assets.`;
function classify(question,input){
 const name=input.assignment?.productName;
 const q=name?String(question||'').replace('for '+name,'for the selected product'):String(question||'');
 const formats=input.assignment?.formats||[];
 if(/\b(?:canvas|raster|placement|format|output)\s+(?:dimensions|size|width|height)\b/i.test(q)&&! /\b(?:SKU|product|mattress)\s+dimensions\b/i.test(q)&&formats.length&&formats.every(f=>f.dimensions?.width>0&&f.dimensions?.height>0))return ['internal-format-binding',false,'planning','Use the supplied placement dimensions; do not request them again.'];
 // Specific objective risks take precedence over subjective words in mixed concerns.
 if(/\b(price|pricing|discount|warranty|trial duration|service terms|offer terms|eligibility|replacement terms)\b|[₹$€]\s*\d/i.test(q))return ['commercial-fact',true,'copy','Supply or correct the exact commercial terms.'];
 if(/\b(clinical(?:ly)?|pain relief|health benefit|medical|therapeutic|antibacterial|hypoallergenic|organic|breathable|certifi(?:ed|cation)|performance claim|proven|percent|percentage|material composition|dimensions|measurements|firmness levels?|cooling performance|temperature reduction)\b|\d\s*%|\b(?:more|less|better)\s+\w+\s+than\b/i.test(q))return ['product-fact',true,'copy','Resolve the identified factual claim using eligible product evidence.'];
 if(/\b(wrong|conflicting|different)\s+(?:product|SKU|variant)|\b(?:verify|confirm)\b.*\b(?:selected SKU|variant identity|specified .*SKU)\b/i.test(q))return ['product-identity',true,'scene','Resolve the selected product identity.'];
 if(/\b(?:mandatory|required|necessary)\s+(?:claim\s+)?(?:qualifier|disclaimer)\b/i.test(q))return ['required-qualifier',true,'copy','Preserve the applicable factual qualifier or disclaimer.'];
 if(/\b(printer|cassette|bleed|trim|hardware template|print-ready)\b/i.test(q))return ['print-production',false,'export','Continue a labelled design proof; production export retains its specification checks.'];
 if(/\b(?:luxe feel|luxurious feel|premium look|beautiful|inviting|cozy|cosy|elegant|stylish)\b/i.test(q))return ['creative-language',false,'copy','Keep the requested descriptive wording; do not assert that it is a verified product fact.'];
 if(/\bsoft\b.*\b(?:target|word|limit)|\b(?:visual hierarchy|subjective|aesthetic preference)\b/i.test(q))return ['design-advisory',false,'typography','Plan or measure actual layout; a heuristic is not evidence of a defect.'];
 if(/\b(?:font|typeface|logo|wordmark|identity master)\b/i.test(q)){
  const supplied=(input.facts||[]).some(f=>f.id==='campaign-production-assets'&&f.status==='supported');
  return supplied?['internal-asset-binding',false,'composition','Resolve against the supplied production-asset inventory; retain final asset validation.']:['required-asset',true,'composition','Resolve the required asset from the approved brand library before requesting missing input.'];
 }
 if(/\b(?:photo|photograph|reference image|product image|exact-SKU .*reference|exact-SKU source|material|latex|foam|cotton|spring|firmness|technology artwork)\b/i.test(q))return ['product-evidence',true,'scene','Resolve the specific product evidence; never substitute another SKU or invent a feature.'];
 return ['internal-contract',false,'planning','Reconcile this planning concern against the supplied brief, evidence and inventory; do not invent a client requirement.'];
}
function ready(output,stage){return output?.status==='ready'&&(stage!=='concepts'||['copywriter','art-director'].every(id=>output.handoff?.recipients?.some(r=>r.agentId===id&&r.dispatchAllowed===true)));}
function assess(input,output,stage){
 const questions=stage==='concepts'?(output.workflow?.internalQuestions||[]):(output.researchRequests||[]).filter(r=>r.essential);
 const rows=questions.length?questions:ready(output,stage)?[]:[{question:output.decisionSummary||'The planning handoff is incomplete.',relatedIds:[]}];
 const formats=input.assignment?.formats||[];
 const issues=rows.map((r,index)=>{
  const [category,blocking,component,action]=classify(r.question,input),relatedIds=Array.isArray(r.relatedIds)?r.relatedIds:[];
  const placementIds=formats.filter(f=>relatedIds.includes(f.id)||String(r.question).includes(f.id)&&f.id.length>5).map(f=>f.id);
  return {id:stage+'-'+index,category,blocking,component,rule:'planning-v1/'+category,evidence:String(r.question||''),relatedIds,placementIds,scope:placementIds.length?'placements':'campaign',action};
 });
 const hard=issues.filter(i=>i.blocking),shared=hard.some(i=>!i.placementIds.length),heldPlacementIds=[...new Set(hard.flatMap(i=>i.placementIds))];
 return {version:VERSION,stage,issues,sharedBlock:shared,heldPlacementIds,repairable:!shared&&(hard.length===0||formats.some(f=>!heldPlacementIds.includes(f.id)))};
}
function failure(report,{technical=false}={}){
 const error=new Error((technical?'Planning correction could not produce a validated handoff. ':'Required input is missing for the affected work. ')+report.issues.filter(i=>i.blocking).map(i=>i.evidence).join(' ').slice(0,650));
 error.code=technical?'PLANNING_REPAIR_INCOMPLETE':'PLANNING_INPUT_REQUIRED';error.planningPolicy=report;return error;
}
async function recover(input,output,stage,{stage:runStage,repair,save}){
 if(ready(output,stage))return {input,output,heldPlacementIds:[],report:{version:VERSION,stage,issues:[]},repaired:false};
 const initial=assess(input,output,stage);await save('planning-policy-'+stage+'-initial.json',initial);
 if(!initial.repairable)throw failure(initial);
 const scoped=structuredClone(input);scoped.assignment.formats=scoped.assignment.formats.filter(f=>!initial.heldPlacementIds.includes(f.id));
 const feedback=instructions+'\nThis is one bounded internal correction, not a new campaign. Preserve SKU, source evidence, approved wording and brand. Do not repeat advisory requests as blockers. Return a complete validated handoff. Held placements must not stop remaining placements. Findings: '+JSON.stringify(initial.issues)+'\nActive placement IDs: '+JSON.stringify(scoped.assignment.formats.map(f=>f.id));
 // A distinct checkpoint keeps original output frozen. Provider reservations and
 // request caching enforce the existing monetary limits and restart safety.
 const repaired=await runStage('planning-policy-'+stage+'-repair-v1.json',()=>repair(scoped,feedback));
 const final=assess(scoped,repaired,stage),report={...initial,correctionAttempted:true,correctionResolved:ready(repaired,stage),after:final};
 await save('planning-policy-'+stage+'-decision.json',report);
 if(!ready(repaired,stage)){
  if(final.issues.some(i=>i.blocking))throw failure({...final,prior:initial});
  throw failure({...final,issues:[...final.issues,{id:stage+'-handoff',category:'internal-contract',component:'planning',blocking:true,rule:'planning-v1/validated-handoff',scope:'campaign',placementIds:[],evidence:'One internal correction did not produce a usable validated planning handoff.',action:'Inspect the saved planning response; do not repeat the campaign.'}],prior:initial},{technical:true});
 }
 return {input:scoped,output:repaired,heldPlacementIds:initial.heldPlacementIds,report,repaired:true};
}
function applyFailure(job,error){
 const issues=error.planningPolicy?.issues||[];job.planningPolicy=error.planningPolicy;
 job.planningIssues=issues;job.status=(job.results||[]).some(r=>r.imageUrl)?'partial':error.code==='PLANNING_INPUT_REQUIRED'?'needs-input':'failed';
 job.stage=job.status;job.activeStages=[];job.error=error.message;job.updatedAt=new Date().toISOString();return job;
}
function providerWithFeedback(provider,feedback){return {reason:(request,budget)=>provider.reason({...request,instructions:request.instructions+'\n'+feedback,...(request.wire?{wire:{...request.wire,instructions:request.wire.instructions+'\n'+feedback}}:{})},budget)};}
async function runtimeRecovery(runtime,id,input,output,stage,{budget,strategyOptions,canvasAssets,directorInput}={}){
 const agents=require('./agents');
 const result=await recover(input,output,stage,{
  save:(file,value)=>runtime.store.save(id,file,value),
  stage:(file,fn)=>runtime.stage(id,stage,stage==='strategy'?'marketing-strategist':'creative-director',file,fn),
  repair:(scoped,feedback)=>stage==='strategy'?agents.strategist(scoped,providerWithFeedback(runtime.provider,feedback),budget,strategyOptions):agents.concepts({...directorInput,strategyInput:scoped},providerWithFeedback(runtime.provider,feedback),budget,{canvasAssets})
 });
 if(result.repaired)await runtime.store.update(id,j=>{
  j.planningPolicies??={};j.planningPolicies[stage]=result.report;
  j.planningIssues=Object.values(j.planningPolicies).flatMap(r=>r.issues);
  j.artifacts[stage==='strategy'?'currentStrategyFile':'currentConceptsFile']='planning-policy-'+stage+'-repair-v1.json';return j;
 });
 return result;
}
module.exports={VERSION,instructions,classify,assess,recover,ready,failure,applyFailure,providerWithFeedback,runtimeRecovery};
