'use strict';
// Wire-only projections. Authoritative saved inputs, hashes, schemas and semantic
// validators continue to use the complete originals. Never truncate rule text,
// qualifiers, facts, placement constraints, requested copy or reference images.
const VERSION=4;
function clean(value){
 if(Array.isArray(value))return value.map(clean);
 if(!value||typeof value!=='object')return value;
 const out={};for(const [key,v] of Object.entries(value)){
  if(['imageData','apiKey'].includes(key))continue;
  if(key==='locator'){out.locator={kind:v?.kind,attachment:'supplied separately when needed'};continue;}
  // Assembled placement messages serialize the same constraints a second time.
  if(key==='messages'&&value.contextHash&&value.placements)continue;
  out[key]=clean(v);
 }return out;
}
function strategy(value){if(!value)return value;const out=clean(value);if(out.alternatives){out.selectedAlternative=out.alternatives.find(a=>a.id===out.selection?.directionId);delete out.alternatives;}for(const key of ['knowledgeApplications','requirementChecks','strategyChecks','getWhoToBy'])delete out[key];return out;}
function concept(value){if(!value)return value;const out=clean(value);for(const key of ['strategyLinkage','qualityReview','knowledgeApplications','publicExplanation'])delete out[key];return out;}
// IDs retain their full evidence records locally. A wire registry includes only
// sources actually used by this role's facts, rules, findings and asset choices.
function referenced(value,key,ids=new Set()){
 if(Array.isArray(value)){for(const v of value)referenced(v,key,ids);}
 else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){if(k===key&&Array.isArray(v))for(const id of v)ids.add(id);else referenced(v,key,ids);}
 return ids;
}
function sources(rows,evidence){const ids=referenced(evidence,'sourceIds');return clean((rows||[]).filter(s=>ids.has(s.id)));}
function research(value,role='visual',evidence={}){
 if(!value)return value;
 const out=clean(value);
 // Keep scope/coverage/conflict findings and all unknown section types. Copy
 // does not need the spatial/art exploration dossier; visuals retain it in full.
 if(role==='copy')out.findings=out.findings?.filter(f=>!['creative','opportunities'].includes(f.section));
 if(role==='strategy')out.findings=out.findings?.filter(f=>f.section!=='creative');
 if(['copy','strategy'].includes(role)){
  const ids=referenced({findings:out.findings,evidence},'assetIds');
  out.assets=(out.assets||[]).filter(a=>ids.has(a.id)||a.kind==='logo');
 }
 out.sources=sources(out.sources,{...evidence,findings:out.findings,assets:out.assets});
 return out;
}
function strategyInput(value){if(!value)return value;return {...clean(value),research:research(value.research,'strategy',{facts:value.facts,guardian:value.guardian})};}
function director(value){if(!value)return value;const out={...clean(value),strategy:strategy(value.strategy),strategyInput:strategyInput(value.strategyInput)};if(value.strategyInput?.research)out.strategyInput.research=research(value.strategyInput.research,'visual',{facts:value.strategyInput.facts,guardian:value.strategyInput.guardian});return out;}
function placement(value){return clean(value);}
function record(value){
 if(!value)return value;
 const out=clean(value);delete out.prompt;delete out.upstreamContext;
 out.evidence={strategy:strategy(value.upstreamContext?.strategy),concept:concept(value.upstreamContext?.concept),facts:clean(value.upstreamContext?.strategyInput?.facts),guardian:clean(value.upstreamContext?.strategyInput?.guardian)};
 // One authoritative copy of identical constraints; preserve any differing one.
 for(const [nested,top] of [['lockedRules','lockedRules'],['flexibleChoices','flexibleChoices'],['dependencies','dependencies'],['checkCriteria','revisionCriteria']])if(out.artDirection&&JSON.stringify(out.artDirection[nested])===JSON.stringify(out[top]))delete out.artDirection[nested];
 out.placementContext=placement(value.placementContext);
 out.evidence.sources=sources([...(value.upstreamContext?.strategyInput?.research?.sources||[]),...(value.upstreamContext?.strategyInput?.additionalSources||[])],out);
 return out;
}
// Lossless interning of repeated long passages, without truncating rules or
// qualifiers. Only the wire input uses references; saved evidence stays intact.
function shareText(value){
 const counts=new Map(),sharedText={},ids=new Map();
 function count(v){if(typeof v==='string'&&v.length>=160)counts.set(v,(counts.get(v)||0)+1);else if(v&&typeof v==='object')Object.values(v).forEach(count);}count(value);
 function encode(v){if(typeof v==='string'&&counts.get(v)>1){if(!ids.has(v)){const id='text-'+(ids.size+1);ids.set(v,id);sharedText[id]=v;}return {sharedTextId:ids.get(v)};}if(Array.isArray(v))return v.map(encode);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]));return v;}
 const encoded=encode(value);return ids.size?{...encoded,sharedText,sharedTextInstructions:'Resolve every {sharedTextId} to its complete passage in sharedText. These are identical repeated passages, including all rules and evidence qualifiers.'}:encoded;
}
function project(kind,input){
 const out=clean(input);
 if(kind==='strategy'){out.assignment=strategyInput(input.assignment);return out;}
 if(kind==='concepts'){out.context=director(input.context);if(input.eligibleProofFactIds){const ids=new Set(input.eligibleProofFactIds),si=out.context.strategyInput;si.nonProofContext=(si.facts||[]).filter(f=>!ids.has(f.id));si.facts=(si.facts||[]).filter(f=>ids.has(f.id));out.proofInstructions='Only eligibleProofFactIds may be cited in evidence.factIds or requiredProofFactIds. nonProofContext retains unsupported/uncertain information and constraints; it cannot substantiate claims.';}return out;}
 if(['copy','art'].includes(kind)){
  out.strategy=strategy(input.strategy);out.concepts=input.concepts?.map(concept);
  out.brandResearch=research(input.brandResearch,kind==='copy'?'copy':'visual',{facts:input.facts,guardian:input.guardian,concepts:out.concepts});
  // The dossier and top-level asset inventory previously repeated every asset.
  if(out.brandResearch){if(kind==='copy')out.assets=out.brandResearch.assets;delete out.brandResearch.assets;}
  return out;
 }
 if(kind==='review'){out.record=record(input.record);return shareText(out);}
 if(kind==='refinement'){out.strategy=strategy(input.strategy);out.placement=placement(input.placement);return out;}
 if(kind==='publishing-copy'){out.strategy=strategy(input.strategy);out.concept=concept(input.concept);out.placement=placement(input.placement);return out;}
 return out;
}
function infer(request){
 const i=request.input||{};
 if(request.sceneReview&&i.record)return 'review';
 if(i.stableIds&&i.context)return 'concepts';
 if(i.assignment?.assignment&&i.boundaryAudit)return 'strategy';
 if(i.change&&i.exactCopy)return 'refinement';
 if(i.profile&&i.exactCopy)return 'publishing-copy';
 if(i.concepts&&i.placements)return /art|visual/i.test(request.instructions||'')&&!/You are Copywriter/.test(request.instructions||'')?'art':'copy';
 return 'general';
}
module.exports={VERSION,clean,sources,referenced,strategy,concept,research,strategyInput,director,placement,record,shareText,project,infer};
