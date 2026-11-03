'use strict';
// Recognition supplies regions only. Never use its characters as campaign copy.
const area=b=>b.width*b.height;
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
// A generated single-column text stack can move across planned field boundaries.
// Recover only clearly separated blocks; recognition characters never bind copy.
function blocks(rows,regions){
 if(regions.length<2||regions.some(r=>!r.box))return null;
 const ordered=[...regions].sort((a,b)=>a.box.y-b.box.y);
 if(ordered.some((r,i)=>Math.abs(r.box.x-ordered[0].box.x)>.025||i&&r.box.y<ordered[i-1].box.y+ordered[i-1].box.height))return null;
 const x=Math.min(...ordered.map(r=>r.box.x)),y=ordered[0].box.y,envelope={x,y,width:Math.max(...ordered.map(r=>r.box.x+r.box.width))-x,height:Math.max(...ordered.map(r=>r.box.y+r.box.height))-y};
 const candidates=rows.map((r,index)=>({...r,index})).filter(r=>require('./editor-ocr').validRegion(r.box)&&overlap(r.box,envelope)/area(r.box)>=.8).sort((a,b)=>a.box.y-b.box.y);
 if(candidates.length<ordered.length)return null;
 const gaps=candidates.slice(1).map((r,i)=>({i:i+1,gap:r.box.y-candidates[i].box.y-candidates[i].box.height})).sort((a,b)=>b.gap-a.gap),cuts=gaps.slice(0,ordered.length-1),rest=gaps.slice(ordered.length-1),median=[...candidates].map(r=>r.box.height).sort((a,b)=>a-b)[Math.floor(candidates.length/2)];
 if(cuts.some(c=>c.gap<=median*.3||c.gap<=Math.max(0,...rest.map(g=>g.gap))*1.5))return null;
 const boundaries=[0,...cuts.map(c=>c.i).sort((a,b)=>a-b),candidates.length],owners=new Map();
 for(let i=0;i<ordered.length;i++){const group=candidates.slice(boundaries[i],boundaries[i+1]);if(group.some(r=>Math.abs(r.box.x-group[0].box.x)>.025))return null;for(const r of group)owners.set(r.index,[ordered[i].f.id]);}
 return owners;
}
function select(rows,fields,doc){
 const embedded=fields.filter(f=>f.delivery==='embedded'),targets=require('./composed-quality').typography(doc),matches=[],issues=[],owners=new Map();
 const regions=embedded.map(f=>{const o=targets.find(o=>o.fieldId===f.id);return {f,align:o?.align||'left',box:o?{x:o.left/doc.canvas.width,y:o.top/doc.canvas.height,width:o.width/doc.canvas.width,height:o.height/doc.canvas.height}:null};});
 rows.forEach((r,index)=>{if(!require('./editor-ocr').validRegion(r.box))return;const ids=regions.filter(t=>t.box&&overlap(r.box,t.box)/area(r.box)>=.8).map(t=>t.f.id);owners.set(index,ids);});
 const assignment=require('./copy-region-assignment').assign(rows,regions,doc);if(assignment)return assignment;
 const grouped=blocks(rows,regions);if(grouped){owners.clear();for(const [index,ids] of grouped)owners.set(index,ids);}
 for(const {f,box} of regions){
  const lines=rows.map((r,index)=>({...r,index})).filter(r=>owners.get(r.index)?.includes(f.id)).sort((a,b)=>a.box.y-b.box.y||a.box.x-b.box.x);
  let reason=!box?'Missing planned copy region':!lines.length?'No detected lettering in planned copy region':lines.some(r=>owners.get(r.index).length!==1)?'Ambiguous copy region':null;
  if(!reason&&lines.some(r=>(doc.protectedRegions||[]).some(p=>overlap(r.box,{x:p.left/doc.canvas.width,y:p.top/doc.canvas.height,width:p.width/doc.canvas.width,height:p.height/doc.canvas.height})>0)))reason='Detected lettering intersects protected subject';
  if(!reason&&lines.some((r,i)=>i&&r.box.y<lines[i-1].box.y+lines[i-1].box.height*.7))reason='Ambiguous or fragmented text lines';
  if(reason){issues.push({fieldId:f.id,reason});continue;}
  const x=Math.min(...lines.map(r=>r.box.x)),y=Math.min(...lines.map(r=>r.box.y));matches.push({fieldId:f.id,role:f.role,text:f.text,lines,box:{x,y,width:Math.max(...lines.map(r=>r.box.x+r.box.width))-x,height:Math.max(...lines.map(r=>r.box.y+r.box.height))-y},copySource:'saved-exact-copy',geometrySource:'detected-text-regions'});
 }
 return {matches,issues};
}
function lines(match,measure){
 const explicit=match.text.split(/\r?\n/),n=match.lines.length;
 if(explicit.length>1){if(explicit.length!==n||explicit.some(s=>!s.trim()))throw Error('Saved-copy explicit line layout differs from detected geometry; recompose');return match.lines.map((l,i)=>({...l,text:explicit[i]}));}
 const words=[...match.text.matchAll(/\S+/gu)];
 if(!n||n>12||words.length<n||words.length>120)throw Error('Saved-copy layout cannot be bound to detected lines; recompose');
 const text=(a,b)=>match.text.slice(words[a].index,words[b-1].index+words[b-1][0].length);
 // Choose word boundaries using glyph metrics and observed box proportions, not OCR wording.
 const memo=new Map();function solve(i,start){const key=i+':'+start;if(memo.has(key))return memo.get(key);if(i===n)return start===words.length?{cost:0,parts:[]}:null;let best=null;for(let end=start+1;end<=words.length-(n-i-1);end++){if(i===n-1&&end!==words.length)continue;const t=text(start,end),m=measure(t),box=match.lines[i].box,ratio=(m.width/m.height)/(box.width/box.height);if(!Number.isFinite(ratio)||ratio<=0)continue;const rest=solve(i+1,end);if(!rest)continue;const cost=Math.log(ratio)**2+rest.cost;if(!best||cost<best.cost)best={cost,parts:[{...match.lines[i],text:t},...rest.parts]};}memo.set(key,best);return best;}
 const out=solve(0,0);if(!out)throw Error('Saved-copy layout is unmeasurable; recompose');return out.parts;
}
function residual(rows,matches){return rows.filter(r=>require('./editor-ocr').validRegion(r.box)&&matches.some(m=>m.lines.some(l=>overlap(r.box,l.box)/area(r.box)>.5)));}
function assertCopy(doc,fields){const canonical=s=>s.replace(/\s+/gu,' ').trim(),embedded=fields.filter(f=>f.delivery==='embedded');for(const f of embedded){const objects=doc.objects.filter(o=>o.fieldId===f.id);if(!objects.length||canonical(require('./copy-lines').text(objects))!==canonical(f.text))throw Error('Saved exact copy differs from text layer: '+f.id);}if(doc.objects.some(o=>o.fieldId&&!embedded.some(f=>f.id===o.fieldId)))throw Error('Unbound text layer outside saved exact copy');}
function inkRegions(raw,matches){const pixels=require('./editor-pixels'),{data,info}=raw;return matches.map(m=>{const refined=m.lines.map(l=>{const ink=pixels.ink(raw,l.box);if(ink.confidence<.7)throw Error('Uncertain text foreground');const b=pixels.bounds(info,l.box),tolerance=Math.min(65,Math.max(22,ink.contrast*.3));let x0=b.x1,y0=b.y1,x1=-1,y1=-1;for(let y=b.y0;y<b.y1;y++)for(let x=b.x0;x<b.x1;x++){const i=(y*info.width+x)*info.channels;if(Math.hypot(data[i]-ink.rgb[0],data[i+1]-ink.rgb[1],data[i+2]-ink.rgb[2])<=tolerance){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}if(x1<x0)throw Error('No measurable text foreground');return {...l,box:{x:x0/info.width,y:y0/info.height,width:(x1-x0+1)/info.width,height:(y1-y0+1)/info.height}};});const x=Math.min(...refined.map(l=>l.box.x)),y=Math.min(...refined.map(l=>l.box.y));return {...m,lines:refined,box:{x,y,width:Math.max(...refined.map(l=>l.box.x+l.box.width))-x,height:Math.max(...refined.map(l=>l.box.y+l.box.height))-y}};});}
function fit(fits){const heightSize=Math.min(...fits.map(f=>f.heightFit)),widthSize=Math.min(...fits.map(f=>f.widthFit)),size=Math.min(heightSize,widthSize);if(!Number.isFinite(size)||size<1||fits.some(f=>size<f.heightFit*(f.pixelHeight-1)/f.pixelHeight))throw Error('Saved copy does not fit observed glyph size; recompose without shrinking or dropping words');return {size,scaleX:1};}
module.exports={select,lines,residual,assertCopy,inkRegions,fit};
