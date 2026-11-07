'use strict';
// Reuse already interpreted brand evidence. This module performs no AI calls.
const fs=require('./artifact-fs'),path=require('path'),crypto=require('crypto');
const VERSION=1,hash=v=>crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const policy='Use the saved verbal brand style below for look and feel. Library inspiration pixels are not attached and must not be requested again during campaign planning or generation. Observations and draft guidance are suggestions, not mandatory requirements or product proof. Adapt the setting to this brief and exact product; do not mechanically reproduce a reference bedroom. Do not claim to have inspected missing pixels. Exact SKU photos, identity assets, current artwork and repair masks remain separate visual evidence.';
function inspiration(research){
 const protectedIds=new Set(research.productBriefEvidence?.assetIds||[]);
 return (research.dossier.assets||[]).filter(a=>['reference','creative','screenshot'].includes(a.kind)&&!protectedIds.has(a.id)&&!a.id.startsWith('sku-product-image-'));
}
function compile({research,guardian,scope=research.brandKnowledge}){
 if(!scope?.brandId)throw Error('Verbal brand style requires a named brand scope');
 require('./brand-isolation').bindResearch(structuredClone(research),scope);
 const sourceRows=research.dossier.sources.filter(s=>!['product','user'].includes(s.kind)),sourceIds=new Set(sourceRows.map(s=>s.id));
 const scoped=rows=>(rows||[]).filter(r=>r.sourceIds?.length&&r.sourceIds.every(id=>sourceIds.has(id)));
 const guide=require('./brand-guide-cache').scopeGuide(guardian,scope.draftDocumentIds||[]);
 const excluded=inspiration(research),retainedHashes=new Set(research.dossier.assets.filter(a=>!excluded.includes(a)&&a.imageData).map(a=>hash(a.imageData)));
 const profile={version:VERSION,brandId:scope.brandId,revision:scope.revision,brandName:research.dossier.brandName,
  policy,requirements:scoped(guide.requirements),preferences:scoped(guide.preferences),visualRules:scoped(guide.visualRules),
  observations:scoped(research.dossier.findings).filter(f=>f.section==='creative').map(({assetIds,...f})=>f),
  sources:sourceRows,
  excludedReferences:excluded.map(a=>({id:a.id,sourceIds:a.sourceIds||[],...(a.imageData&&!retainedHashes.has(hash(a.imageData))?{sha256:hash(a.imageData)}:{})})),
  coverage:'Saved research observations and interpreted guidance only. Uninspected images are not represented as newly understood. Source refresh is required when brand material changes.'};
 // Source pixels affect invalidation, but are never stored in the text profile.
 const sourceBinding=hash({research:require('./focused-context').clean(research.dossier),imageHashes:research.dossier.assets.map(a=>({id:a.id,hash:a.imageData?hash(a.imageData):null})),scope});
 const key=hash({sourceBinding,profile});return {...profile,sourceBinding,key,contentHash:hash(profile)};
}
function validate(profile,scope){
 const {key,sourceBinding,contentHash,...content}=profile;
 if(profile.version!==VERSION||profile.brandId!==scope.brandId||profile.revision!==scope.revision||hash(content)!==contentHash||hash({sourceBinding,profile:content})!==key)throw Error('Verbal brand style scope or content changed');
 require('./brand-isolation').assertContext(profile,scope);return profile;
}
async function prepare({research,guardian,scope=research.brandKnowledge,directory}){
 const profile=compile({research,guardian,scope});
 if(!directory)return {profile,cache:{status:'compiled',key:profile.key}};
 const file=path.join(directory,'style-'+profile.key+'.json');
 try{const saved=await fs.readJson(file);validate(saved,scope);if(saved.key!==profile.key)throw Error('Verbal brand style key mismatch');return {profile:saved,cache:{status:'reused',key:profile.key}};}catch(e){if(e.code!=='ENOENT')throw e;}
 await fs.mkdir(directory,{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.pending';await fs.writeFile(temp,JSON.stringify(profile)+'\n');await fs.rename(temp,file);
 return {profile,cache:{status:'created',key:profile.key}};
}
function project(research,profile){
 const out=structuredClone(research),excluded=new Set(profile.excludedReferences.map(a=>a.id));
 out.dossier.assets=out.dossier.assets.filter(a=>!excluded.has(a.id));
 for(const finding of out.dossier.findings||[])if(finding.assetIds)finding.assetIds=finding.assetIds.filter(id=>!excluded.has(id));
 return out;
}
function instructions(profile){
 if(!profile)return '';
 // Concept/art direction already receive the written guide and observations.
 // Generation executes their selected direction, not the entire guide again.
 return 'Brand inspiration is verbal-only. Execute the selected look and feel in the approved art direction below. Do not request or reconstruct absent library references. Treat observed style and draft guidance as suggestions, not mandatory rules or product proof. Exact SKU, identity and current-artwork attachments remain visual evidence.';
}
function assertAttachments(attachments,profile,{brandStyleExecutionHashes=[]}={}){
 if(!profile)return;
 const ids=new Set(profile.excludedReferences.map(a=>a.id)),hashes=new Set(profile.excludedReferences.map(a=>a.sha256).filter(Boolean));
 const execution=new Set(brandStyleExecutionHashes);
 for(const a of attachments||[])if(ids.has(a.assetId||a.id)||a.imageData&&hashes.has(hash(a.imageData))&&!execution.has(hash(a.imageData))){const e=Error('Inspiration images are verbal-only for this project: '+(a.assetId||a.id));e.code='STYLE_REFERENCE_PIXELS_DISABLED';throw e;}
}
async function apply(runtime,job,research,guardian,baseResearch=research){
 if(job.verbalBrandStyleVersion!==VERSION)return research;
 const scope=job.intake.brandKnowledge;
 const result=await prepare({research:baseResearch,guardian,scope,directory:path.join(runtime.brands.dir(scope.brandId),'knowledge-cache')});
 const projected=project(research,result.profile);
 // A selected product photo can also occur in the inspiration archive. Trust
 // only execution pixels from the server-owned SKU/identity handoff, not a
 // caller's relabelling of arbitrary reference images.
 const productIds=new Set(projected.productBriefEvidence?.assetIds||[]);
 const executionHashes=projected.dossier.assets.filter(a=>a.imageData&&(a.kind==='product'||a.kind==='logo'||productIds.has(a.id))).map(a=>hash(a.imageData));
 await runtime.store.save(job.id,'verbal-brand-style.json',result.profile);
 await runtime.store.save(job.id,'verbal-brand-style-cache.json',result.cache);
 await runtime.store.save(job.id,'research-verbal-style.json',projected);
 await runtime.store.update(job.id,j=>{j.brandStyleMemory=result.profile;j.brandStyleExecutionHashes=[...new Set(executionHashes)];j.artifacts.currentResearchFile='research-verbal-style.json';return j;});
 return projected;
}
module.exports={VERSION,policy,prepare,compile,validate,project,instructions,assertAttachments,apply};
