'use strict';
const path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const fs=require('../runtime/artifact-fs');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const profileId=slot=>'custom:raw-planned-'+slot.key;
const placementId=slot=>profileId(slot).replace(/[^a-zA-Z0-9_-]/g,'_');
const previewWorkflow='CURRENT OUTPUT WORKFLOW: an original model-rendered raster concept for visual evaluation. The placement text policy and logo treatment determine whether campaign lettering and an added logo belong in the image. Image-only placements contain neither; preserve genuine physical product markings. For placements permitting campaign text and a logo, render them directly in the raster. There are no editable text layers, font-file loading, reconstruction or final print export in this experiment. Select typography using applicable written brand guidance; do not claim exact font reproduction or font licensing. Earlier editable-font-file requirements apply only to editable production, which is outside this request. Print dimensions describe proportions and panel/safety composition only; this preview does not promise production PPI or physical print approval. Those checks belong to a later production handoff, not this raster-concept dispatch.';
function printLayout(print){if(!print)return null;const {requiredPpi,proofPpi,...layout}=print;return layout;}
function familyBrief(slots){
 const groups=new Map();
 for(const s of slots){const text=s.direction+(s.copy?'\nCurrent exact copy: '+JSON.stringify(s.copy):'');groups.set(text,[...(groups.get(text)||[]),s.label]);}
 return [...groups].map(([text,labels])=>labels.join(', ')+': '+text);
}
function intakeFor(source,batch,slots){
 if(!slots.length||slots.some(s=>s.group!==slots[0].group))throw Error('Plan one asset family at a time');
 const saved=source.job.intake,canonical=require('../runtime/campaign-input').canonical(saved).content;
 const intake={...canonical,researchId:saved.researchId,campaignClarification:saved.campaignClarification,strategyReasoningEffort:saved.strategyReasoningEffort||'medium',
  requestKey:batch.id+'-family-'+slots[0].group,campaignName:slots[0].groupLabel+' · planned raw experiment',costPurpose:'Testing',
  conceptRoutes:['continuity'],editableCanvas:false,rawArtworkExperimentVersion:2,rawArtworkBatchId:batch.id,rawArtworkSource:{id:source.job.id,...batch.source},clientVisibility:'internal',
  placementIds:slots.map(profileId),customProfiles:[],jobInputs:{},logoTreatmentByPlacement:{},selectedReferenceIds:[]};
 // Prior host-specific actions must not remain authoritative structured fields:
 // a website visit is not automatically the action for a new in-store flyer.
 // Keep the original wording as attributed context, never silently discard it.
 intake.brief=['CURRENT ASSET BRIEF: '+slots[0].groupLabel+'. Plan this requested asset from its own purpose. Current directions and page-specific exact copy take precedence over the earlier asset execution. Preserve source product facts, audience, objective, qualifiers and explicitly required literal wording unless the current request replaces it.',previewWorkflow,
  ...familyBrief(slots),
  'EARLIER CAMPAIGN CONTEXT (not a template for the new format): '+canonical.brief,
  canonical.desiredAction?'Earlier action, applicable only if compatible with the current asset brief: '+canonical.desiredAction:null,
  canonical.landingPageUrl?'Available earlier destination, not a mandatory CTA for this asset: '+canonical.landingPageUrl:null
 ].filter(Boolean).join('\n\n');
 // The public intake brief is bounded. Full current wording is already retained
 // in each placement below; large family/source briefs belong there as well,
 // rather than truncating user requirements or repeating them for every page.
 const overflowBrief=intake.brief.length>5000;
 if(overflowBrief)intake.brief='CURRENT ASSET BRIEF: '+slots[0].groupLabel+'. Plan this asset from its own purpose. Full current directions, exact copy and attributed earlier context are supplied in each placement specification. Current directions override earlier host-specific execution; preserve exact SKU, supplied wording and qualifiers.\n\n'+previewWorkflow;
 delete intake.desiredAction;delete intake.landingPageUrl;
 // The original supplied brief remains source evidence. Do not carry generated
 // headlines, previous art direction, type guides, canvas assets or checkpoints.
 for(const slot of slots){
  const id=profileId(slot),intent={familyId:slot.group,relationship:slots.length>1?'coordinated-set':'independent',page:slot.page||1,pages:slots.length,direction:slot.direction,textPolicy:slot.text,exactCopy:slot.copy||null};
  const context=['NEW OUTPUT SCOPE: '+slot.groupLabel+' / '+slot.label+'. The source brief describes the earlier asset: replace its format, dimensions, field inventory and host-specific CTA/logo execution with this requested placement. Retain its underlying objective, audience, exact product, factual qualifiers and explicitly required wording unless the current asset brief replaces it. Do not lock previously generated headlines or reuse the earlier artwork’s room, palette or layout.',
   previewWorkflow,require('../runtime/format-intent').purpose(slot.groupLabel),slot.direction,
   overflowBrief?'EARLIER CAMPAIGN CONTEXT (not a template for the new format): '+canonical.brief+'\nEarlier optional action: '+(canonical.desiredAction||'none')+'\nEarlier optional destination: '+(canonical.landingPageUrl||'none'):null,
   slot.text==='none'?'IMAGE ONLY: zero embedded campaign text, CTA or added logo. Preserve physical product markings. Native accompanying copy is outside this raster experiment.':'Write fresh placement-specific copy from supported product facts. Use only the current explicit exact-copy requirement when supplied: '+JSON.stringify(slot.copy||null),
   slot.print?'Flat print concept layout: '+JSON.stringify(printLayout(slot.print))+'. Respect panels and keepouts; no photographed signage, folded mockup, drawn fold/cut guides, mounting hardware or shadows outside the artwork. No print-production certification.':'Original raster artwork; no device, webpage or installed-ad mockup.'
  ].filter(Boolean).join('\n');
  intent.direction=context;
  intake.customProfiles.push({id,name:slot.groupLabel+' · '+slot.label,platform:slot.groupLabel,publisher:'studio',placement:'image',assetType:'static',canvas:{width:slot.width,height:slot.height,unit:'px'},exportContract:{formats:['png']},displayContext:context});
  intake.jobInputs[id]={formatIntent:intent};
  intake.logoTreatmentByPlacement[id]=slot.text==='none'?'omit':'include';
 }
 return intake;
}
async function generate(runtime,id,record,budget){
 const job=await runtime.store.read(id);
 if(job.intake.rawArtworkExperimentVersion!==2&&!require('../runtime/original-delivery').enabled(job.intake))throw Error('Planned raw generation requires its pinned experiment version');
 if(record.assignmentId!==id)throw Error('A validated same-job generation package is required');
 if(record.status!=='request-ready'||!record.dispatchAllowed)throw Error('Planning has unresolved requirements: '+(record.dependencies?.map(d=>d.reason).filter(Boolean).join('; ')||'generation package is not ready for dispatch'));
 if(record.protectedProduct)throw Error('Pixel-locked product compositing is incompatible with unchanged raw artwork; use a reference-led source');
 const selection=job.selection.find(s=>s.id===record.placementId);
 if(!selection)throw Error('Raw output is outside this project');
 if(selection.jobInputs?.formatIntent?.textPolicy==='none'&&record.exactCopy.fields.some(f=>f.delivery==='embedded'))throw Error('Image-only placement contains campaign copy');
 const key=require('../runtime/editable').key(record.route,record.placementId),metaName='raw-artwork-'+key+'.json';
 const prior=job.results.find(r=>r.route===record.route&&r.placementId===record.placementId);
 if(prior){const meta=await fs.readJson(path.join(runtime.store.dir(id),metaName)),bytes=await fs.readFile(path.join(runtime.store.dir(id),meta.filename));if(meta.packageHash!==record.packageHash||meta.sha256!==hash(bytes))throw Error('Saved raw artwork binding changed');return prior;}
 const scope={conceptId:record.conceptId,route:record.route,placementId:record.placementId},taskId='raw-generation-'+key;
 await runtime.beginTask(id,'start-'+taskId,{scope,agent:'graphic-designer',description:'Generating planned original artwork',outcome:'Shared planning is complete; the original model image will be saved without review or reconstruction.',details:{taskId,taskKind:'generation'}});
 try{
 const request={prompt:record.prompt,attachments:await require('../runtime/product-review-images').generationReferences(record,{primaryFirst:true}),quality:'high',scope,size:require('../runtime/placements').generationSize(record.canvas.width,record.canvas.height).size,requestKey:hash(id+'|planned-raw-v1|'+record.packageHash)};
 await runtime.store.save(id,'raw-artwork-request-'+key+'.json',request);
 await require('../runtime/planning-prompt-budget').inspectRequest(runtime,id,key,request,budget,'raw-dispatch');
 const output=await runtime.provider.generate(request,budget),bytes=Buffer.from(output.imageData.split(',')[1],'base64'),meta=await sharp(bytes).metadata();
 const extension={png:'png',jpeg:'jpg',webp:'webp'}[meta.format];if(!extension)throw Error('Unsupported raw image format');
 const filename='static-raw-artwork-'+key+'.'+extension,sha256=hash(bytes);
 const ref=await runtime.artifact(id,filename,'image',bytes,scope);
 const result={...scope,imageUrl:'/creative-ai/api/jobs/'+id+'/files/'+filename,width:meta.width,height:meta.height,sha256,ready:false,qualityVerified:false,editable:false,status:job.intake.originalArtworkVersion===1?'available':'unreviewed',originalArtwork:job.intake.originalArtworkVersion===1,...(job.intake.originalArtworkVersion===1?{}:{userNote:'Original artwork from shared planning; automated reviews and reconstruction skipped.'})};
 await runtime.store.save(id,metaName,{version:1,filename,packageHash:record.packageHash,sha256,requestedCanvas:record.canvas,result,review:'skipped',reconstruction:'skipped',resizing:'skipped'});
 await runtime.store.update(id,j=>{j.results=j.results.filter(r=>r.route!==record.route||r.placementId!==record.placementId);j.results.push(result);return j;});
 await runtime.finishTask(id,'complete-'+taskId,{scope,agent:'graphic-designer',artifactRefs:[ref],description:'Original artwork saved',outcome:'Generated, unreviewed. Provider-native bytes retained.',details:{taskId,taskKind:'generation'}});
 return result;
 }catch(e){await runtime.log(id,'task.failed','fail-'+taskId,{scope,agent:'graphic-designer',description:'Original artwork could not be saved',outcome:'Planning and provider checkpoints are preserved; reconcile before retrying.',details:{taskId,taskKind:'generation'}}).catch(()=>{});throw e;}
}
module.exports={intakeFor,profileId,placementId,generate,briefBuilderVersion:2};
