'use strict';
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const director = require('../creative-director');
const strategist = require('../marketing-strategist');
const {check} = require('../marketing-strategist/schema-validator');
const placementAdapter = require('./placement-adapter');
const agent = require('./agent.json');
const inputSchema = require('./input.schema.json');
const coreOutputSchema = require('./core-output.schema.json');
const outputSchema = require('./output.schema.json');
const canonical = x => Array.isArray(x) ? x.map(canonical) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])) : x;
const same = (a,b) => JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const fingerprint = x => crypto.createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const bytesHash = x => crypto.createHash('sha256').update(x).digest('hex');
const clone = require('../clone-data');
const externalRoles = ['background','scene','setting','lighting','camera-angle','texture','mood'];
function fail(errors) { if(errors.length) {const e=Error(errors.join('\n'));e.validationErrors=errors;throw e;} }
function sourceMap(input) { return new Map([...input.directorInput.strategyInput.research.sources,...input.directorInput.strategyInput.additionalSources,...input.referenceSources].map(s=>[s.id,s])); }
function lockedRules(input) {return [...input.directorInput.strategyInput.guardian.requirements.map(r=>({...r,domain:'other',value:r.text})),...clone(input.visualRules)];}
function activeConcepts(input){const ids=input.activeConceptIds;if(ids&&(new Set(ids).size!==ids.length||ids.some(id=>!input.directorOutput.concepts.some(c=>c.conceptId===id))))throw Error("Unknown or duplicate active concept scope");return input.directorOutput.concepts.filter(c=>!ids||ids.includes(c.conceptId));}
function validateInput(input,{allowPartialPlacements=false}={}) {
 const errors=check(inputSchema,input); fail(errors);
 director.validateInput(input.directorInput);
 const upstream=director.validateOutput(input.directorOutput,input.directorInput); fail(upstream.hardErrors);
 const sources=sourceMap(input), ids=new Set(), placements=new Set();
 for(const s of input.referenceSources) if(!s.id || !s.reference || !['available','partial','unavailable'].includes(s.status) || !s.collectedAt || !s.label) errors.push('Invalid reference source provenance');
 const allSources=[...input.directorInput.strategyInput.research.sources,...input.directorInput.strategyInput.additionalSources,...input.referenceSources];
 if(new Set(allSources.map(s=>s.id)).size!==allSources.length) errors.push('Duplicate source ID');
 for(const a of input.assets) {
  if(ids.has(a.id)) errors.push('Duplicate asset ID'); ids.add(a.id);
  if(a.sourceIds.some(id=>!sources.has(id))) errors.push('Unknown asset source');
  if(a.ownership!=='external' && a.brandName!==input.directorInput.strategyInput.research.brandName) errors.push('Brand-owned reference belongs to another brand');
  if(a.synthetic && !input.directorInput.strategyInput.research.demo) errors.push('Synthetic asset requires a synthetic assignment');
  if(a.locator.kind==='local-file' && !path.isAbsolute(a.locator.value)) errors.push('Reference local file must use an absolute path');
 }
 const rules=lockedRules(input); if(new Set(rules.map(r=>r.id)).size!==rules.length) errors.push('Duplicate locked rule ID');
 for(const r of input.visualRules) if(r.sourceIds.some(id=>!sources.has(id)||sources.get(id).status==='unavailable')) errors.push('Visual rule source missing/unavailable');
 const formats=input.directorInput.strategyInput.assignment.formats;
 for(const p of input.placements) { if(placements.has(p.id)) errors.push('Duplicate placement ID');placements.add(p.id); if(!formats.some(f=>f.id===p.formatId)) errors.push('Placement format is outside selected assignment'); }
 if(!allowPartialPlacements&&formats.some(f=>!input.placements.some(p=>p.formatId===f.id))) errors.push('Every selected format needs a placement');
 const expected=activeConcepts(input).flatMap(c=>input.placements.map(p=>c.conceptId+'|'+p.id));
 const actual=input.copy.map(c=>c.conceptId+'|'+c.placementId);
 if(actual.length!==expected.length || new Set(actual).size!==actual.length || expected.some(k=>!actual.includes(k))) errors.push('Exact copy required for both concepts at every placement');
 const eligible=new Set(strategist.analyzeInput(input.directorInput.strategyInput).eligibleFacts.map(f=>f.id));
 for(const c of input.copy) {if(new Set(c.fields.map(f=>f.id)).size!==c.fields.length) errors.push('Duplicate copy field');for(const f of c.fields) {if(f.delivery==='native' && f.nativeFieldId==='none') errors.push('Native field linkage required');if(f.delivery==='embedded' && f.nativeFieldId!=='none') errors.push('Embedded copy cannot claim native linkage');if(f.proofFactIds.some(id=>!eligible.has(id))) errors.push('Copy cites unsupported proof');}}
 fail(errors);return clone(input);
}
async function resolveAssets(input) {
 const sources=sourceMap(input);
 return Promise.all(input.assets.map(async a=>{
  const base={assetId:a.id,label:a.label,ownership:a.ownership,brandName:a.brandName,provenance:a.provenance,sourceIds:a.sourceIds,synthetic:a.synthetic};
  try {
   // A partially indexed supplied deck can still contain a fully supplied slide raster.
   // This exception concerns attached pixels only; the source's draft/coverage status stays unchanged.
   if(a.sourceIds.some(id=>{const source=sources.get(id);return source?.status!=='available'&&!(source?.status==='partial'&&source.kind==='guidelines'&&/^user-upload:/.test(source.reference)&&a.ownership==='brand-supplied');})) throw Error('Source is not fully accessible');
   let bytes;
   if(a.locator.kind==='embedded') {const m=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(a.locator.value);if(!m) throw Error('Reference requires actual raster image data, not URL/prose');bytes=Buffer.from(m[2],'base64');if(bytes.toString('base64')!==m[2]) throw Error('Invalid base64');}
   else if(a.locator.kind==='local-file') {const stat=await fs.stat(a.locator.value);if(!stat.isFile()||stat.size>20*1024*1024) throw Error('Reference is not a bounded image file');bytes=await fs.readFile(a.locator.value);}
   else throw Error('Image payload not supplied');
   if(bytes.length>20*1024*1024) throw Error('Image exceeds reference size limit');
   const meta=await sharp(bytes,{limitInputPixels:40000000}).metadata();
   if(!['png','jpeg','webp'].includes(meta.format)||!meta.width||!meta.height || (meta.pages||1)>1) throw Error('Unsupported static image payload');
   // Decode pixels as well as headers to reject truncated/invalid raster payloads.
   await sharp(bytes,{limitInputPixels:40000000}).raw().toBuffer();
   return {...base,status:'resolved',sha256:bytesHash(bytes),width:meta.width,height:meta.height,mime:meta.format==='jpeg'?'image/jpeg':'image/'+meta.format,imageData:'data:image/'+(meta.format==='jpeg'?'jpeg':meta.format)+';base64,'+bytes.toString('base64')};
  } catch(e) {return {...base,status:'missing',reason:e.message};}
 }));
}
async function assembleContext(payload,{catalog,includeMessages=true,allowPartialPlacements=false}={}) {
 const input=validateInput(payload,{allowPartialPlacements});
 const references=await resolveAssets(input);
 const placements=input.placements.map(p=>({selection:clone(p),context:placementAdapter.resolve(p,input,catalog)}));
 return {version:1,inputHash:fingerprint(input),input,lockedRules:lockedRules(input),references,placements:placements.map(p=>({...p,placementHash:fingerprint(p)})),knowledge:require('./knowledge/pack.json'),messages:includeMessages?[{role:'system',content:require('fs').readFileSync(path.join(__dirname,'instructions.md'),'utf8')},{role:'user',content:JSON.stringify({input,placements,references})}]:[]};
}
function issuesFor(spec,ctx) {
 const errors=[], p=ctx.placements.find(p=>p.selection.id===spec.placementId), input=ctx.input;
 const card=input.directorOutput.concepts.find(c=>c.conceptId===spec.conceptId);
 if(!p||!card) return ['Unknown concept or placement'];
 const copy=input.copy.find(c=>c.conceptId===card.conceptId&&c.placementId===p.selection.id);
 if(spec.route!==card.route || spec.conceptHash!==director.conceptFingerprint(input.directorInput,card)||spec.formatId!==p.selection.formatId||spec.placementHash!==p.placementHash||spec.copyHash!==fingerprint(copy)) errors.push('Concept/copy/placement identity changed');
 if(!same(spec.lockedRules,ctx.lockedRules)) errors.push('Locked brand rules changed');
 if(!same(spec.text.map(t=>({id:t.fieldId,text:t.exactText,delivery:t.delivery,nativeFieldId:t.nativeFieldId})),copy.fields.map(f=>({id:f.id,text:f.text,delivery:f.delivery,nativeFieldId:f.nativeFieldId})))) errors.push('Exact text/order/delivery changed');
 const allowedRules=new Set((p.context.placements[0]?.rules||[]).map(r=>r.id)), allowedSources=new Set((p.context.placements[0]?.sources||[]).map(s=>s.id));
 for(const [annotationName,a] of [['safeAreas',spec.safeAreas],['crop',spec.crop],['viewingSize',spec.viewingSize]]) {
  if(a.ruleIds.some(id=>!allowedRules.has(id)) || a.sourceIds.some(id=>!allowedSources.has(id))) errors.push('Unknown placement annotation provenance in '+annotationName+': ruleIds '+JSON.stringify(a.ruleIds)+' and sourceIds '+JSON.stringify(a.sourceIds)+'. Permitted rule IDs: '+JSON.stringify([...allowedRules])+'. Permitted source IDs: '+JSON.stringify([...allowedSources]));
  if(a.sourceStatus!=='unknown' && a.sourceStatus!=='heuristic' && !a.ruleIds.length) errors.push('Placement annotation cannot promote an unknown specification');
  if(a.ruleIds.length && a.sourceIds.some(id=>!p.context.placements[0].rules.filter(r=>a.ruleIds.includes(r.id)).some(r=>r.sourceIds.includes(id)))) errors.push('Placement sources must belong to cited rules in '+spec.placementId+'/'+annotationName+'. Received sourceIds '+JSON.stringify(a.sourceIds)+'. Cited rule-to-source mapping: '+JSON.stringify(p.context.placements[0].rules.filter(r=>a.ruleIds.includes(r.id)).map(r=>({ruleId:r.id,sourceIds:r.sourceIds,evidenceStatus:r.evidenceStatus})))+'. Preserve the direction and cite only those sources; use heuristic for editorial or mixed decisions.');
  if(a.sourceStatus==='official-guidance' && a.ruleIds.some(id=>!p.context.placements[0].rules.some(r=>r.id===id&&r.tier==='official-guidance'))) errors.push('Placement guidance tier promoted');
  if(a.sourceStatus==='verified-primary' && a.ruleIds.some(id=>!p.context.placements[0].rules.some(r=>r.id===id&&r.evidenceStatus==='verified-primary'))) errors.push('Placement source status promoted in '+annotationName+': '+a.sourceStatus+' cannot apply to '+JSON.stringify(a.ruleIds)+'. Actual cited rule evidence: '+JSON.stringify(p.context.placements[0].rules.filter(r=>a.ruleIds.includes(r.id)).map(r=>({id:r.id,status:r.evidenceStatus,sourceIds:r.sourceIds})))+'. Use heuristic for any annotation mixing editorial guidance with dimensions; preserve the design direction.');
  if(a.sourceStatus==='user-specified' && a.ruleIds.some(id=>!p.context.placements[0].rules.some(r=>r.id===id&&r.evidenceStatus==='user-specified'))) errors.push('Placement source status promoted in '+annotationName+': '+a.sourceStatus+' cannot apply to '+JSON.stringify(a.ruleIds)+'. Actual cited rule evidence: '+JSON.stringify(p.context.placements[0].rules.filter(r=>a.ruleIds.includes(r.id)).map(r=>({id:r.id,status:r.evidenceStatus,sourceIds:r.sourceIds})))+'. Use heuristic for any annotation mixing editorial guidance with dimensions; preserve the design direction.');
 }
 const used=new Set();
 for(const ref of spec.references) {
  if(used.has(ref.assetId)) errors.push('Duplicate attached reference');used.add(ref.assetId);
  const a=ctx.references.find(a=>a.assetId===ref.assetId);
  if(!a) {errors.push('Unknown reference asset');continue;}
  if(a.ownership==='external' && (spec.route==='continuity'||ref.roles.some(r=>!externalRoles.includes(r)))) errors.push('External reference role violates brand boundary');
  if(a.status!=='resolved' && spec.status==='ready') errors.push('Missing reference cannot be execution ready');
 }
 for(const [key,role] of [['logo','logo'],['product','product']]) for(const id of spec[key].assetIds) if(!spec.references.some(r=>r.assetId===id&&r.roles.includes(role))) errors.push('Logo/product asset lacks explicit attached role');
 const expanded=p.context.placements[0];
 for(const t of spec.text) {
  if(t.delivery==='native' && !expanded?.profile.nativeFields.some(f=>f.id===t.nativeFieldId)) errors.push('Unknown native field for placement');
  if(t.delivery==='embedded' && expanded?.profile.assets.some(a=>a.embeddedText==='promotional-forbidden') && spec.status==='ready') errors.push('Embedded copy forbidden by placement');
 }
 if(spec.status==='ready' && p.context.placements[0]?.sourceConflicts.length) errors.push('Placement source conflicts require internal resolution');
 if(spec.status==='ready' && (p.context.readiness!=='planning-context-ready'||input.directorOutput.status!=='ready'||spec.dependencies.length||spec.reconciliation.some(r=>r.status!=='aligned'))) errors.push('Unresolved dependencies cannot dispatch');
 if(spec.status==='blocked'&&!spec.dependencies.length) errors.push('Blocked spec requires internal dependency');
 const principles=new Set(ctx.knowledge.principles.map(p=>p.id));for(const a of spec.knowledgeApplications) if(!principles.has(a.principleId)) errors.push('Unknown knowledge principle '+a.principleId+' in '+spec.placementId+'. Allowed art principleIds: '+JSON.stringify([...principles])+'. Placement rule IDs are not art principle IDs.');
 errors.push(...require('../runtime/guideline-reasoning').validate(spec.brandGuidelineApplications,ctx.lockedRules,[...sourceMap(input).values()]));
 return errors;
}
function validateCore(core,ctx) {
 const errors=check(coreOutputSchema,core);if(errors.length)return errors;
 if(core.assignmentId!==ctx.input.directorInput.assignmentId||core.inputHash!==ctx.inputHash)errors.push('Art input identity changed');
 if(!Number.isInteger(core.workflow.attempt)) errors.push('Integer attempt required');
 const expected=activeConcepts(ctx.input).flatMap(c=>ctx.input.placements.map(p=>c.conceptId+'|'+p.id)), actual=core.specifications.map(s=>s.conceptId+'|'+s.placementId);
 if(actual.length!==expected.length||new Set(actual).size!==actual.length||expected.some(k=>!actual.includes(k)))errors.push('Both concept routes required at every placement');
 for(const s of core.specifications) errors.push(...issuesFor(s,ctx));return errors;
}
function buildAutomaticHandoff(core,ctx) {
 fail(validateCore(core,ctx));
 const readySpecs=core.specifications.filter(s=>s.status==='ready');const ready=readySpecs.length===core.specifications.length;const dispatch=readySpecs.length>0;
 return {version:1,contract:'creative-ai.graphic-designer-handoff.v1',agentId:'graphic-designer',automatic:true,humanApprovalRequired:false,status:ready?'ready':dispatch?'partial-ready':'blocked',dispatchAllowed:dispatch,assignmentId:core.assignmentId,inputHash:core.inputHash,conceptIds:ctx.input.directorOutput.concepts.map(c=>c.conceptId),productionMode:'whole-static-image-with-embedded-text',context:{strategy:clone(ctx.input.directorInput.strategy),concepts:clone(ctx.input.directorOutput.concepts),copy:clone(ctx.input.copy),lockedRules:clone(ctx.lockedRules),placements:clone(ctx.placements)},packets:dispatch?readySpecs.map(s=>({specification:clone(s),artHash:fingerprint(s),attachments:s.references.map(r=>({...clone(ctx.references.find(a=>a.assetId===r.assetId)),roles:clone(r.roles),instruction:r.instruction}))})):[],internalDependencies:core.specifications.flatMap(s=>s.dependencies.map(d=>({conceptId:s.conceptId,placementId:s.placementId,...d})))};
}
function finalizeOutput(core,ctx) {return {...clone(core),handoff:buildAutomaticHandoff(core,ctx)};}
function validateOutput(output,ctx) {
 const {handoff,...core}=output;const errors=check(outputSchema,output);errors.push(...validateCore(core,ctx));
 if(!errors.length && !same(handoff,buildAutomaticHandoff(core,ctx)))errors.push('Handoff payload changed');
 return {valid:!errors.length,hardErrors:errors,limits:['Schema checks do not establish visual quality, truthful imagery, ownership rights, interpretation or legibility. Semantic and rendered review remain pending.']};
}
module.exports={activeConcepts,agent,inputSchema,outputSchema,coreOutputSchema,validateInput,resolveAssets,assembleContext,validateCore,validateOutput,buildAutomaticHandoff,finalizeOutput,fingerprint,same,externalRoles};
