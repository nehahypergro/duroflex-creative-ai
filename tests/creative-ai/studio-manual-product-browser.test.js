'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
test('shared product search accepts names or URLs and rejects unofficial URLs',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await fs.mkdir('work/manual-product-ui',{recursive:true});
 try{for(const b of f.brands){
  await page.goto(f.url+'?brand='+b.id);await page.waitForSelector('.creation-hero');
  await page.evaluate(b=>{const d=StudioModel.startDraft(b.id,'quick',1);d.brief='Keep my request';StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},b);
  await page.locator('[data-action=assignment-product]').click();
  const url=page.locator('#assignmentProductSearch');assert.equal(await page.locator('#assignmentManualName').count(),0);
  assert.match(await url.getAttribute('placeholder'),/Search products or paste a product URL/);
  assert.equal(await page.locator('.manual-product-entry').count(),0);
  await url.fill('https://example.com/products/test');await page.locator('[data-assignment-manual]').click();assert.equal(await url.getAttribute('aria-invalid'),'true');
  for(const width of [1366,1024]){
   await page.setViewportSize({width,height:900});await url.focus();
   const layout=await page.locator('.product-search-form').evaluate(form=>{const u=form.querySelector('#assignmentProductSearch').getBoundingClientRect(),button=form.querySelector('button').getBoundingClientRect(),dialog=form.closest('dialog');return {buttonGap:button.top-u.bottom,overflow:dialog.scrollWidth>dialog.clientWidth+1};});
   assert.ok(layout.buttonGap>=0);assert.equal(layout.overflow,false);
   if(width===1366)await page.locator('.product-picker-dialog').screenshot({path:'work/manual-product-ui/'+b.name.toLowerCase()+'.png'});
  }
  await page.keyboard.press('Escape');await page.locator('.product-picker-dialog').waitFor({state:'detached'});assert.equal(await page.locator('#field-brief').inputValue(),'Keep my request');
 }assert.deepEqual(errors,[]);}finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
