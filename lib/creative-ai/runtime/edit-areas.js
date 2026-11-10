'use strict';
// Edit areas v1 (error fixes 16-19, 10 Nov 2026 editor test). The user wants pins only ("i dont want box"),
// so a pin's area now adapts to what the comment asks for, worked out once at Send and saved with the edit:
//  - wording ("change this headline to ..."): the whole text block under the pin, found by the local text
//    reader, so a headline is never half rewritten (the test edit came back "Sust after fter offg workcrs.");
//  - add / replace / remove: at least the Large square, because a small square cut objects in half and
//    left pieces behind (no lamp, a leftover leaf, a half-recoloured cushion);
//  - anything else: the square the user chose.
// The saved area (areaBox) is what the mask, the prompt and the preview use, so the edit is reproducible.
// The same module flags requests that would change the product itself, which need the user's confirmation.
const editPins=require('./edit-pins');
const VERSION=1;
const WORDING=/\b(text|texts|word|words|wording|headline|heading|subheading|line|title|copy|caption|label|spell|spelling|says?|reads?|cta|button text|translate)\b|["“”]|\bto\s*:/i;
const OBJECT=/\b(add|adding|replace|replacing|swap|put|place|insert|remove|removing|delete|erase|get rid of|take out|take away|move)\b/i;
const CHANGE=/\b(make|change|turn|recolou?r|colou?r|paint|replace|swap|remove|delete|erase|resize|reshape|redraw|different|darker|lighter|fabric|pattern|texture)\b/i;
const kind=comment=>WORDING.test(comment||'')?'wording':OBJECT.test(comment||'')?'object':'other';
const hit=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
const union=rows=>{const x0=Math.min(...rows.map(r=>r.x)),y0=Math.min(...rows.map(r=>r.y)),x1=Math.max(...rows.map(r=>r.x+r.width)),y1=Math.max(...rows.map(r=>r.y+r.height));return {x:x0,y:y0,width:x1-x0,height:y1-y0};};
// Rows of text joined into one block: same line (overlapping heights, small gap) or the next line
// (overlapping columns, small vertical gap). Grows from the rows the pin's square touches.
function textBlock(rows,seed,pin){
 // Start from the line under the pin, else the nearest line inside the pin's square (10 Nov 2026: the square
 // also touched the logo above the headline).
 const inSquare=rows.filter(r=>hit(r,seed));if(!inSquare.length)return null;
 const under=pin?inSquare.filter(r=>pin.x>=r.x&&pin.x<=r.x+r.width&&pin.y>=r.y&&pin.y<=r.y+r.height):[];
 const dist=r=>pin?Math.hypot(Math.max(r.x-pin.x,0,pin.x-r.x-r.width),Math.max(r.y-pin.y,0,pin.y-r.y-r.height)):0;
 const block=under.length?under:[inSquare.reduce((a,b)=>dist(b)<dist(a)?b:a)];
 for(let grew=true;grew;){grew=false;for(const r of rows){if(block.includes(r))continue;
  if(block.some(b=>{const lh=Math.max(b.height,r.height),overlapY=Math.min(b.y+b.height,r.y+r.height)-Math.max(b.y,r.y),overlapX=Math.min(b.x+b.width,r.x+r.width)-Math.max(b.x,r.x);
   const sameLine=overlapY>0.4*Math.min(b.height,r.height)&&(r.x<b.x+b.width+1.5*lh&&b.x<r.x+r.width+1.5*lh);
   // The next line joins only when it is close and of a similar size (10 Nov 2026: a headline grew into the
   // logo above and the body text below). 
   const similar=Math.min(b.height,r.height)/Math.max(b.height,r.height)>=0.75;
   const nextLine=similar&&overlapX>0&&(Math.abs(r.y-(b.y+b.height))<0.35*lh||Math.abs(b.y-(r.y+r.height))<0.35*lh);return sameLine||nextLine;})){block.push(r);grew=true;}}}
 const u=union(block),pad=0.3*Math.max(...block.map(r=>r.height));
 const x=Math.max(0,u.x-pad),y=Math.max(0,u.y-pad);return {x,y,width:Math.min(1,u.x+u.width+pad)-x,height:Math.min(1,u.y+u.height+pad)-y};
}
const cleanRows=rows=>(rows||[]).map(r=>r?.box&&['x','y','width','height'].every(k=>Number.isFinite(r.box[k]))?{...r.box,text:String(r.text||'')}:null).filter(r=>r&&r.width>0&&r.height>0&&/\p{L}/u.test(r.text));
// Returns the annotations with areaBox/areaBasis on every pin that has an area.
function apply(annotations,{rows=[],width,height}){
 const text=cleanRows(rows);
 return annotations.map(a=>{
  if(a.type!=='pin'||!a.area)return a;
  const square=editPins.areaOf(a,width,height),k=kind(a.comment);
  if(k==='wording'){const block=textBlock(text,square,a);if(block)return {...a,areaBox:block,areaBasis:'text-block'};}
  if(k==='object'&&a.area!=='large')return {...a,areaBox:editPins.areaOf({...a,area:'large'},width,height),areaBasis:'add-or-replace'};
  return {...a,areaBox:square,areaBasis:'pin-area'};
 });
}
// When the adapted areas together are too large, fall back to the user's squares.
function fallback(annotations,width,height){return annotations.map(a=>a.type==='pin'&&a.area?{...a,areaBox:editPins.areaOf(a,width,height),areaBasis:'pin-area'}:a);}
const boxOf=(a,width,height)=>a.areaBox||editPins.areaOf(a,width,height);
// A request that names the product and asks to change it (error fix 19): the product is the exact SKU.
const STOP=new Set(['with','and','the','for','fabric','size','seater','mattress','sofa','set','technology','orthopedic','pocket','spring','queen','king','single','double','grey','gray','white','blue','green','brown','memory','foam','latex','coir','pillow','topper','protector']);
function productWords(product,brandName){
 const brand=new Set(String(brandName||'').toLowerCase().split(/[^a-z0-9]+/).concat(['duroflex','sleepyhead','duropedic']));
 const name=String(product?.name||'').toLowerCase(),words=name.split(/[^a-z0-9]+/).filter(w=>w.length>3&&!STOP.has(w)&&!brand.has(w));
 const category=(name.match(/\b(mattress|sofa|recliner|pillow|topper|protector|cushion cover|sofa cum bed|bed)\b/g)||[]);
 return [...new Set([...words,...category,'product'])];
}
function productChange(product,texts,brandName){
 const words=productWords(product,brandName);
 return texts.filter(Boolean).some(t=>{const s=String(t).toLowerCase();return CHANGE.test(s)&&!WORDING.test(s)&&!/\blogo\b/.test(s)&&words.some(w=>new RegExp('\\b'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(s));});
}
module.exports={VERSION,kind,textBlock,apply,fallback,boxOf,productWords,productChange};
