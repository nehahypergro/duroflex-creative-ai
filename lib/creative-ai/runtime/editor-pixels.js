'use strict';
// Text colour is compared with the surrounding wall/button, never with the most
// frequent colour *inside* a bold headline (which may itself be the lettering).
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function bounds(info,r,pad=0){return {x0:Math.max(0,Math.floor(r.x*info.width)-pad),y0:Math.max(0,Math.floor(r.y*info.height)-pad),x1:Math.min(info.width,Math.ceil((r.x+r.width)*info.width)+pad),y1:Math.min(info.height,Math.ceil((r.y+r.height)*info.height)+pad)};}
function ink(raw,region){
 const {data,info}=raw,b=bounds(info,region),ring=bounds(info,region,6),inside=new Map(),outside=new Map();
 function add(map,x,y){const i=(y*info.width+x)*info.channels,rgb=[data[i],data[i+1],data[i+2]],key=rgb.map(v=>Math.round(v/16)).join(',');let a=map.get(key);if(!a)map.set(key,a={n:0,sum:[0,0,0]});a.n++;rgb.forEach((v,k)=>a.sum[k]+=v);}
 for(let y=ring.y0;y<ring.y1;y++)for(let x=ring.x0;x<ring.x1;x++)add(x>=b.x0&&x<b.x1&&y>=b.y0&&y<b.y1?inside:outside,x,y);
 const clusters=map=>[...map.values()].map(a=>({n:a.n,rgb:a.sum.map(v=>Math.round(v/a.n))})).sort((a,b)=>b.n-a.n),outer=clusters(outside),total=outer.reduce((n,a)=>n+a.n,0);let covered=0;const bg=[];
 // Trim the least frequent ring colours: neighbouring glyphs can extend into
 // the ring and must not become background prototypes.
 for(const c of outer){bg.push(c);covered+=c.n;if(covered>=total*.8)break;}
 const candidates=clusters(inside).filter(a=>a.n>=8).map(a=>({...a,contrast:bg.length?Math.min(...bg.map(b=>distance(a.rgb,b.rgb))):0}));
 candidates.sort((a,b)=>b.contrast*Math.sqrt(b.n)-a.contrast*Math.sqrt(a.n));const best=candidates[0]||{rgb:[255,255,255],contrast:0,n:0};
 return {rgb:best.rgb,confidence:best.contrast>=55?.9:best.contrast>=30?.7:0,contrast:best.contrast,method:'foreground-versus-surrounding-pixels'};
}
function textMask(raw,regions,preserve=[]){
 const {data,info}=raw,w=info.width,h=info.height,mask=new Uint8Array(w*h);
 for(const r of regions){const found=ink(raw,r);if(found.confidence<.7)continue;const b=bounds(info,r,2),seeds=[];const tolerance=Math.min(65,Math.max(22,found.contrast*.3));
  for(let y=b.y0;y<b.y1;y++)for(let x=b.x0;x<b.x1;x++){const i=(y*w+x)*info.channels;if(distance([data[i],data[i+1],data[i+2]],found.rgb)<=tolerance)seeds.push(y*w+x);}
  // Include antialiased glyph edges while preserving the space between letters.
  for(const p of seeds){const x=p%w,y=Math.floor(p/w);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx>=b.x0&&xx<b.x1&&yy>=b.y0&&yy<b.y1)mask[yy*w+xx]=1;}}
 }
 for(const r of preserve){const b=bounds(info,r,4);for(let y=b.y0;y<b.y1;y++)for(let x=b.x0;x<b.x1;x++)mask[y*w+x]=0;}
 return mask;
}
function separable(raw,match){return match.lines.length>0&&match.lines.every(r=>ink(raw,r.box).confidence>=.7);}
module.exports={ink,textMask,bounds,separable};
