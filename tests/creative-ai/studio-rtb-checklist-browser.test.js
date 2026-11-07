'use strict';
const {confirmProduct}=require('./helpers/ui-controls.cjs');
const {settleAutosave}=require('./helpers/ui-controls.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
test('essential RTB checklist is visible, selectable, persisted and scoped for both saved brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),M=require('../../public/creative-ai/studio-model'),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage({viewport:{width:1366,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/studio/preflight',r=>r.fulfill({json:{token:'fixture-token',cost:{message:'Estimated ₹20 · isolated test'}}}));await fs.mkdir('work/rtb-checklist-20261029',{recursive:true});
 try{for(const b of f.brands){const p=f.products[b.id].find(p=>M.productRtbs(p).length>1);assert.ok(p,b.name+' has saved features');
 await page.goto(f.url+'?brand='+b.id);await page.waitForSelector('.creation-hero');
 await page.evaluate(({b,p})=>{const d=Object.assign(StudioModel.startDraft(b.id,'quick',1),{name:'Checklist check',brief:'Show this saved product',focus:'product',productId:p.id,productName:p.name,rtbProductId:p.id,variant:p.variants?.[0]?.id||'',creativeCount:1});StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},{b,p});
 await page.locator('#field-selectedRtbs').waitFor();assert.equal(await page.locator('[data-intake-section=additional] .intake-rtbs').count(),0);assert.equal(await page.locator('.intake-rtbs textarea').count(),0);assert.equal(await page.locator('.rtb-required').getAttribute('aria-label'),'Required');
 await page.locator('[data-action=assignment-review]').click();assert.match(await page.locator('#error-selectedRtbs').innerText(),/at least one/);await page.locator('[data-assignment-back]').click();
 const choices=page.locator('[data-intake-chip=selectedRtbs]');await choices.first().check();assert.equal(await page.locator('.rtb-count').innerText(),'1 selected');await page.locator('[data-action=assignment-review]').click();assert.equal(await page.locator('#reviewRequiredErrors').count(),0);await page.waitForFunction(()=>document.querySelector('[data-assignment-confirm]')?.disabled===false);assert.equal(await page.locator('#newRtb').inputValue(),'');await page.locator('[data-assignment-back]').click();
 await page.locator('#newRtb').fill('Supplied fact, subject to stated conditions.');await page.locator('#newRtb').press('Enter');assert.equal(await page.locator('.rtb-count').innerText(),'2 selected');
 await page.locator('[data-intake-chip=suppliedRtbs]').uncheck();await settleAutosave(page);await page.reload();await page.locator('#field-selectedRtbs').waitFor();assert.equal(await choices.first().isChecked(),true);assert.equal(await page.locator('[data-intake-chip=suppliedRtbs]').isChecked(),false);
 const handoff=await page.evaluate(p=>{const d=StudioModel.storage(localStorage).read(new URLSearchParams(location.search).get('brand'),location.hash.split('/')[1]);return StudioModel.intakeContext(d,p);},p);assert.doesNotMatch(handoff,/Supplied fact/);assert.ok(handoff.includes(M.productRtbs(p)[0]));
 await choices.first().uncheck();assert.equal(await page.locator('.rtb-count').innerText(),'0 selected');await page.locator('[data-intake-chip=suppliedRtbs]').check();await page.locator('[data-action=assignment-review]').click();await page.locator('[data-assignment-confirm]').waitFor();await page.waitForFunction(()=>document.querySelector('[data-assignment-confirm]')?.disabled===false);await page.locator('[data-assignment-back]').click();
 await choices.first().check();await page.locator('#field-selectedRtbs').scrollIntoViewIfNeeded();await page.screenshot({path:'work/rtb-checklist-20261029/'+b.name.toLowerCase()+'.png',fullPage:true});
 for(const width of [1024,390]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow at '+width);}
 await page.screenshot({path:'work/rtb-checklist-20261029/'+b.name.toLowerCase()+'-mobile.png',fullPage:true});await page.setViewportSize({width:1366,height:950});
 // A product change must not carry the library feature selection into another SKU.
 const other=f.products[b.id].find(x=>x.id!==p.id);await page.locator('[data-action=assignment-product]').click();await page.locator('[data-assignment-product="'+other.id+'"]').click();await confirmProduct(page);assert.deepEqual(await page.locator('[data-intake-chip=selectedRtbs]:checked').evaluateAll(es=>es.map(e=>e.value)),M.productRtbs(other),'new SKU selects only its own features');
 }assert.deepEqual(errors,[]);
 }finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
