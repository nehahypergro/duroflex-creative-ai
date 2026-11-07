'use strict';
// Shared composition contract. New jobs opt in by a persisted version; historical jobs keep their renderer.
const fs=require('./artifact-fs'),path=require('node:path');
const {fingerprint}=require('../art-director');
const {check}=require('../marketing-strategist/schema-validator');
const editable=require('./editable');
const fraction={type:'number',minimum:0,maximum:1};
const positive={type:'number',exclusiveMinimum:0,maximum:1};
const rect={x:fraction,y:fraction,width:positive,height:positive};
const box={type:'object',properties:{fieldId:{type:'string'},role:{enum:['headline','body','cta','disclaimer','brand','other','product-name','supporting-copy']},...rect,fontId:{type:'string'},fontSize:positive,colour:{type:'string',pattern:'^#[a-fA-F0-9]{6}$'},align:{enum:['left','center','right']},lineHeight:{type:'number',minimum:.8,maximum:2},buttonBackground:{anyOf:[{type:'null'},{type:'string',pattern:'^#[a-fA-F0-9]{6}$'}]},buttonPadding:{type:'number',minimum:0,maximum:.05},reason:{type:'string',minLength:1}},additionalProperties:false};box.required=Object.keys(box.properties);
const schema={type:'object',properties:{safeMargin:{type:'number',minimum:0,maximum:.2},text:{type:'array',maxItems:100,items:box},logo:{anyOf:[{type:'null'},{type:'object',properties:{assetId:{type:'string'},...rect,reason:{type:'string',minLength:1}},required:['assetId','x','y','width','height','reason'],additionalProperties:false}]},protectedRegions:{type:'array',maxItems:12,items:{type:'object',properties:{id:{type:'string'},kind:{enum:['product','person','face']},...rect,reason:{type:'string',minLength:1}},required:['id','kind','x','y','width','height','reason'],additionalProperties:false}}},required:['safeMargin','text','logo','protectedRegions'],additionalProperties:false};
// Legacy saved layouts remain readable; new agent responses must supply the full contract.
const designLimits={minFontSize:positive,maxLines:{type:'integer',minimum:1,maximum:100},minContrastRatio:{type:'number',minimum:4.5,maximum:21},surface:{type:'string',minLength:1}};
Object.assign(box.properties,designLimits);
schema.properties.contractVersion={enum:[2]};
const planningSchema=structuredClone(schema);
planningSchema.required.push('contractVersion');
planningSchema.properties.text.items.required.push(...Object.keys(designLimits));
const instructions=`DESIGN-FIRST EDITABLE COMPOSITION. Return contractVersion 2. For each embedded field specify fontId, preferred fontSize and minFontSize (both fractions of canvas WIDTH), maxLines, minContrastRatio (at least 4.5), and surface describing the real quiet scene surface behind its box. Choose the minimum for the actual viewing size, not arbitrary shrinkage. Exact line breaks remain part of the supplied copy; maxLines includes wrapping. Box, alignment, lineHeight, colour, grouping and reason must follow the upstream reading order. Keep every text and logo box inside safeMargin and outside planned protected regions and other overlay boxes. If the layout cannot satisfy these limits, use the existing dependency/copy-revision path. These limits also bind fitting and review corrections. Keep the same strategy, concept, final exact copy, product evidence and placement rules. In this existing reconciliation response, also return overlayLayout for each unit. This is the final layout for the FINAL wording, not the earlier draft. Text will be rendered with the supplied real font files over a clean generated image. Return one text box per embedded fieldId, including repeated roles; never add, omit, rewrite, uppercase or abbreviate wording. Native copy stays outside the image. Use buttonBackground only for a CTA button already called for by the final art direction; otherwise null and buttonPadding 0. Do not invent buttons or panels. An image-only unit may have zero text boxes. Do not force a headline, CTA, product-name or emotional appeal that is absent from that format's final copy.\nCoordinates are fractions of the final canvas; fontSize is a fraction of canvas WIDTH. Use the supplied placement dimensions, safe areas, crop and viewing-size reading guidance. Design for the actual phone/desktop/print context, not the export resolution alone. Choose readable sizes, meaningful hierarchy, deliberate alignment, grouping and breathing room. Keep important content outside UI overlays, crops, product and people. Never rescue copy with tiny type. If exact mandatory wording cannot fit, use the EXISTING bounded copy revision/dependency mechanism for that unit; do not claim it fits.\nUse only supplied font IDs and the exact saved logo assetId, or null when the placement omits an added logo. Keep the whole mark and clear space within the permitted top corner. Protected regions describe planned product/people areas, not detected pixels. Brand-only scenes need no invented product region. Reserve quiet real surfaces for the actual final boxes; no white patches, haze, painted panels or artificial gradients. Reconcile scene/composition if the final words require different space. Keep the photographic and overlay composition in agreement. These are design intentions: the assembled image must still be measured and reviewed.`;
const nameFor=s=>'composition-overlay-'+editable.key(s.route,s.placementId)+'.json';
const experimentNameFor=s=>'experiment-overlay-'+editable.key(s.route,s.placementId)+'.json';
function validate(plan,spec,assets,logoRequired,metrics){
 const errors=check(plan?.contractVersion===2?planningSchema:schema,plan);if(errors.length)throw Error(errors.join('; '));
 const expected=spec.text.filter(t=>t.delivery==='embedded').map(t=>t.fieldId),actual=plan.text.map(t=>t.fieldId);
 if(new Set(actual).size!==actual.length||expected.length!==actual.length||expected.some(id=>!actual.includes(id)))throw Error('Final overlay must bind every embedded field exactly once');
 for(const b of [...plan.text,...(plan.logo?[plan.logo]:[]),...plan.protectedRegions])if(b.x+b.width>1.000001||b.y+b.height>1.000001)throw Error('Overlay coordinates exceed canvas');
 if(plan.text.some(b=>!assets.fonts.some(f=>f.id===b.fontId&&f.brandId===assets.brandId)))throw Error('Overlay font is outside this brand');
 const logos=assets.logos||[assets.logo].filter(Boolean);
 if(Boolean(plan.logo)!==logoRequired||plan.logo&&!logos.some(a=>a.id===plan.logo.assetId&&a.brandId===assets.brandId))throw Error('Overlay logo does not match this placement and brand');
 if(new Set(plan.protectedRegions.map(r=>r.id)).size!==plan.protectedRegions.length)throw Error('Duplicate protected region');
 if(plan.contractVersion===2){
  const layers=[...plan.text,...(plan.logo?[plan.logo]:[])];
  const overlaps=(a,b)=>a.x<b.x+b.width-1e-6&&a.x+a.width>b.x+1e-6&&a.y<b.y+b.height-1e-6&&a.y+a.height>b.y+1e-6;
  for(const b of layers){
   if(b.minFontSize>b.fontSize)throw Error('Minimum readable font size exceeds preferred font size: '+b.fieldId);
   if(!metrics?.framingTolerance&&(b.x<plan.safeMargin-1e-6||b.y<plan.safeMargin-1e-6||b.x+b.width>1-plan.safeMargin+1e-6||b.y+b.height>1-plan.safeMargin+1e-6))throw Error('Planned layer exceeds safe margin: '+(b.fieldId||'logo'));
   for(const region of plan.protectedRegions)if(!metrics?.visualJudgment&&overlaps(b,region))throw Error('Planned layer overlaps protected subject region '+region.id+': '+(b.fieldId||'logo'));
  }
  for(let i=0;i<layers.length;i++)for(let j=i+1;j<layers.length;j++)if(!metrics?.visualJudgment&&overlaps(layers[i],layers[j]))throw Error('Planned text/logo layers overlap');
 }
 if(metrics?.fonts)require('./layout-text-metrics').validate(plan,spec,metrics);
 return plan;
}
function makeRequest(request,assets,onPlan,{experiment=false,fonts,logoMetrics,qualityVersion=0}={}){
 const base=request.wire;if(base?.kind!=='typed-reconciliation-v2')throw Error('Editable composition requires the current reconciliation contract');
 const wireSchema=structuredClone(base.schema),item=wireSchema.properties.adjustments.items;
 item.properties.overlayLayout=structuredClone(experiment?schema:planningSchema);item.required.push('overlayLayout');
 if(qualityVersion>=4&&assets.fonts.length)item.properties.overlayLayout.properties.text.items.properties.fontId.enum=assets.fonts.map(f=>f.id);
 // The isolated historical experiment retains its original response contract.
 const guidance=experiment?instructions.slice(instructions.indexOf('Keep the same strategy')):instructions+'\nFONT-METRIC PLANNING: Use overlayTypography to allocate enough width and height for the exact words in the selected font. Preferred size must already fit the box and maxLines; downstream fitting is not a substitute for a feasible plan. A 2% horizontal allowance is used for shaping differences. Font size fractions use canvas WIDTH while box height fractions use canvas HEIGHT: account for the aspect ratio. Editorial display-size targets are starting guidance, not mandatory minimum font sizes. Set the minimum from the actual composition and viewing context; do not mechanically copy the starting target into preferred and minimum. Reconcile the scene, subject regions and overlay geometry together before photography. A protected region is an envelope for the ENTIRE visible subject, not merely its base or centre. Include heads above a seated sofa, arms, feet and the complete product silhouette. Do not describe a large foreground sofa with seated people while allocating them only a shallow strip at the bottom. If the copy crowds the subjects, revise the scene framing and type hierarchy together; do not preserve oversized editorial defaults by squeezing the photograph. Use a coherent quiet surface behind the whole copy group, with no doors, dark wood, furniture or people intruding. Keep meaningful product scale and natural human proportions. No extra measurement or layout agent is added.';
 const readableTargets=qualityVersion>=4?require('./composed-quality').planningTargets(request,{headroom:qualityVersion>=14?1:1.3}):[];
 const readableInstructions=readableTargets.length?'\nCOMPOSED INITIAL-SIZE REQUIREMENT (overrides smaller editorial defaults above): '+JSON.stringify(readableTargets)+'. These are MINIMUM PREFERRED fontSize fractions of canvas WIDTH. The body minimum applies to EVERY non-headline field, explicitly including CTA, supporting-copy and product-name. CTA may not be smaller than body. Allocate boxes, maxLines and coherent quiet surfaces that actually fit these sizes with supplied font metrics. Recompose the scene and protected regions to leave room BEFORE returning a ready plan. No text box may extend onto a dark wall strip, doorway, artwork, furniture or subject. Reconstruction never rescales measured type. The initial guide uses these exact box/font sizes.':'';
 const wire={...base,kind:experiment?'text-layer-reconciliation-experiment-v1':'editable-text-reconciliation-v1',schema:wireSchema,instructions:base.instructions+'\n'+guidance+readableInstructions+(qualityVersion>=6?'\n'+require('./composed-readability').instructions:'')+(qualityVersion>=7?'\n'+(qualityVersion>=12?require('./composed-logo').identityInstructions:require('./composed-logo').instructions):'')+(qualityVersion>=8?'\n'+require('./framing-policy').instructions:'')+(qualityVersion>=13?'\n'+require('./visual-judgment').instructions:''),input:{...base.input,overlayAssets:{brandId:assets.brandId,fonts:assets.fonts.map(({id,family,name,weight,style})=>({id,family,name,weight,style})),logos:(assets.logos||[assets.logo].filter(Boolean)).map(({id,name,colour,backgroundUsage})=>({id,name,colour,backgroundUsage}))}},decode(out){
  const errors=check(wireSchema,out);if(errors.length)throw Error(errors.join('; '));
  const clean=structuredClone(out);for(const p of clean.adjustments)delete p.overlayLayout;
  const result=base.decode(clean);
  for(const spec of result.specifications){const patch=structuredClone(out.adjustments.find(p=>p.conceptId===spec.conceptId&&p.placementId===spec.placementId)),placement=request.input.artInput.placements.find(p=>p.id===spec.placementId);
   // Blocked units keep their ordinary copy/dependency recovery; no final layout is used.
   if(spec.status==='ready'&&qualityVersion>=7){const L=require('./composed-logo');patch.overlayLayout=L.normalize(patch.overlayLayout,require('./layout-text-metrics').canvasFor(request,placement),logoMetrics,qualityVersion>=12?null:L.readingFor(request,placement));}
   if(spec.status==='ready'&&fonts&&qualityVersion>=14)patch.overlayLayout=require('./layout-text-metrics').fitPreferred(patch.overlayLayout,spec,{fonts,canvas:require('./layout-text-metrics').canvasFor(request,placement)});
   if(spec.status==='ready')validate(patch.overlayLayout,spec,assets,require('./placement-logo-policy').required({},placement),fonts?{fonts,visualJudgment:qualityVersion>=13,framingTolerance:qualityVersion>=8,canvas:require('./layout-text-metrics').canvasFor(request,placement)}:undefined);
   if(spec.status==='ready'&&readableTargets.length)require('./composed-quality').validatePlanning(patch.overlayLayout,spec.placementId,readableTargets);
   if(spec.status==='ready'&&qualityVersion>=6)require('./composed-readability').planning(patch.overlayLayout,require('./layout-text-metrics').canvasFor(request,placement),assets.fonts,{visualJudgment:qualityVersion>=13,framingTolerance:qualityVersion>=8});
   onPlan(spec,patch.overlayLayout);
  }
  return result;
 }};
 if(qualityVersion>=7)wire.input.overlayLogoMetrics={policy:qualityVersion>=12?{version:2,minimumSizeEnforced:false}:require('./composed-logo').policy,assets:logoMetrics||[]};
 if(fonts)wire.input.overlayTypography=require('./layout-text-metrics').guidance(request,fonts);
 return {...request,wire};
}
function documentFor(record,assets,photoUrl,saved,{experiment=false}={}){
 if(saved.version!==1||saved.brandId!==assets.brandId||saved.artHash!==fingerprint(record.artDirection))throw Error('Final overlay belongs to different wording, art or placement; reconcile this unit again');
 const plan=saved.layout,required=require('./placement-logo-policy').required({},record.placementContext?.selection||{});
 validate(plan,record.artDirection,assets,required,saved.framingToleranceVersion===1?{framingTolerance:true,visualJudgment:saved.visualJudgmentVersion===1}:undefined);
 const {width:w,height:h}=record.canvas;
 const pixel=b=>({left:b.x*w,top:b.y*h,width:b.width*w,height:b.height*h});
 const objects=[{id:'photograph',role:'photograph',type:'image',assetId:'photograph',left:0,top:0,width:w,height:h,locked:true}];
 const logos=assets.logos||[assets.logo].filter(Boolean),logo=plan.logo&&logos.find(l=>l.id===plan.logo.assetId);
 if(logo)objects.push({id:'official-logo',role:'logo',type:'image',assetId:logo.id,...pixel(plan.logo),reason:plan.logo.reason});
 for(const [i,f] of record.exactCopy.fields.filter(f=>f.delivery==='embedded').entries()){
  const b=plan.text.find(b=>b.fieldId===f.id),bound=record.artDirection.text.find(t=>t.fieldId===f.id);
  if(!b||!bound||bound.exactText!==f.text)throw Error('Exact wording changed after reconciliation');
  const isButton=b.buttonBackground!==null;if(isButton&&b.role!=='cta')throw Error('Only an existing CTA may use button treatment');
  objects.push({id:'copy-'+i,fieldId:f.id,role:b.role,type:isButton?'cta':'text',...(isButton?{background:b.buttonBackground,padding:b.buttonPadding*w}:{}),text:f.text,...pixel(b),fontId:b.fontId,fontSize:b.fontSize*w,fill:b.colour,align:b.align,lineHeight:b.lineHeight,charSpacing:0,locked:false,reason:b.reason});
 }
 return {schemaVersion:1,engine:'fabric-6',brandId:assets.brandId,canvas:structuredClone(record.canvas),layoutPolicyVersion:2,layoutIntent:{version:1,artHash:saved.artHash,strategy:require('./focused-context').strategy(record.upstreamContext?.strategy)||null,composition:record.artDirection.composition||null,hierarchy:record.artDirection.hierarchy||null,typography:record.artDirection.typography||null,layout:structuredClone(plan)},safeMargin:plan.safeMargin*Math.min(w,h),safeMarginSource:'Final art reconciliation; pinned placement rules remain authoritative.',layoutSource:experiment?'Isolated text-layer experiment: final field-bound layout from the existing reconciliation call.':'Final field-bound composition from the existing art reconciliation.',...(!experiment?{compositionPolicy:{version:1,...(saved.initialTypePolicyVersion===2?{initialTypePolicyVersion:2}:{}),...(saved.visualJudgmentVersion===1?{visualJudgmentVersion:1}:{}),...(saved.framingToleranceVersion===1?{framingToleranceVersion:1}:{}),productRequired:(record.artDirection.product?.assetIds||[]).length>0,reading:require('./readability').pinnedPolicy(record.placementContext?.context?.placements?.[0]?.rules||[])||null}}:{}),protectedRegions:plan.protectedRegions.map(r=>({id:r.id,kind:r.kind,...pixel(r),evidence:r.reason})),objects,assets:[{id:'photograph',brandId:assets.brandId,kind:'photograph',url:photoUrl,name:'Generated image without added campaign wording'},...(logo?[logo]:[])],fonts:assets.fonts};
}
function placementWarnings(doc,record,measurements=[]){
 const reading=require('./readability').pinnedPolicy(record.placementContext?.context?.placements?.[0]?.rules||[]),warnings=[];
 if(reading?.width&&reading.total!==0)for(const o of doc.objects.filter(o=>['text','cta'].includes(o.type))){
  const target=o.role==='headline'?reading.headlineCssPx:reading.bodyCssPx,displayed=o.fontSize*(o.scaleY||1)*reading.width/doc.canvas.width;
  if(Number.isFinite(target)&&displayed+.01<target)warnings.push(o.fieldId+': '+displayed.toFixed(1)+'px type at '+reading.width+'px viewing width; below the pinned '+target+'px editorial starting target. Inspect actual legibility.');
 }
 const explicit=require('./layout-review').contract(record);
 if(explicit?.status==='explicit')for(const b of measurements.filter(b=>b.role!=='photograph')){const a=explicit.bounds;if(b.left<a.left||b.top<a.top||b.left+b.width>a.right||b.top+b.height>a.bottom)warnings.push(b.id+': measured bounds exceed the explicit brief safe area.');}
 return warnings;
}
function reviewRequest(request,record){
 const imageOnly=Array.isArray(request.input?.layers)&&request.input.layers.length===0;
 const imageOnlyGuidance=imageOnly?'\nNo editable overlay layers exist. The subject-occlusion checks only editable overlay layers covering observed subjects: report pass as not applicable, with empty overlaps and unresolvedOverlapIds. Natural person-on-sofa contact or obstruction within the photograph is not an editable-layer overlap. Assess any actual photographic obstruction, cropping, anatomy or SKU mismatch under the photograph check and retain all defects or uncertainty there. Absence of overlays does not establish a photograph pass. Return no corrections.':'';
 return {...request,instructions:request.instructions+'\nSUBJECT-OCCLUSION SCOPE: This check concerns only editable overlay layers covering observed subjects. Natural obstruction by furniture, props or people within the photograph is not a text-layer overlap. Assess actual photographic obstruction under photograph using the supplied photographic tolerance policy; retain material defects or uncertainty there. A failed subject-occlusion check must name the editable layer and observed region with visible overlap evidence. If no overlay obscures a subject, pass this check with empty overlaps; this does not establish a photograph pass.'+imageOnlyGuidance+'\nUse the supplied placement viewing context and reading guidance, not a universal phone preview. Check the final field-specific hierarchy against the same strategy and art plan. Preserve the saved layout intent: reading order, grouping, alignment, and quiet-space purpose. Corrections must explain why a move supports that intent; do not replace it with a generic template. Respect each field’s saved minimum font size and minimum contrast ratio during corrections. '+(request.input?.reviewChecksVersion===2?'Copy-fit and maximum-line checks are disabled; do not reject or correct solely for these. Logo readability/size checks are disabled. Follow the supplied approved-logo overlay policy for identity checks. ':'Respect maximum lines during corrections. ')+ ' Planned safe areas and boxes are intentions, never proof that the pixels comply.',input:{...request.input,placementContext:record.placementContext,readingGuidance:require('./readability').pinnedGuidance(record),strategy:require('./focused-context').strategy(record.upstreamContext?.strategy),finalArtDirection:{imageTreatment:record.artDirection.imageTreatment,scene:record.artDirection.scene,composition:record.artDirection.composition,typography:record.artDirection.typography,hierarchy:record.artDirection.hierarchy,text:record.artDirection.text,safeAreas:record.artDirection.safeAreas,crop:record.artDirection.crop,viewingSize:record.artDirection.viewingSize}}};
}
async function pinBackground(runtime,id,key,request){
 const file='composition-background-'+key+'.json';
 const contract={version:1,requestHash:fingerprint(request),requestKey:request.requestKey};
 try{const saved=await fs.readJson(path.join(runtime.store.dir(id),file));if(saved.requestHash!==contract.requestHash)throw Error('The visual plan changed after image dispatch. Saved artwork is preserved; start a new version rather than reusing the old background.');return saved;}
 catch(e){if(e.code!=='ENOENT')throw e;}
 await runtime.store.save(id,file,contract);return contract;
}
// Stage ownership stays in the existing calls; no extra strategy or layout agent.
const stageGuidance={
 strategy:'EDITABLE COMPOSITION: In each existing format implication, choose the visual priority, buying question or communication purpose, reading order, and intended viewing context. Decide what the image explains versus what exact words must explain. Use the selected format treatment and scoped brand guidance. PDP is buying clarity, not mandatory emotional appeal; image-only formats need no invented heading or CTA. Specify copy density and quiet-space intent, not coordinates or invented wording. Native publisher text remains outside artwork.',
 concepts:'EDITABLE COMPOSITION: Develop the visual idea and text hierarchy together. Describe subject emphasis, useful negative space, alignment and contrast in visualDirection. Keep each format’s purpose and the selected brand distinct. Do not force a campaign template onto product, technical, retail or image-only assets. Final exact wording and coordinates belong to Copywriter and final Art reconciliation.',
 copy:'EDITABLE COMPOSITION: Exact embedded wording will be rendered as editable text. Preserve required qualifiers and supplied strings; native fields stay native. No instructions in literal wording. Choose only the roles the placement needs, including zero embedded fields for image-only work. Keep the amount of copy appropriate to actual viewing size, without dropping mandatory information. For short landscape canvases, account for the displayed height as well as width: the entire requested set of headline, supporting line and action must share that space with the product and logo. Avoid repeating the headline premise in supporting copy; keep the source-backed feature concise. Do not expand a short feature into a sentence that cannot be set legibly.',
 art:'EDITABLE COMPOSITION: Design the complete composition, not a photograph with text attached afterwards. Plan subject framing, eye path, type hierarchy, grouping, alignment, quiet surfaces and contrast for the actual crop and viewing distance. Preserve technical/product treatments when appropriate. Reserve room for copy requirements but do not invent final words. Specify a preferred and minimum readable font size, maximum wrapped line count, alignment, line height, real background surface and minimum contrast target for each needed text role. Preferred type must fit its allocated box: em height is not line-block height, and multiple lines require additional height. Editorial viewing-size targets are starting points, not a requirement to set every minimum to that target. Use a justified hierarchy for this canvas, and allocate the entire copy group and subject footprint together. A protected region is an envelope for the ENTIRE visible subject, not merely its base or centre. Include heads above a seated sofa, arms, feet and the complete product silhouette. Do not describe a large foreground sofa with seated people while allocating them only a shallow strip at the bottom. If the copy crowds the subjects, revise the scene framing and type hierarchy together; do not preserve oversized editorial defaults by squeezing the photograph. Use a coherent quiet surface behind the whole copy group, with no doors, dark wood, furniture or people intruding. Keep meaningful product scale and natural human proportions. Reserve protected product/person regions outside copy and logo boxes. Final reconciliation binds those decisions and exact field IDs to real font files and coordinates; do not supply a competing role-only editableLayout.',
};
function withGuidance(request){const guidance=stageGuidance[request.contextKind];if(!guidance)return request;return {...request,instructions:(request.instructions||'')+'\n'+guidance,...(request.wire?{wire:{...request.wire,instructions:(request.wire.instructions||request.instructions||'')+'\n'+guidance}}:{})};}
function install(runtime,{experiment=false}={}){
 const installed=experiment?'textLayerExperimentInstalled':'editableCompositionInstalled';
 if(runtime[installed])throw Error('Text-layer '+(experiment?'experiment':'composition')+' already installed');
 runtime[installed]=true;
 const opted=intake=>experiment?intake?.textLayerExperimentVersion===1:intake?.editableTextVersion===1;
 const checkpoint=experiment?experimentNameFor:nameFor;
 const originalReason=runtime.provider.reason.bind(runtime.provider);
 runtime.provider.reason=async(request,budget)=>{
  const context=await budget.brandContext?.();
  if(!opted(context?.intake))return originalReason(request,budget);
  if(!experiment)request=withGuidance(request);
  if(!experiment&&context.intake.briefDirectionReview&&['strategy','concepts','art','reconciliation'].includes(request.contextKind)){const guidance=require('./brief-direction-review').planning;request={...request,instructions:(request.instructions||'')+'\n'+guidance,...(request.wire?{wire:{...request.wire,instructions:(request.wire.instructions||request.instructions||'')+'\n'+guidance}}:{})};}
  if(context.intake.composedTextVersion===1)request={...request,instructions:(request.instructions||'')+'\nCOMPOSED-ARTWORK WORKFLOW: the image model renders a complete composition including final campaign words first. Its text geometry is then measured, frozen, removed with a mask and rebuilt as editable layers. Plan image and typography together. The official logo remains a separate approved asset. No downstream automatic shrink-to-fit will rescue excessive copy.'};
  if(context.intake.composedQualityVersion>=14)request={...request,instructions:(request.instructions||'')+'\nINITIAL TYPOGRAPHY POLICY v2: Meet the actual pinned placement reading sizes without inventing an additional percentage or a universal phone floor. Reconstruction headroom is optional planning guidance, not a minimum. If generated optional copy cannot fit, use the existing bounded copy revision while preserving supplied exact wording and necessary qualifiers. Never shrink frozen measured type. Keep genuine product markings and the reserved official logo area.'};
  else if(context.intake.composedQualityVersion>=1)request={...request,instructions:(request.instructions||'')+'\nInitial composed typography must meet the pinned placement reading size: use at least 15% sizing headroom for font reconstruction. For phone-feed work target at least 18.4 CSS pixels for body and CTA at the pinned viewing width. Allocate room and wrap before generation; never shrink the measured result. Keep the campaign-logo area empty for the approved overlay; retain physical product markings.'};
  if(request.contextKind!=='reconciliation')return originalReason(request,budget);
  const assets=context.intake.canvasAssets,plans=new Map();
  if(!assets||assets.brandId!==context.intake.brandId)throw Error('Editable composition needs pinned same-brand canvas assets');
  const fonts=experiment?undefined:await require('./layout-text-metrics').load(runtime,assets);
  const logoMetrics=context.intake.composedQualityVersion>=7?await require('./composed-logo').load(runtime,assets):undefined;
  const result=await originalReason(makeRequest(request,assets,(spec,plan)=>plans.set(spec.conceptId+'|'+spec.placementId,plan),{experiment,fonts,logoMetrics,qualityVersion:context.intake.composedQualityVersion||0}),budget);
  for(const spec of result.specifications){
   const file=path.join(context.dir,checkpoint(spec)),plan=plans.get(spec.conceptId+'|'+spec.placementId);
   const saved={version:1,brandId:assets.brandId,artHash:fingerprint(spec),...(context.intake.composedQualityVersion>=14?{initialTypePolicyVersion:2}:{}),...(context.intake.composedQualityVersion>=13?{visualJudgmentVersion:1}:{}),...(context.intake.composedQualityVersion>=8?{framingToleranceVersion:1}:{}),layout:plan};
   if(!plan){const prior=await fs.readJson(file);if(prior.artHash!==saved.artHash||prior.brandId!==assets.brandId)throw Error('Cached composition layout is stale');continue;}
   // Same job checkpoint; no mutation of source projects or production defaults.
   const temp=file+'.pending';await fs.writeFile(temp,JSON.stringify(saved));await fs.rename(temp,file);
  }
  return result;
 };
 const standard=runtime.editable,standardGenerate=standard.generate.bind(standard);
 const experimental=new editable.EditableCanvases(runtime,{assessDocument:placementWarnings,reviewOnce:async(r,id,k,doc,initial,record,budget)=>{
  const currentJob=await r.store.read(id),frozen=currentJob.intake.composedTextVersion===1;const scoped=Object.create(r);scoped.provider={reason:(request,b)=>{const reviewed=reviewRequest(request,record);if(frozen)reviewed.instructions+='\nThe text layers are frozen from the completed artwork. Report defects in readability, repair seams, ghost lettering and font approximation as observations; return no automatic corrections. Do not shrink or reposition typography. Explicit user edits remain possible.';if(currentJob.intake.composedQualityVersion>=6)reviewed.instructions+='\nREADABILITY: Inspect lettering at the pinned viewing width, including thin stroke survival, crowded letters and lines, narrow low-contrast patches and busy or uneven surfaces behind each line. Local numeric screening is supporting evidence, not proof of a visual pass. Describe the affected field and visible impediment; do not fail merely because a real background contains harmless texture. Preserve frozen typography; report recomposition needs without corrections.';if(currentJob.intake.composedQualityVersion>=4)reviewed.instructions+='\nFor observed protected regions, use several tight rectangles around actually occupied visible parts where a single silhouette rectangle would include empty background (for example folded mattress base/back, or seated head/torso/legs). Do not label empty corners of a large envelope as occupied subject pixels. Each reported overlap needs visible overlay-on-subject evidence.';if(currentJob.intake.composedQualityVersion>=13)reviewed.instructions+='\n'+require('./visual-judgment').instructions;return r.provider.reason(reviewed,b);}};
  return require('./editable-quality').reviewOnce(scoped,id,k,doc,initial,record,budget);
 },prepareDocument:async(id,record,assets,photoUrl)=>{
  const job=await runtime.store.read(id);if(!opted(job.intake))throw Error('Composition adapter requires a versioned job');
  const saved=await fs.readJson(path.join(runtime.store.dir(id),checkpoint(record)));
  const document=documentFor(record,assets,photoUrl,saved,{experiment});return applyPolicies(document,job.intake,{experiment});
 }});
 // All regular editor operations keep their current implementation and data.
 runtime.editable.generate=async(id,...args)=>opted((await runtime.store.read(id)).intake)?experimental.generate(id,...args):standardGenerate(id,...args);
 return runtime;
}
function applyPolicies(document,intake,{experiment=false}={}){
 if(!document.compositionPolicy)return document;
 if(intake.approvedLogoOverlayVersion===1)document.compositionPolicy.approvedLogoOverlayVersion=1;if(intake.composedQualityVersion>=14)document.compositionPolicy.initialTypePolicyVersion=2;if(!experiment&&intake.productFidelityReview&&document.compositionPolicy.productRequired)document.compositionPolicy.productFidelity=structuredClone(intake.productFidelityReview);if(!experiment&&intake.briefDirectionReview)document.compositionPolicy.briefDirection=structuredClone(intake.briefDirectionReview);if(!experiment&&intake.photographicToleranceVersion===1)document.compositionPolicy.photographicToleranceVersion=1;if(!experiment&&intake.composedQualityVersion>=12)document.compositionPolicy.reviewChecksVersion=2;return document;
}
module.exports={applyPolicies,schema,instructions,makeRequest,validate,documentFor,placementWarnings,reviewRequest,install,nameFor,experimentNameFor,withGuidance,stageGuidance,pinBackground};
