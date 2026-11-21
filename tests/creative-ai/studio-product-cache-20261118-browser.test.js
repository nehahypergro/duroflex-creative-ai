'use strict';
// Neha (18 Nov 2026): "cant it be in cache". The product list is kept in the browser (7 days, per brand and account):
// a later visit shows the products at once while the server's list is still on its way, and the fresh list replaces
// the kept one when it arrives. A kept list is never used for another brand. Failing before.
const test=require('node:test'),assert=require('node:assert/strict');
// Remove the saved whole-workspace copy (kept 30 minutes) so only the kept product list can help.
const dropWorkspaceCopy=page=>page.evaluate(()=>new Promise(done=>{sessionStorage.clear();const r=indexedDB.open('creative-ai-workspace-cache',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots'),keys=store.getAllKeys();keys.onsuccess=()=>{for(const k of keys.result)if(!String(k).startsWith('products:'))store.delete(k);};tx.oncomplete=()=>{db.close();done();};};r.onerror=()=>done();}));
async function brief(page,f,b){await page.evaluate(b=>{const d=StudioModel.startDraft(b.id,'quick',1);d.brief='Keep this brief';StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},b);await page.locator('[data-action=assignment-product]').click();await page.locator('.product-picker-dialog').waitFor();}
test('a later visit shows kept products at once and the fresh list replaces them, for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 try{for(const b of f.brands){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
  const all=f.products[b.id];assert.ok(all.length>1);
  await page.goto(f.url+'?brand='+b.id);await page.waitForSelector('.creation-hero');
  await page.waitForFunction(id=>new Promise(done=>{const r=indexedDB.open('creative-ai-workspace-cache',1);r.onsuccess=()=>{const g=r.result.transaction('snapshots').objectStore('snapshots').get('products:'+id);g.onsuccess=()=>{r.result.close();done(!!g.result);};g.onerror=()=>done(false);};r.onerror=()=>done(false);}),b.id);
  await dropWorkspaceCopy(page);
  let release;const held=new Promise(r=>{release=r;});let served=0;
  await page.route('**/creative-ai/api/brands/'+b.id+'/products*',async route=>{served++;await held;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(all.slice(1))});});
  await page.reload();await page.waitForSelector('.creation-hero',{timeout:15000});
  await brief(page,f,b);
  assert.equal(await page.locator('[data-assignment-product]').count(),all.length,b.name+': kept products are listed while the server is still answering');
  assert.ok(served>=1,'the server list is still asked for');
  release();
  await page.waitForFunction(n=>document.querySelectorAll('[data-assignment-product]').length===n,all.length-1);
  assert.equal(await page.locator(`[data-assignment-product="${all[0].id}"]`).count(),0,b.name+': the fresh list replaces the kept one');
  await context.close();
 }assert.deepEqual(errors,[]);}finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
test('a kept product list is never used for the other brand',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 try{const [one,two]=f.brands;const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
  await page.goto(f.url+'?brand='+two.id);await page.waitForSelector('.creation-hero');
  // Put the first brand's products under the second brand's key, then make the second brand's server list slow.
  await page.evaluate(({key,rows})=>new Promise(done=>{const r=indexedDB.open('creative-ai-workspace-cache',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put({brandId:key.slice(9),at:Date.now(),rows},key);tx.oncomplete=()=>{db.close();done();};};}),{key:'products:'+two.id,rows:f.products[one.id]});
  await dropWorkspaceCopy(page);
  let release;const held=new Promise(r=>{release=r;});
  await page.route('**/creative-ai/api/brands/'+two.id+'/products*',async route=>{await held;return route.continue();});
  await page.reload();await page.waitForTimeout(1500);
  assert.ok(!(await page.locator('main').innerText()).includes(f.products[one.id][0].name),'no '+one.name+' product appears in '+two.name);
  release();await page.waitForSelector('.creation-hero');await brief(page,f,two);
  const ids=await page.locator('[data-assignment-product]').evaluateAll(els=>els.map(e=>e.dataset.assignmentProduct));
  assert.deepEqual(ids.sort(),f.products[two.id].map(p=>p.id).sort());
  await context.close();assert.deepEqual(errors,[]);
 }finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
