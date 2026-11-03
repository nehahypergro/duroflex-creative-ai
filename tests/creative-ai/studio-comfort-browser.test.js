'use strict';
const {settleAutosave}=require('./helpers/ui-controls.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'../..');
const brands=[{id:'brand-ui-duroflex',name:'Duroflex',brandUrl:'https://www.duroflexworld.com/'},{id:'brand-ui-sleepyhead',name:'Sleepyhead',brandUrl:'https://mysleepyhead.com/'}];
async function fixture(options={}){
 await fs.mkdir(path.join(root,'work/studio-ui-regression/screens'),{recursive:true});
 const fixtureBrands=options.profiles?await Promise.all(['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'].map(async id=>JSON.parse(await fs.readFile(path.join(root,'output/creative-ai/brands',id,'brand.json'),'utf8')))):brands;
 const sharp=require('sharp'),image=await sharp({create:{width:1080,height:1080,channels:3,background:'#cabdd8'}}).png().toBuffer();
 const requests=[];
 const server=http.createServer(async(req,res)=>{try{
   const url=new URL(req.url,'http://localhost');requests.push({method:req.method,url:url.pathname});
   if(req.method!=='GET'){res.writeHead(405);res.end('{}');return;}
   const send=v=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(v));};
   if(url.pathname==='/creative-ai/api/brands')return send(fixtureBrands);
   if(url.pathname==='/creative-ai/api/jobs')return send(fixtureBrands.map((b,i)=>({id:'job-'+i,brandId:b.id,status:'finished',createdAt:'2026-10-19T10:00:00Z',outputs:2})));
   if(/^\/creative-ai\/api\/jobs\/job-\d$/.test(url.pathname)){const n=Number(url.pathname.at(-1)),brand=fixtureBrands[n];return send({id:'job-'+n,brandId:brand.id,status:'finished',createdAt:'2026-10-19T10:00:00Z',productSummary:{name:brand.name+' campaign'},placements:[{id:'square',name:'Square post',dimensions:{width:1080,height:1080}}],results:['continuity','exploration'].map(route=>({route,placementId:'square',ready:false,imageUrl:'/creative-ai/api/jobs/job-'+n+'/files/static-'+route+'.png',conceptExplanation:{idea:'Fixture story',takeaway:'Fixture message'}}))});}
   if(url.pathname.includes('/files/')||url.pathname.endsWith('/preview')||url.pathname.includes('/canvas-assets/')||/slide-\d+\.jpg$/.test(url.pathname)){res.setHeader('Content-Type','image/png');res.end(image);return;}
   if(/\/notification-icons\/[a-f0-9]{64}\/icons\.zip$/.test(url.pathname)){res.setHeader('Content-Type','application/zip');res.setHeader('Content-Disposition','attachment; filename=icons.zip');res.end(require('../../lib/creative-ai/runtime/carousel-export').zip([{name:'manifest.json',bytes:JSON.stringify({brandId:url.pathname.split('/')[4]})}]));return;}
   if(url.pathname.endsWith('/edits'))return send([]);
   if(url.pathname.endsWith('/products'))return send([{id:'product-fixture',brandId:url.pathname.split('/')[4],name:'A saved product',sku:'SOFA-42',category:'Sofa',pageUrl:(url.pathname.includes('sleepyhead')?'https://mysleepyhead.com':'https://www.duroflexworld.com')+'/products/fixture',variants:[{id:'grey',name:'Grey'},{id:'blue',name:'Blue'}],assets:[{id:'saved-image',group:'product-images',preview:true,status:'stored'}]}]);
   if(url.pathname.endsWith('/assets'))return send({assets:[{id:'asset-fixture',name:'Brand poster',filename:'launch_reference_2026.png',category:'visual-reference',tags:['launch'],processing:{status:'stored'}}]});
   const file=url.pathname.replace('/creative-ai/','');
   if(!['studio.html','studio.css','studio-model.js','studio-data.js','studio-library.js','studio.js','canvas-model.js','editable-canvas.css','editable-canvas.js','vendor/fabric.min.js','studio-motion.js','studio-motion.css','vendor/lottie.min.js'].includes(file)){res.writeHead(404);res.end('{}');return;}
   res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(path.join(root,'public/creative-ai',file)));
 }catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 return {page,context,browser,requests,errors,brands:fixtureBrands,url:'http://127.0.0.1:'+server.address().port+'/creative-ai/studio.html',close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
// Legacy drafts are seeded as saved fixtures; new projects now use the two-path chooser.
async function openLegacyDraft(p){await p.evaluate(()=>{const d=StudioModel.newDraft(window.activeBrand.id);StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;});await p.waitForSelector('#field-brief');}
test('Comfort polish: both brands have context, image navigation, honest comparison and quiet draft saving',{timeout:60000},async()=>{
 const f=await fixture();try{for(let i=0;i<brands.length;i++){
  await f.page.goto(f.url+'?brand='+brands[i].id+'#review/job-'+i+'/0/0');await f.page.waitForSelector('.flow-header');
  assert.match(await f.page.locator('#brandSwitch .brand-option[aria-pressed=true]').getAttribute('aria-label'),new RegExp(brands[i].name));
  assert.equal(await f.page.locator('[data-comfort-version]').count(),0);
  await f.page.locator('[data-action=focus-option]').nth(1).click();await f.page.waitForURL(/\/0\/1$/);
  assert.equal(await f.page.locator('.option-thumbnail[aria-pressed=true]').count(),1);
  await f.page.locator('[data-action=focus-option]').nth(0).click();await f.page.waitForURL(/\/0\/0$/);
  await openLegacyDraft(f.page);await f.page.locator('#field-brief').fill('A clear product photograph');await settleAutosave(f.page);
  await f.page.waitForFunction(()=>document.querySelector('#draftAutosave')?.textContent.includes('saved'));
  assert.equal(await f.page.locator('#draftAutosave').getAttribute('role'),'status');
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Comfort comparison uses actual saved versions without changing delivery and fits mobile',{timeout:60000},async()=>{
 const f=await fixture();try{await f.page.route('**/api/jobs/*/edits',async route=>{const id=new URL(route.request().url()).pathname.split('/')[4];await route.fulfill({json:[{route:'continuity',placementId:'square',previewUrl:'/creative-ai/api/jobs/'+id+'/files/edited.png',revision:2}]});});
 for(let i=0;i<brands.length;i++){
  await f.page.goto(f.url+'?brand='+brands[i].id+'#review/job-'+i+'/0/0');await f.page.waitForSelector('[data-comfort-version=before]');
  assert.match(await f.page.locator('.focused-art img').getAttribute('src'),/edited/);
  await f.page.locator('[data-comfort-version=before]').click();assert.match(await f.page.locator('.focused-art img').getAttribute('src'),/static-continuity/);
  await f.page.locator('[data-comfort-version=after]').click();assert.match(await f.page.locator('.focused-art img').getAttribute('src'),/edited/);
  await f.page.setViewportSize({width:390,height:844});assert.ok(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await f.page.setViewportSize({width:1440,height:1000});
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Comfort references open large, full names remain accessible and unavailable actions explain why',{timeout:60000},async()=>{
 const f=await fixture();try{
 await f.page.route('**/assets/asset-fixture/original',async route=>route.fulfill({contentType:'image/png',body:await require('sharp')({create:{width:900,height:600,channels:3,background:'#ddd'}}).png().toBuffer()}));
 for(let i=0;i<brands.length;i++){
  await f.page.goto(f.url+'?brand='+brands[i].id+'#library/asset?id=asset-fixture&from=library/brand');await f.page.waitForSelector('.comfort-reference');assert.ok(await f.page.locator('.comfort-reference').evaluate(el=>el.clientWidth>400));
  await f.page.goto(f.url+'?brand='+brands[i].id+'#review/job-'+i+'/0/0');await f.page.waitForSelector('.option-thumbnail strong[title]');
  assert.ok(await f.page.locator('.focused-art img').evaluate(img=>img.naturalWidth>0&&getComputedStyle(img).objectFit==='contain'));
  await f.page.screenshot({path:'work/studio-ui-regression/screens/comfort-'+i+'.png'});
  await openLegacyDraft(f.page);
  await f.page.evaluate(()=>{const b=document.createElement('button');b.disabled=true;b.dataset.action='edit-image';document.querySelector('#main').append(b);b.dispatchEvent(new Event('change',{bubbles:true}));});
  await f.page.locator('.comfort-disabled').last().waitFor();assert.match(await f.page.locator('.comfort-disabled').last().innerText(),/saved/);
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
