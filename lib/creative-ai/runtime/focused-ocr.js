'use strict';
const sharp=require('sharp'),copy=require('./copy-checks');
const words=s=>new Set(copy.normalize(s).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]);
// Words locate an actual OCR region only. They never change/transcribe glyphs
// or establish a copy pass. In particular I/l are not treated as equivalent.
function region(rows,text,width,height){
 const wanted=words(text),valid=rows.filter(r=>r.box&&[r.box.x,r.box.y,r.box.width,r.box.height].every(Number.isFinite)&&r.box.width>0&&r.box.height>0).sort((a,b)=>a.box.y-b.box.y);let best=null;
 for(let start=0;start<valid.length;start++)for(let end=start;end<Math.min(start+8,valid.length);end++){
  if(end>start&&valid[end].box.y-(valid[end-1].box.y+valid[end-1].box.height)>0.06)break;
  const group=valid.slice(start,end+1),seen=words(group.map(r=>r.text).join(' ')),matches=[...wanted].filter(w=>seen.has(w)).length;if(!matches)continue;
  const x=Math.min(...group.map(r=>r.box.x)),y=Math.min(...group.map(r=>r.box.y)),right=Math.max(...group.map(r=>r.box.x+r.box.width)),bottom=Math.max(...group.map(r=>r.box.y+r.box.height)),score=matches-(right-x)*(bottom-y)*0.1;
  if(!best||score>best.score)best={x,y,right,bottom,score,start,end};
 }
 if(!best)return null;
 // Keep adjacent lines of the same text block even when the uncertain glyph
 // prevented a word match (e.g. the standalone first line “Liveln”).
 const adjacent=(a,b)=>{const overlap=Math.min(a.box.x+a.box.width,b.box.x+b.box.width)-Math.max(a.box.x,b.box.x),gap=b.box.y-(a.box.y+a.box.height);return overlap>Math.min(a.box.width,b.box.width)*0.5&&gap<=Math.max(a.box.height,b.box.height)*0.75+0.005;};
 let start=best.start,end=best.end;
 for(let n=0;n<2&&start>0&&adjacent(valid[start-1],valid[start]);n++)start--;
 for(let n=0;n<2&&end+1<valid.length&&adjacent(valid[end],valid[end+1]);n++)end++;
 for(const row of valid.slice(start,end+1)){best.x=Math.min(best.x,row.box.x);best.y=Math.min(best.y,row.box.y);best.right=Math.max(best.right,row.box.x+row.box.width);best.bottom=Math.max(best.bottom,row.box.y+row.box.height);}
 const left=Math.max(0,Math.floor(best.x*width)-16),top=Math.max(0,Math.floor(best.y*height)-16),right=Math.min(width,Math.ceil(best.right*width)+16),bottom=Math.min(height,Math.ceil(best.bottom*height)+16);
 return right>left&&bottom>top?{left,top,width:right-left,height:bottom-top}:null;
}
async function focus(record,file,measurement,original,{recognize}){
 if(original?.status!=='measured')return original;
 const missing=copy.requiredFields(record).filter(f=>!copy.matchesFullField(original,f.text));if(!missing.length)return original;
 const passes=[...(original.passes||[{label:'original target',...original}])],regions=new Map();
 for(const field of missing){const box=region(original.rows||[],field.text,measurement.width,measurement.height);if(box)regions.set(JSON.stringify(box),{box,fieldId:field.id});}
 // Bounded local OCR on the same saved pixels; no provider request or redraw.
 for(const {box,fieldId} of [...regions.values()].slice(0,4)){
  const crop=file+'.focused-'+passes.length+'.png';try{await sharp(file).extract(box).resize({width:Math.min(2200,box.width*3)}).png().toFile(crop);passes.push({label:'Focused text detail only',fieldId,region:box,...await recognize(crop)});}catch{passes.push({label:'Focused text detail only',fieldId,region:box,status:'unavailable',rows:[],note:'Local crop OCR unavailable; verification stays unresolved.'});}
 }
 return {...original,passes,focusedVerification:{requestedFieldIds:missing.map(f=>f.id),cropCount:Math.min(regions.size,4),limitations:'Recognition aid only. Original/display-size legibility is reviewed separately. Unmatched glyphs stay uncertain; no spelling substitutions.'}};
}
module.exports={region,focus};
