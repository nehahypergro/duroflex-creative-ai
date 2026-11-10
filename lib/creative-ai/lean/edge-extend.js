'use strict';
// Edge fit v1 (user decision, 10 Nov 2026, fix 6 from the asset evaluation). New lean jobs pin edgeFitVersion 1.
// When the check finds the product or other essential content cut off by the canvas edge, and nothing locally
// fixable is wrong, the single automatic correction gives it room instead of leaving it:
//  1. the finished artwork is scaled down evenly (never stretched) and placed so the new space is on the cut side;
//  2. the image model draws only the new border as a continuation of the scene (one masked edit);
//  3. every pixel of the scaled artwork is put back exactly, with a short blend at its edge.
// The candidate is checked like any correction and is used only when the crop is gone and nothing new is wrong.
// Brand isolation re-derives the scaled anchor and mask from the saved original before any paid request.
const sharp=require('sharp');
const VERSION=1,SCALE=0.86,FEATHER=6;
const CUT=/cut off|cut by|cropped|clipped|runs? off|extends? (past|beyond|off)|beyond the [a-z ]*edge|truncat|touch(es|ing)? the [a-z ]*edge|no (left|right|top|bottom)? ?margin/i;
const EDGE=/edge|canvas|frame|border|\bside\b/i;
function edgeFindings(findings,isLayout){return (findings||[]).filter(f=>isLayout(f.id)&&CUT.test(f.evidence||'')&&EDGE.test(f.evidence||''));}
function sides(findings){const t=(findings||[]).map(f=>f.evidence||'').join(' ').toLowerCase();return {left:/\bleft\b/.test(t),right:/\bright\b/.test(t),top:/\btop\b/.test(t),bottom:/\bbottom\b/.test(t)};}
// The new space goes where the content was cut: content cut on the right is moved left, and so on.
function placement(width,height,s,scale=SCALE){
 const w=Math.round(width*scale),h=Math.round(height*scale);
 const fx=s.right&&!s.left?0.15:s.left&&!s.right?0.85:0.5,fy=s.bottom&&!s.top?0.15:s.top&&!s.bottom?0.85:0.5;
 return {left:Math.round((width-w)*fx),top:Math.round((height-h)*fy),width:w,height:h,scale};
}
function region(width,height,inner){
 const r=Buffer.alloc(width*height,1);
 for(let y=inner.top+FEATHER;y<inner.top+inner.height-FEATHER;y++)r.fill(0,y*width+inner.left+FEATHER,y*width+inner.left+inner.width-FEATHER);
 return r;
}
async function maskPng(regionBuffer,width,height){const data=Buffer.alloc(width*height*4,255);for(let i=0;i<regionBuffer.length;i++)if(regionBuffer[i])data[i*4+3]=0;return sharp(data,{raw:{width,height,channels:4}}).png().toBuffer();}
// Deterministic: the same original and placement always give the same anchor and mask bytes.
async function derive(original,width,height,inner){
 const small=await sharp(original).resize(inner.width,inner.height,{fit:'fill',kernel:'lanczos3'}).removeAlpha().png().toBuffer();
 const fill=await sharp(original).resize(width,height,{fit:'fill'}).removeAlpha().blur(30).png().toBuffer();
 const anchor=await sharp(fill).composite([{input:small,left:inner.left,top:inner.top}]).png().toBuffer();
 const regionBuffer=region(width,height,inner);
 return {small,anchor,region:regionBuffer,mask:await maskPng(regionBuffer,width,height)};
}
// Puts the scaled artwork back exactly; only a FEATHER-pixel ring at its edge blends into the new border.
async function restore(edited,small,inner,width,height){
 const e=await sharp(edited).resize(width,height,{fit:'fill'}).removeAlpha().raw().toBuffer(),s=await sharp(small).removeAlpha().raw().toBuffer(),out=Buffer.from(e);
 for(let y=0;y<inner.height;y++)for(let x=0;x<inner.width;x++){
  const d=Math.min(x,y,inner.width-1-x,inner.height-1-y),a=d>=FEATHER?1:(d+1)/(FEATHER+1),si=(y*inner.width+x)*3,oi=((y+inner.top)*width+x+inner.left)*3;
  for(let k=0;k<3;k++)out[oi+k]=a===1?s[si+k]:Math.round(s[si+k]*a+e[oi+k]*(1-a));
 }
 return sharp(out,{raw:{width,height,channels:3}}).png().toBuffer();
}
function prompt(record,findings){
 const product=record.input?.product;
 return ['Image 1 is a finished artwork that was scaled down inside a blurred border. Repaint ONLY the transparent border area of the mask so the scene continues naturally past the old edges.',
  'Complete whatever the old edge cut off (the product, furniture, floor, wall, light and shadows) so it is whole and believable, then let the scene continue. Match the exact product from the product reference images: '+(product?.appearance||product?.name||'the selected product')+'.',
  'Do not add any words, letters, numbers, logos, people, products or new objects. Do not change, move or repaint anything inside the scaled artwork.',
  'What was cut off: '+findings.map(f=>String(f.evidence||'').slice(0,200)).join(' ')].join('\n');
}
module.exports={VERSION,SCALE,FEATHER,edgeFindings,sides,placement,region,maskPng,derive,restore,prompt};
