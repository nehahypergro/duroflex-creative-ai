'use strict';
const fs=require('./artifact-fs'),storage=require('./reference-storage'),path=require('path'),crypto=require('crypto');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const host=value=>new URL(value).hostname.toLowerCase().replace(/^www\./,'');
function blocked(message){const error=Error('Brand isolation: '+message);error.code='BRAND_ISOLATION';throw error;}

// This snapshot is assembled by the server, never accepted from a browser brief.
async function snapshot(intake,brands){
 if(!intake.brandId)return null;
 const brand=await brands.read(intake.brandId);
 if(host(intake.brandUrl)!==host(brand.brandUrl))blocked('the URL belongs to a different workspace.');
 return {version:1,brandId:brand.id,brandName:brand.name,brandUrl:brand.brandUrl,
  documentAuthorityVersion:1,draftDocumentIds:brand.documents.filter(d=>d.draft===true).map(d=>d.id),revision:brands.revision(brand),documentIds:brand.documents.map(d=>d.id),assetIds:(brand.assets||[]).map(a=>a.id),
  visualGuidance:brand.documents.some(d=>d.kind==='visual')||(brand.assets||[]).some(a=>a.status==='visual-reference'&&['brand-books','visual-guidelines'].includes(a.category))||Boolean(intake.guideline)?'supplied':'website-observations-only'};
}
function instructions(scope){return 'BRAND KNOWLEDGE BOUNDARY\n'+JSON.stringify(scope)+
 '\nStart a fresh visual and verbal brief for this brand. Use only this workspace’s supplied knowledge, official research, selected product evidence and current user brief. Never inherit another brand’s palette, interiors, lighting, typography, positioning, tone or previous campaign decisions. General design and placement principles are shared practice, not brand rules. Source every brand-specific choice to this brand’s supplied evidence; label unsourced creative choices as proposals. If visualGuidance is website-observations-only, no brand-world guide has been supplied: observed website patterns are preferences and creative choices are inferences. Do not borrow a guide from another workspace or present inferred styling as approved brand rules.';
}
function assertContext(value,scope){
 if(!value||typeof value!=='object')return;
 if(value.brandId&&value.brandId!==scope.brandId)blocked('knowledge belongs to a different brand workspace.');
 if(value.documentIds&&value.brandId&&value.documentIds.some(id=>!scope.documentIds.includes(id)))blocked('a document belongs to another workspace.');
 if(typeof value.documentId==='string'&&/^doc-/.test(value.documentId)&&!scope.documentIds.includes(value.documentId))blocked('a document reference belongs to another workspace.');
 if(value.kind&&['site','product'].includes(value.kind)&&value.reference&&/^https?:/i.test(value.reference)&&host(value.reference)!==host(scope.brandUrl))blocked('official website/product evidence belongs to a different brand.');
 if(typeof value.id==='string'&&/^doc-/.test(value.id)&&!scope.documentIds.includes(value.id))blocked('a document is outside the selected workspace.');
 if(value.assetIds&&value.brandId&&value.assetIds.some(id=>!(scope.assetIds||[]).includes(id)))blocked('an asset belongs to another workspace.');
 if(typeof value.id==='string'&&/^asset-/.test(value.id)&&!(scope.assetIds||[]).includes(value.id))blocked('an asset is outside the selected workspace.');
 if(value.sourceIds?.some(id=>/^asset-/.test(id)&&!(scope.assetIds||[]).includes(id)))blocked('an asset cites another workspace’s source.');
 if(value.sourceIds?.some(id=>/^doc-/.test(id)&&!scope.documentIds.includes(id)))blocked('an asset or finding cites another workspace’s document.');
 if(value.url?.startsWith('brand-config:')&&value.url!=='brand-config:'+scope.brandId)blocked('configured guidance belongs to a different workspace.');
 for(const [key,child] of Object.entries(value))if(!['imageData','data','locator'].includes(key)&&child&&typeof child==='object')assertContext(child,scope);
}
function bindResearch(research,scope){
 if(!scope||!research?.dossier)return research;
 assertContext(research,scope);
 if(research.brandKnowledge&&research.brandKnowledge.revision!==scope.revision)blocked('research and the pinned knowledge revision differ.');
 research.brandKnowledge=structuredClone(scope);
 for(const item of [...(research.dossier.sources||[]),...(research.dossier.assets||[])])item.brandId=scope.brandId;
 return research;
}

// The shared provider is stateless. Resolve the scope from each call's job budget,
// so simultaneous brands, corrections and resumed runs cannot inherit a last brand.
class BrandScopedProvider{
 constructor(provider,brands){this.provider=provider;this.brands=brands;}
 checkAccess(budget){return this.provider.checkAccess(budget);}
 async context(budget){
  if(!budget?.brandContext)return null;
  const {intake,dir,preferenceMemory,brandStyleMemory,brandStyleExecutionHashes}=await budget.brandContext();
  let scope=intake.brandKnowledge||await snapshot(intake,this.brands);
  if(scope&&intake.canvasAssets){
   const registry=intake.canvasAssets,lean=intake.leanWorkflowVersion===1&&!intake.editableCanvas;
   // Early lean snapshots omitted the registry-level ID. Keep their saved
   // inputs intact and verify every pinned item below; explicit mismatches
   // still reject. Raster fonts are named instructions, not editor binaries.
   if(registry.brandId!==scope.brandId&&!(lean&&registry.brandId===undefined))blocked('canvas assets belong to a different brand.');
   const ids=[];
   if(lean)for(const font of registry.fonts||[]){
    if(font.brandId!==scope.brandId||font.approved!==true||font.kind!=='font'||!/^asset-[a-f0-9]{24}$/.test(font.id)||!(font.family||font.name)||!font.sourceReference)blocked('invalid pinned raster font.');
    ids.push(font.id);
   }
   for(const asset of [...(lean?[]:registry.fonts||[]),...(registry.logos|| (registry.logo?[registry.logo]:[]))]){
    if(asset.brandId!==scope.brandId||asset.approved!==true||!/^asset-[a-f0-9]{24}\.(woff2?|ttf|otf|png|jpg|webp|svg)$/.test(asset.filename)||asset.id!==asset.filename.split('.')[0])blocked('invalid pinned canvas asset.');
    let bytes;try{bytes=await fs.readFile(path.join(this.brands.dir(scope.brandId),'canvas-assets',asset.filename));}catch{blocked('a pinned canvas asset is unavailable.');}
    if(hash(bytes)!==asset.sha256)blocked('a pinned canvas asset changed.');ids.push(asset.id);
   }
   scope={...scope,assetIds:[...new Set([...(scope.assetIds||[]),...ids])]};
  }
  if(scope){if(scope.brandId!==intake.brandId||host(scope.brandUrl)!==host(intake.brandUrl))blocked('the job and knowledge snapshot differ.');assertContext(intake.brandContext,scope);}
  if(preferenceMemory)assertContext(preferenceMemory,scope);if(brandStyleMemory)require('./verbal-brand-style').validate(brandStyleMemory,scope);return scope?{scope,dir,leanWorkflowVersion:intake.leanWorkflowVersion,preferenceMemory,brandStyleMemory,brandStyleExecutionHashes,selectedReferenceIds:intake.selectedReferenceIds||[]}:null;
 }
 async reason(request,budget){
  const context=await this.context(budget);if(!context)return this.provider.reason(request,budget);
  const contextPolicy=await budget.stageContext?.();
  request=await require('./selected-references').apply(request,context,contextPolicy);
  require('./verbal-brand-style').assertAttachments(request.images,context.brandStyleMemory,context);
  assertContext(request.input,context.scope);assertContext(request.wire?.input,context.scope);assertContext(request.images,context.scope);
  // Creative reference v1 (10 Nov 2026): only this job's own saved reference picture, bound by hash, and only to
  // the reference-reading step (never to planning, review or image generation).
  for(const a of request.images||[])if(a.id==='creative-reference'){
   if(request.contextKind!=='lean-reference')blocked('the reference picture may only be read by the reference step.');
   let job=null;try{job=JSON.parse(await require('node:fs/promises').readFile(require('node:path').join(context.dir,'job.json'),'utf8'));}catch{}
   if(!job||job.intake?.brandId!==context.scope.brandId||!job.intake.creativeReference||hash(Buffer.from(String(a.imageData).split(',')[1]||'','base64'))!==job.intake.creativeReference.sha256)blocked('the reference picture does not match this job.');
  }
  const sceneModule=require('./client-scene-policy'),scenePolicy=request.sceneReview?sceneModule.fromMemory(context.preferenceMemory):null;
  if(!request.preferenceConsumer)context.preferenceMemory=null;
  const modelScope=request.contextKind?.startsWith('lean-')?Object.fromEntries(Object.entries(context.scope).filter(([k])=>!['assetIds','documentIds','draftDocumentIds'].includes(k))):context.scope;
  const scoped={brandKnowledge:modelScope,...(scenePolicy?{clientScenePolicy:scenePolicy}:{}),...(context.preferenceMemory?{clientPreferenceMemory:require('./preference-memory').relevant(context.preferenceMemory,request)}:{})};
  // Full ownership checks above still use the original manifest. The model
  // needs the selected packet's evidence, not every unused library ID twice.
  const promptScope={...context.scope};if(request.contextKind?.startsWith('lean-')||contextPolicy?.planningPacketVersion===1&&['strategy','concepts'].includes(request.contextKind)){delete promptScope.assetIds;delete promptScope.documentIds;}
  return this.provider.reason({...request,rolePacketDirectory:this.brands.dir?path.join(this.brands.dir(context.scope.brandId),'role-packets'):undefined,instructions:request.instructions+'\n'+instructions(promptScope)+(context.preferenceMemory?'\n'+require('./preference-memory').policy:'')+(scenePolicy?'\n'+sceneModule.reviewInstructions:''),input:{...request.input,...scoped},...(request.wire?{wire:{...request.wire,instructions:(request.wire.instructions||request.instructions)+'\n'+instructions(promptScope)+(context.preferenceMemory?'\n'+require('./preference-memory').policy:'')+(scenePolicy?'\n'+sceneModule.reviewInstructions:''),input:{...(request.wire.input||request.input),...scoped}}}:{})},budget);
 }
 imagePrompt(request,context){if(!context)return request.prompt;
  const {brandId,brandName,brandUrl,revision,visualGuidance}=context.scope;
  if(context.leanWorkflowVersion===1&&request.resolvedLeanBrief)return 'BRAND BOUNDARY: '+brandName+' ('+brandId+'). Use only the resolved brief and these same-brand references. Do not borrow another brand’s identity or invent product claims.\n\n'+request.prompt;
  const memory=require('./preference-memory').relevant(context.preferenceMemory,request);
  const renderMemory=memory?{brandId:memory.brandId,revision:memory.revision,preferences:memory.preferences.map(({id,scope,productUrl,placementId,text})=>({id,scope,productUrl,placementId,text}))}:null;
  return instructions({brandId,brandName,brandUrl,revision,visualGuidance})+(renderMemory?'\n'+require('./preference-memory').policy+'\nClient preference memory: '+JSON.stringify(renderMemory):'')+(context.brandStyleMemory?'\n'+require('./verbal-brand-style').instructions(context.brandStyleMemory):'')+'\n\n'+request.prompt;
 }
 async preflightImagePrompt(request,budget){const context=await this.context(budget);return require('./image-prompt').prepare(this.imagePrompt(request,context));}
 async generate(request,budget){
  const context=await this.context(budget);if(!context)return this.provider.generate(request,budget);
  require('./verbal-brand-style').assertAttachments(request.attachments,context.brandStyleMemory,context);
  assertContext(request.attachments,context.scope);
  if(request.mask&&!(request.attachments||[]).some(a=>a.assetId==='composed-artwork-anchor'||context.leanWorkflowVersion===1&&(a.assetId==='lean-artwork-anchor'||a.assetId==='lean-edge-anchor'||a.assetId==='creative-edit-anchor'&&a.ownership==='generated-project-reference')))blocked('mask requires a bound same-job composition source');
  // IDs such as official-image-1 recur across brands; verify actual bytes, not IDs.
  // Saved research keeps pictures as hash-bound raster references. Compare their
  // metadata identities and byte-verify only blobs an attachment actually uses:
  // expanding every collected picture per call exhausted the heap (defect #6).
  // Legacy inline research keeps the original whole-string hash comparison.
  const allowed=new Set(),collected=[],referenced=new Map();
  for(const file of await fs.readdir(context.dir))if(/^(research(?:-[a-z0-9-]+)?|corrected-research-[a-z0-9-]+)\.json$/.test(file)){
   const name=path.join(context.dir,file),raw=await fs.readJsonRaw(name),rasters=await storage.inspect(raw,{file:name});
   const research=bindResearch(raw,context.scope);
   for(const asset of research.dossier?.assets||[])if(asset.imageData){
    if(rasters&&storage.isReference(asset.imageData)){const k=storage.identity(asset.imageData);if(!referenced.has(k))referenced.set(k,{value:asset.imageData,rasters});}else allowed.add(hash(asset.imageData));
    collected.push({asset,rasters});
   }
  }
  const pixels=new Map(),logical=(value,rasters)=>{const k=storage.identity(value);if(!pixels.has(k))pixels.set(k,storage.resolve(value,rasters));return pixels.get(k);};
  for(const asset of request.attachments||[])if(asset.derivation){
   // verifyDerived matches id plus raw-byte hash; a reference with another hash cannot match.
   const sources=[];for(const {asset:a,rasters} of collected)if((a.id||a.assetId)===asset.derivation.sourceAssetId){
    if(!(rasters&&storage.isReference(a.imageData)))sources.push(a);else if(a.imageData[storage.tag].sha256===asset.derivation.sourceHash)sources.push({...a,imageData:await logical(a.imageData,rasters)});
   }
   await require('./product-review-images').verifyDerived(asset,sources);allowed.add(hash(asset.imageData));
  }
  for(const asset of request.attachments||[])if(asset.assetId==='carousel-style-anchor'&&asset.ownership==='generated-project-reference'){
   let job;try{job=await fs.readJson(path.join(context.dir,'job.json'));}catch{blocked('the carousel style anchor has no saved job provenance.');}
   if(job.intake?.brandId!==context.scope.brandId)blocked('the carousel anchor belongs to another brand.');
   const target=job.selection?.find(s=>s.id===request.scope?.placementId),opening=job.selection?.find(s=>s.description?.carousel?.id===target?.description?.carousel?.id&&s.description?.carousel?.index===1);
   const result=job.results?.find(r=>r.ready&&r.conceptId===request.scope?.conceptId&&r.placementId===opening?.id);
   const name=result?.imageUrl?.split('/').pop();
   if(!target?.description?.carousel||target.description.carousel.index<=1||!name||!/^static-[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(name)||asset.roles?.length!==1||asset.roles[0]!=='visual-style')blocked('the carousel style anchor must be this concept’s reviewed opening slide.');
   const bytes=await fs.readFile(path.join(context.dir,name)),mime=name.endsWith('.jpg')?'jpeg':name.endsWith('.webp')?'webp':'png',data='data:image/'+mime+';base64,'+bytes.toString('base64');
   if(asset.sha256!==hash(bytes)||asset.imageData!==data)blocked('the carousel style anchor bytes do not match this job’s reviewed slide.');
   allowed.add(hash(data));
  }
  for(const asset of request.attachments||[])if(asset.assetId==='creative-edit-anchor'&&asset.ownership==='generated-project-reference'){
   const binding=await fs.readJson(path.join(context.dir,'creative-edit-anchor.json'));
   const child=await fs.readJson(path.join(context.dir,'job.json'));
   const parentDir=path.resolve(context.dir,'../..'),parent=await fs.readJson(path.join(parentDir,'job.json'));
   if(path.basename(parentDir)!==binding.parentId||parent.id!==binding.parentId||child.refinement?.parentId!==parent.id||parent.intake.brandId!==context.scope.brandId||binding.brandId!==context.scope.brandId||binding.route!==request.scope?.route||binding.placementId!==request.scope?.placementId||binding.sourceVersionId!==child.refinement.sourceVersionId||asset.roles?.length!==1||asset.roles[0]!=='visual-style')blocked('the edit reference does not belong to this brand, campaign and creative.');
   if(!/^static-[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(binding.name))blocked('invalid saved edit reference.');
   let sourceDir=parentDir,source=parent;
   if(binding.sourceVersionId!=='original'){
    if(!/^creative-[a-f0-9-]{36}$/.test(binding.sourceVersionId))blocked('invalid source version.');
    sourceDir=path.join(parentDir,'refinements',binding.sourceVersionId);source=await fs.readJson(path.join(sourceDir,'job.json'));
    if(source.intake.brandId!==context.scope.brandId||source.refinement?.parentId!==parent.id||source.status!=='finished')blocked('the source version is outside this campaign.');
   }
   if(!source.results.some(r=>r.route===binding.route&&r.placementId===binding.placementId&&r.imageUrl?.split('/').pop()===binding.name))blocked('the source image is not the selected creative.');
   const bytes=await fs.readFile(path.join(sourceDir,binding.name)),mime=binding.name.endsWith('.jpg')?'jpeg':binding.name.endsWith('.webp')?'webp':'png',data='data:image/'+mime+';base64,'+bytes.toString('base64');
   if(binding.sha256!==hash(bytes)||asset.sha256!==binding.sha256||asset.imageData!==data)blocked('the edit reference bytes changed.');
   // Annotated image-editor edits (8 Nov 2026): the box mask saved with this child's binding.
   if(binding.maskName){if(binding.maskName!=='ai-edit-mask.png')blocked('invalid saved edit mask.');const mask=await fs.readFile(path.join(context.dir,binding.maskName));if(!Buffer.isBuffer(request.mask)||hash(request.mask)!==binding.maskSha256||hash(mask)!==binding.maskSha256)blocked('the edit mask changed.');await require('./masked-image').validate(request.mask,bytes);}
   else if(request.mask&&!(request.attachments||[]).some(a=>['composed-artwork-anchor','lean-artwork-anchor'].includes(a.assetId)))blocked('unexpected edit mask.');
   allowed.add(hash(data));
  }
  // Pins image (9 Nov 2026): the bound edit anchor with numbered markers, rebuilt here from the
  // anchor bytes and the child's saved marks; only identical bytes are accepted.
  for(const asset of request.attachments||[])if(asset.assetId==='creative-edit-pins'){
   if(asset.ownership!=='generated-project-reference'||asset.roles?.length!==1||asset.roles[0]!=='visual-style')blocked('invalid edit pins image.');
   const anchorRef=(request.attachments||[]).find(a=>a.assetId==='creative-edit-anchor'&&a.ownership==='generated-project-reference');
   if(!anchorRef)blocked('the edit pins image needs its bound edit reference.');
   let binding,child;try{binding=await fs.readJson(path.join(context.dir,'creative-edit-anchor.json'));child=await fs.readJson(path.join(context.dir,'job.json'));}catch{blocked('the edit pins image has no saved binding.');}
   if(binding.pinsName!=='ai-edit-pins.png'||!/^[a-f0-9]{64}$/.test(binding.pinsSha256||'')||binding.brandId!==context.scope.brandId||binding.sha256!==anchorRef.sha256)blocked('the edit pins image is not bound to this edit.');
   const saved=await fs.readFile(path.join(context.dir,binding.pinsName)),data='data:image/png;base64,'+saved.toString('base64');
   if(hash(saved)!==binding.pinsSha256||asset.sha256!==binding.pinsSha256||asset.imageData!==data)blocked('the edit pins image changed.');
   const anchorBytes=Buffer.from(String(anchorRef.imageData).split(',')[1]||'','base64');
   if(hash(anchorBytes)!==binding.sha256)blocked('the edit pins image is not bound to this edit.');
   const rebuilt=await require('./edit-pins').render(anchorBytes,child.refinement?.annotations||[]).catch(()=>null);
   if(!rebuilt||hash(rebuilt)!==binding.pinsSha256)blocked('the edit pins image does not match the saved pins.');
   allowed.add(hash(asset.imageData));
  }
  // Edge fit v1 (10 Nov 2026): the scaled-down anchor and its border mask are re-derived here from this unit's saved
  // original; only identical bytes are sent.
  for(const h of await verifyEdgeAnchor(request,context))allowed.add(h);
  for(const asset of request.attachments||[])if(asset.assetId==='lean-artwork-anchor'){
   const k=require('../art-director').fingerprint([request.scope?.route,request.scope?.placementId]).slice(0,24);
   if(context.leanWorkflowVersion!==1||asset.bindingKey!==k||asset.ownership!=='generated-project-reference'||asset.roles?.length!==1||asset.roles[0]!=='visual-style')blocked('invalid lean artwork anchor');
   const binding=await fs.readJson(path.join(context.dir,'lean-binding-'+k+'.json'));
   if(binding.brandId!==context.scope.brandId||JSON.stringify(binding.scope)!==JSON.stringify(request.scope)||binding.sourceName!=='lean-anchor-'+k+'.png'||(binding.maskName&&binding.maskName!=='lean-mask-'+k+'.png'))blocked('lean artwork belongs to another unit');
   const state=await fs.readJson(path.join(context.dir,'lean-state-'+k+'.json'));
   const source=await fs.readFile(path.join(context.dir,binding.sourceName));
   if(state.original?.sha256!==binding.sourceSha256||hash(source)!==binding.sourceSha256||asset.sha256!==binding.sourceSha256||asset.imageData!=='data:image/png;base64,'+source.toString('base64'))blocked('lean source artwork changed');
   if(binding.maskName){const mask=await fs.readFile(path.join(context.dir,binding.maskName));if(!Buffer.isBuffer(request.mask)||hash(request.mask)!==binding.maskSha256||hash(mask)!==binding.maskSha256)blocked('lean removal mask changed');await require('./masked-image').validate(request.mask,source);}else if(request.mask)blocked('unexpected lean removal mask');
   allowed.add(hash(asset.imageData));
  }
  for(const asset of request.attachments||[])if(asset.assetId==='composed-type-guide'){await require('./composed-type-guide').verify(asset,context,request.scope);allowed.add(hash(asset.imageData));}
  for(const asset of request.attachments||[])if(asset.assetId==='composed-artwork-anchor'){
   const k=require('./editable').key(request.scope?.route,request.scope?.placementId),binding=await fs.readJson(path.join(context.dir,'composed-binding-'+k+'.json'));
   if(binding.brandId!==context.scope.brandId||binding.scope.conceptId!==request.scope.conceptId||binding.scope.route!==request.scope.route||binding.scope.placementId!==request.scope.placementId||binding.sourceName!=='composed-anchor-'+k+'.png'||binding.maskName!=='composed-mask-'+k+'.png'||asset.ownership!=='generated-project-reference'||asset.roles?.length!==1||asset.roles[0]!=='visual-style')blocked('masked artwork belongs to another unit');
   const source=await fs.readFile(path.join(context.dir,binding.sourceName)),mask=await fs.readFile(path.join(context.dir,binding.maskName));
   if(hash(source)!==binding.sourceSha256||asset.sha256!==binding.sourceSha256||asset.imageData!=='data:image/png;base64,'+source.toString('base64')||!Buffer.isBuffer(request.mask)||hash(request.mask)!==binding.maskSha256||hash(mask)!==binding.maskSha256)blocked('masked artwork or mask bytes changed');
   await require('./masked-image').validate(request.mask,source);allowed.add(hash(asset.imageData));
  }
  for(const asset of request.attachments||[])if(asset.assetId==='editable-layout-guide'){await require('./photo-layout-guide').verify(asset,context,request.scope);allowed.add(hash(asset.imageData));}
  // Technology visual v1 (9 Nov 2026): the SKU's official technology picture is a derived PNG of a
  // hash-checked product-library image, not a research picture. Re-derive it here from THIS job's
  // pin (same brand, same product page, same source hash) and accept only identical bytes; another
  // brand's or another SKU's picture, changed bytes or a missing pin are rejected.
  for(const asset of request.attachments||[])if(asset.assetId==='technology-image'){
   if(context.leanWorkflowVersion!==1||asset.roles?.length!==1||asset.roles[0]!=='technology')blocked('invalid technology picture.');
   let job;try{job=await fs.readJson(path.join(context.dir,'job.json'));}catch{blocked('the technology picture has no saved job.');}
   const pin=job.intake?.technologyImage;
   if(!pin||job.intake.brandId!==context.scope.brandId||pin.brandId!==context.scope.brandId)blocked('the technology picture is not pinned to this brand and job.');
   // Regression 9 Nov 2026: without the product library the picture cannot be re-made; say so plainly.
   if(!this.brands?.products)blocked('the technology picture cannot be checked (no product library).');
   let expected;try{expected=await require('./technology-visual').loadImage({brands:this.brands},job.intake);}catch(e){blocked('the technology picture does not belong to this brand and product ('+e.message+').');}
   const data=storage.isReference(asset.imageData)?await storage.hydrate(asset.imageData,{file:path.join(context.dir,'job.json')}):asset.imageData;
   if(!expected||typeof data!=='string'||data!==expected.imageData)blocked('the technology picture bytes changed.');
   allowed.add(hash(data));
  }
  // Label close-up (labelGenerationVersion 1, 9 Nov 2026): a deterministic crop of another attachment
  // in this SAME request (an exact product photo, itself checked below). Re-crop that photo from the
  // saved box and accept only identical bytes.
  for(const asset of request.attachments||[])if(asset.assetId==='label-close-up'){
   const sku=require('../lean/sku-check'),l=asset.labelSource,source=(request.attachments||[]).find(a=>a!==asset&&a.assetId===l?.sourceAssetId);
   if(context.leanWorkflowVersion!==1||asset.roles?.length!==1||asset.roles[0]!=='label'||!source||!source.roles?.includes('product'))blocked('invalid label close-up.');
   const data=storage.isReference(source.imageData)?await storage.hydrate(source.imageData,{file:path.join(context.dir,'job.json')}):source.imageData;
   let expected;try{const bytes=sku.decode(data,l.sourceAssetId);if(hash(bytes)!==l.sourceSha256)throw Error('changed');expected='data:image/png;base64,'+(await sku.cropLabel(bytes,l.box)).toString('base64');}catch{blocked('the label close-up does not match its exact product photo.');}
   if(asset.imageData!==expected)blocked('the label close-up does not match its exact product photo.');
   allowed.add(hash(asset.imageData));
  }
  const pending=[];
  for(const asset of request.attachments||[]){if(!asset.imageData)blocked('a generation attachment was not collected for this brand and job.');if(allowed.has(hash(asset.imageData)))continue;const match=referenced.get(storage.identity(asset.imageData));if(!match)blocked('a generation attachment was not collected for this brand and job.');pending.push(match);}
  // Same prefix and SHA-256 as the saved reference; confirm the stored blob still has those bytes.
  const checked=new Map();for(const {value,rasters} of pending){const k=storage.identity(value);if(!checked.has(k))checked.set(k,storage.verify(value,rasters));await checked.get(k);}
  // Dispatch has already verified the full pinned manifest and attachment bytes.
  // The renderer needs the boundary and preference text, not their audit history.
  return this.provider.generate({...request,prompt:this.imagePrompt(request,context)},budget);
 }
}
async function verifyEdgeAnchor(request,context){
 const allowed=[];
 for(const asset of request.attachments||[])if(asset.assetId==='lean-edge-anchor'){
   const k=require('../art-director').fingerprint([request.scope?.route,request.scope?.placementId]).slice(0,24);
   if(context.leanWorkflowVersion!==1||asset.bindingKey!==k||asset.ownership!=='generated-project-reference'||asset.roles?.length!==1||asset.roles[0]!=='visual-style')blocked('invalid edge anchor');
   const binding=await fs.readJson(path.join(context.dir,'lean-binding-'+k+'.json')),state=await fs.readJson(path.join(context.dir,'lean-state-'+k+'.json'));
   if(binding.kind!=='edge-extend'||binding.brandId!==context.scope.brandId||JSON.stringify(binding.scope)!==JSON.stringify(request.scope)||!state.original||state.original.sha256!==binding.sourceSha256)blocked('edge anchor belongs to another unit');
   const source=await fs.readFile(path.join(context.dir,state.original.filename));if(hash(source)!==binding.sourceSha256)blocked('lean source artwork changed');
   const d=await require('../lean/edge-extend').derive(source,state.original.width,state.original.height,binding.inner);
   if(hash(d.anchor)!==binding.anchorSha256||asset.sha256!==binding.anchorSha256||asset.imageData!=='data:image/png;base64,'+d.anchor.toString('base64'))blocked('edge anchor bytes changed');
   if(!Buffer.isBuffer(request.mask)||hash(request.mask)!==binding.maskSha256||hash(d.mask)!==binding.maskSha256)blocked('edge mask changed');
   allowed.push(hash(asset.imageData));
  }
 return allowed;
}
module.exports={snapshot,instructions,assertContext,bindResearch,BrandScopedProvider,verifyEdgeAnchor};
