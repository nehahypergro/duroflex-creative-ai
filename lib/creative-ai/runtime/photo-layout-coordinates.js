'use strict';
const {generationSize}=require('./placements');
const round=x=>Math.round(x*100)/100;
// Sharp's centre-cover export scales this retained rectangle to the final canvas.
// Express reservations in model pixels AND percentages; final-export coordinates
// alone are ambiguous when model dimensions or aspect ratio differ.
function geometry(doc){
 const g=generationSize(doc.canvas.width,doc.canvas.height),sx=g.crop.width/doc.canvas.width,sy=g.crop.height/doc.canvas.height;
 function project(o){const p={left:g.crop.x+o.left*sx,top:g.crop.y+o.top*sy,width:o.width*sx,height:o.height*sy};return {pixels:Object.fromEntries(Object.entries(p).map(([k,v])=>[k,round(v)])),percent:{left:round(p.left/g.width*100),top:round(p.top/g.height*100),width:round(p.width/g.width*100),height:round(p.height/g.height*100)}};}
 const guide={canvas:{width:g.width,height:g.height},retainedCrop:g.crop,overlayExclusions:doc.objects.filter(o=>['text','cta'].includes(o.type)||o.role==='logo').map(o=>({role:o.role,...project(o),colour:o.fill||doc.assets?.find(a=>a.id===o.assetId)?.colour})),subjectEnvelopes:(doc.protectedRegions||[]).map(o=>({id:o.id,kind:o.kind,...project(o)}))};
 return guide;
}
function instruction(doc){const guide=geometry(doc);
 return 'MODEL-CANVAS RESERVATIONS: '+JSON.stringify(guide)+'\nThe pixels and percentages above refer to the model canvas, before final export. These reservations take priority over loose scene descriptions. Each subject envelope contains the entire silhouette, including heads, arms and feet, not just the subject centre. Keep every overlay exclusion free of people, product, other furniture, props, edges and high-contrast textures. Extend its specified real surface continuously through and around the box. Keep lighting and surface colour consistent with the intended overlay colour. These are invisible composition instructions, not shapes to draw: no bounding boxes, labels, guide colours, panels or text. Compose a single coherent scene; do not create artificial empty patches.';
}
module.exports={instruction,geometry};
