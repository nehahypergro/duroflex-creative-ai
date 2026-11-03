'use strict';
// Versioned full-artwork -> measured/frozen text -> masked repair. Brand data is supplied per job.
const fs=require('./artifact-fs'),path=require('path'),sharp=require('sharp'),fontkit=require('fontkit'),M=require('./masked-image'),OCR=require('./editor-ocr');
const hash=M.hash;
function assertFrozen(original,proposed){if(JSON.stringify(original.objects)!==JSON.stringify(proposed.objects)||JSON.stringify(original.fonts)!==JSON.stringify(proposed.fonts))throw Error('Generated typography is frozen; automatic layer changes require a new composition or explicit user edit');}
function prompt(record,doc,quality=false,pushTreatment=null,skuReferences=null,promptVersion=1){
 const imageOnly=promptVersion>=2&&!record.exactCopy.fields.some(f=>f.delivery==='embedded');
 const cleanInstructions='Create one finished IMAGE-ONLY artwork with ZERO campaign text. Do not add a headline, feature copy, CTA button, lettering or campaign logo. Native publisher copy and campaign messages are context, never words to draw. Preserve authentic physical product markings exactly from the SKU references; those markings are not campaign text.';
 const logoInstructions=imageOnly?require('./composed-logo').sourceInstructions.replace('render the exact campaign words, but NO','render NO'):require('./composed-logo').sourceInstructions;
 const sourceArt=quality>=7?require('./composed-logo').sourceArt(record.artDirection):record.artDirection;
 return [
 ...(imageOnly?[cleanInstructions]:[]),
 ...(quality>=8?[require('./framing-policy').instructions]:[]),
 ...(quality>=7?[logoInstructions]:[]),
 ...(quality>=6&&!imageOnly?[require('./composed-readability').instructions]:[]),
 ...(quality&&!imageOnly?[require('./composed-quality').readability(doc,quality>=14?1:quality>=2?1.3:1.15)]:[]),
 ...(quality>=13?[require('./visual-judgment').instructions]:[]),
 ...(!imageOnly?[
 'Create the COMPLETE finished artwork INCLUDING the exact campaign text below. Compose image and text together at the supplied relative sizes and positions. Use the supplied brand fonts as closely as possible. The completed artwork is the visual reference for editable text reconstruction. Do not add an extra campaign logo: the exact approved logo is overlaid separately in its reserved location. Preserve genuine product markings. Do not add words, rewrite copy, or copy lettering from mood references.',
 ]:[]),
 'Final canvas: '+JSON.stringify(doc.canvas), 'Exact campaign wording and typography: '+JSON.stringify(imageOnly?[]:(quality>=2?require('./composed-quality').typography(doc):doc.objects.filter(o=>o.fieldId)).map(o=>({...o,font:doc.fonts.find(f=>f.id===o.fontId)?.name}))),
 'Brand locked rules: '+JSON.stringify(record.lockedRules||[]), 'Source-backed product facts: '+JSON.stringify(record.upstreamContext?.strategyInput?.facts||[]),
 'Reserved logo bounds: '+JSON.stringify(doc.objects.filter(o=>o.role==='logo')), 'Final art direction: '+JSON.stringify(imageOnly?{...sourceArt,typography:'No embedded typography. Native ad text remains separate.',text:undefined,...(!doc.objects.some(o=>o.role==='logo')?{logo:{assetIds:[],treatment:'No added campaign logo; reserve no campaign logo box. Preserve physical product markings.'}}:{})}:quality>=2?{...sourceArt,typography:'Use the authoritative exact campaign typography block above. Allocate space for these sizes before generation.',text:undefined}:record.artDirection),
 'Reference roles in order: '+JSON.stringify((skuReferences||require('./editable').photoAttachments(record)).map(a=>({id:a.assetId,label:a.label,roles:a.roles,...(skuReferences&&a.derivation?{derivation:a.derivation}:{})}))),
 ...(skuReferences?[require('./product-review-images').generationInstructions]:[]),
 'Use the official product references for exact SKU identity. Mood images inform scene only; do not copy their text, logos or products. Native publisher copy stays outside artwork. Do not invent a backdrop, lighting rule or ban on people beyond the supplied direction.',
 require('./push-image-treatment').instructions(pushTreatment),
 require('./placements').generationInstruction(doc.canvas.width,doc.canvas.height),
 ...(quality>=7?[logoInstructions]:[]),
 ...(imageOnly?[cleanInstructions]:[])
 ].join('\n');}
async function checkpoint(runtime,id,k,request){return require('./editable-composition').pinBackground(runtime,id,k,{...request,mask:request.mask?hash(request.mask):undefined});}
async function cachedImage(runtime,id,name,request,budget,transform){await checkpoint(runtime,id,name,request);try{return await fs.readFile(path.join(runtime.store.dir(id),name));}catch(e){if(e.code!=='ENOENT')throw e;}const out=await runtime.provider.generate(request,budget),bytes=await transform(Buffer.from(out.imageData.split(',')[1],'base64'));await runtime.store.save(id,name,bytes);return bytes;}
async function reconstruct(runtime,id,planned,source,matches,reconstructionVersion=1){
 if(reconstructionVersion===4)return require('./editable-copy-lines').reconstruct(runtime,id,planned,source,matches);
 const doc=structuredClone(planned),raw=await sharp(source).removeAlpha().raw().toBuffer({resolveWithObject:true}),{width:w,height:h}=doc.canvas;
 for(const m of matches){const o=doc.objects.find(o=>o.fieldId===m.fieldId);if(!o)throw Error('Unbound text field');const f=doc.fonts.find(f=>f.id===o.fontId),font=fontkit.create(await fs.readFile(path.join(runtime.brands.dir(doc.brandId),'canvas-assets',f.filename)));const fits=[];
  const layoutLines=reconstructionVersion>=3?require('./saved-copy-layout').lines(m,text=>{const run=font.layout(text);return {width:run.positions.reduce((n,p)=>n+p.xAdvance,0)/w,height:(Math.max(...run.glyphs.map(g=>g.bbox.maxY))-Math.min(...run.glyphs.map(g=>g.bbox.minY)))/h};}):m.lines;
  for(const l of layoutLines){const run=font.layout(l.text),advance=run.positions.reduce((n,p)=>n+p.xAdvance,0),height=Math.max(...run.glyphs.map(g=>g.bbox.maxY))-Math.min(...run.glyphs.map(g=>g.bbox.minY));fits.push({pixelHeight:l.box.height*h,pixelWidth:l.box.width*w,widthFit:l.box.width*w/Math.max(advance,1)*font.unitsPerEm,heightFit:l.box.height*h/Math.max(height,1)*font.unitsPerEm});}
  const measured=reconstructionVersion>=3?require('./saved-copy-layout').fit(fits):require('./composed-quality').measuredFit(fits,reconstructionVersion),size=measured.size,scaleX=reconstructionVersion>=3?1:measured.scaleX;
  if(reconstructionVersion>=3&&fits.some(f=>f.pixelWidth*size/f.widthFit>f.pixelWidth+1))throw Error('Saved copy does not fit observed text size; recompose without shrinking or dropping words: '+JSON.stringify({size,fits}));
  if(!Number.isFinite(size)||size<1||size>2000)throw Error('Unusable measured text size');const ink=OCR.ink(raw,m.lines[0].box);if(ink.confidence<.7)throw Error('Text colour separation is uncertain: '+m.fieldId);
  // Button/arrow pixels stay in the photograph; only the words become editable.
  o.type='text';delete o.background;delete o.padding;o.text=reconstructionVersion>=3?layoutLines.map(l=>l.text).join('\n'):OCR.requestedText(m);o.fontSize=size;o.left=m.box.x*w;o.top=m.box.y*h;o.width=m.box.width*w/scaleX+8;if(reconstructionVersion>=2)o.scaleX=scaleX;o.height=m.box.height*h+size*.65;o.fill='#'+ink.rgb.map(v=>v.toString(16).padStart(2,'0')).join('');o.align='left';o.lineHeight=OCR.lineHeight(m,size,h);o.charSpacing=0;
  const single={...doc,assets:[],objects:[{...o,left:0,top:0,fill:'#000000'}]},rendered=await require('./editable').render(runtime,id,single),pixels=await sharp(Buffer.from(rendered.data.split(',')[1],'base64')).removeAlpha().raw().toBuffer();let minX=w,minY=h;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(pixels[(y*w+x)*3]<128){minX=Math.min(minX,x);minY=Math.min(minY,y);}if(minX===w)throw Error('Font produced no measurable lettering');o.left-=minX;o.top-=minY;
 }
 return doc;
}
function assertProtected(matches,planned,region){
 const {width:w,height:h}=planned.canvas;
 if(!region||region.length!==w*h)throw Error('Protected-subject check requires the full removal mask');
 // A multiline union box contains blank corners. Only pixels actually being
 // repaired (including the antialiasing margin) can damage a protected subject.
 for(const p of planned.protectedRegions||[])for(let y=Math.max(0,Math.floor(p.top));y<Math.min(h,Math.ceil(p.top+p.height));y++)for(let x=Math.max(0,Math.floor(p.left));x<Math.min(w,Math.ceil(p.left+p.width));x++)if(region[y*w+x])throw Error('Measured lettering overlaps protected subject '+p.id+'; complete artwork preserved for review');
}
async function processing(runtime,id,k,stage,extra={}){const name='composed-processing-'+k+'.json';let prior;try{prior=await fs.readJson(path.join(runtime.store.dir(id),name));}catch(e){if(e.code!=='ENOENT')throw e;}await runtime.store.save(id,name,{...prior,version:1,stage,...(stage==='needs-attention'?{failedStage:prior?.stage||'preparing'}:{}),updatedAt:new Date().toISOString(),...extra,history:[...(prior?.history||[]),{stage,at:new Date().toISOString(),...extra}]});}
async function prepare(runtime,id,k,record,planned,budget){try{return await prepareNow(runtime,id,k,record,planned,budget);}catch(error){await processing(runtime,id,k,'needs-attention',{error:error.message,...(error.promptBudget?{promptBudget:error.promptBudget}:{}),retryPolicy:'Inspect saved checkpoints; no automatic paid resubmission.'});throw error;}}
async function sourceRequest(job,record,planned,id,k){
 const quality=job.intake.composedQualityVersion||0,fields=record.exactCopy.fields.filter(f=>f.delivery==='embedded'),{width:w,height:h}=planned.canvas,scope={route:record.route,placementId:record.placementId,conceptId:record.conceptId};
 const photos=require('./editable').photoAttachments(record);
 // Only new jobs receive this source-request policy; old checkpoint hashes stay valid.
 const skuReferences=job.intake.skuReferenceDetailVersion===1&&record.productReference?await require('./product-review-images').generationReferences({...record,attachmentManifest:photos},{primaryFirst:true}):null;
 const request={prompt:prompt(record,planned,quality,require('./push-image-treatment').forJob(job,record.placementId),skuReferences,job.intake.composedPromptVersion||1),attachments:skuReferences||photos,scope,size:require('./placements').generationSize(w,h).size,quality:'high',requestKey:hash(id+'|composed-source-v1|'+k)};
 if(quality>=3&&(job.intake.composedPromptVersion!==2||fields.length))request.prompt+='\n'+require('./composed-type-guide').instructions;
 return request;
}
async function prepareNow(runtime,id,k,record,planned,budget){
 const dir=runtime.store.dir(id),scope={route:record.route,placementId:record.placementId,conceptId:record.conceptId},fields=record.exactCopy.fields.filter(f=>f.delivery==='embedded'),{width:w,height:h}=planned.canvas,sourceName='composed-source-'+k+'.png';
 if(fields.length&&process.platform!=='darwin')throw Error('Editable composition separation requires local Apple Vision OCR before image generation');
 const job=await runtime.store.read(id),quality=job.intake.composedQualityVersion||0;
 if(quality>=11||job.intake.composedPromptVersion>=2)require('./saved-copy-layout').assertCopy(planned,fields);
 if(quality>=7)await require('./composed-logo').verifyDocument(runtime,id,k,planned);
 const request=await sourceRequest(job,record,planned,id,k);
 let cachedSource=false;try{await fs.access(path.join(dir,sourceName));cachedSource=true;}catch(e){if(e.code!=='ENOENT')throw e;}
 if(!cachedSource)await require('./planning-prompt-budget').inspectRequest(runtime,id,k,request,budget,'source-dispatch');
 if(quality>=3&&(job.intake.composedPromptVersion!==2||fields.length))request.attachments.push(await require('./composed-type-guide').create(runtime,id,k,record,planned));
 const source=await cachedImage(runtime,id,sourceName,request,budget,bytes=>sharp(bytes).resize(w,h,{fit:'cover'}).png().toBuffer());
 await processing(runtime,id,k,'artwork-saved',{sourceFile:sourceName,sourceSha256:hash(source)});
 if(!fields.length)return {document:structuredClone(planned),photo:source,evidence:{version:1,status:'image-only',sourceSha256:hash(source),imageCallsRequired:1}};
 const phraseFile='composed-phrases-'+k+'.json';await runtime.store.save(id,phraseFile,fields.map(f=>f.text));
 let ocr=await require('./review').ocr(path.join(dir,sourceName),path.join(dir,phraseFile));if(ocr.status!=='measured')throw Error('Complete artwork saved. Text separation requires available local OCR; no repair was dispatched.');
 await processing(runtime,id,k,'assigning-copy-regions');let selected=quality>=11?require('./saved-copy-layout').select(ocr.rows,fields,planned):OCR.select(ocr.rows,fields);await runtime.store.save(id,(selected.assignmentVersion===2?'composed-ocr-assignment2-':'composed-ocr-')+k+'.json',{...ocr,...selected});if(quality>=3&&quality<11&&selected.issues.length){const missing=fields.filter(f=>selected.issues.some(i=>i.fieldId===f.id)),fragments=require('./composed-quality').fragments(ocr.rows,missing),file='composed-fragments-'+k+'.json';if(fragments.length){await runtime.store.save(id,file,[...fields.filter(f=>!missing.includes(f)).map(f=>f.text),...fragments]);const refined=await require('./review').ocr(path.join(dir,sourceName),path.join(dir,file)),selection=OCR.select(refined.rows||[],fields);await runtime.store.save(id,'composed-ocr-fragments-'+k+'.json',{...refined,...selection});if(!selection.issues.length&&selection.matches.length===fields.length){ocr=refined;selected=selection;}}}if(selected.issues.length||selected.matches.length!==fields.length)throw Error('Complete artwork saved; copy regions could not be uniquely measured. '+selected.issues.map(i=>i.fieldId+': '+i.reason).join('; '));
 for(let i=0;i<selected.matches.length;i++)for(let j=i+1;j<selected.matches.length;j++){const a=selected.matches[i].box,b=selected.matches[j].box;if(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y)throw Error('Measured copy fields overlap; complete artwork preserved for review');}
 const raw=await sharp(source).removeAlpha().raw().toBuffer({resolveWithObject:true});if(quality>=11){selected.matches=require('./saved-copy-layout').inkRegions(raw,selected.matches);await runtime.store.save(id,(selected.assignmentVersion===2?'composed-copy-geometry-assignment2-':'composed-copy-geometry-')+k+'.json',selected);}
 const region=M.maskFromMatches(raw,selected.matches);
 const logoBoxes=quality?require('./composed-quality').logos(ocr.rows,planned,(await runtime.brands.read(planned.brandId)).name,{symbolPrefix:job.intake.composedLogoDetectionVersion===2}):[];
 require('./composed-quality').addLogoMask(region,planned,logoBoxes);M.checkRegion(region,w,h);
 assertProtected(selected.matches,planned,region);
 const reconstructionVersion=job.intake.composedLineVersion===1?4:quality>=11?3:quality>=5||job.composedReconstructionRevision?.version===2?2:1;
 if(job.composedReconstructionRevision&&job.composedReconstructionRevision.sourceSha256!==hash(source))throw Error('Reconstruction revision source mismatch');
 const frozenName=(reconstructionVersion===4?(selected.assignmentVersion===2?'composed-frozen-v4-assignment2-':'composed-frozen-v4-'):reconstructionVersion>=3?'composed-frozen-v3-':reconstructionVersion>=2?'composed-frozen-v2-':'composed-frozen-')+k+'.json',identity=hash(JSON.stringify({source:hash(source),planned,fields,...(reconstructionVersion>=2?{reconstructionVersion}: {})}));let frozen,readabilityChecked=false;await processing(runtime,id,k,'reconstructing-editable-text',{assignmentVersion:selected.assignmentVersion||1});
 try{frozen=await fs.readJson(path.join(dir,frozenName));if(frozen.identity!==identity)throw Error('Frozen typography belongs to a different source');}catch(e){if(e.code!=='ENOENT')throw e;frozen={version:reconstructionVersion,...(reconstructionVersion===4?{fontApproximationPolicy:{version:1,maximumFraction:require('./font-approximation').maximumFraction}}:{}),identity,document:await reconstruct(runtime,id,planned,source,selected.matches,reconstructionVersion)};if(quality>=6){require('./composed-quality').assertReadable(frozen.document);await require('./composed-readability').inspect(runtime,id,k,frozen.document,source,region,selected.matches);readabilityChecked=true;}await runtime.store.save(id,frozenName,frozen);}
 if(quality>=11)require('./saved-copy-layout').assertCopy(frozen.document,fields);
 if(quality>=3)require('./composed-quality').assertReadable(frozen.document);
 if(quality>=6&&!readabilityChecked)await require('./composed-readability').inspect(runtime,id,k,frozen.document,source,region,selected.matches);
 await processing(runtime,id,k,'repairing-background');const size=M.paddedSize(w,h),padded=await sharp(source).extend({right:size.width-w,bottom:size.height-h,background:'#808080'}).png().toBuffer(),paddedRegion=Buffer.alloc(size.width*size.height);for(let y=0;y<h;y++)region.copy(paddedRegion,y*size.width,y*w,(y+1)*w);
 const mask=await M.pngMask(paddedRegion,size.width,size.height),anchorName='composed-anchor-'+k+'.png',maskName='composed-mask-'+k+'.png';await runtime.store.save(id,anchorName,padded);await runtime.store.save(id,maskName,mask);
 await runtime.store.save(id,'composed-binding-'+k+'.json',{version:1,brandId:planned.brandId,scope,sourceName:anchorName,sourceSha256:hash(padded),maskName,maskSha256:hash(mask),originalSourceSha256:hash(source)});
 const editRequest={scope,size:size.width+'x'+size.height,quality:'high',requestKey:hash(id+'|composed-mask-v1|'+k),mask,attachments:[{assetId:'composed-artwork-anchor',ownership:'generated-project-reference',roles:['visual-style'],sha256:hash(padded),imageData:'data:image/png;base64,'+padded.toString('base64')}],prompt:(logoBoxes.length?'Also remove the entire generated campaign logo inside its masked rectangle. Preserve product labels and their branding. ':'')+'Inpaint only transparent masked campaign letter pixels, including antialiasing and shadows. Remove these exact phrases: '+JSON.stringify(fields.map(f=>f.text))+'. Reconstruct the surrounding real surface seamlessly. Match nearby texture, lighting, colour and edges. No letters, text-shaped shadows, replacement panels, blur or new logos. Preserve all unmasked pixels, product geometry and markings. Preserve button shapes and decorative arrows. Keep identical framing and dimensions. Do not resize or relight. Bottom/right padding must remain unchanged.'};
 const edited=await cachedImage(runtime,id,'composed-removed-'+k+'.png',editRequest,budget,async b=>b),repaired=await M.restore(padded,edited,paddedRegion),photo=await sharp(repaired.bytes).extract({left:0,top:0,width:w,height:h}).png().toBuffer();
 const cleanName='composed-clean-'+k+'.png';await runtime.store.save(id,cleanName,photo);const cleanOcr=await require('./review').ocr(path.join(dir,cleanName));if(cleanOcr.status!=='measured')throw Error('Repaired background saved; local OCR verification unavailable');if(quality&&require('./composed-quality').logos(cleanOcr.rows,planned,(await runtime.brands.read(planned.brandId)).name).length)throw Error('Generated campaign logo remains after repair');const residual=quality>=11?{matches:require('./saved-copy-layout').residual(cleanOcr.rows,selected.matches)}:OCR.select(cleanOcr.rows,fields);if(residual.matches.length)throw Error('Campaign lettering remains after masked repair; original artwork preserved');
 if(quality>=6)await require('./composed-readability').inspect(runtime,id,k,frozen.document,photo,Buffer.alloc(w*h),selected.matches,'clean');
 const doc=structuredClone(frozen.document);assertFrozen(frozen.document,doc);
 const evidence={version:1,...(quality>=11?{copySource:'saved-exact-copy',geometrySource:'detected-text-regions',reconstructionVersion}:{}),status:'reconstructed-needs-review',logoBoxes,cleanName,cleanOcr,sourceName,sourceSha256:hash(source),frozenTypographyFile:frozenName,maskName,maskSha256:hash(mask),...repaired,bytes:undefined,backgroundSha256:hash(photo),fontApproximation:true,automaticTypographyChanges:false,reviewRequired:true};await runtime.store.save(id,'composed-repair-'+k+'.json',evidence);await processing(runtime,id,k,'editable-composition-prepared',{sourceSha256:hash(source),reviewRequired:true});return {document:doc,photo,evidence};
}
module.exports={sourceRequest,assertProtected,assertFrozen,prompt,reconstruct,prepare};
