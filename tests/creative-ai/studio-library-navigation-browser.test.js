'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {chromium}=require('playwright-core');
// Regression: two productPicker declarations caused Products to call the draft
// picker with no draft: TypeError reading 'focus'. Reproduced before the fix.
test('Both brand libraries render products, compact logo actions and scoped categories',async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 await fs.mkdir('work/library-navigation',{recursive:true});
 try{for(const b of f.brands){
  const page=await browser.newPage({viewport:{width:1384,height:807}}),errors=[];
  page.on('console',m=>{if(m.type()==='error'&&m.text().includes('Studio page failed'))errors.push(m.text());});
  await page.goto(f.url+'?brand='+b.id+'#library/products');
  await page.locator('.product-library').waitFor();
  assert.equal(await page.locator('#assignmentProductSearch').count(),0);
  assert.ok(await page.locator('.product-tile').count()>0);
  await page.locator('.product-expand').first().locator(':scope > summary').click();
  assert.ok(await page.locator('.product-expand').first().locator('.product-picker').isVisible());
  await page.locator('#productLibrarySearch').fill('does-not-exist-xyz');
  await page.getByRole('heading',{name:'No matching products'}).waitFor();
  await page.getByRole('button',{name:'Clear filters',exact:true}).first().click();
  await page.locator('.product-tile').first().waitFor();
  await page.screenshot({path:'work/library-navigation/'+b.name+'-products.png'});
  await page.evaluate(()=>location.hash='tools/category?from=library&group=social');
  await page.locator('.tool-catalogue').waitFor();
  assert.equal(await page.locator('.catalogue-filters,.tool-shelf-heading').count(),0);
  assert.ok(await page.locator('.tool-visual-card').count()>0);
  assert.equal(await page.locator('#toolCatalogueSearch').count(),0);
  assert.equal(await page.locator('#taskPanel > [data-action=close-task]').count(),0);
  for(const group of ['website','retail','messaging','corporate','social']){
   await page.locator('#sidebarNavigation [data-group=social]').click();await page.locator('#taskPanel [data-action=picker-tab][data-division='+group+']').click();
   await page.locator('#taskPanel [data-action=picker-tab][data-division='+group+'][aria-selected=true]').waitFor();
   const route=await page.evaluate(()=>location.hash.slice(1));
   assert.equal(new URLSearchParams(route.split('?')[1]).get('from'),'library');
   assert.ok(route.length<100,'Category navigation must not nest previous routes');
  }
  await page.screenshot({path:'work/library-navigation/'+b.name+'-category.png'});
  await page.evaluate(()=>location.hash='library');
  await page.locator('.brand-logo-variants').waitFor();
  const download=page.locator('.brand-logo-stage .logo-download').first();
  assert.equal(await download.getAttribute('aria-label'),'Download logo');
  assert.ok(await download.getAttribute('download'));
  assert.equal((await page.request.get(new URL(await download.getAttribute('href'),f.url).href)).status(),200);
  assert.equal(await page.getByText('Asset provenance',{exact:true}).count(),0);
  for(const name of ['About Typography','About Voice & creative guidance','About From the guidelines'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),0);
  for(const width of [1384,1100]){await page.setViewportSize({width,height:807});await page.waitForTimeout(350);await page.screenshot({path:'work/library-navigation/'+b.name+'-logos-'+width+'.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),JSON.stringify(await page.locator('body *').evaluateAll(xs=>xs.filter(x=>x.getBoundingClientRect().right>innerWidth+1&&x.getBoundingClientRect().width).slice(-15).map(x=>({tag:x.tagName,cls:x.className,width:x.getBoundingClientRect().width})))));}
  assert.deepEqual(errors,[]);
  // A future rendering failure must explain the failure and offer library recovery,
  // never unrelated Trash navigation or raw code/private paths.
  await page.evaluate(()=>{window.originalReadiness=StudioLibrary.productReadiness;StudioLibrary.productReadiness=()=>{throw new TypeError('secret /Users/private/example');};location.hash='library/products';});
  await page.locator('.library-failure').waitFor();
  assert.match(await page.locator('[role=alert]').textContent(),/page error prevented Studio from displaying/);
  assert.doesNotMatch(await page.locator('.library-failure').textContent(),/secret|TypeError|Trash/);
  await page.evaluate(()=>StudioLibrary.productReadiness=window.originalReadiness);
  await page.getByRole('button',{name:'Retry loading products'}).click();
  await page.locator('.product-library').waitFor();
  await page.close();
 }}finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
