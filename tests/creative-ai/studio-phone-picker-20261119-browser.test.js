'use strict';
// Regressions (19 Nov 2026, live QA, both failing before):
// 1. Brand library → Products was 543 px wide on a 375 px phone (phones zoomed the page out): a cell's screen-reader
//    label (.sr-only, position:absolute) escaped the table's scroll box because the box was not positioned.
// 2. Reloading while the format picker was open (#tools/assets?…) left "Loading…" with "We couldn't complete this action":
//    the replayed button had no closest() and the picker handler calls b.closest('#sidebarNavigation').
const test=require('node:test'),assert=require('node:assert/strict');
test('Products fits a phone, and the format picker survives a reload, for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 try{for(const b of f.brands){
  const phone=await browser.newContext({viewport:{width:375,height:812},isMobile:true}),page=await phone.newPage();page.on('pageerror',e=>errors.push(e.stack));
  await page.goto(f.url+'?brand='+b.id+'#library/products');await page.locator('table.product-table').waitFor({timeout:15000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),375,b.name+': the Products page is no wider than the phone');
  await phone.close();
  const context=await browser.newContext({viewport:{width:1280,height:900}}),desk=await context.newPage();desk.on('pageerror',e=>errors.push(e.stack));
  await desk.goto(f.url+'?brand='+b.id+'#home');await desk.locator('[data-action=asset-picker]').first().click();await desk.locator('.asset-picker').waitFor();
  assert.match(desk.url(),/#tools\/assets/);
  await desk.reload();await desk.locator('.asset-picker').waitFor({timeout:15000});
  assert.equal(await desk.getByText('We couldn’t complete this action').count(),0,b.name+': no error after reloading the picker');
  await desk.locator('[data-action=picker-toggle]').first().click();assert.equal(await desk.locator('[data-action=picker-toggle][aria-checked=true]').count(),1,'the reloaded picker works');
  await desk.waitForLoadState('networkidle').catch(()=>{});await context.close();
 }assert.deepEqual(errors,[]);}finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
