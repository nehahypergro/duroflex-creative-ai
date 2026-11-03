'use strict';
// Studio PDP pack: an ordered product gallery, not marketplace certification.
const {fingerprint}=require('../art-director');
const {check}=require('../marketing-strategist/schema-validator');
const id='custom:studio-pdp-pack';
const treatmentPack=require('../treatment-knowledge').loadPack('owned-pdp');
const slots=treatmentPack.slots;
const photoRoles=new Set(slots.filter(s=>s.readingClass==='commerce-photo').map(s=>s.key));
const preset={id,name:'Full PDP pack · 12 images',category:'Commerce',platform:'Product page',kind:'pdp',width:1600,height:1600,guidelines:'Twelve ordered source-backed product-gallery images per creative direction. Two directions are separate complete packs. Missing slot evidence blocks the pack; publisher eligibility is separate.'};
const instructions=treatmentPack.executionInstructions;
function groups(selection){const rows=selection.filter(s=>s.description?.pdp);return rows.length?[{id,slots:rows.map(s=>({placementId:s.id,...s.description.pdp})).sort((a,b)=>a.index-b.index)}]:[];}
const string={type:'string'};
const planSchema={type:'object',properties:{version:{const:1},sets:{type:'array',items:{type:'object',properties:{conceptId:string,visualSystem:string,slots:{type:'array',items:{type:'object',properties:{placementId:string,status:{enum:['ready','needs-source']},message:string,visualDirection:string,proofFactIds:{type:'array',items:string},requiredQualifiers:{type:'array',items:string},missingEvidence:{type:'array',items:string}},required:['placementId','status','message','visualDirection','proofFactIds','requiredQualifiers','missingEvidence'],additionalProperties:false}}},required:['conceptId','visualSystem','slots'],additionalProperties:false}}},required:['version','sets'],additionalProperties:false};
const shoppingSchema=structuredClone(planSchema);
shoppingSchema.properties.version.const=2;
const shoppingSlot=shoppingSchema.properties.sets.items.properties.slots.items;
Object.assign(shoppingSlot.properties,{
 role:{enum:slots.map(s=>s.key)},buyerQuestion:string,
 visualEvidenceIds:{type:'array',items:string},referenceAdequacy:{enum:['adequate','limited','missing']},referenceNote:string,
 diagramKind:{enum:['none','dimensions','mechanism','source-backed-cutaway']},
 dimensionAnnotations:{type:'array',items:{type:'object',properties:{axis:{enum:['length','width','height']},label:string,proofFactId:string},required:['axis','label','proofFactId'],additionalProperties:false}},altText:string
});
shoppingSlot.required=Object.keys(shoppingSlot.properties);
// V3 keeps agent instructions out of the literal artwork wording contract.
const wordingSchema=structuredClone(shoppingSchema);
wordingSchema.properties.version.const=3;
const wordingSlot=wordingSchema.properties.sets.items.properties.slots.items;
wordingSlot.properties.copyInstructions={type:'array',items:string,description:'Instructions for the copywriter, never literal artwork text.'};
wordingSlot.required.push('copyInstructions');
wordingSlot.properties.message={type:'string',minLength:0,description:'Buying answer or planned wording. May be empty only for a photo-only slot; its buyerQuestion and visualDirection still define its purpose.'};
wordingSlot.properties.requiredQualifiers.description='Only literal, source-supported phrases that must appear verbatim in mandatory embedded copy, e.g. with a damp cloth or every 6 months. No instructions, editorial wrappers or generic source disclaimers. Use dimensionAnnotations for measurement labels. Put execution guidance in copyInstructions.';
function validateQualifiers(slot,input){
 const sources=input.facts.filter(f=>f.status==='supported'&&slot.proofFactIds.includes(f.id)).map(f=>qualifierText(f.text||''));
 // A real care qualifier can begin “Use” or “Do not”. Source wording wins
 // over the instruction heuristic; never ban those phrases indiscriminately.
 for(const q of slot.requiredQualifiers)if(!q.trim()||(/^(?:retain|keep|use|identify|do not|preserve|include|ensure|state|mention)\b/i.test(q.trim())&&!sources.some(text=>text.includes(qualifierText(q)))))throw Error('PDP requiredQualifiers must contain literal source wording, not a planner instruction; move instructions to copyInstructions and retain the actual qualifier separately.');
}
function validateShoppingSlot(s,expected,input,facts){
 if(s.role!==expected.key)throw Error('PDP slot role changed');
 const allowed=new Set(input.productReference?.referenceAssetIds||input.productReference?.assetIds||[]),available=new Set((input.assets||[]).filter(a=>a.imageData).map(a=>a.id));
 if(s.visualEvidenceIds.some(id=>!allowed.has(id)||!available.has(id)))throw Error('PDP visual evidence must be an available selected-SKU reference');
 if(!s.buyerQuestion.trim()||!s.referenceNote.trim()||!s.altText.trim())throw Error('PDP needs a buyer question, reference assessment and proposed alt text');
 if(s.status!=='ready')return;
 if(s.referenceAdequacy!=='adequate'||!s.visualEvidenceIds.length)throw Error('PDP needs adequate visual reference evidence for the proposed depiction');
 if(photoRoles.has(s.role)&&(s.requiredQualifiers.length||s.diagramKind!=='none'))throw Error('PDP photography cannot carry an explanatory diagram or overlay qualifier; use an information slot');
 if(s.role==='dimensions'&&(s.diagramKind!=='dimensions'||s.dimensionAnnotations.length!==3||new Set(s.dimensionAnnotations.map(a=>a.axis)).size!==3||s.dimensionAnnotations.some(a=>!a.label.trim()||!facts.has(a.proofFactId)||!s.proofFactIds.includes(a.proofFactId))))throw Error('PDP dimensions need three distinct sourced axes and labels');
 if(s.role!=='dimensions'&&s.dimensionAnnotations.length)throw Error('Dimension annotations belong to the dimension slot');
 if(s.diagramKind==='source-backed-cutaway'&&!s.proofFactIds.length)throw Error('PDP cutaway needs exact-SKU factual and visual evidence');
}
function validatePlan(out,input){
 const errors=check(out?.version===3?wordingSchema:out?.version===2?shoppingSchema:planSchema,out);if(errors.length)throw Error(errors.join('\n'));
 const expected=groups(input.selection)[0]?.slots||[],facts=new Set(input.facts.filter(f=>f.status==='supported').map(f=>f.id));
 if(out.sets.length!==input.concepts.length||new Set(out.sets.map(s=>s.conceptId)).size!==input.concepts.length)throw Error('PDP needs exactly one complete plan per concept');
 for(const c of input.concepts){const set=out.sets.find(s=>s.conceptId===c.conceptId);if(!set||!set.visualSystem.trim()||set.slots.length!==expected.length||set.slots.some((s,i)=>s.placementId!==expected[i].placementId))throw Error('PDP plan changed the selected slots or order');
  for(const [i,s]of set.slots.entries()){
   if(out.version>=2)validateShoppingSlot(s,expected[i],input,facts);if(out.version===3)validateQualifiers(s,input);
   if(s.proofFactIds.some(f=>!facts.has(f)))throw Error('PDP plan cites unsupported evidence');
   if(s.status==='ready'&&((!s.message.trim()&&!(out.version===3&&photoRoles.has(s.role)))||!s.visualDirection.trim()||s.missingEvidence.length||(expected[i].requiresFacts&&!s.proofFactIds.length)))throw Error('PDP slot cannot be ready without its required evidence');
   if(s.status==='needs-source'&&!s.missingEvidence.length)throw Error('PDP source gap must identify missing evidence');
  }
  if(out.version>=2){const questions=set.slots.map(s=>s.buyerQuestion.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' '));if(new Set(questions).size!==questions.length)throw Error('PDP repeats a buyer question');}
  const messages=set.slots.filter(s=>s.status==='ready'&&s.message.trim()).map(s=>s.message.trim().toLowerCase());if(new Set(messages).size!==messages.length)throw Error('PDP slots need distinct purposes and messages');
 }
 return out;
}
function requireReady(plan){const gaps=plan.sets.flatMap(s=>s.slots.filter(x=>x.status!=='ready').map(x=>({conceptId:s.conceptId,...x})));if(gaps.length){const e=Error('PDP source evidence needed: '+gaps.map(s=>s.placementId+': '+s.missingEvidence.join(', ')).join('; '));e.code='PDP_SOURCE_REQUIRED';e.gaps=gaps;throw e;}}
function dispatchPlan(plan,selection,knowledge,{isolateUnits=false}={}){
 const expectedUnits=selection.length*(plan?.sets.length||0);
 if(!plan)return {selection,deferred:[],expectedUnits};
 if(isolateUnits){const deferred=plan.sets.flatMap(set=>set.slots.filter(s=>s.status!=='ready').map(s=>({conceptId:set.conceptId,placementId:s.placementId,role:selection.find(p=>p.id===s.placementId)?.description?.pdp?.key,reasons:[...s.missingEvidence]})));return {selection,deferred,expectedUnits};}
 const policy=knowledge?.packs.find(p=>p.id==='owned-pdp');
 // Only newly pinned policy permits deferral. Historical plans remain strict.
 if(policy?.version!==4||!policy.rules.some(r=>r.id==='pdp-optional-slot-fallback')){requireReady(plan);return {selection,deferred:[],expectedUnits};}
 const optional=new Set(selection.filter(s=>['technology','service'].includes(s.description?.pdp?.key)).map(s=>s.id));
 const required={...plan,sets:plan.sets.map(s=>({...s,slots:s.slots.filter(x=>!optional.has(x.placementId))}))};
 requireReady(required);
 const deferred=plan.sets.flatMap(s=>s.slots.filter(x=>x.status!=='ready').map(x=>({conceptId:s.conceptId,placementId:x.placementId,role:selection.find(p=>p.id===x.placementId)?.description.pdp.key,reasons:[...x.missingEvidence]})));
 // Keep paired planning consistent: a placement deferred in either direction is
 // held in both. Preserve the full expected count and full immutable plan.
 const excluded=new Set(deferred.map(s=>s.placementId));
 return {selection:selection.filter(s=>!excluded.has(s.id)),deferred,expectedUnits};
}
const visualEvidenceScope=' VISUAL EVIDENCE SCOPE: assess only the proposed depiction, not a more elaborate depiction that this slot explicitly avoids. Assess textual claim support separately through proofFactIds. A photograph does not prove warranty coverage, care instructions, fibre counts or package contents; those statements require supported text sources, while an adjacent product view requires adequate product pixels. This separation does not waive either check. If you choose a supported exterior product view plus sourced text instead of an unsupported cutaway, assess the exterior view you will actually render. Describe excluded depictions and source limitations in referenceNote and visualDirection. A source promotional headline or diagram is not automatically a physical product marking: omit source-page overlays without changing actual fabric labels or branding. Inspect the whole supplied reference inventory before selecting a view. Exclude a conflicting gallery photograph when the mandatory identity anchor or another compatible exact-SKU reference can support the same buying question. A source room is not required: build the new scene around compatible product evidence. Never combine contradictory markings from different references. An unavoidable actual product-marking conflict, unresolved identity, inadequate visible texture or required unverified internal geometry remains a blocker: mark needs-source and name the exact conflicting references/markings, not ready with limited evidence. Do not recreate the source room by default; new reference-led angles and environments remain permitted.';
async function plan(input,provider,budget){const schema=JSON.parse(JSON.stringify(wordingSchema));schema.properties.sets.minItems=schema.properties.sets.maxItems=input.concepts.length;schema.properties.sets.items.properties.conceptId.enum=input.concepts.map(c=>c.conceptId);schema.properties.sets.items.properties.slots.minItems=schema.properties.sets.items.properties.slots.maxItems=12;const initial=await provider.reason({contextKind:'concepts',preferenceConsumer:true,instructions:require('../treatment-knowledge').execution(input.treatmentKnowledge)+visualEvidenceScope+' Plan all twelve slots for ONLY the concepts in input.concepts, in the supplied order. Do not add a sibling concept or plan for it. Bind facts to this exact SKU and selected variant. For each claim list only the literal source-supported phrases required in artwork as requiredQualifiers. Put execution instructions in copyInstructions; never put instructions such as Retain, Use, or Do not into requiredQualifiers. Do not add generic described-as disclaimers unless the source claim actually requires that scope. Missing sources must be marked needs-source with a precise evidence request; never substitute an unrelated SKU, generic advice or repeated promotional tile. Assess the attached selected-SKU pixels for every proposed slot. Supply its role, distinct buyerQuestion, visualEvidenceIds, referenceAdequacy with a concrete referenceNote, diagramKind, dimensionAnnotations and proposed altText. Set needs-source when reference detail is too weak; never label evidence adequate simply to fill twelve slots. A matching fact ID alone does not prove a cutaway geometry or readable label. Photography slots still require the supplied exact-SKU references. Do not infer the reference backdrop as mandatory styling.',input:{...input,assets:(input.assets||[]).map(({imageData,...a})=>a),groups:groups(input.selection)},images:(input.assets||[]).filter(a=>a.imageData).map(a=>({id:a.id,label:a.label||a.id,imageData:a.imageData})),schema,maxOutputTokens:14000,validate:o=>validatePlan(o,input)},budget);return require('./pdp-alternatives').recover({plan:initial,input,slotSchema:structuredClone(wordingSlot),validate:o=>validatePlan(o,input),provider,budget});}
// Qualifier presence is semantic wording coverage; exact locked-copy checks remain separate.
const qualifierText=value=>String(value).normalize('NFC').replace(/\s+/gu,' ').trim().toLowerCase();
function validateCopy(out,plan){for(const set of plan?.sets||[])for(const s of set.slots){const d=out.decks.find(d=>d.conceptId===set.conceptId&&d.placementId===s.placementId);if(!d)continue;if(plan.version>=2){const embedded=d.fields.filter(f=>f.delivery==='embedded');if(photoRoles.has(s.role)&&embedded.length)throw Error('PDP photography must not contain overlay copy');if(embedded.some(f=>f.role==='cta'))throw Error('PDP gallery actions belong in the page; embedded CTA is not permitted');for(const a of s.dimensionAnnotations||[])if(!embedded.some(f=>f.requirement==='mandatory'&&f.text.includes(a.label)&&f.proofFactIds.includes(a.proofFactId)))throw Error('PDP dimension annotation missing from exact mandatory copy');}for(const q of s.requiredQualifiers)if(!d.fields.some(f=>f.delivery==='embedded'&&qualifierText(f.text).includes(qualifierText(q))&&f.requirement==='mandatory')){const e=Error('PDP required qualifier missing: '+s.placementId);e.code='PDP_QUALIFIER_MISSING';throw e;}if(d.fields.some(f=>f.proofFactIds.some(id=>!s.proofFactIds.includes(id))))throw Error('PDP copy introduces a claim outside its slot plan');}return out;}
function scope(plan,ids){return plan?{...plan,sets:plan.sets.map(s=>({...s,slots:s.slots.filter(x=>ids.has(x.placementId))}))}:null;}
function admission(config){
 // Existing global money cap remains authoritative; never silently enlarge it.
 // 24 initial images, 48 initial OCR/visual calls, bounded planning and set review.
 const minimum={images:24,reasoning:config.streamingPlanning?(config.executionIsolation?(config.optionPlanning?137:136):100):76},reserve=minimum.images*config.estimatedSpend.imageUsd+minimum.reasoning*config.estimatedSpend.reasoningUsd;
 if(config.estimatedSpend.maxUsd<reserve){const e=Error('The full 12-image PDP pair exceeds the configured project reservation allowance. Configure a sufficient pack allowance before starting; no generation was dispatched.');e.code='PDP_BUDGET_REQUIRED';e.minimumReservation={...minimum,sourceCurrency:'USD',amount:reserve,basis:'Conservative configured reservations, not actual charges; corrections may require more.'};throw e;}
 return {...config,jobTimeoutMs:Math.max(config.jobTimeoutMs||0,120*60*1000),maxReasoningCalls:Math.max(config.maxReasoningCalls,config.executionIsolation?200:160)};
}
function outputConcurrency(config,selection){return groups(selection).length?Math.max(config.maxConcurrentUnits||2,4):(config.maxConcurrentUnits||2);}
function reviewCriteria(set){return ['slot-coverage','visual-consistency','product-truth',...(set.slots?.every(s=>s.buyerQuestion)?['buying-clarity','mobile-readability']:[])];}
function assessManifest(set,entries,checks=[]){const missing=entries.filter(x=>!x.imageUrl||x.artifactHash==='missing'),passed=entries.filter(x=>x.ready&&x.imageUrl&&x.artifactHash!=='missing');return {version:1,conceptId:set.conceptId,visualSystem:set.visualSystem,slots:entries,binding:fingerprint({set,entries}),complete:entries.length===12&&!missing.length,ready:entries.length===12&&passed.length===12&&checks.length===reviewCriteria(set).length&&new Set(checks.map(c=>c.criterion)).size===reviewCriteria(set).length&&checks.every(c=>reviewCriteria(set).includes(c.criterion)&&c.status==='pass'),passed:passed.length,checks,limits:'Per-slot reviews and full-set inspection must pass. Publisher upload eligibility remains separate.'};}
module.exports={id,preset,slots,instructions,groups,planSchema,shoppingSchema,photoRoles,plan,validatePlan,requireReady,dispatchPlan,validateCopy,scope,admission,outputConcurrency,reviewCriteria,assessManifest};
