'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
test('both brands: brief autofill, manual goal protection and aligned desktop presentation',{timeout:90000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage({viewport:{width:1384,height:807}}),errors=[],paid=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/api\/studio\/generate/.test(r.url()))paid.push(r.url())});page.setDefaultTimeout(8000);
 await fs.mkdir('work/readiness-fix-20261031',{recursive:true});
 try{for(const b of f.brands){
  await page.goto(f.url+'?brand='+b.id);await page.locator('[data-action=asset-picker][data-mode=campaign]').click();await require('./helpers/ui-controls.cjs').pickFormats(page,['instagram-post','facebook-post']);await page.locator('#goal-get').waitFor({state:'attached'});await require('./helpers/ui-controls.cjs').openTargeting(page);
  await page.locator('#field-brief').fill('Get homeowners to consider a sofa by showing comfort');await page.waitForFunction(()=>document.querySelector('#goal-get')?.value==='homeowners');
  assert.equal(await page.locator('#goal-to').inputValue(),'consider a sofa');assert.equal(await page.locator('#goal-by').inputValue(),'showing comfort');
  await page.locator('#field-brief').fill('Get families to explore the collection by showing everyday comfort');await page.waitForFunction(()=>document.querySelector('#goal-get')?.value==='families');
  await page.locator('#goal-get').fill('Young couples');await page.locator('#goal-get').blur();await page.locator('#field-brief').fill('Get students to explore a sofa by showing support');await page.waitForTimeout(1000);assert.equal(await page.locator('#goal-get').inputValue(),'Young couples');
  for(const width of [1384,1063]){await page.setViewportSize({width,height:807});const layout=await page.evaluate(()=>{const legend=document.querySelector('.audience-legend'),children=[...legend.children].map(e=>e.getBoundingClientRect());return {overflow:document.documentElement.scrollWidth>innerWidth+1,alignment:Math.abs((children[0].top+children[0].bottom)/2-(children[1].top+children[1].bottom)/2),badges:[...document.querySelectorAll('.origin-default')].some(e=>e.getBoundingClientRect().height>0),header:getComputedStyle(document.querySelector('.flow-header')).backgroundImage};});assert.equal(layout.overflow,false);assert.ok(layout.alignment<1);assert.equal(layout.badges,false);assert.match(layout.header,/238, 228, 255/);await page.locator('.audience-presets').scrollIntoViewIfNeeded();await page.screenshot({path:'work/readiness-fix-20261031/'+b.name.toLowerCase()+'-brief-'+width+'.png'});}
 }assert.deepEqual(errors,[]);assert.deepEqual(paid,[]);}finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
