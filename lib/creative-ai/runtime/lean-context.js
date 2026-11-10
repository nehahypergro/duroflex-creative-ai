'use strict';
const {fingerprint}=require('../art-director');
const unique=rows=>[...new Map(rows.map(r=>[r.id,r])).values()];
const compact=rows=>unique((rows||[]).map(({id,text,statement,sourceIds,tier,authority})=>({id,text:text||statement,sourceIds:sourceIds||[],...(tier?{tier}:{}),...(authority?{authority}:{})})).filter(r=>r.text));
function groups(selection){const rows=require('./format-intent').describe(selection),groups=new Map();for(const s of selection){const row=rows.find(r=>r.placementId===s.id);if(!groups.has(row.familyId))groups.set(row.familyId,[]);groups.get(row.familyId).push(s);}return [...groups.values()];}
function textPolicy(s){
 if(s.jobInputs?.formatIntent?.textPolicy)return s.jobInputs.formatIntent.textPolicy;
 const slug=(s.description.formatId||s.description.profileId||s.id||'').replace(/^custom[:_](?:studio-)?/,'');
 // These are media slots with native/live copy outside the raster. Retail
 // artwork and custom marketplace modules still receive format-specific copy.
 return /^(pmax-|push-image|commerce-gallery|rcs-image-|email-(hero|banner)|client-email-|recipe-marketplace-module-amazon-)/.test(slug)||s.description.pdp?.textPolicy==='none'?'none':'adaptive';
}
function needsLogo(intake,selection){return selection.some(s=>textPolicy(s)!=='none'&&(s.jobInputs?.logoPolicy||require('./placement-logo-policy').resolvePolicy(intake,s)).treatment!=='omit');}
function namedFonts(assets,brandId){return (assets?.fonts||[]).filter(f=>f.approved&&f.brandId===brandId&&f.style==='normal'&&(f.family||f.name)).map(f=>({family:f.family||f.name.replace(/ (Regular|Bold|Light|Semibold)( Italic)?$/,''),weight:f.weight||400,use:f.weight>=600?'headings':'supporting copy',sourceReference:f.sourceReference}));}
async function prerequisites(runtime,intake,selection=require('./placements').resolve(intake).selections){
 const brand=await runtime.brands.read(intake.brandId);
 if(brand.id!==intake.brandId)throw Error('Brand identity belongs to another workspace');
 const assets=brand.canvasAssets||{},fonts=namedFonts(assets,brand.id);
 if(!fonts.length&&selection.some(s=>textPolicy(s)!=='none'))throw Error('Named approved brand fonts are required before planning');
 // Raster generation names fonts; it does not render local font binaries or
 // need every editor logo variant. Only a logo actually used is hash-checked.
 const logo=needsLogo(intake,selection)?await require('./approved-identity').snapshot(runtime,intake):null;
 if(needsLogo(intake,selection)&&!logo)throw Error('Save the approved brand logo before generating');
 return {brandId:brand.id,fonts:(assets.fonts||[]).filter(f=>f.approved&&f.brandId===brand.id&&f.style==='normal'&&(f.family||f.name)).map(({filename,sha256,...f})=>f),...(logo?{logo}:{})};
}
// The protected exact-SKU reference is usually a resized copy of one website photo
// (".../1_abc_600x600.jpg" vs ".../1_abc.jpg"). Identify a photo by the website file it
// came from: file name without size suffix, extension or query. Non-image links -> null.
function referencePhotoKey(url){
 let pathname;try{pathname=new URL(url).pathname;}catch{return null;}
 const file=decodeURIComponent(pathname.split('/').pop()||'').toLowerCase(),match=/^(.+)\.(jpe?g|png|webp|gif|avif)$/.exec(file);
 if(!match)return null;
 return match[1].replace(/@\d+x$/,'').replace(/_(\d+x\d*|x\d+|pico|icon|thumb|small|compact|medium|large|grande|original|master)(_crop_[a-z]+)?$/,'')||null;
}
function photoKey(asset,sources){
 for(const id of asset.sourceIds||[]){const key=referencePhotoKey(sources.find(s=>s.id===id)?.reference);if(key)return key;}
 return null;
}
function packet({job,intake,research,guardian,brand,treatmentKnowledge,technologyImage,creativeReference},selection){
 if(!brand||brand.id!==intake.brandId||research.brandKnowledge?.brandId!==intake.brandId)throw Error('Lean planning requires same-brand research');
 const evidence=research.productBriefEvidence,reference=intake.productReferencePolicy;
 const assets=research.dossier.assets||[];
 const productIds=reference?.referenceAssetIds||evidence?.assetIds||[];
 if(reference?.sourceAssetId&&!assets.some(a=>a.id===reference.sourceAssetId&&a.imageData))throw Error('Selected primary SKU photograph is unavailable');
 const ordered=[reference?.sourceAssetId,...productIds].filter(Boolean);
 let candidates=[...new Set(ordered)].map(id=>assets.find(a=>a.id===id&&a.imageData)).filter(Boolean);
 // Jobs pinned with leanReferenceVersion 1 skip a photo whose website file was already
 // chosen, so the protected reference and its twin are not both sent (8 Nov 2026).
 if(job.runtimeConfig?.leanReferenceVersion===1){const seen=new Set(),sources=research.dossier.sources||[];candidates=candidates.filter(a=>{const key=photoKey(a,sources);if(!key)return true;if(seen.has(key))return false;seen.add(key);return true;});}
 const productRefs=candidates.slice(0,3);
 if(intake.productPageUrl&&!productRefs.length)throw Error('Selected SKU photographs are unavailable');
 const sourceVariant=reference?.variant||job.productProtection?.variant||evidence?.selectedVariantProvenance;
 if(intake.productVariantId&&String(sourceVariant?.id||sourceVariant?.variantId)!==String(intake.productVariantId))throw Error('Selected variant is not bound to the product evidence');
 const factIds=new Set((evidence?.evidence||[]).map(e=>e.factId));
 const facts=(research.facts||[]).filter(f=>f.status==='supported'&&(factIds.has(f.id)||f.id==='sku-selected-variant'||!evidence&&f.kind==='brand')).map(({id,text,sourceIds})=>({id,text,sourceIds}));
 if(technologyImage?.pictureFact&&!facts.some(f=>f.id===technologyImage.pictureFact.id))facts.push(structuredClone(technologyImage.pictureFact));
 const fonts=namedFonts(intake.canvasAssets||brand.canvasAssets,brand.id);
 if(!fonts.length&&selection.some(s=>textPolicy(s)!=='none'))throw Error('Named approved brand fonts are required before planning');
 const placements=treatmentKnowledge?.placements.filter(p=>selection.some(s=>s.id===p.placementId))||[];
 const selectedPacks=treatmentKnowledge?.packs.filter(p=>placements.some(s=>s.treatmentIds.includes(p.id)))||[];
 const rules=unique([...placements.flatMap(p=>p.rules),...selectedPacks.flatMap(p=>p.rules)]);
 const rulePlacements=Object.fromEntries(rules.map(r=>[r.id,placements.filter(p=>p.rules.some(x=>x.id===r.id)).map(p=>p.placementId)]));
 const logoPages=selection.map(s=>{const logo=s.jobInputs?.logoPolicy||require('./placement-logo-policy').resolvePolicy(intake,s);if(textPolicy(s)==='none')return {id:s.id,logo:{...logo,treatment:'omit'},rule:{id:'placement-logo-'+s.id,text:s.id+': No added campaign text or logo. Preserve physical product markings.'}};return {id:s.id,logo,rule:{id:'placement-logo-'+s.id,text:s.id+': '+require('./placement-logo-policy').guidance({}, {jobInputs:{logoPolicy:logo}})}};});
 const logo=assets.find(a=>a.id===intake.approvedLogoReference?.assetId&&a.imageData);
 if(logoPages.some(p=>p.logo.treatment!=='omit')&&!logo)throw Error('This format requires the selected brand’s approved logo');
 const memory=require('./preference-memory').relevant(job.preferenceMemory,{input:{placements:selection}});
 const clarification=require('./strategy-clarification').applyCampaign({assignment:{brief:'',goal:''},facts:research.facts||[],guardian:{...guardian,requirements:guardian.requirements||[],establishedPositioningFactIds:guardian.establishedPositioningFactIds||[]},additionalSources:[]},intake,job.strategyClarification);
 const mandatory=compact(clarification.guardian.requirements.filter(r=>!r.id.startsWith('current-campaign-brief')&&r.id!=='req-claim-substantiation'&&r.id!=='current-source-acceptance'));
 mandatory.push({id:'current-source-acceptance',text:'The client accepts explicit statements from the exact official SKU page and original technical artwork as source evidence. Preserve scope, numbers, conditions and qualifiers. Do not invent or strengthen claims.',sourceIds:['user:source-acceptance']});
 const duplicateVisual=new Set(['vr-product-immutable-appearance','vr-imagery-no-artificial-fades','vr-other-source-authority']);
 const advice=compact([...(guardian.preferences||[]),...(guardian.visualRules||[]).filter(r=>!duplicateVisual.has(r.id)).map(r=>({...r,text:r.value})),...(job.brandStyleMemory?.observations||[]).map((r,i)=>({...r,id:r.id||'brand-observation-'+i}))]);
 const input={version:1,mainWorkflowVersion:1,spatialPlanningVersion:1,assignment:require('./campaign-input').canonical(intake).content,
  product:{id:evidence?.productProfileId||'brand-focus',name:intake.productName||evidence?.productName||brand.name,variant:sourceVariant?{...sourceVariant,id:String(sourceVariant.id||sourceVariant.variantId),name:sourceVariant.name||sourceVariant.label||facts.find(f=>f.id==='sku-selected-variant')?.text||'',options:sourceVariant.options||[]}:null,
   appearance:reference?require('./reference-product').technicalInstructions(reference):intake.productPageUrl?'Use only the attached official selected-product photos. Preserve silhouette, construction, pattern, colour family and genuine markings. Product-family photos establish appearance, not measured variant dimensions.':'Brand-led communication; do not invent an exact product likeness.',facts,referenceCount:productRefs.length},
  brand:{brandId:brand.id,name:brand.name,fonts,mandatory,preferences:compact(memory?.preferences||[]),advice,positioning:(research.facts||[]).filter(f=>f.status==='supported'&&(guardian.establishedPositioningFactIds||[]).includes(f.id)).map(({id,text,sourceIds})=>({id,text,sourceIds})),unknowns:guardian.unknowns||[]},
  requirements:{version:1,pages:logoPages},
  format:{id:selection[0].description.formatId||selection[0].id,name:selection[0].description.formatName||selection[0].description.name,text:selection.every(s=>textPolicy(s)==='none')?'none':'adaptive',
   structure:require('./format-intent').guidance(selection)+(selection[0].description.print?'\n'+selection.map(s=>require('./print-production').guidance({...s.description,pages:s.description.printSet.count},s.description.print,s.description.printSet.index)).join('\n'):''),pages:selection.map(s=>({id:s.id,name:s.description.printSet?.label||s.description.name,size:s.description.dimensions.width+'x'+s.description.dimensions.height,text:textPolicy(s),inputs:s.jobInputs,print:s.description.print,structure:s.description.print?require('./print-production').guidance({...s.description,pages:s.description.printSet.count},s.description.print,s.description.printSet.index):null,sequence:s.description.printSet||s.description.carousel||s.description.pdp||s.description.assetSet})),
   guidance:{rulePlacements,mandatory:compact(rules.filter(r=>['mandatory','contract'].includes(r.tier)&&!r.id.endsWith('-client-logo-policy'))).concat(logoPages.map(p=>p.rule)),advice:compact(rules.filter(r=>!['mandatory','contract'].includes(r.tier))),limits:treatmentKnowledge?.limits,unknowns:placements.flatMap(p=>p.profile?.unknowns||[]),sourceConflicts:placements.flatMap(p=>p.sourceConflicts||[])},
   print:selection[0].description.print||null},
  sourceAuthority:{rule:'Use the current user brief, approved identity and supported exact-product facts. Draft guidance is advisory; preserve qualifiers and unresolved conflicts.',sources:[...research.dossier.sources,...clarification.additionalSources].filter(s=>[...facts,...mandatory].some(f=>f.sourceIds?.includes(s.id))).map(({id,kind,reference,status})=>({id,kind,reference,status}))}};
 if(job.runtimeConfig?.leanPlanningContractVersion===2){
  // Pinned for new jobs only: saved packets and paid request identities stay stable.
  input.planningContractVersion=2;
  delete input.assignment.conceptRoutes;
  input.renderingContract='Produce ONE shared plan. format.pages is the exact list of requested artwork pages, each exactly once with its unchanged ID. The runtime renders the same plan with two image models. Two options in the brief means two renderings, not extra pages, alternate concepts or option-suffixed page IDs.';
  input.format.guidance.advice=input.format.guidance.advice.filter(r=>r.id!=='editable-text-design-handoff');
  input.format.guidance.mandatory=input.format.guidance.mandatory.map(r=>r.id==='scope-and-delivery'?{...r,text:'Plan each requested page once. The runtime renders two complete model options from this shared plan. Preserve every face or slide. Produce complete raster artwork; no downstream editable reconstruction or publishing is implied.'}:r.id==='brief-first'?{...r,text:'Use the selected brand and exact SKU/variant only. Official exact-SKU statements and technical artwork are client-approved source evidence; preserve visible structure, issuer, scope, dates and qualifiers without inventing hidden construction or stronger claims. Reference-led rendering may change viewpoint, lighting and scene; do not promise unchanged source pixels or a separate compositing step. If the user explicitly requires unchanged source artwork, retain that limitation rather than silently reinterpreting it. Commercial offers come only from the current brief. Do not add a campaign master deliverable or demand repeated independent source approval.'}:r);
  delete input.format.guidance.rulePlacements['editable-text-design-handoff'];
 }
 // Objective playbook v1 (8 Nov 2026), pinned for new jobs only: one planning-only rule per
 // objective adapted to this group's formats. These jobs also state their real option count,
 // since the sunburst option was retired (earlier pins keep their saved wording).
 if(job.runtimeConfig?.objectivePlaybookVersion>=1){
  const count=require('./lean-policy').jobOptions(job).length;
  if(count===1&&input.renderingContract){
   input.renderingContract=input.renderingContract.replace('The runtime renders the same plan with two image models. Two options in the brief means two renderings, not extra pages, alternate concepts or option-suffixed page IDs.','The runtime renders this plan once per page with one image model. Do not add extra pages, alternate concepts or option-suffixed page IDs.');
   input.format.guidance.mandatory=input.format.guidance.mandatory.map(r=>r.id==='scope-and-delivery'?{...r,text:r.text.replace('The runtime renders two complete model options from this shared plan.','The runtime renders one complete design per page from this plan.')}:r);
  }
  const playbook=require('../lean/objective-playbook').rule(intake,selection,job.submittedBrief?.objective,job.runtimeConfig.objectivePlaybookVersion);
  if(playbook){const {id,tier,text,sourceIds}=playbook;input.format.guidance.mandatory.push({id,text,sourceIds,tier});input.format.guidance.rulePlacements[id]=selection.map(s=>s.id);input.objectivePlaybook={version:playbook.version,objective:playbook.objective,formatClasses:playbook.formatClasses};}
 }
 // Amazon A+ v1 (9 Nov 2026), pinned for new jobs only: ONE plan for every module and size of the
 // page, per-page text rules, the SKU technology evidence and Amazon text fields (runtime/aplus.js).
 const aplusSection=require('./aplus').packetSection({job,intake,selection,facts,technologyImage:technologyImage||null});
 if(aplusSection){
  input.aplus=aplusSection.aplus;input.format.guidance.mandatory.push(aplusSection.rule);input.format.guidance.rulePlacements[aplusSection.rule.id]=selection.map(s=>s.id);
  input.format.pages=input.format.pages.map((p,i,all)=>({...p,structure:require('./aplus').pageStructure(input.aplus,p,i,all.length)}));
 }
 // Google Display banners v1 (9 Nov 2026), pinned for new jobs only: ONE message for every size, per-size
 // text budgets and band/strip layouts (planning only), plus the Google image-ad policy as a checked
 // requirement and a per-size execution line with the kept band (runtime/display-banners.js).
 const bannerSection=aplusSection?null:require('./display-banners').packetSection({job,intake,selection});
 if(bannerSection){
  input.displayBanners=bannerSection.displayBanners;input.format.structure+='\n'+bannerSection.plan;
  input.format.guidance.mandatory.push(bannerSection.rule);input.format.guidance.rulePlacements[bannerSection.rule.id]=selection.map(s=>s.id);
  input.format.pages=input.format.pages.map(p=>({...p,structure:require('./display-banners').pageStructure(input.displayBanners,p)}));
 }
 // Technology visual v1 (9 Nov 2026), pinned for new lean jobs: every other format follows the same
 // shared technology rule (runtime/technology-visual.js). An A+ page carries it in its technology module.
 const technologySection=aplusSection?null:require('./technology-visual').packetSection({job,intake,selection,facts,technologyImage:technologyImage||null,textPolicy});
 if(technologySection){input.technologyVisual=technologySection.technologyVisual;input.format.guidance.mandatory.push(technologySection.rule);input.format.guidance.rulePlacements[technologySection.rule.id]=selection.map(s=>s.id);}
 // Creative reference v1 (10 Nov 2026): the chosen aspects of the user's reference, in words only.
 if(creativeReference){const r=require('./creative-reference').section(creativeReference.reading,creativeReference.ref,{brandName:brand.name});input.creativeReference=r.creativeReference;input.format.guidance.mandatory.push(r.rule);input.format.guidance.rulePlacements[r.rule.id]=selection.map(s=>s.id);}
 // Plan rules v1 (10 Nov 2026), pinned for new jobs only (lean/plan-rules.js).
 if(job.runtimeConfig?.planRulesVersion===1){const r=require('../lean/plan-rules').section(input,selection);input.planRules=r.planRules;input.format.guidance.mandatory.push(r.rule);input.format.guidance.rulePlacements[r.rule.id]=selection.map(s=>s.id);}
 // Review checklist v1 (10 Nov 2026), pinned for new jobs only (lean/checklist.js): set rules and text size.
 if(job.runtimeConfig?.reviewChecklistVersion===1){const r=require('../lean/checklist').section(input,selection);input.checklist=r.checklist;input.format.guidance.mandatory.push(r.rule);input.format.guidance.rulePlacements[r.rule.id]=selection.map(s=>s.id);}
 // No whole research passages, raw PDFs, base64, or prior-stage inputs in this packet.
 const refs=productRefs.map(a=>({assetId:a.id,roles:['product'],imageData:a.imageData}));
 const techSource=aplusSection?.technologyRef||technologySection?.technologyRef,technologyRef=techSource?{assetId:techSource.assetId,roles:['technology'],imageData:techSource.imageData}:null;
 return {input,productRefs:refs,logo:logo?{assetId:logo.id,roles:['logo'],imageData:logo.imageData}:null,...(technologyRef?{technologyRef}:{}),binding:fingerprint({input,refs:refs.map(r=>[r.assetId,fingerprint(r.imageData)]),logo:logo?fingerprint(logo.imageData):null,...(technologyRef?{technology:fingerprint(technologyRef.imageData)}:{})})};
}
module.exports={groups,packet,textPolicy,needsLogo,prerequisites,referencePhotoKey};
