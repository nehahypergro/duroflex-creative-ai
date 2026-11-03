'use strict';

// Fit only within the art director's allocated boxes. Never rewrite copy,
// move elements, change fonts, or invent a background to rescue readability.
async function fit(document, rendered, render) {
 const original=structuredClone(document), unresolved=[], changes=[];
 let evaluations=0;
 const result=(doc,image)=>({version:1,status:unresolved.length?'needs-attention':changes.length?'fitted':'unchanged',document:doc,rendered:image,changes,unresolved,evaluations});
 if(document.compositionPolicy?.version!==1)return result(original,rendered);
 const texts=original.objects.filter(o=>['text','cta'].includes(o.type));
 const measurement=(image,o)=>image.measurements?.find(m=>m.id===o.id);
 const limits=o=>require('./typography-contract').limits(original,o);
 const fits=(image,o)=>{const m=measurement(image,o),padding=o.type==='cta'?2*(o.padding||0):0;return m&&Number.isFinite(m.width)&&Number.isFinite(m.textHeight)&&m.width<=o.width+1&&m.textHeight<=o.height-padding+1&&(!limits(o)||Number.isInteger(m.lineCount)&&m.lineCount<=limits(o).maxLines);};
 const candidates=[];
 for(const o of texts){
  const m=measurement(rendered,o);
  if(!m||!Number.isFinite(m.width)||!Number.isFinite(m.textHeight)){unresolved.push({id:o.id,reason:'Text measurement unavailable'});continue;}
  const contract=limits(o);
  if(contract&&(!Number.isInteger(m.lineCount)||o.fontSize<contract.minFontSize-.01)){unresolved.push({id:o.id,reason:'Planned typography measurement or minimum font size is not satisfied'});continue;}
  if(fits(rendered,o))continue;
  if(o.locked||!Number.isFinite(o.fontSize)||o.fontSize<=0){unresolved.push({id:o.id,reason:'Text overflows its locked layout'});continue;}
  candidates.push({id:o.id,high:o.fontSize,low:contract?contract.minFontSize:Math.ceil(o.fontSize*.75*100)/100,original:o.fontSize});
 }
 if(!candidates.length)return result(original,rendered);
 const probe=structuredClone(original),object=id=>probe.objects.find(o=>o.id===id);
 for(const c of candidates)object(c.id).fontSize=c.low;
 let image=await render(probe);evaluations++;
 const workable=candidates.filter(c=>{if(fits(image,object(c.id)))return true;object(c.id).fontSize=c.original;unresolved.push({id:c.id,reason:'Copy does not fit within the permitted text size range'});return false;});
 if(!workable.length)return result(original,rendered);
 // Seven bounded, simultaneous probes find the largest fitting size to ~0.2px.
 for(let i=0;i<7;i++){
  for(const c of workable)object(c.id).fontSize=(c.low+c.high)/2;
  image=await render(probe);evaluations++;
  for(const c of workable){if(fits(image,object(c.id)))c.low=object(c.id).fontSize;else c.high=object(c.id).fontSize;}
 }
 for(const c of workable)object(c.id).fontSize=c.low;
 image=await render(probe);evaluations++;
 for(const c of workable){
  if(!fits(image,object(c.id))){unresolved.push({id:c.id,reason:'Final text measurement did not confirm the fit'});}
  else changes.push({id:c.id,from:c.original,to:c.low,reason:'Fit exact copy inside its planned text box'});
 }
 // An inconsistent renderer must not release an unverified change.
 if(changes.length!==workable.length){changes.length=0;return result(original,rendered);}
 return result(probe,image);
}
module.exports={fit};
