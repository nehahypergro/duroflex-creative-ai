'use strict';
// Regression (18 Nov 2026, hosted Studio, Neha: "why are the skus not visible when i click on product selection"):
// the product list failed to load (it took longer than the browser waits), and the product picker said
// "No products match your search." with no way to load it again. Now, when the picker opens after a failed list,
// it loads the list again by itself; if that also fails it says the products could not load and offers Retry.
// Neha: "can we ensure that skus are already populated". Failing before.
const test=require('node:test'),assert=require('node:assert/strict');
async function openPicker(browser,f,b,failures,{hold=false}={}){
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack));
 let calls=0,release;const held=new Promise(r=>{release=r;});
 await page.route('**/creative-ai/api/brands/'+b.id+'/products*',async route=>{calls++;if(calls<=failures)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Slow storage'})});if(hold)await held;return route.continue();});
 await page.goto(f.url+'?brand='+b.id);await page.waitForSelector('.creation-hero');
 await page.evaluate(b=>{const d=StudioModel.startDraft(b.id,'quick',1);d.brief='Keep this brief';StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},b);
 await page.locator('[data-action=assignment-product]').click();await page.locator('.product-picker-dialog').waitFor();
 return {context,page,errors,release,calls:()=>calls,text:()=>page.locator('#assignmentProductGroups').innerText()};
}
test('the product picker loads a failed product list again by itself, for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 try{for(const b of f.brands){
  const x=await openPicker(browser,f,b,1);
  await x.page.locator('[data-assignment-product]').first().waitFor();
  assert.equal(await x.page.locator('[data-assignment-product]').count(),f.products[b.id].length,b.name+': products appear without clicking anything');
  assert.equal(x.calls(),2,'one automatic reload');assert.deepEqual(x.errors,[]);await x.context.close();
 }}finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
test('when the reload also fails the picker says so and Retry loads the products, for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 try{for(const b of f.brands){
  const x=await openPicker(browser,f,b,2,{hold:true});
  await x.page.locator('[data-retry-products]').waitFor();
  assert.match(await x.text(),/Products could not load/,b.name+': the picker says the list failed');assert.doesNotMatch(await x.text(),/No products match your search/);
  await x.page.locator('[data-retry-products]').click();
  assert.match(await x.text(),/Loading products again/);
  x.release();await x.page.locator('[data-assignment-product]').first().waitFor();
  assert.equal(await x.page.locator('[data-assignment-product]').count(),f.products[b.id].length,b.name+': every saved product is listed after Retry');
  await x.page.locator('#assignmentProductSearch').fill('no product matches this');assert.match(await x.text(),/No products match your search/,'a search with no match still says so');
  assert.deepEqual(x.errors,[]);await x.context.close();
 }}finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
