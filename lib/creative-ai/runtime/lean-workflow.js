'use strict';
const fs=require('./artifact-fs'),path=require('node:path'),sharp=require('sharp');
const {fingerprint}=require('../art-director'),policy=require('./lean-policy');
// Main Studio planner, reviewer and corrector (moved out of experiments/ on 8 Nov 2026).
const planning=require('../lean/planning');
const visual=require('../lean/visual-review');
const correction=require('../lean/correction');
const sku=require('../lean/sku-check');
const masked=require('./masked-image');
const hash=masked.hash,uri=bytes=>'data:image/png;base64,'+bytes.toString('base64');
async function read(runtime,id,name){try{return await fs.readJson(path.join(runtime.store.dir(id),name));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function plan(runtime,id,context){
 const {job,intake,budget,phase}=context,units=[],errors=[];
 if(!policy.enabled(intake))throw Error('Lean workflow is not pinned');
 // Catalog check methods decide which placement rules pixels cannot establish.
 const methods=Object.fromEntries((context.treatmentKnowledge?.placements||[]).flatMap(p=>p.rules||[]).filter(r=>r.check?.method).map(r=>[r.id,r.check.method]));
 const existing=await read(runtime,id,'image-queue.json');
 if(existing&&(existing.jobId!==id||existing.brandId!==intake.brandId))throw Error('Saved planning manifest belongs to another project');
 for(const selection of require('./lean-context').groups(job.selection)){
  const key=fingerprint(selection.map(s=>s.id)).slice(0,20);
  try{
   // Completed independent plans are immutable, even when another family needs planning.
   const prior=(existing?.units||[]).filter(u=>selection.some(s=>s.id===u.placementId));
   if(prior.length===selection.length*policy.jobOptions(job).length&&new Set(prior.map(u=>u.route+'|'+u.placementId)).size===prior.length){
    for(const unit of prior){
     if(!/^image-queue-[a-f0-9]{24}\.json$/.test(unit.file))throw Error('Invalid saved planning package path');
     const record=await read(runtime,id,unit.file);
     if(!record||hash(Buffer.from(JSON.stringify(record)))!==unit.hash||record.route!==unit.route||record.placementId!==unit.placementId||record.conceptId!==unit.conceptId)throw Error('Saved planning package changed');
     validateRecord(job,record);
    }
    units.push(...prior);continue;
   }
   // Amazon A+ v1 (9 Nov 2026): the SKU's official technology picture is re-read from the same
   // brand's saved product snapshot and hash-checked; a missing picture never blocks the page.
   const aplus=require('./aplus'),technology=require('./technology-visual'),aplusPage=aplus.enabled(job)&&aplus.isPage(selection),needsPicture=aplusPage&&selection.some(s=>aplus.info(s).role==='technology')||technology.applies(job,intake,selection);let technologyImage=null,technologyImageError=null;
   if(needsPicture&&intake.technologyImage)try{technologyImage=await technology.loadImage(runtime,intake);}catch(e){technologyImageError=e.message;}
   if(technologyImage&&job.runtimeConfig?.planRulesVersion===1){const fact=await technology.readPictureText(runtime,technologyImage);if(fact)technologyImage={...technologyImage,pictureFact:fact};}
   // Creative reference v1 (10 Nov 2026): one reasoning call describes the user's reference picture in words
   // (saved once per job); planning gets only the chosen aspects. The image model never gets the picture.
   let creativeReference=null;
   if(job.runtimeConfig?.creativeReferenceVersion===1&&intake.creativeReference){const cr=require('./creative-reference'),imageData=await cr.load(runtime.root,intake.brandId,intake.creativeReference);
    const reading=await runtime.stage(id,'strategy','marketing-strategist','lean-reference-reading.json',()=>runtime.provider.reason({contextKind:'lean-reference',strictSchema:true,instructions:cr.instructions,input:{use:intake.creativeReference.use},images:[{id:'creative-reference',label:'User reference picture',imageData}],inlineImageInput:true,schema:cr.schema,maxOutputTokens:3000,validate:cr.validateReading},budget));
    creativeReference={reading,ref:intake.creativeReference};}
   const packet=require('./lean-context').packet({...(needsPicture?{...context,technologyImage}:context),...(creativeReference?{creativeReference}:{})},selection);
   const saved=await read(runtime,id,'lean-input-'+key+'.json');
   if(saved&&fingerprint(saved)!==fingerprint(packet.input))throw Error('Saved lean planning context changed; original retained');
   await runtime.store.save(id,'lean-input-'+key+'.json',packet.input);
   // Review checklist v1 (10 Nov 2026): the product fingerprint is read alongside planning (saved once per brand and
   // product photo set). A failed reading never blocks the plan; the job keeps the earlier checks for that product.
   const checklistOn=job.runtimeConfig?.reviewChecklistVersion===1,fingerprintTask=checklistOn?productFingerprint(runtime,id,job,packet,budget).catch(e=>({error:e.message})):null;
   const output=await runtime.stage(id,'strategy','marketing-strategist','lean-plan-'+key+'.json',()=>runtime.provider.reason({contextKind:'lean-planning',callPages:selection.length,strictSchema:true,instructions:planning.instructions+'\n'+require('./format-intent').principle,input:packet.input,images:[...packet.productRefs.map(a=>({id:a.assetId,label:'Exact selected SKU reference; appearance only',imageData:a.imageData})),...(packet.technologyRef?[{id:packet.technologyRef.assetId,label:'Official technology picture from the exact SKU page; evidence for the technology panel only',imageData:packet.technologyRef.imageData}]:[])],schema:planning.schemaFor(packet.input),maxOutputTokens:Math.min(30000,10000+selection.length*2500),validate:o=>planning.validatePlan(o,packet.input)},budget)).catch(async e=>{if(fingerprintTask)await fingerprintTask;throw e;});
   let productFp=null;if(fingerprintTask){const fp=await fingerprintTask;if(fp&&!fp.error)productFp=fp;else if(fp?.error)await runtime.store.save(id,'lean-product-fingerprint-error.json',{error:fp.error,at:new Date().toISOString()});}
   planning.validatePlan(output,packet.input);
   const checklist=require('../lean/checklist');
   // A+ v1: banned or unsupplied wording is removed deterministically (recorded), never sent to images.
   const cleaned=packet.input.aplus?aplus.clean(output,packet.input):packet.input.displayBanners?require('./display-banners').clean(output,packet.input):{plan:output,removed:[]},finalPlan=cleaned.plan;
   // Validate EVERY page before admitting any image from this set.
   const records=[];
   for(const page of finalPlan.pages){const s=selection.find(s=>s.id===page.id),logo=packet.input.requirements.pages.find(p=>p.id===page.id).logo;
    const technologyAttachment=packet.technologyRef&&technology.pageGetsImage(packet.input,page)?[packet.technologyRef]:[];
    const prompt=planning.imagePrompt(finalPlan,packet.input,page)+(productFp?checklist.promptLine(productFp):''),attachments=[...packet.productRefs,...(logo.treatment==='omit'?[]:[packet.logo]),...technologyAttachment];
    // skuCheckVersion 1 (9 Nov 2026): bind up to three distinct exact-SKU angles (+logo) for the stricter check.
    const skuCheck=job.runtimeConfig?.skuCheckVersion===1?sku.plan(attachments):null;
    // labelCheckVersion 1 (9 Nov 2026): locate the genuine label in exact product angle 1 once, here,
    // with the local text reader (no paid call); review crops the saved box deterministically.
    if(skuCheck&&job.runtimeConfig?.labelCheckVersion===sku.LABEL_VERSION)skuCheck.label=await sku.locateLabel(attachments,skuCheck,{ocr:runtime.labelOcr,resolve:v=>require('./reference-storage').hydrate(v,{file:path.join(runtime.store.dir(id),'job.json')})});
    // layoutCheckVersion 1 (9 Nov 2026): planned positions are advisory; only real layout defects block.
    const layoutCheck=job.runtimeConfig?.layoutCheckVersion===visual.LAYOUT_VERSION;
    const realismCheck=job.runtimeConfig?.realismCheckVersion===visual.REALISM_VERSION;
    // reviewCheckVersion 1 (9 Nov 2026): the reply schema lists the exact requirement IDs (visual-review.js).
    const checkIds=job.runtimeConfig?.reviewCheckVersion===visual.CHECK_VERSION;
    for(const option of policy.jobOptions(job)){const labelGen=sku.labelGenerationApplies(job,skuCheck),reviewContract=visual.contract(packet.input,finalPlan,s.id,{conformance:policy.conformanceVersion,methods,...(skuCheck?{skuCheck}:{}),...(realismCheck?{realism:true}:{}),...(layoutCheck?{layoutCheck}:{}),...(checklistOn?{checklist:{fingerprint:productFp}}:{})});const record={leanWorkflowVersion:1,leanConformanceVersion:policy.conformanceVersion,...(skuCheck?{skuCheckVersion:sku.VERSION,skuCheck}:{}),assignmentId:id,brandId:intake.brandId,conceptId:require('../creative-director').conceptIdFor({assignmentId:id},option.route),route:option.route,placementId:s.id,canvas:s.description.dimensions,option,input:packet.input,plan:finalPlan,prompt:labelGen?prompt+sku.labelPromptLine(attachments.length+1,job.runtimeConfig?.planRulesVersion===1?skuCheck.label:null):prompt,...(labelGen?{labelGenerationVersion:sku.LABEL_GENERATION_VERSION}:{}),attachments,reviewContract,notVisuallyVerifiable:visual.notVisuallyVerifiable(packet.input,s.id,methods),reviewInstructions:(skuCheck?visual.skuInstructions:visual.mainInstructions)+(layoutCheck?visual.layoutInstructions:'')+(checklistOn?checklist.instructions:''),...(checklistOn?{reviewChecklistVersion:checklist.VERSION,...(productFp?{productFingerprint:{version:productFp.version,key:productFp.key,features:productFp.features,labelWords:productFp.labelWords,...(productFp.photoBackdrop?{photoBackdrop:productFp.photoBackdrop}:{})}}:{})}:{}),...(layoutCheck?{layoutCheckVersion:visual.LAYOUT_VERSION}:{}),...(realismCheck?{realismCheckVersion:visual.REALISM_VERSION}:{}),...(checkIds?{reviewCheckVersion:visual.CHECK_VERSION}:{}),reviewSchema:checkIds?visual.schemaFor(reviewContract.requirements):visual.schema,contextBinding:packet.binding};record.packageHash=fingerprint(record);records.push(record);}
   }
   for(const record of records)units.push(await require('./stage-handoff').saveUnit(runtime,id,record));
   // Google Display banners v1 (9 Nov 2026): set notes (strip sizes, removed wording) on the job.
   if(packet.input.displayBanners){const banners=require('./display-banners'),b=packet.input.displayBanners,notes=banners.notes(finalPlan,packet.input,cleaned.removed);await runtime.store.save(id,'lean-display-banners-'+key+'.json',{version:banners.VERSION,removed:cleaned.removed,notes});await runtime.store.update(id,j=>{j.displayBanners={version:banners.VERSION,name:b.name,imageCount:b.imageCount,sizes:b.pages.map(p=>({placementId:p.id,width:p.width,height:p.height,name:p.name,mode:p.mode})),removed:cleaned.removed.length,notes};return j;});}
   if(packet.input.aplus){const notes=aplus.notes(finalPlan,packet.input,cleaned.removed);await runtime.store.save(id,'lean-aplus-'+key+'.json',{version:aplus.VERSION,removed:cleaned.removed,notes,technology:packet.input.aplus.technology,...(technologyImageError?{technologyPictureError:technologyImageError}:{})});await runtime.store.update(id,j=>{j.aplus={version:aplus.VERSION,type:packet.input.aplus.type,name:packet.input.aplus.name,imageCount:packet.input.aplus.imageCount,technology:packet.input.aplus.technology.status,removed:cleaned.removed.length,notes};return j;});}
   if(packet.input.technologyVisual){const t=packet.input.technologyVisual;await runtime.store.update(id,j=>{j.technologyVisual={version:t.version,status:t.status,factIds:t.factIds,pages:finalPlan.pages.filter(page=>technology.pageGetsImage(packet.input,page)).map(page=>page.id),notes:t.notes,...(technologyImageError?{pictureError:technologyImageError}:{})};return j;});}
  }catch(e){errors.push({placementIds:selection.map(s=>s.id),error:e.message});await runtime.store.save(id,'lean-planning-error-'+key+'.json',{error:e.message,code:e.code||null,at:new Date().toISOString()});}
 }
 if(!units.length)throw Error('Planning could not prepare artwork: '+errors.map(e=>e.error).join('; '));
 await require('./stage-handoff').publish(runtime,id,units,job.selection.length*policy.jobOptions(job).length,errors);
 // Direct/manual callers retain the same staged dispatch as the normal queues.
 if(phase!=='planning')runtime.schedule(id);
}
function validateRecord(job,record){
 const {packageHash,...body}=record;
 if(!policy.enabled(job.intake)||record.leanWorkflowVersion!==1||record.assignmentId!==job.id||record.brandId!==job.intake.brandId||fingerprint(body)!==packageHash)throw Error('Lean image package binding changed');
 if(!policy.jobOptions(job).some(o=>JSON.stringify(o)===JSON.stringify(record.option)&&o.route===record.route)||record.conceptId!==require('../creative-director').conceptIdFor({assignmentId:job.id},record.route)||!job.selection.some(s=>s.id===record.placementId))throw Error('Lean option is outside this job');
 // The queue manifest and package hash bind the already validated plan and exact prompt.
 // Resume must not reinterpret these through a newer planner or serializer.
 if(!record.plan?.pages?.some(p=>p.id===record.placementId)||typeof record.prompt!=='string'||!record.prompt.trim())throw Error('Saved lean execution contract is incomplete');
}
// Review checklist v1 (fix 1): the exact SKU's must-have visible features, read once per brand + product + photo set.
async function productFingerprint(runtime,id,job,packet,budget){
 const cl=require('../lean/checklist'),product=packet.input.product,brandId=job.intake.brandId;
 const refs=[];for(const r of packet.productRefs.slice(0,3)){let imageData=r.imageData;if(typeof imageData!=='string')imageData=await require('./reference-storage').hydrate(imageData,{file:path.join(runtime.store.dir(id),'job.json')});refs.push({assetId:r.assetId,imageData});}
 if(!refs.length)return null;
 const hashes=refs.map(r=>cl.photoHash(r.imageData)),key=cl.cacheKey(brandId,product.id,product.variant?.id,hashes),file='lean-product-fingerprint.json';
 const saved=await read(runtime,id,file);if(saved?.key===key)return saved;
 const cached=await cl.loadCached(runtime.root,brandId,key);
 if(cached){const value={...cached,reused:true,reusedFrom:cached.jobId};await runtime.store.save(id,file,value);return value;}
 const reading=await runtime.stage(id,'strategy','marketing-strategist','lean-product-fingerprint-reading.json',()=>runtime.provider.reason({contextKind:'lean-fingerprint',strictSchema:true,instructions:cl.fingerprintInstructions,input:{product:product.name,variant:product.variant?.name||null},images:refs.map((r,i)=>({id:r.assetId,label:'Exact product photo '+(i+1)+' of '+refs.length+' (the selected SKU)',imageData:r.imageData})),schema:cl.fingerprintSchema,maxOutputTokens:4000,validate:cl.validateFingerprint},budget));
 const value={version:cl.FINGERPRINT_VERSION,key,brandId,productId:product.id||null,variantId:product.variant?.id||null,photoHashes:hashes,features:reading.features,labelWords:String(reading.labelWords||'').trim(),photoBackdrop:String(reading.photoBackdrop||'').trim(),jobId:id,createdAt:new Date().toISOString()};
 await cl.saveCached(runtime.root,brandId,value);await runtime.store.save(id,file,value);return value;
}
// Local text reader rows for a finished artwork (no paid call); [] when unavailable.
async function artworkRows(runtime,image){
 const nfs=require('node:fs/promises'),dir=await nfs.mkdtemp(path.join(require('node:os').tmpdir(),'checklist-')),file=path.join(dir,'artwork.png');
 try{await sharp(image).png().toFile(file);const r=await (runtime.checklistOcr||require('./review').ocr)(file);return r?.status==='measured'?r.rows||[]:[];}finally{await nfs.rm(dir,{recursive:true,force:true});}
}
async function inspect(runtime,id,record,image,filename,budget,{original,decision,recheck}={}){
 const contract=structuredClone(record.reviewContract||visual.contract(record.input,record.plan,record.placementId));
 // Re-run check v1 (9 Nov 2026): the user's explicit click gives a fresh request identity, exactly one request.
 if(recheck)contract.recheck={number:recheck.number,note:'A fresh check of the same saved artwork; an earlier check of it did not finish.'};
 let images=[{id:'final-artwork',label:'Finished artwork to inspect',imageData:uri(image)},...record.attachments.map(a=>({id:a.assetId,label:a.roles.join(', ')+' reference',imageData:a.imageData}))];
 if(original){contract.requirements.push({id:'correction-integrity',name:'Correction integrity',expected:'Resolve the named defects without new copy errors, seams, smears, damaged product details or other blocking side effects. Compare against the original.'});contract.correction=decision;images.push({id:'original-artwork',label:'Before correction; compare for side effects only',imageData:uri(original)});}
 // SKU check v1 records: hash-checked, shrunk pictures under a size cap, checked before any paid request.
 let sent=null;if(sku.enabled(record)){sent=await sku.reviewImages(record,{artwork:image,original});images=sent.images;}
 // Review checklist v1 records: one local text reading of the artwork gives the label close-up (fix 5) and the
 // text-size measurement (fix 8). Neither is a paid call.
 const cl=record.reviewChecklistVersion===1?require('../lean/checklist'):null;let rows=null,meta=null;
 if(cl){meta=await sharp(image).metadata();rows=await artworkRows(runtime,image);
  const area=record.productFingerprint?.labelWords?cl.labelArea(rows,record.productFingerprint.labelWords,{width:meta.width,height:meta.height,copy:record.plan.pages.find(p=>p.id===record.placementId)?.copy||[]}):null;
  if(area){const crop=await sharp(image).extract(area).resize({width:Math.min(1024,Math.max(256,area.width*4)),kernel:'lanczos3'}).png().toBuffer();images=[...images,{id:'artwork-label-closeup',label:'Artwork label close-up: the label area of the finished artwork, enlarged for reading its words',imageData:uri(crop)}];}}
 // reviewCheckVersion 1 records: the schema is rebuilt from THIS contract (a candidate review adds correction-integrity).
 const schema=record.reviewCheckVersion===visual.CHECK_VERSION?visual.schemaFor(contract.requirements):record.reviewSchema||visual.schema;
 // A reply still missing (or repeating) requirement IDs after bounded recovery keeps its returned
 // checks; each missing one is saved as unable_to_verify ("reviewer did not return this check"),
 // never as passed, instead of failing the page. Request identities are unchanged.
 const output=await runtime.stage(id,'review','creative-reviewer',filename,async()=>{try{return await runtime.provider.reason({contextKind:'lean-review',strictSchema:true,instructions:record.reviewInstructions||visual.instructions,input:contract,images,schema,maxOutputTokens:16000,...(recheck?{maxProviderRequests:1,directCheck:true}:{}),validate:o=>visual.validateReport(o,contract.requirements)},budget);}catch(e){const partial=visual.omittedReply(e);if(partial)return visual.completeOmitted(partial,contract.requirements);throw e;}},{scope:{conceptId:record.conceptId,route:record.route,placementId:record.placementId}});
 // Layout check v1 records: approximate-position notes are advisory (no_mismatch) and listed separately.
 const layout=record.layoutCheckVersion===visual.LAYOUT_VERSION,report=visual.validateReport(layout?visual.applyLayoutAdvisories(output):output,contract.requirements);if(layout)report.advisories=visual.advisories(report);
 let requirements=contract.requirements;
 if(cl){const page=record.plan.pages.find(p=>p.id===record.placementId),measured=cl.textSizeCheck(rows,{copy:page?.copy||[],min:record.input.checklist?.minTextPx?.[record.placementId],width:meta.width,height:meta.height});
  if(measured){const req={id:'text-size',name:measured.name,expected:'Planned words at least the minimum size for this format\'s viewing size (measured by the local text reader).'};requirements=[...requirements,req];const checks=[...report.checks,{...req,...measured}],counts={no_mismatch:0,clear_mismatch:0,unable_to_verify:0};for(const c of checks)counts[c.result]++;Object.assign(report,{checks,counts,conclusion:counts.clear_mismatch?'clear_mismatch':counts.unable_to_verify?'unable_to_verify':'no_mismatch'});}}
 return {status:'completed',report,requirements,...(sent?{skuCheck:{version:sku.VERSION,productAngles:record.skuCheck.productAngles,...(record.skuCheck.note?{note:record.skuCheck.note}:{})},reviewImages:sent.manifest}:{})};
}
async function saveImage(runtime,id,name,bytes,scope){
 const meta=await sharp(bytes).metadata();if(!['png','jpeg','webp'].includes(meta.format))throw Error('Unsupported generated image');
 // Store a lossless PNG checkpoint for stable masked correction and previews.
 const png=meta.format==='png'?bytes:await sharp(bytes).png().toBuffer();
 await runtime.artifact(id,name,'image',png,scope);return {filename:name,sha256:hash(png),width:meta.width,height:meta.height};
}
async function imageBytes(runtime,id,item){const bytes=await fs.readFile(path.join(runtime.store.dir(id),item.filename));if(hash(bytes)!==item.sha256)throw Error('Saved artwork changed; automatic promotion stopped');return bytes;}
async function publishResult(runtime,id,record,state){
 const selected=state.selected==='candidate'?state.candidate:state.original;if(!selected)return;
 const report=state.selected==='candidate'?state.candidateReview:state.review,conclusion=report?.report?.conclusion,v1=policy.conformance(record),failure=state.correctionFailure;
 // Conformance v1: no remaining concrete mismatch is deliverable (ready); only an
 // all-pass review is qualityVerified. Unpinned records keep the all-pass contract.
 const result={conceptId:record.conceptId,route:record.route,placementId:record.placementId,imageUrl:'/creative-ai/api/jobs/'+id+'/files/'+selected.filename,width:selected.width,height:selected.height,sha256:selected.sha256,originalArtwork:true,editable:false,status:'available',ready:v1?report?.status==='completed'&&['no_mismatch','unable_to_verify'].includes(conclusion):conclusion==='no_mismatch',qualityVerified:conclusion==='no_mismatch',imageModel:record.option.model,leanWorkflowVersion:1,...(v1?{leanConformanceVersion:policy.conformanceVersion}:{}),visualReview:{status:report?.status||state.status,conclusion:conclusion||null,...(Array.isArray(report?.report?.checks)?{checks:report.report.checks.map(c=>({id:c.id,name:c.name,result:c.result,...(c.result==='clear_mismatch'?{evidence:String(c.evidence||'').slice(0,240)}:{})}))}:{}),...(report?.report?.advisories?.length?{advisories:report.report.advisories}:{}),...(v1?{unverified:(report?.report?.checks||[]).filter(c=>c.result==='unable_to_verify').map(c=>c.id),notVisuallyVerifiable:(record.notVisuallyVerifiable||[]).map(r=>r.id)}:{})},correction:state.decision||failure||state.correctionScope?.note?{action:state.decision?.action||null,selected:state.selected==='candidate',...(failure?{error:failure.message,stage:failure.stage}:{}),...(state.correctionScope?.note?{...(state.correctionScope.skipped?{skipped:state.correctionScope.skipped}:{}),notCorrected:state.correctionScope.skipped&&state.correctionScope.skipped!=='layout-only'?[...state.correctionScope.layout,...state.correctionScope.fixable]:state.correctionScope.layout,note:state.correctionScope.note}:{})}:null};
 await runtime.store.update(id,j=>{j.results=j.results.filter(r=>r.route!==record.route||r.placementId!==record.placementId);j.results.push(result);return j;});return result;
}
// Below the provider's 28,000-character compaction threshold, leaving room for the
// brand boundary prefix under its 32,000-character hard limit (conformance v1 only).
const CORRECTION_PROMPT_LIMIT=28000;
// A failed unit task is closed in the activity ledger; resume records a new version.
async function unitTask(runtime,id,base){
 const view=runtime.activity?await runtime.activity.project(id):null;if(!view)return base;
 const previous=Object.values(view.tasks).filter(t=>t.taskId===base||t.taskId.startsWith(base+'-resume-')),running=previous.find(t=>t.status==='running');
 return running?running.taskId:previous.some(t=>t.status==='failed')?base+'-resume-'+previous.length:base;
}
// Contract exhaustion repeats on resume; a transport interruption may not.
const deterministic=new Set(['REASONING_CONTRACT_INVALID','INVALID_AGENT_JSON','REASONING_OUTPUT_LIMIT','REASONING_RESPONSE_INCOMPLETE','REVIEW_PAYLOAD_TOO_LARGE','REVIEW_IMAGE_CHANGED','REVIEW_IMAGE_INVALID']);
// The single correction is optional. Any failure keeps the original selected and is
// recorded on the unit, except an interrupted check of an already saved (paid)
// candidate, which stays resumable without buying another image.
async function correct(runtime,id,record,state,{findings,original,key,scope,budget,save,align=false,targeted=null}){
 // Review checklist v1 (fix 5): a garbled label is repainted with the official label close-up as its guide.
 const labelFix=record.reviewChecklistVersion===1&&findings.some(f=>f.id==='label-wording')?await sku.generationLabel(record):null;
 const v1=policy.conformance(record),{width,height}=state.original,refRoles=[...record.attachments.map(a=>({role:a.roles.join(', ')})),...(labelFix?[{role:'official label close-up: copy its words and shape exactly'}]:[])];
 // Renumber the execution brief when a saved artwork is prepended.
 const brief=record.prompt.replace(/Product reference image\(s\) 1–(\d+)/g,(_,n)=>'Product reference image(s) 2–'+(Number(n)+1)).replace(/Image (\d+)/g,(_,n)=>'Image '+(Number(n)+1)).replace(/reference image (\d+)/g,(_,n)=>'reference image '+(Number(n)+1));
 const promptOf=decision=>correction.promptFor({decision,findings},{attachments:refRoles},brief,v1?{compact:true,limit:CORRECTION_PROMPT_LIMIT}:{});
 // Everything that would stop dispatch is checked inside the diagnosis contract, so
 // the bounded repair can fix it before any image is paid for.
 const check=d=>{correction.validateDecision(d,findings);if(['local_edit','regenerate'].includes(d.action)&&!state.candidate){if(d.action==='local_edit')correction.regionsMask(d,width,height);promptOf(d);}return d;};
 let stage='preflight';
 try{
  if(!state.decision){
   // No paid diagnosis when even a minimal instruction could not be dispatched.
   if(!['local_edit','regenerate'].some(action=>{try{promptOf({action,instruction:'Correct only the confirmed defects.'});return true;}catch(e){if(e.code!=='CORRECTION_PROMPT_LIMIT')throw e;return false;}}))throw Object.assign(Error('Correction prompt exceeds its limit before any instruction; no diagnosis or image request sent'),{code:'CORRECTION_PROMPT_LIMIT'});
   stage='diagnosis';state.status='diagnosing';await save();
   const diagnosisImages=sku.enabled(record)?(await sku.reviewImages(record,{artwork:original,artworkId:'finished-artwork',artworkLabel:'Actual artwork'})).images:[{id:'finished-artwork',label:'Actual artwork',imageData:uri(original)},...record.attachments.map(a=>({id:a.assetId,label:a.roles.join(', '),imageData:a.imageData}))];
   state.decision=await runtime.stage(id,'review','creative-reviewer','lean-correction-plan-'+key+'.json',()=>runtime.provider.reason({contextKind:'lean-correction',strictSchema:true,instructions:correction.instructions,input:{findings,requirements:state.review.requirements},images:diagnosisImages,schema:correction.schema,maxOutputTokens:10000,validate:check},budget),{scope});await save();
  }
  stage='decision';const decision=check(state.decision);
  if(!['local_edit','regenerate'].includes(decision.action))return;
  // correctionScopeVersion 1: the planner's whole-page regenerate for a non-wording finding is a new layout; not sent.
  const plannerSkip=targeted&&!state.candidate?correction.plannerSkip(decision):null;if(plannerSkip){state.correctionScope={...state.correctionScope,skipped:plannerSkip,note:'Needs a new layout; not auto-corrected.'};await save();return;}
  if(!state.candidate){
   let region,mask;
   if(decision.action==='local_edit'){region=correction.regionsMask(decision,width,height);mask=await masked.pngMask(region,width,height);}
   const prompt=promptOf(decision);
   stage='image';state.status='correcting';await save();
   const sourceName='lean-anchor-'+key+'.png',maskName=mask?'lean-mask-'+key+'.png':null;
   await runtime.store.save(id,sourceName,original);if(mask)await runtime.store.save(id,maskName,mask);
   await runtime.store.save(id,'lean-binding-'+key+'.json',{brandId:record.brandId,scope,sourceName,sourceSha256:hash(original),maskName,maskSha256:mask?hash(mask):null});
   const anchor={assetId:'lean-artwork-anchor',bindingKey:key,ownership:'generated-project-reference',roles:['visual-style'],sha256:hash(original),imageData:uri(original)};
   const result=await runtime.provider.generate({prompt,attachments:[anchor,...record.attachments,...(labelFix?[labelFix]:[])],mask,quality:'high',model:record.option.model,size:state.originalFit||record.option.model==='gpt-image-2'?require('./placements').generationSize(width,height).size:'auto',scope,resolvedLeanBrief:true,requestKey:fingerprint([id,record.packageHash,'correction',decision,hash(original)])},budget);
   stage='restore';const raw=Buffer.from(result.imageData.split(',')[1],'base64');
   await saveImage(runtime,id,'static-lean-candidate-raw-'+key+'.png',raw,scope);
   // Exact-canvas jobs: fit the corrected image to the original's exact size before restoring
   // protected pixels, so both images share one pixel grid.
   let corrected=raw;if(state.originalFit){const fitted=await require('./exact-canvas').fit(raw,width,height,require('./display-banners').fitOptions(record));state.candidateFit={method:fitted.method,scale:fitted.scale,shapeDifference:fitted.shapeDifference,trimmed:fitted.trimmed,added:fitted.added,source:fitted.source,...(fitted.edge?{edge:fitted.edge}:{})};corrected=fitted.bytes;}
   // correctionAlignVersion 1 (9 Nov 2026): the model can return the scene zoomed and shifted;
   // line it up with the original (even zoom + shift, edit-align.js) so restored pixels meet it cleanly.
   if(region&&align){const meta=await sharp(corrected).metadata();if(meta.width===width&&meta.height===height){const lined=await require('./edit-align').align(original,corrected,region,width,height);state.candidateAlignment=lined.alignment;corrected=lined.bytes;}}
   const restored=region?await masked.restore(original,corrected,region,{transitionPixels:3}):{bytes:corrected};
   if(region){state.maskProof={outsideMaskChangedPixels:restored.outsideMaskChangedPixels,maskedPixels:restored.maskedPixels};if(restored.outsideMaskChangedPixels!==0)throw Error('Correction changed protected pixels');}
   state.candidate=await saveImage(runtime,id,'static-lean-candidate-'+key+'.png',restored.bytes,scope);await save();
  }
  stage='verification';
  if(!state.candidateReview){state.status='checking-correction';await save();state.candidateReview=await inspect(runtime,id,record,await imageBytes(runtime,id,state.candidate),'lean-candidate-review-'+key+'.json',budget,{original,decision});await save();}
  if(v1?correction.acceptCandidate(state.candidateReview,state.candidateReview.requirements,state.review,targeted):correction.safeCandidate(state.candidateReview,state.candidateReview.requirements))state.selected='candidate';
 }catch(e){
  if(stage==='verification'&&state.candidate&&!deterministic.has(e.code))throw e;
  state.selected='original';state.correctionFailure={stage,message:e.message,code:e.code||null,at:new Date().toISOString()};await save();
 }
}
// Edge fit v1 (fix 6): one masked edit draws a new border around the scaled-down artwork (lean/edge-extend.js).
async function extendEdges(runtime,id,record,state,{findings,original,key,scope,budget,save}){
 const ee=require('../lean/edge-extend'),{width,height}=state.original;let stage='preflight';
 try{
  if(!state.candidate){
   const inner=state.decision?.inner||ee.placement(width,height,ee.sides(findings)),d=await ee.derive(original,width,height,inner);
   state.decision={action:'extend_edges',version:ee.VERSION,requirementIds:findings.map(f=>f.id),reason:'Content is cut off by the canvas edge.',instruction:'Scale the artwork down evenly and continue the scene into the new border.',inner,regions:[],protectedRegions:[]};
   state.correctionScope={...state.correctionScope,edgeFit:{version:ee.VERSION,scale:inner.scale,findings:findings.map(f=>f.id)}};
   stage='image';state.status='correcting';await save();
   const anchorName='lean-edge-anchor-'+key+'.png',maskName='lean-edge-mask-'+key+'.png';
   await runtime.store.save(id,anchorName,d.anchor);await runtime.store.save(id,maskName,d.mask);
   await runtime.store.save(id,'lean-binding-'+key+'.json',{kind:'edge-extend',version:ee.VERSION,brandId:record.brandId,scope,sourceSha256:hash(original),inner,anchorName,anchorSha256:hash(d.anchor),maskName,maskSha256:hash(d.mask)});
   const anchor={assetId:'lean-edge-anchor',bindingKey:key,ownership:'generated-project-reference',roles:['visual-style'],sha256:hash(d.anchor),imageData:uri(d.anchor)};
   const result=await runtime.provider.generate({prompt:ee.prompt(record,findings),attachments:[anchor,...record.attachments],mask:d.mask,quality:'high',model:record.option.model,size:require('./placements').generationSize(width,height).size,scope,resolvedLeanBrief:true,requestKey:fingerprint([id,record.packageHash,'edge-extend',hash(original)])},budget);
   stage='restore';const raw=Buffer.from(result.imageData.split(',')[1],'base64');
   await saveImage(runtime,id,'static-lean-candidate-raw-'+key+'.png',raw,scope);
   let edited=raw;if(state.originalFit){const fitted=await require('./exact-canvas').fit(raw,width,height,require('./display-banners').fitOptions(record));state.candidateFit={method:fitted.method,scale:fitted.scale,shapeDifference:fitted.shapeDifference,trimmed:fitted.trimmed,added:fitted.added,source:fitted.source};edited=fitted.bytes;}
   const meta=await sharp(edited).metadata();if(meta.width===width&&meta.height===height){const lined=await require('./edit-align').align(d.anchor,edited,d.region,width,height);state.candidateAlignment=lined.alignment;edited=lined.bytes;}
   state.candidate=await saveImage(runtime,id,'static-lean-candidate-'+key+'.png',await ee.restore(edited,d.small,inner,width,height),scope);await save();
  }
  stage='verification';
  if(!state.candidateReview){state.status='checking-correction';await save();state.candidateReview=await inspect(runtime,id,record,await imageBytes(runtime,id,state.candidate),'lean-candidate-review-'+key+'.json',budget,{original,decision:state.decision});await save();}
  if(correction.acceptCandidate(state.candidateReview,state.candidateReview.requirements,state.review,state.decision.requirementIds))state.selected='candidate';
 }catch(e){
  if(stage==='verification'&&state.candidate&&!deterministic.has(e.code))throw e;
  state.selected='original';state.correctionFailure={stage,message:e.message,code:e.code||null,at:new Date().toISOString()};await save();
 }
}
async function generate(runtime,id,record,budget){
 const job=await runtime.store.read(id);validateRecord(job,record);
 const key=fingerprint([record.route,record.placementId]).slice(0,24),stateFile='lean-state-'+key+'.json',scope={conceptId:record.conceptId,route:record.route,placementId:record.placementId};
 let state=await read(runtime,id,stateFile)||{version:1,packageHash:record.packageHash,status:'generating',selected:'original',startedAt:new Date().toISOString()};
 if(state.packageHash!==record.packageHash)throw Error('Lean checkpoint does not match its saved plan');
 if(state.original)await imageBytes(runtime,id,state.original);
 if(state.candidate)await imageBytes(runtime,id,state.candidate);
 if(state.status==='completed')return publishResult(runtime,id,record,state);
 const save=()=>runtime.store.save(id,stateFile,state),taskId=await unitTask(runtime,id,'lean-artwork-'+key);
 await runtime.beginTask(id,'start-'+taskId,{scope,agent:'graphic-designer',description:'Creating artwork',outcome:'One shared plan, two complete image options.',details:{taskId,taskKind:'generation'}});
 try{
  if(!state.original){
   // exactCanvasVersion 1 (8 Nov 2026): both models get the exact-shape size and every image is
   // fitted to the format's exact pixels (exact-canvas.js). Older jobs keep their saved contract.
   const exact=job.runtimeConfig?.exactCanvasVersion===1;
   // labelGenerationVersion 1: the official label close-up goes last (prompt line written at planning).
   const labelAttachment=await sku.generationLabel(record);
   const request={prompt:record.prompt,attachments:labelAttachment?[...record.attachments,labelAttachment]:record.attachments,quality:'high',model:record.option.model,size:exact||record.option.model==='gpt-image-2'?require('./placements').generationSize(record.canvas.width,record.canvas.height).size:'auto',scope,resolvedLeanBrief:true,requestKey:fingerprint([id,record.packageHash,'original'])};
   await save();const result=await runtime.provider.generate(request,budget);
   let produced=Buffer.from(result.imageData.split(',')[1],'base64');
   if(exact){await saveImage(runtime,id,'static-lean-raw-'+key+'.png',produced,scope);const fitted=await require('./exact-canvas').fit(produced,record.canvas.width,record.canvas.height,require('./display-banners').fitOptions(record));state.originalFit={method:fitted.method,scale:fitted.scale,shapeDifference:fitted.shapeDifference,trimmed:fitted.trimmed,added:fitted.added,source:fitted.source,...(fitted.edge?{edge:fitted.edge}:{})};produced=fitted.bytes;}
   state.original=await saveImage(runtime,id,'static-lean-'+key+'.png',produced,scope);state.status='checking';await save();await publishResult(runtime,id,record,state);
  }
  const original=await imageBytes(runtime,id,state.original);
  if(!state.review){state.status='checking';await save();state.review=await inspect(runtime,id,record,original,'lean-review-'+key+'.json',budget);await save();}
  const findings=state.review.report.checks.filter(c=>c.result==='clear_mismatch');
  // correctionScopeVersion 1 (9 Nov 2026): size/position/crop/composition findings are not auto-corrected
  // (lean/correction.js scope); only the locally fixable ones go to the single correction.
  const scoped=job.runtimeConfig?.correctionScopeVersion===1&&findings.length?(state.correctionScope?.version===1?state.correctionScope:correction.scope(findings)):null;
  if(scoped&&!state.correctionScope){state.correctionScope=scoped;await save();}
  if(findings.length&&!state.correctionFailure&&!scoped?.skipped)await correct(runtime,id,record,state,{findings:scoped?findings.filter(f=>scoped.fixable.includes(f.id)):findings,original,key,scope,budget,save,align:job.runtimeConfig?.correctionAlignVersion===1,targeted:scoped?scoped.fixable:null});
  // edgeFitVersion 1 (10 Nov 2026): content cut by the canvas edge, with nothing locally fixable, gets room instead.
  else if(findings.length&&!state.correctionFailure&&scoped?.skipped==='layout-only'&&job.runtimeConfig?.edgeFitVersion===1){const cut=require('../lean/edge-extend').edgeFindings(findings,correction.isLayout);if(cut.length)await extendEdges(runtime,id,record,state,{findings:cut,original,key,scope,budget,save});}
  state.status='completed';state.finishedAt=new Date().toISOString();delete state.error;await save();const result=await publishResult(runtime,id,record,state);
  await runtime.finishTask(id,'complete-'+taskId,{scope,artifactRefs:[(state.selected==='candidate'?state.candidate:state.original).filename.replace(/\./g,'-')],agent:'graphic-designer',description:'Artwork saved',outcome:state.selected==='candidate'?(policy.conformance(record)?'Checked correction selected; original preserved.':'Verified correction selected; original preserved.'):state.correctionFailure?'Original artwork retained; the optional correction could not finish.':'Saved artwork retained with its conformance record.',details:{taskId,taskKind:'generation'}});return result;
 }catch(e){
  state.status='interrupted';state.error={message:e.message,code:e.code||null,at:new Date().toISOString()};await save();await publishResult(runtime,id,record,state);
  // Close the task so the activity view never shows this unit running forever.
  try{if(runtime.log)await runtime.log(id,'task.failed','fail-'+taskId,{scope,agent:'graphic-designer',description:'Artwork could not finish',outcome:'Saved checkpoints are preserved; continue the project to resume.',details:{taskId,taskKind:'generation'}});}catch{}
  throw e;
 }
}
module.exports={plan,generate,validateRecord,inspect,publishResult};
