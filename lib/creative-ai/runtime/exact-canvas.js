'use strict';
// Fit a generated image to the exact format size without stretching (user decision, 8 Nov 2026:
// keep today's generation size and enlarge evenly). When the shape differs by at most 1%, the
// image is enlarged evenly to cover the canvas and the few extra pixels are trimmed equally from
// both edges (a sliver of wall or floor). When it differs more, trimming would push logos and
// copy towards the edge, so the image is enlarged evenly to fit and its edges are extended by
// mirroring instead. Nothing is ever scaled unevenly.
const sharp=require('sharp');
const MAX_TRIM_SHAPE=0.01;

// Plain-edge fill (display banner fit v1, 9 Nov 2026): the whole drawing is kept with even scaling and
// the two leftover ends are filled with the drawing's own edge colour (the mean of a thin strip at each
// end). The image model is told to keep those ends a plain, flat background. How even each edge strip
// was is recorded (edge.flat), so a busy edge is never hidden.
const EDGE_STRIP=0.03,FLAT_SPREAD=18;
async function edgeColour(img,{left,top,width,height}){
 const st=await sharp(img).extract({left,top,width,height}).stats(),c=st.channels.slice(0,3);
 return {colour:{r:Math.round(c[0].mean),g:Math.round(c[1].mean),b:Math.round(c[2].mean)},spread:Math.max(...c.map(x=>x.stdev))};
}
async function extendFlat(bytes,width,height,w,h,shape,source){
 const scale=Math.min(width/w,height/h),fw=Math.min(width,Math.round(w*scale)),fh=Math.min(height,Math.round(h*scale));
 const img=await sharp(bytes).resize(fw,fh,{kernel:'lanczos3'}).removeAlpha().png().toBuffer();
 const px=width-fw,py=height-fh,wide=px>0;
 const strip=wide?Math.max(1,Math.round(fw*EDGE_STRIP)):Math.max(1,Math.round(fh*EDGE_STRIP));
 const a=await edgeColour(img,wide?{left:0,top:0,width:strip,height:fh}:{left:0,top:0,width:fw,height:strip});
 const b=await edgeColour(img,wide?{left:fw-strip,top:0,width:strip,height:fh}:{left:0,top:fh-strip,width:fw,height:strip});
 let out=await sharp(img).extend(wide?{left:Math.floor(px/2),background:a.colour}:{top:Math.floor(py/2),background:a.colour}).png().toBuffer();
 out=await sharp(out).extend(wide?{right:Math.ceil(px/2),background:b.colour}:{bottom:Math.ceil(py/2),background:b.colour}).png().toBuffer();
 const spread=Math.round(Math.max(a.spread,b.spread)*10)/10;
 return {bytes:out,method:'extend-flat',scale,shapeDifference:shape,trimmed:{x:0,y:0},added:{x:px,y:py},source,edge:{colours:[a.colour,b.colour],spread,flat:spread<=FLAT_SPREAD}};
}
async function fit(bytes,width,height,{maxTrimShape=MAX_TRIM_SHAPE,extendFlat:flatEnds=false}={}){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)throw Error('Exact canvas needs a positive whole-pixel size');
 const meta=await sharp(bytes).metadata(),w=meta.width,h=meta.height;
 const source={width:w,height:h},none={x:0,y:0};
 if(w===width&&h===height)return {bytes,method:'exact',scale:1,shapeDifference:0,trimmed:none,added:none,source};
 const shape=Math.abs(w/h-width/height)/(width/height);
 if(flatEnds&&shape>MAX_TRIM_SHAPE)return extendFlat(bytes,width,height,w,h,shape,source);
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
module.exports={fit,MAX_TRIM_SHAPE,FLAT_SPREAD};
