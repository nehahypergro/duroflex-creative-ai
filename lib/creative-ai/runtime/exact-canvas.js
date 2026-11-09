'use strict';
// Fit a generated image to the exact format size without stretching (user decision, 8 Nov 2026:
// keep today's generation size and enlarge evenly). When the shape differs by at most 1%, the
// image is enlarged evenly to cover the canvas and the few extra pixels are trimmed equally from
// both edges (a sliver of wall or floor). When it differs more, trimming would push logos and
// copy towards the edge, so the image is enlarged evenly to fit and its edges are extended by
// mirroring instead. Nothing is ever scaled unevenly.
const sharp=require('sharp');
const MAX_TRIM_SHAPE=0.01;

async function fit(bytes,width,height,{maxTrimShape=MAX_TRIM_SHAPE}={}){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)throw Error('Exact canvas needs a positive whole-pixel size');
 const meta=await sharp(bytes).metadata(),w=meta.width,h=meta.height;
 const source={width:w,height:h},none={x:0,y:0};
 if(w===width&&h===height)return {bytes,method:'exact',scale:1,shapeDifference:0,trimmed:none,added:none,source};
 const shape=Math.abs(w/h-width/height)/(width/height);
 if(shape<=maxTrimShape){
  const scale=Math.max(width/w,height/h),sw=Math.max(width,Math.round(w*scale)),sh=Math.max(height,Math.round(h*scale));
  const tx=sw-width,ty=sh-height;
  const out=await sharp(bytes).resize(sw,sh,{kernel:'lanczos3'}).extract({left:Math.floor(tx/2),top:Math.floor(ty/2),width,height}).png().toBuffer();
  return {bytes:out,method:tx||ty?'trim':'scale',scale,shapeDifference:shape,trimmed:{x:tx,y:ty},added:none,source};
 }
 const scale=Math.min(width/w,height/h),fw=Math.min(width,Math.round(w*scale)),fh=Math.min(height,Math.round(h*scale));
 const px=width-fw,py=height-fh;
 const out=await sharp(bytes).resize(fw,fh,{kernel:'lanczos3'}).extend({left:Math.floor(px/2),right:Math.ceil(px/2),top:Math.floor(py/2),bottom:Math.ceil(py/2),extendWith:'mirror'}).png().toBuffer();
 return {bytes:out,method:'extend',scale,shapeDifference:shape,trimmed:none,added:{x:px,y:py},source};
}
module.exports={fit,MAX_TRIM_SHAPE};
