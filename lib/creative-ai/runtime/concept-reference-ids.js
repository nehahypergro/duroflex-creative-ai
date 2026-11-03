'use strict';
// Library imports retain their source ID alongside a namespaced raster ID.
// Resolve only that explicit, unique relationship in this assignment's inventory.
function bind(core,input){
 const selected=new Set(input.referenceCreativeIds||[]),sources=new Set(input.strategyInput.research.sources.map(s=>s.id));
 const assets=input.strategyInput.research.assets;
 for(const concept of core.concepts||[])if(concept.evidence?.referenceCreativeIds){
  concept.evidence.referenceCreativeIds=[...new Set(concept.evidence.referenceCreativeIds.map(id=>{
   if(selected.has(id)||!sources.has(id))return id;
   const matches=assets.filter(a=>a.id==='supplied-asset-library-'+id&&selected.has(a.id)&&a.sourceIds?.includes(id)&&typeof a.imageData==='string'&&a.imageData.startsWith('data:image/'));
   return matches.length===1?matches[0].id:id;
  }))];
 }
 return core;
}
module.exports={bind};
