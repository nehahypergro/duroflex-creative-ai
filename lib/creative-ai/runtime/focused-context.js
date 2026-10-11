'use strict';
// Wire-only projections. Authoritative saved inputs, hashes, schemas and semantic
// validators continue to use the complete originals. Never truncate rule text,
// qualifiers, facts, placement constraints, requested copy or reference images.
const VERSION=1;
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
function strategy(value){if(!value)return value;const out=clean(value);if(out.alternatives){out.selectedAlternative=out.alternatives.find(a=>a.id===out.selection?.directionId);delete out.alternatives;}return out;}
function concept(value){if(!value)return value;const out=clean(value);delete out.strategyLinkage;return out;}
function research(value){return clean(value);}
function strategyInput(value){if(!value)return value;return {...clean(value),research:research(value.research)};}
function director(value){if(!value)return value;return {...clean(value),strategy:strategy(value.strategy),strategyInput:strategyInput(value.strategyInput)};}
function placement(value){return clean(value);}
function record(value){
 if(!value)return value;
 const out=clean(value);delete out.prompt;delete out.upstreamContext;
 out.evidence={strategy:strategy(value.upstreamContext?.strategy),concept:concept(value.upstreamContext?.concept),facts:clean(value.upstreamContext?.strategyInput?.facts),guardian:clean(value.upstreamContext?.strategyInput?.guardian),sources:clean([...(value.upstreamContext?.strategyInput?.research?.sources||[]),...(value.upstreamContext?.strategyInput?.additionalSources||[])])};
 out.placementContext=placement(value.placementContext);return out;
}
function project(kind,input){
 const out=clean(input);
 if(kind==='strategy'){out.assignment=strategyInput(input.assignment);return out;}
 if(kind==='concepts'){out.context=director(input.context);return out;}
 if(['copy','art'].includes(kind)){out.strategy=strategy(input.strategy);out.concepts=input.concepts?.map(concept);return out;}
 if(kind==='review'){out.record=record(input.record);return out;}
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
module.exports={VERSION,clean,strategy,concept,research,strategyInput,director,placement,record,project,infer};
