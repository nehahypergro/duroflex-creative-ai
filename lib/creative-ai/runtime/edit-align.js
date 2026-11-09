'use strict';
// Line up an AI edit with the artwork it edited, before the protected pixels are restored
// (9 Nov 2026 live check: gpt-image-2 returned the whole scene slightly zoomed and shifted, so the
// restored outside pixels no longer met the edited squares and the seams were visible: doubled
// text lines, broken mattress edges). The model output is matched to the anchor by an even zoom
// and a shift, searched on the protected (unmasked) pixels only, then resampled onto the anchor's
// pixel grid. No stretching, rotation or uneven scaling. Small or unclear matches keep the output.
const sharp=require('sharp');

async function gray(bytes,w,h){return (await sharp(bytes).resize(w,h,{fit:'fill',kernel:'lanczos3'}).greyscale().raw().toBuffer());}
// Mean absolute difference of anchor(x,y) against candidate(s*x+tx, s*y+ty) over usable pixels.
function cost(a,c,use,w,h,s,tx,ty,step=1){
 let sum=0,n=0;
 for(let y=0;y<h;y+=step){const sy=s*y+ty;if(sy<0||sy>h-1)continue;const y0=sy|0,fy=sy-y0,y1=Math.min(h-1,y0+1);
  for(let x=0;x<w;x+=step){const i=y*w+x;if(!use[i])continue;const sx=s*x+tx;if(sx<0||sx>w-1)continue;const x0=sx|0,fx=sx-x0,x1=Math.min(w-1,x0+1);
   const v=(c[y0*w+x0]*(1-fx)+c[y0*w+x1]*fx)*(1-fy)+(c[y1*w+x0]*(1-fx)+c[y1*w+x1]*fx)*fy;sum+=Math.abs(a[i]-v);n++;}}
 return n>w*h*0.2/(step*step)?sum/n:Infinity;
}
function usable(region,W,H,w,h,grow){
 // A thumbnail pixel is usable when no editable pixel lies within `grow` thumbnail pixels.
 const use=new Uint8Array(w*h).fill(1);if(!region)return use;
 for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++)if(region[Y*W+X]){const x=Math.floor(X*w/W),y=Math.floor(Y*h/H);for(let j=Math.max(0,y-grow);j<=Math.min(h-1,y+grow);j++)for(let i=Math.max(0,x-grow);i<=Math.min(w-1,x+grow);i++)use[j*w+i]=0;}
 return use;
}
async function search(anchor,candidate,region,W,H,size){
 const w=size,h=Math.max(16,Math.round(size*H/W)),a=await gray(anchor,w,h),c=await gray(candidate,w,h),use=usable(region,W,H,w,h,2);
 return {w,h,a,c,use};
}
// Returns {scale,dx,dy (full-resolution pixels), before, after, applied}.
async function estimate(anchor,candidate,region,W,H,{maxScale=0.08,maxShift=0.06}={}){
 const coarse=await search(anchor,candidate,region,W,H,128);
 const identity=cost(coarse.a,coarse.c,coarse.use,coarse.w,coarse.h,1,0,0);
 let best={s:1,tx:0,ty:0,v:identity};
 const shift=Math.ceil(maxShift*coarse.w);
 for(let s=1-maxScale;s<=1+maxScale+1e-9;s+=0.01)for(let ty=-shift;ty<=shift;ty++)for(let tx=-shift;tx<=shift;tx++){const v=cost(coarse.a,coarse.c,coarse.use,coarse.w,coarse.h,s,tx,ty,2);if(v<best.v)best={s,tx,ty,v};}
 // Refine at a finer size around the coarse answer.
 const fine=await search(anchor,candidate,region,W,H,384),k=fine.w/coarse.w;
 let f={s:best.s,tx:best.tx*k,ty:best.ty*k,v:cost(fine.a,fine.c,fine.use,fine.w,fine.h,best.s,best.tx*k,best.ty*k)};
 for(const [ds,dt] of [[0.005,1.5],[0.002,0.6],[0.001,0.25]]){const c0={...f};for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)for(let l=-2;l<=2;l++){const s=c0.s+i*ds,tx=c0.tx+j*dt,ty=c0.ty+l*dt,v=cost(fine.a,fine.c,fine.use,fine.w,fine.h,s,tx,ty);if(v<f.v)f={s,tx,ty,v};}}
 const before=cost(fine.a,fine.c,fine.use,fine.w,fine.h,1,0,0),scale=f.s,dx=f.tx*W/fine.w,dy=f.ty*H/fine.h;
 // Apply only a clear improvement that is not a trivial sub-pixel move.
 const moved=Math.abs(scale-1)*Math.max(W,H)>0.75||Math.hypot(dx,dy)>0.75;
 const applied=moved&&Number.isFinite(f.v)&&f.v<before*0.85;
 return {scale:applied?scale:1,dx:applied?dx:0,dy:applied?dy:0,before:Math.round(before*100)/100,after:Math.round((applied?f.v:before)*100)/100,applied};
}
// Resample the candidate onto the anchor grid: aligned(x,y) = candidate(s*x+dx, s*y+dy).
async function apply(candidate,W,H,{scale,dx,dy}){
 const src=await sharp(candidate).resize(W,H,{fit:'fill'}).removeAlpha().raw().toBuffer(),out=Buffer.alloc(W*H*3);
 for(let y=0;y<H;y++){const sy=Math.max(0,Math.min(H-1,scale*y+dy)),y0=sy|0,fy=sy-y0,y1=Math.min(H-1,y0+1);
  for(let x=0;x<W;x++){const sx=Math.max(0,Math.min(W-1,scale*x+dx)),x0=sx|0,fx=sx-x0,x1=Math.min(W-1,x0+1),o=(y*W+x)*3;
   for(let ch=0;ch<3;ch++){const p=(r,c)=>src[(r*W+c)*3+ch];out[o+ch]=Math.round((p(y0,x0)*(1-fx)+p(y0,x1)*fx)*(1-fy)+(p(y1,x0)*(1-fx)+p(y1,x1)*fx)*fy);}}}
 return sharp(out,{raw:{width:W,height:H,channels:3}}).png().toBuffer();
}
async function align(anchor,candidate,region,W,H,options){
 const found=await estimate(anchor,candidate,region,W,H,options);
 return {bytes:found.applied?await apply(candidate,W,H,found):candidate,alignment:found};
}
module.exports={align,estimate,apply};
