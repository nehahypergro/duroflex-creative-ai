'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),M=require('../../public/creative-ai/studio-model');
test('both brands: goal parts follow selections, retain manual edits and blanks, undo and reload',{timeout:60000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview();let browser;
 try{
  browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
  const page=await browser.newPage({viewport:{width:1384,height:950}}),errors=[],paid=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/generate|^https?:\/\/(?!127\.0\.0\.1)/.test(r.url()))paid.push(r.url());});
  await page.route('**/api/studio/preflight',r=>r.fulfill({json:{token:'fixture',cost:{message:'Isolated test'}}}));
  await fs.mkdir('work/communication-goal-resume-20261101',{recursive:true});
  for(const b of f.brands){
   const product=f.products[b.id].find(p=>M.productRtbs(p).length>=2&&M.productRtbs(p).slice(0,2).every(v=>v.length<700));assert.ok(product);
   const facts=M.productRtbs(product);
   await page.goto(f.url+'?brand='+b.id);await page.locator('.creation-hero').waitFor();
   await page.evaluate(({brand,product})=>{const d=StudioModel.startDraft(brand,'quick',1);Object.assign(d,{intakeVersion:2,productId:product.id,productName:product.name,rtbProductId:product.id,variant:String(product.variants?.[0]?.id||'')});StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},{brand:b.id,product});
   await page.locator('#field-brief').fill('Create a square post.');await require('./helpers/ui-controls.cjs').openTargeting(page); // 8 Nov 2026: goal and audience are in Sharpen targeting (optional)
   await page.locator('[data-audience-choice=audience][data-value=Families]').click();
   await page.getByRole('radio',{name:'Consideration',exact:true}).click();
   await page.locator('[data-intake-chip=selectedRtbs]').first().check();
   assert.equal(await page.locator('#goal-get').inputValue(),'Families');assert.equal(await page.locator('#goal-to').inputValue(),'consider the product');assert.equal(await page.locator('#goal-by').inputValue(),'highlighting '+facts[0]);
   assert.equal(await page.getByText('Autofilled',{exact:true}).count(),0);await page.getByRole('button',{name:'Undo autofill',exact:true}).waitFor();
   await page.locator('#goal-get').fill('My audience');await page.locator('#goal-by').fill('');
   await page.getByRole('radio',{name:'Education',exact:true}).click();await page.locator('[data-intake-chip=selectedRtbs]').nth(1).check();
   assert.equal(await page.locator('#goal-get').inputValue(),'My audience');assert.equal(await page.locator('#goal-to').inputValue(),'learn about the product');assert.equal(await page.locator('#goal-by').inputValue(),'');
   await page.waitForFunction(()=>{const d=StudioModel.storage(localStorage).read(new URLSearchParams(location.search).get('brand'),location.hash.split('/')[1]);return d?.message==='GET — My audience\nTO — learn about the product';});
   await page.reload();await page.locator('#goal-get').waitFor();assert.equal(await page.locator('#goal-get').inputValue(),'My audience');assert.equal(await page.locator('#goal-by').inputValue(),'');
   await page.getByRole('button',{name:'Undo autofill',exact:true}).click();assert.equal(await page.locator('#goal-get').inputValue(),'My audience');assert.equal(await page.locator('#goal-to').inputValue(),'');
   await page.reload();await page.locator('#goal-to').waitFor();assert.equal(await page.locator('#goal-to').inputValue(),'');
   await page.getByRole('radio',{name:'Consideration',exact:true}).click();assert.equal(await page.locator('#goal-to').inputValue(),'consider the product');assert.equal(await page.locator('#goal-by').inputValue(),'');
   await page.locator('[data-action=assignment-review]').click();assert.match(await page.locator('.communication-goal-review').innerText(),/GET — My audience\s+TO — consider the product/);await page.locator('[data-assignment-back]').click();
   for(const width of [1384,390]){await page.setViewportSize({width,height:950});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('.communication-goal').screenshot({path:'work/communication-goal-resume-20261101/'+b.name.toLowerCase()+'-'+width+'.png'});}await page.setViewportSize({width:1384,height:950});
   await page.evaluate(brand=>{const d=StudioModel.startDraft(brand,'quick',1);d.focus='brand';StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},b.id);
   await page.locator('#field-brief').fill('Get families to feel excited about Diwali by highlighting the festive collection.');await page.waitForFunction(()=>document.querySelector('#goal-to')?.value==='feel excited about Diwali');await require('./helpers/ui-controls.cjs').openTargeting(page);
   await page.locator('#goal-get').fill('Approved audience');await page.locator('#field-brief').fill('Get students to explore the collection by highlighting choice.');await page.waitForFunction(()=>document.querySelector('#goal-by')?.value==='highlighting choice');assert.equal(await page.locator('#goal-get').inputValue(),'Approved audience');assert.equal(await page.locator('#goal-to').inputValue(),'explore the collection');
  }
  assert.deepEqual(errors,[]);assert.deepEqual(paid,[]);
 }finally{if(browser)await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
