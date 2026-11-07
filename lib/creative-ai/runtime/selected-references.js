'use strict';
const fs=require('./artifact-fs'),path=require('path');
async function apply(request,context,{version=0,verbalBrandStyleVersion=0}={}){
 if(verbalBrandStyleVersion===1)return request;
 if(!['concepts','art','reconciliation'].includes(request.contextKind)||!context.selectedReferenceIds?.length)return request;
 const job=JSON.parse(await fs.readFileRaw(path.join(context.dir,'job.json'),'utf8'));
 const researchFile=path.join(context.dir,job.artifacts.currentResearchFile||'research-product-evidence.json');
 const research=[2,3].includes(version)?await require('./stage-context').readSelected(researchFile,raw=>({dossier:{assets:(raw.dossier?.assets||[]).filter(a=>context.selectedReferenceIds.includes(a.id))}}),{brandId:context.scope.brandId}):JSON.parse(await fs.readFile(researchFile,'utf8'));
 if(job.intake.brandId!==context.scope.brandId)throw Error('Selected reference workspace mismatch');
 const refs=context.selectedReferenceIds.map(id=>{const a=research.dossier.assets.find(a=>a.id===id);if(!a||a.brandId&&a.brandId!==context.scope.brandId||typeof a.imageData!=='string')throw Error('Selected reference unavailable in this brand research: '+id);return {id:a.id,label:a.label,imageData:a.imageData};});
 const images=request.images||[],ordered=[...images.filter(a=>a.id.startsWith('approved-logo-')),...images.filter(a=>a.id.startsWith('sku-product-image-')).slice(0,2),...refs,...images];
 const seen=new Set(),selected=ordered.filter(a=>!seen.has(a.id)&&seen.add(a.id)).slice(0,8);
 if(refs.some(r=>!selected.some(a=>a.id===r.id)))throw Error('Selected references exceed this stage’s image capacity');
 return {...request,images:selected};
}
module.exports={apply};
