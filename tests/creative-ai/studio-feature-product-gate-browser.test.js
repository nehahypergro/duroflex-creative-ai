'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
test('Features require a saved product and brief labels stay compact for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),M=require('../../public/creative-ai/studio-model'),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage({viewport:{width:1384,height:807}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/studio/preflight',r=>r.fulfill({json:{token:'fixture-token',cost:{message:'Isolated test'}}}));
 try{for(const b of f.brands){
  await page.goto(f.url+'?brand='+b.id);await page.waitForSelector('.creation-hero');
  await page.evaluate(b=>{const d=StudioModel.startDraft(b.id,'quick',1);d.brief='Show the product benefits';StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},b);
  await page.locator('#newRtb').waitFor();
  assert.equal(await page.locator('#newRtb').isDisabled(),true,'a feature cannot be entered before selecting a product');
  assert.equal(await page.locator('[data-action=rtb-add]').isDisabled(),true);
  assert.match(await page.locator('#rtbProductHint').innerText(),/Select a product/);
  assert.equal(await page.locator('.rtb-required').innerText(),'*');
  assert.equal(await page.locator('#briefForm .optional').count(),0);
  await fs.mkdir('work/feature-product-gate-20261031',{recursive:true});
  await page.locator('#field-selectedRtbs').scrollIntoViewIfNeeded();
  await page.screenshot({path:'work/feature-product-gate-20261031/'+b.name+'-no-product.png'});
  // The handler must reject attempts too, not just rely on the disabled appearance.
  await page.evaluate(()=>{const input=document.querySelector('#newRtb'),add=document.querySelector('[data-action=rtb-add]');input.disabled=false;input.value='Unassigned fact';add.disabled=false;add.click();});
  assert.equal(await page.locator('[data-intake-chip=suppliedRtbs]').count(),0);
  const p=f.products[b.id].find(p=>M.productRtbs(p).length>1);assert.ok(p);
  await page.locator('[data-action=assignment-product]').click();await page.locator('[data-assignment-product="'+p.id+'"]').click();
  assert.equal(await page.locator('#newRtb').isDisabled(),false);
  await page.locator('[data-intake-chip=selectedRtbs]').first().check();
  assert.equal(await page.locator('.rtb-count').innerText(),'1 selected');
  await page.locator('[data-action=assignment-review]').click();
  assert.equal(await page.locator('#error-selectedRtbs').innerText(),'','library selections satisfy the feature requirement');
  await page.locator('[data-assignment-back]').click();
  await page.locator('#newRtb').fill('Customer supplied feature');await page.locator('#newRtb').press('Enter');
  assert.equal(await page.locator('.rtb-count').innerText(),'2 selected');
  assert.equal(await page.locator('#error-selectedRtbs').innerText(),'');
  await page.locator('#field-selectedRtbs').scrollIntoViewIfNeeded();
  await fs.mkdir('work/feature-product-gate-20261031',{recursive:true});
  await page.screenshot({path:'work/feature-product-gate-20261031/'+b.name+'.png'});
 }assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
