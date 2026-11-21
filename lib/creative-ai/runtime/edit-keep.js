'use strict';
// Keep what the edit did not change (pointer pins v1, 21 Nov 2026). Neha: "lets not have a box for
// specifying location ... like last time i said the wall color should be dark blue, it made only that box
// navy blue. so lets add that intelligence". Pins now only point; the image model edits the whole
// picture, so a change reaches as far as the comment means (the whole wall, the whole lamp). Then:
//  1. the model's picture is lined up with the original (even zoom + shift, edit-align.js), because
//     gpt-image-2 can return the scene zoomed;
//  2. a change map finds where the picture really changed: strong differences, grown through
//     connected weaker ones (hysteresis), then widened a little;
//  3. every pixel outside the change map is copied back from the original, with a soft 3 px edge.
// So the product, logo and words stay exactly as they were unless the model actually changed them
// (which the existing after-edit product check then reports). Free: no extra paid call.
// Neha, 21 Nov 2026 ("Keep original mattress"), after a free replay of her live 19 Nov wall edit: the
// model also relit the mattress, floor and button for the darker room, and the step kept its redraw.
// Now a changed area reaches only pixels that changed nearly as much as what the comment named (LIKE ×
// its typical change): the wall turning navy is kept, a mattress merely relit goes back to the original,
// even if its light then matches the new room less well.
const sharp=require('sharp'),edgeAlign=require('./edit-align');
const VERSION=1,STRONG=45,WEAK=20,BLUR=0.004,GROW=0.008,FEATHER=3,LIKE=0.4;

async function rgb(bytes,W,H){return sharp(bytes).resize(W,H,{fit:'fill'}).removeAlpha().toColourspace('srgb').raw().toBuffer();}
// Box average over a (2r+1)² window with an integral image (exact, one channel, no library quirks).
function box(src,W,H,r){
 if(r<1)return Float64Array.from(src);const I=new Float64Array((W+1)*(H+1));
 for(let y=0;y<H;y++){let row=0;for(let x=0;x<W;x++){row+=src[y*W+x];I[(y+1)*(W+1)+x+1]=I[y*(W+1)+x+1]+row;}}
 const out=new Float64Array(W*H);
 for(let y=0;y<H;y++){const y0=Math.max(0,y-r),y1=Math.min(H,y+r+1);for(let x=0;x<W;x++){const x0=Math.max(0,x-r),x1=Math.min(W,x+r+1);out[y*W+x]=(I[y1*(W+1)+x1]-I[y0*(W+1)+x1]-I[y1*(W+1)+x0]+I[y0*(W+1)+x0])/((y1-y0)*(x1-x0));}}
 return out;
}
// Sampled position of each output pixel inside the model's picture after the line-up.
function inside(al,W,H,x,y){const sx=al.scale*x+al.dx,sy=al.scale*y+al.dy;return sx>=0&&sx<=W-1&&sy>=0&&sy<=H-1;}

async function keep(anchor,candidate,W,H,{alignment=true,pins=null,reach=0.06,strong=STRONG,weak=WEAK}={}){
 const lined=alignment?await edgeAlign.align(anchor,candidate,null,W,H,{edges:true}):{bytes:candidate,alignment:{scale:1,dx:0,dy:0,applied:false}};
 const al=lined.alignment,a=await rgb(anchor,W,H),b=await rgb(lined.bytes,W,H),n=W*H;
 // 1. Difference (largest channel), softened so single-pixel noise does not count.
 const diff=Buffer.alloc(n);for(let i=0;i<n;i++){const o=i*3;diff[i]=Math.max(Math.abs(a[o]-b[o]),Math.abs(a[o+1]-b[o+1]),Math.abs(a[o+2]-b[o+2]));}
 const soft=box(diff,W,H,Math.max(1,Math.round(BLUR*Math.min(W,H))));
 // 2. Hysteresis: start from strong changes, grow through connected weaker ones.
 const changed=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
 for(let i=0;i<n;i++)if(soft[i]>=strong){changed[i]=1;queue[tail++]=i;}
 while(head<tail){const i=queue[head++],x=i%W,y=(i/W)|0;for(const j of [x>0?i-1:-1,x<W-1?i+1:-1,y>0?i-W:-1,y<H-1?i+W:-1])if(j>=0&&!changed[j]&&soft[j]>=weak){changed[j]=1;queue[tail++]=j;}}
 // With pins: keep only the changed areas that touch a pin (within `reach` of it). Changes far from
 // every pin are the model redrawing things it was not asked to touch (text, logo, product nudged a
 // few pixels), so they are put back. Without pins (a general note) every change is kept.
 // Group the changed pixels into connected areas.
 const label=new Int32Array(n).fill(-1),q2=new Int32Array(n);let areas=0;
 for(let s0=0;s0<n;s0++){if(!changed[s0]||label[s0]>=0)continue;let h=0,t=0;q2[t++]=s0;label[s0]=areas;while(h<t){const i=q2[h++],x=i%W,y=(i/W)|0;for(const j of [x>0?i-1:-1,x<W-1?i+1:-1,y>0?i-W:-1,y<H-1?i+W:-1])if(j>=0&&changed[j]&&label[j]<0){label[j]=areas;q2[t++]=j;}}areas++;}
 // With pins: keep only the changed areas that touch a pin (within `reach` of it). Changes far from
 // every pin are the model redrawing things it was not asked to touch (text, logo, product nudged a
 // few pixels), so they are put back. Without pins (a general note) every change is kept.
 let touching=null,keepIds=null;
 if(pins?.length){keepIds=new Set();const r=Math.max(2,Math.round(reach*Math.min(W,H)));
  for(const p of pins){const cx=Math.round(p.x*(W-1)),cy=Math.round(p.y*(H-1));for(let y=Math.max(0,cy-r);y<=Math.min(H-1,cy+r);y++)for(let x=Math.max(0,cx-r);x<=Math.min(W-1,cx+r);x++){if((x-cx)**2+(y-cy)**2>r*r)continue;const l=label[y*W+x];if(l>=0)keepIds.add(l);}}
  touching=keepIds.size;}
 // Like for like: inside each kept area, start again from its strong pixels and grow only through pixels
 // that changed at least LIKE × the area's typical strong change. A navy wall (typical change ~190) does
 // not spread into a mattress that was only relit (~20); a subtle recolour (~60) still reaches its own
 // softer shading.
 const typical=new Float64Array(areas);
 {const hist=Array.from({length:areas},()=>new Uint32Array(256));for(let i=0;i<n;i++){const l=label[i];if(l>=0&&soft[i]>=strong)hist[l][Math.min(255,Math.round(soft[i]))]++;}
  for(let l=0;l<areas;l++){let total=0;for(const v of hist[l])total+=v;let acc=0;for(let v=0;v<256;v++){acc+=hist[l][v];if(acc*2>=total){typical[l]=v;break;}}}}
 changed.fill(0);head=0;tail=0;
 for(let i=0;i<n;i++){const l=label[i];if(l>=0&&(!keepIds||keepIds.has(l))&&soft[i]>=strong){changed[i]=1;queue[tail++]=i;}}
 while(head<tail){const i=queue[head++],l=label[i],floor=Math.max(weak,LIKE*typical[l]),x=i%W,y=(i/W)|0;for(const j of [x>0?i-1:-1,x<W-1?i+1:-1,y>0?i-W:-1,y<H-1?i+W:-1])if(j>=0&&!changed[j]&&label[j]===l&&soft[j]>=floor){changed[j]=1;queue[tail++]=j;}}
 // Pixels the lined-up picture could not cover (outside its frame) follow their nearest covered pixel.
 if(al.applied)for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(!inside(al,W,H,x,y)){const sx=Math.max(0,Math.min(W-1,Math.round((Math.max(0,Math.min(W-1,al.scale*x+al.dx))-al.dx)/al.scale))),sy=Math.max(0,Math.min(H-1,Math.round((Math.max(0,Math.min(H-1,al.scale*y+al.dy))-al.dy)/al.scale)));changed[y*W+x]=changed[sy*W+sx];}
 // 3. Widen a little so edges of the change are not cut, then a soft edge.
 const grow=Math.max(2,Math.round(GROW*Math.min(W,H))),wide=box(changed,W,H,grow),mask=new Uint8Array(n);for(let i=0;i<n;i++)mask[i]=wide[i]>0?1:0;
 const soften=box(mask,W,H,FEATHER),alpha=new Uint8Array(n);for(let i=0;i<n;i++)alpha[i]=mask[i]?Math.round(255*soften[i]):0;
 const out=Buffer.alloc(n*3);let kept=0,taken=0;
 for(let i=0;i<n;i++){const t=alpha[i]/255,o=i*3;if(t===0)kept++;else taken++;for(let c=0;c<3;c++)out[o+c]=Math.round(a[o+c]*(1-t)+b[o+c]*t);}
 // Exactness proof: pixels with no change weight are the original's bytes.
 let changedOutside=0;for(let i=0;i<n;i++)if(alpha[i]===0){const o=i*3;if(out[o]!==a[o]||out[o+1]!==a[o+1]||out[o+2]!==a[o+2])changedOutside++;}
 return {bytes:await sharp(out,{raw:{width:W,height:H,channels:3}}).png().toBuffer(),alignment:al,...(touching!==null?{pinnedAreas:touching}:{}),changedShare:Math.round(taken/n*1000)/1000,keptPixels:kept,changedOutside,mask:await sharp(Buffer.from(alpha),{raw:{width:W,height:H,channels:1}}).png().toBuffer()};
}
module.exports={VERSION,keep,STRONG,WEAK,LIKE};
