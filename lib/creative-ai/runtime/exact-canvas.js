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
// Edge frame lines (21 Nov 2026, Neha: "why are there side black lines on the left and right"): the image model
// sometimes draws a 1–3 px frame hugging the picture's edges (2 of 312 saved raw pictures, both a full dark frame);
// resizing then enlarges it. With edgeLines on (edgeLineVersion 1), a side counts as having a frame line when at least
// 90% of its outer 1–3 px differ sharply (luminance > 40) from the picture just inside, the inside itself is even there,
// and at least two sides have one. Those outer pixels are replaced by the picture's own neighbouring pixels.
const EDGE_LINE_MAX=3,EDGE_LINE_DIFF=40,EDGE_LINE_COVER=0.9,EDGE_LINE_SIDES=2;
async function cleanEdgeLines(bytes){
 const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true}),W=info.width,H=info.height,C=info.channels;
 if(W<20||H<20)return null;
 const lum=(x,y)=>{const i=(y*W+x)*C;return 0.299*data[i]+0.587*data[i+1]+0.114*data[i+2];};
 const sides={left:[H,(t,d)=>[d,t]],right:[H,(t,d)=>[W-1-d,t]],top:[W,(t,d)=>[t,d]],bottom:[W,(t,d)=>[t,H-1-d]]},found={};
 for(const [side,[len,at]] of Object.entries(sides))for(let k=1;k<=EDGE_LINE_MAX;k++){
  const share=(a,b)=>{let n=0;for(let t=0;t<len;t++){const [x1,y1]=at(t,a),[x2,y2]=at(t,b);if(Math.abs(lum(x1,y1)-lum(x2,y2))>EDGE_LINE_DIFF)n++;}return n/len;};
  let line=true;for(let d=0;d<k&&line;d++)line=share(d,k)>=EDGE_LINE_COVER;
  if(line&&share(k,k+2)<0.2){found[side]=k;break;}
 }
 if(Object.keys(found).length<EDGE_LINE_SIDES)return null;
 const out=Buffer.from(data);
 for(const [side,k] of Object.entries(found)){const [len,at]=sides[side];for(let t=0;t<len;t++){const [sx,sy]=at(t,k),src=(sy*W+sx)*C;for(let d=0;d<k;d++){const [x,y]=at(t,d),dst=(y*W+x)*C;data.copy(out,dst,src,src+C);}}}
 return {bytes:await sharp(out,{raw:{width:W,height:H,channels:C}}).png().toBuffer(),sides:found};
}
// No mirrored edges (edgeFillVersion 1, Neha, 22 Nov 2026: a 970×300 A+ panel showed a cut-off "M" at the left and a
// second, cropped pillow at the right). The mirror fill above reflected the outermost 43 px of the drawing, so any
// word or product near an edge came back as a reversed copy. 63 of 312 saved fitted pictures were mirror-filled (most
// by 15 px a side, so it showed only when something touched the edge). A flat-colour fill is no better on a busy
// edge: the live 970×250 billboard showed two "solid grey sidebars" with hard seams. With plainEnds the drawing is
// enlarged evenly to cover the canvas and the extra band is trimmed equally from both sides, and the image model is
// told beforehand to keep that band clear of words, logo and product (endsLine). Nothing is duplicated or added.
function endsShare(width,height,drawWidth,drawHeight){
 const shape=Math.abs(drawWidth/drawHeight-width/height)/(width/height);if(shape<=MAX_TRIM_SHAPE)return null;
 const scale=Math.max(width/drawWidth,height/drawHeight),sw=Math.round(drawWidth*scale),sh=Math.round(drawHeight*scale),tall=sh-height>0;
 return {sides:tall?'top and bottom':'left and right',percent:Math.max(1,Math.ceil(((tall?sh-height:sw-width)/2)/(tall?sh:sw)*100)+1)};
}
function endsLine(width,height,drawWidth,drawHeight){
 const e=endsShare(width,height,drawWidth,drawHeight);if(!e)return '';
 return '\n\nEDGES: the final format is '+width+' × '+height+' px, a slightly different shape from this drawing, so about '+e.percent+'% is trimmed off the '+e.sides+' edges. Keep that outer '+e.percent+'% at the '+e.sides+' edges as background only: no words, logo, button, product, person or important object may sit in it or touch those edges.';
}
async function fit(bytes,width,height,{maxTrimShape=MAX_TRIM_SHAPE,extendFlat:flatEnds=false,edgeLines=false,plainEnds=false}={}){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)throw Error('Exact canvas needs a positive whole-pixel size');
 if(edgeLines){const cleaned=await cleanEdgeLines(bytes);if(cleaned){const r=await fit(cleaned.bytes,width,height,{maxTrimShape,extendFlat:flatEnds,plainEnds});return {...r,edgeLines:cleaned.sides};}}
 const meta=await sharp(bytes).metadata(),w=meta.width,h=meta.height;
 const source={width:w,height:h},none={x:0,y:0};
 if(w===width&&h===height)return {bytes,method:'exact',scale:1,shapeDifference:0,trimmed:none,added:none,source};
 const shape=Math.abs(w/h-width/height)/(width/height);
 if(flatEnds&&shape>MAX_TRIM_SHAPE)return extendFlat(bytes,width,height,w,h,shape,source);
 if(plainEnds)maxTrimShape=Infinity;
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
module.exports={fit,cleanEdgeLines,endsShare,endsLine,MAX_TRIM_SHAPE,FLAT_SPREAD};
