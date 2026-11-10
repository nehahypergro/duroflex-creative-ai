'use strict';
const {chooseBriefVariant,readBriefVariant}=require('./helpers/ui-controls.cjs');
const {chooseSelect,settleAutosave,replaceAsset,reveal,setAudience,downloadEditor}=require('./helpers/ui-controls.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'../..');
const brands=[{id:'brand-ui-duroflex',name:'Duroflex',brandUrl:'https://www.duroflexworld.com/'},{id:'brand-ui-sleepyhead',name:'Sleepyhead',brandUrl:'https://mysleepyhead.com/'}];
async function fixture(options={}){
 await fs.mkdir(path.join(root,'work/studio-ui-regression/screens'),{recursive:true});
 const fixtureBrands=options.profiles?await Promise.all(['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'].map(async id=>JSON.parse(await fs.readFile(path.join(process.env.ADMIN_SOURCE_ROOT||root,'output/creative-ai/brands',id,'brand.json'),'utf8')))):brands;
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
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
 return {page,context,browser,requests,errors,brands:fixtureBrands,url:'http://127.0.0.1:'+server.address().port+'/creative-ai/studio.html',close:async()=>{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
// Legacy drafts are seeded as saved fixtures; new projects now use the two-path chooser.
async function openLegacyDraft(p){await p.evaluate(()=>{const d=StudioModel.newDraft(window.activeBrand.id);StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;});await p.waitForSelector('#field-brief');}
async function backToProject(p){const back=p.locator('.flow-topline a');if(await back.isVisible())await back.click();else await p.locator('.breadcrumb a').first().click();}
async function fillControl(p,el,value){await reveal(el);await el.fill(value);}
async function brandOnly(p){await p.locator('[data-action=assignment-product]').click();await p.locator('[data-assignment-focus=brand]').click();}
async function openDownloadOptions(p){if(new URL(p.url()).hash.startsWith('#review/')){await p.evaluate(()=>location.hash=location.hash.replace('#review/','#download/'));await p.locator('.download-options').waitFor();}if(!await p.locator('#downloadFormat').isVisible())await p.locator('.download-options summary').click();}
async function seedDraft(p,{mode='campaign',features=[1],...values}={}){return p.evaluate(({mode,features,values})=>{const d=StudioModel.startDraft(activeBrand.id,mode,features[0]);Object.assign(d,{focus:'brand',brief:'Saved fixture brief',objective:'Awareness',rtbs:'Supplied feature',outputs:features.map(id=>StudioModel.output(id)),...values});StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;return d.id;},{mode,features,values});}
test('PMax and LinkedIn UI: explicit entries retain selected ratios, narrative and grouped route across reload for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){
  await p.goto(f.url+'?brand='+brand.id+'#recipes');await p.getByRole('button',{name:/PMax Image Set/}).click();await p.waitForSelector('#field-brief');
  assert.equal(await p.locator('[data-static-key=platform]').inputValue(),'PMax');assert.equal(await p.locator('[data-prop=formatId]').count(),0);
  await chooseSelect(p,p.locator('[data-static-key=imageRatios]'),'Square + portrait');await p.reload();await p.waitForSelector('#field-brief');assert.equal(await p.locator('[data-static-key=imageRatios]').inputValue(),'Square + portrait');
  let profile=await p.evaluate(()=>{const id=location.hash.split('/')[1],d=StudioModel.storage(localStorage).read(window.activeBrand.id,id);return StudioModel.generationProfile(d);});assert.equal(profile.unitCount,2);assert.deepEqual(profile.placementIds,['custom:studio-pmax-square','custom:studio-pmax-portrait']);
  for(const name of ['Feature','Story']){await p.goto(f.url+'?brand='+brand.id+'#recipes');await p.getByRole('button',{name:new RegExp('LinkedIn '+name+' Carousel')}).click();await p.waitForSelector('#field-brief');assert.equal(await p.locator('[data-static-key=platform]').inputValue(),'LinkedIn');assert.equal(await p.evaluate(()=>StudioModel.storage(localStorage).read(window.activeBrand.id,location.hash.split('/')[1]).outputs[0].staticValues.narrativeType),name);profile=await p.evaluate(()=>{const d=StudioModel.storage(localStorage).read(window.activeBrand.id,location.hash.split('/')[1]);return StudioModel.generationProfile(d);});assert.match(profile.placementId,/linkedin-carousel/);}
  await p.goto(f.url+'?brand='+brand.id+'#recipes');await p.getByRole('button',{name:/Homepage Category Tile/}).click();await p.waitForSelector('#field-brief');assert.equal(await p.locator('[data-prop=formatId]').inputValue(),'custom');assert.equal(await p.locator('[data-static-key=websiteType]').inputValue(),'Category tile');
  profile=await p.evaluate(()=>{const d=StudioModel.storage(localStorage).read(window.activeBrand.id,location.hash.split('/')[1]);return StudioModel.generationProfile(d);});assert.match(profile.placementId,/client-website-tile-1080x1080$/);
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Landscape feed: UI selector, reload, submission and download stay on the selected canvas for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [index,brand]of brands.entries()){
  const sharp=require('sharp'),image=await sharp({create:{width:1200,height:628,channels:3,background:'#abc'}}).png().toBuffer();
  await p.route('**/api/jobs/job-'+index,async route=>{const response=await route.fetch(),job=await response.json();job.placements=[{id:'custom_studio-social-landscape',name:'Landscape feed post',dimensions:{width:1200,height:628}}];job.results=job.results.map(r=>({...r,placementId:'custom_studio-social-landscape'}));await route.fulfill({json:job});});
  await p.route('**/jobs/job-'+index+'/files/**',route=>route.fulfill({contentType:'image/png',body:image}));
  await p.route('**/api/studio/preflight',async route=>{const {draft}=route.request().postDataJSON();assert.equal(draft.brandId,brand.id);assert.equal(draft.outputs[0].formatId,'feed-landscape');assert.equal(draft.outputs[0].height,628);await route.fulfill({json:{token:'a'.repeat(64),checks:[],cost:{message:'Fixture estimate in INR'}}});});
  await p.route('**/api/studio/generate',async route=>{const {draft}=route.request().postDataJSON();assert.equal(draft.outputs[0].formatId,'feed-landscape');assert.equal(draft.brandId,brand.id);await route.fulfill({status:202,json:{id:'job-'+index}});});
  await p.goto(f.url+'?brand='+brand.id);await p.waitForSelector('.creation-hero');
  await p.evaluate(brandId=>{const d=StudioModel.startDraft(brandId,'quick',1);Object.assign(d,{brief:'Launch the saved product',productId:'product-fixture',variant:'grey'});StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},brand.id);
  await chooseSelect(p,p.locator('[data-prop=formatId]'),'feed-landscape');await p.reload();await p.waitForSelector('[data-prop=formatId]');assert.equal(await p.locator('[data-prop=formatId]').inputValue(),'feed-landscape');
  await p.locator('#newRtb').fill('Supplied feature');await p.locator('[data-action=rtb-add]').click();await p.locator('[data-action=assignment-review]').click();await p.waitForFunction(()=>document.querySelector('[data-assignment-confirm]')?.disabled===false);await p.locator('[data-assignment-confirm]').click();await p.waitForURL(url=>url.hash==='#project/job-'+index);
  await p.goto(f.url+'?brand='+brand.id+'#project/job-'+index);await p.locator('[data-action=open-output]').first().click();await p.waitForSelector('.option-card');await p.goto(f.url+'?brand='+brand.id+'#download/job-'+index+'/0/0');await openDownloadOptions(p);await chooseSelect(p,p.locator('#downloadFormat'),'png');const download=p.waitForEvent('download');await p.locator('[data-action=download-file], [data-action=download]').first().click();const meta=await sharp(await (await download).path()).metadata();assert.deepEqual([meta.width,meta.height],[1200,628]);
  await p.unrouteAll({behavior:'wait'});
 }
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('UI browser: both-brand brief journeys, all features, saved reviews, version plans and no paid calls',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){
   await p.goto(f.url+'?brand='+brand.id);await p.locator('.continue-card').waitFor();assert.equal(await p.locator('#brandSwitch [aria-pressed=true]').getAttribute('aria-label'),brand.name);
   await p.locator('[data-nav=library]').click();await p.getByRole('tab',{name:'Products',exact:true}).click();await p.locator('.product-tile').waitFor();assert.equal(await p.locator('.product-tile img').count(),1);await p.locator('[data-nav=home]').click();
   await openLegacyDraft(p);await p.locator('#field-brief').fill('Celebrate together <not markup> & keep the brief intact.');await p.locator('[data-action=assignment-product]').click();await p.locator('[data-assignment-focus=brand]').click();
   await p.locator('[data-action=add-output]').first().click();await p.locator('[data-action=legacy-assets]').click();assert.ok(await p.locator('.feature-option').count()>=40);await p.locator('#featureSearch').fill('Instagram story');await replaceAsset(p,'[data-action=choose-feature][data-id="8"]');
   await chooseSelect(p,p.locator('[data-prop=formatId]'),'custom');await p.locator('[data-prop=width]').fill('0');await p.locator('[data-action=assignment-review]').click();assert.match(await p.locator('#briefForm').innerText(),/whole-pixel/);
   await p.locator('[data-prop=width]').fill('1080');await p.locator('[data-prop=height]').fill('1920');await settleAutosave(p);const draftHash=await p.evaluate(()=>location.hash);await p.reload();await p.locator('#field-brief').waitFor();assert.equal(await p.locator('#field-brief').inputValue(),'Celebrate together <not markup> & keep the brief intact.');assert.equal(await p.evaluate(()=>location.hash),draftHash);assert.equal(await p.locator('[data-prop=height]').inputValue(),'1920');
   const n=brands.indexOf(brand);await p.goto(f.url+'?brand='+brand.id+'#review/job-'+n+'/0/0');await p.locator('.option-card').first().waitFor();assert.equal(await p.locator('.option-card').count(),2);await p.locator('[data-action=select-option]').click();assert.equal(await p.locator('.option-card.selected').count(),1);assert.match(await p.locator('.option-card.selected').innerText(),/Saved image|Review before sharing/);assert.equal(await p.locator('#feedbackText').count(),0);
   await p.goto(f.url+'?brand='+brand.id+'#versions/job-'+n+'/0/0');await p.locator('input[value=story]').check();await p.locator('[data-action=save-versions]').click();await p.locator('.deliverable-row').first().waitFor();assert.match(await p.locator('.notice').innerText(),/not available for generation yet/);
 }
 assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('UI browser: unavailable project stays visible and recovers; brand toggle remains scoped',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;let fail=true;await p.route('**/api/jobs/job-0',route=>fail?route.fulfill({status:503,contentType:'application/json',body:'{}'}):route.continue());
 await p.goto(f.url+'#project/job-0');await p.locator('[data-action=refresh-preview]').waitFor();assert.match(await p.locator('#main').innerText(),/project|work/i);
 fail=false;await p.locator('[data-action=refresh-preview]').click();await p.waitForSelector('.deliverable-row');assert.equal(await p.locator('#brandSwitch [aria-pressed=true]').getAttribute('aria-label'),'Duroflex');
 await p.locator('#brandSwitch [data-brand="brand-ui-sleepyhead"]').click();await p.waitForSelector('.project-row');assert.match(await p.locator('.project-row').innerText(),/Sleepyhead campaign/);assert.doesNotMatch(await p.locator('#main').innerText(),/Duroflex campaign/);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('UI browser: failed save recovery, inline recovery and screen focus, mobile reachability, writing and scene editing',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url);await p.waitForSelector('.continue-card');const draftId=await seedDraft(p,{features:[34,24],brief:'A helpful email and short film'});await p.evaluate(id=>location.hash='project/'+id,draftId);await p.locator('[data-action=open-output]').first().click();await p.locator('[data-writing=subject]').fill('Your next chapter');await p.locator('[data-writing=body]').fill('Test content & <literal> text.');await p.reload();await p.waitForSelector('[data-writing=body]');assert.equal(await p.locator('[data-writing=body]').inputValue(),'Test content & <literal> text.');
 await p.evaluate(()=>{window.qaSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Storage full');};});await p.locator('[data-writing=body]').fill('Keep my unsaved copy');await p.locator('[data-nav=home]').click();await p.waitForSelector('#taskPanel:not([hidden])',{timeout:2000});assert.match(await p.locator('#taskPanel').innerText(),/changes need saving/);await p.locator('[data-action=close-task]').last().click();assert.equal(await p.locator('[data-writing=body]').inputValue(),'Keep my unsaved copy');await p.evaluate(()=>Storage.prototype.setItem=window.qaSetItem);await p.locator('[data-writing=body]').fill('Recovered text');
 await backToProject(p);await p.locator('[data-action=open-output]').nth(1).click();await p.locator('[data-scene="0"][data-prop=duration]').fill('8');assert.match(await p.locator('.timeline span').first().innerText(),/8s/);await p.locator('[data-scene="0"][data-prop=title]').fill('A bright opening');await p.locator('[data-action=add-scene]').click();assert.equal(await p.locator('.scene').count(),4);await p.reload();await p.waitForSelector('.scene');assert.equal(await p.locator('[data-scene="0"][data-prop=title]').inputValue(),'A bright opening');
 await p.setViewportSize({width:390,height:844});await p.locator('[data-nav=home]').click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await openLegacyDraft(p);await p.locator('#field-brief').fill('Mobile draft');await p.locator('[data-action=add-output]').first().click();await p.locator('[data-action=legacy-assets]').click();await p.keyboard.press('Escape');assert.equal(await p.locator('#taskPanel').evaluate(el=>!el.hidden),false);
 await p.evaluate(()=>{window.qaSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Storage full');};});await p.locator('#field-brief').fill('Unsaved work must remain');await settleAutosave(p);assert.match(await p.locator('#briefSummary').innerText(),/browser could not save/);await p.locator('[data-nav=home]').click();await p.waitForSelector('#taskPanel:not([hidden])');assert.match(await p.locator('#taskPanel').innerText(),/changes need saving/);await p.locator('[data-action=close-task]').last().click();assert.equal(await p.locator('#field-brief').inputValue(),'Unsaved work must remain');
 await p.evaluate(()=>Storage.prototype.setItem=window.qaSetItem);await p.locator('[data-action=save]').first().click();assert.equal(await p.locator('#saveRecovery .field-error').count(),0);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('UI browser: delayed usage cannot replace a newer screen; edit and export use saved artwork',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;let release;const pending=new Promise(resolve=>{release=resolve;});
 await p.route('**/api/costs',async route=>{await pending;await route.fulfill({contentType:'application/json',body:JSON.stringify({entries:[]})});});
 await p.goto(f.url);await p.waitForSelector('.continue-card');await p.locator('#accountTrigger').click();await p.locator('.usage-link').click();await p.waitForSelector('.loading-state');await p.locator('[data-nav=home]').click();await p.waitForSelector('.continue-card');release();await p.waitForResponse(r=>r.url().endsWith('/api/costs'));await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.match(await p.locator('#brandSwitch [aria-pressed=true]').getAttribute('aria-label'),/Duroflex/);
 await p.locator('.continue-card a').first().click();await p.waitForSelector('.option-card');await p.locator('[data-action=edit-image]').first().click();await p.waitForSelector('#editableDialog[open] #ecPreparingClose');assert.match(await p.locator('#editableDialog').innerText(),/campaign/);assert.equal(await p.evaluate(()=>window.currentJob.brandId),'brand-ui-duroflex');await p.locator('#ecPreparingClose').click();
 await openDownloadOptions(p);await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await openDownloadOptions(p);await chooseSelect(p,p.locator('#downloadFormat'),'jpeg');const downloaded=p.waitForEvent('download');await p.locator('[data-action=download-file], [data-action=download]').first().click();const file=await downloaded,meta=await require('sharp')(await file.path()).metadata();assert.equal(meta.width,1080);assert.equal(meta.height,1080);assert.equal(meta.format,'jpeg');
 const before=await p.evaluate(()=>location.hash);await p.locator('.skip-link').focus();await p.locator('.skip-link').click();assert.equal(await p.evaluate(()=>location.hash),before);assert.equal(await p.evaluate(()=>document.activeElement.id),'main');assert.deepEqual(f.errors,[]);assert.ok(f.requests.filter(r=>r.method!=='GET').every(r=>r.method==='POST'&&r.url.endsWith('/scan')),'Only local editor preparation may start; no generation calls');
 }finally{await f.close();}
});

test('Creative AI home: format handoff, persisted sidebar and scoped search',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;for(const brand of brands){await p.goto(f.url+'?brand='+brand.id);await p.locator('.creation-hero').waitFor();assert.equal(await p.title(),'Home — '+brand.name+' · Creative AI');assert.deepEqual(await p.locator('.home-page > section').evaluateAll(es=>es.map(e=>e.className)),['creation-hero','home-panel','home-panel continue-panel']);assert.equal(await p.locator('#homePrompt').count(),0);assert.equal(await p.locator('.format-tile').count(),6);
 await p.locator('[data-action=asset-card-start][data-card=instagram-story]').click();await p.locator('#field-brief').fill('A new chapter — नमस्ते <home> & together');await setAudience(p,'audience','First-time homeowners');await chooseSelect(p,p.locator('#field-productId'),'product-fixture');assert.equal(await readBriefVariant(p),'grey');await chooseBriefVariant(p,'grey');await settleAutosave(p);await p.reload();await p.locator('#field-brief').waitFor();assert.equal(await p.locator('#field-audience').inputValue(),'First-time homeowners');assert.equal(await p.locator('[data-prop=formatId]').inputValue(),'story');
 await p.locator('[data-nav=home]').click();await p.locator('[data-action=workspace-search]').click();await p.locator('#workspaceSearch').fill('campaign');assert.match(await p.locator('#workspaceResults').innerText(),new RegExp(brand.name));assert.doesNotMatch(await p.locator('#workspaceResults').innerText(),new RegExp(brands.find(b=>b.id!==brand.id).name));await p.locator('[data-search-link]').first().click();await p.locator('.deliverable-row').first().waitFor();}
 await p.locator('[data-nav=home]').click();await p.locator('#sidebarToggle').click();assert.equal(await p.locator('#sidebarToggle').getAttribute('aria-expanded'),'false');await p.reload();await p.locator('.creation-hero').waitFor();assert.ok(await p.locator('body').evaluate(e=>e.classList.contains('sidebar-collapsed')));await p.locator('#sidebarToggle').click();await p.setViewportSize({width:390,height:844});await p.locator('#sidebarToggle').click();assert.ok(await p.locator('body').evaluate(e=>e.classList.contains('sidebar-mobile-open')));await p.locator('[data-nav=projects]').click();assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('sidebar-mobile-open')),false);assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Journey previews: all states render for both brands without mutations; preview drafts stay scoped',{timeout:120000},async()=>{
 const f=await fixture();try{const p=f.page,M=require('../../public/creative-ai/studio-model');
 for(const brand of brands){await p.goto(f.url+'?brand='+brand.id+'#journeys');await p.waitForSelector('.scenario-link');assert.equal(await p.locator('.scenario-link').count(),M.journeys.length);
 const storage=await p.evaluate(()=>JSON.stringify(localStorage));
 for(const j of M.journeys){await p.evaluate(id=>location.hash='walkthrough/'+id,j.id);await p.waitForFunction(id=>document.querySelector('#scenarioSelect')?.value===id,j.id);assert.equal(await p.locator('.preview-story strong').innerText(),j.title);assert.ok(await p.locator('.journey-example').innerText());}
 assert.equal(await p.evaluate(()=>JSON.stringify(localStorage)),storage,'Visiting examples does not write storage');
 }
 await p.evaluate(()=>location.hash='walkthrough/brief');await p.waitForSelector('#field-brief');await p.locator('#field-brief').fill('Sleepyhead preview only');
 await p.locator('[data-brand=brand-ui-duroflex]').click();await p.waitForSelector('.project-gallery');await p.evaluate(()=>location.hash='walkthrough/brief');await p.waitForSelector('#field-brief');assert.notEqual(await p.locator('#field-brief').inputValue(),'Sleepyhead preview only');
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Review details hydrate current option after fast navigation and notes remain version scoped',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;let release;const pending=new Promise(r=>release=r);
 await p.route('**/api/jobs/job-0/details',async route=>{await pending;await route.fulfill({contentType:'application/json',body:JSON.stringify({units:['continuity','exploration'].map((route,i)=>({route,placementId:'square',plannedArt:{composition:'Logo sits in the top corner with a clear margin.'},review:{qualityScores:[{criterion:'communication',score:i?80:90,usedInScore:true,evidence:{method:'vision',observation:route+' observed clarity'}}]}}))})});});
 await p.goto(f.url+'#review/job-0/0/0');release();await p.waitForSelector('.option-thumbnail');await p.locator('[data-action=focus-option][data-index="1"]').click();await p.waitForSelector('[data-action=focus-option][data-index="1"][aria-pressed=true]');assert.equal(await p.locator('#feedbackText').count(),0);release();assert.equal(await p.locator('.score-number,#rationalePanel').count(),0);assert.match(await p.locator('.focused-art img').getAttribute('src'),/exploration/);
 await p.locator('[data-action=focus-option][data-index="0"]').click();await p.waitForSelector('[data-action=focus-option][data-index="0"][aria-pressed=true]');assert.equal(await p.locator('.score-number').count(),0);await p.locator('[data-action=focus-option][data-index="1"]').click();await p.waitForSelector('[data-action=focus-option][data-index="1"][aria-pressed=true]');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Image walkthrough: brief through download, recoveries and desktop widths',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#journeys');await p.waitForSelector('.scenario-link');const storage=await p.evaluate(()=>JSON.stringify(localStorage));await p.locator('[data-action=demo-start]').click();await p.waitForSelector('#field-brief');
 await p.locator('[data-action=demo-next]').click();await p.waitForFunction(()=>document.querySelector('#scenarioSelect')?.value==='brief-summary');await p.locator('[data-action=demo-next]').click();await p.waitForSelector('.progress-main');await p.locator('[data-action=demo-next]').click();await p.waitForFunction(()=>document.querySelector('#scenarioSelect')?.value==='creating');await p.locator('[data-action=check-progress]').click();await p.waitForSelector('.focus-review');assert.equal(await p.locator('.sample-rationale').count(),0);assert.equal(await p.locator('[data-action=versions]').count(),0);
 await p.locator('[data-action=edit-image]').click();await p.waitForSelector('#demoEditableText');await p.locator('#demoEditableText').fill('A simple edit');await p.locator('[data-action=demo-next]').click();await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await openDownloadOptions(p);await p.locator('[data-action=download-file], [data-action=download]').first().click();await p.waitForFunction(()=>document.querySelector('#scenarioSelect')?.value==='download-complete');assert.match(await p.locator('h1').innerText(),/download is ready/);assert.equal(await p.evaluate(()=>JSON.stringify(localStorage)),storage);
 for(const width of [1280,1920]){await p.setViewportSize({width,height:1080});for(const id of ['brief','review','editor','download-failed']){await p.evaluate(id=>location.hash='walkthrough/'+id,id);await p.waitForFunction(id=>document.querySelector('#scenarioSelect')?.value===id,id);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+' '+id);}}
 await p.locator('[data-action=demo-recover]').click();await p.waitForFunction(()=>document.querySelector('#scenarioSelect')?.value==='download');assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Image export failure retains chosen format and supports retry without generation',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;let fail=true;await p.route('**/files/static-continuity.png*',route=>route.request().resourceType()==='fetch'&&fail?route.fulfill({status:503,body:'Unavailable'}):route.continue());await p.goto(f.url+'#download/job-0/0/0');await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await openDownloadOptions(p);await chooseSelect(p,p.locator('#downloadFormat'),'png');await p.locator('[data-action=download-file], [data-action=download]').first().click();await p.waitForFunction(()=>document.querySelector('#downloadStatus')?.textContent.includes('Retry'));assert.equal(await p.locator('#downloadFormat').inputValue(),'png');assert.equal(await p.locator('[data-action=download-file]').isEnabled(),true);fail=false;const d=p.waitForEvent('download');await p.locator('[data-action=download-file], [data-action=download]').first().click();await d;assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Organisation browser: each brand can rename, tag, save, favourite, duplicate and restore a project',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){await p.goto(f.url+'?brand='+brand.id+'#projects');await p.waitForSelector('.project-row');await p.locator('.project-row [data-action=org-menu]').click();await p.locator('[data-action=org-rename]').click();await p.locator('#orgName').fill(brand.name+' Festive <A&B>');await p.locator('[data-action=org-apply-name]').click();assert.match(await p.locator('.project-name').innerText(),/Festive <A&B>/);
 await p.locator('.project-row [data-action=org-menu]').click();await p.locator('[data-action=org-organise]').click();await p.locator('#orgCampaign').fill('Diwali 2026');await p.locator('#orgTags').fill('sofa, launch, नमस्ते');await p.locator('[data-action=org-apply-tags]').click();await p.locator('#projectSearch').fill('diwali नमस्ते');assert.equal(await p.locator('.project-row').count(),1);await p.locator('#projectSearch').fill('');
 await p.locator('.project-row [data-action=org-favourite]').click();await p.locator('[data-nav=favourites]').click();await p.waitForSelector('.saved-card');assert.match(await p.locator('.saved-card h2').innerText(),new RegExp(brand.name));await p.reload();await p.waitForSelector('.saved-card');await p.locator('[data-nav=projects]').click();await p.locator('.project-row [data-action=org-menu]').click();await p.locator('[data-action=org-duplicate]').click();await p.waitForSelector('.deliverable-row');assert.match(await p.locator('h1').innerText(),/ · try 2$/);assert.match(await p.locator('.notice').innerText(),/original is unchanged/);
 await p.locator('[data-nav=projects]').click();await p.waitForSelector('.project-row');assert.equal(await p.locator('.project-row').count(),2);const original=p.locator('.project-row').filter({hasText:brand.name+' Festive <A&B>'}).filter({hasNotText:'· try 2'});await original.locator('[data-action=org-menu]').click();await p.locator('[data-action=org-trash]').click();await p.locator('[data-action=org-confirm-trash]').click();await p.waitForFunction(()=>document.querySelectorAll('.project-row').length===1);await p.locator('#accountTrigger').click();await p.locator('#accountMenu a[href="#settings/profile"]').click();await p.locator('.settings-nav a[href="#settings/trash"]').click();await p.waitForSelector('.saved-card');assert.match(await p.locator('.saved-card h2').innerText(),/Festive/);await p.reload();await p.waitForSelector('[data-action=org-restore]');await p.locator('[data-action=org-restore]').click();assert.match(await p.locator('#main').innerText(),/Trash is empty/);await p.locator('[data-nav=projects]').click();await p.waitForSelector('.project-row');assert.equal(await p.locator('.project-row').count(),2);
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Organisation browser: creative favourite, trash and copy preserve original option identity',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#review/job-0/0/1');await p.waitForSelector('.artwork-toolbar');await p.locator('.artwork-toolbar [data-action=org-favourite]').click();await p.locator('[data-nav=favourites]').click();await p.waitForSelector('.saved-card');assert.equal(await p.locator('.saved-card').count(),1);assert.match(await p.locator('.saved-card .status').innerText(),/Saved image|Review before sharing/);await p.locator('.saved-card h2 a').click();await p.waitForSelector('.artwork-toolbar');assert.match(await p.locator('.focused-art img').getAttribute('src'),/exploration/);
 await p.locator('.artwork-toolbar [data-action=org-menu]').click();assert.equal(await p.locator('[data-action=org-rename]').count(),0);await p.locator('[data-action=org-duplicate]').click();await p.waitForSelector('.deliverable-row');await p.locator('[data-action=open-output]').click();await p.waitForSelector('.focused-art');assert.equal(await p.locator('.option-thumbnail').count(),0);assert.match(await p.locator('.focused-art img').getAttribute('src'),/exploration/);
 await p.evaluate(()=>location.hash='review/job-0/0/1');await p.waitForSelector('[data-action=focus-option][data-index="1"][aria-pressed=true]');await p.locator('.artwork-toolbar [data-action=org-menu]').click();await p.locator('[data-action=org-trash]').click();await p.locator('[data-action=org-confirm-trash]').click();await p.waitForSelector('.deliverable-row');await p.locator('[data-action=open-output]').click();await p.waitForSelector('.focused-art');assert.equal(await p.locator('.option-thumbnail').count(),1);assert.match(await p.locator('.focused-art img').getAttribute('src'),/continuity/);await p.locator('#accountTrigger').click();await p.locator('#accountMenu a[href="#settings/profile"]').click();await p.locator('.settings-nav a[href="#settings/trash"]').click();await p.waitForSelector('[data-action=org-restore]');assert.match(await p.locator('.saved-card h2').innerText(),/Option B/);await p.locator('[data-action=org-restore]').click();await p.locator('[data-nav=favourites]').click();await p.waitForSelector('.saved-card');assert.equal(await p.locator('.saved-card').count(),1);assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Organisation browser: filename, SKU, brand and status search; failed saves keep inputs',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#projects');await p.waitForSelector('.project-row');await p.locator('[data-action=workspace-search]').click();for(const [query,expected] of [['SOFA-42','A saved product'],['launch_reference_2026.png','Brand poster'],['static-exploration.png','Option B'],['duroflex','Project · Duroflex']]){await p.locator('#workspaceSearch').fill(query);assert.match(await p.locator('#workspaceResults').innerText(),new RegExp(expected));}await p.locator('#workspaceSearch').fill('Sleepyhead');assert.match(await p.locator('#workspaceResults').innerText(),/No matches in this brand/);await p.keyboard.press('Escape');await p.locator('#projectSearch').fill('review');assert.equal(await p.locator('.project-row').count(),1);
 await p.locator('.project-row [data-action=org-menu]').click();await p.locator('[data-action=org-rename]').click();await p.locator('#orgName').fill('Keep this name');await p.evaluate(()=>{window.oldSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Storage full');};});await p.locator('[data-action=org-apply-name]').click();assert.equal(await p.locator('#orgName').inputValue(),'Keep this name');assert.match(await p.locator('#orgFormError').innerText(),/browser could not save/);assert.notEqual(await p.locator('.project-name').innerText(),'Keep this name');await p.evaluate(()=>Storage.prototype.setItem=window.oldSetItem);await p.locator('[data-action=org-apply-name]').click();assert.equal(await p.locator('.project-name').innerText(),'Keep this name');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Organisation browser: unsaved notes survive bookmarks; stale writes and corrupt metadata recover safely',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#review/job-0/0/0');await p.locator('.focused-art img').waitFor();const selectedSrc=await p.locator('.focused-art img').getAttribute('src');await p.locator('.artwork-toolbar [data-action=org-favourite]').click();assert.equal(await p.locator('.focused-art img').getAttribute('src'),selectedSrc);await p.goto(f.url+'#project/job-0');await p.locator('[data-action=org-menu]').click();await p.locator('[data-action=org-rename]').click();await p.locator('#orgName').fill('Pending name');await p.evaluate(()=>{const key='studio-organise-v1:brand-ui-duroflex',v=JSON.parse(localStorage.getItem(key));v.revision++;localStorage.setItem(key,JSON.stringify(v));});await p.locator('[data-action=org-apply-name]').click();assert.match(await p.locator('#orgFormError').innerText(),/another tab/);assert.equal(await p.locator('#orgName').inputValue(),'Pending name');await p.locator('[data-action=org-reload]').click();await p.waitForSelector('.project-workspace');await p.goto(f.url+'#project/job-0');await p.locator('[data-action=org-menu]').click();await p.locator('[data-action=org-rename]').click();assert.notEqual(await p.locator('#orgName').inputValue(),'Pending name');await p.keyboard.press('Escape');
 await p.evaluate(()=>localStorage.setItem('studio-organise-v1:brand-ui-duroflex','broken-json'));await p.reload();await p.waitForSelector('[data-action=org-reload]');assert.match(await p.locator('#main').innerText(),/could not be read/);await p.locator('[data-action=org-favourite]').click();assert.equal(await p.evaluate(()=>localStorage.getItem('studio-organise-v1:brand-ui-duroflex')),'broken-json');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('Organisation browser: draft duplicate/rename and parent trash restore preserve independently trashed creatives',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#projects');await p.waitForSelector('.project-row');await seedDraft(p,{name:'Draft to duplicate',manualName:true,brief:'Draft to duplicate'});await p.locator('#field-brief').waitFor();await settleAutosave(p);await p.locator('[data-nav=projects]').click();let row=p.locator('.project-row').filter({hasText:'Draft to duplicate'});await row.locator('[data-action=org-menu]').click();await p.locator('[data-action=org-rename]').click();await p.locator('#orgName').fill('Renamed draft');await p.locator('[data-action=org-apply-name]').click();row=p.locator('.project-row').filter({hasText:'Renamed draft'});await row.locator('[data-action=org-menu]').click();await p.locator('[data-action=org-duplicate]').click();await p.waitForFunction(()=>document.querySelector('h1')?.textContent==='Renamed draft · try 2');await p.locator('[data-action=edit-brief]').click();await p.waitForSelector('#field-brief');assert.equal(await p.locator('#field-brief').inputValue(),'Draft to duplicate');assert.match(await p.evaluate(()=>StudioModel.storage(localStorage).read(activeBrand.id,location.hash.split('/')[1]).name),/Renamed draft/);
 await p.evaluate(()=>location.hash='review/job-0/0/1');await p.waitForSelector('.artwork-toolbar');await p.locator('.artwork-toolbar [data-action=org-menu]').click();await p.locator('[data-action=org-trash]').click();await p.locator('[data-action=org-confirm-trash]').click();await p.waitForSelector('.deliverable-row');await p.locator('[data-nav=projects]').click();await p.locator('.project-row').filter({has:p.locator('.project-name[href="#project/job-0"]')}).locator('[data-action=org-menu]').click();await p.locator('[data-action=org-trash]').click();await p.locator('[data-action=org-confirm-trash]').click();await p.locator('#accountTrigger').click();await p.locator('#accountMenu a[href="#settings/profile"]').click();await p.locator('.settings-nav a[href="#settings/trash"]').click();await p.waitForSelector('.saved-card');assert.equal(await p.locator('.saved-card').count(),2);await p.locator('[data-action=org-restore][data-org-key="project:job-0"]').click();assert.equal(await p.locator('.saved-card').count(),1);await p.locator('[data-nav=projects]').click();await p.locator('.project-name[href="#project/job-0"]').click();await p.locator('[data-action=open-output]').click();await p.waitForSelector('.focused-art img');assert.equal(await p.locator('.option-thumbnail').count(),1);assert.match(await p.locator('.focused-art img').getAttribute('src'),/continuity/);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Organisation browser: checked projects filter correctly and a trashed creative is absent from active search',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.route('**/api/jobs/job-0',async route=>{const response=await route.fetch(),data=await response.json();data.results=data.results.map(r=>({...r,ready:true,qualityVerified:true}));await route.fulfill({json:data});});await p.goto(f.url+'#projects');await p.waitForSelector('.project-row');assert.equal(await p.locator('[data-filter=attention]').count(),0);await p.locator('[data-filter=ready]').click();assert.equal(await p.locator('.project-row').count(),1);await p.evaluate(()=>location.hash='review/job-0/0/1');await p.waitForSelector('.artwork-toolbar');await p.locator('.artwork-toolbar [data-action=org-menu]').click();await p.locator('[data-action=org-trash]').click();await p.locator('[data-action=org-confirm-trash]').click();await p.locator('[data-action=workspace-search]').click();await p.locator('#workspaceSearch').fill('static-exploration.png');assert.match(await p.locator('#workspaceResults').innerText(),/No matches/);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Campaign journeys: asset selection saves all requested formats without old planning gates',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;for(const brand of brands){await p.goto(f.url+'?brand='+brand.id);await p.locator('[data-action=asset-picker][data-mode=campaign]').click();await require('./helpers/ui-controls.cjs').pickFormats(p,['website-banner','instagram-carousel']);await p.locator('#field-brief').fill('Social, carousel and website campaign');await brandOnly(p);await p.locator('#newRtb').fill('Supplied campaign feature');await p.locator('[data-action=rtb-add]').click();await p.locator('[data-action=add-output]').first().click();await p.locator('[data-action=legacy-assets]').click();
 for(const id of [1])await p.locator('[data-action=choose-feature][data-id="'+id+'"]').first().click();/* website + carousel were picked first (8 Nov 2026: no skip) */await p.locator('[data-action=save-asset-selection]').click();await settleAutosave(p);
 const d=await p.evaluate(()=>StudioModel.storage(localStorage).read(activeBrand.id,location.hash.split('/')[1]));assert.deepEqual(d.outputs.map(o=>o.featureId).sort((a,b)=>a-b),[1,7,9]);assert.equal(await p.locator('.creation-steps,.journey-steps').count(),0);await p.reload();await p.locator('#field-brief').waitFor();assert.equal(await p.locator('.output-row').count(),3);assert.equal(await p.locator('[data-plan-field],[data-plan-prop=conceptId]').count(),0);
 await p.goto(f.url+'?brand='+brand.id+'#project/job-'+brands.indexOf(brand));await p.locator('[data-action=open-output]').click();await p.locator('.focused-art img').waitFor();assert.equal(await p.locator('.option-card').count(),2);assert.equal(await p.locator('[data-action=edit-image]').count(),1);}
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);}finally{await f.close();}
});

test('Quick Create: recipe and exact variant survive asset replacement and reload',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#recipes');await p.locator('[data-action=quick-recipe][data-id="10"][data-image-platform="Retail:store"]').click();await p.locator('#field-brief').fill('A store post');await chooseSelect(p,p.locator('#field-productId'),'product-fixture');assert.equal(await readBriefVariant(p),'grey');await chooseBriefVariant(p,'grey');await p.locator('[data-action=add-output]').first().click();await p.locator('[data-action=legacy-assets]').click();assert.ok(await p.locator('.feature-option').count()>=40);await replaceAsset(p,'[data-action=choose-feature][data-id="8"]');await settleAutosave(p);await p.reload();await p.locator('#field-brief').waitFor();assert.equal(await p.locator('.output-row').count(),1);assert.equal(await readBriefVariant(p),'grey');assert.equal(await p.locator('[data-prop=formatId]').inputValue(),'story');assert.equal(await p.locator('.creation-steps,.journey-steps,[data-action=generation-submit]').count(),0);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);assert.deepEqual(f.errors,[]);}finally{await f.close();}
});

test('Campaign recovery: autosave preserves unsaved inputs and blocks stale tabs',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url);await p.locator('.creation-hero').waitFor();const id=await seedDraft(p);await p.locator('#field-brief').waitFor();await p.evaluate(()=>{window.saveOriginal=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Storage full');};});await p.locator('#field-brief').fill('Keep this unsaved brief');await settleAutosave(p);assert.equal(await p.locator('#field-brief').inputValue(),'Keep this unsaved brief');assert.match(await p.locator('#briefSummary').innerText(),/browser could not save/);await p.evaluate(()=>Storage.prototype.setItem=window.saveOriginal);await p.locator('[data-action=save]').click();
 await p.evaluate(id=>{const key='studio-ui-v1:'+activeBrand.id+':'+id,d=JSON.parse(localStorage.getItem(key));d.revision++;d.name='Newer external draft';localStorage.setItem(key,JSON.stringify(d));},id);await p.locator('#field-brief').fill('Unsaved local name');await settleAutosave(p);assert.match(await p.locator('#briefSummary').innerText(),/another tab/);assert.equal(await p.locator('#field-brief').inputValue(),'Unsaved local name');assert.deepEqual(f.errors,[]);}finally{await f.close();}
});

test('Static regression: download returns to exact option and missing artwork has a recovery route',{timeout:30000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#review/job-0/0/1');await openDownloadOptions(p);await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await openDownloadOptions(p);assert.match(p.url(),/#download\/job-0\/0\/1$/);
 await p.goto(f.url+'#download/job-0/99/0');await p.waitForSelector('h2');assert.ok(await p.locator('#main a[href="#project/job-0"]').count(),'Missing-image state has a route back to project');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('Static regression: renamed campaign asset stays named in its preview',{timeout:30000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url);await p.waitForSelector('.creation-hero');const id=await p.evaluate(()=>{const d=StudioModel.startDraft(activeBrand.id,'campaign');d.name='Asset names';d.brief='A new launch';d.focus='brand';const o=StudioModel.output(7);o.name='Diwali homepage hero';d.outputs=[o];StudioModel.storage(localStorage).save(d);return d.id;});await p.goto(f.url+'#review/'+id+'/0');await p.waitForSelector('h1');assert.match(await p.locator('#main').innerText(),/Diwali homepage hero/);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Static matrix: 15 recipes retain scoped inputs across both brands and both creation modes',{timeout:240000},async()=>{
 const M=require('../../public/creative-ai/studio-model'),f=await fixture(),coverage=[];try{const p=f.page;for(const brand of brands)for(const mode of ['quick','campaign'])for(const feature of M.features.filter(f=>f.kind==='image')){
 await p.goto(f.url+'?brand='+brand.id);await p.locator('.creation-hero').waitFor();const id=await seedDraft(p,{mode,features:[feature.id]});await p.locator('#field-brief').fill('एक नया विचार · <A&B> — '+feature.name);await chooseSelect(p,p.locator('#field-language'),feature.id%2?'Hindi':'English');await settleAutosave(p);const before=await p.evaluate(id=>StudioModel.storage(localStorage).read(activeBrand.id,id),id);await p.reload();await p.locator('#field-brief').waitFor();assert.equal(await p.locator('#field-brief').inputValue(),before.brief);assert.equal(await p.locator('#field-language').inputValue(),before.language);assert.equal(await p.locator('.output-row').count(),1);const after=await p.evaluate(id=>StudioModel.storage(localStorage).read(activeBrand.id,id),id);assert.equal(after.brandId,brand.id);assert.deepEqual(after.outputs,before.outputs);assert.equal(after.outputs[0].featureId,feature.id);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));coverage.push({brand:brand.name,mode,featureId:feature.id,passed:true});}
 assert.equal(coverage.length,60);assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);await fs.writeFile(path.join(root,'work/studio-ui-regression/matrix.json'),JSON.stringify(coverage,null,2));}finally{await f.close();}
});

test('Static edges: independent supplied offers, custom size and retired recipes remain recoverable',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url);await p.locator('.creation-hero').waitFor();const id=await seedDraft(p,{features:[3,3],focus:'collection',productIds:['product-fixture'],collectionVariants:{'product-fixture':'grey'}});await p.locator('#field-brief').fill('Two independent offers');await fillControl(p,p.locator('[data-static-key=offer]').first(),'Offer A');await fillControl(p,p.locator('[data-static-key=offer]').last(),'Offer B');await chooseSelect(p,p.locator('[data-prop=formatId]').last(),'story');await chooseSelect(p,p.locator('[data-prop=formatId]').last(),'custom');assert.equal(await p.locator('[data-prop=height]').last().inputValue(),'1920');await settleAutosave(p);await p.reload();await p.locator('#field-brief').waitFor();const d=await p.evaluate(id=>StudioModel.storage(localStorage).read(activeBrand.id,id),id);assert.deepEqual(d.outputs.map(o=>o.staticValues.offer),['Offer A','Offer B']);assert.equal(d.collectionVariants['product-fixture'],'grey');assert.equal(d.outputs[1].height,1920);
 const retired=await p.evaluate(()=>{const d=StudioModel.newDraft(activeBrand.id);d.name='Retired recipe';d.outputs=[{id:'old-item',featureId:999,width:1080,height:1080}];StudioModel.storage(localStorage).save(d);return d.id;});await p.goto(f.url+'#brief/'+retired);await p.locator('#briefForm').waitFor();assert.match(await p.locator('#outputs').innerText(),/unavailable/);assert.equal(await p.locator('[data-action=remove-output]').count(),1);assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);}finally{await f.close();}
});

test('Static sequence: reducing and restoring card count preserves saved page content',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url);await p.locator('.creation-hero').waitFor();const id=await seedDraft(p,{features:[9]});await p.locator('#field-brief').waitFor();await p.evaluate(id=>{const st=StudioModel.storage(localStorage),d=st.read(activeBrand.id,id);d.outputs[0].staticParts=StudioModel.staticParts(d.outputs[0]);d.outputs[0].staticParts.at(-1).copy='Last slide must survive';st.save(d);},id);await p.reload();await p.locator('[data-prop=slides]').fill('2');await settleAutosave(p);await p.reload();await p.locator('[data-prop=slides]').waitFor();assert.equal(await p.locator('[data-prop=slides]').inputValue(),'2');await p.locator('[data-prop=slides]').fill('5');await settleAutosave(p);await p.reload();await p.locator('[data-prop=slides]').waitFor();const d=await p.evaluate(id=>StudioModel.storage(localStorage).read(activeBrand.id,id),id);assert.equal(d.outputs[0].slides,5);assert.equal(d.outputs[0].staticParts.at(-1).copy,'Last slide must survive');assert.deepEqual(f.errors,[]);}finally{await f.close();}
});

test('Static export regression: a 200 HTML error is never downloaded as artwork',{timeout:30000},async()=>{
 const f=await fixture();try{const p=f.page;let downloads=0;p.on('download',()=>downloads++);await p.goto(f.url+'#download/job-0/0/0');await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await openDownloadOptions(p);await p.route('**/files/static-continuity.png*',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Login or error page</h1>'}));await p.locator('[data-action=download-file], [data-action=download]').first().click();await p.waitForFunction(()=>!document.querySelector('[data-action=download-file]').disabled);assert.match(await p.locator('#downloadStatus').innerText(),/couldn’t prepare this download/i);assert.equal(downloads,0);
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
  await p.goto(f.url+'?brand='+brand.id+'#review/'+job+'/'+index+'/1');await p.waitForSelector('.focused-art img');await openDownloadOptions(p);await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await openDownloadOptions(p);assert.equal(new URL(p.url()).hash,'#download/'+job+'/'+index+'/1');const format=feature.id%3===0?'jpeg':feature.id%3===1?'png':'original';await chooseSelect(p,p.locator('#downloadFormat'),format);const [download]=await Promise.all([p.waitForEvent('download'),p.locator('[data-action=download-file], [data-action=download]').first().click()]);const metadata=await sharp(await fs.readFile(await download.path())).metadata(),o=M.output(feature.id);assert.equal(metadata.width,o.width);assert.equal(metadata.height,o.height);assert.equal(metadata.format,format==='jpeg'?'jpeg':'png');assert.match(await p.locator('#main').innerText(),/Review flags stay attached/);
  await p.evaluate(()=>location.hash=location.hash.replace('#download/','#review/'));await p.waitForSelector('.focused-art img');assert.match(await p.locator('.focused-art img').getAttribute('src'),/exploration/);results.push({brand:brand.name,featureId:feature.id,format,width:metadata.width,height:metadata.height,editor:'dispatch validated; real Fabric tested separately',passed:true});
 }
 assert.equal(results.length,30);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);assert.deepEqual(f.errors,[]);await fs.writeFile(path.join(root,'work/studio-ui-regression/saved-art-matrix.json'),JSON.stringify(results,null,2));
 }finally{await f.close();}
});
test('Static recovery: image retry, unavailable references, missing assets and safe download navigation',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;let imageFail=true;await p.route('**/files/static-continuity.png*',route=>imageFail?route.fulfill({status:503,body:'Unavailable'}):route.continue());await p.goto(f.url+'#review/job-0/0/0');await p.locator('.focused-art').getByRole('button',{name:'Retry this image',exact:true}).click();imageFail=false;await p.locator('.focused-art').getByRole('button',{name:'Retry this image',exact:true}).click();await p.waitForFunction(()=>{const i=document.querySelector('.focused-art img');return i&&!i.hidden&&i.complete&&i.naturalWidth>0;});
 let referencesFail=true;await p.route('**/files/static-continuity.png*',route=>route.request().resourceType()==='fetch'&&referencesFail?route.fulfill({status:503,body:'Unavailable reference'}):route.continue());await p.route('**/api/studio/validate-reference',async route=>route.fulfill({json:await require('../../lib/creative-ai/runtime/reference-validation').validate(route.request().postDataJSON())}));await p.goto(f.url+'#recipes');await p.locator('[data-action=quick-recipe][data-id="1"]:not([data-image-platform])').click();await p.locator('[data-action=pick-reference]').click();const failedReference=p.waitForResponse(r=>r.url().includes('static-continuity.png')&&r.status()===503);await p.locator('[data-action=select-reference]').first().click();await failedReference;await p.waitForFunction(()=>!document.querySelector('[data-action=select-reference]')?.disabled);assert.equal(await p.locator('.reference-chip').count(),0);referencesFail=false;await p.locator('[data-action=select-reference]').first().click();await p.waitForFunction(()=>document.querySelectorAll('.reference-chip').length===1);
 await p.goto(f.url+'#download/job-0/0/0');await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await openDownloadOptions(p);let release;const barrier=new Promise(r=>release=r);await p.route('**/files/static-continuity.png*',async route=>{await barrier;await route.continue();});let downloads=0;p.on('download',()=>downloads++);await p.locator('[data-action=download-file], [data-action=download]').first().click();await p.locator('#brandSwitch [data-brand="brand-ui-sleepyhead"]').click();release();await p.waitForFunction(()=>window.activeBrand.id==='brand-ui-sleepyhead');await p.waitForTimeout(150);assert.equal(downloads,0,'Leaving the export view cancels the old download');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Static sizing: parent-format propagation, independent modules and desktop continuity',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){await p.goto(f.url+'?brand='+brand.id);await p.waitForSelector('.creation-hero');
 for(const featureId of [5,6,9,11]){
  const id=await p.evaluate(featureId=>{const d=StudioModel.startDraft(activeBrand.id,'quick',featureId);d.brief='Desktop size and copy check';d.focus='brand';const o=d.outputs[0];o.staticParts=StudioModel.staticParts(o);if(o.staticParts.length)o.staticParts[0].copy='Wording survives resize';if(featureId===6){o.staticParts[0].width=970;o.staticParts[0].height=300;}StudioModel.storage(localStorage).save(d);return d.id;},featureId);
  await p.goto(f.url+'?brand='+brand.id+'#brief/'+id);await p.waitForSelector('#briefForm');await chooseSelect(p,p.locator('[data-prop=formatId]'),'portrait');await settleAutosave(p);
  const output=await p.evaluate(id=>StudioModel.storage(localStorage).read(activeBrand.id,id).outputs[0],id);
  for(const part of output.staticParts){if(featureId===6)continue;assert.equal(part.width,1080);assert.equal(part.height,1350);}if(featureId===6){assert.equal(output.staticParts[0].width,970);assert.equal(output.staticParts[0].height,300);}if(output.staticParts.length)assert.equal(output.staticParts[0].copy,'Wording survives resize');
  await p.goto(f.url+'?brand='+brand.id+'#static/'+id+'/0');await p.waitForSelector('.static-deliverable');
  for(const width of [1280,1920]){await p.setViewportSize({width,height:1000});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow at '+width);assert.match(await p.locator('#main').innerText(),/Desktop size and copy check/);assert.equal(await p.locator('#main').count(),1);assert.equal(await p.locator('.app-sidebar').count(),1);await p.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});if(brand===brands[0]&&width===1280)await p.screenshot({path:path.join(root,'work/studio-ui-regression/screens/deliverable-'+featureId+'.png'),animations:'disabled'});}
 }
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});


test('Library profile: source links, product controls and brand isolation',{timeout:45000},async()=>{
 const f=await fixture({profiles:true});try{const p=f.page;await p.goto(f.url);await p.locator('[data-nav=library]').click();await p.waitForSelector('.brand-profile');assert.equal(await p.getByRole('tab',{name:'Brand assets',exact:true}).getAttribute('aria-selected'),'true');assert.ok(await p.locator('.brand-profile-header').innerText());assert.equal(await p.locator('.brand-visual-grid img').count(),3);assert.ok(await p.locator('.brand-resources a').count()>=5);
 const brand='brand-1923d633-e03e-44cc-84b2-bbfb5c152710';for(const href of await p.locator('.brand-profile a').evaluateAll(els=>els.map(e=>e.getAttribute('href'))))assert.ok(href.startsWith('/creative-ai/api/brands/'+brand+'/')||href.startsWith('#library/manage?section=')||f.brands.find(b=>b.id===brand).documents.some(d=>href==='#library/book/'+encodeURIComponent(d.id)),href);
 await p.getByRole('tab',{name:'Products',exact:true}).click();await p.waitForSelector('.product-toolbar');
 assert.equal(await p.locator('#productSavedView').count(),0);assert.equal(await p.getByRole('button',{name:'Save view',exact:true}).count(),0);
 await p.getByRole('button',{name:'Sleepyhead',exact:true}).click();await p.waitForSelector('.product-table');await p.getByRole('tab',{name:'Brand assets',exact:true}).click();await p.waitForSelector('.brand-profile');assert.match(await p.locator('.brand-profile-header h2').innerText(),/Sleepyhead/);assert.match(await p.locator('.profile-note').innerText(),/#231F20/);assert.match(await p.locator('.brand-typefaces').innerText(),/Migrena Grotesque/);for(const href of await p.locator('.brand-profile a').evaluateAll(els=>els.map(e=>e.getAttribute('href'))))assert.ok(href.includes('brand-3a5870df-d114-43eb-ba02-e5d8c3c729de')||href.startsWith('#library/manage?section=')||f.brands.find(b=>b.id==='brand-3a5870df-d114-43eb-ba02-e5d8c3c729de').documents.some(d=>href==='#library/book/'+encodeURIComponent(d.id)),href);await p.getByRole('tab',{name:'Products',exact:true}).click();await p.waitForSelector('.product-toolbar');assert.equal(await p.locator('#productSavedView').count(),0);assert.equal(await p.locator('#productLibrarySearch').inputValue(),'');assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
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
 assert.equal(await p.locator('#sidebarNavigation [data-nav=trash]').count(),0);await p.locator('#accountTrigger').click();assert.equal(await p.locator('#accountMenu').evaluate(el=>el.matches(':popover-open')),true);assert.match(await p.locator('#accountMenu').innerText(),/Local preview.*Not signed in/);
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


test('Context help: retained review hints support keyboard and dismiss while simplified navigation stays clean',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;for(const [i,brand]of brands.entries()){await p.goto(f.url+'?brand='+brand.id);await p.locator('.creation-hero').waitFor();assert.equal(await p.locator('.sidebar-help-row > .context-help,.home-create-actions .context-help,.format-tile .context-help').count(),0);await p.goto(f.url+'?brand='+brand.id+'#review/job-'+i+'/0/0');await p.locator('.focused-art').waitFor();const help=p.getByRole('button',{name:'About Why this design',exact:true});assert.equal(await help.count(),0);await p.locator('[data-nav=favourites]').click();await p.locator('h1').waitFor();assert.equal(await p.getByRole('button',{name:'About Favourites',exact:true}).count(),0);}assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);}finally{await f.close();}
});

test('Non-modal tasks: inline inputs, screen navigation, return context, reload and brand isolation',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){
  await p.goto(f.url+'?brand='+brand.id+'#home');await p.locator('[data-action=asset-card-start][data-card=instagram-post]').click();await p.locator('#field-brief').fill('Keep this brief & नमस्ते');await setAudience(p,'audience','New homeowners');await settleAutosave(p);const briefURL=p.url();await p.locator('[data-nav=home]').click();await p.goto(briefURL);await p.locator('#field-brief').waitFor();assert.equal(await p.locator('#field-brief').inputValue(),'Keep this brief & नमस्ते');assert.equal(await p.locator('#field-audience').inputValue(),'New homeowners');
  await p.locator('[data-action=workspace-search]').click();await p.locator('#workspaceSearch').fill(brand.name);
  assert.match(await p.locator('#workspaceResults').innerText(),new RegExp(brand.name));
  await p.locator('[data-nav=projects]').click();await p.waitForSelector('.project-gallery');
  assert.equal(await p.locator('#taskPanel').isVisible(),false);
  await p.locator('.project-card [data-action=org-menu]').first().click();await p.locator('[data-action=org-rename]').click();
  assert.equal(await p.locator('#taskPanel + .creative-board').count(),1);assert.equal(await p.locator('.creative-board #taskPanel').count(),0);
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
 await p.goto(f.url+'?brand='+brand.id);await p.waitForSelector('.creation-hero');await p.evaluate(brandId=>{const d=StudioModel.startDraft(brandId,'quick',1);d.name='Square acceptance';d.brief='A social post — नमस्ते & "home"';d.audience='People furnishing a living room';d.rtbs='Supplied product feature';d.productId='product-fixture';d.variant='grey';const saved=StudioModel.storage(localStorage).save(d);location.hash='brief/'+saved.id;},brand.id);
 await p.locator('[data-action=assignment-review]').click();assert.equal(await p.locator('[data-action=generation-preflight]').count(),0);await p.waitForFunction(()=>!document.querySelector('[data-assignment-confirm]').disabled);await p.locator('[data-assignment-confirm]').click();await p.waitForFunction(()=>document.querySelector('[data-review-estimate]')?.textContent.includes('reconnect'));assert.match(await p.locator('[data-review-estimate]').innerText(),/reconnect to the same request/);
 await p.locator('[data-assignment-confirm]').click();await p.waitForURL(url=>url.hash==='#project/job-'+index);assert.equal(created,1);assert.equal(calls,2);
 await p.goto(f.url+'?brand='+brand.id+'#project/job-'+index);await p.locator('[data-action=open-output]').first().click();await p.waitForSelector('.option-card');await p.goto(f.url+'?brand='+brand.id+'#download/job-'+index+'/0/0');await openDownloadOptions(p);await p.locator('#downloadFormat').waitFor({state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await openDownloadOptions(p);await chooseSelect(p,p.locator('#downloadFormat'),'png');const event=p.waitForEvent('download');await p.locator('[data-action=download-file], [data-action=download]').first().click();const file=await event,meta=await require('sharp')(await file.path()).metadata();assert.equal(meta.width,1080);assert.equal(meta.height,1080);
 await p.unroute('**/api/studio/preflight');await p.unroute('**/api/studio/generate');}
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('UI browser: ordered carousel ZIP is accessible for both brands and stale sets are hidden',{timeout:60000},async()=>{const f=await fixture();try{for(const [n,brand]of brands.entries()){const p=f.page,id='job-'+n;let stale=false;await p.route('**/api/jobs/'+id,route=>{const results=[1,2,3].map(i=>({route:'continuity',placementId:'s'+i,ready:false,imageUrl:'/creative-ai/api/jobs/'+id+'/files/static-'+i+'.png'}));return route.fulfill({json:{id,brandId:brand.id,status:'finished',createdAt:'2026-10-19',placements:results.map(r=>({id:r.placementId,name:r.placementId,dimensions:{width:1080,height:1080},carousel:{id:'set'}})),results,carousels:[{route:'continuity',ready:false,downloadUrl:'/creative-ai/api/jobs/'+id+'/files/carousel-bundle-set.zip',slides:results.map((r,i)=>({...r,index:i+1,imageUrl:stale&&i===1?r.imageUrl+'-old':r.imageUrl}))}]}})});await p.goto(f.url+'?brand='+brand.id+'#download/'+id+'/0/0');await openDownloadOptions(p);await p.getByRole('link',{name:'Download carousel ZIP'}).waitFor();assert.match(await p.locator('#main').innerText(),/3 slides in publishing order/);assert.match(await p.locator('#main').innerText(),/Review required/);stale=true;await p.reload();await openDownloadOptions(p);await p.locator('.download-options[open]').waitFor();assert.equal(await p.getByRole('link',{name:'Download carousel ZIP'}).count(),0);await p.unroute('**/api/jobs/'+id);}assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);}finally{await f.close();}});

test('UI browser: module set ZIP binds complete ordered assets and rejects foreign candidates for both brands',{timeout:60000},async()=>{const f=await fixture();try{for(const [n,brand]of brands.entries()){
 const p=f.page,id='job-'+n,rows=['hero','detail'].map(placementId=>({route:'continuity',placementId,imageUrl:'/creative-ai/api/jobs/'+id+'/files/static-'+placementId+'.png',ready:false}));let foreign=false,edited=false,unavailable=false,bodies=[];
 await p.route('**/api/jobs/'+id,route=>route.fulfill({json:{id,brandId:brand.id,status:'finished',placements:rows.map((r,i)=>({id:r.placementId,name:r.placementId,dimensions:{width:970,height:i?300:600}})),results:[...rows].reverse()}}));
 await p.route('**/api/jobs/'+id+'/edits',route=>unavailable?route.fulfill({status:503,json:{error:'Offline'}}):route.fulfill({json:edited?[{route:'continuity',placementId:'hero',revision:2,sourceImageUrl:rows[0].imageUrl,previewUrl:'/creative-ai/api/jobs/'+id+'/editable/continuity/hero/preview?revision=2'}]:[]}));
 await p.route('**/api/jobs/'+id+'/delivery-packages',route=>{if(route.request().method()==='GET')return route.fulfill({json:{brandId:foreign?'other-brand':brand.id,brandName:brand.name,items:rows.map((r,i)=>({type:edited&&!i?'edit':'result',...(edited&&!i?{revision:2,sourceImageUrl:r.imageUrl}:{}),route:r.route,placementId:r.placementId,previewUrl:r.imageUrl,versionId:'original',artifactHash:String(i).repeat(64)}))}});bodies.push(route.request().postDataJSON());return route.fulfill({json:{downloadUrl:'/creative-ai/api/jobs/'+id+'/files/qa-set.zip'}})});
 await p.route('**/files/qa-set.zip',route=>route.fulfill({contentType:'application/zip',body:Buffer.from('PK\x05\x06'+'\x00'.repeat(18),'binary')}));
 await p.goto(f.url+'?brand='+brand.id+'#download/'+id+'/0/0');if(!await p.locator('[data-action=download-set]').isVisible())await openDownloadOptions(p);await p.locator('[data-action=download-set]').click();await p.waitForFunction(()=>document.querySelector('#downloadStatus')?.textContent.includes('Complete image set downloaded'));assert.equal(bodies.length,1);assert.equal(bodies[0].brandName,brand.name);assert.deepEqual(bodies[0].assets.map(a=>a.placementId),['hero','detail']);assert.ok(bodies[0].assets.every(a=>a.artifactHash.length===64));
 edited=true;await p.locator('[data-action=download-set]').click();await p.waitForFunction(()=>document.querySelector('#downloadStatus')?.textContent.includes('changed since your preview'));assert.equal(bodies.length,1);await p.reload();await p.locator('[data-action=download-set]').waitFor({state:'attached'});if(!await p.locator('[data-action=download-set]').isVisible())await openDownloadOptions(p);await p.locator('[data-action=download-set]').click();await p.waitForFunction(()=>document.querySelector('#downloadStatus')?.textContent.includes('Complete image set downloaded'));assert.equal(bodies.length,2);assert.equal(bodies[1].assets[0].type,'edit');assert.equal(bodies[1].assets[0].revision,2);assert.equal(bodies[1].assets[1].type,'result');
 unavailable=true;await p.locator('[data-action=download-set]').click();await p.waitForFunction(()=>document.querySelector('#downloadStatus')?.textContent.includes('Could not check the latest edits'));assert.equal(bodies.length,2);unavailable=false;
 foreign=true;if(!await p.locator('[data-action=download-set]').isVisible())await openDownloadOptions(p);await p.locator('[data-action=download-set]').click();await p.waitForFunction(()=>document.querySelector('#downloadStatus')?.textContent.includes('another brand'));assert.equal(bodies.length,2);await p.unrouteAll({behavior:'wait'});
 }assert.deepEqual(f.errors,[]);}finally{await f.close();}});

test('Brief autosaves each brand, carries selected format and opens exact saved creative',{timeout:90000},async()=>{
 const f=await fixture(),ids=[];try{const p=f.page;for(const [i,brand]of brands.entries()){await p.goto(f.url+'?brand='+brand.id);await p.locator('[data-action=asset-card-start][data-card=instagram-story]').click();await p.locator('#field-brief').fill(brand.name+' — नमस्ते <home>');await chooseSelect(p,p.locator('#field-productId'),'product-fixture');await chooseBriefVariant(p,'grey');await setAudience(p,'audience','New homeowners');await settleAutosave(p);ids.push(new URL(p.url()).hash);await p.reload();await p.locator('#field-brief').waitFor();assert.equal(await p.locator('#field-brief').inputValue(),brand.name+' — नमस्ते <home>');assert.equal(await p.locator('[data-prop=formatId]').inputValue(),'story');assert.equal(await p.locator('#field-audience').inputValue(),'New homeowners');
 await p.evaluate(()=>{window.qaHomeEdits=[];EditableCanvas.open=async key=>qaHomeEdits.push({key,brand:activeBrand.id,job:currentJob.id});location.hash='creatives';});await p.locator('.creative-picker-card').first().waitFor();await p.locator('#creativePickerSearch').fill('no matching creative');assert.equal(await p.locator('.creative-picker-card:visible').count(),0);await p.locator('#creativePickerSearch').fill('Option B');await p.locator('.creative-picker-card:visible').click();assert.deepEqual(await p.evaluate(()=>qaHomeEdits),[{key:'exploration|square',brand:brand.id,job:'job-'+i}]);}
 await p.goto(f.url+'?brand='+brands[0].id+ids[0]);await p.locator('#field-brief').waitFor();assert.match(await p.locator('#field-brief').inputValue(),/^Duroflex/);await p.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('Storage full');};});await p.locator('#field-brief').fill('Keep this unsaved text');await settleAutosave(p);assert.equal(await p.locator('#field-brief').inputValue(),'Keep this unsaved text');assert.match(await p.locator('#briefSummary').innerText(),/browser could not save/);assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);}finally{await f.close();}
});

test('Navigation continuity: section switching, filter links, reloadable screens and editor origin',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;
 await p.goto(f.url+'?brand='+brands[0].id+'#projects?status=check&sort=name&q=Duroflex'); // 9 Nov 2026: unchecked fixture designs read "Check before using", not Ready
 await p.waitForSelector('.project-row');assert.equal(await p.locator('#projectSearch').inputValue(),'Duroflex');assert.equal(await p.locator('#projectSort').inputValue(),'name');
 assert.deepEqual(await p.locator('#sidebarNavigation a[data-nav]').evaluateAll(els=>els.map(e=>e.textContent.trim())),['Home','Projects','Favourites','Brand Library']);assert.equal(await p.locator('#sidebarNavigation .usage-link').count(),0);await p.locator('#accountTrigger').click();assert.ok(await p.locator('#accountMenu a[href="#settings/trash"]').isVisible());await p.keyboard.press('Escape');
 await p.locator('#projectSearch').fill('');await p.locator('[data-brand="'+brands[1].id+'"]').click();await p.waitForSelector('.project-row');assert.match(p.url(),/#projects\?status=check&sort=name$/);assert.match(await p.locator('.project-row').innerText(),/Sleepyhead/);
 await p.locator('.project-name').click();await p.waitForSelector('.deliverable-row');await p.locator('[data-brand="'+brands[0].id+'"]').click();await p.waitForSelector('.project-row');assert.match(p.url(),/#projects$/);assert.match(await p.locator('.project-row').innerText(),/Duroflex/);
 await p.locator('[data-nav=library]').click();await p.locator('[data-library-tab=products]').click();await p.locator('#productLibrarySearch').fill('saved');await p.waitForURL(/#library\/products\?q=saved$/);assert.deepEqual(f.errors,[]);assert.match(p.url(),/#library\/products\?q=saved$/);await p.reload();await p.waitForSelector('#productLibrarySearch');assert.equal(await p.locator('#productLibrarySearch').inputValue(),'saved');await p.locator('[data-brand="'+brands[1].id+'"]').click();await p.waitForSelector('#productLibrarySearch');assert.match(p.url(),/#library\/products$/);assert.equal(await p.locator('#productLibrarySearch').inputValue(),'');
 for(const route of ['create','creatives','tools','search']){await p.goto(f.url+'?brand='+brands[1].id+'#'+route);await p.waitForSelector('#taskPanel:not([hidden])');assert.ok(await p.locator('#taskTitle').innerText());await p.reload();await p.waitForSelector('#taskPanel:not([hidden])');assert.match(p.url(),new RegExp('#'+route));await p.locator('[data-action=close-task]').click();await p.waitForSelector('.creation-hero');}
 await p.goto(f.url+'?brand='+brands[1].id+'#creatives');await p.waitForSelector('.creative-picker-card');await p.evaluate(()=>{window.qaEditorOrigin=[];EditableCanvas.open=async(key,options)=>qaEditorOrigin.push({key,options});});await p.locator('.creative-picker-card').first().click();assert.equal((await p.evaluate(()=>qaEditorOrigin))[0].options.backLabel,'Back to creatives');assert.match(p.url(),/#editor\//);
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Returning from a project restores brand-scoped filters, scroll and the opened card',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.setViewportSize({width:900,height:500});
 for(const [index,brand] of brands.entries()){
  await p.goto(f.url+'?brand='+brand.id+'#projects?status=check');await p.waitForSelector('.project-row'); // 9 Nov 2026: unchecked fixture designs are not Ready
  await p.evaluate(()=>{const st=StudioModel.storage(localStorage);for(let i=0;i<10;i++){const d=StudioModel.startDraft(activeBrand.id,'quick',1);Object.assign(d,{name:'A draft '+i,manualName:true,focus:'brand',brief:'Saved scroll fixture',rtbs:'Supplied feature'});st.save(d);}});
  await p.locator('[data-filter=all]').click();await chooseSelect(p,p.locator('#projectSort'),'name');
  const card=p.locator('.project-row').filter({hasText:brand.name+' campaign'});await card.scrollIntoViewIfNeeded();
  const y=await p.evaluate(()=>scrollY);assert.ok(y>0);
  await card.locator('.project-name').click();await p.waitForSelector('.deliverable-row');
  await backToProject(p);await p.waitForSelector('.project-row');await p.waitForFunction(y=>Math.abs(scrollY-y)<5,y);
  assert.match(p.url(),/#projects\?sort=name$/);assert.equal(await p.locator('.return-highlight').count(),1);
  assert.equal(await p.locator('.return-highlight .project-name').getAttribute('href'),'#project/job-'+index);
  await p.reload();await p.waitForSelector('.project-row');await p.waitForFunction(y=>Math.abs(scrollY-y)<5,y);
  await p.locator('.return-highlight .project-name').click();await p.waitForSelector('.deliverable-row');
  await p.goBack();await p.waitForSelector('.project-row');await p.waitForFunction(y=>Math.abs(scrollY-y)<5,y);
 }
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Complex detail and brief-selection routes rehydrate safely after refresh',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;for(const b of brands){await p.goto(f.url+'?brand='+b.id+'#library/product?id=product-fixture&from=library%2Fproducts');await p.waitForSelector('#taskPanel:not([hidden])');assert.match(await p.locator('#taskTitle').innerText(),/saved product/);await p.reload();await p.waitForSelector('#taskPanel:not([hidden])');await p.locator('[data-action=close-task]').click();await p.waitForSelector('#productLibrarySearch');await p.goto(f.url+'?brand='+b.id+'#library/product?id=missing');await p.waitForSelector('.notice.error');assert.match(await p.locator('.notice.error').innerText(),/not available in this brand/);await p.goto(f.url+'?brand='+b.id+'#home');await p.waitForSelector('.creation-hero');await openLegacyDraft(p);await p.locator('[data-action=add-output]').first().click();await p.locator('[data-action=legacy-assets]').click();assert.match(p.url(),/#deliverables/);await p.reload();await p.waitForSelector('#featureSearch');await replaceAsset(p,'[data-action=choose-feature][data-id="8"]');await p.waitForSelector('[data-prop=formatId]');assert.equal(await p.locator('[data-prop=formatId]').inputValue(),'story');}assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);}finally{await f.close();}
});

test('Recovery navigation: editor URL survives refresh and library Back restores filters',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await f.context.addInitScript(()=>{Object.defineProperty(window,'__editorCalls',{value:[],configurable:true});document.addEventListener('DOMContentLoaded',()=>{EditableCanvas.open=async(key,options)=>{window.__editorCalls.push({key,job:currentJob.id,label:options.backLabel});};});});
 for(let i=0;i<brands.length;i++){await p.goto(f.url+'?brand='+brands[i].id+'#creatives');await p.waitForSelector('.creative-picker-card');await p.locator('.creative-picker-card').last().click();await p.waitForURL(/#editor\//);const link=p.url();await p.waitForFunction(()=>__editorCalls.length===1);assert.equal((await p.evaluate(()=>__editorCalls))[0].key,'exploration|square');await p.reload();await p.waitForFunction(()=>__editorCalls.length===1);assert.equal(p.url(),link);assert.equal((await p.evaluate(()=>__editorCalls))[0].job,'job-'+i);
 await p.goto(f.url+'?brand='+brands[i].id+'#library/products?q=saved');await p.waitForSelector('#productLibrarySearch');await p.locator('[data-library-tab=brand]').click();await p.waitForURL(/#library(?:\/brand)?$/);await p.goBack();await p.waitForSelector('#productLibrarySearch');assert.equal(await p.locator('#productLibrarySearch').inputValue(),'saved');}
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Return to tab refreshes project data without replacing a newly edited brief',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;await p.goto(f.url+'#projects');await p.locator('.project-row').waitFor();let detailReads=0;await p.route('**/api/jobs/job-0',async route=>{detailReads++;const response=await route.fetch(),body=await response.json();body.productSummary.name='Updated remote campaign';await route.fulfill({json:body});});await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.waitForFunction(()=>document.querySelector('.project-row')?.textContent.includes('Updated remote campaign'));assert.ok(detailReads>0);await seedDraft(p);await p.locator('#field-brief').fill('Unfinished brief stays');await p.evaluate(()=>window.dispatchEvent(new Event('online')));assert.equal(await p.locator('#field-brief').inputValue(),'Unfinished brief stays');await p.waitForTimeout(3100);await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await settleAutosave(p);assert.equal(await p.locator('#field-brief').inputValue(),'Unfinished brief stays');assert.deepEqual(f.errors,[]);}finally{await f.close();}
});

test('Reference intake: every selected file is listed, decoded and recoverable for both brands',{timeout:60000},async()=>{const f=await fixture();try{const p=f.page,image=await require('sharp')({create:{width:16,height:16,channels:3,background:'#999'}}).png().toBuffer();let attempts=0;await p.route('**/api/studio/validate-reference',async route=>{attempts++;const body=route.request().postDataJSON();if(body.name==='retry.png'&&attempts===1)return route.fulfill({status:503,json:{error:'Temporary validation outage'}});try{return route.fulfill({json:await require('../../lib/creative-ai/runtime/reference-validation').validate(body)});}catch(e){return route.fulfill({status:422,json:{error:e.message}});}});
 for(const brand of brands){attempts=0;await p.goto(f.url+'?brand='+brand.id);await p.waitForSelector('.creation-hero');await openLegacyDraft(p);assert.equal(await p.locator('[data-action=add-reference]').count(),1);const picker=p.waitForEvent('filechooser');await p.locator('[data-action=add-reference]').click();await (await picker).setFiles([{name:'retry.png',mimeType:'image/png',buffer:image},{name:'not-readable.png',mimeType:'image/png',buffer:Buffer.from('not an image')},...Array.from({length:10},(_,i)=>({name:'good-'+i+'.png',mimeType:'image/png',buffer:image}))]);await p.waitForFunction(()=>document.querySelectorAll('.reference-chip').length===8&&!document.querySelector('#referenceUploads').textContent.includes('Checking'));assert.ok(await p.locator('[data-reference-row]').count()===4);assert.match(await p.locator('#referenceUploads').innerText(),/10 files per selection/);assert.equal(await p.locator('.reference-chip').count(),8);await p.locator('[data-action=retry-reference-file]').first().click();await p.waitForFunction(()=>document.querySelectorAll('.reference-chip').length===9);assert.equal(await p.locator('[data-reference-row]').count(),3);await p.reload();await p.waitForSelector('#referenceUploads');assert.match(await p.locator('#referenceUploads').innerText(),/could not|not|Retry/i);assert.equal(await p.locator('.reference-chip').count(),9);}
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}});

test('Downloads: both brands use fresh saved edit, consistent names, explicit Original and fail closed on missing edit metadata',{timeout:60000},async()=>{const f=await fixture();try{const p=f.page,sharp=require('sharp'),edited=await sharp({create:{width:1080,height:1080,channels:3,background:'#11aa44'}}).png().toBuffer();for(const [i,brand]of brands.entries()){let unavailable=false,revision=2,exports=[];const id='job-'+i;await p.route('**/api/jobs/'+id+'/edits',route=>unavailable?route.fulfill({status:503,json:{error:'Offline'}}):route.fulfill({json:[{route:'continuity',placementId:'square',revision,sourceImageUrl:'/creative-ai/api/jobs/'+id+'/files/static-continuity.png',previewUrl:'/creative-ai/api/jobs/'+id+'/preview'}]}));await p.route('**/api/jobs/'+id+'/editable/continuity/square/export',async route=>{exports.push(route.request().postDataJSON());await new Promise(r=>setTimeout(r,150));await route.fulfill({contentType:'image/png',body:edited});});await p.goto(f.url+'?brand='+brand.id+'#download/'+id+'/0/0');await p.waitForSelector('[data-action=download-file]');await p.locator('.art-frame img[data-edit-revision="2"]').waitFor();revision=3;await p.locator('[data-action=download-file]').click();await p.waitForFunction(()=>document.querySelector('#downloadStatus')?.textContent.includes('changed since your preview'));assert.equal(exports.length,0);await p.locator('[data-action=refresh-preview]').click();await p.locator('.art-frame img[data-edit-revision="3"]').waitFor();await p.waitForSelector('[data-action=download-file]');let event=p.waitForEvent('download');await p.evaluate(()=>{const b=document.querySelector('[data-action=download-file]');b.dispatchEvent(new MouseEvent('click',{bubbles:true}));b.dispatchEvent(new MouseEvent('click',{bubbles:true}));});let d=await event;assert.match(d.suggestedFilename(),new RegExp('^'+brand.name+'_campaign-Square-post(-[0-9]{1,2}-[A-Z][a-z]{2})?_1080x1080_Option-A_R3\\.png$'),'naming v2 adds the date to automatic names');assert.equal(exports.length,1);assert.equal(exports[0].revision,3);assert.deepEqual(await fs.readFile(await d.path()),edited);
 await p.waitForFunction(()=>!document.querySelector('[data-action=download-file]').disabled);if(!await p.locator('#downloadVersion').isVisible())await openDownloadOptions(p);await chooseSelect(p,p.locator('#downloadVersion'),'original');event=p.waitForEvent('download');await p.locator('[data-action=download-file]').click();d=await event;assert.equal(exports.length,1);assert.match(d.suggestedFilename(),/_Original.png$/);assert.notDeepEqual(await fs.readFile(await d.path()),edited);
 await p.waitForFunction(()=>!document.querySelector('[data-action=download-file]').disabled);unavailable=true;await chooseSelect(p,p.locator('#downloadVersion'),'latest');await p.locator('[data-action=download-file]').click();await p.waitForFunction(()=>document.querySelector('#downloadStatus').textContent.includes('Could not check the latest edit'));assert.equal(exports.length,1);await p.unrouteAll({behavior:'wait'});}assert.deepEqual(f.errors,[]);}finally{await f.close();}});

test('Rationale: simplified outputs retain intent and honest status without review findings for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;for(const [i,brand]of brands.entries()){const id='job-'+i;
 await p.route('**/api/jobs/'+id+'/details',route=>route.fulfill({json:{units:[{route:'continuity',placementId:'square',plannedArt:{composition:'Give the headline a clear area.',lighting:'Cool evening light.'},review:{criticalChecks:[{criterion:'required-text-legibility',status:'fail',evidence:{observation:'Supporting copy is too small.'}}],qualityScores:[{criterion:'communication',score:98,usedInScore:true,evidence:{method:'vision',observation:'Headline is readable.'}}]}}]}}));
 await p.goto(f.url+'?brand='+brand.id+'#review/'+id+'/0/0');await p.locator('.focused-art img').waitFor();assert.equal(await p.locator('.score-number,#rationalePanel').count(),0);
 assert.equal(await p.locator('.review-findings,#savedReviewDetails,.journey-steps,.creation-steps').count(),0);assert.equal(await p.locator('.decision-row').count(),0);assert.equal(await p.locator('.intent-label').count(),0);assert.equal(await p.locator('[data-review-status]').count(),0);
 assert.equal(await p.locator('#sidebarNavigation [data-action=asset-picker]').count(),9);/* the 9 format groups; "+ New" opens the brief box (8 Nov 2026) */await p.locator('#sidebarNavigation [data-group=social]').click();await p.waitForSelector('#taskPanel:not([hidden])');await p.locator('[data-action=picker-tab][data-division=social]').click();assert.match(p.url(),/#tools\/assets/);await p.goBack();await p.waitForSelector('.focused-art img');
 await p.route('**/api/jobs/'+id+'/edits',route=>route.fulfill({json:[{route:'continuity',placementId:'square',revision:3,sourceImageUrl:'/creative-ai/api/jobs/'+id+'/files/static-continuity.png',previewUrl:'/creative-ai/api/jobs/'+id+'/preview'}]}));await p.reload();await p.waitForFunction(()=>document.querySelector('.option-thumbnail.active small')?.textContent.includes('Saved edit'));assert.match(await p.locator('.option-thumbnail.active small').innerText(),/Saved edit/);assert.equal(await p.locator('.review-findings').count(),0);await p.unrouteAll({behavior:'wait'});
 }assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);}finally{await f.close();}});

test('Client language: both brands show outcomes, simplified rationale and safe recovery without technical detours',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,b] of brands.entries()){
  await p.goto(f.url+'?brand='+b.id+'#creatives');await p.waitForSelector('.creative-picker-card');
  assert.doesNotMatch(await p.locator('#taskPanel').innerText(),/continuity|exploration|undefined/i);assert.match(await p.locator('#taskPanel').innerText(),/Option A/);
  await p.goto(f.url+'?brand='+b.id+'#review/job-'+i+'/0/0');await p.waitForSelector('.focused-art img');
  assert.equal(await p.locator('#main a[href^="/creative-ai?"]').count(),0);assert.equal(await p.locator('.decision-row').count(),0);
  assert.doesNotMatch(await p.locator('#main').innerText(),/No AI request|brand training|Full design intent/);
  assert.equal(await p.locator('[data-action=review-details],#savedReviewDetails').count(),0);
  await p.route('**/jobs/job-'+i,async route=>{const response=await route.fetch(),data=await response.json();data.status='failed';data.error={message:'Agent output failed validated contract after one schema repair: GPT-6 token limit'};await route.fulfill({json:data});});
  await p.goto(f.url+'?brand='+b.id+'#progress/job-'+i);await p.reload();await p.waitForFunction(()=>document.querySelector('.progress-main h2')?.textContent==='Needs attention');assert.match(await p.locator('#main').innerText(),/couldn’t use part of the generated response/);assert.doesNotMatch(await p.locator('#main').innerText(),/Agent output|schema|GPT-6|token limit|advanced tools/i);assert.equal(await p.getByRole('button',{name:'Check status',exact:true}).count(),0);assert.ok(await p.locator('.recorded-progress').isVisible());
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
  await p.route('**/api/jobs/'+id,async route=>{reads++;if(failed)return route.fulfill({status:503,json:{error:'fixture disconnect'}});const body={id,brandId:b.id,status:phase==='finished'?'finished':'running',stage:phase,activeStages:phase==='finished'?[]:[phase],placements:[{id:'square',name:'Square post',dimensions:{width:1080,height:1080}}],results:phase==='finished'?[{route:'continuity',placementId:'square',ready:true,imageUrl:'/creative-ai/api/jobs/'+id+'/files/static-continuity.png'}]:[]};await route.fulfill({json:body});});
  await p.goto(f.url+'?brand='+b.id+'#progress/'+id);await p.waitForSelector('.recorded-progress [aria-current=step]');await p.waitForFunction(()=>document.querySelector('.progress-main h2')?.textContent==='Creating');assert.equal(await p.getByRole('button',{name:'Check status',exact:true}).count(),0);
  // Automatic stage advancement requires no user action.
  phase='generation';await p.waitForFunction(()=>document.querySelector('.progress-substage')?.textContent==='Generating images',{},{timeout:8000});
  const requests=f.requests.length;phase='review';await p.waitForFunction(()=>document.querySelector('.progress-substage')?.textContent==='Checking images',{},{timeout:8000});const later=f.requests.slice(requests);assert.ok(!later.some(r=>r.url==='/creative-ai/api/jobs'||r.url.endsWith('/edits')||r.url==='/creative-ai/api/jobs/job-'+(1-i)),'Polling reads only the selected job');
  await p.evaluate(()=>{window.qaHidden=true;document.dispatchEvent(new Event('visibilitychange'));});const paused=reads;await p.waitForTimeout(5300);assert.equal(reads,paused);
  failed=true;await p.evaluate(()=>{window.qaHidden=false;document.dispatchEvent(new Event('visibilitychange'));});await p.waitForFunction(()=>document.querySelector('#progressConnection')?.textContent.includes('Reconnecting'));assert.match(await p.locator('.progress-substage').innerText(),/Checking images/);
  await p.evaluate(()=>{window.qaOnline=false;dispatchEvent(new Event('offline'));});const offline=reads;await p.waitForTimeout(200);assert.equal(reads,offline);assert.match(await p.locator('#progressConnection').innerText(),/offline/);
  failed=false;phase='finished';await p.evaluate(()=>{window.qaOnline=true;dispatchEvent(new Event('online'));});await p.waitForFunction(()=>document.querySelector('.progress-main h2')?.textContent==='Ready');assert.equal(new URL(p.url()).hash,'#progress/'+id,'Completed activity remains open');await p.waitForTimeout(500);const completed=reads;await p.waitForTimeout(5300);assert.equal(reads,completed,'Terminal jobs stop periodic requests');
  // A returning tab still refreshes immediately, including terminal records.
  await p.evaluate(()=>{window.qaHidden=true;document.dispatchEvent(new Event('visibilitychange'));window.qaHidden=false;document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(250);assert.ok(reads>completed);
  assert.equal(await p.locator('.progress-main').count(),1);
  await p.goto(f.url+'?brand='+b.id+'#progress/'+id);await p.waitForFunction(()=>document.querySelector('.progress-main h2')?.textContent==='Ready');assert.equal(new URL(p.url()).hash,'#progress/'+id);await p.getByRole('link',{name:'View designs',exact:true}).click();await p.waitForURL(new RegExp('#project/'+id+'$'));await p.waitForSelector('.deliverable-row');
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
  await p.route('**/api/jobs/job-'+i,async route=>{const response=await route.fetch(),data=await response.json();data.intake={productPageUrl:mode==='missing'?'https://example.com/products/absent':'https://example.com/products/sku?variant=2',productAssetId:'chosen'};if(mode!=='art'){data.status='running';data.results=[];}await route.fulfill({json:data});});
  await p.goto(f.url+'?brand='+b.id+'#projects');await p.waitForSelector('.project-card');
  assert.match(await p.locator('.project-cover img').getAttribute('src'),/sku-selected.png$/);assert.match(await p.locator('.project-cover img').getAttribute('alt'),/^Product reference:/);assert.match(await p.locator('.project-card-details').innerText(),/0 designs/);assert.equal(await p.getByRole('button',{name:'About Quick Create',exact:true}).count(),0);assert.equal(await p.getByRole('button',{name:'About Create a Campaign',exact:true}).count(),0);assert.equal(await p.locator('.page-heading [data-action=start-quick],.page-heading [data-action=start-campaign]').count(),0);
  mode='art';await p.reload();await p.waitForFunction(()=>document.querySelector('.project-cover img')?.getAttribute('src').endsWith('static-continuity.png'));assert.match(await p.locator('.project-cover img').getAttribute('src'),/static-continuity.png$/);assert.equal(await p.locator('.project-cover.has-product-reference').count(),0);
  mode='missing';await p.reload();await p.waitForFunction(()=>document.querySelector('.project-cover')?.textContent.includes('Creating your images'));assert.equal(await p.locator('.project-cover img').count(),0);assert.match(await p.locator('.project-cover').innerText(),/Creating your images/);
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
 await p.goto(f.url+'?brand='+brands[0].id+'#home');await p.waitForSelector('.creation-hero');
 await p.getByRole('button',{name:'Sleepyhead',exact:true}).click();await p.waitForFunction(()=>window.activeBrand?.id==='brand-ui-sleepyhead'&&document.querySelector('.creation-hero'));
 await p.evaluate(()=>{const now=Date.now;Date.now=()=>now()+31000;});
 await p.route('**/api/jobs',async route=>{await gate;await route.continue();});
 await p.getByRole('button',{name:'Duroflex',exact:true}).click();await p.locator('[data-action=asset-card-start][data-card=instagram-post]').click();await p.locator('#field-brief').fill('Keep my new draft while refreshing');release();await p.unrouteAll({behavior:'wait'});
 await p.evaluate(()=>StudioData.workspace('brand-ui-duroflex'));
 assert.equal(await p.locator('#field-brief').inputValue(),'Keep my new draft while refreshing');assert.deepEqual(f.errors,[]);
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
  await backToProject(p);await p.locator('.deliverable-row').waitFor();await backToProject(p);await p.waitForSelector('.project-gallery');assert.match(p.url(),/#projects$/);
 }assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Design details: both options have saved rationale and scores before artwork opens, for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,b]of brands.entries()){
 let reads=0;await p.route('**/api/jobs/job-'+i+'/details',route=>{reads++;return route.fulfill({json:{units:['continuity','exploration'].map((route,n)=>({route,placementId:'square',plannedArt:{rationale:b.name+' saved composition'},review:{qualityScores:[{criterion:'communication',score:n?80:90,usedInScore:true,evidence:{method:'vision',observation:'Saved observation'}}]}}))}});});
 await p.goto(f.url+'?brand='+b.id+'#projects');await p.waitForSelector('.project-cover img');assert.ok(reads>=1&&reads<=2);
 await p.locator('.project-cover img').click();await p.waitForSelector('.option-strip');assert.equal(await p.locator('.score-number').count(),0);assert.equal(await p.locator('#rationalePanel').count(),0);
 const cachedReads=reads;await p.locator('.option-thumbnail').nth(1).click();await p.waitForSelector('.option-thumbnail[data-index="1"][aria-pressed=true]');assert.equal(await p.locator('.score-number').count(),0);assert.equal(reads,cachedReads);
 await p.unrouteAll({behavior:'wait'});
 }assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Project status stays in the compact caption outside artwork for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,b]of brands.entries())for(const empty of [false,true]){
 await p.route('**/api/jobs/job-'+i,async route=>{const response=await route.fetch(),job=await response.json();if(empty){job.results=[];job.status='failed';}await route.fulfill({json:job});});
 await p.goto(f.url+'?brand='+b.id+'#projects');await p.waitForSelector('.project-card');
 assert.equal(await p.locator('.project-card .status').count(),1);assert.equal(await p.locator('.project-card-info .status').count(),1);assert.equal(await p.locator('.project-cover-status .status').count(),0);
 const cover=await p.locator('.project-cover').boundingBox(),badge=await p.locator('.project-card-info .status').boundingBox();assert.ok(badge.y>=cover.y+cover.height,'Status must not overlap the artwork');
 await p.unrouteAll({behavior:'wait'});
 }assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Workspace loader is visible during delayed brand reads and disappears when loaded',{timeout:60000},async()=>{
 const f=await fixture();let release;try{const p=f.page;const gate=new Promise(r=>release=r);
 await p.route('**/api/brands/*/products',async route=>{await gate;await route.continue();});
 await p.goto(f.url+'?brand='+brands[0].id+'#library/products');await p.waitForSelector('.workspace-loader.loading-bars');
 assert.match(await p.locator('.workspace-loader').innerText(),/Loading Duroflex/);assert.equal(await p.locator('.workspace-loader').getAttribute('role'),'status');
 await p.waitForSelector('.workspace-loader.studio-motion-ready svg');assert.equal(await p.locator('.workspace-spinner').isVisible(),false);assert.equal(await p.locator('[data-studio-motion-host]').getAttribute('data-studio-motion-host'),'workspace');
 await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('.workspace-loader svg').getAttribute('aria-hidden'),'true');
 release();await p.unrouteAll({behavior:'wait'});await p.waitForSelector('#productLibrarySearch');assert.equal(await p.locator('.workspace-loader').count(),0);assert.deepEqual(f.errors,[]);
 }finally{release?.();await f.page.unrouteAll({behavior:'wait'});await f.close();}
});

test('Failed project recovery confirms new spending and dispatches once for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,brand]of brands.entries()){
 let posts=0;await p.route('**/api/jobs/job-'+i,async route=>{const response=await route.fetch(),job=await response.json();job.status='failed';job.results=[];await route.fulfill({json:job});});
 await p.route('**/api/jobs/job-'+i+'/resume-work',r=>r.fulfill({json:{brandId:brand.id,canResume:false,reason:'No resumable checkpoint'}}));
 await p.route('**/api/jobs/job-'+i+'/restart',route=>{if(route.request().method()==='POST'){posts++;const body=route.request().postDataJSON();assert.equal(body.brandId,brand.id);assert.equal(body.confirmPaid,true);assert.equal(body.token,'saved-token');return route.fulfill({json:{id:'restarted-'+i}});}return route.fulfill({json:{brandId:brand.id,token:'saved-token',message:'Original work is preserved. New generation charges apply.',cost:{message:'Estimated ₹25–₹35'}}});});
 await p.route('**/api/jobs/restarted-'+i,route=>route.fulfill({json:{id:'restarted-'+i,brandId:brand.id,status:'queued',placements:[],results:[]}}));
 await p.goto(f.url+'?brand='+brand.id+'#progress/job-'+i);await p.waitForSelector('[data-action=restart-project]');
 await p.locator('[data-action=restart-project]').evaluate(b=>{b.click();b.click();});await p.waitForSelector('[data-action=confirm-restart]');assert.equal(posts,0,'Inspecting recovery never spends');assert.match(await p.locator('#restartPanel').innerText(),/additional charges/);await p.locator('[data-action=confirm-restart]').evaluate(b=>{b.click();b.click();});
 await p.waitForURL(new RegExp('#project/restarted-'+i+'$'));assert.equal(posts,1);assert.equal(await p.locator('[data-action=confirm-restart]').count(),0);await p.unrouteAll({behavior:'wait'});
 }assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Tools catalogue filters compact cards and opens the selected brief',{timeout:60000},async()=>{const f=await fixture();try{const p=f.page;await p.setViewportSize({width:850,height:850});for(const brand of brands){await p.goto(f.url+'?brand='+brand.id+'#tools?from=home');await p.waitForSelector('.tool-rail');assert.equal(await p.locator('.tool-visual-card').count(),35);assert.deepEqual(await p.locator('#tool-rail-website strong').allTextContents(),['Website Banner','Product Images','Marketplace A+ Images','Amazon A+ Feature Module','Amazon A+ Lifestyle — Image Header','Amazon Brand Story','Amazon Premium A+ Images','Homepage Category Tile']);assert.deepEqual(await p.locator('#tool-rail-retail strong').allTextContents(),require('../../public/creative-ai/studio-model').retailEntries.map(e=>e.name));assert.deepEqual(await p.locator('#tool-rail-messaging strong').allTextContents(),['WhatsApp Visual','Email Header / Hero','RCS Card Images','Push Notification Image','Push Notification Icons']);assert.deepEqual(await p.locator('#tool-rail-corporate strong').allTextContents(),['LinkedIn Post','LinkedIn Feature Carousel','LinkedIn Story Carousel','Blog / Link Preview']);assert.deepEqual(await p.locator('#tool-rail-social strong').allTextContents(),['Instagram Post','Instagram Story','Instagram Carousel','PMax Image Set']);assert.equal(await p.locator('.tool-planned-card').count(),26);assert.ok(await p.locator('#tool-rail-social').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await p.locator('#toolCatalogueSearch').fill('Story');assert.equal(await p.locator('.tool-visual-card:visible').count(),3);await p.locator('.catalogue-filters').getByRole('button',{name:'Social & campaigns',exact:true}).click();assert.equal(await p.locator('.tool-visual-card:visible').count(),1);await p.locator('#toolCatalogueSearch').fill('no matching asset here');assert.ok(await p.locator('.catalogue-empty').isVisible());await p.locator('#toolCatalogueSearch').fill('');await p.setViewportSize({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Compact catalogue fits a phone viewport');await p.locator('.tool-visual-card[data-id="8"]').click();await p.waitForSelector('#field-brief');assert.deepEqual(f.errors,[]);}}finally{await f.close();}});

test('Home restores persisted workspace while refresh requests are delayed',{timeout:30000},async()=>{const f=await fixture();let release;try{const p=f.page;await p.goto(f.url+'?brand='+brands[0].id+'#home');await p.waitForSelector('.home-page');await p.waitForTimeout(100);const gate=new Promise(r=>release=r);await p.route('**/api/jobs',async r=>{await gate;await r.continue();});await p.reload();await p.waitForSelector('.home-page',{timeout:3000});assert.match(await p.locator('#brandSwitch [aria-pressed=true]').getAttribute('aria-label'),/Duroflex/);assert.equal(await p.locator('.workspace-loader').count(),0);release();}finally{release?.();await f.page.unrouteAll({behavior:'wait'});await f.close();}});

test('Guideline books open without project loading, preserve page URLs and isolate brands',{timeout:30000},async()=>{const f=await fixture();let release;try{const p=f.page;await p.route('**/api/brands',r=>r.fulfill({json:brands.map((b,i)=>({...b,documents:[{id:'doc-book-'+i,name:b.name+' visual world.pptx',format:'pptx',draft:true,bytes:407240392,visuals:[{slide:1},{slide:3}]}]}))}));const gate=new Promise(r=>release=r);await p.route('**/api/jobs',async r=>{await gate;await r.continue();});
 for(let i=0;i<brands.length;i++){const start=Date.now();await p.goto(f.url+'?brand='+brands[i].id+'#library/book/doc-book-'+i);await p.waitForSelector('#bookPage',{timeout:3000});assert.ok(Date.now()-start<3000);assert.equal(await p.locator('#bookPage option').count(),2);assert.match(await p.locator('.book-stage img').getAttribute('src'),/slide-1\.jpg$/);assert.match(await p.locator('h1').innerText(),new RegExp(brands[i].name));await chooseSelect(p,p.locator('#bookPage'),'2');await p.waitForURL(new RegExp('page=2$'));assert.match(await p.locator('.book-stage img').getAttribute('src'),/slide-3\.jpg$/);await p.reload();await p.waitForSelector('#bookPage');assert.equal(await p.locator('#bookPage').inputValue(),'2');await p.goBack();await p.waitForSelector('#bookPage');}
 await p.goto(f.url+'?brand='+brands[1].id+'#library/book/doc-book-0');await p.getByRole('heading',{name:'Book not found',exact:true}).waitFor();assert.equal(await p.locator('.book-stage img').count(),0);assert.equal(f.requests.filter(r=>r.url==='/creative-ai/api/jobs').length,0,'Reading a guideline book must not fetch every project');assert.deepEqual(f.errors,[]);
 }finally{release?.();await f.page.unrouteAll({behavior:'wait'});await f.close();}});

// Exercise repeated navigation against saved fixtures, never production generation.
test('Navigation stress: ten varied return, reload and brand-isolation cycles per brand',{timeout:120000},async()=>{
 const f=await fixture(),coverage=[];
 try{
  const p=f.page;
  for(let round=0;round<10;round++)for(const [index,brand] of brands.entries()){
   const other=brands[1-index],job='job-'+index;
   await p.setViewportSize({width:[1440,850,390,1920,1280][round%5],height:900});
   await p.goto(f.url+'?brand='+brand.id+'#projects?sort=name&q='+brand.name);
   await p.waitForSelector('.project-card');
   assert.equal(await p.locator('#projectSearch').inputValue(),brand.name);
   assert.doesNotMatch(await p.locator('.project-card').innerText(),new RegExp(other.name));
   await p.locator('.project-name').click();await p.waitForSelector('.deliverable-row');
   await p.reload();await p.waitForSelector('.deliverable-row');
   await backToProject(p);await p.waitForSelector('.project-card');
   assert.equal(await p.locator('#projectSearch').inputValue(),brand.name);
   await p.locator('.project-name').click();await p.waitForSelector('.deliverable-row');
   await p.goBack();await p.waitForSelector('.project-card');
   assert.equal(await p.locator('#projectSort').inputValue(),'name');
   await p.evaluate(()=>location.hash='library/products?q=saved');await p.waitForSelector('.product-tile');
   await p.locator('[data-library-tab=brand]').click();await p.waitForURL(/#library(?:\/brand)?$/);
   await p.goBack();await p.waitForSelector('#productLibrarySearch');assert.equal(await p.locator('#productLibrarySearch').inputValue(),'saved');
   const screen=['tools','creatives','search','create','tools/category?group=website'][round%5];
   await p.evaluate(screen=>location.hash=screen,screen);await p.waitForSelector('#taskPanel:not([hidden])');
   await p.reload();await p.waitForSelector('#taskPanel:not([hidden])');
   if(screen.startsWith('tools/category'))await p.locator('[data-nav=home]').click();else await p.locator('[data-action=close-task]').click();await p.waitForSelector('.creation-hero');
   await p.evaluate(id=>location.hash='review/'+id+'/0/1',job);await p.waitForSelector('.focused-art');
   assert.match(await p.locator('.focused-art img').getAttribute('src'),new RegExp(job+'/files/static-exploration'));
   assert.ok(await p.locator('.focused-art').evaluate(el=>el.getBoundingClientRect().width>120),'Selected artwork remains visible at every viewport');
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Review does not overflow the page');
   if(round===2)await p.screenshot({path:path.join(root,'work/studio-ui-regression/screens/mobile-review-'+brand.name+'.png'),fullPage:true});
   await p.evaluate(id=>location.hash='review/'+id+'/0/0','job-'+(1-index));
   await p.getByRole('heading',{name:'Project belongs to '+other.name,exact:true}).waitFor();assert.ok(await p.getByRole('link',{name:'Open in '+other.name,exact:true}).isVisible());assert.equal(await p.locator('.focused-art img').count(),0);assert.equal(await p.locator('#brandSwitch [aria-pressed=true]').getAttribute('aria-label'),brand.name);
   await p.evaluate(()=>location.hash='home');await p.waitForSelector('.creation-hero');
   coverage.push({brand:brand.name,round:round+1,width:p.viewportSize().width,screen,passed:true});
  }
  assert.equal(coverage.length,20);assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
  await fs.writeFile(path.join(root,'work/studio-ui-regression/navigation-cycles.json'),JSON.stringify(coverage,null,2));
 }finally{await f.close();}
});

test('Brand switch removes stale controls before delayed cache restoration in both directions',{timeout:30000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,brand]of brands.entries()){
  await p.goto(f.url+'?brand='+brand.id+'#projects');await p.waitForSelector('.project-card');
  await p.evaluate(()=>{const original=StudioData.restoreWorkspace.bind(StudioData);window.originalRestoreWorkspace=original;StudioData.restoreWorkspace=async id=>{await new Promise(resolve=>window.releaseWorkspace=resolve);return original(id);};});
  await p.locator('[data-brand="'+brands[1-i].id+'"]').click();
  await p.waitForSelector('.workspace-loader');
  assert.equal(await p.locator('.project-card,.project-name').count(),0);
  assert.match(await p.locator('.workspace-loader').innerText(),new RegExp(brands[1-i].name));
  await p.evaluate(()=>{releaseWorkspace();StudioData.restoreWorkspace=originalRestoreWorkspace;});await p.waitForSelector('.project-card');
  assert.match(await p.locator('.project-card').innerText(),new RegExp(brands[1-i].name));
 }
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('PDP packets preserve supplied details and full twelve-slot order in both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;for(const brand of brands){await p.goto(f.url+'?brand='+brand.id);await p.locator('.creation-hero').waitFor();const id=await p.evaluate(()=>{const d=StudioModel.startDraft(activeBrand.id,'quick',5);d.brief='Preserve my full product set';const o=d.outputs[0];o.pdpPack=true;o.width=o.height=1600;o.formatId='custom';o.staticParts=StudioModel.pdpSlots.map((name,i)=>({id:'slot-'+i,name,copy:'Exact supplied '+i,width:1600,height:1600}));StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;return d.id;});await p.locator('.asset-requirements-overview').waitFor();assert.match(await p.locator('.asset-requirements-overview').innerText(),/12 images/);await p.locator('#field-brief').fill('Updated full packet brief');await settleAutosave(p);await p.reload();await p.locator('#field-brief').waitFor();const saved=await p.evaluate(id=>{const d=StudioModel.storage(localStorage).read(activeBrand.id,id);return {brandId:d.brandId,parts:d.outputs[0].staticParts,slots:StudioModel.pdpSlots};},id);assert.equal(saved.brandId,brand.id);assert.deepEqual(saved.parts.map(v=>v.name),saved.slots);assert.equal(saved.parts[11].copy,'Exact supplied 11');}assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);}finally{await f.close();}
});

test('Compact laptop views preserve creation actions and preview shimmer respects loading and reduced motion',{timeout:30000},async()=>{
 const f=await fixture();try{
 const p=f.page,pending=[];await p.route('**/files/**',route=>{pending.push(route);});
 for(const size of [{width:1366,height:768},{width:1440,height:900}]){
  await p.setViewportSize(size);await p.goto(f.url+'?brand='+brands[0].id+'#home',{waitUntil:'domcontentloaded'});await p.waitForSelector('.creation-hero');
  assert.equal(await p.locator('#homeBrief').count(),1);assert.equal(await p.getByRole('button',{name:'Create',exact:true}).count(),1);assert.equal(await p.getByRole('button',{name:'Choose formats yourself',exact:true}).count(),1); // 8 Nov 2026 brief box
  await p.locator('[data-nav=projects]').click();await p.waitForSelector('.project-cover.has-artwork');
  const cover=p.locator('.project-cover.has-artwork').first();await p.waitForFunction(()=>{const r=document.querySelector('.project-cover.has-artwork')?.getBoundingClientRect();return r&&r.width>0&&Math.abs(r.height-Math.min(r.width,280))<2;});assert.ok(await cover.evaluate(el=>{const r=el.getBoundingClientRect();return Math.abs(r.height-Math.min(r.width,280))<2;}),'Square preview reserves its size within the gallery height cap');
  assert.equal(await cover.evaluate(el=>getComputedStyle(el,'::after').animationName),'preview-shimmer');
  await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await cover.evaluate(el=>getComputedStyle(el,'::after').animationName),'none');await p.emulateMedia({reducedMotion:'no-preference'});
  await p.screenshot({path:path.join(root,'work/studio-ui-regression/screens/compact-projects-'+size.width+'.png')});
 }
 for(const route of pending.splice(0))await route.continue().catch(()=>{});await p.unroute('**/files/**');await p.reload();await p.waitForSelector('.project-cover.preview-loaded');
 assert.equal(await p.locator('.project-cover.preview-loaded').first().evaluate(el=>getComputedStyle(el,'::after').content),'none');
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('Masonry Projects and Favourites preserve mixed artwork ratios, resize and open exact items for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{
 const p=f.page,sharp=require('sharp'),sizes=[[600,600],[400,700],[1000,300],[600,450],[400,600],[800,400]],images=await Promise.all(sizes.map(([width,height],i)=>sharp({create:{width,height,channels:3,background:{r:120+i*15,g:110,b:170}}}).png().toBuffer()));
 await p.route('**/creative-ai/api/jobs',route=>route.fulfill({json:brands.flatMap((b,bi)=>sizes.map((_,i)=>({id:'board-'+bi+'-'+i,brandId:b.id,status:'finished',createdAt:'2026-10-23T10:00:00Z'})))}));
 await p.route('**/creative-ai/api/jobs/board-*',route=>{const parts=new URL(route.request().url()).pathname.split('/');if(parts.includes('files'))return route.fallback();const id=parts.at(-1),[,bi,n]=id.split('-'),i=Number(n);return route.fulfill({json:{id,brandId:brands[Number(bi)].id,status:'finished',createdAt:'2026-10-23T10:00:00Z',updatedAt:'2026-10-23T10:00:00Z',productSummary:{name:'Board fixture '+i},placements:[{id:'art',name:'Mixed artwork '+i,dimensions:{width:sizes[i][0],height:sizes[i][1]}}],results:[{route:'continuity',placementId:'art',ready:true,imageUrl:'/creative-ai/api/jobs/'+id+'/files/board-'+i+'.png'}]}});});
 await p.route('**/files/board-*.png',route=>{const i=Number(route.request().url().match(/board-(\d+)\.png/)[1]);return route.fulfill({contentType:'image/png',body:images[i]});});
 for(const b of brands){
 await p.setViewportSize({width:1366,height:768});await p.goto(f.url+'?brand='+b.id+'#projects');await p.waitForSelector('.project-cover.preview-loaded');assert.equal(await p.locator('.creative-board .project-card').count(),6);
 await p.locator('.project-cover img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
 const check=async selector=>{for(const img of await p.locator(selector+' img').all()){const v=await img.evaluate(el=>{const r=el.getBoundingClientRect();return {ratio:r.width/r.height,natural:el.naturalWidth/el.naturalHeight,fit:getComputedStyle(el).objectFit};});assert.ok(Math.abs(v.ratio-v.natural)<.015);assert.equal(v.fit,'contain');}};
 // Image decoding can finish before the requestAnimationFrame that lays out the board.
 await p.waitForSelector('.creative-board[data-masonry-ready="true"]');
 await check('.project-gallery');assert.ok(Number(await p.locator('.creative-board').getAttribute('data-columns'))>=3);
 await p.screenshot({path:path.join(root,'work/studio-ui-regression/screens/masonry-projects-'+b.id+'.png'),fullPage:true});
 for(const button of await p.locator('.project-card [data-action=org-favourite]').all())await button.click();
 await p.locator('[data-nav=favourites]').click();await p.waitForSelector('.saved-card');assert.equal(await p.locator('.saved-grid.creative-board .saved-card').count(),6);await p.locator('.saved-artwork img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));await check('.saved-grid');
 await p.screenshot({path:path.join(root,'work/studio-ui-regression/screens/masonry-favourites-'+b.id+'.png'),fullPage:true});
 for(const width of [1440,900,390]){await p.setViewportSize({width,height:900});await p.waitForFunction(()=>[...document.querySelectorAll('.creative-board')].every(el=>el.scrollWidth<=el.clientWidth+1));assert.ok(await p.locator('.creative-board').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await check('.saved-grid');}
 await p.setViewportSize({width:1366,height:768});const href=await p.locator('.saved-artwork').first().getAttribute('href');await p.locator('.saved-artwork').first().click();assert.ok(p.url().endsWith(href));await p.waitForSelector('.deliverable-row');
 }assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});

test('Multi-page collections: Carousel, full PDP and A+ open together, preserve option and bookmark as one set for both brands',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,brand] of brands.entries()){
  const id='job-'+i,placements=[...Array.from({length:3},(_,n)=>({id:'carousel'+n,name:'Slide '+(n+1),dimensions:{width:1080,height:1350},carousel:{id:'carousel',name:'Instagram carousel',index:n+1,count:3}})),...Array.from({length:12},(_,n)=>({id:'pdp'+n,name:'PDP slot '+(n+1),dimensions:{width:1600,height:1600},pdp:{id:'pdp',index:n+1,count:12}})),...Array.from({length:3},(_,n)=>({id:'custom_recipe-marketplace-module-0'+(n+1),name:'Module '+(n+1),dimensions:{width:970,height:600}})),{id:'feed',name:'Feed post',dimensions:{width:1080,height:1080}}];
  const job={id,brandId:brand.id,status:'running',createdAt:'2026-10-23T10:00:00Z',intake:{campaignName:brand.name+' grouped launch'},placements,results:placements.flatMap((v,n)=>(n%2?['exploration','continuity']:['continuity','exploration']).filter(route=>!(v.id==='pdp1'&&route==='exploration')).map(route=>({route,placementId:v.id,ready:true,imageUrl:'/creative-ai/api/jobs/'+id+'/files/'+v.id+'-'+route+'.png'})))};
  await p.route('**/api/jobs/'+id,route=>route.fulfill({json:job}));
  await p.goto(f.url+'?brand='+brand.id+'#project/'+id);await p.waitForSelector('.deliverable-row');assert.equal(await p.locator('.deliverable-row').count(),4);assert.match(await p.locator('.deliverable-row').nth(1).innerText(),/12 pages/);
  await p.locator('.deliverable-row').first().locator('[data-action=open-output]').click();await p.waitForSelector('.collection-page');assert.equal(await p.locator('#main .collection-page').count(),3);
  await p.locator('[data-action=focus-option][data-index="1"]').click();await p.waitForFunction(()=>document.querySelector('.focused-art img').src.includes('exploration'));
  await p.locator('#main .collection-page').nth(1).click();await p.waitForFunction(()=>document.querySelector('.focused-art img').src.includes('carousel1-exploration'));assert.match(p.url(),/review\/job-\d\/1\/0/);
  await p.locator('[data-action=select-option]').click();assert.equal(await p.locator('[data-action=select-option]').innerText(),'Selected');await p.locator('[data-action=collection-favourite]').click();await p.locator('[data-nav=favourites]').click();await p.waitForSelector('.saved-card');assert.equal(await p.locator('.saved-card').count(),1);assert.match(await p.locator('.saved-card').innerText(),/3 pages/);await p.reload();await p.waitForSelector('.saved-card');assert.equal(await p.locator('.saved-card').count(),1);await p.locator('.saved-artwork').click();await p.waitForSelector('.collection-page');assert.equal(await p.locator('#main .collection-page').count(),3);
  // Editor page navigation is given exact image identities and passes the existing save/close guard.
  await p.evaluate(()=>{window.__collectionEdit=[];window.__collectionClose=0;window.__blockCollectionClose=true;EditableCanvas.open=async(key,options)=>{__collectionEdit.push({key,image:options.sourceImageUrl});let d=document.querySelector('#editableDialog');if(!d){d=document.createElement('dialog');d.id='editableDialog';document.body.append(d);}d.innerHTML='<div class="ec-shell"></div>';d.showModal();};EditableCanvas.close=async()=>{__collectionClose++;if(__blockCollectionClose)return false;document.querySelector('#editableDialog').close();return true;};});
  await p.locator('[data-action=edit-image]').click();await p.waitForSelector('#editableDialog[open] .collection-page');assert.equal(await p.locator('#editableDialog .collection-page').count(),3);const editorURL=p.url();await p.locator('#editableDialog .collection-page').nth(2).click();await p.waitForFunction(()=>__collectionClose===1);assert.equal(p.url(),editorURL);assert.equal(await p.evaluate(()=>__collectionEdit.length),1);await p.evaluate(()=>__blockCollectionClose=false);await p.locator('#editableDialog .collection-page').nth(2).click();await p.waitForFunction(()=>__collectionEdit.length===2);assert.equal(await p.evaluate(()=>__collectionEdit[1].key),'exploration|carousel2');assert.equal(await p.evaluate(()=>__collectionClose),2);
  await p.evaluate(()=>location.hash='review/'+currentJob.id+'/3/0');await p.waitForSelector('h1');await p.waitForSelector('.collection-page');assert.equal(await p.locator('#main .collection-page').count(),12);assert.equal(await p.locator('#main .collection-page.unavailable').count(),1);assert.match(await p.locator('#main .collection-heading').innerText(),/11\/12 available/);assert.ok(await p.locator('[data-action=select-option]').isDisabled());await p.locator('[data-action=collection-favourite]').click();await p.locator('[data-nav=favourites]').click();await p.waitForSelector('.saved-card');assert.equal(await p.locator('.saved-card').count(),2);assert.match(await p.locator('.saved-card').filter({hasText:'PDP image set'}).innerText(),/Saved image|Review before sharing/);
  await p.goto(f.url+'?brand='+brand.id+'#review/'+id+'/15/0');await p.waitForSelector('.collection-page');assert.equal(await p.locator('#main .collection-page').count(),3);assert.match(await p.locator('#main .collection-heading').innerText(),/A\+ content/);
  await p.evaluate(()=>location.hash='projects');await p.waitForSelector('.project-card');assert.match(await p.locator('.collection-count').innerText(),/3 pages/);
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>location.hash='review/job-'+(activeBrand.id.includes('sleepyhead')?1:0)+'/0/0');await p.waitForSelector('.collection-page-strip');assert.ok(await p.locator('#main .collection-page-strip').evaluate(e=>e.scrollWidth>=e.clientWidth));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.setViewportSize({width:1440,height:1000});
  await p.evaluate(()=>location.hash='creatives');await p.waitForSelector('.creative-picker-card');assert.equal(await p.locator('.creative-picker-card').count(),8,'Editor chooser also keeps each direction of a set together');await p.unroute('**/api/jobs/'+id);
 }
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Collection pages fit the real canvas editor on laptop and mobile and switch exact saved pages for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,brand]of brands.entries()){
  const id='job-'+i,placements=Array.from({length:3},(_,n)=>({id:'page'+n,name:'Slide '+(n+1),dimensions:{width:1080,height:1080},carousel:{id:'slides',name:'Carousel',index:n+1,count:3}})),job={id,brandId:brand.id,status:'finished',createdAt:'2026-10-23T00:00:00Z',intake:{campaignName:brand.name+' multipage editor'},placements,results:placements.map(v=>({route:'continuity',placementId:v.id,ready:false,imageUrl:'/creative-ai/api/jobs/'+id+'/files/'+v.id+'.png'}))};
  await p.route('**/api/jobs/'+id,route=>route.fulfill({json:job}));
  await p.route('**/api/jobs/'+id+'/editable/**',route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/resources'))return route.fulfill({json:{fonts:[],assets:[]}});if(url.pathname.endsWith('/ai'))return route.fulfill({json:[]});const doc={version:1,brandId:brand.id,canvas:{width:1080,height:1080},safeMargin:20,fonts:[],assets:[],objects:[]};return route.fulfill({json:{route:'continuity',placementId:url.pathname.split('/').at(-1),revision:0,document:doc,original:doc,history:[{revision:0}],copies:[]}});});
  await p.setViewportSize({width:1366,height:768});await p.goto(f.url+'?brand='+brand.id+'#review/'+id+'/0/0');await p.waitForSelector('.focused-art');await p.locator('[data-action=edit-image]').click();await p.waitForSelector('#editableDialog .collection-page');assert.equal(await p.locator('#editableDialog .collection-page').count(),3);
  for(const size of [{width:1366,height:768},{width:390,height:844}]){await p.setViewportSize(size);await p.waitForTimeout(80);const box=await p.locator('#editableDialog .collection-pages').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=size.height+1,'Page strip fits the viewport');assert.ok(await p.locator('#editableDialog .ec-stage canvas').first().isVisible());}
  await p.locator('#editableDialog .collection-page').nth(2).click();await p.waitForURL(/placement=page2/);await p.waitForFunction(()=>document.querySelector('#editableDialog[open] .collection-page[aria-current=page]')?.getAttribute('aria-label').startsWith('Page 3:'));assert.match(await p.locator('#editableDialog .collection-page[aria-current=page]').getAttribute('aria-label'),/Page 3/);await p.locator('#editableDialog [data-ec=close]').click();await p.waitForSelector('#main .collection-pages');assert.equal(await p.locator('#editableDialog[open]').count(),0);await p.unrouteAll({behavior:'wait'});
 }
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

async function collectionSafetyFixture(brandIndex=0){
 const f=await fixture(),p=f.page,brand=brands[brandIndex],id='job-'+brandIndex;
 const placements=Array.from({length:12},(_,n)=>({id:'page'+n,name:'PDP slot '+(n+1),dimensions:{width:1080,height:1080},pdp:{id:'pack',index:n+1,count:12}}));
 const job={id,brandId:brand.id,status:'finished',createdAt:'2026-10-23T00:00:00Z',intake:{campaignName:brand.name+' collection safety'},placements,results:placements.map(v=>({route:'continuity',placementId:v.id,ready:false,imageUrl:'/creative-ai/api/jobs/'+id+'/files/'+v.id+'.png'}))};
 const font={id:'fixture-font',family:'FixtureFont',weight:400,url:'data:font/ttf;base64,'+(await fs.readFile('/System/Library/Fonts/Supplemental/Arial.ttf')).toString('base64')};
 const documents=new Map();let fail=false;
 const stateFor=placement=>{if(!documents.has(placement)){const document={version:1,brandId:brand.id,canvas:{width:1080,height:1080},safeMargin:20,fonts:[font],assets:[],objects:[]};documents.set(placement,{jobId:id,route:'continuity',placementId:placement,revision:0,document,original:structuredClone(document),history:[{revision:0}],copies:[]});}return documents.get(placement);};
 await p.route('**/api/jobs/'+id,r=>r.fulfill({json:job}));
 await p.route('**/api/jobs/'+id+'/editable/**',r=>{const u=new URL(r.request().url()),parts=u.pathname.split('/'),placement=parts[7];if(u.pathname.endsWith('/resources'))return r.fulfill({json:{fonts:[font],assets:[]}});if(u.pathname.endsWith('/ai'))return r.fulfill({json:[]});const state=stateFor(placement);if(r.request().method()==='POST'){if(fail)return r.fulfill({status:503,json:{error:'Offline save fixture'}});const body=r.request().postDataJSON();state.revision++;state.document=body.document;state.updatedAt=new Date().toISOString();state.history.push({revision:state.revision});}return r.fulfill({json:state});});
 const open=async page=>{await p.goto(f.url+'?brand='+brand.id+'#review/'+id+'/'+page+'/0');await p.waitForSelector('.focused-art');await p.locator('[data-action=edit-image]').click();await p.waitForSelector('#editableDialog[open] .collection-pages');};
 return {...f,job,documents,open,setSaveFailure:v=>fail=v};
}

test('Collection safety: opening the final page keeps it visible and announces page identity for both brands',{timeout:60000},async()=>{
 for(let i=0;i<2;i++){const f=await collectionSafetyFixture(i);try{const p=f.page;await p.setViewportSize({width:1366,height:768});await f.open(11);const nav=p.locator('#editableDialog .collection-page-strip'),current=p.locator('#editableDialog .collection-page[aria-current=page]'),a=await nav.boundingBox(),b=await current.boundingBox();assert.ok(b.x>=a.x&&b.x+b.width<=a.x+a.width+1,'The selected page must be visible in a long collection');assert.match(await p.locator('#editableDialog').getAttribute('aria-label'),/Page 12 of 12/);assert.match(await p.locator('.ec-title').innerText(),/Page 12 of 12/);assert.deepEqual(f.errors,[]);}finally{await f.close();}}
});

test('Collection safety: failed saves block page switching, cancel keeps the edit, and page histories stay isolated',{timeout:60000},async()=>{
 for(let i=0;i<2;i++){const f=await collectionSafetyFixture(i);try{const p=f.page;await f.open(0);f.setSaveFailure(true);const original=p.url();await p.locator('#editableDialog [data-panel=elements]').click();await p.locator('[data-ec=add-text]').click();await p.locator('#editableDialog .collection-page').nth(1).click();await p.waitForSelector('#ecActionPanel:not([hidden])');assert.equal(await p.locator('#editableDialog .collection-pages').evaluate(el=>el.inert),true,'Page navigation must be disabled during the unsaved-change decision');await p.locator('[data-ec=inline-cancel]').click();await p.waitForURL(original);assert.equal(await p.evaluate(()=>EditableCanvas.hasUnsavedChanges()),true);assert.equal(await p.locator('#editableDialog [data-layer]').count(),1);assert.equal(await p.locator('#editableDialog .collection-pages').evaluate(el=>el.inert),false);
  // Reconnect, switch, then reopen: only the edited page acquires a revision.
  f.setSaveFailure(false);await p.locator('[data-ec=save]').click();await p.waitForFunction(()=>document.querySelector('#ecStatus').textContent==='All changes saved');await p.locator('#editableDialog .collection-page').nth(1).click();await p.waitForFunction(()=>document.querySelector('#editableDialog[open] .collection-page[aria-current=page]')?.getAttribute('aria-label').startsWith('Page 2:'));assert.equal(await p.locator('#editableDialog [data-layer]').count(),0);await p.locator('#editableDialog .collection-page').first().click();await p.waitForFunction(()=>document.querySelector('#editableDialog[open] .collection-page[aria-current=page]')?.getAttribute('aria-label').startsWith('Page 1:'));assert.equal(await p.locator('#editableDialog [data-layer]').count(),1);assert.equal(f.documents.get('page0').revision,1);assert.equal(f.documents.get('page1').revision,0);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}}
});

test('Collection safety: a collection bookmark is one atomic write, even with restrictive browser storage',{timeout:60000},async()=>{
 for(let i=0;i<2;i++){const f=await collectionSafetyFixture(i);try{const p=f.page;await p.goto(f.url+'?brand='+brands[i].id+'#review/'+f.job.id+'/0/0');await p.waitForSelector('[data-action=collection-favourite]');await p.evaluate(()=>{window.orgWrites=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('studio-organise-v1:')&&++window.orgWrites===2)throw Error('Storage write interrupted');return original.call(this,k,v);};});await p.locator('[data-action=collection-favourite]').click();assert.equal(await p.evaluate(()=>orgWrites),1,'One collection should be saved in one transaction');const value=await p.evaluate(brand=>JSON.parse(localStorage.getItem('studio-organise-v1:'+brand)),brands[i].id);assert.equal(Object.values(value.entries).filter(m=>m.favourite).length,12);assert.deepEqual(f.errors,[]);}finally{await f.close();}}
});

test('Collection safety: page export is explicit, numbered, and blocks page switches until download completes',{timeout:60000},async()=>{
 for(let i=0;i<2;i++){const f=await collectionSafetyFixture(i);let release;try{const p=f.page,gate=new Promise(r=>release=r),png=await require('sharp')({create:{width:16,height:16,channels:3,background:'#bbbbbb'}}).png().toBuffer();await p.route('**/editable/continuity/page11/export',async r=>{await gate;return r.fulfill({contentType:'image/png',body:png});});await f.open(11);assert.match(await p.locator('[data-ec=export]').innerText(),/Download page/);const download=p.waitForEvent('download');await downloadEditor(p);await p.waitForFunction(()=>document.querySelector('#editableDialog .collection-pages').inert);const before=p.url();await p.locator('#editableDialog .collection-page').nth(10).click({force:true});assert.equal(p.url(),before);release();const result=await download;assert.match(result.suggestedFilename(),/_Page-12_/);await p.waitForFunction(()=>!document.querySelector('#editableDialog .collection-pages').inert);assert.deepEqual(f.errors,[]);}finally{release?.();await f.page.unrouteAll({behavior:'wait'});await f.close();}}
});

test('Collection safety: an existing AI action locks page navigation and a terminal failure unlocks it without new paid dispatch',{timeout:30000},async()=>{
 for(let i=0;i<2;i++){const f=await collectionSafetyFixture(i);try{const p=f.page;let status='running',paid=0;await p.route('**/editable/continuity/page0/ai',r=>{if(r.request().method()!=='GET')paid++;return r.fulfill({json:[{id:'existing-action',action:'rewrite-copy',status}]});});await f.open(0);await p.waitForFunction(()=>document.querySelector('#editableDialog .collection-pages').inert);assert.equal(paid,0);status='failed';await p.waitForFunction(()=>!document.querySelector('#editableDialog .collection-pages').inert,{},{timeout:6000});assert.equal(paid,0);assert.match(p.url(),/placement=page0/);assert.deepEqual(f.errors,[]);}finally{await f.close();}}
});

test('Collection safety: passing page checks cannot hide a failed collection review in Favourites',{timeout:30000},async()=>{
 for(let i=0;i<2;i++){const f=await collectionSafetyFixture(i);try{const p=f.page;f.job.results.forEach(r=>r.ready=true);f.job.pdpPacks=[{route:'continuity',ready:false,slots:f.job.results.map(r=>({placementId:r.placementId,imageUrl:r.imageUrl,ready:true}))}];await p.goto(f.url+'?brand='+brands[i].id+'#review/'+f.job.id+'/0/0');await p.waitForSelector('[data-action=collection-favourite]');await p.locator('[data-action=collection-favourite]').click();await p.locator('[data-nav=favourites]').click();await p.waitForSelector('.saved-card');assert.match(await p.locator('.saved-card .status').innerText(),/Saved image|Review before sharing/);assert.deepEqual(f.errors,[]);}finally{await f.close();}}
});

test('Custom module packets retain all twenty-one supplied items across reload for both brands',{timeout:45000},async()=>{
 const f=await fixture();try{const p=f.page;for(const brand of brands){await p.goto(f.url+'?brand='+brand.id);await p.locator('.creation-hero').waitFor();const id=await p.evaluate(()=>{const d=StudioModel.startDraft(activeBrand.id,'quick',6);d.brief='Keep the complete module set';d.focus='brand';d.outputs[0].staticParts=Array.from({length:21},(_,i)=>({id:'module-'+i,name:'Module '+(i+1),copy:'Exact '+i,width:970,height:600}));StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;return d.id;});await p.locator('.asset-requirements-overview').waitFor();assert.match(await p.locator('.asset-requirements-overview').innerText(),/21 images/);await p.locator('#field-brief').fill('Keep all supplied module instructions');await settleAutosave(p);await p.reload();await p.locator('.asset-requirements-overview').waitFor();const saved=await p.evaluate(id=>StudioModel.storage(localStorage).read(activeBrand.id,id),id);assert.equal(saved.outputs[0].staticParts.length,21);assert.equal(saved.outputs[0].staticParts[19].copy,'Exact 19');}assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);}finally{await f.close();}
});

test('Home density: three long project titles, composer and compact format shortcuts fit laptop screens for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,brand] of brands.entries()){
  const ids=Array.from({length:3},(_,n)=>'density-'+i+'-'+n),name='Duropedic Airboost 6.8 Arctic Ice Mattress | Airknit fibres with latex and adjustable firmness | 100 nights trial';
  await p.route('**/api/jobs',r=>r.fulfill({json:ids.map(id=>({id,brandId:brand.id,status:'finished',createdAt:'2026-10-23T00:00:00Z'}))}));
  await p.route('**/api/jobs/density-*',r=>r.fulfill({json:{id:new URL(r.request().url()).pathname.split('/').pop(),brandId:brand.id,status:'finished',createdAt:'2026-10-23T00:00:00Z',intake:{campaignName:name},placements:[{id:'square',name:'Instagram post',dimensions:{width:1080,height:1080}}],results:[{route:'continuity',placementId:'square',ready:false,imageUrl:'/creative-ai/api/jobs/job-'+i+'/files/static-continuity.png'}]}}));
  for(const size of [{width:1366,height:768},{width:1440,height:900},{width:1728,height:995},{width:1920,height:1080},{width:1024,height:768},{width:390,height:844}]){
   await p.setViewportSize(size);await p.goto(f.url+'?brand='+brand.id+'#home');await p.waitForSelector('.continue-card');assert.equal(await p.locator('.continue-card').count(),3);assert.ok(await p.locator('.home-page').evaluate(el=>el.getBoundingClientRect().width<=1361));{const o=await p.evaluate(()=>({ok:document.documentElement.scrollWidth<=innerWidth,wide:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,4).map(e=>e.tagName+'.'+String(e.className).split(' ').slice(0,2).join('.')+' right='+Math.round(e.getBoundingClientRect().right))}));assert.equal(o.ok,true,'No sideways scroll at '+size.width+'px: '+o.wide.join(', '));}
   for(const name of ['Create','Choose formats yourself']){const button=p.getByRole('button',{name,exact:true});assert.ok(await button.isVisible());assert.ok(await button.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));}
   assert.equal(await p.locator('.format-tile').count(),6);
   if(size.width>=1200){assert.ok(await p.locator('.creation-hero').evaluate(el=>el.getBoundingClientRect().height<=520),'Hero (now with the brief box) leaves room for work and shortcuts');const composer=await p.locator('.home-create-actions').boundingBox();assert.ok(composer.y+composer.height<size.height-16,'Creation actions stay above the laptop fold while artwork takes priority over shortcuts');}
   if(size.width<700)assert.ok(await p.getByRole('button',{name:'Create',exact:true}).evaluate(el=>el.getBoundingClientRect().height>=44),'Mobile actions keep a usable touch target');
  }
  await p.unrouteAll({behavior:'wait'});
 }
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Adaptive Home uses available width and height, reflows with the sidebar, and stays usable at scaled desktop widths',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){
  for(const size of [{width:1366,height:600},{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080},{width:2560,height:1440},{width:3440,height:1440},{width:1100,height:800},{width:1024,height:768},{width:960,height:600},{width:853,height:480},{width:768,height:1024},{width:390,height:844},{width:320,height:568}]){
   await p.setViewportSize(size);await p.goto(f.url+'?brand='+brand.id+'#home');await p.waitForSelector('.creation-hero');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No sideways page scrolling at '+size.width+' × '+size.height+' '+JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,id:e.id,cls:typeof e.className==='string'?e.className:'',right:Math.round(e.getBoundingClientRect().right)})).filter(e=>e.right>innerWidth+1).slice(0,12))));
   for(const label of ['Create','Choose formats yourself']){const b=p.getByRole('button',{name:label,exact:true});assert.ok(await b.isVisible());assert.ok(await b.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&el.scrollWidth<=el.clientWidth+1;}),'Creation control stays readable at '+size.width);}
   assert.ok(await p.locator('#creationTitle').evaluate(el=>{const r=el.getBoundingClientRect();return r.width>0&&el.scrollWidth<=el.clientWidth+1;}),'Existing font stays visible without clipping');
  }
  // Same screen width: short windows get tighter spacing without hiding controls.
  await p.setViewportSize({width:1366,height:600});const short=await p.locator('.creation-hero').boundingBox();await p.setViewportSize({width:1366,height:1000});const tall=await p.locator('.creation-hero').boundingBox();assert.ok(tall.height>short.height+15,'Vertical spacing responds to window height');
  // Sidebar collapse changes usable content width without changing screen resolution.
  await p.setViewportSize({width:1100,height:800});await p.evaluate(()=>localStorage.setItem('creative-ai-sidebar','expanded'));await p.reload();await p.waitForSelector('.format-grid');const expandedWidth=(await p.locator('.format-grid').boundingBox()).width;assert.equal(await p.locator('.format-tile').count(),6);await p.locator('#sidebarToggle').click();await p.waitForFunction(w=>document.querySelector('.format-grid').getBoundingClientRect().width>w,expandedWidth);assert.equal(await p.evaluate(()=>innerWidth),1100);
 }
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Home keeps the same readable layout at equal CSS viewport sizes across standard and high-density screens',{timeout:60000},async()=>{
 const f=await fixture();try{for(const brand of brands){let baseline;
 for(const deviceScaleFactor of [1,1.25,1.5,2,3]){const context=await f.browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor}),p=await context.newPage();try{await p.goto(f.url+'?brand='+brand.id+'#home');await p.waitForSelector('.creation-hero');const result=await p.evaluate(()=>{const r=document.querySelector('.creation-hero').getBoundingClientRect();return {width:r.width,height:r.height,dpr:devicePixelRatio,font:parseFloat(getComputedStyle(document.querySelector('#homeBrief')).fontSize)};});assert.equal(result.dpr,deviceScaleFactor);assert.ok(result.font>=13);if(baseline){assert.ok(Math.abs(result.width-baseline.width)<1);assert.ok(Math.abs(result.height-baseline.height)<1);}else baseline=result;}finally{await context.close();}}
 }}finally{await f.close();}
});

test('Visual Continue working cards keep long names accessible, show collections compactly and reopen the chosen option for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [i,brand]of brands.entries()){
  const id='job-'+i,name=brand.name+' mattress launch | Airknit fibres and adjustable firmness | 100 nights trial',job={id,brandId:brand.id,status:'finished',createdAt:'2026-10-23T00:00:00Z',intake:{campaignName:name},placements:Array.from({length:3},(_,n)=>({id:'slide'+n,name:'Slide '+(n+1),dimensions:{width:1080,height:1080},carousel:{id:'carousel',index:n+1,count:3}})),results:Array.from({length:3},(_,n)=>['continuity','exploration'].map(route=>({placementId:'slide'+n,route,ready:false,imageUrl:'/creative-ai/api/jobs/'+id+'/files/slide'+n+'-'+route+'.png'}))).flat()};
  await p.route('**/api/jobs/'+id,r=>r.fulfill({json:job}));await p.setViewportSize({width:1366,height:768});await p.goto(f.url+'?brand='+brand.id+'#home');await p.waitForSelector('.continue-card');await p.locator('.continue-card img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));await p.waitForFunction(()=>document.querySelector('.continue-grid')?.dataset.masonryReady==='true');await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const card=p.locator('.continue-card');assert.equal(await card.evaluate(el=>el.tagName),'ARTICLE');assert.equal(await card.locator('.continue-preview').count(),1);assert.equal(await card.locator('strong').innerText(),brand.name+' mattress launch');assert.equal(await card.locator('.continue-card-copy small').innerText(),'Carousel · 3 pages');assert.ok((await card.locator('.continue-preview').getAttribute('aria-label')).includes(name));assert.ok(await card.locator('.continue-preview').getAttribute('title'));assert.ok(await card.locator('.continue-preview').evaluate(el=>el.getBoundingClientRect().width>=80));const geometry=await card.evaluate(el=>{const art=el.querySelector('.continue-preview').getBoundingClientRect(),copy=el.querySelector('.continue-card-copy').getBoundingClientRect();return {artHeight:art.height,cardHeight:el.getBoundingClientRect().height,artBottom:art.bottom,copyTop:copy.top,fit:getComputedStyle(el.querySelector('img')).objectFit};});assert.ok(geometry.copyTop>=geometry.artBottom,'Caption sits below the artwork');assert.ok(geometry.artHeight/geometry.cardHeight>=.65,'Artwork is the dominant part of the card');assert.equal(geometry.fit,'contain','The complete artwork stays visible');
  await card.locator('.continue-preview').focus();await p.keyboard.press('Enter');await p.waitForSelector('.option-card');await p.locator('[data-action=focus-option][data-index="1"]').click();await p.locator('[data-action=select-option]').click();await p.locator('[data-nav=home]').click();await p.waitForSelector('.continue-card');assert.match(await p.locator('.continue-card .continue-preview').getAttribute('href'),new RegExp('#review/'+id+'/0/1$'));assert.match(await p.locator('.continue-preview img').getAttribute('src'),/exploration/);await p.locator('.continue-card .continue-preview').click();await p.waitForSelector('.focused-art');assert.match(await p.locator('.focused-art img').getAttribute('src'),/exploration/);
  await p.unroute('**/api/jobs/'+id);
 }
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});


test('Home artwork board shows more than three projects, preserves mixed ratios and reflows for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page,sharp=require('sharp'),sizes=Array.from({length:9},(_,i)=>[[480,480],[320,640],[960,320]][i%3]),images=await Promise.all(sizes.map(([width,height])=>sharp({create:{width,height,channels:3,background:'#b7a3d1'}}).png().toBuffer()));
 await p.route('**/api/jobs',r=>r.fulfill({json:brands.flatMap((b,bi)=>sizes.map((_,i)=>({id:'homeboard-'+bi+'-'+i,brandId:b.id,status:'finished',createdAt:'2026-10-23T00:00:00Z'})))}));
 await p.route('**/api/jobs/homeboard-*',r=>{if(r.request().url().includes('/files/'))return r.fallback();const id=new URL(r.request().url()).pathname.split('/').pop(),[,bi,n]=id.split('-'),i=Number(n);return r.fulfill({json:{id,brandId:brands[Number(bi)].id,status:'finished',createdAt:'2026-10-23T00:00:00Z',intake:{campaignName:'Artwork '+i},placements:[{id:'art',name:'Artwork '+i,dimensions:{width:sizes[i][0],height:sizes[i][1]}}],results:[{placementId:'art',route:'continuity',ready:false,imageUrl:'/creative-ai/api/jobs/'+id+'/files/homeboard-'+i+'.png'}]}});});
 await p.route('**/files/homeboard-*.png',r=>r.fulfill({contentType:'image/png',body:images[Number(r.request().url().match(/homeboard-(\d+)\.png/)[1])]}));
 for(const brand of brands){
  await p.goto(f.url+'?brand='+brand.id+'#home');await p.waitForSelector('.continue-card img');await p.locator('.continue-card img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  for(const size of [{width:1366,height:768},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:320,height:568}]){
   await p.setViewportSize(size);await p.waitForFunction(()=>document.querySelector('.continue-grid').dataset.masonryReady==='true');await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const boxes=await p.locator('.continue-card').evaluateAll(cards=>cards.map(el=>{const a=el.querySelector('.continue-preview').getBoundingClientRect(),img=el.querySelector('img'),r=img.getBoundingClientRect(),copy=el.querySelector('.continue-card-copy').getBoundingClientRect(),card=el.getBoundingClientRect();return {x:card.x,y:card.y,right:card.right,bottom:card.bottom,ratio:r.width/r.height,natural:img.naturalWidth/img.naturalHeight,artWidth:a.width,artHeight:a.height,width:r.width,height:r.height,caption:copy.top,artBottom:a.bottom};}));
   assert.equal(boxes.length,9,'All nine eligible projects remain visible');for(const b of boxes){assert.ok(Math.abs(b.ratio-b.natural)<.01,'Artwork keeps its natural proportions');assert.ok(Math.abs(b.artWidth-b.width)<1&&Math.abs(b.artHeight-b.height)<1,'Preview has no added side or top bands');assert.ok(b.caption>=b.artBottom,'Text stays underneath');assert.ok(b.x>=0&&b.right<=size.width+1);}
   for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++)assert.ok(boxes[a].right<=boxes[b].x+1||boxes[b].right<=boxes[a].x+1||boxes[a].bottom<=boxes[b].y+1||boxes[b].bottom<=boxes[a].y+1,'Board cards do not overlap after resizing');
   const hero=await p.locator('.creation-hero').boundingBox(),board=await p.locator('.continue-panel').boundingBox();assert.ok(hero.y+hero.height<board.y,'Input and banner come first');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});


test('Downloads survive a same-page refresh but cancel on navigation or brand switch for both brands',{timeout:60000},async()=>{
 const f=await fixture();
 try{
  const p=f.page,edited=await require('sharp')({create:{width:1080,height:1080,channels:3,background:'#11aa44'}}).png().toBuffer();
  for(const [i,brand] of brands.entries())for(const transition of ['refresh','leave-and-return','brand']){
   const id='job-'+i;let release,arrived;const gate=new Promise(r=>release=r),started=new Promise(r=>arrived=r);const downloads=[];
   const onDownload=d=>downloads.push(d);p.on('download',onDownload);try{
   await p.route('**/api/jobs/'+id+'/edits',r=>r.fulfill({json:[{route:'continuity',placementId:'square',revision:3,sourceImageUrl:'/creative-ai/api/jobs/'+id+'/files/static-continuity.png',previewUrl:'/creative-ai/api/jobs/'+id+'/editable/continuity/square/preview?revision=3'}]}));
   await p.route('**/api/jobs/'+id+'/editable/continuity/square/export',async r=>{arrived();await gate;await r.fulfill({contentType:'image/png',body:edited});});
   await p.goto(f.url+'?brand='+brand.id+'#download/'+id+'/0/0');await p.reload();await p.waitForSelector('[data-action=download-file]');
   await p.locator('.art-frame img[data-edit-revision="3"]').waitFor();
   // Observe decode completion even when navigation removes the download screen.
   await p.evaluate(()=>{const original=window.createImageBitmap;window.createImageBitmap=async(...args)=>{const result=await original(...args);setTimeout(()=>window.downloadDecodeDone=true,0);return result;};});
   await p.locator('[data-action=download-file]').click();let startTimer;try{await Promise.race([started,new Promise((_,reject)=>{startTimer=setTimeout(()=>reject(Error('Export did not start')),5000);})]);}finally{clearTimeout(startTimer);}
   if(transition==='refresh')await p.evaluate(()=>window.dispatchEvent(new CustomEvent('creative:edited',{detail:{jobId:'unrelated-job'}})));
   else if(transition==='leave-and-return'){await p.evaluate(()=>location.hash='home');await p.waitForSelector('.creation-hero');await p.evaluate(id=>location.hash='download/'+id+'/0/0',id);await p.waitForSelector('[data-action=download-file]');}
   else{await p.locator('[data-brand="'+brands[1-i].id+'"]').click();await p.waitForSelector('#projectSearch');}
   const download=transition==='refresh'?p.waitForEvent('download',{timeout:5000}):null;release();await p.waitForFunction(()=>window.downloadDecodeDone===true);
   if(download){const d=await download;assert.deepEqual(await fs.readFile(await d.path()),edited);assert.match(await p.locator('#downloadStatus').innerText(),/Downloaded latest/);assert.equal(downloads.length,1);}
   else assert.equal(downloads.length,0,brand.name+' '+transition+' must cancel the stale download');
   }finally{release();p.off('download',onDownload);await p.unrouteAll({behavior:'wait'});}
  }
  assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('Amazon named image presets and real WebP downloads retain exact canvases for both brands',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page,sharp=require('sharp');
 for(const [index,brand]of brands.entries()){
  for(const [name,preset,dimensions]of [['Amazon A+ Feature Module','Amazon feature module',[[300,300]]],['Amazon A+ Lifestyle — Image Header','Amazon lifestyle module',[[970,600]]],['Amazon Brand Story','Amazon A+ page — Brand Story',[[1464,625],[463,625],[362,453],[362,453],[362,453]]]]){
   await p.goto(f.url+'?brand='+brand.id+'#recipes');const entry=p.locator('[data-action=quick-recipe][data-amazon-preset="'+preset+'"]');assert.ok((await entry.innerText()).includes(name));await entry.click();await p.waitForSelector('#field-brief');
   assert.equal(await p.locator('[data-static-key=amazonPreset]').inputValue(),preset);assert.equal(await p.locator('[data-prop=formatId]').count(),0);assert.equal(await p.locator('.static-part').count(),0);assert.match(await p.locator('.asset-requirements-overview').innerText(),new RegExp(dimensions.length+' image'));
   assert.equal(await p.locator('[data-static-part][data-static-key=width]').count(),0);
   await p.reload();await p.waitForSelector('#field-brief');const saved=await p.evaluate(()=>{const d=StudioModel.storage(localStorage).read(window.activeBrand.id,location.hash.split('/')[1]);return {brandId:d.brandId,parts:StudioModel.staticParts(d.outputs[0]),profile:StudioModel.generationProfile(d)};});
   assert.equal(saved.brandId,brand.id);assert.deepEqual(saved.parts.map(v=>[v.width,v.height]),dimensions);assert.equal(saved.profile.unitCount,dimensions.length);
  }
  await p.goto(f.url+'?brand='+brand.id+'#download/job-'+index+'/0/0');await p.waitForSelector('#downloadFormat',{state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await openDownloadOptions(p);await chooseSelect(p,p.locator('#downloadFormat'),'webp');
  const event=p.waitForEvent('download');await p.locator('[data-action=download-file]').click();const d=await event,meta=await sharp(await d.path()).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,1080);assert.equal(meta.height,1080);assert.match(d.suggestedFilename(),/\.webp$/);
  let revision=2,edited=await sharp({create:{width:720,height:360,channels:4,background:'#2367aa80'}}).png().toBuffer();
  await p.route('**/api/jobs/job-'+index+'/edits',r=>r.fulfill({json:[{route:'continuity',placementId:'square',revision,sourceImageUrl:'/creative-ai/api/jobs/job-'+index+'/files/static-continuity.png',previewUrl:'/creative-ai/api/jobs/job-'+index+'/editable/continuity/square/preview?revision='+revision}]}));
  await p.route('**/api/jobs/job-'+index+'/editable/continuity/square/export',r=>{assert.equal(r.request().postDataJSON().revision,revision);assert.equal(r.request().postDataJSON().format,'png');return r.fulfill({contentType:'image/png',body:edited});});
  await p.reload();await p.waitForSelector('#downloadFormat',{state:'attached'});if(!await p.locator('#downloadFormat').isVisible())await openDownloadOptions(p);await chooseSelect(p,p.locator('#downloadFormat'),'webp');await p.locator('.art-frame img[data-edit-revision="2"]').waitFor();
  await p.locator('[data-action=download-file]').click();await p.waitForFunction(()=>document.querySelector('#downloadStatus')?.textContent.includes('dimensions do not match'));
  revision=3;edited=await sharp({create:{width:1080,height:1080,channels:4,background:'#2367aa80'}}).png().toBuffer();await p.locator('[data-action=refresh-preview]').click();await p.locator('.art-frame img[data-edit-revision="3"]').waitFor();if(!await p.locator('#downloadFormat').isVisible())await openDownloadOptions(p);await chooseSelect(p,p.locator('#downloadFormat'),'webp');const editedEvent=p.waitForEvent('download');await p.locator('[data-action=download-file]').click();const latest=await editedEvent,latestMeta=await sharp(await latest.path()).metadata();assert.equal(latestMeta.format,'webp');assert.deepEqual([latestMeta.width,latestMeta.height],[1080,1080]);assert.equal(latestMeta.hasAlpha,true);assert.match(latest.suggestedFilename(),/\.webp$/);
  await p.unrouteAll({behavior:'wait'});
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET'&&!r.url.endsWith('/export')).length,0);
 }finally{await f.close();}
});

test('A+ image brief and Premium slot choices persist without copy fields for both brands',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){
  // 9 Nov 2026: the Brand Story entry now starts the whole Brand Story page (story focus replaces brandIdea).
  await p.goto(f.url+'?brand='+brand.id+'#recipes');await p.locator('[data-action=quick-recipe][data-amazon-preset="Amazon A+ page — Brand Story"]').click();await p.waitForSelector('#field-brief');
  assert.equal(await p.locator('[data-static-key=copy]').count(),0);assert.equal(await p.locator('[data-static-key=eligibility]').count(),0);
  await fillControl(p,p.locator('[data-static-key=storyFocus]'),'Rest through spaces and materials');await p.locator('#field-brief').fill('An architectural frame');await brandOnly(p);await settleAutosave(p);await p.reload();await p.waitForSelector('#field-brief');
  assert.equal(await p.locator('[data-field=productId]').count(),0);const saved=await p.evaluate(()=>StudioModel.storage(localStorage).read(window.activeBrand.id,location.hash.split('/')[1]));assert.equal(saved.focus,'brand');assert.equal(saved.brief,'An architectural frame');assert.equal(saved.outputs[0].staticValues.storyFocus,'Rest through spaces and materials');
  await p.goto(f.url+'?brand='+brand.id+'#recipes');await p.locator('[data-action=quick-recipe][data-amazon-preset="Amazon Premium — Full-width image"]').click();await p.waitForSelector('#field-brief');
  await chooseSelect(p,p.locator('[data-static-key=amazonPreset]'),'Amazon Premium — Image carousel');await chooseSelect(p,p.locator('[data-static-key=imageCount]'),'6');assert.match(await p.locator('.asset-requirements-overview').innerText(),/12 images/);await p.reload();await p.waitForSelector('#field-brief');assert.match(await p.locator('.asset-requirements-overview').innerText(),/12 images/);
  await chooseSelect(p,p.locator('[data-static-key=amazonPreset]'),'Amazon Premium — Four-column images');assert.match(await p.locator('.asset-requirements-overview').innerText(),/4 images/);await chooseSelect(p,p.locator('[data-static-key=imageCount]'),'3');assert.match(await p.locator('.asset-requirements-overview').innerText(),/3 images/);
  await chooseSelect(p,p.locator('[data-static-key=amazonPreset]'),'Amazon Premium — Hotspot images');await chooseSelect(p,p.locator('[data-static-key=imageCount]'),'2');assert.match(await p.locator('.asset-requirements-overview').innerText(),/3 images/);assert.equal(await p.locator('[data-static-key=copy]').count(),0);
 }
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('RCS image flow: both brands retain presets, ordered visual briefs and crop previews',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const [index,brand] of brands.entries()){
  await p.route('**/api/jobs/job-'+index,async route=>{const response=await route.fetch(),job=await response.json();job.placements=[{id:'custom_rcs-image-single-medium-01',name:'RCS image',dimensions:{width:1260,height:540}}];job.results=job.results.map(r=>({...r,placementId:'custom_rcs-image-single-medium-01'}));await route.fulfill({json:job});});
  await p.goto(f.url+'?brand='+brand.id+'#recipes');await p.locator('[data-action=quick-recipe][data-image-platform=RCS]').click();await p.waitForSelector('#field-brief');
  assert.equal(await p.locator('[data-prop=formatId]').count(),0);assert.equal(await p.locator('[data-static-key=copy]').count(),0);
  await p.locator('[data-action=add-output]').first().click();await p.locator('[data-action=legacy-assets]').click();await replaceAsset(p,'[data-action=assignment-preset][data-preset-kind=rcs][data-preset="Carousel medium · medium image"]');await chooseSelect(p,p.locator('[data-static-key=cardCount]'),'10');assert.equal(await p.locator('.static-part').count(),10);
  await fillControl(p,p.locator('[data-static-key=visualIntent]').nth(1),'Fabric detail');await reveal(p.locator('[data-action=static-part-up]').nth(1));await p.locator('[data-action=static-part-up]').nth(1).click();assert.equal(await p.locator('[data-static-key=visualIntent]').first().inputValue(),'Fabric detail');
  await settleAutosave(p);await p.reload();await p.waitForLoadState('networkidle');await p.waitForSelector('#field-brief');if(await p.locator('.static-setup summary').isVisible())await p.locator('.static-setup summary').click();assert.equal(await p.locator('.static-part').count(),10);
  await chooseSelect(p,p.locator('[data-static-key=cardCount]'),'2');await chooseSelect(p,p.locator('[data-static-key=cardCount]'),'10');assert.equal(await p.locator('[data-static-key=visualIntent]').first().inputValue(),'Fabric detail');
  const profile=await p.evaluate(()=>StudioModel.generationProfile(StudioModel.storage(localStorage).read(window.activeBrand.id,location.hash.split('/')[1])));assert.equal(profile.unitCount,10);
  await p.goto(f.url+'?brand='+brand.id+'#review/job-'+index+'/0/0');await p.locator('.focused-art img').waitFor();assert.equal(await p.getByRole('button',{name:'Show destination preview',exact:true}).count(),0);assert.match(await p.locator('.focused-art img').getAttribute('src'),/static-continuity/);
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Push image flow: destination, custom canvas, brief persistence, preview and download for both brands',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const index of [0,1])await p.route('**/api/jobs/job-'+index,async route=>{const response=await route.fetch(),job=await response.json();job.placements=[{id:'custom_push-image-ios-1038x1038',name:'iPhone push image',dimensions:{width:1038,height:1038}}];job.results=job.results.map(r=>({...r,placementId:'custom_push-image-ios-1038x1038'}));await route.fulfill({json:job});});
 const sharp=require('sharp'),image=await sharp({create:{width:1038,height:1038,channels:3,background:'#abc'}}).png().toBuffer();await p.route('**/files/static-*.png',route=>route.fulfill({contentType:'image/png',body:image}));
 for(const [index,brand] of brands.entries()){
  await p.goto(f.url+'?brand='+brand.id+'#recipes');await p.locator('[data-action=quick-recipe][data-image-platform=Push]').click();await p.waitForSelector('#field-brief');
  await chooseSelect(p,p.locator('[data-static-key=pushDestination]'),'iPhone / iOS');await chooseSelect(p,p.locator('[data-static-key=pushPreset]'),'Square image · 1:1');assert.equal(await p.locator('[data-prop=formatId]').count(),0);
  await fillControl(p,p.locator('[data-static-key=visualFocus]'),'Recognisable product detail');await chooseSelect(p,p.locator('[data-static-key=pushPreset]'),'Custom template');await p.locator('[data-prop=width]').fill('900');await p.locator('[data-prop=height]').fill('600');await settleAutosave(p);await p.reload();await p.waitForLoadState('networkidle');await p.waitForSelector('#field-brief');if(await p.locator('.static-setup summary').isVisible())await p.locator('.static-setup summary').click();
  assert.equal(await p.locator('[data-static-key=visualFocus]').inputValue(),'Recognisable product detail');assert.equal(await p.locator('[data-prop=width]').inputValue(),'900');const profile=await p.evaluate(()=>StudioModel.generationProfile(StudioModel.storage(localStorage).read(window.activeBrand.id,location.hash.split('/')[1])));assert.match(profile.placementId,/push-image-ios-900x600/);
  await p.goto(f.url+'?brand='+brand.id+'#review/job-'+index+'/0/0');await p.locator('.focused-art img').waitFor();assert.equal(await p.getByRole('button',{name:'Show destination preview',exact:true}).count(),0);assert.equal(await p.locator('.push-crop-preview').count(),0);assert.match(await p.locator('.focused-art img').getAttribute('src'),/static-continuity/);
  await openDownloadOptions(p);await chooseSelect(p,p.locator('#downloadFormat'),'png');const download=p.waitForEvent('download');await p.locator('[data-action=download-file], [data-action=download]').first().click();const meta=await sharp(await (await download).path()).metadata();assert.deepEqual([meta.width,meta.height],[1038,1038]);
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Push icons: saved-source picker, explicit platform notes and download stay in each brand',{timeout:60000},async()=>{
 const f=await fixture();try{const p=f.page;
 for(const brand of brands){
  const endpoint='**/api/brands/'+brand.id+'/notification-icons',id='a'.repeat(64),base='/creative-ai/api/brands/'+brand.id+'/notification-icons/'+id;
  await p.route(endpoint,async route=>{if(route.request().method()==='POST'){const body=route.request().postDataJSON();assert.equal(body.brandName,brand.name);assert.equal(body.sourceId,'approved:'+brand.id);assert.equal(body.preset,'android-small');return route.fulfill({json:{id,brandId:brand.id,files:[{name:'android-small-24.png',width:24,height:24,url:base+'/android-small-24.png'}],downloadUrl:base+'/icons.zip',manifest:{warnings:[]}}});}return route.fulfill({json:{brandId:brand.id,brandName:brand.name,sources:[{id:'approved:'+brand.id,name:brand.name+' mark',sha256:'b'.repeat(64),kind:'approved-logo'}],presets:{web:{label:'Web notification icon'},'android-small':{label:'Android small icon'}},notes:['iPhone uses the installed app icon.']}});});
  await p.route('**/notification-icons/'+id+'/android-small-24.png',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4S0AAAAASUVORK5CYII=','base64')}));
  await p.goto(f.url+'?brand='+brand.id+'#recipes');await p.locator('[data-action=quick-recipe][data-image-platform="Push icons"]').click();await p.waitForSelector('#pushIconSource');assert.match(await p.locator('#taskContent').innerText(),/iPhone uses the installed app icon/);assert.match(await p.locator('#pushIconSource').innerText(),new RegExp(brand.name));await chooseSelect(p,p.locator('#pushIconPreset'),'android-small');await p.locator('[data-action=prepare-push-icons]').click();await p.waitForSelector('#pushIconResults img');const download=p.waitForEvent('download');await p.getByRole('link',{name:'Download icon pack',exact:true}).click();assert.ok((await fs.readFile(await (await download).path())).includes(Buffer.from(brand.id)));
 }
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('Retail input flows: all guided briefs save in each brand and sizes survive navigation',{timeout:120000},async()=>{
 const f=await fixture();try{const p=f.page,M=require('../../public/creative-ai/studio-model');
 for(const brand of brands)for(const entry of M.retailEntries){
  await p.goto(f.url+'?brand='+brand.id+'#recipes');await p.locator('[data-action=quick-recipe][data-image-platform="Retail:'+entry.key+'"]').click();await p.waitForSelector('#field-brief');
  await fillControl(p,p.locator('[data-static-key=visualFocus]'),brand.name+' '+entry.name);
  if(entry.key==='screen')await chooseSelect(p,p.locator('[data-static-key=sizePreset]'),'Portrait · 1080 × 1920');
  if(entry.key==='poster'){await chooseSelect(p,p.locator('[data-static-key=printPreset]'),'custom:studio-print-flyer-a5');assert.equal(await p.locator('[data-static-key=physicalWidth]').inputValue(),'148');}
  if(entry.key==='standee'){await fillControl(p,p.locator('[data-static-key=physicalWidth]'),'900');await fillControl(p,p.locator('[data-static-key=physicalHeight]'),'2100');}
  await settleAutosave(p);await p.reload();await p.waitForLoadState('networkidle');await p.waitForSelector('#field-brief');
  assert.equal(await p.locator('[data-static-key=visualFocus]').inputValue(),brand.name+' '+entry.name);
  const saved=await p.evaluate(()=>StudioModel.storage(localStorage).read(window.activeBrand.id,location.hash.split('/')[1]));assert.equal(saved.brandId,brand.id);assert.equal(saved.outputs[0].staticValues.retailPreset,entry.key);
  if(entry.key==='screen')assert.equal(saved.outputs[0].height,1920);
  if(entry.key==='standee')assert.equal(M.generationProfile(saved).printOptions['custom:studio-print-standee'].trimWidthMm,900);
  if(entry.planningOnly){assert.equal(M.generationProfile(saved),null);assert.match(await p.locator('#outputs').innerText(),/Planning brief/);}
 }
 assert.deepEqual(f.errors,[]);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.close();}
});
test('Print download rebuilds the current selected option for both brands without generation',{timeout:60000},async()=>{const f=await fixture();try{const {PDFDocument}=require('pdf-lib'),pdf=await PDFDocument.create();pdf.addPage([100,100]);const bytes=Buffer.from(await pdf.save());for(const [i,brand]of brands.entries()){
 const p=f.page,id='job-'+i,bodies=[];await p.route('**/api/jobs/'+id,route=>route.fulfill({json:{id,brandId:brand.id,status:'finished',placements:[{id:'square',name:'Print artwork',dimensions:{width:1080,height:1080},printSet:{id:'custom:studio-print-poster-a4',name:'Poster',index:1,count:1,label:'Artwork'}}],results:[{route:'continuity',placementId:'square',imageUrl:'/creative-ai/api/jobs/'+id+'/files/static-continuity.png'}]}}));
 await p.route('**/api/jobs/'+id+'/print-proofs/rebuild',route=>{bodies.push(route.request().postDataJSON());return route.fulfill({json:{downloadUrl:'/creative-ai/api/jobs/'+id+'/files/print-proof-current.pdf',actualSizeProofUrl:'/creative-ai/api/jobs/'+id+'/files/print-actual-size-current.pdf',preflightUrl:'/creative-ai/api/jobs/'+id+'/files/print-preflight-current.json'}});});await p.route('**/files/print-proof-current.pdf',route=>route.fulfill({contentType:'application/pdf',body:bytes}));
 await p.goto(f.url+'?brand='+brand.id+'#download/'+id+'/0/0');await openDownloadOptions(p);await p.locator('[data-action=download-print-proof]').click();await p.waitForFunction(()=>document.querySelector('#downloadStatus')?.textContent.includes('Current print proof downloaded'));assert.deepEqual(bodies,[{brandName:brand.name,route:'continuity',formatId:'custom:studio-print-poster-a4'}]);assert.ok(await p.getByRole('link',{name:'Actual-size samples'}).isVisible());await p.unrouteAll({behavior:'wait'});
 }assert.deepEqual(f.errors,[]);}finally{await f.close();}});

test('client reporting preserves notes after a lost response, retries one ticket and fits laptop and zoom layouts for both brands',{timeout:90000},async()=>{
 const f=await fixture();try{const p=f.page;await f.context.addInitScript(()=>{window.CreativeAccount={storage:{getItem:k=>localStorage.getItem('test-account:'+k),setItem:(k,v)=>localStorage.setItem('test-account:'+k,v),removeItem:k=>localStorage.removeItem('test-account:'+k)}};});
 for(const [i,brand]of brands.entries()){
 const reports=new Map();let calls=0;await p.route('**/admin/api/issues/context?**',route=>route.fulfill({json:{jobId:'job-'+i,brandId:brand.id,brandName:brand.name,product:brand.name+' campaign',route:'continuity',placementId:'square',image:{key:'a'.repeat(64)}}}));
 await p.route('**/admin/api/issues',route=>{const body=route.request().postDataJSON();reports.set(body.eventId,body);calls++;if(calls===1)return route.abort('connectionreset');return route.fulfill({status:201,json:{id:'saved-report'}});});
 await p.goto(f.url+'?brand='+brand.id+'#review/job-'+i+'/0/0');await p.waitForSelector('.option-card');await p.addScriptTag({path:path.join(root,'public/admin/issues.js')});await p.locator('.flow-header [data-action=report-issue]').waitFor();assert.match(await p.locator('#clientContext').innerText(),new RegExp(brand.name+' campaign'));
 await p.locator('.flow-header [data-action=report-issue]').click();await p.locator('#clientIssue textarea').fill('The product is too small. Please make it clearer.');await p.getByRole('button',{name:'Send report',exact:true}).click();await p.locator('#clientIssue [role=status]').filter({hasText:'Your note has been kept'}).waitFor();assert.equal(reports.size,1);
 await p.locator('#clientIssue [data-close]').click();await p.locator('.flow-header [data-action=report-issue]').click();await p.locator('#clientIssue textarea').waitFor();assert.match(await p.locator('#clientIssue textarea').inputValue(),/product is too small/);
 for(const [width,height,zoom]of [[1366,768,1],[1280,720,1],[1280,720,1.25],[1366,768,1.5],[390,844,1]]){
 await p.setViewportSize({width,height});await p.evaluate(z=>{document.documentElement.style.zoom=z;},zoom);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Page fits '+width+' at '+zoom);assert.equal(await p.locator('#clientIssue').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1;}),true,'Report fits '+width+' at '+zoom);await p.getByRole('button',{name:'Send report',exact:true}).scrollIntoViewIfNeeded();
 }
 await p.evaluate(()=>document.documentElement.style.zoom=1);await p.setViewportSize({width:1280,height:720});await p.screenshot({path:path.join(root,'work/admin-evidence/client-report-'+i+'.png')});await p.getByRole('button',{name:'Send report',exact:true}).click();await p.getByRole('heading',{name:'Report saved',exact:true}).waitFor();assert.equal(reports.size,1);const saved=[...reports.values()][0];assert.equal(saved.jobId,'job-'+i);assert.equal(saved.key,'a'.repeat(64));await p.locator('#clientIssue [data-close]').click();await p.unrouteAll({behavior:'wait'});
 }
 assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
