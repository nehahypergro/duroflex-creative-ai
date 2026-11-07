'use strict';
// Versioned, wire-only decision packets. Archives and semantic validators retain
// the full originals. Unknown fact/rule applicability is never guessed from prose.
const focused=require('./focused-context');
const VERSION=1,stages=new Set(['strategy','concepts']);
const unique=rows=>[...new Map(rows.map(r=>[JSON.stringify(r),r])).values()];
const size=v=>Buffer.byteLength(JSON.stringify(focused.clean(v)));
function principles(stage){
 const pack=require('../'+(stage==='strategy'?'marketing-strategist':'creative-director')+'/knowledge/pack.json');
 return {version:pack.version,interpretation:pack.interpretation,principles:pack.principles.map(({id,title,sourceIds,sourceSummary,application,limits})=>({id,title,sourceIds,sourceSummary,application,limits})),sources:pack.sources};
}
function instructions(stage){
 const common='Use only the scoped evidence in this packet. Preserve exact SKU/variant, brand identity, user requirements, locked wording, claim qualifiers, source authority and unresolved relevant conflicts. Requirements are mandatory; preferences, observed styles and proposed guidance are suggestions. Do not turn examples into rules. Customer insights without supplied evidence are hypotheses. Official exact-product statements and original technical artwork are accepted client source evidence with their original conditions; do not invent additional authentication gates or borrow offers/features from another SKU. Current user-supplied offer terms are source evidence, not permission to invent missing terms. Never claim future pixels, readability or performance have already passed. Return concise decisions in the response schema; cite supplied fact/source/principle IDs and keep unsupported claims out of proof.';
 return (stage==='strategy'?'You are Marketing strategist. Decide the main message, proposition, supporting benefits and communication approach for the supplied audience, objective, customer insight, desired action and formats. Use relevant positioning and supported product facts. Separate features from customer benefits without inventing efficacy. Assess real dependencies, preserve mandatory checks and identify precisely what is missing. Strategy does not choose pixel coordinates, reconstruct lettering, repair backgrounds or certify export. Exact copy and measured execution belong to later stages. Strategy intentionally receives no pixels: assets lists the selected execution inventory with downstream availability, not images you inspected. Do not infer missing product or logo files from the absence of image attachments. For an unverified destination, disclose uncertainty, include destination evidenceNeeded and a targeted researchRequests entry. Mark that request nonessential when a general action can proceed without a particular location or stock assertion; never invent those facts or falsely mark the destination verified.':'You are Creative director. Develop the selected strategy into one creative premise per requested output unit: scene idea, storytelling, visual hierarchy and execution direction. Preserve its audience, objective, proposition and selected supported benefits. Do not re-decide strategy or repeat its analysis. Respect actual format/text/logo constraints, but leave measured layout and final copy to specialists. Only request the provided output units; a single route needs no contrasting second idea. Use attached pixels to judge appearance, not metadata alone. Asset IDs in assets identify the images you actually received. An inspiration image is optional guidance unless the brief explicitly requires it. Never copy its product identity or impose its room, people or lighting on another brief. Approved font/logo inventory is a separate execution resource; do not treat those IDs as image evidence. Required missing imagery remains a dependency, not invented availability.')+'\n'+common+'\nStage principles (general guidance, never product proof): '+JSON.stringify(principles(stage));
}
function requiredReferences(si,selected){
 const ids=new Set(selected);
 const visit=v=>{if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){
  if(['assetIds','referenceAssetIds','requiredSkuAssetIds'].includes(k)&&Array.isArray(x))x.forEach(id=>ids.add(id));
  else if(k==='assetId'&&typeof x==='string')ids.add(x);
  else if(x&&typeof x==='object')visit(x);
 }};
 // Do not confuse the complete inspiration catalog with explicit choices.
 visit(si.assignment);visit(si.guardian?.requirements);
 return ids;
}
function visualReferences(si,images,{brandId,selectedReferenceIds=[]}={}){
 const assets=si.research?.assets||[],required=requiredReferences(si,selectedReferenceIds),byId=new Map();
 for(const a of [...assets,...images]){
  if(a.brandId&&brandId&&a.brandId!==brandId)throw Error('Planning reference belongs to another brand: '+a.id);
  const old=byId.get(a.id);
  if(old?.imageData&&a.imageData&&JSON.stringify(old.imageData)!==JSON.stringify(a.imageData))throw Object.assign(Error('Conflicting planning reference '+a.id),{code:'REFERENCE_ID_CONFLICT'});
  byId.set(a.id,{...old,...a});
 }
 const sku=assets.filter(a=>a.id?.startsWith('sku-product-image-'));
 const exactIds=new Set(si.requiredSkuAssetIds||si.assignment?.requiredSkuAssetIds||sku.map(a=>a.id));
 const logos=assets.filter(a=>a.id?.startsWith('approved-logo-'));
 const supplied=assets.filter(a=>required.has(a.id)||a.mandatory===true||a.locked===true||exactIds.has(a.id)||(!exactIds.size&&a.kind==='product')||logos.includes(a)||(!logos.length&&a.kind==='logo'));
 // Include an advisory reference only when its stage applicability is explicit.
 const helpful=assets.filter(a=>!supplied.includes(a)&&a.applicability?.stages?.includes('concepts')&&(!a.applicability.placementIds?.length||(si.assignment?.formats||[]).some(f=>a.applicability.placementIds.includes(f.id))));
 for(const id of required)if(!byId.get(id)?.imageData)throw Object.assign(Error('Selected planning reference has no pixels: '+id),{code:'PLANNING_REFERENCE_MISSING'});
 const requiredIds=[...new Set([...supplied.map(a=>a.id),...required])];
 const optionalSlots=Math.min(2,Math.max(0,require('./deterministic-preflight').DEFAULT_IMAGE_LIMIT-requiredIds.length));
 const chosen=[...requiredIds,...helpful.slice(0,optionalSlots).map(a=>a.id)].map(id=>byId.get(id)).filter(a=>a?.imageData);
 // Cap is enforced by shared preflight after selection; required references are
 // never silently sliced to fit. Missing mandatory assets stay in metadata.
 const missing=supplied.filter(a=>!byId.get(a.id)?.imageData).map(a=>({...focused.clean(a),availability:'missing'}));
 return {images:chosen,assets:[...chosen.map(a=>({...focused.clean(a),availability:'attached'})),...missing]};
}
function prepare(stage,input,{images=[],brandId,selectedReferenceIds=[]}={}){
 if(!stages.has(stage))return null;
 const si=stage==='strategy'?input.assignment:input.context?.strategyInput;
 if(!si?.assignment||!si.research)throw Error('Missing '+stage+' planning context');
 const out=focused.clean(input),context=out.context,selected=context?.strategy;
 delete out.context;delete out.assignment;delete out.boundaryAudit;
 const assignment=focused.clean(si.assignment);
 if(assignment.goal===assignment.brief)delete assignment.goal;
 const refs=stage==='concepts'?visualReferences(si,images,{brandId,selectedReferenceIds}):{images:[],assets:(si.research.assets||[]).filter(a=>['product','logo','font'].includes(a.kind)||/^(sku-product-image-|approved-logo-)/.test(a.id||'')).map(a=>{
  if(a.brandId&&brandId&&a.brandId!==brandId)throw Error('Planning asset belongs to another brand: '+a.id);
  return {id:a.id,kind:a.kind,label:a.label,sourceIds:a.sourceIds||[],availability:a.imageData?'available-for-downstream':a.status||'unknown',visualInspection:'not-attached-to-strategy'};
 })};
 const findings=unique((si.research.findings||[]).filter(f=>stage!=='strategy'||!['creative','opportunities'].includes(f.section)||f.mandatory===true||f.locked===true||['conflicted','unverified'].includes(f.status)));
 Object.assign(out,{planningPacketVersion:VERSION,assignment,guardian:focused.clean(si.guardian),facts:unique(focused.clean(si.facts||[])),conflicts:focused.clean(si.conflicts||[]),brandGuidance:{brandName:si.research.brandName,findings:focused.clean(findings)},assets:refs.assets});
 if(input.boundaryAudit){
  out.boundaryAudit=focused.clean(input.boundaryAudit);
  // Facts and source records now exist exactly once, with their full wording.
  for(const key of ['eligibleFacts','excludedFacts','backgroundBrandDependencyCandidates'])if(out.boundaryAudit[key])out.boundaryAudit[key]=out.boundaryAudit[key].map(f=>f.id);
  delete out.boundaryAudit.sources;
  out.boundaryAudit.recordInstructions='Fact ID lists resolve to the complete records in facts; sources below retain provenance and coverage.';
 }
 if(stage==='concepts'){
  out.assignmentId=context.assignmentId;out.conceptRoutes=context.conceptRoutes;
  out.allowedCreativeReferenceIds=(context.referenceCreativeIds||[]).filter(id=>refs.images.some(a=>a.id===id));
  out.selectedStrategy=focused.strategy(selected);
  // The complete chosen brief contains the selected proposition and benefits.
  // Keep dependencies/assumptions but omit the duplicate proposal and rationale.
  delete out.selectedStrategy.selectedAlternative;
  out.userPreferences=context.userPreferences||[];
  out.proofInstructions='Only eligibleProofFactIds may substantiate claims. Other facts preserve constraints and uncertainty, not proof. Use attached assets only for visual evidence. Only allowedCreativeReferenceIds may appear in evidence.referenceCreativeIds; product photos and logos are execution assets, not creative style references.';
 }
 // Unknown future top-level constraints are preserved, not silently discarded.
 for(const [k,v]of Object.entries(si))if(!['version','assignment','research','guardian','facts','conflicts','additionalSources'].includes(k))out[k]=focused.clean(v);
 out.sources=unique([...focused.sources(si.research.sources||[],out),...focused.clean(si.additionalSources||[])]);
 if(out.brandKnowledge){delete out.brandKnowledge.assetIds;delete out.brandKnowledge.documentIds;}
 return {input:out,images:refs.images,metrics:{version:VERSION,stage,inputBytesBefore:size(input),inputBytesAfter:size(out),imagesBefore:images.length,imagesAfter:refs.images.length,attachedAssetIds:refs.images.map(a=>a.id),facts:out.facts.length,sources:out.sources.length,policy:'Stage decisions only; full fact/rule wording and unknown applicability retained. Inspiration pixels require selection or explicit applicability.'}};
}
function schemaFor(schema,packet){
 const out=structuredClone(schema),sourceIds=packet.sources.map(s=>s.id),assetIds=packet.assets.filter(a=>a.availability==='attached').map(a=>a.id);
 function list(s,ids){if(!s?.items)return;const allowed=s.items.enum?s.items.enum.filter(id=>ids.includes(id)):ids;if(allowed.length)s.items={...s.items,enum:allowed};else {s.maxItems=0;delete s.items.enum;}}
 function walk(s){if(!s||typeof s!=='object')return;
  if(!assetIds.length&&s.anyOf?.some(b=>b.properties?.status?.const==='missing'))s.anyOf=s.anyOf.filter(b=>b.properties?.status?.const!=='available');
  if(s.properties){for(const k of ['sourceIds'])if(s.properties[k])list(s.properties[k],sourceIds);
   if(s.properties.referenceCreativeIds)list(s.properties.referenceCreativeIds,packet.allowedCreativeReferenceIds||[]);
   if(s.properties.status?.const==='available'&&s.properties.assetId)s.properties.assetId.enum=assetIds;
  }
  for(const v of Object.values(s))if(v&&typeof v==='object')walk(v);
 }walk(out);return out;
}
module.exports={VERSION,prepare,instructions,schemaFor};
