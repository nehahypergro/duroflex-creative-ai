'use strict';
// Regression (22 Nov 2026, Neha on a live Duroflex "Spine Contour · Basic A+ page": "how can it specify random text and
// cropped pillow … why isn't it being caught"). The 970×300 A+ overlay panel is drawn at 1744×592 (gpt-image-2 stops
// near 3:1); the size fit then MIRRORED the outer 43 px on each side, so the headline's edge came back as a reversed
// "M" at the left and the pillow's end as a second, cropped pillow at the right. The plan never asked for either; the
// check saw them but they are layout, so nothing re-drew them (and a re-draw would have been mirrored again). 63 of 312
// saved fitted pictures were mirror-filled. New lean jobs pin edgeFillVersion 1: the ends are filled with the drawing's
// own edge colour and the model is told to keep them plain. Same day, "here the shadow should have been as per the
// pillow shape": new jobs pin shadowCheckVersion 1 (realism check wording + image brief line). Failing before.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp'),fs=require('node:fs'),path=require('node:path');
const BRANDS=[['Duroflex','#d8382c'],['Sleepyhead','#0b6e6e']];
// A wide drawing with a word block touching the left edge and a product touching the right edge.
async function drawing(accent){
 const W=1744,H=592,svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#dfe8f2"/>`+
  `<rect x="0" y="160" width="70" height="120" fill="#1d2a4d"/><rect x="1500" y="300" width="244" height="170" rx="30" fill="${accent}"/></svg>`;
 return sharp(Buffer.from(svg)).png().toBuffer();
}
const raw=async bytes=>sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
const px=(r,x,y)=>{const i=(y*r.info.width+x)*3;return [r.data[i],r.data[i+1],r.data[i+2]];};
// Distinct colours inside the left/right added band (a plain fill has one; a mirrored copy has the content's colours).
function bandColours(r,from,to){const set=new Set();for(let x=from;x<to;x++)for(let y=0;y<r.info.height;y+=2)set.add(px(r,x,y).map(v=>v>>3).join(','));return set.size;}
for(const [brand,accent] of BRANDS)test(brand+': a wide A+ panel gets plain ends, never a mirrored copy of the words or product',async()=>{
 const {fit,endsLine,endsShare}=require('../../lib/creative-ai/runtime/exact-canvas');
 const bytes=await drawing(accent);
 const before=await fit(bytes,970,300);assert.equal(before.method,'extend','earlier jobs keep the mirror fill');
 const b=await raw(before.bytes),band=before.added.x/2;assert.ok(band>=40,'about 43 px added on each side');
 assert.ok(bandColours(b,0,Math.floor(band))>1&&bandColours(b,970-Math.floor(band),970)>1,'before: the mirrored band repeats the words and product');
 const after=await fit(bytes,970,300,{plainEnds:true});assert.equal(after.method,'extend-flat');
 const a=await raw(after.bytes),left=Math.floor(after.added.x/2),right=Math.ceil(after.added.x/2);
 assert.equal(bandColours(a,0,left),1,'left end is one plain colour');assert.equal(bandColours(a,970-right,970),1,'right end is one plain colour');
 assert.equal(after.added.y,0);assert.equal(after.scale,before.scale,'the whole drawing is kept at the same even scale');
 const line=endsLine(970,300,1744,592);assert.match(line,/left and right/);assert.match(line,/no words, logo, product/);assert.equal(endsShare(970,300,1744,592).percent,6);
 assert.equal(endsLine(1080,1080,1008,1008),'','no line when the drawing already has the right shape');
 assert.match(endsLine(1464,600,1568,656),/outer 3% at the left and right/,'A+ Premium wide panels: 15 px a side (1%), rounded up with one point to spare');
 const band2=await fit(bytes,970,300,{plainEnds:true,maxTrimShape:Infinity});assert.equal(band2.method,'trim','banner strip sizes keep their band crop');
});
test('the realism check and the image brief cover shadows that do not follow their object, for pinned records only',()=>{
 const v=require('../../lib/creative-ai/lean/visual-review');
 for(const [brand] of BRANDS){
  const input={brand:{mandatory:[]},format:{name:'Basic A+ page',structure:'Wide panel',text:'Short',pages:[{id:'p',name:'Overlay image',size:'970x300',structure:'Wide panel',text:'Short'}]},product:{name:brand+' Spine Contour Pillow',variant:'Standard',appearance:'contoured, honeycomb cover',facts:[]}},plan={pages:[{id:'p',copy:[],purpose:'Material close-up',spatial:'Pillow right, words left',typography:'Sans'}]};
  const realism=c=>(c.requirements||c).find(r=>r.id==='physical-realism').expected;
  const on=realism(v.contract(input,plan,'p',{realism:true,shadows:true})),off=realism(v.contract(input,plan,'p',{realism:true}));
  assert.match(on,/shadow whose outline does not follow the shape/);assert.match(on,/plain rectangular slab/);assert.doesNotMatch(off,/plain rectangular slab/,brand+': earlier records keep their wording');
 }
 assert.match(v.SHADOW_PROMPT,/never a plain rectangle/);
});
test('new lean jobs pin edgeFillVersion and shadowCheckVersion, and every fit uses the record pin',()=>{
 const repo=path.join(__dirname,'../..'),read=f=>fs.readFileSync(path.join(repo,f),'utf8'),wf=read('lib/creative-ai/runtime/lean-workflow.js');
 assert.match(read('lib/creative-ai/runtime/lean-policy.js'),/edgeLineVersion:1,edgeFillVersion:1,shadowCheckVersion:1,/);
 const snap=require('../../lib/creative-ai/runtime/provider-config').snapshot({edgeFillVersion:1,shadowCheckVersion:1});assert.equal(snap.edgeFillVersion,1);assert.equal(snap.shadowCheckVersion,1);
 assert.equal((wf.match(/exact-canvas'\)\.fit\([^;]*fitOptions\(record\)/g)||[]).length,4,'first drawing, story redraw, correction and edge fit');
 assert.match(wf,/fit\(raw,panel\.width,panel\.height,\{[^}]*record\.edgeFillVersion===1\?\{plainEnds:true\}/,'brochure panels');
 assert.match(wf,/if\(exact\)request\.prompt\+=endsLine\(record\)/);assert.match(wf,/prompt:record\.prompt\+\(exact\?endsLine\(record\):''\)\+line/);
 assert.match(wf,/edgeFillVersion===1\?\{edgeFillVersion:1\}/);assert.match(wf,/shadowCheck\?visual\.SHADOW_PROMPT:''/);
});
