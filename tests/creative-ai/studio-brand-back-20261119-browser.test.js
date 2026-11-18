'use strict';
// Regression (19 Nov 2026, live QA): after switching brand, the browser's Back button landed on an address for the
// previous brand (?brand=Duroflex) while the page, the brand switch and the projects stayed on the new brand, so a
// reload or a copied link opened a different brand from the one on screen. Back now loads the address's brand.
const test=require('node:test'),assert=require('node:assert/strict');
test('Back after a brand switch shows the brand in the address, both directions',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 try{for(const [from,to] of [[f.brands[0],f.brands[1]],[f.brands[1],f.brands[0]]]){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
  await page.goto(f.url+'?brand='+from.id+'#home');await page.locator('#homeBrief').waitFor();
  await page.evaluate(()=>{location.hash='projects';});await page.waitForFunction(()=>/^Projects/.test(document.title));
  await page.locator(`.brand-option[data-brand="${to.id}"]`).click();await page.waitForFunction(n=>document.title.includes(n),to.name);
  await page.goBack();
  await page.waitForFunction(n=>document.title.includes(n),from.name,{timeout:15000});
  const url=new URL(page.url());assert.equal(url.searchParams.get('brand'),from.id);
  assert.equal(await page.locator(`.brand-option[data-brand="${from.id}"]`).getAttribute('aria-pressed'),'true',from.name+': the switch shows the address brand');
  await page.waitForLoadState('networkidle').catch(()=>{});await context.close();
 }assert.deepEqual(errors,[]);}finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
