'use strict';
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
test('Interaction pass: selected download, counts, artwork and categories work for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{for(let i=0;i<brands.length;i++){
  await f.page.goto(f.url+'?brand='+brands[i].id+'#project/job-'+i);await f.page.waitForSelector('.set-completion');assert.match(await f.page.locator('.set-completion').innerText(),/1 of 1/);
  await f.page.locator('.image-selection summary').click();await f.page.locator('[data-image-pick]').first().check();assert.equal(await f.page.locator('.selection-count').innerText(),'1 selected');
  const event=f.page.waitForEvent('download');await f.page.locator('[data-interaction=download-picked]').click();const download=await event;const filename='/private/tmp/creative-ui-interactions/selected-'+i+'.zip';await download.saveAs(filename);
  const report=JSON.parse(require('child_process').execFileSync('python3',['-c','import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps(json.loads(z.read("manifest.json"))))',filename],{encoding:'utf8'}));assert.equal(report.images.length,1);assert.equal(report.images[0].brandId,brands[i].id);assert.equal(report.images[0].revision,null);assert.match(report.images[0].sha256,/^[a-f0-9]{64}$/);await f.page.screenshot({path:'work/studio-ui-regression/screens/selection-'+i+'.png'});
  await f.page.goto(f.url+'?brand='+brands[i].id+'#review/job-'+i+'/0/0');await f.page.locator('.focused-art img').waitFor();assert.equal(await f.page.locator('[data-interaction=placement]').count(),0);assert.ok(await f.page.locator('.focused-art').isVisible());
  await f.page.goto(f.url+'?brand='+brands[i].id+'#tools');await f.page.waitForSelector('.category-expander');const b=f.page.locator('.category-expander').first();await b.click();assert.equal(await b.getAttribute('aria-expanded'),'false');await b.click();assert.equal(await b.getAttribute('aria-expanded'),'true');
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Interaction pass: failed preview retries only its image; partial ZIP leaves failures selected',{timeout:60000},async()=>{
 const f=await fixture();try{let fail=true;await f.page.route('**/files/static-exploration.png*',route=>fail?route.fulfill({status:503,body:'Unavailable'}):route.continue());
 await f.page.goto(f.url+'?brand='+brands[0].id+'#review/job-0/0/1');await f.page.waitForSelector('.focused-art [data-interaction=retry-image]');fail=false;await f.page.locator('.focused-art [data-interaction=retry-image]').click();await f.page.waitForFunction(()=>document.querySelector('.focused-art img')?.naturalWidth>0&&!document.querySelector('.focused-art img').hidden);
 await f.page.goto(f.url+'#project/job-0');await f.page.locator('.image-selection summary').click();await f.page.locator('[data-interaction=pick-all]').click();fail=true;const event=f.page.waitForEvent('download');await f.page.locator('[data-interaction=download-picked]').click();await event;await f.page.waitForFunction(()=>document.querySelector('.selection-status')?.textContent.includes('1 of 2'));
 assert.equal(await f.page.locator('[data-image-pick]:checked').count(),1);assert.match(await f.page.locator('.image-pick-status').last().innerText(),/Could not load/);assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Interaction pass: selected edited downloads refuse stale revisions and keep warning failures local',{timeout:60000},async()=>{
 const f=await fixture();try{let revision=1;await f.page.route('**/jobs/job-0/edits',route=>route.fulfill({json:[{route:'continuity',placementId:'square',revision,previewUrl:'/creative-ai/api/jobs/job-0/files/edited.png'}]}));let exports=0;
 await f.page.route('**/editable/continuity/square/export',route=>{exports++;assert.equal(route.request().postDataJSON().acknowledgeWarnings,false);return route.fulfill({status:422,json:{issues:['Needs review']}});});
 await f.page.goto(f.url+'#project/job-0');await f.page.locator('.image-selection summary').click();await f.page.locator('[data-image-pick]').first().check();revision=2;await f.page.locator('[data-interaction=download-picked]').click();await f.page.waitForFunction(()=>document.querySelector('.image-pick-status')?.textContent.includes('version changed'));assert.equal(exports,0);assert.equal(await f.page.locator('[data-image-pick]:checked').count(),1);
 await f.page.reload();await f.page.locator('.image-selection summary').click();await f.page.locator('[data-image-pick]').first().check();await f.page.locator('[data-interaction=download-picked]').click();await f.page.waitForFunction(()=>document.querySelector('.image-pick-status')?.textContent.includes('warnings'));assert.equal(exports,1);assert.equal(await f.page.locator('[data-image-pick]:checked').count(),1);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Polish: rename, keyboard browsing and category motion preserve work for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{for(let i=0;i<brands.length;i++){
  await f.page.goto(f.url+'?brand='+brands[i].id+'#project/job-'+i);await f.page.locator('[data-inline-rename]').click();await f.page.getByRole('textbox',{name:'Project name',exact:true}).fill('Diwali '+brands[i].name);await f.page.keyboard.press('Enter');await f.page.waitForFunction(name=>document.querySelector('[data-inline-rename]')?.textContent===name,'Diwali '+brands[i].name);
  await f.page.reload();await f.page.waitForSelector('[data-inline-rename]');assert.equal(await f.page.locator('[data-inline-rename]').innerText(),'Diwali '+brands[i].name);
  await f.page.goto(f.url+'?brand='+brands[i].id+'#review/job-'+i+'/0/0');await f.page.waitForSelector('.option-strip');await f.page.locator('h1').click();await f.page.keyboard.press('ArrowRight');await f.page.waitForURL(/\/0\/1$/);await f.page.locator('.option-thumbnail[data-index="1"][aria-pressed=true]').waitFor();assert.equal(await f.page.locator('.option-thumbnail[aria-pressed=true]').getAttribute('data-index'),'1');await f.page.keyboard.press('ArrowLeft');await f.page.waitForURL(/\/0\/0$/);
  await f.page.goto(f.url+'?brand='+brands[i].id+'#tools');await f.page.waitForSelector('.category-expander');await f.page.emulateMedia({reducedMotion:'reduce'});const b=f.page.locator('.category-expander').first();await b.click();const id=await b.getAttribute('aria-controls');assert.equal(await f.page.locator('#'+id).isHidden(),true);await b.click();assert.equal(await f.page.locator('#'+id).isVisible(),true);
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Polish: retry checks is explicit, scoped to one image and protected from duplicate clicks',{timeout:60000},async()=>{
 const f=await fixture();try{await f.page.route('**/api/jobs/job-*',async route=>{const response=await route.fetch(),job=await response.json();job.results[0].verificationRetryAvailable=true;return route.fulfill({json:job});});let calls=[];await f.page.route('**/retry-checks',async route=>{calls.push(route.request().postDataJSON());await new Promise(r=>setTimeout(r,300));return route.fulfill({json:{ok:true}});});
 for(let i=0;i<brands.length;i++){await f.page.goto(f.url+'?brand='+brands[i].id+'#review/job-'+i+'/0/0');await f.page.getByRole('button',{name:'Retry checks for image 1',exact:true}).click();assert.equal(calls.length,i);await f.page.locator('[data-retry-confirm]').evaluate(b=>{b.click();b.click();});await f.page.waitForFunction(()=>!document.querySelector('#assignmentDialog'));assert.equal(calls.length,i+1);assert.deepEqual(calls[i],{route:'continuity',placementId:'square'});}
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
