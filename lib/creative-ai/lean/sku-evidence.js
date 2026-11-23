'use strict';
// SKU evidence v1 (22 Nov 2026, Neha: "since this is a product led company, they cannot skip on SKU perfectness" →
// "Yes, build all three"). Live 16 Nov designs passed the product check with clear product mistakes:
//  - an Airboost Duo Topper banner said "Two sides" but drew no orange foam side;
//  - an Airboost 6.8 post cut the mattress side open and drew ridged latex.
// Research kept only the first 3 page photos (two of them the same picture at two sizes) and the protected photo was
// a copy of photo 1, so the planner, the image model and the checker saw 1–2 views and never the construction picture.
// New lean jobs pin skuEvidenceVersion 1:
//  - research keeps up to 7 distinct gallery photos of the saved product page (size copies removed);
//  - views: the protected photo plus up to 3 other distinct product photos (clean photos before annotated ones);
//  - construction: the gallery picture the product audit labelled as a cutaway / layers / construction picture,
//    attached separately to the planner, the image model and the checker;
//  - the planner is told whether that picture exists (no picture → never show the inside), and the check asks
//    "Product inside and layers" (a layout finding, so a clear error gets the one redraw).
// No extra paid step. Never crosses products or brands: only this job's own research photos are used.
const VERSION=1,VIEWS=4;
const CONSTRUCTION=/\b(cut-?aways?|cross[- ]?sections?|layers?|layered|exploded|construction|core)\b/i;
// A layers diagram beats a whole-product render that only shows a small cutaway (replay on 119 saved photo labels).
const LAYERS=/\b(exploded|layers?|layered|construction|cross[- ]?sections?)\b/i;
const ANNOTATED=/\b(infographic|annotat\w*|dimensions?|chart|table|text|graphic|scale|labell?ed|callouts?|comparison)\b/i;
const usable=a=>a&&a.imageData;
// candidates: this job's product photos in order (protected photo first). pool: every research asset.
function choose(candidates,pool,keyOf=()=>null){
 // Only photos the product audit accepted as this product (kind "product"); a layers diagram first, then gallery order.
 const found=(pool||[]).filter(a=>/^sku-product-image-/.test(a.id||'')&&a.kind==='product'&&usable(a)&&CONSTRUCTION.test(a.label||''));
 const construction=found.find(a=>LAYERS.test(a.label))||found[0]||null;
 const ordered=candidates.filter(a=>usable(a)&&a.id!==construction?.id),first=ordered[0];
 const rest=ordered.slice(1),clean=rest.filter(a=>!ANNOTATED.test(a.label||'')),annotated=rest.filter(a=>ANNOTATED.test(a.label||''));
 const seen=new Set(),views=[];
 for(const a of [first,...clean,...annotated].filter(Boolean)){const k=keyOf(a)||a.id;if(seen.has(k))continue;seen.add(k);views.push(a);if(views.length===VIEWS)break;}
 return {views,construction};
}
// Planner input (input.productConstruction).
function section(construction){
 return {version:VERSION,picture:!!construction,...(construction?{label:String(construction.label||'').slice(0,160)}:{}),
  rule:construction
   ?'An official construction picture of this exact product is attached (labelled "Official construction picture"). If a page shows the product\'s inside, layers, a cutaway, or a cut, rolled, folded or lifted edge, show them exactly as that picture does: the same layers in the same order, colours, thicknesses and shapes, opened the way the real product opens. Never invent layers, textures or openings. Its captions and diagram style are not to be copied.'
   :'The official page has no picture of this product\'s inside. Do not plan any page that shows its inside, layers or a cutaway, or a cut, rolled, folded or lifted edge that exposes the inside; show the outside only.'};
}
// The reference-roles entry in the image brief (the existing list of attached images).
function promptLine(input,index){
 const c=input?.productConstruction;if(c?.version!==VERSION||!c.picture)return '';
 return ' Image '+index+' is the official construction picture of this exact product: use it only for how the inside and layers look (layers, order, colours, thicknesses, shapes, how it opens); never copy its captions, labels or diagram style.';
}
// The checker's question (id product-construction, a layout finding).
function requirement(c){
 return c?.picture
  ?'If the artwork shows the product\'s inside, layers, a cutaway, or a cut, rolled, folded or lifted edge, it must match the attached official construction picture: the same layers in the same order, colours, thicknesses and shapes (for example a flat slab is not drawn ridged; a two-sided product shows both sides\' layers), and it opens the way the real product opens (a cover lifts off; the side is not cut open). Flag clear_mismatch for a missing, extra or wrongly coloured layer, an invented texture or an invented opening. The picture\'s captions are not product markings. Nothing of the inside or layers visible: no_mismatch.'
  :'The official page has no picture of this product\'s inside. Flag clear_mismatch if the artwork shows the product\'s inside, its layers, a cutaway, or a cut, rolled, folded or lifted edge that exposes the inside. Outside only: no_mismatch.';
}
const LABEL='Official construction picture from the exact SKU page (how its inside and layers look; captions are not product markings)';
// Picture limit for this record's checks (22 Nov 2026, paid local brochure test: both faces of a Duroflex A4 bi-fold
// were drawn, then each check failed with "Too many distinct references" and no picture was checked). A check now
// sends the artwork, 4 views, the logo, the construction picture, a technology picture when attached, the two label
// close-ups and the original after a correction: up to 11, over the default 8 per request. Pinned records only;
// others keep 8.
const IMAGE_LIMIT=12;
const imageLimit=record=>record?.skuEvidenceVersion===VERSION?IMAGE_LIMIT:undefined;
module.exports={VERSION,VIEWS,CONSTRUCTION,LAYERS,ANNOTATED,choose,section,promptLine,requirement,LABEL,IMAGE_LIMIT,imageLimit};
