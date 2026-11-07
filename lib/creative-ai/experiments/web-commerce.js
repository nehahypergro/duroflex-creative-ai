'use strict';
// Isolated, saved-campaign adaptations. Never hooks the standard review pipeline.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const artifacts=require('../runtime/artifact-fs'),raw=require('./raw-artwork');
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
const sourceDefault={sourceId:'creative-210c3e9f-778c-40a9-92bd-fd4f00b51d65',route:'continuity',placementId:'custom_studio-web-banner'};
const groups=[
 ['banner','Website Banner',[['banner',1920,640,'Hero banner','A wide product-led domestic scene. Put the complete sofa on the right and one cohesive left-aligned text group on genuine clear wall space at left. Match the saved campaign idea of everyday time together. People may support the idea but must not hide the sofa.','embedded']]],
 ['gallery','Product Images',[
  ['hero',1080,1080,'Product hero','Show the complete exact sofa in a three-quarter view in a real, softly lit studio with an uncluttered light backdrop. Make its silhouette and three-seat configuration clear.','none'],
  ['front',1080,1080,'Front view','An eye-level, front-facing catalogue view of the complete sofa. Show the actual seat divisions, high back, arms and feet clearly. Simple real studio backdrop.','none'],
  ['seating',1080,1080,'Wide seats','A close product photograph focusing on the actual seats and arm construction. Keep enough of the sofa visible for recognition. Do not invent cutaways, internal layers, dimensions or diagrams.','none'],
  ['back',1080,1080,'High-back detail','A three-quarter close product photograph that makes the actual high-back design and upholstery construction easy to see. Use only visible reference details.','none'],
  ['lifestyle',1080,1080,'Everyday living','Show the exact sofa as the main subject in a believable contemporary domestic moment of everyday togetherness. Product appearance stays faithful to the supplied photographs.','none']]],
 ['marketplace','Marketplace A+ Images',[
  ['hero',970,600,'Lifestyle introduction','A coherent room scene introducing the complete sofa. Product is the clear hero. Native marketplace headline and description are separate.','none'],
  ['support',970,300,'Seats and high back','A wide product photograph emphasizing the relationship between the actual wide seats and high back. Preserve the complete identifying form; no diagrams or feature labels.','none'],
  ['fabric',300,300,'Fabric detail','A recognizable close-up of the exact Honey upholstery and its visible stitching, with a little surrounding sofa geometry. Do not fabricate microscopic texture or liquid demonstrations.','none']]],
 ['feature','Amazon A+ Feature Module',[['feature',300,300,'Wide-seat feature','One focused product photograph of the seat and back connection. Make the source-supported wide-seat/high-back design visually clear. The Amazon heading is separate.','none']]],
 ['lifestyle','Amazon A+ Lifestyle — Image Header',[['header',970,600,'Lifestyle header','A horizontal usage scene with the exact sofa in a contemporary home; it introduces everyday time together. Native Amazon headline and description remain outside this image.','none']]],
 ['story','Amazon Brand Story',[
  ['desktop',1464,625,'Desktop background','An editorial domestic environment with the exact sofa toward one side, leaving substantial quiet real wall/floor space through the centre for future Amazon story cards. Do not draw cards, controls or placeholders.','none'],
  ['mobile',463,625,'Mobile background','A vertically recomposed domestic scene, showing the exact sofa at a credible scale toward the lower portion, with quiet real background above for future Amazon story cards. Do not stretch the horizontal design.','none'],
  ['card-1',362,453,'Story card · Room to connect','A portrait scene of everyday connection around the exact sofa. It is a campaign interpretation, not a promise of health benefits or product-caused emotional outcomes.','none'],
  ['card-2',362,453,'Story card · Considered details','A complementary portrait product detail showing the actual high back, seats and Honey fabric. Keep the same restrained domestic visual family as the other story images.','none']]],
 ['premium','Amazon Premium A+ Images',[
  ['desktop',1464,600,'Full-width desktop','Premium full-width image: a spacious, coherent domestic scene with the exact sofa as the hero. Use the saved campaign’s tactile, contemporary feel. No native text or interaction controls baked in.','none'],
  ['mobile',600,450,'Full-width mobile','Recompose the premium full-width visual for mobile: bring the exact sofa forward with a clear silhouette and fewer background distractions. Do not stretch or squeeze the product.','none']]],
 ['tile','Homepage Category Tile',[['tile',1080,1080,'Sofas category tile','A simple square category photograph featuring this exact sofa as a representative sofa. Strong recognizable silhouette and clean real background; the website supplies the live category label.','none']]]
];
function slots(){return groups.flatMap(([group,groupLabel,items])=>items.map(([key,width,height,label,direction,text])=>({key:group+'-'+key,group,groupLabel,width,height,label,direction,text})));}
function batchPath(runtime,id){if(!/^raw-web-[a-f0-9]{24}$/.test(id||''))throw Error('Invalid experiment batch');return path.join(runtime.root,'output/creative-ai/raw-artwork-batches',id+'.json');}
async function save(runtime,batch){const target=batchPath(runtime,batch.id);await fs.mkdir(path.dirname(target),{recursive:true});const tmp=target+'.'+crypto.randomUUID()+'.tmp';await fs.writeFile(tmp,JSON.stringify(batch,null,2)+'\n');await fs.rename(tmp,target);}
async function read(runtime,id){return JSON.parse(await fs.readFile(batchPath(runtime,id),'utf8'));}
function buildPrompt(s,slot){
 if(slot.category)return buildAssetPrompt(s,slot);
 const fields=s.record.exactCopy.fields.filter(f=>f.delivery==='embedded').map(f=>({role:f.role||f.id,text:f.text}));
 return [
  'Create ONE original finished raster image for this isolated Web & commerce experiment. Output only the requested artwork, not a mockup, contact sheet, browser screenshot or collage.',
  'Product identity: '+JSON.stringify(s.record.productReference)+'. The supplied exact-SKU photographs are the appearance authority. Match the selected variant, colour, construction, proportions and markings; do not substitute a similar model.',
  'Campaign premise reused from the saved brief: everyday time together at home. This is a creative hypothesis, not a verified consumer insight or a health/performance claim.',
  'Relevant supported product wording: '+fields.map(f=>f.text).join(' | ')+'. Use this only as campaign/source context unless explicitly listed below as artwork text.',
  'Requested slot: '+slot.groupLabel+' / '+slot.label+'. Intended canvas '+slot.width+' × '+slot.height+'. Compose naturally for this aspect ratio. The provider-native original will be kept unchanged, with no automatic crop or resizing.',
  'Execution: '+slot.direction,
  'Proposed shared visual family, adapted to this slot: contemporary tactile domestic materials, a restrained blue-green/stone environment that complements the exact Honey upholstery, and physically coherent soft light. These are saved campaign choices, not mandatory brand rules. Product studio/detail views can simplify the setting. Preserve the product’s colour rather than recolouring it to match the room.',
  slot.text==='embedded'?'Render precisely this saved copy, and no other campaign words: '+JSON.stringify(fields)+'. Use the supplied Poppins style: bold headline and CTA, regular supporting copy. One cohesive left-aligned group; clear line spacing, generous breathing room and no product overlap. Keep all text inside the canvas.':'IMAGE ONLY: do not add campaign words, captions, letters, numbers, labels, text boxes, buttons, watermarks or diagrams. Do preserve authentic physical product markings. Native website/Amazon copy is separate and must not appear in these pixels.',
  'No added campaign logo: the website header or Amazon native identity upload supplies brand identity. Preserve authentic physical markings. No invented offers, prices, measurements, certifications, comparisons, waterproof promises or liquid demonstrations.',
  'Use only the exact-SKU reference pixels. They are product evidence, not inspiration to copy their rooms or captions. Scene integration must have plausible contact, geometry, anatomy and lighting. Do not add artificial haze or gradient panels for copy.'
 ].join('\n\n');
}
function buildAssetPrompt(s,slot){
 const r=s.record,a=r.artDirection||{},fields=(r.exactCopy?.fields||[]).filter(f=>f.delivery==='embedded').map(f=>({role:f.role||f.id,text:f.text}));
 const guidance={message:a.focalCommunication,lighting:a.lighting,palette:a.palette,imageTreatment:a.imageTreatment};
 return [
  'Create ONE finished original raster artwork. No browser UI, device mockup or contact sheet. This isolated experiment deliberately skips automated review and editable reconstruction.',
  'Exact product identity: '+JSON.stringify(r.productReference)+'. The attached selected SKU photographs are appearance evidence. Preserve variant, colour, proportions, construction and physical markings.',
  'Saved campaign guidance for this brand only: '+JSON.stringify(guidance)+'. Adapt the composition to the NEW format below; do not inherit the source banner coordinates, text size or aspect ratio. Written guidance is not an instruction to attach inspiration images.',
  'Asset: '+slot.groupLabel+' / '+slot.label+'. Page '+slot.page+' of '+slot.pages+'. Requested canvas '+slot.width+' × '+slot.height+'. This is one page in a coherent collection; do not paint page numbers unless explicitly requested.',
  'Execution direction: '+slot.direction,
  'Supported saved wording: '+JSON.stringify(fields)+'. Do not introduce new product claims. Retain qualifiers and numbers.',
  slot.text==='none'?'IMAGE ONLY: no campaign lettering, headings, captions, CTA buttons, fake interface, or added logos. Preserve genuine physical product markings. Native copy stays outside these pixels.':slot.copy?'Render this exact supplied artwork copy, preserving wording, qualifiers and numbers: '+JSON.stringify(slot.copy)+'.':'Choose only the relevant saved wording above for this format. Short formats need a concise headline and at most one supporting statement; do not cram all the source text into a small image. Dense pages may use a clear hierarchy of the supported facts; do not invent facts to fill the page.',
  slot.text==='none'?'': 'Compose text on clear background space, with readable type, coherent alignment and separation from the product. Use the source brand’s typography guidance: '+JSON.stringify(s.layout?.fonts||a.typography?.match(/(?:Poppins|Inter|Arial|Montserrat|Roboto)[^.;]*/g)||'Use a clear type style consistent with the saved artwork; do not claim it is an approved font.'),
  slot.print?'PRINT CONCEPT: '+JSON.stringify(slot.print)+'. '+slot.direction+'. Flat artwork, retaining fold and mounting keepouts. Provider-native raster preview only; do not claim print-ready resolution, bleed, dielines or PDF certification.':'Save the provider-native output unchanged; requested pixels are a composition target, not a promise of final export dimensions.',
  'No invented offers, prices, contacts, store addresses, QR codes, people’s identities, statistics, comparisons or certifications. Omit missing facts. A supplied factual brief takes precedence over the old campaign’s execution direction. Do not copy labels or infographics from reference photos into the campaign.'
 ].filter(Boolean).join('\n\n');
}
async function prepare(runtime,batch,slot){
 const input={...batch.source,requestKey:batch.id+'-'+slot.key},s=await raw.source(runtime,input),brand=await runtime.brands.read(s.job.intake.brandId);
 if(brand.latestResearchId!==s.job.intake.researchId||runtime.brands.revision(brand)!==s.job.intake.brandKnowledge.revision)throw Error('Brand guidance changed; use a newly planned source campaign.');
 const prior=await runtime.store.findRequest(input.requestKey);
 if(prior){const old=await runtime.store.read(prior.id);if(old.intake.rawArtworkBatchId!==batch.id||old.intake.rawArtworkSlot?.key!==slot.key)throw Error('Experiment request identity conflict');return {id:old.id,reused:true};}
 const cost=await require('../local-queue/cost-preflight.cjs').preflight(runtime.root);
 if(cost.remainingInr<cost.additionalUnknownReserveInr+cost.perJobInr)throw Error('Testing allowance insufficient; remaining batch preserved');
 const profileId='custom:raw-web-'+slot.key;
 const intake={...s.job.intake,requestKey:input.requestKey,rawArtworkExperimentVersion:1,rawArtworkBatchId:batch.id,rawArtworkSource:{id:s.job.id,route:input.route,placementId:input.placementId},rawArtworkSlot:slot,clientVisibility:'internal',campaignName:slot.groupLabel+' · '+slot.label+' · raw experiment',brief:buildPrompt(s,slot),placementIds:[profileId],customProfiles:[{id:profileId,name:slot.label,platform:slot.groupLabel,publisher:'studio',placement:'image',assetType:'static',canvas:{width:slot.width,height:slot.height,unit:'px'},exportContract:{formats:['png']},displayContext:slot.direction}],logoTreatmentByPlacement:{[profileId]:'omit'},placementPublishing:{}};
 const {selections}=require('../runtime/placements').resolve(intake);
 const job=await runtime.store.create(intake,{...runtime.config,initialStatus:'preparing',estimatedSpend:{...runtime.config.estimatedSpend,maxUsd:cost.perJobInr/cost.fx.usdToInr}},selections.map(({expanded,...x})=>x));
 if(job.reused)return {id:job.id,reused:true};
 try{
  await runtime.store.update(job.id,j=>{j.budget.maxImageCalls=1;j.budget.maxReasoningCalls=0;j.preferenceMemory=s.job.preferenceMemory;j.brandStyleMemory=s.job.brandStyleMemory;j.brandStyleExecutionHashes=s.job.brandStyleExecutionHashes;return j;});
  await runtime.store.save(job.id,'experiment-cost-admission.json',cost);
  for(const name of await artifacts.readdir(s.dir))if(/^research(?:-[a-z0-9-]+)?\.json$/.test(name))await runtime.store.save(job.id,name,await artifacts.readJson(path.join(s.dir,name)));
  const photos=require('../runtime/editable').photoAttachments(s.record);
  const attachments=await require('../runtime/product-review-images').generationReferences({...s.record,attachmentManifest:photos},{primaryFirst:true});
  const request={prompt:intake.brief,attachments,scope:{route:'continuity',placementId:selections[0].id,conceptId:s.record.conceptId},size:require('../runtime/placements').generationSize(slot.width,slot.height).size,quality:'high',requestKey:digest(job.id+'|raw-web-v1|'+slot.key)};
  await runtime.provider.preflightImagePrompt(request,runtime.store.budget(job.id));
  await runtime.store.save(job.id,'raw-artwork-request.json',request);
  await runtime.store.save(job.id,'raw-artwork-provenance.json',{version:1,sourceId:s.job.id,brandId:brand.id,batchId:batch.id,slot,planning:'Saved SKU research and campaign direction; new format-specific experiment brief. No new strategy/concept model calls.',reviewStatus:'skipped',ocr:'skipped',reconstruction:'skipped',repair:'skipped',resizing:'skipped',originalBytes:true});
  await runtime.store.update(job.id,j=>{j.status='running';return j;});
  return {id:job.id,reused:false};
 }catch(e){await runtime.store.update(job.id,j=>{j.status='failed';j.error=String(e.message||e);return j;});e.jobId=job.id;throw e;}
}
// Admission is serial; image work occupies five rolling slots. Failure is local to one item.
async function pool(items,limit,work){let cursor=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(cursor<items.length){const item=items[cursor++];await work(item);}}));}
async function execute(runtime,batch,{prepareItem=prepare,runItem=raw.run}={}){
 if(batch.version>=3)return executePlanned(runtime,batch);
 let admission=Promise.resolve(),writes=Promise.resolve();
 const persist=()=>{const snapshot=structuredClone(batch);writes=writes.then(()=>save(runtime,snapshot));return writes;};
 await pool(batch.items.filter(i=>i.status==='queued'||i.resumeUndispatched),5,async item=>{
  item.status='preparing';item.startedAt=new Date().toISOString();await persist();
  try{
   const next=admission.catch(()=>{}).then(()=>prepareItem(runtime,batch,item.slot));admission=next;
   const result=await next;item.jobId=result.id;item.status='running';await persist();
   if(result.reused){const j=await runtime.store.read(result.id);if(item.resumeUndispatched&&undispatched(j)){
    await runtime.store.update(j.id,current=>{if(!undispatched(current))throw Error('Request changed before recovery');current.rawWebRecovery={at:new Date().toISOString(),previousError:current.error,reason:'Confirmed zero dispatches; deployment capacity mismatch corrected'};current.status='running';current.error=null;current.budget.deadline=Date.now()+runtime.config.jobTimeoutMs;return current;});await runItem(runtime,j.id);
   }else if(j.status!=='finished')throw Error('Existing incomplete request requires reconciliation; it was not resubmitted.');}
   else await runItem(runtime,result.id);
   const j=await raw.status(runtime,result.id);if(j.status!=='finished')throw Error(j.error||'Image generation did not finish');
   item.status='finished';item.result=j.results[0];delete item.error;
  }catch(e){item.status='failed';item.error=String(e.message||e);if(e.jobId)item.jobId=e.jobId;batch.errors.push({slot:item.slot.key,jobId:item.jobId||null,message:item.error,at:new Date().toISOString()});}
  delete item.resumeUndispatched;item.finishedAt=new Date().toISOString();item.elapsedSeconds=(Date.parse(item.finishedAt)-Date.parse(item.startedAt))/1000;await persist();
 });
 batch.status=batch.items.every(i=>i.status==='finished')?'finished':'partial';batch.finishedAt=new Date().toISOString();await persist();return batch;
}
// Five rolling ASSET families. All pages of a family share one real planning
// job; unrelated formats never inherit its concept/copy/art checkpoints.
async function executePlanned(runtime,batch,{createFamily,waitMs=1000}={}){
 const planned=require('./planned-artwork'),families=[...new Set(batch.items.map(i=>i.slot.group))].filter(f=>!batch.resumeFamilies||batch.resumeFamilies.includes(f));
 let admission=Promise.resolve(),writes=Promise.resolve();
 const persist=()=>{const snapshot=structuredClone(batch);writes=writes.then(()=>save(runtime,snapshot));return writes;};
 await pool(families,5,async family=>{
  const items=batch.items.filter(i=>i.slot.group===family),slots=items.map(i=>i.slot);
  if(items.every(i=>i.status==='finished'))return;
  const start=new Date().toISOString();for(const item of items){item.startedAt??=start;if(item.status!=='finished')item.status='planning';}await persist();
  try{
   const next=admission.catch(()=>{}).then(async()=>{
    if(createFamily)return createFamily(slots);
    const s=await raw.source(runtime,batch.source),intake=planned.intakeFor(s,batch,slots);
    const prior=await runtime.store.findRequest(intake.requestKey);
    if(prior){const j=await runtime.store.read(prior.id);if(j.intake.rawArtworkBatchId!==batch.id||j.intake.rawArtworkExperimentVersion!==2)throw Error('Experiment family identity conflict');if(batch.resumeFamilies)await resumePlannedJob(runtime,j);return j.id;}
    const cost=await require('../local-queue/cost-preflight.cjs').preflight(runtime.root);
    if(cost.remainingInr<cost.additionalUnknownReserveInr+cost.perJobInr)throw Error('Testing allowance insufficient; unstarted work preserved');
    const id=await runtime.create(intake);
    await runtime.store.save(id,'experiment-cost-admission.json',cost);
    await runtime.store.save(id,'raw-artwork-provenance.json',{version:2,batchId:batch.id,sourceId:s.job.id,brandId:s.job.intake.brandId,family,slots:slots.map(s=>s.key),planning:'Shared strategy, concepts, set planning, copy, art direction and reconciliation. No prior generated copy or artwork is reused.',review:'skipped',reconstruction:'skipped',originalBytes:true});
    return id;
   });admission=next;const id=await next;
   items.forEach(i=>i.jobId=id);await persist();
   let signature='';
   for(;;){
    const j=await runtime.store.read(id,{hydrate:false}),terminal=!['queued','preparing','running'].includes(j.status);
    for(const item of items){const result=j.results?.find(r=>r.placementId===planned.placementId(item.slot));if(result){item.result=result;item.status='finished';item.finishedAt??=new Date().toISOString();delete item.error;}
     else if(terminal){item.status='failed';item.error=j.unitErrors?.find(e=>e.placementId===planned.placementId(item.slot))?.error||j.error||'This placement did not produce artwork';item.finishedAt??=new Date().toISOString();}
     if(item.finishedAt)item.elapsedSeconds=(Date.parse(item.finishedAt)-Date.parse(item.startedAt))/1000;
    }
    const current=JSON.stringify(items);if(current!==signature){signature=current;await persist();}
    if(terminal)break;
    if(!runtime.active?.has(id)&&!runtime.pending?.includes(id))throw Error('The planning worker stopped. Saved checkpoints and provider requests require reconciliation; no duplicate request was sent.');
    await new Promise(resolve=>setTimeout(resolve,waitMs));
   }
   for(const item of items.filter(i=>i.status==='failed'))batch.errors.push({slot:item.slot.key,jobId:id,message:item.error,at:item.finishedAt});
  }catch(e){for(const item of items.filter(i=>i.status!=='finished')){item.status='failed';item.error=String(e.message||e);item.finishedAt=new Date().toISOString();batch.errors.push({slot:item.slot.key,jobId:item.jobId||null,message:item.error,at:item.finishedAt});}}
  await persist();
 });
 batch.status=batch.items.every(i=>i.status==='finished')?'finished':'partial';batch.finishedAt=new Date().toISOString();await persist();return batch;
}
const capacityError='Shared capacity configuration differs between workers; drain and reconfigure the capacity directory before changing limits.';
function undispatched(job){
 const b=job.budget;
 return job.intake?.rawArtworkExperimentVersion===1&&job.status==='failed'&&job.error===capacityError&&b&&b.imageCalls===0&&b.reasoningCalls===0&&Array.isArray(b.receipts)&&!b.receipts.length&&Array.isArray(b.imageReservations)&&!b.imageReservations.length&&Array.isArray(b.estimatedSpend?.reservations)&&!b.estimatedSpend.reservations.length&&b.estimatedSpend.reservedUsd===0&&!Object.keys(b.requestStates||{}).length&&!Object.keys(job.providerWaits||{}).length&&!Object.keys(job.imageWaits||{}).length&&!job.results?.length&&!job.rawWebRecovery;
}
function launch(runtime,batch){
 runtime.rawWebTasks??=new Map();const task=execute(runtime,batch).catch(async e=>{batch.status='interrupted';batch.errors.push({at:new Date().toISOString(),message:String(e.message||e)});await save(runtime,batch);}).finally(()=>runtime.rawWebTasks.delete(batch.id));runtime.rawWebTasks.set(batch.id,task);
}
async function resumePlannedJob(runtime,job){
 if(runtime.active?.has(job.id)||runtime.pending?.includes(job.id)||job.status==='finished')return;
 const recovery=require('../runtime/resume-work'),info=await recovery.inspect(runtime,job.id,job.intake.brandId);
 if(info.active)throw Error('The saved worker must be stopped and reconciled before resuming this family.');
 if(!info.canResume)throw Error(info.reason);
 await recovery.resume(runtime,job.id,{brandId:job.intake.brandId,token:info.token});
}
async function resume(runtime,id,input={}){
 return require('../runtime/file-lock').withLock(batchPath(runtime,id)+'.lock',async()=>{
  if(runtime.rawWebTasks?.has(id))return {id,reused:true};
  const batch=await read(runtime,id);let count=0;
  if(batch.version===3){
   input={...input,families:input.families||batch.resumeFamilies};
   const available=new Set(batch.items.map(i=>i.slot.group));
   if(!Array.isArray(input.families)||!input.families.length||input.families.some(f=>typeof f!=='string'||!available.has(f)))throw Error('Select the exact interrupted asset families to resume.');
   batch.resumeFamilies=[...new Set(input.families)];
   count=batch.items.filter(i=>batch.resumeFamilies.includes(i.slot.group)&&i.status!=='finished').length;
   if(!count)return {id,reused:true,resumed:0};
   batch.recoveries??=[];batch.recoveries.push({at:new Date().toISOString(),reason:'Explicit selected-family checkpoint continuation; completed pages and request identities preserved',families:batch.resumeFamilies,count});
   batch.status='running';delete batch.finishedAt;await save(runtime,batch);launch(runtime,batch);return {id,resumed:count};
  }
  for(const item of batch.items){if(item.status!=='failed'||!item.jobId)continue;const j=await runtime.store.read(item.jobId);if(undispatched(j)&&j.intake.rawArtworkBatchId===id&&j.intake.rawArtworkSlot?.key===item.slot.key){item.resumeUndispatched=true;count++;}}
  if(!count)throw Error('No safely unstarted image requests remain. Paid or uncertain requests require reconciliation.');
  batch.recoveries??=[];batch.recoveries.push({at:new Date().toISOString(),reason:'Use existing deployment image capacity; retry only confirmed undispatched requests',count});batch.status='running';delete batch.finishedAt;await save(runtime,batch);launch(runtime,batch);return {id,resumed:count};
 });
}
async function submit(runtime,input){
 if(!/^(?:web-commerce|asset-collection)-[a-f0-9-]{36}$/.test(input.requestKey||''))throw Error('Stable batch request key required');
 const source={...sourceDefault,...input.source};if(!input.assets&&JSON.stringify(source)!==JSON.stringify(sourceDefault))throw Error('Select asset types to adapt a different source campaign');const selected=require('./asset-catalog').resolve(input.assets||require('./asset-catalog').catalog().filter(e=>e.category==='website'&&!e.preset&&e.mode==='image').map(e=>({assetId:e.id})));const requestFingerprint=digest(JSON.stringify({source,slots:selected}));const preview=await raw.preview(runtime,source),id='raw-web-'+digest(input.requestKey).slice(0,24);
 return require('../runtime/file-lock').withLock(batchPath(runtime,id)+'.lock',async()=>{
  try{const prior=await read(runtime,id);if(JSON.stringify(prior.source)!==JSON.stringify(source)||(prior.requestFingerprint&&prior.requestFingerprint!==requestFingerprint)||(!prior.requestFingerprint&&input.assets))throw Error('Batch request key belongs to a different collection; use a new request key');return {id,reused:true};}catch(e){if(e.code!=='ENOENT')throw e;}
  const selectedCategories=[...new Set(selected.map(s=>s.category||'website'))];const title=input.assets?selectedCategories.map(id=>require('./asset-catalog').categories.find(c=>c.id===id)?.name||id).join(' + '):'Web & commerce';
  const batch={version:3,id,source,requestFingerprint,title,brandId:preview.brandId,brand:preview.brand,product:preview.product,status:'running',createdAt:new Date().toISOString(),concurrency:5,items:selected.map(slot=>({slot,status:'queued'})),errors:[]};await save(runtime,batch);
  launch(runtime,batch);return {id,reused:false};
 });
}
async function status(runtime,id){const b=await read(runtime,id);if(b.status==='running'&&!runtime.rawWebTasks?.has(id))return {...b,status:'interrupted',notice:'The worker stopped. Saved images and provider records are preserved; incomplete requests need reconciliation before resubmission.'};b.canResumeUndispatched=b.version===3&&Array.isArray(b.resumeFamilies)&&b.items.some(i=>b.resumeFamilies.includes(i.slot.group)&&i.status!=='finished')&&!runtime.rawWebTasks?.has(id);if(!runtime.rawWebTasks?.has(id)){for(const i of b.items){if(i.status==='failed'&&i.jobId&&undispatched(await runtime.store.read(i.jobId))){b.canResumeUndispatched=true;break;}}}return b;}
module.exports={resumePlannedJob,sourceDefault,slots,buildPrompt,buildAssetPrompt,prepare,pool,execute,executePlanned,submit,status,resume,undispatched};
