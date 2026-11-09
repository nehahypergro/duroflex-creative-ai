'use strict';
const {chooseSelect,settleAutosave}=require('./helpers/ui-controls.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
test('carousel settings use compact aligned rows and styled dropdowns for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage({viewport:{width:1366,height:900}});await fs.mkdir('work/asset-settings-compact',{recursive:true});
 try{for(const b of f.brands){await page.goto(f.url+'?brand='+b.id);await page.waitForSelector('.creation-hero');await page.evaluate(b=>{const d=StudioModel.startDraft(b.id,'quick',9);d.brief='A product carousel';d.focus='brand';StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},b);await page.waitForSelector('[data-prop=formatId] + .studio-select-trigger');
 for(const key of ['customerAge','markets']){assert.equal(await page.locator('#field-'+key).count(),1);assert.equal(await page.locator('[data-intake-section=additional] [data-field='+key+']').count(),1);assert.equal(await page.locator('[data-intake-section=additional] [data-audience-group='+key+']').count(),1); /* 8 Nov 2026: one copy, inside Sharpen targeting (optional) */}
 assert.equal(await page.locator('#field-objective').count(),1);assert.equal(await page.locator('#field-objective').evaluate(e=>!e.closest('details')&&e.required),true);
 assert.equal(await page.locator('.static-sequence').count(),0);assert.equal(await page.locator('[data-static-part]').count(),0);
 for(const key of ['narrativeType','narrative','caption','destination'])assert.equal(await page.locator('[data-static-key='+key+']').count(),0);
 for(const key of ['promotionMode','contactMode']){const control=page.locator('[data-static-key='+key+']');assert.equal(await control.evaluate(e=>!!e.closest('details.intake-disclosure')),true);assert.equal(await control.evaluate(e=>e.closest('details').open),false);}

 assert.equal(await page.locator('#field-creativeCount').inputValue(),'1');
 assert.equal(await page.locator('#field-creativeCount').evaluate(e=>e.closest('details').dataset.intakeSection),'additional');
 assert.equal(await page.locator('#field-creativeCount').evaluate(e=>e.closest('details').open),false);
 await page.locator('[data-intake-section=additional]>summary').click();
 await chooseSelect(page,page.locator('#field-creativeCount'),'1');await settleAutosave(page);await page.reload();await page.waitForSelector('[data-prop=formatId] + .studio-select-trigger');assert.equal(await page.locator('#field-creativeCount').inputValue(),'1');
 for(const width of [1366,1024,390]){await page.setViewportSize({width,height:900});const v=await page.locator('.output-settings').evaluate(e=>{const labels=[...e.querySelectorAll(':scope>label')];return {cols:getComputedStyle(e).gridTemplateColumns.split(' ').length,tops:labels.map(l=>l.getBoundingClientRect().top),overflow:e.scrollWidth>e.clientWidth+1};});assert.equal(v.overflow,false);if(width===1366){assert.equal(v.cols,3);assert.ok(v.tops.every(top=>Math.abs(top-v.tops[0])<2));}await page.locator('.output-row').first().screenshot({path:'work/asset-settings-compact/'+b.name.toLowerCase()+'-'+width+'.png'});}
 await page.locator('[data-prop=slides]').fill('6');await page.locator('[data-prop=slides]').press('Tab');assert.equal(await page.locator('[data-prop=slides]').inputValue(),'6');assert.equal(await page.locator('[data-prop=formatId]').inputValue(),'square');
 }}finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
