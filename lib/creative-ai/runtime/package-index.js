'use strict';
// The per-unit package files retain complete upstream context and actual rasters.
// This overview must not duplicate those large payloads a second time.
function index(packages){return {...packages,storageFormat:'per-unit-package-index-v1',records:packages.records.map(record=>{
 const {upstreamContext,attachmentManifest,...summary}=record;
 return {...summary,packageFile:'package-'+record.route+'-'+record.placementId+'-0.json',upstreamContextReference:'art-input.json',attachmentManifest:attachmentManifest.map(({imageData,...asset})=>({...asset,rasterStorage:'See complete per-unit package attachmentManifest; bytes omitted from overview only.'}))};
})};}
module.exports={index};
