'use strict';
// Regression (22 Nov 2026, paid local SKU-evidence test, Neha: "Yes, fix it"). The product reading now sends 7 photos
// of 2–4 MB each. On a slow connection uploading them took over 2 minutes, the fixed staging limit, and the Duo Topper
// job failed with "Reasoning reference transfer failed before paid dispatch (23)" before any paid step ("23" was the
// bare timeout code). The limit now grows with the photos (2 min up to 12 MB, +10 s per MB, at most 6 min) and a
// timeout says what happened. Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const cdn=require('../../lib/creative-ai/runtime/cdn-media'),ref=require('../../lib/creative-ai/runtime/image-reference-stage'),{Gate}=require('../../lib/creative-ai/runtime/image-upload');
const MB=1048576,photos=(n,mb)=>Array.from({length:n},(_,i)=>({assetId:'reasoning-reference-'+i,type:'png',bytes:Buffer.alloc(Math.round(mb*MB),i+1)}));
test('the upload limit grows with the photos: 2 minutes up to 12 MB, 10 s per extra MB, at most 6 minutes',()=>{
 assert.equal(ref.stageLimit(photos(3,3.5)),120000,'3 photos (the old research set) keep 2 minutes');
 assert.equal(ref.stageLimit(photos(7,3.5)),245000,'the live topper\'s 7 photos (about 24.5 MB) get about 4 minutes');
 assert.equal(ref.stageLimit(photos(20,3.5)),360000,'never more than 6 minutes');
 assert.equal(ref.stageLimit([]),120000);
});
// A fake CDN whose uploads are slow; each brand's project is staged on its own.
async function slowCdn(t,brandId,delayMs){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'upload-time-'));await fs.writeFile(path.join(dir,'job.json'),JSON.stringify({intake:{brandId}}));
 const files=new Map(),server=http.createServer((req,res)=>res.end(files.get(req.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const saved={scope:cdn.scope,config:cdn.config,publish:cdn.publish,safeUrl:cdn.safeUrl};
 Object.assign(cdn,{scope:()=>({root:dir}),config:async()=>({enabled:true}),safeUrl:()=>true,publish:async file=>{await new Promise(r=>setTimeout(r,delayMs));const bytes=await fs.readFile(file),sha256=crypto.createHash('sha256').update(bytes).digest('hex');files.set('/'+sha256,bytes);return {brandId,sha256,bytes:bytes.length,url:'http://127.0.0.1:'+server.address().port+'/'+sha256};}});
 t.after(async()=>{Object.assign(cdn,saved);server.close();await fs.rm(dir,{recursive:true,force:true});});
 return {brandContext:async()=>({intake:{brandId},dir}),remainingMs:async()=>600000};
}
for(const brandId of ['brand-duroflex-test','brand-sleepyhead-test']){
 test(brandId+': seven big photos on a slow link finish inside the grown limit, where the old fixed limit failed',async t=>{
  const budget=await slowCdn(t,brandId,60),set=photos(7,1);
  // Scaled down 1000×: base 0.2 s for 3 MB, +0.1 s per extra MB → 0.6 s for 7 MB; 7 slow uploads take about 0.45 s.
  const limits={baseMs:200,baseBytes:3*MB,perMbMs:100,maxMs:2000};
  await assert.rejects(ref.stage(set,budget,{gate:new Gate(1),maxStageMs:200}),e=>e.code==='REFERENCE_UPLOAD_TIMEOUT','the old fixed limit runs out');
  const refs=await ref.stage(set,budget,{gate:new Gate(1),limits});assert.equal(refs.length,7);
  await assert.rejects(ref.stage(set,budget,{gate:new Gate(1),limits:{...limits,baseMs:100,perMbMs:10}}),e=>e.code==='REFERENCE_UPLOAD_TIMEOUT','the size-based limit is the one applied (too small here, so it runs out)');
 });
 test(brandId+': a timeout says what happened instead of the bare code 23',async t=>{
  const budget=await slowCdn(t,brandId,300);
  await assert.rejects(ref.stage(photos(2,0.1),budget,{gate:new Gate(1),maxStageMs:100}),e=>e.code==='REFERENCE_UPLOAD_TIMEOUT'&&/took longer than/.test(e.message)&&/nothing was charged/.test(e.message));
  const media=require('../../lib/creative-ai/runtime/reasoning-media');
  const body={input:[{role:'user',content:[{type:'input_image',image_url:'data:image/png;base64,'+Buffer.alloc(64,1).toString('base64')}]}]};
  await assert.rejects(media.prepare(body,budget,(r,b)=>ref.stage(r,b,{gate:new Gate(1),maxStageMs:100})),e=>/REFERENCE_UPLOAD_TIMEOUT/.test(e.message)&&!/\(23\)/.test(e.message));
 });
}
