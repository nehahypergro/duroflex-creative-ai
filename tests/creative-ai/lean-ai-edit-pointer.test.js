'use strict';
// Pointer pins (Neha, 21 Nov 2026): "in the editor lets not have a box for specifying location. let it
// just be pointers that help navigate the editor. not literally a box, like last time i said the wall
// color should be dark blue, it made only that box navy blue." Before: every pin had a Small/Medium/
// Large square that became the edit mask, so "make this wall dark blue" repainted one square of wall.
// Now a pin only points; the comment decides how far the change reaches; whatever the model did not
// really change (or changed far from every pin) is put back exactly. Offline: fake model, nothing paid.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
const {fixture}=require('./helpers/lean-ai-edit-fixture.cjs'),keepStep=require('../../lib/creative-ai/runtime/edit-keep');
const W=1080,H=1350,WALL='#c9d6c1',NAVY='#1f2f5c',PRODUCT={left:300,top:820,width:480,height:300},LOGO={left:760,top:60,width:240,height:70};
// A room: textured wall (top 60%), floor, a product in front of the wall and a logo on the wall.
async function room(wall=WALL,{productShift=0,logoShift=0,tint=null}={}){
 const dots=[];let seed=5;const r=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let i=0;i<500;i++)dots.push('<circle cx="'+Math.round(r()*W)+'" cy="'+Math.round(r()*H*0.6)+'" r="'+Math.round(2+r()*5)+'" fill="#000" opacity="0.06"/>');
 let floor='';for(let x=0;x<W;x+=60)floor+='<rect x="'+x+'" y="'+H*0.6+'" width="30" height="'+H*0.4+'" fill="#a8835c"/>';
 const product='<g transform="translate('+productShift+',0)"><rect x="'+PRODUCT.left+'" y="'+PRODUCT.top+'" width="'+PRODUCT.width+'" height="'+PRODUCT.height+'" fill="'+(tint||'#8a8f96')+'"/>'+Array.from({length:12},(_,i)=>'<rect x="'+(PRODUCT.left+20+i*38)+'" y="'+(PRODUCT.top+30)+'" width="18" height="240" fill="#5c6168"/>').join('')+'</g>';
 const logo='<g transform="translate('+logoShift+','+logoShift+')"><rect x="'+LOGO.left+'" y="'+LOGO.top+'" width="'+LOGO.width+'" height="'+LOGO.height+'" fill="#e3262f"/><rect x="'+(LOGO.left+20)+'" y="'+(LOGO.top+20)+'" width="200" height="30" fill="#fff"/></g>';
 return sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'"><rect width="100%" height="60%" fill="'+wall+'"/>'+dots.join('')+'<rect y="'+H*0.6+'" width="100%" height="40%" fill="#c4a27a"/>'+floor+product+logo+'</svg>')).png().toBuffer();
}
// The model's answer, drawn slightly zoomed (gpt-image-2 does this) and sized like its real output.
async function answer(bytes,zoom=1.03){const z=Math.round(W*zoom),zh=Math.round(H*zoom),big=await sharp(bytes).resize(z,zh).png().toBuffer();return sharp(await sharp(big).extract({left:Math.round((z-W)/2),top:Math.round((zh-H)/2),width:W,height:H}).png().toBuffer()).resize(1024,1280).png().toBuffer();}
const pixels=async b=>(await sharp(b).removeAlpha().raw().toBuffer());
const share=(buf,rect,test)=>{let n=0,hit=0;for(let y=rect.top;y<rect.top+rect.height;y++)for(let x=rect.left;x<rect.left+rect.width;x++){const o=(y*W+x)*3;n++;if(test(buf[o],buf[o+1],buf[o+2]))hit++;}return hit/n;};
const navy=(r,g,b)=>b>r+40&&b>70&&r<90;
const exact=(a,b,rect)=>share(b,rect,()=>true)&&(()=>{let same=0,n=0;for(let y=rect.top;y<rect.top+rect.height;y++)for(let x=rect.left;x<rect.left+rect.width;x++){const o=(y*W+x)*3;n++;if(a[o]===b[o]&&a[o+1]===b[o+1]&&a[o+2]===b[o+2])same++;}return same/n;})();
const inner=(r,m=12)=>({left:r.left+m,top:r.top+m,width:r.width-2*m,height:r.height-2*m});

for(const brand of ['Duroflex','Sleepyhead'])test(brand+': a pin saying "make this wall dark blue" repaints the whole wall and keeps the product exact',async t=>{
 const original=await room(),painted=await room(NAVY,{logoShift:4});
 const f=await fixture(t,brand,{original,output:async()=>answer(painted)}),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits';
 /* Pin on the wall, far from the product, as Neha did. No area: pins only point. */
 const created=await f.api(base,{...f.unit,annotations:[{type:'pin',x:.15,y:.2,comment:'Make this wall dark blue'}],requestKey:'pointer-wall-0001'});assert.equal(created.status,202,JSON.stringify(created.body));
 assert.equal(created.body.masked,false,'no box mask');
 const saved=await f.done(created.body.id);assert.equal(saved.status,'finished',saved.error);
 const call=f.calls.at(-1);assert.equal(call.mask,undefined,'the model may repaint as far as the comment means');assert.equal(call.attachments[1].assetId,'creative-edit-pins');
 assert.match(call.prompt,/whole object or surface/);assert.match(call.prompt,/Pin 1 \(15% from the left, 20% from the top\): "Make this wall dark blue"/);assert.doesNotMatch(call.prompt,/PINNED AREAS|only these squares/);
 const store=f.runtime.refinements.store(f.job.id),out=await pixels(await fs.readFile(path.join(store.dir(saved.id),saved.result.imageUrl.split('/').pop()))),orig=await pixels(original);
 /* The whole wall turned navy, including the far side of the picture (the old Medium square reached about 26%). */
 for(const [name,rect] of [['left wall',{left:40,top:120,width:200,height:300}],['right wall',{left:700,top:300,width:300,height:300}],['wall above the product',{left:350,top:600,width:380,height:150}]])assert.ok(share(out,rect,navy)>0.9,name+' is navy');
 /* The product was not asked to change: exactly the original pixels (the model drew it zoomed). */
 assert.ok(exact(orig,out,inner(PRODUCT))>0.98,'product pixels are the original');
 /* Known limit: the logo sits ON the recoloured wall, so it comes from the model's redraw (here drawn 4 px off);
    putting the original back would leave a patch of the old wall colour. It must still be there. */
 assert.ok(share(out,LOGO,(r,g,b)=>r>180&&g<80)>0.5,'the logo is still on the wall');
 const child=await store.read(saved.id),info=child.results[0].aiEdit.pointer;assert.equal(child.refinement.pointerVersion,1);assert.equal(info.version,keepStep.VERSION);assert.equal(info.changedOutside,0);assert.ok(info.changedShare>0.4,'a large change was kept');
});

test('far-away redraws are put back, a general note may change the whole picture, and an old area pin keeps its box',async t=>{
 const original=await room();let mode='cushion';
 const f=await fixture(t,'Duroflex',{original,output:async()=>answer(mode==='cushion'?await room(WALL,{productShift:0,logoShift:5,tint:'#a03030'}):await room('#d8c9a8'))}),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits',store=f.runtime.refinements.store(f.job.id),orig=await pixels(original);
 /* A local change: the product colour, pinned on the product. The logo was redrawn shifted far away: put back. */
 const local=await f.api(base,{...f.unit,annotations:[{type:'pin',x:.5,y:.72,comment:'Make this red'}],requestKey:'pointer-local-0001',confirmProductChange:true});assert.equal(local.status,202,JSON.stringify(local.body));
 const s1=await f.done(local.body.id);assert.equal(s1.status,'finished',s1.error);const o1=await pixels(await fs.readFile(path.join(store.dir(s1.id),s1.result.imageUrl.split('/').pop())));
 assert.ok(share(o1,inner(PRODUCT,40),(r,g,b)=>r>130&&g<80)>0.5,'the pinned change is kept');assert.ok(exact(orig,o1,inner(LOGO,6))>0.98,'the far-away logo redraw is put back');assert.ok(exact(orig,o1,{left:40,top:120,width:200,height:300})>0.98,'the wall is the original');
 /* A general note (no pins) may change the whole picture: nothing is put back. */
 mode='note';const note=await f.api(base,{...f.unit,instruction:'Make the lighting warmer',requestKey:'pointer-note-0001',sourceVersionId:'original'});assert.equal(note.status,202,JSON.stringify(note.body));
 const s2=await f.done(note.body.id);assert.equal(s2.status,'finished',s2.error);assert.equal((await store.read(s2.id)).results[0].aiEdit.pointer,undefined,'the note is a whole-picture edit');
 /* Pins saved with an area by an older screen keep the box mask (history stays reproducible). */
 const old=await f.api(base,{...f.unit,annotations:[{type:'pin',x:.5,y:.3,comment:'Make this wall blue',area:'medium'}],requestKey:'pointer-legacy-0001'});assert.equal(old.status,202,JSON.stringify(old.body));assert.equal(old.body.masked,true);
 const s3=await f.done(old.body.id);assert.equal(s3.status,'finished',s3.error);assert.ok(Buffer.isBuffer(f.calls.at(-1).mask));assert.equal((await store.read(s3.id)).refinement.pointerVersion,undefined);
});

for(const brand of ['Duroflex','Sleepyhead'])test(brand+': a product the model only relit for the new wall colour comes back as the original',async t=>{
 /* Neha, 21 Nov 2026 ("Keep original mattress"): replaying her live 19 Nov navy-wall edit, the model had also
    relit the mattress (about 21 levels lighter/cooler) and the step kept that redraw. The wall changes; the
    product, only relit, must be the original pixels. */
 const original=await room(),painted=await room(NAVY,{tint:'#a1a7af'});
 const f=await fixture(t,brand,{original,output:async()=>answer(painted)}),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits';
 const created=await f.api(base,{...f.unit,annotations:[{type:'pin',x:.15,y:.2,comment:'Make this wall dark blue'}],requestKey:'pointer-relit-0001'});assert.equal(created.status,202,JSON.stringify(created.body));
 const saved=await f.done(created.body.id);assert.equal(saved.status,'finished',saved.error);
 const store=f.runtime.refinements.store(f.job.id),out=await pixels(await fs.readFile(path.join(store.dir(saved.id),saved.result.imageUrl.split('/').pop()))),orig=await pixels(original);
 assert.ok(share(out,{left:40,top:120,width:200,height:300},navy)>0.9,'the wall is navy');
 assert.ok(exact(orig,out,inner(PRODUCT))>0.98,'the relit product is the original');
 assert.ok(exact(orig,out,{left:40,top:1150,width:1000,height:150})>0.98,'the floor is the original');
});

test('a tinted product never comes back as a patchwork of original and redrawn pieces',async()=>{
 /* The model recoloured the wall and gave the product a faint tint from it. Each part of the product must be
    either all original or all the model's version, never a mix (21 Nov replay: a sofa came back patchy). */
 const original=await room(),painted=await room(NAVY,{tint:'#868f9e'}),onAnchor=await sharp(await answer(painted,1.02)).resize(W,H).png().toBuffer();
 const r=await keepStep.keep(original,onAnchor,W,H,{pins:[{x:.15,y:.2}]}),out=await pixels(r.bytes),orig=await pixels(original),same=exact(orig,out,inner(PRODUCT,20));
 assert.ok(same>0.97||same<0.03,'product is one piece (share of original pixels '+same.toFixed(3)+')');
 assert.ok(share(out,{left:40,top:120,width:200,height:300},navy)>0.9,'the wall is navy');
});
