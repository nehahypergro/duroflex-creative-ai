'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'../..');
const brands=[{id:'brand-ui-duroflex',name:'Duroflex',brandUrl:'https://www.duroflexworld.com/'},{id:'brand-ui-sleepyhead',name:'Sleepyhead',brandUrl:'https://mysleepyhead.com/'}];
async function fixture(options={}){
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
 return {page,context,browser,requests,errors,url:'http://127.0.0.1:'+server.address().port+'/creative-ai/studio.html',close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
// Legacy drafts are seeded as saved fixtures; new projects now use the two-path chooser.
async function openLegacyDraft(p){await p.evaluate(()=>{const d=StudioModel.newDraft(window.activeBrand.id);StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;});await p.waitForSelector('#field-name');}
test('UI browser: both-brand brief journeys, all features, saved reviews, version plans and no paid calls',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){
   await p.goto(f.url+'?brand='+brand.id);await p.waitForSelector('.continue-card');assert.match(await p.locator('.hero-eyebrow').innerText(),new RegExp(brand.name));
   await p.locator('[data-nav=library]').click();await p.getByRole('tab',{name:'Products',exact:true}).click();await p.waitForSelector('.product-tile');assert.equal(await p.locator('.product-tile img').count(),1,'Saved product preview is visible');await p.locator('[data-nav=home]').click();
   await openLegacyDraft(p);await p.locator('#field-name').fill('Festive "A&B" · नमस्ते');await p.locator('#field-brief').fill('Celebrate together <not markup> & keep the brief intact.');await p.locator('[data-focus=brand]').click();
   await p.locator('[data-action=add-output]').click();assert.equal(await p.locator('.feature-option').count(),42);await p.locator('#featureSearch').fill('Instagram story');await p.locator('[data-action=choose-feature][data-id="8"]').click();
   await p.locator('[data-prop=formatId]').selectOption('custom');await p.locator('[data-prop=width]').fill('0');await p.locator('[data-action=preview-project]').click();assert.match(await p.locator('#briefSummary').innerText(),/whole-pixel/);
   await p.locator('[data-prop=width]').fill('1080');await p.locator('[data-prop=height]').fill('1920');await p.locator('[data-action=preview-project]').click();await p.waitForSelector('.deliverable-row');assert.match(await p.locator('h1').innerText(),/Festive/);
   const firstHash=await p.evaluate(()=>location.hash);await p.reload();await p.waitForSelector('.deliverable-row');assert.equal(await p.evaluate(()=>location.hash),firstHash);
   await p.locator('[data-action=edit-brief]').click();assert.equal(await p.locator('#field-brief').inputValue(),'Celebrate together <not markup> & keep the brief intact.');
   await p.locator('[data-nav=home]').click();await openLegacyDraft(p);await p.locator('#field-name').fill('Second draft');await p.locator('[data-action=save]').click();await p.locator('[data-nav=home]').click();await p.waitForSelector('.continue-card');assert.equal(await p.locator('.continue-card').count(),3);
   await p.locator('.continue-card').filter({hasText:brand.name+' campaign'}).locator('.text-button').click();await p.waitForSelector('.option-card');assert.equal(await p.locator('.option-card').count(),2);await p.locator('[data-action=select-option]').first().click();assert.equal(await p.locator('.option-card.selected').count(),1);assert.match(await p.locator('.option-card.selected').innerText(),/Review before sharing/);
   await p.locator('#feedbackText').fill('A local note');await p.locator('[data-action=save-feedback]').click();await p.reload();await p.waitForSelector('#feedbackText');assert.equal(await p.locator('#feedbackText').inputValue(),'A local note');
   await p.locator('[data-action=versions]').first().click();await p.locator('input[value=story]').check();await p.locator('[data-action=save-versions]').click();await p.waitForSelector('.deliverable-row');assert.match(await p.locator('.notice').innerText(),/not available for generation yet/);
 }
 assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('UI browser: unavailable project stays visible and recovers; brand toggle remains scoped',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;let fail=true;await p.route('**/api/jobs/job-0',route=>fail?route.fulfill({status:503,contentType:'application/json',body:'{}'}):route.continue());
 await p.goto(f.url);await p.waitForSelector('.continue-card');assert.match(await p.locator('.continue-card').innerText(),/temporarily unavailable/);await p.locator('.continue-card .text-button').click();await p.waitForSelector('[data-action=retry]');assert.match(await p.locator('#main').innerText(),/has not been removed/);
 fail=false;await p.locator('[data-action=retry]').click();await p.waitForSelector('.deliverable-row');assert.match(await p.locator('h1').innerText(),/Duroflex/);
 await p.locator('[data-brand="brand-ui-sleepyhead"]').click();await p.waitForSelector('.project-row');assert.match(await p.locator('.project-row').innerText(),/Sleepyhead campaign/);assert.doesNotMatch(await p.locator('#main').innerText(),/Duroflex campaign/);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('UI browser: failed save recovery, inline recovery and screen focus, mobile reachability, writing and scene editing',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url);await p.waitForSelector('.continue-card');await openLegacyDraft(p);await p.locator('#field-name').fill('Document project');await p.locator('#field-brief').fill('A helpful email and short film');await p.locator('[data-focus=brand]').click();
 for(const id of [34,24]){await p.locator('[data-action=add-output]').click();await p.locator('[data-action=choose-feature][data-id="'+id+'"]').click();}
 await p.locator('[data-action=preview-project]').click();await p.locator('[data-action=open-output]').first().click();await p.locator('[data-writing=subject]').fill('Your next chapter');await p.locator('[data-writing=body]').fill('Test content & <literal> text.');await p.reload();await p.waitForSelector('[data-writing=body]');assert.equal(await p.locator('[data-writing=body]').inputValue(),'Test content & <literal> text.');
 await p.evaluate(()=>{window.qaSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Storage full');};});await p.locator('[data-writing=body]').fill('Keep my unsaved copy');await p.locator('[data-nav=home]').click();await p.waitForSelector('#taskPanel:not([hidden])',{timeout:2000});assert.match(await p.locator('#taskPanel').innerText(),/changes need saving/);await p.locator('[data-action=close-task]').last().click();assert.equal(await p.locator('[data-writing=body]').inputValue(),'Keep my unsaved copy');await p.evaluate(()=>Storage.prototype.setItem=window.qaSetItem);await p.locator('[data-writing=body]').fill('Recovered text');
 await p.locator('.breadcrumb a').first().click();await p.locator('[data-action=open-output]').nth(1).click();await p.locator('[data-scene="0"][data-prop=duration]').fill('8');assert.match(await p.locator('.timeline span').first().innerText(),/8s/);await p.locator('[data-scene="0"][data-prop=title]').fill('A bright opening');await p.locator('[data-action=add-scene]').click();assert.equal(await p.locator('.scene').count(),4);await p.reload();await p.waitForSelector('.scene');assert.equal(await p.locator('[data-scene="0"][data-prop=title]').inputValue(),'A bright opening');
 await p.setViewportSize({width:390,height:844});await p.locator('[data-nav=home]').click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await openLegacyDraft(p);await p.locator('#field-name').fill('Mobile draft');await p.locator('[data-action=add-output]').click();await p.keyboard.press('Escape');assert.equal(await p.locator('#taskPanel').evaluate(el=>!el.hidden),false);
 await p.evaluate(()=>{window.qaSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Storage full');};});await p.locator('#field-brief').fill('Unsaved work must remain');await p.locator('[data-action=save]').click();assert.match(await p.locator('#briefSummary').innerText(),/Storage full/);await p.locator('[data-nav=home]').click();await p.waitForSelector('#taskPanel:not([hidden])');assert.match(await p.locator('#taskPanel').innerText(),/changes need saving/);await p.locator('[data-action=close-task]').last().click();assert.equal(await p.locator('#field-brief').inputValue(),'Unsaved work must remain');
 await p.evaluate(()=>Storage.prototype.setItem=window.qaSetItem);await p.locator('[data-action=save]').first().click();assert.match(await p.locator('#saveState').innerText(),/Saved on this device/);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('UI browser: delayed usage cannot replace a newer screen; edit and export use saved artwork',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;let release;const pending=new Promise(resolve=>{release=resolve;});
 await p.route('**/api/costs',async route=>{await pending;await route.fulfill({contentType:'application/json',body:JSON.stringify({entries:[]})});});
 await p.goto(f.url);await p.waitForSelector('.continue-card');await p.locator('#accountTrigger').click();await p.locator('.usage-link').click();await p.waitForSelector('.loading-state');await p.locator('[data-nav=home]').click();await p.waitForSelector('.continue-card');release();await p.waitForResponse(r=>r.url().endsWith('/api/costs'));await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.match(await p.locator('.hero-eyebrow').innerText(),/Duroflex/);
 await p.locator('.continue-card .text-button').click();await p.waitForSelector('.option-card');await p.locator('[data-action=edit-image]').first().click();await p.waitForSelector('#editableDialog[open]');assert.match(await p.locator('#editableDialog').innerText(),/Duroflex campaign/);assert.equal(await p.evaluate(()=>window.currentJob.brandId),'brand-ui-duroflex');await p.locator('#ecPreparingClose').click();
 await p.locator('.download-options summary').click();await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await p.locator('.download-options summary').click();await p.locator('#downloadFormat').selectOption('jpeg');const downloaded=p.waitForEvent('download');await p.locator('[data-action=download-file], [data-action=download]').first().click();const file=await downloaded,meta=await require('sharp')(await file.path()).metadata();assert.equal(meta.width,1080);assert.equal(meta.height,1080);assert.equal(meta.format,'jpeg');
 const before=await p.evaluate(()=>location.hash);await p.locator('.skip-link').focus();await p.locator('.skip-link').click();assert.equal(await p.evaluate(()=>location.hash),before);assert.equal(await p.evaluate(()=>document.activeElement.id),'main');assert.deepEqual(f.errors,[]);assert.ok(f.requests.filter(r=>r.method!=='GET').every(r=>r.method==='POST'&&r.url.endsWith('/scan')),'Only local editor preparation may start; no generation calls');
 }finally{await f.close();}
});

test('Creative AI home: reference order, persisted menu, scoped search and composer handoff',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){
  await p.goto(f.url+'?brand='+brand.id);await p.waitForSelector('.creation-hero');
  assert.equal(await p.title(),'Creative AI by Hypergro');
  assert.deepEqual(await p.locator('.home-page > section').evaluateAll(els=>els.map(e=>e.className)),['home-panel continue-panel','creation-hero','quick-tools','home-panel']);
  assert.ok((await p.locator('.hero-art img').first().getAttribute('src')).includes('/products/'),'Unready artwork is not promoted into the hero');assert.equal(await p.locator('.quick-tool').count(),3);assert.equal(await p.locator('.format-tile').count(),6);
  await p.locator('#homePrompt').fill('A new chapter — नमस्ते <home> & together');
  await p.locator('[data-action=home-option][data-option=audience]').click();await p.locator('#homeOptionValue').fill('First-time homeowners');await p.locator('[data-action=home-apply]').click();
  await p.locator('[data-action=home-option][data-option=style]').click();await p.locator('#homeOptionValue').fill('Playful evening; include friends');await p.locator('[data-action=home-apply]').click();
  await p.locator('[data-action=home-option][data-option=product]').click();await p.locator('#homeOptionValue').selectOption('product-fixture');await p.locator('[data-action=home-apply]').click();
  await p.locator('[data-action=home-format][data-id="8"]').click();
  await p.waitForSelector('#field-brief');assert.equal(await p.locator('#field-brief').inputValue(),'A new chapter — नमस्ते <home> & together');assert.equal(await p.locator('#field-audience').inputValue(),'First-time homeowners');assert.equal(await p.locator('[data-field="detail.creativeDirection"]').inputValue(),'Playful evening; include friends');assert.equal(await p.locator('[data-prop=formatId]').inputValue(),'story');assert.equal(await p.locator('#field-productId').inputValue(),'product-fixture');assert.equal(await p.locator('#field-variant').inputValue(),'','Ambiguous variants stay unselected');
  await p.locator('[data-nav=home]').click();await p.locator('[data-action=workspace-search]').click();await p.locator('#workspaceSearch').fill('campaign');assert.match(await p.locator('#workspaceResults').innerText(),new RegExp(brand.name));assert.doesNotMatch(await p.locator('#workspaceResults').innerText(),new RegExp(brands.find(b=>b.id!==brand.id).name));await p.locator('[data-search-link]').first().click();await p.waitForSelector('.deliverable-row');assert.equal(await p.locator('#taskPanel').evaluate(el=>!el.hidden),false);
 }
 await p.locator('[data-nav=home]').click();await p.locator('#sidebarToggle').click();assert.equal(await p.locator('#sidebarToggle').getAttribute('aria-expanded'),'false');await p.reload();await p.waitForSelector('.creation-hero');assert.ok(await p.locator('body').evaluate(el=>el.classList.contains('sidebar-collapsed')));await p.locator('[data-nav=library]').click();await p.getByRole('tab',{name:'Products',exact:true}).click();await p.waitForSelector('.product-tile');await p.locator('#sidebarToggle').click();assert.equal(await p.locator('#sidebarToggle').getAttribute('aria-expanded'),'true');
 await p.setViewportSize({width:390,height:844});await p.locator('[data-nav=home]').click();await p.locator('#sidebarToggle').click();assert.ok(await p.locator('body').evaluate(el=>el.classList.contains('sidebar-mobile-open')));await p.locator('[data-nav=projects]').click();assert.equal(await p.locator('body').evaluate(el=>el.classList.contains('sidebar-mobile-open')),false);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Journey previews: all states render for both brands without mutations; preview drafts stay scoped',{timeout:120000},async()=>{
 const f=await fixture();try{const p=f.page,M=require('../../public/creative-ai/studio-model');
 for(const brand of brands){await p.goto(f.url+'?brand='+brand.id+'#journeys');await p.waitForSelector('.scenario-link');assert.equal(await p.locator('.scenario-link').count(),M.journeys.length);
 const storage=await p.evaluate(()=>JSON.stringify(localStorage));
 for(const j of M.journeys){await p.evaluate(id=>location.hash='walkthrough/'+id,j.id);await p.waitForFunction(id=>document.querySelector('#scenarioSelect')?.value===id,j.id);assert.equal(await p.locator('.preview-story strong').innerText(),j.title);assert.ok(await p.locator('.journey-example').innerText());}
 assert.equal(await p.evaluate(()=>JSON.stringify(localStorage)),storage,'Visiting examples does not write storage');
 }
 await p.evaluate(()=>location.hash='walkthrough/brief');await p.waitForSelector('#field-name');await p.locator('#field-name').fill('Sleepyhead preview only');
 await p.locator('[data-brand=brand-ui-duroflex]').click();await p.waitForSelector('.project-gallery');await p.evaluate(()=>location.hash='walkthrough/brief');await p.waitForSelector('#field-name');assert.notEqual(await p.locator('#field-name').inputValue(),'Sleepyhead preview only');
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Review details hydrate current option after fast navigation and notes remain version scoped',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;let release;const pending=new Promise(r=>release=r);
 await p.route('**/api/jobs/job-0/details',async route=>{await pending;await route.fulfill({contentType:'application/json',body:JSON.stringify({units:['continuity','exploration'].map((route,i)=>({route,placementId:'square',plannedArt:{composition:'Logo sits in the top corner with a clear margin.'},review:{qualityScores:[{criterion:'communication',score:i?80:90,usedInScore:true,evidence:{method:'vision',observation:route+' observed clarity'}}]}}))})});});
 await p.goto(f.url+'#review/job-0/0/0');release();await p.waitForSelector('.option-thumbnail');await p.locator('[data-action=focus-option][data-index="1"]').click();await p.waitForSelector('[data-action=focus-option][data-index="1"][aria-pressed=true]');await p.locator('#feedbackText').fill('Unsaved second option note');release();await p.waitForFunction(()=>document.querySelector('.score-number')?.textContent==='4.0/5');assert.equal(await p.locator('#feedbackText').inputValue(),'Unsaved second option note');
 await p.locator('[data-action=save-feedback]').click();await p.locator('[data-action=focus-option][data-index="0"]').click();await p.waitForSelector('[data-action=focus-option][data-index="0"][aria-pressed=true]');assert.equal(await p.locator('#feedbackText').inputValue(),'');assert.equal(await p.locator('.score-number').first().innerText(),'4.5/5');await p.locator('[data-action=focus-option][data-index="1"]').click();await p.waitForSelector('[data-action=focus-option][data-index="1"][aria-pressed=true]');assert.equal(await p.locator('#feedbackText').inputValue(),'Unsaved second option note');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Image walkthrough: brief through download, recoveries and desktop widths',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#journeys');await p.waitForSelector('.scenario-link');const storage=await p.evaluate(()=>JSON.stringify(localStorage));await p.locator('[data-action=demo-start]').click();await p.waitForSelector('#field-name');
 await p.locator('[data-action=preview-project]').click();await p.waitForSelector('[data-action=confirm-save]');await p.locator('[data-action=confirm-save]').click();await p.waitForSelector('.progress-main');await p.locator('[data-action=demo-next]').click();await p.waitForFunction(()=>document.querySelector('#scenarioSelect')?.value==='creating');await p.locator('[data-action=check-progress]').click();await p.waitForSelector('.focus-review');assert.match(await p.locator('.sample-rationale').innerText(),/Illustrative/);assert.equal(await p.locator('[data-action=versions]').count(),0);
 await p.locator('[data-action=edit-image]').click();await p.waitForSelector('#demoEditableText');await p.locator('#demoEditableText').fill('A simple edit');await p.locator('[data-action=demo-next]').click();await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await p.locator('.download-options summary').click();await p.locator('[data-action=download-file], [data-action=download]').first().click();await p.waitForFunction(()=>document.querySelector('#scenarioSelect')?.value==='download-complete');assert.match(await p.locator('h1').innerText(),/download is ready/);assert.equal(await p.evaluate(()=>JSON.stringify(localStorage)),storage);
 for(const width of [1280,1920]){await p.setViewportSize({width,height:1080});for(const id of ['brief','review','editor','download-failed']){await p.evaluate(id=>location.hash='walkthrough/'+id,id);await p.waitForFunction(id=>document.querySelector('#scenarioSelect')?.value===id,id);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+' '+id);}}
 await p.locator('[data-action=demo-recover]').click();await p.waitForFunction(()=>document.querySelector('#scenarioSelect')?.value==='download');assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Image export failure retains chosen format and supports retry without generation',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;let fail=true;await p.route('**/files/static-continuity.png',route=>route.request().resourceType()==='fetch'&&fail?route.fulfill({status:503,body:'Unavailable'}):route.continue());await p.goto(f.url+'#download/job-0/0/0');await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await p.locator('.download-options summary').click();await p.locator('#downloadFormat').selectOption('png');await p.locator('[data-action=download-file], [data-action=download]').first().click();await p.waitForFunction(()=>document.querySelector('#downloadStatus')?.textContent.includes('Retry'));assert.equal(await p.locator('#downloadFormat').inputValue(),'png');assert.equal(await p.locator('[data-action=download-file]').isEnabled(),true);fail=false;const d=p.waitForEvent('download');await p.locator('[data-action=download-file], [data-action=download]').first().click();await d;assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Organisation browser: each brand can rename, tag, save, favourite, duplicate and restore a project',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){await p.goto(f.url+'?brand='+brand.id+'#projects');await p.waitForSelector('.project-row');await p.locator('.project-row [data-action=org-menu]').click();await p.locator('[data-action=org-rename]').click();await p.locator('#orgName').fill(brand.name+' Festive <A&B>');await p.locator('[data-action=org-apply-name]').click();assert.match(await p.locator('.project-name').innerText(),/Festive <A&B>/);
 await p.locator('.project-row [data-action=org-menu]').click();await p.locator('[data-action=org-organise]').click();await p.locator('#orgCampaign').fill('Diwali 2026');await p.locator('#orgTags').fill('sofa, launch, नमस्ते');await p.locator('[data-action=org-apply-tags]').click();await p.locator('#projectSearch').fill('diwali नमस्ते');assert.equal(await p.locator('.project-row').count(),1);await p.locator('#projectSearch').fill('');
 await p.locator('.project-row [data-action=org-favourite]').click();await p.locator('[data-nav=favourites]').click();await p.waitForSelector('.saved-card');assert.match(await p.locator('.saved-card h2').innerText(),new RegExp(brand.name));await p.reload();await p.waitForSelector('.saved-card');await p.locator('[data-nav=projects]').click();await p.locator('.project-row [data-action=org-menu]').click();await p.locator('[data-action=org-duplicate]').click();await p.waitForSelector('.deliverable-row');assert.match(await p.locator('h1').innerText(),/copy/);assert.match(await p.locator('.notice').innerText(),/linked/);
 await p.locator('[data-nav=projects]').click();await p.waitForSelector('.project-row');assert.equal(await p.locator('.project-row').count(),2);const original=p.locator('.project-row').filter({hasText:brand.name+' Festive <A&B>'}).filter({hasNotText:'copy'});await original.locator('[data-action=org-menu]').click();await p.locator('[data-action=org-trash]').click();await p.locator('[data-action=org-confirm-trash]').click();await p.waitForFunction(()=>document.querySelectorAll('.project-row').length===1);await p.locator('#accountTrigger').click();await p.locator('#accountMenu a[href="#settings/profile"]').click();await p.locator('.settings-nav a[href="#settings/trash"]').click();await p.waitForSelector('.saved-card');assert.match(await p.locator('.saved-card h2').innerText(),/Festive/);await p.reload();await p.waitForSelector('[data-action=org-restore]');await p.locator('[data-action=org-restore]').click();assert.match(await p.locator('#main').innerText(),/Trash is empty/);await p.locator('[data-nav=projects]').click();await p.waitForSelector('.project-row');assert.equal(await p.locator('.project-row').count(),2);
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Organisation browser: creative favourite, trash and copy preserve original option identity',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#review/job-0/0/1');await p.waitForSelector('.artwork-toolbar');await p.locator('.artwork-toolbar [data-action=org-favourite]').click();await p.locator('[data-nav=favourites]').click();await p.waitForSelector('.saved-card');assert.equal(await p.locator('.saved-card').count(),1);assert.match(await p.locator('.saved-card .status').innerText(),/Review before sharing/);await p.locator('.saved-card h2 a').click();await p.waitForSelector('.artwork-toolbar');assert.match(await p.locator('.focused-art img').getAttribute('src'),/exploration/);
 await p.locator('.artwork-toolbar [data-action=org-menu]').click();await p.locator('[data-action=org-rename]').click();await p.locator('#orgName').fill('Evening scene');await p.locator('[data-action=org-apply-name]').click();await p.locator('.artwork-toolbar [data-action=org-menu]').click();await p.locator('[data-action=org-duplicate]').click();await p.waitForSelector('.deliverable-row');await p.locator('[data-action=open-output]').click();await p.waitForSelector('.focused-art');assert.equal(await p.locator('.option-thumbnail').count(),1);assert.match(await p.locator('.focused-art img').getAttribute('src'),/exploration/);
 await p.evaluate(()=>location.hash='review/job-0/0/1');await p.waitForSelector('[data-action=focus-option][data-index="1"][aria-pressed=true]');await p.locator('.artwork-toolbar [data-action=org-menu]').click();await p.locator('[data-action=org-trash]').click();await p.locator('[data-action=org-confirm-trash]').click();await p.waitForSelector('.deliverable-row');await p.locator('[data-action=open-output]').click();await p.waitForSelector('.focused-art');assert.equal(await p.locator('.option-thumbnail').count(),1);assert.match(await p.locator('.focused-art img').getAttribute('src'),/continuity/);await p.locator('#accountTrigger').click();await p.locator('#accountMenu a[href="#settings/profile"]').click();await p.locator('.settings-nav a[href="#settings/trash"]').click();await p.waitForSelector('[data-action=org-restore]');assert.match(await p.locator('.saved-card h2').innerText(),/Evening scene/);await p.locator('[data-action=org-restore]').click();await p.locator('[data-nav=favourites]').click();await p.waitForSelector('.saved-card');assert.equal(await p.locator('.saved-card').count(),1);assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Organisation browser: filename, SKU, brand and status search; failed saves keep inputs',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#projects');await p.waitForSelector('.project-row');await p.locator('[data-action=workspace-search]').click();for(const [query,expected] of [['SOFA-42','A saved product'],['launch_reference_2026.png','Brand poster'],['static-exploration.png','Option 2'],['duroflex','Duroflex campaign']]){await p.locator('#workspaceSearch').fill(query);assert.match(await p.locator('#workspaceResults').innerText(),new RegExp(expected));}await p.locator('#workspaceSearch').fill('Sleepyhead');assert.match(await p.locator('#workspaceResults').innerText(),/No matches in this brand/);await p.keyboard.press('Escape');await p.locator('#projectSearch').fill('review');assert.equal(await p.locator('.project-row').count(),1);
 await p.locator('.project-row [data-action=org-menu]').click();await p.locator('[data-action=org-rename]').click();await p.locator('#orgName').fill('Keep this name');await p.evaluate(()=>{window.oldSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Storage full');};});await p.locator('[data-action=org-apply-name]').click();assert.equal(await p.locator('#orgName').inputValue(),'Keep this name');assert.match(await p.locator('#orgFormError').innerText(),/Storage full/);assert.notEqual(await p.locator('.project-name').innerText(),'Keep this name');await p.evaluate(()=>Storage.prototype.setItem=window.oldSetItem);await p.locator('[data-action=org-apply-name]').click();assert.equal(await p.locator('.project-name').innerText(),'Keep this name');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Organisation browser: unsaved notes survive bookmarks; stale writes and corrupt metadata recover safely',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#review/job-0/0/0');await p.waitForSelector('#feedbackText');await p.locator('#feedbackText').fill('Keep my unsaved note');await p.locator('.artwork-toolbar [data-action=org-favourite]').click();assert.equal(await p.locator('#feedbackText').inputValue(),'Keep my unsaved note');await p.locator('.artwork-toolbar [data-action=org-menu]').click();await p.locator('[data-action=org-rename]').click();await p.locator('#orgName').fill('Pending name');await p.evaluate(()=>{const key='studio-organise-v1:brand-ui-duroflex',v=JSON.parse(localStorage.getItem(key));v.revision++;localStorage.setItem(key,JSON.stringify(v));});await p.locator('[data-action=org-apply-name]').click();assert.match(await p.locator('#orgFormError').innerText(),/another tab/);assert.equal(await p.locator('#orgName').inputValue(),'Pending name');await p.locator('[data-action=org-reload]').click();await p.waitForSelector('.artwork-toolbar');await p.locator('.artwork-toolbar [data-action=org-menu]').click();await p.locator('[data-action=org-rename]').click();assert.notEqual(await p.locator('#orgName').inputValue(),'Pending name');await p.keyboard.press('Escape');
 await p.evaluate(()=>localStorage.setItem('studio-organise-v1:brand-ui-duroflex','broken-json'));await p.reload();await p.waitForSelector('[data-action=org-reload]');assert.match(await p.locator('#main').innerText(),/could not be read/);await p.locator('.artwork-toolbar [data-action=org-favourite]').click();assert.equal(await p.evaluate(()=>localStorage.getItem('studio-organise-v1:brand-ui-duroflex')),'broken-json');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('Organisation browser: draft duplicate/rename and parent trash restore preserve independently trashed creatives',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#projects');await p.waitForSelector('.project-row');await openLegacyDraft(p);await p.locator('#field-name').fill('Draft to duplicate');await p.locator('[data-action=save]').click();await p.locator('[data-nav=projects]').click();let row=p.locator('.project-row').filter({hasText:'Draft to duplicate'});await row.locator('[data-action=org-menu]').click();await p.locator('[data-action=org-rename]').click();await p.locator('#orgName').fill('Renamed draft');await p.locator('[data-action=org-apply-name]').click();row=p.locator('.project-row').filter({hasText:'Renamed draft'});await row.locator('[data-action=org-menu]').click();await p.locator('[data-action=org-duplicate]').click();await p.waitForFunction(()=>document.querySelector('h1')?.textContent==='Renamed draft copy');await p.locator('[data-action=edit-brief]').click();await p.waitForSelector('#field-name');assert.equal(await p.locator('#field-name').inputValue(),'Renamed draft copy');
 await p.evaluate(()=>location.hash='review/job-0/0/1');await p.waitForSelector('.artwork-toolbar');await p.locator('.artwork-toolbar [data-action=org-menu]').click();await p.locator('[data-action=org-trash]').click();await p.locator('[data-action=org-confirm-trash]').click();await p.waitForSelector('.deliverable-row');await p.locator('[data-nav=projects]').click();await p.locator('.project-row').filter({hasText:'Duroflex campaign'}).locator('[data-action=org-menu]').click();await p.locator('[data-action=org-trash]').click();await p.locator('[data-action=org-confirm-trash]').click();await p.locator('#accountTrigger').click();await p.locator('#accountMenu a[href="#settings/profile"]').click();await p.locator('.settings-nav a[href="#settings/trash"]').click();await p.waitForSelector('.saved-card');assert.equal(await p.locator('.saved-card').count(),2);await p.locator('[data-action=org-restore][data-org-key="project:job-0"]').click();assert.equal(await p.locator('.saved-card').count(),1);await p.locator('[data-nav=projects]').click();await p.locator('.project-name[href="#project/job-0"]').click();await p.locator('[data-action=open-output]').click();await p.waitForSelector('.option-thumbnail');assert.equal(await p.locator('.option-thumbnail').count(),1);assert.match(await p.locator('.focused-art img').getAttribute('src'),/continuity/);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Organisation browser: checked projects filter correctly and a trashed creative is absent from active search',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.route('**/api/jobs/job-0',async route=>{const response=await route.fetch(),data=await response.json();data.results=data.results.map(r=>({...r,ready:true}));await route.fulfill({json:data});});await p.goto(f.url+'#projects');await p.waitForSelector('.project-row');await p.locator('[data-filter=review]').click();assert.equal(await p.locator('.project-row').count(),0);await p.locator('[data-filter=checked]').click();assert.equal(await p.locator('.project-row').count(),1);await p.evaluate(()=>location.hash='review/job-0/0/1');await p.waitForSelector('.artwork-toolbar');await p.locator('.artwork-toolbar [data-action=org-menu]').click();await p.locator('[data-action=org-trash]').click();await p.locator('[data-action=org-confirm-trash]').click();await p.locator('[data-action=workspace-search]').click();await p.locator('#workspaceSearch').fill('static-exploration.png');assert.match(await p.locator('#workspaceResults').innerText(),/No matches/);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Campaign journeys: brief goes directly to generation, with no concepts or asset-plan gate for either brand',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){
  await p.goto(f.url+'?brand='+brand.id);await p.locator('[data-action=start-campaign]').first().click();await p.locator('#field-name').fill('Campaign '+brand.name);await p.locator('#field-brief').fill('Three ads, a carousel and a banner');await p.locator('[data-focus=brand]').click();
  for(const id of [1,1,1,9,7]){await p.locator('[data-action=add-output]').click();await p.locator('[data-action=choose-feature][data-id="'+id+'"]').click();}
  assert.equal(await p.locator('.creation-steps,.journey-steps').count(),0);
  await p.locator('[data-action=preview-project]').click();await p.waitForSelector('.deliverable-row');assert.match(p.url(),/#project\//);assert.equal(await p.locator('.deliverable-row').count(),5);
  assert.match(await p.locator('#main').innerText(),/not available for generation yet/);
  const id=p.url().split('#project/')[1];
  for(const section of ['strategy','concepts','plan']){await p.goto(f.url+'?brand='+brand.id+'#campaign/'+id+'/'+section);await p.waitForSelector('.confirmation-layout');assert.equal(await p.locator('[data-plan-field],[data-plan-prop=conceptId]').count(),0);}
  const saved=await p.evaluate(id=>StudioModel.storage(localStorage).read(activeBrand.id,id),id);assert.equal(saved.outputs.length,5);
  await p.goto(f.url+'?brand='+brand.id+'#project/job-'+brands.indexOf(brand));await p.waitForSelector('.deliverable-row');await p.locator('[data-action=open-output]').click();await p.waitForSelector('.focused-art img');assert.equal(await p.locator('.option-card').count(),2);assert.equal(await p.locator('[data-action=edit-image]').count(),1);
 }
 assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('Quick Create: static recipe, exact variant, short path and no campaign planning',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url);await p.locator('[data-action=new]').click();await p.locator('#taskPanel [data-action=start-quick]').click();await p.locator('[data-action=quick-recipe][data-id="10"]').click();await p.waitForSelector('.output-row');assert.equal(await p.locator('.output-row').count(),1);assert.match(await p.locator('h1').innerText(),/What do you need/);assert.equal(await p.locator('.quick-preferences').getAttribute('open'),null);
 await p.locator('#field-brief').fill('A GMB post about our store');await p.locator('#field-productId').selectOption('product-fixture');await p.locator('[data-action=preview-project]').click();assert.match(await p.locator('#briefSummary').innerText(),/exact product variant/);await p.locator('#field-variant').selectOption('grey');
 await p.locator('[data-action=add-output]').click();assert.equal(await p.locator('.feature-option').count(),15);await p.locator('[data-action=choose-feature][data-id="8"]').click();assert.equal(await p.locator('.output-row').count(),1);assert.match(p.url(),/#brief\//);assert.equal(await p.locator('.creation-steps,.journey-steps').count(),0);assert.equal(await p.locator('[data-action=generation-preflight]').count(),0);assert.equal(await p.locator('[data-action=generation-submit]').isDisabled(),true);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Campaign recovery: direct generation preserves unsaved inputs and blocks stale tabs',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url);await p.locator('[data-action=start-campaign]').first().click();await p.locator('#field-name').fill('Recovery campaign');await p.locator('#field-brief').fill('One post');await p.locator('[data-focus=brand]').click();await p.locator('[data-action=add-output]').click();await p.locator('[data-action=choose-feature][data-id="1"]').click();
 await p.evaluate(()=>{window.saveOriginal=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Storage full');};});await p.locator('#field-brief').fill('Keep this unsaved brief');await p.locator('[data-action=preview-project]').click();assert.equal(await p.locator('#field-brief').inputValue(),'Keep this unsaved brief');assert.match(await p.locator('#briefSummary').innerText(),/Storage full/);await p.evaluate(()=>Storage.prototype.setItem=window.saveOriginal);await p.getByRole('button',{name:'Save draft',exact:true}).click();
 await p.evaluate(()=>{const id=location.hash.split('/')[1],key='studio-ui-v1:'+window.activeBrand.id+':'+id;const d=JSON.parse(localStorage.getItem(key));d.revision++;d.name='Newer external draft';localStorage.setItem(key,JSON.stringify(d));});await p.locator('#field-name').fill('Unsaved local name');await p.locator('[data-action=preview-project]').click();assert.match(await p.locator('#briefSummary').innerText(),/another tab/);assert.equal(await p.locator('#field-name').inputValue(),'Unsaved local name');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('Static regression: download returns to exact option and missing artwork has a recovery route',{timeout:30000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#review/job-0/0/1');await p.locator('.download-options summary').click();await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await p.locator('.download-options summary').click();assert.match(p.url(),/#review\/job-0\/0\/1$/);
 await p.goto(f.url+'#download/job-0/99/0');await p.waitForSelector('h2');assert.ok(await p.locator('#main a[href="#project/job-0"]').count(),'Missing-image state has a route back to project');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('Static regression: renamed campaign asset stays named in its preview',{timeout:30000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url);await p.waitForSelector('.creation-hero');const id=await p.evaluate(()=>{const d=StudioModel.startDraft(activeBrand.id,'campaign');d.name='Asset names';d.brief='A new launch';d.focus='brand';const o=StudioModel.output(7);o.name='Diwali homepage hero';d.outputs=[o];StudioModel.storage(localStorage).save(d);return d.id;});await p.goto(f.url+'#review/'+id+'/0');await p.waitForSelector('h1');assert.match(await p.locator('#main').innerText(),/Diwali homepage hero/);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Static matrix: 15 recipes × both brands × Quick and Campaign journeys',{timeout:240000},async()=>{
 const M=require('../../public/creative-ai/studio-model'),f=await fixture(),coverage=[];try{const p=f.page;
 for(const brand of brands)for(const mode of ['quick','campaign'])for(const feature of M.features.filter(f=>f.kind==='image')){
  await p.goto(f.url+'?brand='+brand.id);await p.evaluate(id=>localStorage.removeItem('creative-ai-home:'+id),brand.id);
  await p.goto(f.url+'?brand='+brand.id+'#home');await p.waitForSelector('.creation-hero');
  if(mode==='quick'){await p.locator('[data-action=start-quick]').first().click();await p.locator('[data-action=quick-recipe][data-id="'+feature.id+'"]').click();}else{await p.locator('[data-action=start-campaign]').first().click();await p.locator('[data-action=add-output]').click();await p.locator('[data-action=choose-feature][data-id="'+feature.id+'"]').click();}
  await p.locator('#field-name').fill(brand.name+' '+mode+' '+feature.id);await p.locator('#field-brief').fill('एक नया विचार · <A&B> — '+feature.name);await p.locator('[data-focus=brand]').click();await p.locator('[data-prop=language]').selectOption(feature.id%2?'Hindi':'English');
  const spec=M.staticRecipe(feature.id);await p.locator('.static-setup summary').click();
  for(const [key,,type='text',options] of spec.fields){const el=p.locator('[data-static-key="'+key+'"]').first();if(type==='select')await el.selectOption(options[0]);else await el.fill(type==='url'?'https://example.com/product':type==='date'?(key==='offerEnd'?'2026-11-10':'2026-11-01'):type==='number'?'210':'नमस्ते <A&B> '+key);}
  if(spec.part){assert.equal(await p.locator('.static-part').count(),feature.id===9?5:3);await p.locator('[data-static-part][data-static-key=copy]').first().fill('First item — retained');}
  await p.locator('[data-action=preview-project]').click();
  await p.waitForSelector('.deliverable-row');await p.locator('[data-action=open-output]').click();
  await p.waitForSelector('.static-deliverable');assert.match(await p.locator('#main').innerText(),new RegExp(feature.name));assert.ok((await p.locator('.static-deliverable').innerText()).includes(spec.handoff));assert.equal(await p.locator('.static-preview-parts li').count(),spec.part?(feature.id===9?5:3):0);
  await p.reload();await p.waitForSelector('.static-deliverable');assert.match(await p.locator('.static-specs').innerText(),/नमस्ते <A&B>/);await p.getByRole('link',{name:/Edit inputs/}).click();await p.waitForSelector('.static-setup[open]');assert.equal(await p.locator('[data-prop=language]').inputValue(),feature.id%2?'Hindi':'English');
  if(brand.id===brands[0].id&&mode==='quick'&&[6,9,11].includes(feature.id)){await fs.mkdir(path.join(root,'work/studio-static-journeys-20261020/screens'),{recursive:true});await p.screenshot({path:path.join(root,'work/studio-static-journeys-20261020/screens/recipe-'+feature.id+'.png'),fullPage:true});}
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow: '+feature.id);coverage.push({brand:brand.name,mode,featureId:feature.id,name:feature.name,stages:['entry','inputs','specific-fields','validation','plan-or-confirmation','deliverable','reopen','back-to-inputs'],passed:true});
 }
 assert.equal(coverage.length,60);assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);await fs.writeFile(path.join(root,'work/studio-static-journeys-20261020/matrix.json'),JSON.stringify(coverage,null,2));
 }finally{await f.close();}
});
test('Static edges: independent offers, collection variants, custom size and retired recipes',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url);await p.locator('[data-action=start-campaign]').first().click();await p.locator('#field-name').fill('Offer set');await p.locator('#field-brief').fill('Two separate offers');await p.locator('[data-focus=collection]').click();await p.locator('[data-action=add-output]').click();await p.locator('[data-action=choose-feature][data-id="3"]').click();await p.locator('[data-action=preview-project]').click();assert.match(await p.locator('#field-productIds').innerText(),/Choose at least one/);await p.locator('[data-collection-product]').check();await p.locator('[data-action=preview-project]').click();assert.match(await p.locator('#field-productIds').innerText(),/exact variant/);await p.locator('[data-collection-variant]').selectOption('grey');
 await p.locator('.static-setup summary').click();await p.locator('[data-static-key=offer]').fill('Offer A');await p.locator('[data-static-key=offerStart]').fill('2026-11-20');await p.locator('[data-static-key=offerEnd]').fill('2026-11-01');await p.locator('[data-action=preview-project]').click();assert.match(await p.locator('#briefSummary').innerText(),/end date/);await p.locator('.static-setup summary').click();await p.locator('[data-static-key=offerEnd]').fill('2026-11-30');await p.locator('[data-static-key=destination]').fill('javascript:bad');await p.locator('[data-action=preview-project]').click();assert.match(await p.locator('#briefSummary').innerText(),/destination URL/);await p.locator('.static-setup summary').click();await p.locator('[data-static-key=destination]').fill('https://example.com/');
 await p.locator('[data-action=add-output]').click();await p.locator('[data-action=choose-feature][data-id="3"]').click();await p.locator('.static-setup summary').last().click();assert.equal(await p.locator('[data-static-key=offer]').last().inputValue(),'');await p.locator('[data-static-key=offer]').last().fill('Offer B');await p.locator('[data-prop=formatId]').last().selectOption('story');await p.locator('[data-prop=formatId]').last().selectOption('custom');assert.equal(await p.locator('[data-prop=height]').last().inputValue(),'1920');
 await p.locator('[data-action=preview-project]').click();await p.waitForSelector('.deliverable-row');assert.equal(await p.locator('.deliverable-row').count(),2);assert.doesNotMatch(await p.locator('#main').innerText(),/Assign a concept|proposition/);
 const id=await p.evaluate(()=>{const d=StudioModel.newDraft(activeBrand.id);d.name='Retired recipe';d.outputs=[{id:'old-item',featureId:999,width:1080,height:1080}];StudioModel.storage(localStorage).save(d);return d.id;});await p.goto(f.url+'#brief/'+id);await p.waitForSelector('#briefForm');assert.match(await p.locator('#outputs').innerText(),/unavailable/);assert.equal(await p.locator('[data-action=remove-output]').count(),1);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('Static sequence: editing, reordering, removal undo and reduced-slide recovery',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#recipes');await p.locator('[data-action=quick-recipe][data-id="9"]').click();await p.locator('#field-brief').fill('Five slides');await p.locator('[data-focus=brand]').click();await p.locator('.static-setup summary').click();await p.locator('[data-static-part][data-static-key=copy]').last().fill('Last slide must survive');await p.locator('[data-prop=slides]').fill('2');await p.locator('[data-action=save]').click();await p.reload();await p.waitForSelector('.static-setup');await p.locator('.static-setup summary').click();assert.equal(await p.locator('.static-part').count(),2);await p.locator('[data-static-part][data-static-key=copy]').first().fill('Edit first with other slides hidden');await p.locator('[data-prop=slides]').fill('5');await p.locator('[data-action=save]').click();await p.reload();await p.waitForSelector('.static-setup');await p.locator('.static-setup summary').click();assert.equal(await p.locator('[data-static-part][data-static-key=copy]').last().inputValue(),'Last slide must survive');await p.locator('[data-action=static-part-up]').last().click();assert.equal(await p.locator('[data-static-part][data-static-key=copy]').nth(3).inputValue(),'Last slide must survive');await p.locator('[data-action=static-part-remove]').nth(3).click();assert.equal(await p.locator('.static-part').count(),4);await p.locator('#toast button').click();assert.equal(await p.locator('.static-part').count(),5);await p.locator('[data-action=static-part-add]').click();assert.equal(await p.locator('.static-part').count(),6);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Static export regression: a 200 HTML error is never downloaded as artwork',{timeout:30000},async()=>{
 const f=await fixture();try{const p=f.page;let downloads=0;p.on('download',()=>downloads++);await p.goto(f.url+'#download/job-0/0/0');await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await p.locator('.download-options summary').click();await p.route('**/files/static-continuity.png',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Login or error page</h1>'}));await p.locator('[data-action=download-file], [data-action=download]').first().click();await p.waitForFunction(()=>!document.querySelector('[data-action=download-file]').disabled);assert.match(await p.locator('#downloadStatus').innerText(),/couldn’t prepare this download/i);assert.equal(downloads,0);
 }finally{await f.close();}
});

test('Static saved-art matrix: 15 features × both brands, option selection → editor dispatch → exact download',{timeout:120000},async()=>{
 const M=require('../../public/creative-ai/studio-model'),sharp=require('sharp'),f=await fixture(),results=[];try{const p=f.page,images=new Map();
 for(const feature of M.features.filter(f=>f.kind==='image')){const o=M.output(feature.id);images.set(feature.id,await sharp({create:{width:o.width,height:o.height,channels:3,background:'#b8bdd1'}}).png().toBuffer());}
 await p.route('**/api/jobs/job-*',async route=>{const id=route.request().url().split('/').pop();if(!/^job-[01]$/.test(id))return route.continue();const brand=brands[Number(id.slice(-1))],placements=M.features.filter(f=>f.kind==='image').map(f=>{const o=M.output(f.id);return {id:'static-'+f.id,name:f.name,featureId:f.id,dimensions:{width:o.width,height:o.height}};});return route.fulfill({contentType:'application/json',body:JSON.stringify({id,brandId:brand.id,status:'finished',productSummary:{name:brand.name+' static QA'},placements,results:placements.flatMap(x=>['continuity','exploration'].map(route=>({route,placementId:x.id,ready:false,imageUrl:'/creative-ai/api/jobs/'+id+'/files/'+x.id+'-'+route+'.png'})))})});});
 await p.route('**/files/static-*-*.png',route=>{const id=Number(route.request().url().match(/static-(\d+)-/)[1]);return route.fulfill({contentType:'image/png',body:images.get(id)});});
 for(const [brandIndex,brand] of brands.entries())for(const feature of M.features.filter(f=>f.kind==='image')){
  const job='job-'+brandIndex,index=feature.id-1;await p.goto(f.url+'?brand='+brand.id+'#review/'+job+'/'+index+'/1');await p.waitForSelector('.focused-art img');assert.match(await p.locator('.focused-art img').getAttribute('src'),/exploration/);await p.locator('[data-action=select-option]').click();assert.equal(await p.locator('.option-card.selected').count(),1);
  await p.evaluate(()=>{window.qaEditCalls=[];window.EditableCanvas.open=async key=>qaEditCalls.push({key,brand:activeBrand.id,job:currentJob.id});});await p.locator('[data-action=edit-image]').click();assert.deepEqual(await p.evaluate(()=>qaEditCalls),[{key:'exploration|static-'+feature.id,brand:brand.id,job}]);
  await p.goBack();await p.waitForSelector('.focused-art img');await p.locator('.download-options summary').click();await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await p.locator('.download-options summary').click();assert.equal(new URL(p.url()).hash,'#review/'+job+'/'+index+'/1');const format=feature.id%3===0?'jpeg':feature.id%3===1?'png':'original';await p.locator('#downloadFormat').selectOption(format);const [download]=await Promise.all([p.waitForEvent('download'),p.locator('[data-action=download-file], [data-action=download]').first().click()]);const metadata=await sharp(await fs.readFile(await download.path())).metadata(),o=M.output(feature.id);assert.equal(metadata.width,o.width);assert.equal(metadata.height,o.height);assert.equal(metadata.format,format==='jpeg'?'jpeg':'png');assert.match(await p.locator('#main').innerText(),/Review before sharing/);
  await p.waitForSelector('.focused-art img');assert.match(await p.locator('.focused-art img').getAttribute('src'),/exploration/);results.push({brand:brand.name,featureId:feature.id,format,width:metadata.width,height:metadata.height,editor:'dispatch validated; real Fabric tested separately',passed:true});
 }
 assert.equal(results.length,30);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);assert.deepEqual(f.errors,[]);await fs.writeFile(path.join(root,'work/studio-static-journeys-20261020/saved-art-matrix.json'),JSON.stringify(results,null,2));
 }finally{await f.close();}
});
test('Static recovery: image retry, unavailable references, missing assets and safe download navigation',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;let imageFail=true;await p.route('**/files/static-continuity.png',route=>imageFail?route.fulfill({status:503,body:'Unavailable'}):route.continue());await p.goto(f.url+'#review/job-0/0/0');await p.locator('[data-action=retry-artwork]').click();imageFail=false;await p.locator('[data-action=retry-artwork]').click();await p.waitForFunction(()=>{const i=document.querySelector('.focused-art img');return i&&!i.hidden&&i.complete&&i.naturalWidth>0;});
 let referencesFail=true;await p.route('**/brands/brand-ui-duroflex/assets',route=>referencesFail?route.fulfill({status:503,body:'{}'}):route.continue());await p.goto(f.url+'#recipes');await p.locator('[data-action=quick-recipe][data-id="1"]').click();await p.locator('[data-action=pick-reference]').click();await p.waitForSelector('[data-action=retry-reference]');referencesFail=false;await p.locator('[data-action=retry-reference]').click();await p.locator('[data-action=pick-reference]').click();await p.locator('[data-action=select-reference]').click();assert.equal(await p.locator('.reference-chip').count(),1);
 await p.goto(f.url+'#download/job-0/0/0');await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await p.locator('.download-options summary').click();let release;const barrier=new Promise(r=>release=r);await p.route('**/files/static-continuity.png',async route=>{await barrier;await route.continue();});let downloads=0;p.on('download',()=>downloads++);await p.locator('[data-action=download-file], [data-action=download]').first().click();await p.locator('[data-brand="brand-ui-sleepyhead"]').click();release();await p.waitForFunction(()=>window.activeBrand.id==='brand-ui-sleepyhead');await p.waitForTimeout(150);assert.equal(downloads,0,'Leaving the export view cancels the old download');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Static sizing: parent-format propagation, independent modules and desktop continuity',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){await p.goto(f.url+'?brand='+brand.id);await p.waitForSelector('.creation-hero');
 for(const featureId of [5,6,9,11]){
  const id=await p.evaluate(featureId=>{const d=StudioModel.startDraft(activeBrand.id,'quick',featureId);d.brief='Desktop size and copy check';d.focus='brand';const o=d.outputs[0];o.staticParts=StudioModel.staticParts(o);if(o.staticParts.length)o.staticParts[0].copy='Wording survives resize';if(featureId===6){o.staticParts[0].width=970;o.staticParts[0].height=300;}StudioModel.storage(localStorage).save(d);return d.id;},featureId);
  await p.goto(f.url+'?brand='+brand.id+'#brief/'+id);await p.waitForSelector('#briefForm');await p.locator('[data-prop=formatId]').selectOption('story');await p.locator('[data-action=save]').click();
  const output=await p.evaluate(id=>StudioModel.storage(localStorage).read(activeBrand.id,id).outputs[0],id);
  for(const part of output.staticParts){if(featureId===6)continue;assert.equal(part.width,1080);assert.equal(part.height,1920);}if(featureId===6){assert.equal(output.staticParts[0].width,970);assert.equal(output.staticParts[0].height,300);}if(output.staticParts.length)assert.equal(output.staticParts[0].copy,'Wording survives resize');
  await p.goto(f.url+'?brand='+brand.id+'#static/'+id+'/0');await p.waitForSelector('.static-deliverable');
  for(const width of [1280,1920]){await p.setViewportSize({width,height:1000});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow at '+width);assert.match(await p.locator('#main').innerText(),/Desktop size and copy check/);assert.equal(await p.locator('#main').count(),1);assert.equal(await p.locator('.app-sidebar').count(),1);await p.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});if(brand===brands[0]&&width===1280)await p.screenshot({path:path.join(root,'work/studio-static-journeys-20261020/screens/deliverable-'+featureId+'.png'),animations:'disabled'});}
 }
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});


test('Library profile: source links, SKU filters, saved views, reload and brand isolation',{timeout:45000},async()=>{
 const f=await fixture({profiles:true});try{const p=f.page;await p.goto(f.url);await p.locator('[data-nav=library]').click();await p.waitForSelector('.brand-profile');assert.equal(await p.getByRole('tab',{name:'Brand assets',exact:true}).getAttribute('aria-selected'),'true');assert.match(await p.locator('.profile-basis').innerText(),/draft/);assert.equal(await p.locator('.brand-visual-grid img').count(),3);assert.ok(await p.locator('.brand-resources a').count()>=5);
 const brand='brand-1923d633-e03e-44cc-84b2-bbfb5c152710';for(const href of await p.locator('.brand-profile a').evaluateAll(els=>els.map(e=>e.getAttribute('href'))))assert.ok(href.startsWith('/creative-ai/api/brands/'+brand+'/'));
 await p.getByRole('tab',{name:'Products',exact:true}).click();await p.waitForSelector('.product-table');await p.getByRole('textbox',{name:'Search products',exact:true}).fill('missing');assert.equal(await p.locator('.product-table tbody tr.product-tile').count(),0);await p.locator('#productLibrarySearch').fill('SOFA-42');assert.equal(await p.locator('.product-table tbody tr.product-tile').count(),1);await p.locator('#productCategory').selectOption('Sofa');await p.locator('[data-action=save-product-view]').click();await p.locator('#productViewName').fill('Sofas & “launch”');await p.locator('[data-action=confirm-product-view]').click();await p.waitForSelector('#taskPanel',{state:'hidden'});assert.equal(await p.locator('#productSavedView option').count(),2);await p.reload();await p.waitForSelector('.product-table');await p.locator('#productSavedView').selectOption('0');assert.equal(await p.locator('#productLibrarySearch').inputValue(),'SOFA-42');assert.equal(await p.locator('#productCategory').inputValue(),'Sofa');
 await p.getByRole('button',{name:'Sleepyhead',exact:true}).click();await p.waitForSelector('.product-table');await p.getByRole('tab',{name:'Brand assets',exact:true}).click();await p.waitForSelector('.brand-profile');assert.match(await p.locator('.brand-profile-header h2').innerText(),/Sleepyhead/);assert.match(await p.locator('.profile-note').innerText(),/#231F20/);assert.match(await p.locator('.brand-typefaces').innerText(),/Migrena Grotesque/);for(const href of await p.locator('.brand-profile a').evaluateAll(els=>els.map(e=>e.getAttribute('href'))))assert.ok(href.includes('brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'));await p.getByRole('tab',{name:'Products',exact:true}).click();await p.waitForSelector('#productSavedView');assert.equal(await p.locator('#productSavedView option').count(),1);assert.equal(await p.locator('#productLibrarySearch').inputValue(),'');assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Organisation browser: anchored menu stays in viewport, supports keyboard and dismisses safely for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){
  await p.goto(f.url+'?brand='+brand.id+'#projects');await p.waitForSelector('[data-action=org-menu]');
  const trigger=p.locator('[data-action=org-menu]').first();await trigger.click();
  assert.equal(await p.locator('#taskPanel').evaluate(el=>!el.hidden),false);
  assert.equal(await trigger.getAttribute('aria-expanded'),'true');
  assert.equal(await p.locator('#fileActionsMenu [role=menuitem]').count(),4);
  const bounds=await p.locator('#fileActionsMenu').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight};});
  assert.ok(bounds.left>=0&&bounds.top>=0&&bounds.right<=bounds.w&&bounds.bottom<=bounds.h);
  await p.keyboard.press('End');assert.equal(await p.evaluate(()=>document.activeElement.dataset.action),'org-trash');
  await p.keyboard.press('Home');assert.equal(await p.evaluate(()=>document.activeElement.dataset.action),'org-rename');await p.keyboard.press('ArrowDown');assert.equal(await p.evaluate(()=>document.activeElement.dataset.action),'org-duplicate');
  await p.keyboard.press('Escape');assert.equal(await p.locator('#fileActionsMenu').count(),0);assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
  await trigger.click();await trigger.click();assert.equal(await p.locator('#fileActionsMenu').count(),0);
  await trigger.click();await p.locator('h1').click();assert.equal(await p.locator('#fileActionsMenu').count(),0);
  await trigger.click();await p.keyboard.press('Home');await p.keyboard.press('Enter');await p.waitForSelector('#orgName');assert.equal(await p.locator('#fileActionsMenu').count(),0);await p.keyboard.press('Escape');
  await trigger.click();await p.locator('[data-nav=library]').click();await p.waitForSelector('[role=tablist]');assert.equal(await p.locator('#fileActionsMenu').count(),0);
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Account frontend: menu, settings, local profile recovery and unconnected access controls',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#projects');await p.waitForSelector('[data-action=org-menu]');
 assert.equal(await p.locator('#sidebarNavigation [data-nav=trash]').count(),0);await p.locator('#accountTrigger').click();assert.equal(await p.locator('#accountMenu').evaluate(el=>el.matches(':popover-open')),true);assert.match(await p.locator('#accountMenu').innerText(),/Login not connected/);
 await p.keyboard.press('Escape');assert.equal(await p.locator('#accountMenu').evaluate(el=>el.matches(':popover-open')),false);
 await p.locator('#sidebarToggle').click();await p.locator('#accountTrigger').click();await p.locator('#accountMenu a[href="#settings/profile"]').click();await p.waitForSelector('#profileName');assert.equal(await p.locator('#accountMenu').evaluate(el=>el.matches(':popover-open')),false);
 await p.locator('#profileName').fill(' ');await p.locator('[data-action=save-profile]').click();assert.match(await p.locator('#profileStatus').innerText(),/1–80/);
 await p.locator('#profileName').fill('Test Marketer');await p.evaluate(()=>{window.profileSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Full');};});await p.locator('[data-action=save-profile]').click();assert.match(await p.locator('#profileStatus').innerText(),/Could not save/);assert.equal(await p.locator('#profileName').inputValue(),'Test Marketer');await p.evaluate(()=>Storage.prototype.setItem=window.profileSetItem);await p.locator('[data-action=save-profile]').click();await p.reload();await p.waitForSelector('#profileName');assert.equal(await p.locator('#profileName').inputValue(),'Test Marketer');
 await p.locator('.settings-nav a[href="#settings/team"]').click();await p.waitForSelector('.settings-empty');assert.equal(await p.getByRole('button',{name:'Invite member'}).isDisabled(),true);assert.match(await p.locator('#main').innerText(),/No permissions are assigned or enforced/);
 await p.locator('.settings-nav a[href="#settings/security"]').click();await p.getByRole('heading',{name:'Login & security',exact:true}).waitFor();assert.match(await p.locator('#main').innerText(),/profiles do not separate or protect user data/);assert.equal(await p.getByRole('button',{name:'Connect login'}).isDisabled(),true);
 await p.locator('.settings-nav a[href="#settings/workspace"]').click();await p.waitForSelector('.settings-brand');assert.equal(await p.locator('.settings-brand').count(),2);await p.getByRole('link',{name:'Sleepyhead',exact:true}).click();await p.waitForSelector('[data-library-tab=brand]');assert.match(p.url(),/brand-ui-sleepyhead/);assert.equal(await p.locator('#accountName').innerText(),'Test Marketer');
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});


test('Context help: independent hints, hover, keyboard, dismissal and both-brand screen coverage',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){await p.goto(f.url+'?brand='+brand.id+'#home');await p.waitForSelector('.quick-tool-help');
  assert.equal(await p.locator('.sidebar-help-row > .context-help').count(),6);
  const help=p.locator('.creation-actions').getByRole('button',{name:'About Create a Campaign',exact:true});
  await help.hover();await p.waitForFunction(()=>document.querySelector('#studioContextHelp').matches(':popover-open'));assert.match(await p.locator('#studioContextHelp').innerText(),/several deliverables/);
  await help.click();assert.match(p.url(),/#home$/);assert.equal(await p.locator('button button').count(),0);assert.equal(await p.locator('.format-tile .context-help').count(),0);
  await p.keyboard.press('Escape');assert.equal(await p.locator('#studioContextHelp').evaluate(e=>e.matches(':popover-open')),false);
  await help.blur();await help.focus();await p.waitForFunction(()=>document.querySelector('#studioContextHelp').matches(':popover-open'));
  assert.equal(await help.getAttribute('aria-describedby'),'studioContextHelp');
  const r=await p.locator('#studioContextHelp').evaluate(el=>{const b=el.getBoundingClientRect();return {l:b.left,r:b.right,t:b.top,b:b.bottom,w:innerWidth,h:innerHeight};});assert.ok(r.l>=0&&r.r<=r.w&&r.t>=0&&r.b<=r.h);
  await p.locator('[data-nav=library]').click();await p.waitForSelector('[data-library-tab=brand]');assert.equal(await p.locator('#studioContextHelp').evaluate(e=>e.matches(':popover-open')),false);assert.equal(await p.getByRole('button',{name:'About Brand library',exact:true}).count(),1);
  await p.evaluate(()=>location.hash='review/job-'+(location.search.includes('sleepyhead')?'1':'0')+'/0/0');await p.waitForSelector('.artwork-toolbar');assert.equal(await p.getByRole('button',{name:'About Edit a creative',exact:true}).count(),1);
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Non-modal tasks: inline inputs, screen navigation, return context, reload and brand isolation',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){
  await p.goto(f.url+'?brand='+brand.id+'#home');await p.waitForSelector('#homePrompt');
  await p.locator('#homePrompt').fill('Keep this brief & नमस्ते');
  await p.locator('[data-action=home-option][data-option=audience]').click();
  assert.equal(await p.locator('#taskPanel').getAttribute('class'),'task-panel task-inline');
  assert.equal(await p.locator('#main').isVisible(),true);
  assert.equal(await p.locator('.prompt-composer + #taskPanel').count(),1);
  assert.equal(await p.locator('dialog[open]').count(),0);
  await p.locator('#homeOptionValue').fill('New homeowners');await p.locator('[data-action=home-apply]').click();
  assert.equal(await p.locator('#homePrompt').inputValue(),'Keep this brief & नमस्ते');
  await p.locator('[data-action=home-tools]').click();
  assert.equal(await p.locator('#main').isVisible(),false);assert.equal(await p.locator('#taskPanel').isVisible(),true);
  assert.match(await p.locator('#taskTitle').innerText(),/Explore/);assert.match(await p.evaluate(()=>location.hash),/^#tools/);
  await p.goBack();await p.waitForSelector('#homePrompt');
  assert.equal(await p.locator('#homePrompt').inputValue(),'Keep this brief & नमस्ते');
  assert.equal(await p.locator('#taskPanel').isVisible(),false);
  await p.locator('[data-action=workspace-search]').click();await p.locator('#workspaceSearch').fill(brand.name);
  assert.match(await p.locator('#workspaceResults').innerText(),new RegExp(brand.name));
  await p.locator('[data-nav=projects]').click();await p.waitForSelector('.project-gallery');
  assert.equal(await p.locator('#taskPanel').isVisible(),false);
  await p.locator('.project-card [data-action=org-menu]').first().click();await p.locator('[data-action=org-rename]').click();
  assert.equal(await p.locator('.project-card + #taskPanel').count(),1);
  await p.locator('#projectSearch').fill('missing project');assert.equal(await p.locator('.project-card').count(),0);assert.equal(await p.locator('#taskPanel').isVisible(),false);
  await p.locator('#projectSearch').fill('');await p.locator('.project-card [data-action=org-menu]').first().click();await p.locator('[data-action=org-rename]').click();
  await p.locator('#orgName').fill('');await p.locator('[data-action=org-apply-name]').click();assert.match(await p.locator('#orgFormError').innerText(),/name/i);
  await p.locator('#orgName').fill('Retained '+brand.name);await p.locator('[data-action=org-apply-name]').click();assert.match(await p.locator('.project-card').first().innerText(),new RegExp('Retained '+brand.name));
  await p.locator('[data-action=workspace-search]').click();await p.reload();await p.waitForSelector('#workspaceSearch');
  assert.match(await p.evaluate(()=>location.hash),/^#search/);assert.equal(await p.locator('#taskPanel').isVisible(),true);
  await p.locator('[data-brand="'+brands.find(b=>b.id!==brand.id).id+'"]').click();
  await p.waitForSelector('#workspaceSearch');assert.equal(await p.locator('#taskPanel').isVisible(),true);
  assert.doesNotMatch(await p.locator('#taskPanel').innerText(),new RegExp('Retained '+brand.name));
 }
 assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Square acceptance: both-brand brief, readiness, lost-response retry and saved output download',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){let calls=0,created=0,lastDraft;const index=brands.indexOf(brand);
 await p.route('**/api/studio/preflight',async route=>{lastDraft=route.request().postDataJSON().draft;assert.equal(lastDraft.brandId,brand.id);assert.equal(lastDraft.outputs[0].width,1080);await route.fulfill({contentType:'application/json',body:JSON.stringify({token:'a'.repeat(64),checks:[{label:'Saved inputs',status:'passed'}],cost:{message:'Usage recorded in INR'}})});});
 await p.route('**/api/studio/generate',async route=>{calls++;const data=route.request().postDataJSON();assert.equal(data.draft.id,lastDraft.id);assert.equal(data.token,'a'.repeat(64));if(calls===1){created++;await route.abort('failed');}else await route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({id:'job-'+index,reused:true})});});
 await p.goto(f.url+'?brand='+brand.id);await p.waitForSelector('.creation-hero');await p.evaluate(brandId=>{const d=StudioModel.startDraft(brandId,'quick',1);d.name='Square acceptance';d.brief='A social post — नमस्ते & "home"';d.audience='People furnishing a living room';d.productId='product-fixture';d.variant='grey';const saved=StudioModel.storage(localStorage).save(d);location.hash='confirm/'+saved.id;},brand.id);
 await p.waitForSelector('[data-action=generation-submit]');assert.equal(await p.locator('[data-action=generation-preflight]').count(),0);await p.waitForFunction(()=>!document.querySelector('[data-action=generation-submit]').disabled);await p.locator('[data-action=generation-submit]').click();await p.waitForFunction(()=>document.querySelector('#generationReadiness').getAttribute('role')==='alert');assert.match(await p.locator('#generationReadiness').innerText(),/reconnect to the existing request/);
 await p.locator('[data-action=generation-submit]').click();await p.waitForURL(url=>url.hash==='#progress/job-'+index);assert.equal(created,1);assert.equal(calls,2);
 await p.goto(f.url+'?brand='+brand.id+'#project/job-'+index);await p.locator('[data-action=open-output]').first().click();await p.waitForSelector('.option-card');await p.locator('.download-options summary').click();await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await p.locator('.download-options summary').click();await p.locator('#downloadFormat').selectOption('png');const event=p.waitForEvent('download');await p.locator('[data-action=download-file], [data-action=download]').first().click();const file=await event,meta=await require('sharp')(await file.path()).metadata();assert.equal(meta.width,1080);assert.equal(meta.height,1080);
 await p.unroute('**/api/studio/preflight');await p.unroute('**/api/studio/generate');}
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('UI browser: ordered carousel ZIP is accessible for both brands and stale sets are hidden',{timeout:60000},async()=>{const f=await fixture();try{for(const [n,brand]of brands.entries()){const p=f.page,id='job-'+n;let stale=false;await p.route('**/api/jobs/'+id,route=>{const results=[1,2,3].map(i=>({route:'continuity',placementId:'s'+i,ready:false,imageUrl:'/creative-ai/api/jobs/'+id+'/files/static-'+i+'.png'}));return route.fulfill({json:{id,brandId:brand.id,status:'finished',createdAt:'2026-10-19',placements:results.map(r=>({id:r.placementId,name:r.placementId,dimensions:{width:1080,height:1080},carousel:{id:'set'}})),results,carousels:[{route:'continuity',ready:false,downloadUrl:'/creative-ai/api/jobs/'+id+'/files/carousel-bundle-set.zip',slides:results.map((r,i)=>({...r,index:i+1,imageUrl:stale&&i===1?r.imageUrl+'-old':r.imageUrl}))}]}})});await p.goto(f.url+'?brand='+brand.id+'#download/'+id+'/0/0');await p.locator('.download-options summary').click();await p.getByRole('link',{name:'Download carousel ZIP'}).waitFor();assert.match(await p.locator('#main').innerText(),/3 slides in publishing order/);assert.match(await p.locator('#main').innerText(),/Review required/);stale=true;await p.reload();await p.locator('.download-options summary').click();await p.locator('.download-options[open]').waitFor();assert.equal(await p.getByRole('link',{name:'Download carousel ZIP'}).count(),0);await p.unroute('**/api/jobs/'+id);}assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);}finally{await f.close();}});

test('UI browser: module set ZIP binds complete ordered assets and rejects foreign candidates for both brands',{timeout:60000},async()=>{const f=await fixture();try{for(const [n,brand]of brands.entries()){
 const p=f.page,id='job-'+n,rows=['hero','detail'].map(placementId=>({route:'continuity',placementId,imageUrl:'/creative-ai/api/jobs/'+id+'/files/static-'+placementId+'.png',ready:false}));let foreign=false,bodies=[];
 await p.route('**/api/jobs/'+id,route=>route.fulfill({json:{id,brandId:brand.id,status:'finished',placements:rows.map((r,i)=>({id:r.placementId,name:r.placementId,dimensions:{width:970,height:i?300:600}})),results:[...rows].reverse()}}));
 await p.route('**/api/jobs/'+id+'/delivery-packages',route=>{if(route.request().method()==='GET')return route.fulfill({json:{brandId:foreign?'other-brand':brand.id,brandName:brand.name,items:rows.map((r,i)=>({type:'result',route:r.route,placementId:r.placementId,previewUrl:r.imageUrl,versionId:'original',artifactHash:String(i).repeat(64)}))}});bodies.push(route.request().postDataJSON());return route.fulfill({json:{downloadUrl:'/creative-ai/api/jobs/'+id+'/files/qa-set.zip'}})});
 await p.route('**/files/qa-set.zip',route=>route.fulfill({contentType:'application/zip',body:Buffer.from('PK\x05\x06'+'\x00'.repeat(18),'binary')}));
 await p.goto(f.url+'?brand='+brand.id+'#download/'+id+'/0/0');if(!await p.locator('[data-action=download-set]').isVisible())await p.locator('.download-options summary').click();await p.locator('[data-action=download-set]').click();await p.waitForFunction(()=>document.querySelector('#downloadStatus')?.textContent.includes('Complete image set downloaded'));assert.equal(bodies.length,1);assert.equal(bodies[0].brandName,brand.name);assert.deepEqual(bodies[0].assets.map(a=>a.placementId),['hero','detail']);assert.ok(bodies[0].assets.every(a=>a.artifactHash.length===64));
 foreign=true;if(!await p.locator('[data-action=download-set]').isVisible())await p.locator('.download-options summary').click();await p.locator('[data-action=download-set]').click();await p.waitForFunction(()=>document.querySelector('#downloadStatus')?.textContent.includes('another brand'));assert.equal(bodies.length,1);await p.unrouteAll({behavior:'wait'});
 }assert.deepEqual(f.errors,[]);}finally{await f.close();}});

test('Home autosaves each brand, carries selected format directly, prioritises work and opens exact creative',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,brand] of brands.entries()){
  await p.goto(f.url+'?brand='+brand.id+'#home');await p.waitForSelector('#homePrompt');
  assert.equal(await p.locator('.home-page [data-action=start-campaign]').count(),1);assert.equal(await p.locator('.home-page [data-action=start-quick]').count(),1);assert.equal(await p.locator('.quick-tools [data-action=start-campaign],.quick-tools [data-action=start-quick]').count(),0);
  await p.locator('#homePrompt').fill(brand.name+' — नमस्ते <home>');
  for(const [option,value] of [['audience','New homeowners'],['style','Evening with people'],['product','product-fixture'],['dimensions','8']]){await p.locator('[data-action=home-option][data-option='+option+']').click();if(['product','dimensions'].includes(option))await p.locator('#homeOptionValue').selectOption(value);else await p.locator('#homeOptionValue').fill(value);await p.locator('[data-action=home-apply]').click();}
  await p.reload();await p.waitForSelector('#homePrompt');assert.equal(await p.locator('#homePrompt').inputValue(),brand.name+' — नमस्ते <home>');assert.equal(await p.locator('#homeSaveStatus').isHidden(),true);
  await p.locator('.home-page [data-action=start-quick]').click();await p.waitForSelector('#field-brief');assert.equal(await p.locator('#field-brief').inputValue(),brand.name+' — नमस्ते <home>');assert.equal(await p.locator('#field-productId').inputValue(),'product-fixture');assert.equal(await p.locator('[data-prop=formatId]').inputValue(),'story');assert.equal(await p.locator('#field-audience').inputValue(),'New homeowners');assert.equal(await p.locator('[data-field="detail.creativeDirection"]').inputValue(),'Evening with people');assert.equal(await p.locator('.recipe-grid').count(),0);
  await p.locator('[data-nav=home]').click();assert.equal(await p.locator('.home-page > section').first().getAttribute('class'),'home-panel continue-panel');assert.match(await p.locator('.continue-card').first().innerText(),/Continue brief/);assert.match(await p.locator('.continue-panel').innerText(),/Review options/);
  await p.evaluate(()=>{window.qaHomeEdits=[];EditableCanvas.open=async key=>qaHomeEdits.push({key,brand:activeBrand.id,job:currentJob.id});});await p.locator('[data-action=home-edit]').click();await p.waitForSelector('.creative-picker-card');assert.equal(await p.locator('.creative-picker-card').count(),2);await p.locator('#creativePickerSearch').fill('no matching creative');assert.equal(await p.locator('.creative-picker-card:visible').count(),0);assert.ok(await p.locator('#creativePickerEmpty').isVisible());await p.locator('#creativePickerSearch').fill('Option 2');await p.locator('.creative-picker-card:visible').click();assert.deepEqual(await p.evaluate(()=>qaHomeEdits),[{key:'exploration|square',brand:brand.id,job:'job-'+i}]);assert.match(p.url(),/#editor\//);
 }
 await p.goto(f.url+'?brand='+brands[0].id+'#home');await p.waitForSelector('#homePrompt');assert.match(await p.locator('#homePrompt').inputValue(),/^Duroflex/);
 // Storage failure keeps current input and shows that it is not saved.
 await p.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('Storage full');};});await p.locator('#homePrompt').fill('Keep this unsaved text');assert.equal(await p.locator('#homePrompt').inputValue(),'Keep this unsaved text');assert.match(await p.locator('#homeSaveStatus').innerText(),/Storage full/);
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Navigation continuity: section switching, filter links, reloadable screens and editor origin',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;
 await p.goto(f.url+'?brand='+brands[0].id+'#projects?status=review&sort=name&q=Duroflex');await p.waitForSelector('.project-row');assert.equal(await p.locator('#projectSearch').inputValue(),'Duroflex');assert.equal(await p.locator('#projectSort').inputValue(),'name');
 assert.deepEqual(await p.locator('#sidebarNavigation [data-nav]').evaluateAll(els=>els.map(e=>e.textContent.trim())),['Home','Projects','Favourites','Brand Library']);assert.equal(await p.locator('#sidebarNavigation .usage-link').count(),0);await p.locator('#accountTrigger').click();assert.ok(await p.locator('#accountMenu a[href="#settings/trash"]').isVisible());await p.keyboard.press('Escape');
 await p.locator('#projectSearch').fill('');await p.locator('[data-brand="'+brands[1].id+'"]').click();await p.waitForSelector('.project-row');assert.match(p.url(),/#projects\?status=review&sort=name$/);assert.match(await p.locator('.project-row').innerText(),/Sleepyhead/);
 await p.locator('.project-name').click();await p.waitForSelector('.deliverable-row');await p.locator('[data-brand="'+brands[0].id+'"]').click();await p.waitForSelector('.project-row');assert.match(p.url(),/#projects$/);assert.match(await p.locator('.project-row').innerText(),/Duroflex/);
 await p.locator('[data-nav=library]').click();await p.locator('[data-library-tab=products]').click();await p.locator('#productLibrarySearch').fill('saved');await p.waitForURL(/#library\/products\?q=saved$/);assert.deepEqual(f.errors,[]);assert.match(p.url(),/#library\/products\?q=saved$/);await p.reload();await p.waitForSelector('#productLibrarySearch');assert.equal(await p.locator('#productLibrarySearch').inputValue(),'saved');await p.locator('[data-brand="'+brands[1].id+'"]').click();await p.waitForSelector('#productLibrarySearch');assert.match(p.url(),/#library\/products$/);assert.equal(await p.locator('#productLibrarySearch').inputValue(),'');
 for(const route of ['create','creatives','tools','search']){await p.goto(f.url+'?brand='+brands[1].id+'#'+route);await p.waitForSelector('#taskPanel:not([hidden])');assert.ok(await p.locator('#taskTitle').innerText());await p.reload();await p.waitForSelector('#taskPanel:not([hidden])');assert.match(p.url(),new RegExp('#'+route));await p.locator('[data-action=close-task]').click();await p.waitForSelector('.creation-hero');}
 await p.goto(f.url+'?brand='+brands[1].id+'#creatives');await p.waitForSelector('.creative-picker-card');await p.evaluate(()=>{window.qaEditorOrigin=[];EditableCanvas.open=async(key,options)=>qaEditorOrigin.push({key,options});});await p.locator('.creative-picker-card').first().click();assert.equal((await p.evaluate(()=>qaEditorOrigin))[0].options.backLabel,'Back to creatives');assert.match(p.url(),/#editor\//);
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Returning from a project restores brand-scoped filters, scroll and the opened card',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'?brand='+brands[0].id+'#projects?status=review');await p.waitForSelector('.project-row');await p.evaluate(()=>{const b=activeBrand.id,st=StudioModel.storage(localStorage);for(let i=0;i<16;i++){const d=StudioModel.newDraft(b);d.name='Draft '+i;st.save(d);}});await p.locator('[data-filter=all]').click();await p.locator('#projectSort').selectOption('name');const card=p.locator('.project-row').filter({hasText:'Duroflex campaign'});await card.scrollIntoViewIfNeeded();const y=await p.evaluate(()=>scrollY);assert.ok(y>0);await card.locator('.project-name').click();await p.waitForSelector('.deliverable-row');await p.locator('.breadcrumb a').first().click();await p.waitForSelector('.project-row');await p.waitForFunction(y=>Math.abs(scrollY-y)<5,y);assert.match(p.url(),/#projects\?sort=name$/);assert.equal(await p.locator('.return-highlight').count(),1);await p.reload();await p.waitForSelector('.project-row');await p.waitForFunction(y=>Math.abs(scrollY-y)<5,y);await p.locator('.return-highlight .project-name').click();await p.waitForSelector('.deliverable-row');await p.goBack();await p.waitForSelector('.project-row');await p.waitForFunction(y=>Math.abs(scrollY-y)<5,y);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('Complex detail and brief-selection routes rehydrate safely after refresh',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;for(const b of brands){await p.goto(f.url+'?brand='+b.id+'#library/product?id=product-fixture&from=library%2Fproducts');await p.waitForSelector('#taskPanel:not([hidden])');assert.match(await p.locator('#taskTitle').innerText(),/saved product/);await p.reload();await p.waitForSelector('#taskPanel:not([hidden])');await p.locator('[data-action=close-task]').click();await p.waitForSelector('#productLibrarySearch');await p.goto(f.url+'?brand='+b.id+'#library/product?id=missing');await p.waitForSelector('.notice.error');assert.match(await p.locator('.notice.error').innerText(),/not available in this brand/);await p.goto(f.url+'?brand='+b.id+'#home');await p.waitForSelector('#homePrompt');await openLegacyDraft(p);await p.locator('[data-action=add-output]').click();assert.match(p.url(),/#deliverables/);await p.reload();await p.waitForSelector('#featureSearch');await p.locator('[data-action=choose-feature][data-id="8"]').click();await p.waitForSelector('[data-prop=formatId]');assert.equal(await p.locator('[data-prop=formatId]').inputValue(),'story');}assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);}finally{await f.close();}
});

test('Recovery navigation: editor URL survives refresh and library Back restores filters',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await f.context.addInitScript(()=>{Object.defineProperty(window,'__editorCalls',{value:[],configurable:true});document.addEventListener('DOMContentLoaded',()=>{EditableCanvas.open=async(key,options)=>{window.__editorCalls.push({key,job:currentJob.id,label:options.backLabel});};});});
 for(let i=0;i<brands.length;i++){await p.goto(f.url+'?brand='+brands[i].id+'#creatives');await p.waitForSelector('.creative-picker-card');await p.locator('.creative-picker-card').last().click();await p.waitForURL(/#editor\//);const link=p.url();await p.waitForFunction(()=>__editorCalls.length===1);assert.equal((await p.evaluate(()=>__editorCalls))[0].key,'exploration|square');await p.reload();await p.waitForFunction(()=>__editorCalls.length===1);assert.equal(p.url(),link);assert.equal((await p.evaluate(()=>__editorCalls))[0].job,'job-'+i);
 await p.goto(f.url+'?brand='+brands[i].id+'#library/products?q=saved');await p.waitForSelector('#productLibrarySearch');await p.locator('[data-library-tab=inspiration]').click();await p.waitForURL(/#library\/inspiration$/);await p.goBack();await p.waitForSelector('#productLibrarySearch');assert.equal(await p.locator('#productLibrarySearch').inputValue(),'saved');}
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Return to tab refreshes project data without replacing unsaved composer or feedback',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'?brand='+brands[0].id+'#projects');await p.waitForSelector('.project-row');let detailReads=0;await p.route('**/api/jobs/job-0',async route=>{detailReads++;const response=await route.fetch(),body=await response.json();body.productSummary.name='Updated remote campaign';await route.fulfill({json:body});});await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.waitForFunction(()=>document.querySelector('.project-row')?.textContent.includes('Updated remote campaign'));assert.ok(detailReads>0);
 await p.locator('[data-nav=home]').click();await p.locator('#homePrompt').fill('Unfinished composer stays');await p.evaluate(()=>window.dispatchEvent(new Event('online')));assert.equal(await p.locator('#homePrompt').inputValue(),'Unfinished composer stays');await p.locator('[data-nav=projects]').click();await p.locator('.project-name').click();await p.evaluate(()=>location.hash='review/job-0/0/0');await p.waitForSelector('#feedbackText');await p.locator('#feedbackText').fill('Unsaved review notes');await p.locator('h1').click();await p.waitForTimeout(3100);const reads=detailReads;await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await p.waitForFunction(()=>document.querySelector('#feedbackText')?.value==='Unsaved review notes');await p.waitForTimeout(150);assert.ok(detailReads>reads);assert.equal(await p.locator('#feedbackText').inputValue(),'Unsaved review notes');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Reference intake: every selected file is listed, decoded and recoverable for both brands',{timeout:60000},async()=>{const f=await fixture();try{const p=f.page,image=await require('sharp')({create:{width:16,height:16,channels:3,background:'#999'}}).png().toBuffer();let attempts=0;await p.route('**/api/studio/validate-reference',async route=>{attempts++;const body=route.request().postDataJSON();if(body.name==='retry.png'&&attempts===1)return route.fulfill({status:503,json:{error:'Temporary validation outage'}});try{return route.fulfill({json:await require('../../lib/creative-ai/runtime/reference-validation').validate(body)});}catch(e){return route.fulfill({status:422,json:{error:e.message}});}});
 for(const brand of brands){attempts=0;await p.goto(f.url+'?brand='+brand.id);await p.waitForSelector('#homePrompt');await openLegacyDraft(p);assert.match(await p.locator('#referenceLimits').innerText(),/10.*20 MB/);const picker=p.waitForEvent('filechooser');await p.locator('[data-action=add-reference]').click();await (await picker).setFiles([{name:'retry.png',mimeType:'image/png',buffer:image},{name:'not-readable.png',mimeType:'image/png',buffer:Buffer.from('not an image')},...Array.from({length:10},(_,i)=>({name:'good-'+i+'.png',mimeType:'image/png',buffer:image}))]);await p.waitForFunction(()=>document.querySelectorAll('[data-reference-row]').length===12&&!document.querySelector('#referenceUploads').textContent.includes('Checking'));assert.match(await p.locator('#referenceUploads').innerText(),/good-9.png/);assert.match(await p.locator('#referenceUploads').innerText(),/10 files per selection/);assert.equal(await p.locator('.reference-chip').count(),8);await p.locator('[data-action=retry-reference-file]').first().click();await p.waitForFunction(()=>document.querySelectorAll('.reference-chip').length===9);assert.equal(await p.locator('[data-reference-row]').count(),12);await p.reload();await p.waitForSelector('#referenceUploads');assert.match(await p.locator('#referenceUploads').innerText(),/not-readable.png/);assert.equal(await p.locator('.reference-chip').count(),9);}
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}});

test('Downloads: both brands use fresh saved edit, consistent names, explicit Original and fail closed on missing edit metadata',{timeout:60000},async()=>{const f=await fixture();try{const p=f.page,sharp=require('sharp'),edited=await sharp({create:{width:1080,height:1080,channels:3,background:'#11aa44'}}).png().toBuffer();for(const [i,brand]of brands.entries()){let unavailable=false,revision=2,exports=[];const id='job-'+i;await p.route('**/api/jobs/'+id+'/edits',route=>unavailable?route.fulfill({status:503,json:{error:'Offline'}}):route.fulfill({json:[{route:'continuity',placementId:'square',revision,sourceImageUrl:'/creative-ai/api/jobs/'+id+'/files/static-continuity.png',previewUrl:'/creative-ai/api/jobs/'+id+'/preview'}]}));await p.route('**/api/jobs/'+id+'/editable/continuity/square/export',async route=>{exports.push(route.request().postDataJSON());await new Promise(r=>setTimeout(r,150));await route.fulfill({contentType:'image/png',body:edited});});await p.goto(f.url+'?brand='+brand.id+'#download/'+id+'/0/0');await p.waitForSelector('[data-action=download-file]');revision=3;let event=p.waitForEvent('download');await p.evaluate(()=>{const b=document.querySelector('[data-action=download-file]');b.dispatchEvent(new MouseEvent('click',{bubbles:true}));b.dispatchEvent(new MouseEvent('click',{bubbles:true}));});let d=await event;assert.equal(d.suggestedFilename(),brand.name+'_'+brand.name+'-campaign_1080x1080_Option-1_R3.png');assert.equal(exports.length,1);assert.equal(exports[0].revision,3);assert.deepEqual(await fs.readFile(await d.path()),edited);
 await p.waitForFunction(()=>!document.querySelector('[data-action=download-file]').disabled);if(!await p.locator('#downloadVersion').isVisible())await p.locator('.download-options summary').click();await p.locator('#downloadVersion').selectOption('original');event=p.waitForEvent('download');await p.locator('[data-action=download-file]').click();d=await event;assert.equal(exports.length,1);assert.match(d.suggestedFilename(),/_Original.png$/);assert.notDeepEqual(await fs.readFile(await d.path()),edited);
 await p.waitForFunction(()=>!document.querySelector('[data-action=download-file]').disabled);unavailable=true;await p.locator('#downloadVersion').selectOption('latest');await p.locator('[data-action=download-file]').click();await p.waitForFunction(()=>document.querySelector('#downloadStatus').textContent.includes('Could not check the latest edit'));assert.equal(exports.length,1);await p.unrouteAll({behavior:'wait'});}assert.deepEqual(f.errors,[]);}finally{await f.close();}});

test('Rationale: simplified outputs retain intent and honest status without review findings for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;for(const [i,brand]of brands.entries()){const id='job-'+i;
 await p.route('**/api/jobs/'+id+'/details',route=>route.fulfill({json:{units:[{route:'continuity',placementId:'square',plannedArt:{composition:'Give the headline a clear area.',lighting:'Cool evening light.'},review:{criticalChecks:[{criterion:'required-text-legibility',status:'fail',evidence:{observation:'Supporting copy is too small.'}}],qualityScores:[{criterion:'communication',score:98,usedInScore:true,evidence:{method:'vision',observation:'Headline is readable.'}}]}}]}}));
 await p.goto(f.url+'?brand='+brand.id+'#review/'+id+'/0/0');await p.waitForFunction(()=>document.querySelector('.score-number')?.textContent==='4.9/5');
 assert.equal(await p.locator('.review-findings,#savedReviewDetails,.journey-steps,.creation-steps').count(),0);assert.doesNotMatch(await p.locator('#rationalePanel').innerText(),/What the review found|Supporting copy is too small/);assert.equal(await p.locator('.decision-row').count(),4);assert.match(await p.locator('.design-decisions').innerText(),/Design intent/);assert.doesNotMatch(await p.locator('[data-review-status]').innerText(),/Saved review passed/);
 assert.equal(await p.locator('#sidebarNavigation [data-action=home-group]').count(),6);await p.locator('#sidebarNavigation [data-group=social]').click();await p.waitForSelector('#taskPanel:not([hidden])');assert.match(p.url(),/#tools\/category/);await p.goBack();await p.waitForSelector('#rationalePanel');
 await p.route('**/api/jobs/'+id+'/edits',route=>route.fulfill({json:[{route:'continuity',placementId:'square',revision:3,sourceImageUrl:'/creative-ai/api/jobs/'+id+'/files/static-continuity.png',previewUrl:'/creative-ai/api/jobs/'+id+'/preview'}]}));await p.reload();await p.waitForSelector('.option-thumbnail.active small');assert.match(await p.locator('.option-thumbnail.active small').innerText(),/Edited · review needed/);assert.equal(await p.locator('.review-findings').count(),0);await p.unrouteAll({behavior:'wait'});
 }assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);}finally{await f.close();}});

test('Client language: both brands show outcomes, simplified rationale and safe recovery without technical detours',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,b] of brands.entries()){
  await p.goto(f.url+'?brand='+b.id+'#creatives');await p.waitForSelector('.creative-picker-card');
  assert.doesNotMatch(await p.locator('#taskPanel').innerText(),/continuity|exploration|undefined/i);assert.match(await p.locator('#taskPanel').innerText(),/Option 1/);
  await p.goto(f.url+'?brand='+b.id+'#review/job-'+i+'/0/0');await p.waitForSelector('#rationalePanel');
  assert.equal(await p.locator('#main a[href^="/creative-ai?"]').count(),0);assert.equal(await p.locator('.decision-row').count(),4);
  assert.doesNotMatch(await p.locator('#main').innerText(),/No AI request|brand training|Full design intent/);
  assert.equal(await p.locator('[data-action=review-details],#savedReviewDetails').count(),0);
  await p.route('**/jobs/job-'+i,async route=>{const response=await route.fetch(),data=await response.json();data.status='failed';data.error={message:'Agent output failed validated contract after one schema repair: GPT-6 token limit'};await route.fulfill({json:data});});
  await p.goto(f.url+'?brand='+b.id+'#progress/job-'+i);await p.reload();await p.waitForSelector('.progress-main');assert.match(await p.locator('#main').innerText(),/couldn’t finish this creative/);assert.doesNotMatch(await p.locator('#main').innerText(),/Agent output|schema|GPT-6|token limit|advanced tools/i);assert.equal(await p.getByRole('button',{name:'Check status',exact:true}).count(),0);assert.ok(await p.locator('.recorded-progress').isVisible());
  await p.unroute('**/jobs/job-'+i);
  await p.goto(f.url+'?brand='+b.id+'#settings/diagnostics');await p.waitForSelector('.settings-panel');assert.ok(await p.getByRole('link',{name:'Open technical workspace'}).isVisible());
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});


test('Live progress: both brands poll only the open job, pause, reconnect and stop at completion',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;let phase='strategy',failed=false,reads=0;
 await p.addInitScript(()=>{window.qaHidden=false;window.qaOnline=true;Object.defineProperty(document,'hidden',{get:()=>window.qaHidden});Object.defineProperty(navigator,'onLine',{get:()=>window.qaOnline});});
 for(let i=0;i<brands.length;i++){
  const id='job-'+i,b=brands[i];phase='strategy';failed=false;reads=0;
  await p.route('**/api/jobs/'+id,async route=>{reads++;if(failed)return route.fulfill({status:503,json:{error:'fixture disconnect'}});const response=await route.fetch(),body=await response.json();body.status=phase==='finished'?'finished':'running';body.stage=phase;body.activeStages=phase==='finished'?[]:[phase];if(phase!=='finished')body.results=[];await route.fulfill({json:body});});
  await p.goto(f.url+'?brand='+b.id+'#progress/'+id);await p.waitForSelector('.recorded-progress [aria-current=step]');await p.waitForFunction(()=>document.querySelector('.progress-main h2')?.textContent==='Preparing');assert.equal(await p.getByRole('button',{name:'Check status',exact:true}).count(),0);
  // Automatic stage advancement requires no user action.
  phase='generation';await p.waitForFunction(()=>document.querySelector('.progress-main h2')?.textContent==='Creating',{},{timeout:8000});
  const requests=f.requests.length;phase='review';await p.waitForFunction(()=>document.querySelector('.progress-main h2')?.textContent==='Reviewing',{},{timeout:8000});const later=f.requests.slice(requests);assert.ok(!later.some(r=>r.url==='/creative-ai/api/jobs'||r.url.endsWith('/edits')||r.url==='/creative-ai/api/jobs/job-'+(1-i)),'Polling reads only the selected job');
  await p.evaluate(()=>{window.qaHidden=true;document.dispatchEvent(new Event('visibilitychange'));});const paused=reads;await p.waitForTimeout(5300);assert.equal(reads,paused);
  failed=true;await p.evaluate(()=>{window.qaHidden=false;document.dispatchEvent(new Event('visibilitychange'));});await p.waitForFunction(()=>document.querySelector('#progressConnection')?.textContent.includes('Reconnecting'));assert.match(await p.locator('.progress-main h2').innerText(),/Reviewing/);
  await p.evaluate(()=>{window.qaOnline=false;dispatchEvent(new Event('offline'));});const offline=reads;await p.waitForTimeout(200);assert.equal(reads,offline);assert.match(await p.locator('#progressConnection').innerText(),/offline/);
  failed=false;phase='finished';await p.evaluate(()=>{window.qaOnline=true;dispatchEvent(new Event('online'));});await p.waitForURL(new RegExp('#project/'+id+'$'));await p.waitForSelector('.deliverable-row');await p.waitForTimeout(500);const completed=reads;await p.waitForTimeout(5300);assert.equal(reads,completed,'Terminal jobs stop periodic requests');
  // A returning tab still refreshes immediately, including terminal records.
  await p.evaluate(()=>{window.qaHidden=true;document.dispatchEvent(new Event('visibilitychange'));window.qaHidden=false;document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(250);assert.ok(reads>completed);
  assert.equal(await p.locator('.progress-main').count(),0);
  await p.goto(f.url+'?brand='+b.id+'#progress/'+id);await p.waitForURL(new RegExp('#project/'+id+'$'));await p.waitForSelector('.deliverable-row');
  await p.unroute('**/api/jobs/'+id);
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});


test('Progress tab return refreshes the latest edited preview without making a paid request',{timeout:30000},async()=>{const f=await fixture();try{const p=f.page;await p.goto(f.url+'?brand='+brands[0].id+'#project/job-0');await p.waitForSelector('.deliverable-row');await p.route('**/jobs/job-0/edits',r=>r.fulfill({json:[{route:'continuity',placementId:'square',sourceImageUrl:'/creative-ai/api/jobs/job-0/files/static-continuity.png',revision:2,previewUrl:'/creative-ai/api/jobs/job-0/editable/continuity/square/preview?revision=2',updatedAt:'2026-10-22T12:00:00Z'}]}));await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await p.waitForFunction(()=>document.querySelector('.deliverable-row img')?.src.includes('revision=2'));assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);}finally{await f.close();}});

test('Projects: missing artwork uses only the matching saved SKU image and creation buttons have no help icons',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,b]of brands.entries()){
  let mode='empty';const other=brands[1-i];
  await p.route('**/api/brands/'+b.id+'/products',route=>route.fulfill({json:[{id:'foreign',brandId:other.id,pageUrl:'https://example.com/products/sku',assets:[{id:'bad',group:'product-images',previewUrl:'/creative-ai/api/jobs/job-'+i+'/files/wrong.png'}]},{id:'product-match',brandId:b.id,pageUrl:'https://example.com/products/sku',assets:[{id:'first',group:'product-images',previewUrl:'/creative-ai/api/jobs/job-'+i+'/files/first.png'},{id:'chosen',group:'product-images',previewUrl:'/creative-ai/api/jobs/job-'+i+'/files/sku-selected.png'}]}]}));
  await p.route('**/api/jobs/job-'+i,async route=>{const response=await route.fetch(),data=await response.json();data.intake={productPageUrl:mode==='missing'?'https://example.com/products/absent':'https://example.com/products/sku?variant=2',productAssetId:'chosen'};if(mode!=='art')data.results=[];await route.fulfill({json:data});});
  await p.goto(f.url+'?brand='+b.id+'#projects');await p.waitForSelector('.project-card');
  assert.match(await p.locator('.project-cover img').getAttribute('src'),/sku-selected.png$/);assert.match(await p.locator('.project-cover img').getAttribute('alt'),/^Product reference:/);assert.match(await p.locator('.project-card-details').innerText(),/0 creatives/);assert.equal(await p.getByRole('button',{name:'About Quick Create',exact:true}).count(),0);assert.equal(await p.getByRole('button',{name:'About Create a Campaign',exact:true}).count(),0);assert.equal(await p.locator('.page-heading [data-action=start-quick]').count(),1);assert.equal(await p.locator('.page-heading [data-action=start-campaign]').count(),1);
  mode='art';await p.reload();await p.waitForSelector('.project-cover img');assert.match(await p.locator('.project-cover img').getAttribute('src'),/static-continuity.png$/);assert.equal(await p.locator('.project-cover.has-product-reference').count(),0);
  mode='missing';await p.reload();await p.waitForSelector('.project-card');assert.equal(await p.locator('.project-cover img').count(),0);assert.match(await p.locator('.project-cover').innerText(),/No artwork yet/);
  await p.unrouteAll({behavior:'wait'});
 }assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Brand switch: returning to a loaded brand renders immediately while refresh is delayed, with isolated data',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 await p.goto(f.url+'?brand='+brands[0].id+'#projects');await p.waitForSelector('.project-card');
 await p.getByRole('button',{name:'Sleepyhead',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.project-subtitle')?.textContent.includes('Sleepyhead'));
 await p.evaluate(()=>{const now=Date.now;Date.now=()=>now()+31000;});
 let release;const gate=new Promise(r=>release=r);await p.route('**/api/jobs',async route=>{await gate;await route.continue();});
 try{await p.getByRole('button',{name:'Duroflex',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.project-subtitle')?.textContent.includes('Duroflex'),{},{timeout:1000});assert.equal(await p.locator('.loading-bars').count(),0);assert.equal(await p.locator('.project-name').count(),1);assert.match(p.url(),/#projects$/);}
 finally{release();await p.unrouteAll({behavior:'wait'});}
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Brand switch: late background response cannot replace the current brand',{timeout:60000},async()=>{
 const f=await fixture();let release;const gate=new Promise(r=>release=r);try{const p=f.page;
 await p.route('**/api/jobs/job-1',async route=>{await gate;await route.continue();});
 await p.goto(f.url+'?brand='+brands[0].id+'#projects');await p.waitForSelector('.project-card');
 await p.getByRole('button',{name:'Sleepyhead',exact:true}).click();await p.waitForSelector('.loading-bars');
 await p.getByRole('button',{name:'Duroflex',exact:true}).click();await p.waitForSelector('.project-card');release();
 await p.waitForFunction(()=>StudioData.peekWorkspace('brand-ui-sleepyhead'));
 assert.match(await p.locator('.project-subtitle').innerText(),/Duroflex/);assert.doesNotMatch(await p.locator('.project-subtitle').innerText(),/Sleepyhead/);assert.match(p.url(),/brand=brand-ui-duroflex#projects/);assert.deepEqual(f.errors,[]);
 }finally{release();await f.page.unrouteAll({behavior:'wait'});await f.close();}
});

test('Brand switch: background refresh preserves newly typed Home prompt',{timeout:60000},async()=>{
 const f=await fixture();let release;const gate=new Promise(r=>release=r);try{const p=f.page;
 await p.goto(f.url+'?brand='+brands[0].id+'#home');await p.waitForSelector('#homePrompt');
 await p.getByRole('button',{name:'Sleepyhead',exact:true}).click();await p.waitForFunction(()=>window.activeBrand?.id==='brand-ui-sleepyhead'&&document.querySelector('#homePrompt'));
 await p.evaluate(()=>{const now=Date.now;Date.now=()=>now()+31000;});
 await p.route('**/api/jobs',async route=>{await gate;await route.continue();});
 await p.getByRole('button',{name:'Duroflex',exact:true}).click();await p.locator('#homePrompt').fill('Keep my new draft while refreshing');release();await p.unrouteAll({behavior:'wait'});
 await p.evaluate(()=>StudioData.workspace('brand-ui-duroflex'));
 assert.equal(await p.locator('#homePrompt').inputValue(),'Keep my new draft while refreshing');assert.deepEqual(f.errors,[]);
 }finally{release();await f.page.unrouteAll({behavior:'wait'});await f.close();}
});

test('Projects: artwork opens both options directly and survives reload for each brand',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,brand]of brands.entries()){
  await p.goto(f.url+'?brand='+brand.id+'#projects');await p.waitForSelector('.project-cover img');
  assert.equal(await p.locator('.project-cover').getAttribute('href'),'#review/job-'+i+'/0/0');
  await p.locator('.project-cover img').click();await p.waitForSelector('.option-strip');assert.equal(await p.locator('.option-thumbnail').count(),2);assert.equal(await p.locator('[data-action=open-output]').count(),0);
  await p.locator('.option-thumbnail').nth(1).click();await p.waitForFunction(()=>document.querySelector('.option-thumbnail[aria-pressed="true"]')?.dataset.index==='1');
  await p.reload();await p.waitForSelector('.option-strip');assert.equal(await p.locator('.option-thumbnail').count(),2);
  await p.locator('.breadcrumb a').first().click();await p.waitForSelector('.project-gallery');assert.match(p.url(),/#projects$/);
 }assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Design details: both options have saved rationale and scores before artwork opens, for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,b]of brands.entries()){
 let reads=0;await p.route('**/api/jobs/job-'+i+'/details',route=>{reads++;return route.fulfill({json:{units:['continuity','exploration'].map((route,n)=>({route,placementId:'square',plannedArt:{rationale:b.name+' saved composition'},review:{qualityScores:[{criterion:'communication',score:n?80:90,usedInScore:true,evidence:{method:'vision',observation:'Saved observation'}}]}}))}});});
 await p.goto(f.url+'?brand='+b.id+'#projects');await p.waitForSelector('.project-cover img');assert.equal(reads,1);
 await p.locator('.project-cover img').click();await p.waitForSelector('.option-strip');assert.equal(await p.locator('.score-number').first().innerText(),'4.5/5');assert.match(await p.locator('#rationalePanel').innerText(),new RegExp(b.name+' saved composition'));
 await p.locator('.option-thumbnail').nth(1).click();await p.waitForSelector('.option-thumbnail[data-index="1"][aria-pressed=true]');assert.equal(await p.locator('.score-number').first().innerText(),'4.0/5');assert.equal(reads,1);
 await p.unrouteAll({behavior:'wait'});
 }assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Project statuses appear only inside artwork or empty preview areas for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,b]of brands.entries())for(const empty of [false,true]){
 await p.route('**/api/jobs/job-'+i,async route=>{const response=await route.fetch(),job=await response.json();if(empty){job.results=[];job.status='failed';}await route.fulfill({json:job});});
 await p.goto(f.url+'?brand='+b.id+'#projects');await p.waitForSelector('.project-card');
 assert.equal(await p.locator('.project-card .status').count(),1);assert.equal(await p.locator('.project-card-info .status').count(),0);assert.equal(await p.locator('.project-cover-status .status').count(),1);
 const cover=await p.locator('.project-cover').boundingBox(),badge=await p.locator('.project-cover-status').boundingBox();assert.ok(badge.x>=cover.x&&badge.y>=cover.y&&badge.x+badge.width<=cover.x+cover.width&&badge.y+badge.height<=cover.y+cover.height);
 await p.unrouteAll({behavior:'wait'});
 }assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Workspace loader is visible during delayed brand reads and disappears when loaded',{timeout:60000},async()=>{
 const f=await fixture();let release;try{const p=f.page;const gate=new Promise(r=>release=r);
 await p.route('**/api/jobs',async route=>{await gate;await route.continue();});
 await p.goto(f.url+'?brand='+brands[0].id+'#library/products');await p.waitForSelector('.workspace-loader.loading-bars');
 assert.match(await p.locator('.workspace-loader').innerText(),/Loading Duroflex/);assert.equal(await p.locator('.workspace-loader').getAttribute('role'),'status');
 await p.waitForSelector('.workspace-loader.studio-motion-ready svg');assert.equal(await p.locator('.workspace-spinner').isVisible(),false);assert.equal(await p.locator('[data-studio-motion-host]').getAttribute('data-studio-motion-host'),'workspace');
 await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('.workspace-loader svg').getAttribute('aria-hidden'),'true');
 release();await p.unrouteAll({behavior:'wait'});await p.waitForSelector('#productLibrarySearch');assert.equal(await p.locator('.workspace-loader').count(),0);assert.deepEqual(f.errors,[]);
 }finally{release?.();await f.page.unrouteAll({behavior:'wait'});await f.close();}
});

test('Failed project Retry starts directly once for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,brand]of brands.entries()){
 let posts=0;await p.route('**/api/jobs/job-'+i,async route=>{const response=await route.fetch(),job=await response.json();job.status='failed';job.results=[];await route.fulfill({json:job});});
 await p.route('**/api/jobs/job-'+i+'/restart',route=>{if(route.request().method()==='POST'){posts++;const body=route.request().postDataJSON();assert.equal(body.brandId,brand.id);assert.equal(body.confirmPaid,true);assert.equal(body.token,'saved-token');return route.fulfill({json:{id:'restarted-'+i}});}return route.fulfill({json:{brandId:brand.id,token:'saved-token',message:'Original work is preserved. New generation charges apply.',cost:{message:'Estimated ₹25–₹35'}}});});
 await p.route('**/api/jobs/restarted-'+i,route=>route.fulfill({json:{id:'restarted-'+i,brandId:brand.id,status:'queued',placements:[],results:[]}}));
 await p.goto(f.url+'?brand='+brand.id+'#progress/job-'+i);await p.waitForSelector('[data-action=restart-project]');
 await p.locator('[data-action=restart-project]').evaluate(b=>{b.click();b.click();});
 await p.waitForURL(new RegExp('#progress/restarted-'+i+'$'));assert.equal(posts,1);assert.equal(await p.locator('[data-action=confirm-restart]').count(),0);await p.unrouteAll({behavior:'wait'});
 }assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
