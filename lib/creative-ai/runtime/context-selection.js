'use strict';
// Explicit scope only. Unknown applicability is retained, never guessed from
// prose. This is a wire view; validators and saved history keep full originals.
const focused=require('./focused-context');
const downstream=new Set(['concepts','copy','art','reconciliation','review']);
function select(stage,input,{images=[],selectedReferenceIds=[]}={}){
 const out=focused.clean(input),changes=[];
 const unit=input.affectedUnit;
 const placements=new Set(unit?.placementId?[unit.placementId]:(input.placements||[]).map(p=>p.id||p.selection?.id).filter(Boolean));
 const conceptId=unit?.conceptId;
 const productIds=new Set();
 function collect(v){if(!v||typeof v!=='object')return;for(const [key,x]of Object.entries(v)){
  if(key==='requiredSkuAssetIds'&&Array.isArray(x))x.forEach(id=>productIds.add(id));
  else if(key==='productReference'&&x?.referenceAssetIds)x.referenceAssetIds.forEach(id=>productIds.add(id));
  else if(x&&typeof x==='object')collect(x);
 }}collect(input);
 const requiredRefs=new Set(selectedReferenceIds);
 function references(v){if(!v||typeof v!=='object')return;for(const [key,x]of Object.entries(v)){
  if(['assetIds','referenceAssetIds','requiredSkuAssetIds'].includes(key)&&Array.isArray(x))x.forEach(id=>requiredRefs.add(id));
  else if(key==='assetId'&&typeof x==='string')requiredRefs.add(x);
  else if(x&&typeof x==='object'&&!['assets','brandResearch','research'].includes(key))references(x);
 }}references(input);
 function relevant(row){
  if(!row||typeof row!=='object')return true;
  if(row.mandatory===true||row.locked===true||requiredRefs.has(row.id))return true;
  // Only expressly advisory references can be removed by applicability.
  if(row.optional!==true&&row.authority!=='advisory')return true;
  const a=row.applicability;if(!a)return true;
  if(a.stages?.length&&!a.stages.includes(stage))return false;
  if(placements.size&&a.placementIds?.length&&!a.placementIds.some(id=>placements.has(id)))return false;
  return true;
 }
 const matches=row=>!row||typeof row!=='object'||(!row.placementId||!placements.size||placements.has(row.placementId))&&(!conceptId||!row.conceptId||row.conceptId===conceptId);
 function walk(v,path=''){
  if(!v||typeof v!=='object')return;
  if(downstream.has(stage)&&Array.isArray(v.alternatives)&&v.selection?.directionId){
   const chosen=v.alternatives.find(a=>a.id===v.selection.directionId);
   if(chosen){v.selectedAlternative=chosen;changes.push({path:path+'.alternatives',reason:'selected-direction',removed:v.alternatives.length-1});delete v.alternatives;}
  }
  for(const [key,value]of Object.entries(v)){
   if(Array.isArray(value)){
    let kept=value;
    if((unit||placements.size)&&['decks','existingDecks','copy','drafts','specifications'].includes(key))kept=kept.filter(matches);
    if(conceptId&&key==='concepts')kept=kept.filter(c=>c.conceptId===conceptId);
    if(placements.size&&key==='placements')kept=kept.filter(p=>placements.has(p.id||p.selection?.id));
    if(['assets','optionalReferences','examples'].includes(key))kept=kept.filter(relevant);
    if(key==='assets'&&productIds.size)kept=kept.filter(a=>!(a.kind==='product'||a.id?.startsWith('sku-product-image-'))||productIds.has(a.id)||requiredRefs.has(a.id));
    if(kept.length!==value.length){changes.push({path:path+'.'+key,reason:'explicit-scope',removed:value.length-kept.length});v[key]=kept;}
   }
   if(v[key]&&typeof v[key]==='object')walk(v[key],path+'.'+key);
  }
 }walk(out);
 // Do not trim collection plans: cross-slide sequence/continuity is required.
 // Only catalogued product/optional images may be omitted. Review render and
 // derived-detail attachments have specialized identities and remain intact.
 const catalog=new Map();function inventory(v){if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if(k==='assets'&&Array.isArray(x))for(const a of x)catalog.set(a.id,a);else if(x&&typeof x==='object')inventory(x);}}inventory(input);
 const selected=images.filter(a=>{const meta=catalog.get(a.id);if(!meta)return true;if(!relevant(meta))return false;return !productIds.size||!(meta.kind==='product'||a.id?.startsWith('sku-product-image-'))||productIds.has(a.id)||requiredRefs.has(a.id);});
 return {input:out,images:selected,metrics:{version:2,stage,changes,imagesBefore:images.length,imagesAfter:selected.length,scope:unit||{placementIds:[...placements]},policy:'Explicit scope only; mandatory and unknown-applicability evidence retained.'}};
}
module.exports={select};
