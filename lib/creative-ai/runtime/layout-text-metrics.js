'use strict';
// Planning estimates from the pinned font files. No image or canvas render,
// automatic layout mutation, or extra provider call. Final Fabric measurements
// and visual review remain authoritative for the assembled composition.
const fs=require('./artifact-fs'),path=require('node:path'),crypto=require('node:crypto');
async function load(runtime,assets){
 const fonts=new Map();
 for(const f of assets.fonts){
  if(f.brandId!==assets.brandId||!f.filename||path.basename(f.filename)!==f.filename)throw Error('Invalid scoped planning font');
  const bytes=await fs.readFile(path.join(runtime.brands.dir(assets.brandId),'canvas-assets',f.filename));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('Planning font no longer matches its pinned hash: '+f.id);
  fonts.set(f.id,require('fontkit').create(bytes));
 }
 return fonts;
}
const widthEm=(font,text)=>font.layout(text).positions.reduce((n,p)=>n+p.xAdvance,0)/font.unitsPerEm;
function measure(font,text,fontSize,width,lineHeight){
 // Fabric Textbox uses word wrapping and a 1.13em line box. Use a small
 // horizontal allowance for browser shaping differences; never certify pixels.
 const available=width*.98,lines=[];let longestWord=0;
 for(const paragraph of text.split(/\r?\n/)){
  let line='';
  for(const word of paragraph.split(/[ \t\r]/)){
   longestWord=Math.max(longestWord,widthEm(font,word)*fontSize);
   const candidate=line?line+' '+word:word;
   if(line&&widthEm(font,candidate)*fontSize>available){lines.push(line);line=word;}else line=candidate;
  }
  lines.push(line);
 }
 return {lines:lines.length,height:fontSize*1.13*(1+(lines.length-1)*lineHeight),width:Math.max(longestWord,...lines.map(s=>widthEm(font,s)*fontSize))};
}
function validate(plan,spec,{canvas,fonts}){
 if(plan.contractVersion!==2||!plan.text.length)return;
 if(!canvas||![canvas.width,canvas.height].every(n=>Number.isFinite(n)&&n>0))throw Error('Exact canvas dimensions required for typography planning');
 const errors=[];
 for(const b of plan.text){
  const font=fonts.get(b.fontId),text=spec.text.find(t=>t.fieldId===b.fieldId)?.exactText;
  if(!font||typeof text!=='string')throw Error('Exact wording and pinned font required for typography planning: '+b.fieldId);
  const size=b.fontSize*canvas.width,padding=b.buttonBackground!==null?2*b.buttonPadding*canvas.width:0;
  const m=measure(font,text,size,b.width*canvas.width,b.lineHeight);
  // Match the real-font guide: fractional normalized box rounding may differ
  // by up to one canvas pixel. This does not relax font size or line limits.
  if(m.width>b.width*canvas.width*.98+.01||m.height+padding>b.height*canvas.height+1||m.lines>b.maxLines)
   errors.push(`${b.fieldId}: exact copy cannot fit at preferred ${size.toFixed(1)}px; font-metric estimate ${m.lines} lines, ${m.width.toFixed(1)}px wide, ${(m.height+padding).toFixed(1)}px high versus box ${(b.width*canvas.width).toFixed(1)}×${(b.height*canvas.height).toFixed(1)}px and maxLines ${b.maxLines}`);
 }
 if(errors.length)throw Error('Typography planning fit failed. '+errors.join('; ')+'. Recompose the boxes, hierarchy and subject/scene allocation together. Choose a fitting preferred size with a justified readable minimum; editorial starting targets are not mandatory minima. Preserve exact wording and approved fonts. If no readable arrangement fits, use the existing copy/placement dependency path.');
}
function canvasFor(request,placement){
 if(placement.description?.dimensions)return placement.description.dimensions;
 const rows=request.wire.input.placements||[];
 // Art director contexts wrap each selected placement and its resolved rules.
 // Never search a different unit's context as a substitute for missing data.
 const unit=rows.find(p=>p.selection?.id===placement.id);
 const candidates=unit?unit.context?.placements||[]:rows.filter(p=>p.profile);
 const p=candidates.find(p=>p.profile?.id===(placement.pin?.profileId||placement.id));
 if(p?.profile?.canvas?.unit==='px')return p.profile.canvas;
 const exact=p?.rules?.find(r=>r.check?.method==='dimensions'&&r.check.exact)?.check.exact;
 return exact?{width:exact[0],height:exact[1]}:null;
}
function guidance(request,fonts){
 return {basis:'Pinned font advance widths in em; planning estimates, not final glyph or visual approval. Text height approximately fontSize × 1.13 × (1 + (lines − 1) × lineHeight). Add CTA padding. Leave breathing room.',units:(request.wire.input.units||[]).map(s=>({conceptId:s.conceptId,placementId:s.placementId,text:s.text.filter(t=>t.delivery==='embedded').map(t=>({fieldId:t.fieldId,fonts:[...fonts].map(([id,font])=>({id,lineWidthsEm:t.exactText.split(/\r?\n/).map(line=>widthEm(font,line)),longestWordEm:Math.max(...t.exactText.split(/\s/).map(word=>widthEm(font,word)))}))}))}))};
}
module.exports={load,measure,validate,canvasFor,guidance};
