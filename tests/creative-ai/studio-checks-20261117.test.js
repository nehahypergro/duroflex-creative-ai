'use strict';
// Checks Neha asked for after the live Sleepyhead batch (17 Nov 2026). Failing before; no paid calls.
//  1. Google Display banners: Download gave the original PNG, and 3 of 6 sizes (199, 256, 354 KB) were over Google's
//     150 KB upload limit. A banner's own download now returns the upload-ready file.
//  2. Coming soon cards in the format picker could be clicked and chosen.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http'),sharp=require('sharp');

for(const brandId of ['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'])test('a display banner downloads as an upload-ready file of at most 150 KB at its exact pixels: '+brandId,async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'banner-download-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const {createHandler}=require('../../lib/creative-ai/runtime/http'),app=createHandler({root,dossierStore:{}});app.runtime.provider={generate:()=>assert.fail('No image call'),reason:()=>assert.fail('No reasoning call')};
 const store=app.runtime.store,job=await store.create({brandId,conceptRoutes:['continuity']},{displayBannersVersion:1,jobTimeoutMs:60000,maxReasoningCalls:5,estimatedSpend:{maxUsd:5,reasoningUsd:1,imageUsd:1}},[{id:'custom_studio-display-half-page'}]);
 // A busy 300 x 600 picture: its PNG is far over 150 KB, like the live half-page banner (354 KB).
 const png=await sharp(crypto.randomBytes(300*600*3),{raw:{width:300,height:600,channels:3}}).png().toBuffer(),name='static-lean-banner.png';await fs.writeFile(path.join(store.dir(job.id),name),png);assert.ok(png.length>150000);
 await store.update(job.id,j=>{j.status='finished';j.results=[{route:'continuity',placementId:'custom_studio-display-half-page',imageUrl:'/creative-ai/api/jobs/'+job.id+'/files/'+name,sha256:crypto.createHash('sha256').update(png).digest('hex'),width:300,height:600}];return j;});
 const server=http.createServer((req,res)=>app.handle(req,res,new URL(req.url,'http://localhost').pathname,async()=>({})));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port+'/creative-ai/api/jobs/'+job.id+'/display-banner/';
 const r=await fetch(base+'custom_studio-display-half-page');assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer()),m=await sharp(bytes).metadata();
 assert.ok(bytes.length<=150000,'got '+bytes.length+' bytes');assert.equal(m.width,300);assert.equal(m.height,600);assert.equal(r.headers.get('content-type'),'image/jpeg');assert.equal(r.headers.get('x-banner-over-limit'),'0');
 assert.equal((await fetch(base+'custom_studio-display-billboard')).status,404,'only saved banners of this job');
 await fs.writeFile(path.join(store.dir(job.id),name),Buffer.concat([png,Buffer.from('x')]));assert.notEqual((await fetch(base+'custom_studio-display-half-page')).status,200,'a changed saved image is not served');
});
test('the Studio download uses the upload-ready banner file for display banner projects',async()=>{
 const src=await fs.readFile(path.resolve('public/creative-ai/studio.js'),'utf8');assert.match(src,/p\.displayBanners\?\.version===1\)\{\/\/ Google-ready file/);assert.match(src,/\/display-banner\/'\+encodeURIComponent\(r\.placementId\)/);
});
test('Coming soon cards are shown but cannot be chosen in the format picker',async()=>{
 const src=await fs.readFile(path.resolve('public/creative-ai/studio.js'),'utf8');
 assert.match(src,/soon=c\.status==='soon'&&!on;/);assert.match(src,/\$\{soon\?' disabled aria-disabled="true"/);
 assert.match(src,/M\.assetCard\(id\)\.status==='soon'&&!p\.selected\.includes\(id\)\)return;/);
 const css=await fs.readFile(path.resolve('public/creative-ai/studio.css'),'utf8');assert.match(css,/\.asset-card\.is-soon:disabled\{cursor:not-allowed/);
});
