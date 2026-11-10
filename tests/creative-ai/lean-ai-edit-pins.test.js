'use strict';
// Pin comments for the lean image editor (user request, 9 Nov 2026: "i dont want box. just
// pins/comments that act as edits"). Before: a pin was only a location and the change had to be
// typed separately; nothing showed the model where a pin was except percentages in the prompt.
// Now each pin carries its own comment, comments alone can be sent, and the model also receives
// a deterministic copy of the design with numbered pins drawn on it. That copy is bound to the
// child version and re-verified by the brand-scoped provider. Offline only: nothing paid.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
const {fixture,sha}=require('./helpers/lean-ai-edit-fixture.cjs'),{LeanEdits}=require('../../lib/creative-ai/runtime/lean-edits'),pins=require('../../lib/creative-ai/runtime/edit-pins');
const two=[{type:'pin',x:.3,y:.4,comment:'  Make this vase white  '},{type:'pin',x:.72,y:.25,comment:'Remove this lamp'}];

for(const brand of ['Duroflex','Sleepyhead'])test(brand+': pin comments alone make one edit guided by a bound pins image',async t=>{
 const f=await fixture(t,brand),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits';
 const send={...f.unit,annotations:two,requestKey:'pins-request-0001',sourceVersionId:'original',expectedVersionId:'original'};
 const created=await f.api(base,send);assert.equal(created.status,202,JSON.stringify(created.body));
 assert.equal(created.body.instruction,'');assert.equal(created.body.masked,false);
 assert.deepEqual(created.body.annotations.map(a=>a.comment),['Make this vase white','Remove this lamp'],'comments are trimmed and kept');
 const saved=await f.done(created.body.id);assert.equal(saved.status,'finished',saved.error);
 assert.equal(f.calls.length,1,'exactly one image request');const call=f.calls[0];
 assert.equal(call.mask,undefined,'pins do not mask the image');
 assert.deepEqual(call.attachments.slice(0,2).map(a=>a.assetId),['creative-edit-anchor','creative-edit-pins']);
 assert.match(call.prompt,/Image 2 is the same design with numbered pins/);assert.match(call.prompt,/Never draw pins, numbers or markers/);
 assert.match(call.prompt,/Pin 1 \(30% from the left, 40% from the top\): "Make this vase white"/);assert.match(call.prompt,/Pin 2 \(72% from the left, 25% from the top\): "Remove this lamp"/);
 assert.doesNotMatch(call.prompt,/USER REQUEST/,'no empty general request line');assert.match(call.prompt,/Image 3: product reference/);assert.match(call.prompt,/BRAND BOUNDARY: /);
 // The pins image is the anchor plus markers, saved with the child and bound by hash.
 const store=f.runtime.refinements.store(f.job.id),dir=store.dir(saved.id),binding=JSON.parse(await fs.readFile(path.join(dir,'creative-edit-anchor.json'),'utf8'));
 const file=await fs.readFile(path.join(dir,'ai-edit-pins.png')),rebuilt=await pins.render(f.original,created.body.annotations);
 assert.equal(binding.pinsName,'ai-edit-pins.png');assert.equal(binding.pinsSha256,sha(file));assert.equal(sha(rebuilt),sha(file),'deterministic');assert.equal(call.attachments[1].sha256,binding.pinsSha256);
 const meta=await sharp(file).metadata();assert.deepEqual([meta.width,meta.height],[1080,1350]);
 assert.notEqual(sha(file),sha(f.original),'markers are drawn');
 const child=await store.read(saved.id);assert.deepEqual(child.results[0].aiEdit.annotations.map(a=>a.comment),['Make this vase white','Remove this lamp']);assert.equal(saved.result.check,'passed');
 assert.deepEqual(await fs.readFile(path.join(f.runtime.store.dir(f.job.id),f.name)),f.original,'original artwork untouched');
 // A general note can go with the pins.
 const both=await f.api(base,{...f.unit,instruction:'Make the light warmer overall',annotations:two.slice(0,1),requestKey:'pins-request-0002'});assert.equal(both.status,202,JSON.stringify(both.body));
 const s2=await f.done(both.body.id);assert.equal(s2.status,'finished',s2.error);assert.match(f.calls.at(-1).prompt,/USER REQUEST \(an editing instruction, not new product evidence\): Make the light warmer overall/);assert.match(f.calls.at(-1).prompt,/Pin 1 \(30% from the left, 40% from the top\): "Make this vase white"/);
});

test('empty, oversized or malformed pin comments are refused before any paid request',async t=>{
 const f=await fixture(t,'Duroflex'),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits',send={...f.unit,requestKey:'pins-request-0101'};
 assert.match((await f.api(base,{...send,annotations:[{type:'pin',x:.5,y:.5}]})).body.error,/Type the change/);
 assert.match((await f.api(base,{...send,annotations:[{type:'pin',x:.5,y:.5,comment:'   '}]})).body.error,/Type the change/);
 assert.match((await f.api(base,{...send,annotations:[{type:'pin',x:.5,y:.5,comment:'x'.repeat(301)}]})).body.error,/300 characters/);
 assert.match((await f.api(base,{...send,annotations:[{type:'pin',x:.5,y:.5,comment:42}]})).body.error,/comment/i);
 assert.equal(f.calls.length,0,'nothing was sent');assert.equal((await f.runtime.refinements.store(f.job.id).list()).length,0,'no version was started');
});

test('a changed or forged pins image is blocked before the image request',async t=>{
 const f=await fixture(t,'Sleepyhead'),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits',edits=f.runtime.leanEdits,store=f.runtime.refinements.store(f.job.id);
 edits.run=async()=>{}; /* Hold the job so its saved pins image can be tampered with first. */
 const created=await f.api(base,{...f.unit,annotations:two,requestKey:'pins-request-0201'});assert.equal(created.status,202,JSON.stringify(created.body));
 const dir=store.dir(created.body.id),original=await fs.readFile(path.join(dir,'ai-edit-pins.png'));
 await fs.writeFile(path.join(dir,'ai-edit-pins.png'),await sharp({create:{width:1080,height:1350,channels:3,background:'#000'}}).png().toBuffer());
 await assert.rejects(()=>LeanEdits.prototype.run.call(edits,f.job.id,created.body.id),/pins changed/);assert.equal(f.calls.length,0);
 /* Restore the saved file; the brand-scoped provider still refuses a pins image whose bytes do not match the binding. */
 await fs.writeFile(path.join(dir,'ai-edit-pins.png'),original);
 const binding=JSON.parse(await fs.readFile(path.join(dir,'creative-edit-anchor.json'),'utf8')),anchor=await fs.readFile(path.join(f.runtime.store.dir(f.job.id),f.name));
 const anchorRef={assetId:'creative-edit-anchor',ownership:'generated-project-reference',brandId:f.own.b.id,roles:['visual-style'],sourceIds:[],sha256:binding.sha256,imageData:'data:image/png;base64,'+anchor.toString('base64')};
 const forged=await pins.render(anchor,[{type:'pin',number:1,x:.9,y:.9,comment:'Elsewhere'}]);
 const request=imgs=>({prompt:'x',attachments:imgs,quality:'high',model:'gpt-image-2',size:'1024x1280',scope:{route:'continuity',placementId:'square'},requestKey:'x'.repeat(16)});
 await assert.rejects(()=>f.runtime.provider.generate(request([anchorRef,{assetId:'creative-edit-pins',ownership:'generated-project-reference',brandId:f.own.b.id,roles:['visual-style'],sourceIds:[],sha256:sha(forged),imageData:'data:image/png;base64,'+forged.toString('base64')}]),store.budget(created.body.id)),/pins image/);
 await assert.rejects(()=>f.runtime.provider.generate(request([{assetId:'creative-edit-pins',ownership:'generated-project-reference',brandId:f.own.b.id,roles:['visual-style'],sourceIds:[],sha256:sha(original),imageData:'data:image/png;base64,'+original.toString('base64')}]),store.budget(created.body.id)),/pins image/);
 assert.equal(f.calls.length,0,'no image request reached the provider');
});

/* Pin areas (user, 9 Nov 2026: "Yes, protect it", after the live pin edit zoomed the whole picture).
   Before: pins only guided a whole-picture redraw, so everything away from the pins could shift.
   Now each pin has an area (small/medium/large) that becomes the edit mask; every other pixel is
   restored from the version being edited. Pins saved without an area keep the earlier behaviour. */
async function textured(){const w=1080,h=1350,data=Buffer.alloc(w*h*3);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*3;data[i]=(x*7+y)%256;data[i+1]=(x*3+y*5)%256;data[i+2]=(x^y)%256;}return sharp(data,{raw:{width:w,height:h,channels:3}}).png().toBuffer();}
const rgb=async b=>(await sharp(b).removeAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true}));
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': pin areas protect everything outside them',async t=>{
 const f=await fixture(t,brand,{original:await textured()}),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits';
 const marks=[{type:'pin',x:.3,y:.4,comment:'Make these books dark green',area:'medium'},{type:'pin',x:.98,y:.05,comment:'Remove this lamp',area:'small'}];
 const created=await f.api(base,{...f.unit,annotations:marks,requestKey:'pins-area-0001'});assert.equal(created.status,202,JSON.stringify(created.body));
 assert.equal(created.body.masked,true);assert.deepEqual(created.body.annotations.map(a=>a.area),['medium','small']);
 const saved=await f.done(created.body.id);assert.equal(saved.status,'finished',saved.error);
 const call=f.calls.at(-1);assert.ok(Buffer.isBuffer(call.mask),'the pin areas are sent as a mask');assert.equal(call.attachments[1].assetId,'creative-edit-pins');
 assert.match(call.prompt,/PINNED AREAS/);assert.match(call.prompt,/Pin 1 area = left /);assert.match(call.prompt,/restored pixel for pixel/);
 /* The mask is exactly the two areas, each clamped inside the design. */
 const areas=marks.map(p=>pins.areaOf(p,1080,1350));
 assert.ok(areas[1].x+areas[1].width<=1&&areas[1].y>=0,'an area near the edge stays inside the design');
 assert.ok(Math.abs(areas[0].width*1080-pins.AREAS.medium*1080)<1&&Math.abs(areas[0].height*1350-pins.AREAS.medium*1080)<1,'a medium area is a square of the set size');
 const region=require('../../lib/creative-ai/runtime/lean-edits').regionOf(created.body.annotations,1080,1350),m=await sharp(call.mask).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<region.length;i+=97)assert.equal(m.data[i*4+3]===0,!!region[i],'mask pixel '+i);
 const at=(x,y)=>region[Math.round(y*1350)*1080+Math.round(x*1080)];assert.equal(at(.3,.4),1,'pin 1 area opens');assert.equal(at(.6,.7),0,'far from the pins stays protected');
 /* Saved version: outside the areas byte-identical to the anchor. */
 const store=f.runtime.refinements.store(f.job.id),file=path.join(store.dir(saved.id),saved.result.imageUrl.split('/').pop());
 const [a,b]=await Promise.all([rgb(f.original),rgb(await fs.readFile(file))]);let outside=0;for(let i=0;i<region.length;i++)if(!region[i]&&(a.data[i*3]!==b.data[i*3]||a.data[i*3+1]!==b.data[i*3+1]||a.data[i*3+2]!==b.data[i*3+2]))outside++;
 assert.equal(outside,0,'every pixel outside the pin areas is unchanged');
 const child=await store.read(saved.id);assert.equal(child.results[0].aiEdit.mask.outsideMaskChangedPixels,0);
});
test('oversized or unknown pin areas are refused before any paid request; pins without an area stay unmasked',async t=>{
 const f=await fixture(t,'Duroflex'),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits',send={...f.unit,requestKey:'pins-area-0101'};
 assert.match((await f.api(base,{...send,annotations:[{type:'pin',x:.5,y:.5,comment:'x',area:'huge'}]})).body.error,/area/i);
 const big=[{x:.2,y:.2},{x:.8,y:.2},{x:.2,y:.8},{x:.8,y:.8}].map(p=>({type:'pin',...p,comment:'Change this',area:'large'}));
 assert.match((await f.api(base,{...send,annotations:big})).body.error,/more than about a third/);
 assert.equal(f.calls.length,0,'nothing was sent');
 const plain=await f.api(base,{...send,annotations:[{type:'pin',x:.5,y:.5,comment:'Brighter'}]});assert.equal(plain.status,202,JSON.stringify(plain.body));assert.equal(plain.body.masked,false);
 const s=await f.done(plain.body.id);assert.equal(s.status,'finished',s.error);assert.equal(f.calls.at(-1).mask,undefined);
});

/* Seams (9 Nov 2026 live check, ₹13.14): gpt-image-2 returned the scene about 4.5% zoomed and
   shifted. Restoring the protected pixels then left visible seams at the area edges (a doubled
   text line, a broken mattress edge). Now the output is lined up with the original (even zoom and
   shift only) before the restore. The fake model here returns a zoomed, shifted copy with a change
   inside pin 1's area. */
async function scene(){const w=1080,h=1350,shapes=[];let seed=7;const r=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let i=0;i<1400;i++)shapes.push('<rect x="'+Math.round(r()*w)+'" y="'+Math.round(r()*h)+'" width="'+Math.round(6+r()*40)+'" height="'+Math.round(6+r()*40)+'" fill="rgb('+[0,0,0].map(()=>Math.round(r()*255)).join(',')+')" opacity="0.8"/>');
 return sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="100%" height="100%" fill="#d8e4ef"/>'+shapes.join('')+'</svg>')).png().toBuffer();}
const seam=async(original,file,region,W,H)=>{const [a,b]=await Promise.all([rgb(original),rgb(file)]);let sum=0,n=0;
 /* Pixels just inside the area edge, where a misaligned redraw meets the restored original. */
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;if(!region[i])continue;if(region[i-1]&&region[i+1]&&region[i-W]&&region[i+W])continue;
  for(let d=2;d<=8;d+=3){for(const [ox,oy] of [[d,0],[-d,0],[0,d],[0,-d]]){const j=(y+oy)*W+(x+ox);if(region[j]&&a.data[j*3]!==undefined){sum+=Math.abs(a.data[j*3]-b.data[j*3])+Math.abs(a.data[j*3+1]-b.data[j*3+1])+Math.abs(a.data[j*3+2]-b.data[j*3+2]);n++;}}}}
 return sum/n;};
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': a zoomed and shifted AI result is lined up before the protected pixels are restored',async t=>{
 const original=await scene(),W=1080,H=1350;
 /* Model output: the scene zoomed 4% about its centre and moved, with a red patch at pin 1. */
 const output=async()=>{const z=Math.round(W*1.04),zh=Math.round(H*1.04),big=await sharp(original).resize(z,zh).png().toBuffer();
  const moved=await sharp(big).extract({left:Math.round((z-W)/2)+9,top:Math.round((zh-H)/2)+6,width:W,height:H}).png().toBuffer();
  return sharp(moved).composite([{input:await sharp({create:{width:90,height:90,channels:3,background:'#c0102a'}}).png().toBuffer(),left:Math.round(.3*W)-45,top:Math.round(.4*H)-45}]).resize(1024,1280).png().toBuffer();};
 const f=await fixture(t,brand,{original,output}),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits';
 const created=await f.api(base,{...f.unit,annotations:[{type:'pin',x:.3,y:.4,comment:'Make this red',area:'large'}],requestKey:'pins-align-0001'});assert.equal(created.status,202,JSON.stringify(created.body));
 const saved=await f.done(created.body.id);assert.equal(saved.status,'finished',saved.error);
 const store=f.runtime.refinements.store(f.job.id),file=await fs.readFile(path.join(store.dir(saved.id),saved.result.imageUrl.split('/').pop()));
 const region=require('../../lib/creative-ai/runtime/lean-edits').regionOf(created.body.annotations,W,H);
 const edge=await seam(original,file,region,W,H);assert.ok(edge<25,'no visible seam just inside the area edge (mean colour difference '+edge.toFixed(1)+')');
 const child=await store.read(saved.id),al=child.results[0].aiEdit.alignment;assert.equal(al.applied,true);assert.ok(Math.abs(al.scale-1.04)<0.01,'zoom found '+al.scale);assert.ok(al.after<al.before*0.5,'match improved '+JSON.stringify(al));
 assert.equal(child.results[0].aiEdit.mask.outsideMaskChangedPixels,0,'outside the area is still exactly the original');
 /* The requested change inside the area survives the line-up. */
 const px=(await rgb(file)).data,at=(Math.round(.4*H)*W+Math.round(.3*W))*3;assert.ok(px[at]>150&&px[at+1]<60,'the red change is kept');
});

// Error fixes 16-19 (editor test, 10 Nov 2026). A pin's square cut a headline in half ("Sust after fter offg
// workcrs."), recoloured half of the wrong cushion, left a leaf behind and never added the lamp or the dog;
// and the editor changed the real mattress when asked. Now: a wording pin covers the whole text block the
// local text reader finds under it; an add/replace/remove pin uses at least the Large square; the editor can
// preview the areas for free; and a request that changes the product needs the user's confirmation.
const headline=[{text:'Support after',confidence:1,box:{x:0.05,y:0.20,width:0.40,height:0.05}},{text:'office hours.',confidence:1,box:{x:0.05,y:0.26,width:0.38,height:0.05}},{text:'Shop now',confidence:1,box:{x:0.40,y:0.90,width:0.2,height:0.04}}];
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': a wording pin covers the whole headline; an add pin uses the Large area',async t=>{
  const f=await fixture(t,brand);f.runtime.editOcr=async()=>({status:'measured',rows:headline});const base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits';
  const marks=[{type:'pin',x:0.24,y:0.22,area:'large',comment:'Change this headline to: Rest after long workdays.'},{type:'pin',x:0.75,y:0.7,area:'medium',comment:'Add a small dog sleeping on the rug here'}];
  const preview=await f.api(base+'/areas',{...f.unit,annotations:marks});assert.equal(preview.status,200,JSON.stringify(preview.body));assert.equal(f.calls.length,0,'preview is free');
  const [text,add]=preview.body.areas;assert.equal(text.basis,'text-block');assert.ok(text.box.x<=0.05&&text.box.x+text.box.width>=0.45&&text.box.y<=0.2&&text.box.y+text.box.height>=0.31,'both headline lines, full width: '+JSON.stringify(text.box));
  assert.ok(text.box.y+text.box.height<0.5,'the button text is not included');assert.equal(add.basis,'add-or-replace');assert.ok(Math.abs(add.box.width-0.42*1080/1080)<0.01,'Large square');
  const created=await f.api(base,{...f.unit,annotations:marks,requestKey:'areas-request-0001',sourceVersionId:'original',expectedVersionId:'original'});assert.equal(created.status,202,JSON.stringify(created.body));
  const saved=await f.done(created.body.id);assert.equal(saved.status,'finished',saved.error);
  const child=await f.runtime.refinements.store(f.job.id).read(saved.id);assert.equal(child.refinement.areaVersion,1);
  assert.deepEqual(child.refinement.annotations.map(a=>a.areaBasis),['text-block','add-or-replace']);assert.deepEqual(child.refinement.annotations[0].areaBox,text.box,'the saved area is the previewed one');
  assert.ok(f.calls[0].mask,'masked to the adapted areas');
  const again=await f.api(base,{...f.unit,annotations:marks,requestKey:'areas-request-0001',sourceVersionId:'original',expectedVersionId:'original'});assert.equal(again.body.id,created.body.id,'the same Send is recognised, never bought twice');
 });
 test(brand+': changing the product itself needs a confirmation',async t=>{
  const f=await fixture(t,brand),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits',product='product';
  const logo=await f.api(base+'/areas',{...f.unit,instruction:'Make the '+brand+' logo bigger'});assert.equal(logo.body.productChange,false,'the brand name or logo is not the product');
  const send={...f.unit,instruction:'Make the '+product+' fabric dark grey',requestKey:'product-change-0001',sourceVersionId:'original',expectedVersionId:'original'};
  const refused=await f.api(base,send);assert.notEqual(refused.status,202);assert.match(refused.body.error,/changes the product itself/);assert.equal(f.calls.length,0,'nothing paid');
  // Live recheck, 10 Nov 2026: the real server reply lacked the code the editor needs to show "Send anyway".
  {const handler=require('../../lib/creative-ai/runtime/http').createHandler({root:f.root,provider:{checkAccess:async()=>({})}}),res={headers:{},statusCode:0,writeHead(c,h){this.statusCode=c;Object.assign(this.headers,h||{});},end(b){this.body=String(b||'');this.writableEnded=true;},setHeader(){},getHeader(){}};
   const req=require('node:stream').Readable.from([JSON.stringify({...send,requestKey:'product-change-0002'})]);Object.assign(req,{method:'POST',url:base,headers:{host:'127.0.0.1','content-type':'application/json'}});
   await handler.handle(req,res,base,async r=>{let t='';for await(const c of r)t+=c;return JSON.parse(t);});assert.equal(res.statusCode,409);assert.equal(JSON.parse(res.body).code,'PRODUCT_CHANGE_CONFIRM');}
  const preview=await f.api(base+'/areas',{...f.unit,instruction:send.instruction});assert.equal(preview.body.productChange,true);
  const ok=await f.api(base,{...send,confirmProductChange:true});assert.equal(ok.status,202,JSON.stringify(ok.body));const saved=await f.done(ok.body.id);
  assert.equal((await f.runtime.refinements.store(f.job.id).read(saved.id)).refinement.productChangeConfirmed,true);
  const words=await f.api(base+'/areas',{...f.unit,instruction:'Change the headline to "A '+product+' for deep sleep"'});assert.equal(words.body.productChange,false,'a wording change is not a product change');
 });
}
