'use strict';
const fs=require('fs');const path=require('path');const art=require('../art-director');const placement=require('../placement-knowledge');const {check}=require('../marketing-strategist/schema-validator');
const agent=require('./agent.json'),inputSchema=require('./input.schema.json'),outputSchema=require('./output.schema.json'),provider=require('./provider.json');
const clone=require('../clone-data');const {fingerprint,same}=art;
const reviewChecks=['exact-text','legibility','product-identity','logo-identity','truthful-claims','brand-rules','composition','safe-area-crop','dimensions-format'];
function fail(errors){if(errors.length)throw Error(errors.join('\n'));}
async function assembleContext(payload,{catalog,includeMessages=true,allowPartialPlacements=false}={}) {
 fail(check(inputSchema,payload));const ctx=await art.assembleContext(payload.artInput,{catalog,includeMessages:false,allowPartialPlacements});const validated=art.validateOutput(payload.artOutput,ctx);fail(validated.hardErrors);
 const expected=payload.artOutput.specifications.map(s=>s.conceptId+'|'+s.placementId),actual=payload.jobs.map(j=>j.conceptId+'|'+j.placementId);fail(actual.length!==expected.length||new Set(actual).size!==actual.length||expected.some(k=>!actual.includes(k))?['Production job required for both routes at every placement']:[]);
 for(const j of payload.jobs) {
  fail(!Number.isInteger(j.canvas.width)||!Number.isInteger(j.canvas.height)?['Integer production canvas required']:[]);
  const p=ctx.placements.find(p=>p.selection.id===j.placementId),rules=p.context.placements[0]?.rules||[];
  fail(j.canvas.ruleIds.some(id=>!rules.some(r=>r.id===id))?['Unknown canvas rule reference']:[]);
  if(j.canvas.sourceStatus!=='unknown') {const dims=rules.filter(r=>j.canvas.ruleIds.includes(r.id)&&r.check.method==='dimensions');fail(!dims.length||dims.some(r=>r.evidenceStatus!==j.canvas.sourceStatus)?['Canvas source status does not match pinned dimension rules']:[]);}
 }
 return {version:1,catalog,input:clone(payload),artContext:ctx,inputHash:fingerprint(payload),knowledge:require('./knowledge/pack.json'),messages:includeMessages?[{role:'system',content:fs.readFileSync(path.join(__dirname,'instructions.md'),'utf8')},{role:'user',content:JSON.stringify(payload)}]:[]};
}
function identityAnchor(job,ctx){
 const policy=job.productReference;if(!policy)return null;
 const source=ctx.artContext.references.find(a=>a.assetId===policy.sourceAssetId);
 if(!source||source.status!=='resolved'||!policy.referenceAssetIds.includes(source.assetId)||source.sha256!==policy.sourceHash||!source.imageData||require('../runtime/product-identity').hash(Buffer.from(source.imageData.split(',')[1],'base64'))!==policy.sourceHash)return null;
 return {...clone(source),roles:['product'],instruction:'Mandatory selected-SKU identity anchor. Preserve the actual product and physical markings. Other attached gallery views may inform the chosen angle; source-page overlays and backgrounds are not required artwork.'};
}
function dependencies(spec,job,p,ctx) {
 const result=clone(spec.dependencies);
 if(p.selection.jobInputs?.logoPolicy?.treatment==='omit'&&(spec.logo.assetIds.length||spec.references.some(r=>r.roles.includes('logo'))))result.push({target:'art-director',relatedIds:[spec.placementId],reason:'Pinned omission policy conflicts with campaign logo references.'});
 if(spec.status!=='ready')result.push({target:'art-director',relatedIds:[spec.conceptId,spec.placementId],reason:'Art specification requires internal revision.'});

 if(job.canvas.sourceStatus==='unknown'||job.outputFormat==='pending')result.push({target:'workflow-producer',relatedIds:[job.placementId],reason:'Canvas/output specification unresolved.'});
 if(job.fontStatus==='pending')result.push({target:'brand-guardian',relatedIds:[job.placementId],reason:'Approved font execution direction unresolved.'});
 if(job.productAssetRequired&&!spec.product.assetIds.length)result.push({target:'brand-researcher',relatedIds:[spec.conceptId],reason:'Required actual product image missing; do not invent product appearance.'});
 if(job.protectedProduct&&(!spec.product.assetIds.includes(job.protectedProduct.assetId)||!spec.references.some(r=>r.assetId===job.protectedProduct.assetId&&r.roles.includes('product'))))result.push({target:'art-director',relatedIds:[job.protectedProduct.assetId],reason:'The protected SKU must be the explicit product reference; no substitute product is allowed.'});
 if(job.productReference&&!identityAnchor(job,ctx))result.push({target:'art-director',relatedIds:[job.productReference.sourceAssetId],reason:'Exact SKU source must remain an attached product reference.'});
 if(job.protectedProduct&&job.outputFormat!=='png')result.push({target:'workflow-producer',relatedIds:[job.placementId],reason:'Protected product pixels require lossless PNG export.'});
 if(job.logoAssetRequired&&!spec.logo.assetIds.length)result.push({target:'brand-researcher',relatedIds:[spec.conceptId],reason:'Required actual logo image missing; do not invent identity.'});
 for(const reason of job.conflicts)result.push({target:'art-director',relatedIds:[spec.conceptId,job.placementId],reason});
 const expanded=p.context.placements[0];
 if(expanded) {
  for(const conflict of [...p.context.conflicts,...(expanded.sourceConflicts||[])]) result.push({target:'workflow-producer',relatedIds:[job.placementId],reason:'Placement/source conflict requires resolution: '+JSON.stringify(conflict)});
  const deck=ctx.input.artInput.copy.find(d=>d.conceptId===spec.conceptId&&d.placementId===spec.placementId),native=(deck?.fields||[]).filter(f=>f.delivery==='native').reduce((out,f)=>{(out[f.nativeFieldId]||=[]).push(f.text);return out;},{});const technical=placement.reviewTechnical(p.selection.pin,{native,assets:{artwork:{width:job.canvas.width,height:job.canvas.height,format:job.outputFormat}}},ctx.catalog);
  for(const c of technical.checks||technical.results||[]) if(c.status==='fail')result.push({target:'art-director',relatedIds:[c.ruleId],reason:'Proposed canvas/output violates '+c.ruleId});
 }
 for(const ref of spec.references)if(ctx.artContext.references.find(a=>a.assetId===ref.assetId)?.status!=='resolved')result.push({target:'brand-researcher',relatedIds:[ref.assetId],reason:'Actual image bytes missing.'});
 return result;
}
function buildPrompt(spec,job,attachments,ctx) {
 const card=ctx.input.artInput.directorOutput.concepts.find(c=>c.conceptId===spec.conceptId),strategy=ctx.input.artInput.directorInput.strategy;
 const lines=[
 job.protectedProduct?'Generate the scene and exact permitted copy for a protected-product composition. The approved product layer is added after generation; do not generate the product. Native fields are excluded from the image.':'Generate ONE COMPLETE static artwork with all permitted embedded text inside the image. No separate composition layers. Do not add words beyond the exact embedded copy. Native fields are excluded from the image.',
 'Purpose and audience: '+strategy.getWhoToBy.statement,
 'Concept: '+card.centralIdea+' Intended takeaway: '+spec.focalCommunication,
 'Locked product/claim evidence: '+JSON.stringify(ctx.input.artInput.directorInput.strategyInput.facts.filter(f=>f.status==='supported'&&(job.productReference?.evidenceFactIds?.includes(f.id)||ctx.input.artInput.copy?.find(d=>d.conceptId===spec.conceptId&&d.placementId===spec.placementId)?.fields.some(t=>t.proofFactIds?.includes(f.id))))),
 'Locked brand execution rules: '+JSON.stringify(spec.lockedRules),
 ...(ctx.artContext.placements.find(p=>p.selection.id===spec.placementId)?.selection.jobInputs?.pdpIntents?.filter(x=>x.conceptId===spec.conceptId).map(x=>'PDP current slot: '+JSON.stringify({current:x.intent.current,instructions:x.intent.instructions}))||[]),
 'Scene: '+spec.scene,'Composition: '+spec.composition,'Reading order: '+spec.hierarchy.join(' → '),
 'Image treatment: '+spec.imageTreatment,'Camera: '+spec.camera,'Lighting: '+spec.lighting,'Palette roles: '+spec.palette.join('; '),'Typography: '+spec.typography,
 'Exact embedded text, once per field, with instructions: '+JSON.stringify(spec.text.filter(t=>t.delivery==='embedded').map(t=>({...t,exactText:t.exactText,occurrences:1}))),
 'Preserve exact spelling and letter case, including within product names. Keep capital I distinguishable from lowercase l, and letters O distinguishable from digits 0, at the target viewing size within the supplied typography. Do not substitute similar-looking characters or change the approved font to resolve ambiguity. Exact wording still requires inspection of the rendered image.',
 'Pinned client logo policy: '+require('../runtime/placement-logo-policy').guidance({},ctx.artContext.placements.find(p=>p.selection.id===spec.placementId).selection),
 'Logo treatment: '+JSON.stringify(spec.logo),'Product treatment: '+JSON.stringify(spec.product),
 'Attachment roles: '+JSON.stringify(attachments.map((a,i)=>({attachmentNumber:i+1,assetId:a.assetId,ownership:a.ownership,roles:a.roles,instruction:a.instruction}))),
 'Reference boundary: continuity uses only this brand’s materials. External exploration references may inform background/scene/setting/light/camera/texture/mood only; ignore their words, typography, layout, logos and product identity.',
 'Placement target: '+JSON.stringify({placementId:spec.placementId,canvas:job.canvas,outputFormat:job.outputFormat,displayContext:job.displayContext,safeAreas:spec.safeAreas,crop:spec.crop,viewingSize:spec.viewingSize}),
 'Flexible choices only: '+spec.flexibleChoices.join('; '),
 'If exact copy or locked rules cannot fit, return an internal revision requirement; do not abbreviate, omit qualifiers, distort identity or invent facts.',
 'Review criteria: '+spec.checkCriteria.join('; '),
 'Final locked embedded copy takes priority over earlier concept, scene, carousel-role or review-criteria directions about withholding text. Render every listed embedded field once on THIS image, including any embedded CTA; a later slide having its own CTA does not authorize omitting this slide’s locked CTA. Keep native fields outside the artwork.',
 require('./text-contract').textContract(spec)+(job.productReference?require('../runtime/reference-product').instructions(job.productReference):'')+(job.protectedProduct?require('../runtime/protected-product').instructions(job.protectedProduct):'')
 ];const reading=ctx.artContext.placements.find(p=>p.selection.id===spec.placementId)?.context.placements[0]?.rules.find(r=>r.id.endsWith('-readability'));if(reading){lines.push('Pinned placement reading recommendations (editorial, not official font limits): '+reading.statement);const plan=require('../runtime/readability').renderInstructions(reading.check.readingPolicy,job.canvas);if(plan)lines.push(plan);}return lines.join('\n');
}
function intendedRationale(spec,ctx,job) {
 const card=ctx.input.artInput.directorOutput.concepts.find(c=>c.conceptId===spec.conceptId);
 return {status:'intended-choices-unverified',text:`The intended takeaway is ${card.intendedTakeaway} The hierarchy starts with ${spec.hierarchy[0]}, supported by the proposed imagery: ${spec.scene} The execution retains the supplied brand rules. For ${job.canvas.width}×${job.canvas.height}, the proposed reading order and crop guidance aim to keep the message clear.`,limits:'Intended composition choices; actual execution, interpretation and readability require artwork review.'};
}
function buildGenerationPackages(ctx) {
 const records=ctx.input.artOutput.specifications.map(spec=>{
  const job=ctx.input.jobs.find(j=>j.conceptId===spec.conceptId&&j.placementId===spec.placementId),p=ctx.artContext.placements.find(p=>p.selection.id===spec.placementId);
  const attachments=spec.references.map(r=>({...clone(ctx.artContext.references.find(a=>a.assetId===r.assetId)),roles:clone(r.roles),instruction:r.instruction}));
  const anchor=identityAnchor(job,ctx);if(anchor){const existing=attachments.find(a=>a.assetId===anchor.assetId);if(existing){existing.roles=[...new Set([...existing.roles,'product'])];}else attachments.push(anchor);}
  const deps=dependencies(spec,job,p,ctx);
  const copy=ctx.input.artInput.copy.find(c=>c.conceptId===spec.conceptId&&c.placementId===spec.placementId);
  const record={version:1,assignmentDemo:ctx.input.artInput.directorInput.strategyInput.research.demo,assignmentId:ctx.input.artInput.directorInput.assignmentId,conceptId:spec.conceptId,route:spec.route,conceptHash:spec.conceptHash,placementId:spec.placementId,placementHash:spec.placementHash,copyHash:spec.copyHash,artHash:fingerprint(spec),brandHash:fingerprint(spec.lockedRules),status:deps.length?'blocked':'request-ready',generationStatus:'not-run',dispatchAllowed:false,providerStatus:'configuration-pending',productionMode:job.protectedProduct?'scene-with-protected-product-layer':'whole-static-image-with-embedded-text',...(job.protectedProduct?{protectedProduct:clone(job.protectedProduct)}:{}),...(job.productReference?{productReference:clone(job.productReference)}:{}),upstreamContext:{strategy:clone(ctx.input.artInput.directorInput.strategy),strategyInput:clone(ctx.input.artInput.directorInput.strategyInput),concept:clone(ctx.input.artInput.directorOutput.concepts.find(c=>c.conceptId===spec.conceptId))},prompt:buildPrompt(spec,job,attachments,ctx),exactCopy:clone(copy),artDirection:clone(spec),attachmentManifest:attachments,canvas:clone(job.canvas),outputFormat:job.outputFormat,placementContext:clone(p),nativeFields:copy.fields.filter(f=>f.delivery==='native'),lockedRules:clone(spec.lockedRules),flexibleChoices:clone(spec.flexibleChoices),dependencies:deps,revisionCriteria:clone(spec.checkCriteria),compositionRationale:intendedRationale(spec,ctx,job),selfCheck:reviewChecks.map(id=>({id,status:'pending',evidence:'No artwork generated; prompt/schema validation is not a rendered check.'}))};
  return {...record,packageHash:fingerprint(record)};
 });
 return {version:1,agentId:'graphic-designer',assignmentId:ctx.input.artInput.directorInput.assignmentId,artInputHash:ctx.artContext.inputHash,provider:clone(provider),productionMode:records.some(r=>r.protectedProduct)?'scene-with-protected-product-layer':'whole-static-image-with-embedded-text',automatic:true,humanApprovalRequired:false,status:records.some(r=>r.status==='blocked')?'blocked':'packages-ready',records,reviewerHandoff:{version:1,agentId:'reviewer',automatic:true,humanApprovalRequired:false,dispatchAllowed:false,status:'awaiting-generated-artifacts',expectedRecords:records.map(r=>({conceptId:r.conceptId,placementId:r.placementId,packageHash:r.packageHash,requiredChecks:clone(reviewChecks)}))}};
}
function validateOutput(output,ctx) {const errors=check(outputSchema,output);if(!errors.length&&!same(output,buildGenerationPackages(ctx)))errors.push('Generation package or provenance payload changed');return {valid:!errors.length,hardErrors:errors,limits:['No inference, generation, OCR, vision or qualified production review has run.']};}
function buildRevisionPackage(record,{target,issues,attempt=1,cyclePlan}) {
 fail(!['copywriter','art-director'].includes(target)||!Array.isArray(issues)||!issues.length||issues.some(s=>typeof s!=='string'||!s.trim())||!Number.isInteger(attempt)||attempt<1||attempt>1?['Invalid targeted internal revision']:[]);
 if(!cyclePlan||cyclePlan.cycle!==1||cyclePlan.maxCorrectionCycles!==1||cyclePlan.unitKey!==require('../creative-reviewer/lifecycle').unitKey(record)||cyclePlan.packageHash!==record.packageHash||!cyclePlan.authorizationId||cyclePlan.authorizationId==='none')throw Error('Revision requires consolidated reviewer cycle authorization');
 return {version:1,cycleAuthorizationId:cyclePlan.authorizationId,automatic:true,humanApprovalRequired:false,target,conceptId:record.conceptId,placementId:record.placementId,packageHash:record.packageHash,attempt,maxAttempts:1,issues:clone(issues),preserve:{conceptHash:record.conceptHash,copyHash:record.copyHash,brandHash:record.brandHash,placementHash:record.placementHash,exactCopy:clone(record.exactCopy),lockedRules:clone(record.lockedRules)},instruction:'Correct only identified production issues. Copy changes require an explicitly revised upstream copy deck and regenerated art/package hashes; never mutate this revision silently.'};
}
module.exports={agent,inputSchema,outputSchema,assembleContext,buildPrompt,buildGenerationPackages,validateOutput,buildRevisionPackage,reviewChecks,providerAdapter:require('./provider-adapter')};
