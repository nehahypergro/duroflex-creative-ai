'use strict';
const {chooseSelect}=require('./helpers/ui-controls.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
test('Desktop cleanup: favourites filters, product controls and brief alignment work for both brands',{timeout:90000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview();
 const browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 const page=await browser.newPage({viewport:{width:1384,height:807}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const image=await require('sharp')({create:{width:1080,height:1080,channels:3,background:'#b4c5d9'}}).png().toBuffer();
 const jobs=f.brands.flatMap((b,i)=>['finished','running'].map((status,j)=>({id:`cleanup-${i}-${j}`,brandId:b.id,status,createdAt:`2026-10-${20+j}T08:00:00Z`,updatedAt:`2026-10-${20+j}T08:00:00Z`,intake:{brandId:b.id,campaignName:j?'Alpha':'Zulu',productName:j?'A product':'Z product',brief:'Supplied feature',conceptRoutes:['continuity']},placements:[{id:'square',name:j?'Story':'Social post',dimensions:{width:1080,height:1080}}],results:[{route:'continuity',placementId:'square',ready:true,imageUrl:`/creative-ai/api/jobs/cleanup-${i}-${j}/files/image.png`}]})));
 await page.route('**/creative-ai/api/jobs**',async r=>{const p=new URL(r.request().url()).pathname;if(p.endsWith('.png'))return r.fulfill({contentType:'image/png',body:image});if(p.endsWith('/jobs'))return r.fulfill({json:jobs});if(p.endsWith('/edits'))return r.fulfill({json:[]});return r.fulfill({json:jobs.find(j=>p==='/creative-ai/api/jobs/'+j.id)||{units:[]}});});
 try{for(const [i,b]of f.brands.entries()){
  await page.goto(f.url+'?brand='+b.id);await page.locator('.creation-hero').waitFor();
  assert.equal(await page.locator('.creation-hero .eyebrow').count(),0);
  assert.equal(await page.locator('.home-page .format-grid .format-tile').count(),6);
  await page.getByRole('button',{name:'Browse all tools',exact:true}).click();await page.waitForURL(/#tools/);
  await page.getByRole('link',{name:'Projects',exact:true}).click();await page.locator('.projects-page').waitFor();
  assert.equal(await page.locator('.projects-page .page-heading button').count(),0);
  await page.evaluate(({brandId,ids})=>{const org=StudioModel.organization(localStorage),v=org.read(brandId);org.updateMany(v,ids.map(id=>({key:'project:'+id,patch:{favourite:true}})));}, {brandId:b.id,ids:jobs.slice(i*2,i*2+2).map(j=>j.id)});
  await page.reload();await page.locator('.projects-page').waitFor();
  await page.getByRole('link',{name:'Favourites',exact:true}).click();await page.locator('#favouriteSort').waitFor();
  assert.equal(await page.locator('.saved-card').count(),2);
  await page.getByRole('tab',{name:'Ready',exact:true}).click();assert.equal(await page.locator('.saved-card').count(),1);
  assert.match(await page.locator('.saved-card').innerText(),/Zulu/);
  await page.getByRole('tab',{name:'Creating',exact:true}).click();assert.match(await page.locator('.saved-card').innerText(),/Alpha/);
  await page.getByRole('tab',{name:'All',exact:true}).click();await chooseSelect(page,page.locator('#favouriteFormat'),'Story');assert.equal(await page.locator('.saved-card').count(),1);
  await chooseSelect(page,page.locator('#favouriteFormat'),'all');await chooseSelect(page,page.locator('#favouriteSort'),'name');assert.match(await page.locator('.saved-card').first().innerText(),/Alpha/);
  await page.locator('#collectionSearch').fill('Zulu');await page.waitForFunction(()=>document.querySelectorAll('.saved-card').length===1);assert.match(await page.locator('.saved-card').innerText(),/Zulu/);
  await page.getByRole('link',{name:'Projects',exact:true}).click();assert.equal(await page.getByRole('tab',{name:'All',exact:true}).getAttribute('aria-selected'),'true');
  await page.goto(f.url+'?brand='+b.id+'#library/products');await page.locator('.product-toolbar').waitFor();
  assert.equal(await page.locator('#productHasImage').count(),0);assert.equal(await page.locator('.product-toolbar #productSavedView').count(),0);
  assert.equal(await page.locator('.product-toolbar [data-action="toggle-product-import"]').count(),1);assert.equal(await page.locator('#productImportPanel').isVisible(),false);await page.getByRole('button',{name:'Add a product',exact:true}).click();assert.equal(await page.locator('#productImportUrl').isVisible(),true);
  await page.getByRole('button',{name:'Add a product',exact:true}).click();assert.equal(await page.locator('#productImportPanel').isVisible(),false);
  await page.goto(f.url+'?brand='+b.id+'#review/cleanup-'+i+'-0/0/0');
  await page.locator('.focused-art img').waitFor();
  await page.waitForFunction(()=>{const img=document.querySelector('.focused-art img');return img?.complete&&img.naturalWidth===1080;});
  assert.equal(await page.locator('.rationale-explanation').count(),0);
  assert.equal(await page.locator('.intent-label,.compact-feedback').count(),0);
  const artwork=await page.locator('.focused-art img').boundingBox();assert.ok(artwork.height<=548);
  await page.screenshot({path:'/tmp/studio-review-cleanup-'+i+'.png'});
  await page.evaluate(brandId=>{const d=StudioModel.startDraft(brandId,'quick',1);d.brief='Show product benefits';StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},b.id);
  await page.locator('#briefForm').waitFor();assert.equal(await page.getByRole('button',{name:/Recover uploads/}).count(),0);
  for(const width of [1384,1063]){await page.setViewportSize({width,height:807});const rect=await page.locator('#assignmentStatus').boundingBox(),btn=await page.locator('#assignmentStatus button').boundingBox();assert.ok(btn.x>=rect.x&&btn.x+btn.width<=rect.x+rect.width+1);assert.ok(Math.abs((btn.y+btn.height/2)-(rect.y+rect.height/2))<3,'Review button vertically centred');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
