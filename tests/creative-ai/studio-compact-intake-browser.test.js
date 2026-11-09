'use strict';
const {setAudience}=require('./helpers/ui-controls.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
test('compact intake discloses all values, preserves open groups during autofill and exposes format requirements',{timeout:60000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{for(const b of f.brands){await page.goto(f.url+'?brand='+b.id);await page.waitForSelector('.creation-hero');await page.evaluate(id=>{const d=StudioModel.startDraft(id,'quick',3);d.focus='brand';StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},b.id);
 await page.locator('#field-brief').waitFor();assert.equal(await page.locator('[data-audience-group=audience]').isVisible(),false);await require('./helpers/ui-controls.cjs').openTargeting(page);assert.equal(await page.locator('[data-audience-group=audience]').isVisible(),true);await page.locator('[data-intake-section=additional]>summary').click();assert.equal(await page.locator('#field-selectedRtbs').isVisible(),true);
 assert.equal(await page.locator('#field-creativeCount').evaluate(el=>el.closest('details').open),false);
 await page.locator('[data-intake-section=additional]>summary').click();assert.equal(await page.locator('#field-creativeCount + .studio-select-trigger').isVisible(),true);
 await setAudience(page,'markets','Chennai');await page.locator('#field-brief').fill('One creative in Hindi. Markets: Bengaluru; Audience: New homeowners');await page.waitForFunction(()=>document.querySelector('#field-language').value==='Hindi');assert.equal(await page.locator('#field-markets').inputValue(),'Chennai');assert.equal(await page.locator('[data-intake-section=additional]').getAttribute('open'),'');
 assert.equal(await page.locator('[data-static-key=offer]').isVisible(),true);await page.locator('[data-static-key=offer]').fill('Save ₹500 on the supplied offer');await page.locator('[data-static-key=offer]').press('Tab');await page.waitForTimeout(800);await page.reload();await page.locator('#field-brief').waitFor();assert.equal(await page.locator('#field-markets').inputValue(),'Chennai');assert.equal(await page.locator('[data-static-key=offer]').inputValue(),'Save ₹500 on the supplied offer');
 const ids=await page.locator('#briefForm [id]').evaluateAll(es=>es.map(e=>e.id));assert.equal(new Set(ids).size,ids.length);

 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
