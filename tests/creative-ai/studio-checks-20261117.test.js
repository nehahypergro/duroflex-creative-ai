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
// 18 Nov 2026 (Neha: "remove all coming soon remarks"): replaces the 17 Nov check that showed them disabled.
test('formats that cannot be made yet are not listed in the format picker and nothing says Coming soon',async()=>{
 const src=await fs.readFile(path.resolve('public/creative-ai/studio.js'),'utf8');
 assert.match(src,/M\.assetCatalogue\.filter\(c=>\(c\.status!=='soon'\|\|p\.selected\.includes\(c\.id\)\)/,'not listed unless chosen earlier');
 assert.match(src,/M\.assetCard\(id\)\.status==='soon'&&!p\.selected\.includes\(id\)\)return;/,'and cannot be added');
 const shown=src.split('\n').filter(line=>!/^\s*\/\//.test(line)).join('\n');assert.doesNotMatch(shown,/>Coming soon<|· Coming soon|coming soon, saved|Coming-soon assets/,'no Coming soon wording on screen');
});
// View only (17 Nov 2026): a teammate's project showed buttons that change it; clicking them only showed a refusal.
test('change buttons are hidden and refused on a teammate\'s project; viewing buttons stay',async()=>{
 const src=await fs.readFile(path.resolve('public/creative-ai/studio.js'),'utf8'),css=await fs.readFile(path.resolve('public/creative-ai/studio.css'),'utf8');
 const set=/const VIEW_ONLY_ACTIONS=new Set\(\[([^\]]+)\]\)/.exec(src);assert.ok(set,'list of change actions');const actions=set[1].match(/'([a-z-]+)'/g).map(x=>x.slice(1,-1));
 for(const a of ['resume-work','retry-image-checks','lean-recheck','edit-image','save-feedback','restart-project'])assert.ok(actions.includes(a),a);
 for(const a of ['download','card-download','download-set','report-issue'])assert.ok(!actions.includes(a),a+' stays available');
 assert.match(src,/if\(VIEW_ONLY_ACTIONS\.has\(action\)&&viewOnlyBy\(\)\)\{toast\(/);assert.match(src,/function viewOnlyBy\(\)\{return \/\^\(project\|review\|download\|versions\|progress\|editor\)\\\//);assert.match(src,/syncViewOnly\(\);/);
 for(const a of actions)assert.ok(css.includes('body[data-view-only] [data-action="'+a+'"]'),a+' hidden');
});
// Client-ready QA (17 Nov 2026): an AI-edited version in use downloaded correctly but was named "…_Original.png" and
// reported as "Downloaded original generated image".
test('a download of the AI-edited version in use is named and reported as edited',async()=>{
 const model=require('../../public/creative-ai/canvas-model.js'),base={brand:'Sleepyhead',project:'Sofa Bubbles',width:1920,height:700,option:'continuity',extension:'png'};
 assert.match(model.downloadName({...base,edited:true}),/_Edited\.png$/);assert.match(model.downloadName(base),/_Original\.png$/);assert.match(model.downloadName({...base,revision:3,edited:true}),/_R3\.png$/);
 const src=await fs.readFile(path.resolve('public/creative-ai/studio.js'),'utf8');
 assert.match(src,/aiEdited=!!current\.versionId&&current\.versionId!=='original'/);assert.match(src,/'AI-edited version in use'/);assert.match(src,/'-ai-edited':'-original'/);
});
// Client-ready QA (17 Nov 2026): a mistyped or unknown address said "This project is not available in this brand".
test('an unknown address shows Page not found, not a project error',async()=>{
 const src=await fs.readFile(path.resolve('public/creative-ai/studio.js'),'utf8');
 assert.match(src,/const PROJECT_VIEWS=new Set\(\['project','progress','review','download','versions','campaign','static','video','writing'\]\)/);
 assert.match(src,/else if\(!PROJECT_VIEWS\.has\(view\)\|\|!id\)\{main\.innerHTML=stateCard\('Page not found'/);
});
test('downloads read files through the server (direct), not a CDN redirect',async()=>{
 const src=await fs.readFile(path.resolve('public/creative-ai/studio.js'),'utf8');
 const def=/const directAsset=(url=>[^;]+);/.exec(src);assert.ok(def,'directAsset defined');const directAsset=eval(def[1]);
 assert.equal(directAsset('/creative-ai/api/jobs/creative-1/files/static-lean-a.png'),'/creative-ai/api/jobs/creative-1/files/static-lean-a.png?direct=1');
 for(const u of ['data:image/png;base64,AAAA','blob:http://x/1','https://cdn.example/a.png',null])assert.equal(directAsset(u),u,'unchanged: '+u);
 assert.match(src,/await fetchAsset\(r\.imageUrl\)/);assert.match(src,/await fetchAsset\(M\.safeAsset\(r\.imageUrl\)\)/);assert.match(src,/try\{const r=await fetch\(url\);if\(r\.ok\|\|direct===url\)return r;\}catch\(e\)\{if\(direct===url\)throw e;\}return fetch\(direct\);/,'normal link first, then through the server');
});
