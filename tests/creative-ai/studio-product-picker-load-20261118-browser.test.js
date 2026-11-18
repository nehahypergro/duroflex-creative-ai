'use strict';
// Regression (18 Nov 2026, hosted Studio, Neha: "why are the skus not visible when i click on product selection"):
// the product list failed to load (it took longer than the browser waits), and the product picker said
// "No products match your search." with no way to load it again. The picker now says the products could not load,
// offers Retry, shows "Loading products again…" while it retries, and lists the products when they arrive. Failing before.
const test=require('node:test'),assert=require('node:assert/strict');
test('the product picker explains a failed product list and Retry loads it, for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 try{for(const b of f.brands){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
  let mode='fail',release;const held=new Promise(r=>{release=r;});
  await page.route('**/creative-ai/api/brands/'+b.id+'/products',async route=>{if(mode==='fail')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Slow storage'})});await held;return route.continue();});
  await page.goto(f.url+'?brand='+b.id);await page.waitForSelector('.creation-hero');
  await page.evaluate(b=>{const d=StudioModel.startDraft(b.id,'quick',1);d.brief='Keep this brief';StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},b);
  await page.locator('[data-action=assignment-product]').click();await page.locator('.product-picker-dialog').waitFor();
  const text=()=>page.locator('#assignmentProductGroups').innerText();
  assert.match(await text(),/Products could not load/,b.name+': the picker says the list failed');assert.doesNotMatch(await text(),/No products match your search/);
  mode='hold';await page.locator('[data-retry-products]').click();
  assert.match(await text(),/Loading products again/);
  release();await page.locator('[data-assignment-product]').first().waitFor();
  assert.equal(await page.locator('[data-assignment-product]').count(),f.products[b.id].length,b.name+': every saved product is listed after Retry');
  await page.locator('#assignmentProductSearch').fill('no product matches this');assert.match(await text(),/No products match your search/,'a search with no match still says so');
  await context.close();
 }assert.deepEqual(errors,[]);}finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
