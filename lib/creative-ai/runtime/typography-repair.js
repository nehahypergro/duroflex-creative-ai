'use strict';
// Bounded local candidate planning. Never mutate frozen reconstruction or shorten copy.
const intersects=(a,b,gap=0)=>a.left<b.left+b.width+gap&&a.left+a.width+gap>b.left&&a.top<b.top+b.height+gap&&a.top+a.height+gap>b.top;
const text=o=>o.fieldId&&['text','cta'].includes(o.type);
function minimum(doc,o){
 const reading=doc.compositionPolicy?.reading,css=o.role==='headline'?reading?.headlineCssPx:reading?.bodyCssPx;
 const contract=doc.layoutIntent?.layout?.text?.find(f=>f.fieldId===o.fieldId);
 return Math.max(o.fontSize,reading?.width&&css?css*doc.canvas.width/reading.width:0,(contract?.minFontSize||0)*doc.canvas.width);
}
async function reflow(source,measure){
 const ordered=source.objects.filter(text).sort((a,b)=>a.top-b.top||a.left-b.left);
 if(!ordered.length)return {document:structuredClone(source),changes:[],attempts:0};
 if(ordered.some(o=>o.angle||(o.scaleX??1)!==1||(o.scaleY??1)!==1||o.lineIndex!==undefined))throw Error('Typography repair needs the full planned text fields; transformed or frozen lines cannot be changed in place');
 const margin=source.safeMargin||0,w=source.canvas.width,h=source.canvas.height,available=w-2*margin;
 if(available<=0)throw Error('Typography repair has no clear space inside the canvas');
 const fixed=[...(source.protectedRegions||[]),...source.objects.filter(o=>o.role!=='photograph'&&!text(o)&&o.visible!==false)];
 for(let attempt=0;attempt<3;attempt++){
  const doc=structuredClone(source);
  for(const original of ordered){const o=doc.objects.find(o=>o.id===original.id),padding=o.type==='cta'?2*(o.padding||0):0;
   o.fontSize=Math.ceil(minimum(source,o)*100)/100;
   o.width=Math.min(available-padding,Math.max(original.width,attempt===1?available*.75-padding:attempt===2?available-padding:original.width));
   if(o.width<=0)throw Error('Typography repair has no clear space for button padding');
  }
  const measured=await measure(doc),placed=fixed.map(o=>({...o}));let failed=false,lastTop=margin;
  for(const original of ordered){
   const o=doc.objects.find(o=>o.id===original.id),row=measured.measurements?.find(r=>r.id===o.id);
   if(!row||![row.width,row.textHeight].every(Number.isFinite)||row.textHeight<=0)throw Error('Typography repair measurements unavailable for '+o.id);
   const padding=o.type==='cta'?2*(o.padding||0):0,gap=Math.max(2,o.fontSize*.2);
   // Box slack is not glyph size. Reclaim unused height without shrinking type.
   o.height=Math.ceil(row.textHeight+padding+1);
   const width=Math.max(o.width+padding,row.width),height=o.height;
   const xs=[Math.max(margin,Math.min(o.left,w-margin-width)),margin,w-margin-width,...placed.flatMap(b=>[b.left+b.width+gap,b.left-width-gap])];
   const ys=[Math.max(lastTop,o.top),lastTop,margin,h-margin-height,...placed.flatMap(b=>[b.top+b.height+gap,b.top-height-gap])];
   const candidates=xs.flatMap(left=>ys.map(top=>({left,top,width,height}))).filter(b=>b.left>=margin&&b.top>=lastTop&&b.top>=margin&&b.left+b.width<=w-margin+.01&&b.top+b.height<=h-margin+.01&&!placed.some(p=>intersects(b,p,gap)));
   candidates.sort((a,b)=>Math.hypot(a.left-original.left,a.top-original.top)-Math.hypot(b.left-original.left,b.top-original.top));
   if(!candidates.length){failed=true;break;}
   Object.assign(o,{left:candidates[0].left,top:candidates[0].top});placed.push(candidates[0]);lastTop=o.top;
  }
  if(failed)continue;
  require('./composed-quality').assertReadable(doc);
  const changes=ordered.flatMap(before=>{const after=doc.objects.find(o=>o.id===before.id),keys=['left','top','width','height','fontSize'];return keys.some(k=>before[k]!==after[k])?[{fieldId:before.fieldId,before:Object.fromEntries(keys.map(k=>[k,before[k]])),after:Object.fromEntries(keys.map(k=>[k,after[k]]))}]:[];});
  return {document:doc,changes,attempts:attempt+1};
 }
 throw Error('Typography repair has no clear space at readable size. A different composition is required; no image request was dispatched.');
}
module.exports={reflow,minimum};
