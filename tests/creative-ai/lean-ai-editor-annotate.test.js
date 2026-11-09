'use strict';
// Image editor annotations for simplified (lean) designs (user request, 8 Nov 2026): "The AI
// editor needs to be the one that we had in the previous iteration, where you can annotate as
// well." Before this change an AI edit could only send text, so every Send could repaint the whole
// design. Now the editor's Box marks become one edit mask and every pixel outside the boxes is
// restored from the version being edited. Offline only: a fake provider records calls; nothing paid.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
const {fixture,sha}=require('./helpers/lean-ai-edit-fixture.cjs'),{LeanEdits,regionOf}=require('../../lib/creative-ai/runtime/lean-edits');
// A non-uniform original, so "restored outside the boxes" is a real pixel check.
async function textured(){const w=1080,h=1350,data=Buffer.alloc(w*h*3);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*3;data[i]=(x*7+y)%256;data[i+1]=(x*3+y*5)%256;data[i+2]=(x^y)%256;}return sharp(data,{raw:{width:w,height:h,channels:3}}).png().toBuffer();}
const rgb=async b=>(await sharp(b).removeAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true}));
const marks=[{type:'box',x:.1,y:.12,width:.3,height:.2},{type:'box',x:.55,y:.6,width:.25,height:.15},{type:'pin',x:.7,y:.3}];
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': annotated Send makes one masked edit; only the boxes change and the version is saved at the exact size',async t=>{
 const f=await fixture(t,brand,{original:await textured()}),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits';
 const send={...f.unit,instruction:'Make box 1 a soft blue wall and remove the lamp at pin 3',annotations:marks,requestKey:'annotate-request-0001',sourceVersionId:'original',expectedVersionId:'original'};
 const created=await f.api(base,send);assert.equal(created.status,202,JSON.stringify(created.body));
 assert.equal(created.body.masked,true);assert.equal(created.body.annotations.length,3);
 const saved=await f.done(created.body.id);assert.equal(saved.status,'finished',saved.error);
 assert.equal(f.calls.length,1,'exactly one image request');const call=f.calls[0];
 assert.equal(call.model,'gpt-image-2');assert.equal(call.quality,'high');assert.equal(call.attachments[0].assetId,'creative-edit-anchor');
 assert.ok(Buffer.isBuffer(call.mask),'the boxes are sent as a mask');
 assert.match(call.prompt,/MARKED AREAS: the user drew 2 box\(es\)/);assert.match(call.prompt,/Box 1 = left 10%, top 12%, width 30%, height 20%/);assert.match(call.prompt,/Box 2 = left 55%/);assert.match(call.prompt,/Pin 3 \(70% from the left, 30% from the top\)/);assert.match(call.prompt,/BRAND BOUNDARY: /);
 // The mask is exactly the two boxes at the anchor's pixel size: transparent inside, opaque outside.
 const m=await sharp(call.mask).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual([m.info.width,m.info.height],[1080,1350]);
 const region=regionOf(marks,1080,1350);let transparent=0;
 for(let i=0;i<region.length;i++){const clear=m.data[i*4+3]===0;assert.equal(clear,!!region[i],'mask pixel '+i+' matches the boxes');if(clear)transparent++;}
 const expected=[[.1,.12,.3,.2],[.55,.6,.25,.15]].reduce((n,[x,y,w,h])=>n+(Math.ceil((x+w)*1080)-Math.floor(x*1080))*(Math.ceil((y+h)*1350)-Math.floor(y*1350)),0);assert.equal(transparent,expected,'no pixels beyond the two drawn boxes');
 const at=(x,y)=>m.data[(Math.round(y*1350)*1080+Math.round(x*1080))*4+3];assert.equal(at(.25,.22),0,'inside box 1');assert.equal(at(.7,.3),255,'a pin alone does not open the mask');assert.equal(at(.5,.5),255,'outside the boxes');
 // Saved version: exact canvas size; outside the boxes byte-identical to the anchor; inside edited.
 const store=f.runtime.refinements.store(f.job.id),dir=store.dir(saved.id),file=path.join(dir,saved.result.imageUrl.split('/').pop());
 const [a,b]=await Promise.all([rgb(f.original),rgb(await fs.readFile(file))]);assert.deepEqual([b.info.width,b.info.height],[1080,1350]);
 let outsideDiff=0,insideChanged=0;for(let i=0;i<region.length;i++){const same=a.data[i*3]===b.data[i*3]&&a.data[i*3+1]===b.data[i*3+1]&&a.data[i*3+2]===b.data[i*3+2];if(region[i]){if(!same)insideChanged++;}else if(!same)outsideDiff++;}
 assert.equal(outsideDiff,0,'every pixel outside the boxes is unchanged');assert.ok(insideChanged>transparent*.8,'the boxed areas were edited');
 const child=await store.read(saved.id);assert.equal(child.results[0].aiEdit.mask.outsideMaskChangedPixels,0);assert.equal(child.results[0].aiEdit.annotations.length,3);assert.equal(child.budget.receipts.length,1);
 const binding=JSON.parse(await fs.readFile(path.join(dir,'creative-edit-anchor.json'),'utf8'));assert.equal(binding.maskSha256,sha(call.mask));assert.equal(sha(await fs.readFile(path.join(dir,'ai-edit-mask.png'))),binding.maskSha256);
 assert.equal(saved.result.check,'not-checked');assert.equal(saved.result.ready,false);
 // Dedupe: the same Send buys nothing; the same request ID with other marks is a different edit.
 assert.equal((await f.api(base,send)).body.id,saved.id);assert.equal(f.calls.length,1);
 assert.match((await f.api(base,{...send,annotations:marks.slice(0,1)})).body.error,/different edit/);
 assert.deepEqual(await fs.readFile(path.join(f.runtime.store.dir(f.job.id),f.name)),f.original,'original artwork untouched');
 // A follow-up from the edited version uses that version as the anchor and mask base.
 assert.equal((await f.api(base+'/selected',{...f.unit,versionId:saved.id,expectedVersionId:'original',expectedSha256:saved.result.sha256})).status,200);
 const next=await f.api(base,{...f.unit,instruction:'Warmer light here',annotations:[{type:'box',x:.4,y:.4,width:.1,height:.1}],requestKey:'annotate-request-0002',sourceVersionId:saved.id,expectedVersionId:saved.id});assert.equal(next.status,202,JSON.stringify(next.body));
 const s2=await f.done(next.body.id);assert.equal(s2.status,'finished',s2.error);assert.equal(f.calls.at(-1).attachments[0].sha256,saved.result.sha256);
});
test('pins alone make a whole-image edit; oversized, invalid or too many marks are refused before any paid request',async t=>{
 const f=await fixture(t,'Duroflex'),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits',send={...f.unit,instruction:'Remove this',requestKey:'annotate-request-0101'};
 assert.match((await f.api(base,{...send,annotations:[{type:'box',x:.05,y:.05,width:.8,height:.6}]})).body.error,/more than about a third/);
 assert.match((await f.api(base,{...send,annotations:[{type:'box',x:.9,y:.1,width:.3,height:.1}]})).body.error,/outside the design/);
 assert.match((await f.api(base,{...send,annotations:[{type:'circle',x:.5,y:.5}]})).body.error,/outside the design/);
 assert.match((await f.api(base,{...send,annotations:Array.from({length:13},()=>({type:'pin',x:.5,y:.5}))})).body.error,/up to 12/);
 assert.match((await f.api(base,{...send,annotations:marks,brandId:f.other.b.id})).body.error,/another brand/);
 assert.equal(f.calls.length,0,'nothing was sent');assert.equal((await f.runtime.refinements.store(f.job.id).list()).length,0,'no version was started');
 const created=await f.api(base,{...send,annotations:[{type:'pin',x:.3,y:.4}]});assert.equal(created.status,202,JSON.stringify(created.body));assert.equal(created.body.masked,false);
 const saved=await f.done(created.body.id);assert.equal(saved.status,'finished',saved.error);assert.equal(f.calls[0].mask,undefined);assert.match(f.calls[0].prompt,/Pin 1 \(30% from the left, 40% from the top\)/);assert.doesNotMatch(f.calls[0].prompt,/MARKED AREAS/);
});
test('a changed saved mask or an unbound mask is blocked before the image request',async t=>{
 const f=await fixture(t,'Sleepyhead'),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits',edits=f.runtime.leanEdits,store=f.runtime.refinements.store(f.job.id);
 edits.run=async()=>{}; // Hold the job so its saved mask can be tampered with first.
 const created=await f.api(base,{...f.unit,instruction:'Blue wall',annotations:marks.slice(0,1),requestKey:'annotate-request-0201'});assert.equal(created.status,202,JSON.stringify(created.body));
 await fs.writeFile(path.join(store.dir(created.body.id),'ai-edit-mask.png'),await sharp({create:{width:1080,height:1350,channels:4,background:{r:255,g:255,b:255,alpha:1}}}).png().toBuffer());
 await assert.rejects(()=>LeanEdits.prototype.run.call(edits,f.job.id,created.body.id),/marked area changed/);assert.equal(f.calls.length,0);
 // The brand-scoped provider refuses a mask the child's saved binding does not name.
 const plain=await f.api(base,{...f.unit,instruction:'Brighter',requestKey:'annotate-request-0202'}),dir=store.dir(plain.body.id),binding=JSON.parse(await fs.readFile(path.join(dir,'creative-edit-anchor.json'),'utf8'));
 const anchor=await fs.readFile(path.join(f.runtime.store.dir(f.job.id),f.name)),mask=await require('../../lib/creative-ai/runtime/masked-image').pngMask(regionOf(marks.slice(0,1),1080,1350),1080,1350);
 await assert.rejects(()=>f.runtime.provider.generate({prompt:'x',attachments:[{assetId:'creative-edit-anchor',ownership:'generated-project-reference',brandId:f.own.b.id,roles:['visual-style'],sourceIds:[],sha256:binding.sha256,imageData:'data:image/png;base64,'+anchor.toString('base64')}],mask,quality:'high',model:'gpt-image-2',size:'1024x1280',scope:{route:'continuity',placementId:'square'},requestKey:'x'.repeat(16)},store.budget(plain.body.id)),e=>{assert.match(e.message,/unexpected edit mask/);return true;});
 assert.equal(f.calls.length,0,'no image request reached the provider');
});
