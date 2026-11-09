'use strict';
// Pins image for AI edits (user request, 9 Nov 2026: "just pins/comments that act as edits").
// A deterministic copy of the artwork being edited with numbered circular markers at each pin,
// so the image model can see where every comment applies. lean-edits.js saves it with the child
// version; brand-isolation.js rebuilds it from the bound anchor and the saved annotations and
// accepts only identical bytes. It is a guide image only and never part of the output.
const sharp=require('sharp');
const MAX_COMMENT=300,NAME='ai-edit-pins.png';
// Pin areas (9 Nov 2026, "Yes, protect it"): each pin may name the square around it that can
// change, as a share of the design's shorter side. The squares become the edit mask; everything
// outside them is restored pixel for pixel. The editor screen uses the same numbers.
const AREAS={small:0.16,medium:0.26,large:0.42};
function areaOf(p,width,height){
 const side=AREAS[p.area];if(!side)return null;
 const s=side*Math.min(width,height),w=Math.min(1,s/width),h=Math.min(1,s/height);
 return {x:Math.max(0,Math.min(1-w,p.x-w/2)),y:Math.max(0,Math.min(1-h,p.y-h/2)),width:w,height:h};
}
const pinsOf=annotations=>(annotations||[]).filter(a=>a.type==='pin');
async function render(bytes,annotations){
 const list=pinsOf(annotations);if(!list.length)throw Error('A pins image needs at least one pin.');
 const meta=await sharp(bytes).metadata(),w=meta.width,h=meta.height;
 const r=Math.max(14,Math.round(Math.min(w,h)*0.028)),font=Math.round(r*1.15),stroke=Math.max(3,Math.round(r*0.18));
 const marks=list.map((p,i)=>{
  const n=p.number||i+1,cx=Math.min(w-r-stroke,Math.max(r+stroke,Math.round(p.x*w))),cy=Math.min(h-r-stroke,Math.max(r+stroke,Math.round(p.y*h)));
  return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#e0115f" stroke="#ffffff" stroke-width="'+stroke+'"/>'+
   '<text x="'+cx+'" y="'+(cy+Math.round(font*0.36))+'" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="'+font+'" fill="#ffffff" text-anchor="middle">'+Number(n)+'</text>';
 }).join('');
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'">'+marks+'</svg>');
 return sharp(bytes).composite([{input:svg,left:0,top:0}]).png({compressionLevel:9,adaptiveFiltering:false}).toBuffer();
}
module.exports={render,pinsOf,areaOf,AREAS,MAX_COMMENT,NAME};
