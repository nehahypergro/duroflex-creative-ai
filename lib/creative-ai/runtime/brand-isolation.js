'use strict';
const fs=require('./artifact-fs'),path=require('path'),crypto=require('crypto');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const host=value=>new URL(value).hostname.toLowerCase().replace(/^www\./,'');
function blocked(message){const error=Error('Brand isolation: '+message);error.code='BRAND_ISOLATION';throw error;}

// This snapshot is assembled by the server, never accepted from a browser brief.
async function snapshot(intake,brands){
 if(!intake.brandId)return null;
 const brand=await brands.read(intake.brandId);
 if(host(intake.brandUrl)!==host(brand.brandUrl))blocked('the URL belongs to a different workspace.');
 return {version:1,brandId:brand.id,brandName:brand.name,brandUrl:brand.brandUrl,
  revision:brands.revision(brand),documentIds:brand.documents.map(d=>d.id),assetIds:(brand.assets||[]).map(a=>a.id),
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
 checkAccess(){return this.provider.checkAccess();}
 async context(budget){
  if(!budget?.brandContext)return null;
  const {intake,dir,preferenceMemory}=await budget.brandContext();
  let scope=intake.brandKnowledge||await snapshot(intake,this.brands);
  if(scope&&intake.canvasAssets){
   const registry=intake.canvasAssets;if(registry.brandId!==scope.brandId)blocked('canvas assets belong to a different brand.');
   const ids=[];for(const asset of [...(registry.fonts||[]),...(registry.logos|| (registry.logo?[registry.logo]:[]))]){
    if(asset.brandId!==scope.brandId||asset.approved!==true||!/^asset-[a-f0-9]{24}\.(woff2?|ttf|otf|png|jpg|webp|svg)$/.test(asset.filename)||asset.id!==asset.filename.split('.')[0])blocked('invalid pinned canvas asset.');
    let bytes;try{bytes=await fs.readFile(path.join(this.brands.dir(scope.brandId),'canvas-assets',asset.filename));}catch{blocked('a pinned canvas asset is unavailable.');}
    if(hash(bytes)!==asset.sha256)blocked('a pinned canvas asset changed.');ids.push(asset.id);
   }
   scope={...scope,assetIds:[...new Set([...(scope.assetIds||[]),...ids])]};
  }
  if(scope){if(scope.brandId!==intake.brandId||host(scope.brandUrl)!==host(intake.brandUrl))blocked('the job and knowledge snapshot differ.');assertContext(intake.brandContext,scope);}
  if(preferenceMemory)assertContext(preferenceMemory,scope);return scope?{scope,dir,preferenceMemory,selectedReferenceIds:intake.selectedReferenceIds||[]}:null;
 }
 async reason(request,budget){
  const context=await this.context(budget);if(!context)return this.provider.reason(request,budget);
  request=await require('./selected-references').apply(request,context);
  assertContext(request.input,context.scope);assertContext(request.wire?.input,context.scope);assertContext(request.images,context.scope);
  const sceneModule=require('./client-scene-policy'),scenePolicy=request.sceneReview?sceneModule.fromMemory(context.preferenceMemory):null;
  if(!request.preferenceConsumer)context.preferenceMemory=null;
  const scoped={brandKnowledge:context.scope,...(scenePolicy?{clientScenePolicy:scenePolicy}:{}),...(context.preferenceMemory?{clientPreferenceMemory:require('./preference-memory').relevant(context.preferenceMemory,request)}:{})};
  return this.provider.reason({...request,rolePacketDirectory:this.brands.dir?path.join(this.brands.dir(context.scope.brandId),'role-packets'):undefined,instructions:request.instructions+'\n'+instructions(context.scope)+(context.preferenceMemory?'\n'+require('./preference-memory').policy:'')+(scenePolicy?'\n'+sceneModule.reviewInstructions:''),input:{...request.input,...scoped},...(request.wire?{wire:{...request.wire,instructions:(request.wire.instructions||request.instructions)+'\n'+instructions(context.scope)+(context.preferenceMemory?'\n'+require('./preference-memory').policy:'')+(scenePolicy?'\n'+sceneModule.reviewInstructions:''),input:{...(request.wire.input||request.input),...scoped}}}:{})},budget);
 }
 async generate(request,budget){
  const context=await this.context(budget);if(!context)return this.provider.generate(request,budget);
  assertContext(request.attachments,context.scope);
  // IDs such as official-image-1 recur across brands; verify actual bytes, not IDs.
  const allowed=new Set();
  for(const file of await fs.readdir(context.dir))if(/^(research(?:-[a-z0-9-]+)?|corrected-research-[a-z0-9-]+)\.json$/.test(file)){
   const research=bindResearch(JSON.parse(await fs.readFile(path.join(context.dir,file),'utf8')),context.scope);
   for(const asset of research.dossier?.assets||[])if(asset.imageData)allowed.add(hash(asset.imageData));
  }
  for(const asset of request.attachments||[])if(asset.assetId==='carousel-style-anchor'&&asset.ownership==='generated-project-reference'){
   let job;try{job=JSON.parse(await fs.readFile(path.join(context.dir,'job.json'),'utf8'));}catch{blocked('the carousel style anchor has no saved job provenance.');}
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
   const binding=JSON.parse(await fs.readFile(path.join(context.dir,'creative-edit-anchor.json'),'utf8'));
   const child=JSON.parse(await fs.readFile(path.join(context.dir,'job.json'),'utf8'));
   const parentDir=path.resolve(context.dir,'../..'),parent=JSON.parse(await fs.readFile(path.join(parentDir,'job.json'),'utf8'));
   if(path.basename(parentDir)!==binding.parentId||parent.id!==binding.parentId||child.refinement?.parentId!==parent.id||parent.intake.brandId!==context.scope.brandId||binding.brandId!==context.scope.brandId||binding.route!==request.scope?.route||binding.placementId!==request.scope?.placementId||binding.sourceVersionId!==child.refinement.sourceVersionId||asset.roles?.length!==1||asset.roles[0]!=='visual-style')blocked('the edit reference does not belong to this brand, campaign and creative.');
   if(!/^static-[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(binding.name))blocked('invalid saved edit reference.');
   let sourceDir=parentDir,source=parent;
   if(binding.sourceVersionId!=='original'){
    if(!/^creative-[a-f0-9-]{36}$/.test(binding.sourceVersionId))blocked('invalid source version.');
    sourceDir=path.join(parentDir,'refinements',binding.sourceVersionId);source=JSON.parse(await fs.readFile(path.join(sourceDir,'job.json'),'utf8'));
    if(source.intake.brandId!==context.scope.brandId||source.refinement?.parentId!==parent.id||source.status!=='finished')blocked('the source version is outside this campaign.');
   }
   if(!source.results.some(r=>r.route===binding.route&&r.placementId===binding.placementId&&r.imageUrl?.split('/').pop()===binding.name))blocked('the source image is not the selected creative.');
   const bytes=await fs.readFile(path.join(sourceDir,binding.name)),mime=binding.name.endsWith('.jpg')?'jpeg':binding.name.endsWith('.webp')?'webp':'png',data='data:image/'+mime+';base64,'+bytes.toString('base64');
   if(binding.sha256!==hash(bytes)||asset.sha256!==binding.sha256||asset.imageData!==data)blocked('the edit reference bytes changed.');allowed.add(hash(data));
  }
  if((request.attachments||[]).some(asset=>!asset.imageData||!allowed.has(hash(asset.imageData))))blocked('a generation attachment was not collected for this brand and job.');
  // Dispatch has already verified the full pinned manifest and attachment bytes.
  // The renderer needs the boundary and preference text, not their audit history.
  const {brandId,brandName,brandUrl,revision,visualGuidance}=context.scope;
  const memory=require('./preference-memory').relevant(context.preferenceMemory,request);
  const renderMemory=memory?{brandId:memory.brandId,revision:memory.revision,preferences:memory.preferences.map(({id,scope,productUrl,placementId,text})=>({id,scope,productUrl,placementId,text}))}:null;
  return this.provider.generate({...request,prompt:instructions({brandId,brandName,brandUrl,revision,visualGuidance})+(renderMemory?'\n'+require('./preference-memory').policy+'\nClient preference memory: '+JSON.stringify(renderMemory):'')+'\n\n'+request.prompt},budget);
 }
}
module.exports={snapshot,instructions,assertContext,bindResearch,BrandScopedProvider};
