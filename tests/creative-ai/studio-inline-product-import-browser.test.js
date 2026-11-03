'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
test('inline product import saves, selects and exposes source features, with safe retry and cancellation',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await fs.mkdir('work/manual-product-ui',{recursive:true});
 try{for(const b of f.brands){
  let count=0,mode='success',release;
  const p={...f.products[b.id][0],id:'product-inline-test',brandId:b.id,name:'Imported sample product',pageUrl:new URL('/products/inline-test',b.brandUrl).href,features:['Verified feature one','Verified feature two'],variants:[{id:'variant-one',name:'Standard'}]};
  await page.route('**/api/brands/'+b.id+'/products',async route=>{if(route.request().method()!=='POST')return route.continue();count++;const payload=route.request().postDataJSON();assert.equal(payload.brandName,b.name);assert.equal(payload.url,p.pageUrl);if(mode==='delay')await new Promise(r=>release=r);await route.fulfill({status:mode==='failure'?500:201,contentType:'application/json',body:JSON.stringify(mode==='failure'?{error:'Import failed'}:p)});});
  await page.goto(f.url+'?brand='+b.id);await page.waitForSelector('.creation-hero');await page.evaluate(b=>{const d=StudioModel.startDraft(b.id,'quick',1);d.brief='Keep my brief';StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},b);
  const open=async()=>{await page.locator('[data-action=assignment-product]').click();};
  await open();assert.equal(await page.locator('#assignmentManualName').count(),0);await page.locator('#assignmentProductSearch').fill(p.pageUrl);await page.locator('[data-assignment-focus=product]').click();await page.locator('.product-picker-dialog').waitFor({state:'detached'});
  assert.equal(count,1);assert.match(await page.locator('[data-action=assignment-product]').innerText(),/Imported sample/);assert.match(await page.locator('.rtb-checklist').innerText(),/Verified feature one/);assert.equal(await page.locator('#field-brief').inputValue(),'Keep my brief');
  await page.locator('[data-intake-chip=selectedRtbs]').first().check();assert.equal(await page.locator('[data-intake-chip=selectedRtbs]:checked').count(),1);
  await open();assert.equal(await page.locator('[data-assignment-product="product-inline-test"]').count(),1);const center=await page.locator('.product-search-form').evaluate(e=>{const r=e.getBoundingClientRect(),d=e.closest('dialog').getBoundingClientRect();return Math.abs((r.left+r.right)/2-(d.left+d.right)/2);});assert.ok(center<2);
  mode='failure';await page.locator('#assignmentProductSearch').fill(p.pageUrl);await page.locator('[data-assignment-focus=product]').click();await page.waitForFunction(()=>document.querySelector('#assignmentImportStatus')?.textContent.includes('couldn’t import'));assert.equal(await page.locator('[data-assignment-manual]').innerText(),'Retry import');
  await page.locator('.product-search-form').screenshot({path:'work/manual-product-ui/'+b.name.toLowerCase()+'-import-retry.png'});
  mode='success';await page.locator('[data-assignment-manual]').click();await page.locator('.product-picker-dialog').waitFor({state:'detached'});assert.equal(count,3);
  await open();mode='delay';await page.locator('#assignmentProductSearch').fill(p.pageUrl);await page.locator('[data-assignment-focus=product]').click();await page.waitForFunction(()=>document.querySelector('.product-search-form')?.getAttribute('aria-busy')==='true');assert.equal(await page.locator('[data-assignment-manual]').isDisabled(),true);
  await page.keyboard.press('Escape');release();await page.waitForTimeout(150);assert.equal(await page.locator('.product-picker-dialog').count(),0);assert.equal(await page.locator('#field-brief').inputValue(),'Keep my brief');
  await page.unroute('**/api/brands/'+b.id+'/products');
 }assert.deepEqual(errors,[]);}finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
