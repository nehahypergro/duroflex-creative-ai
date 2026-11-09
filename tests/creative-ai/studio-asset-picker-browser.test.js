'use strict';
// Asset picker stage 1 (docs/asset-picker-spec-20261108.json): sidebar divisions, tabs,
// search, multi-select campaign, single-card quick design and message-type chips for
// both brands. Read-only preview server; preflight is mocked and generate must never run.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const spec=require('../../docs/asset-picker-spec-20261108.json');
const saved=page=>page.evaluate(()=>StudioModel.storage(localStorage).read(new URLSearchParams(location.search).get('brand'),location.hash.slice(1).split('/')[1].split('?')[0]));
test('asset picker opens from the sidebar, filters, starts campaigns and quick designs for both brands',{timeout:180000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],generate=[];
 page.on('pageerror',e=>errors.push(e.stack));
 await page.route('**/api/studio/preflight',r=>r.fulfill({json:{token:'fixture',cost:{message:'Isolated test'}}}));
 await page.route('**/api/studio/generate',r=>{generate.push(r.request().url());return r.fulfill({status:500,json:{error:'Generation must not run in this test.'}});});
 await fs.mkdir('work/asset-picker-20261108',{recursive:true});
 try{for(const b of f.brands){
  await page.goto(f.url+'?brand='+b.id);await page.locator('.creation-hero').waitFor();
  // Sidebar has one "+ New" (the picker tabs list the nine divisions) and the home row shows the approved quick picks.
  {const labels=await page.locator('#sidebarNavigation [data-action=asset-picker]').allTextContents();assert.equal(labels[0],'Social');assert.equal(labels.length,9,'the 9 format groups');}
  assert.deepEqual(await page.locator('.home-page .format-tile strong').allTextContents(),['Instagram Post','Instagram Story','Facebook Post','Website Banner','WhatsApp Image','LinkedIn Post']);
  assert.deepEqual(await page.locator('.home-page .format-tile .asset-icon').evaluateAll(es=>es.map(e=>e.dataset.assetIcon)),['instagram-post','instagram-story','facebook-post','website-banner','whatsapp-image','linkedin-post']);
  await page.locator('#sidebarNavigation [data-group=social]').click();await page.locator('[data-action=picker-tab][data-division=messaging]').click();await page.locator('#assetPickerGrid .asset-card').first().waitFor();
  assert.match(page.url(),/#tools\/assets\?/);assert.equal(new URLSearchParams(page.url().split('?').pop()).get('group'),'messaging');
  assert.equal(await page.locator('[data-action=picker-tab][aria-selected=true]').innerText(),'Messaging');
  assert.deepEqual(await page.locator('#assetPickerGrid .asset-card strong').allTextContents(),spec.divisions.find(d=>d.name==='Messaging').cards.map(c=>c.name));
  // All shows one heading per division; Ad and Coming soon badges are visible on cards.
  await page.locator('[data-action=picker-tab][data-division=all]').click();
  assert.deepEqual(await page.locator('#assetPickerGrid .asset-picker-section h2').allTextContents(),spec.divisions.map(d=>d.name));
  assert.equal(await page.locator('#assetPickerGrid .asset-card').count(),77);
  // Each card shows its own decorative format icon (public/creative-ai/asset-icons.js).
  assert.deepEqual(await page.locator('#assetPickerGrid .asset-card').evaluateAll(es=>es.map(e=>e.querySelector('.asset-icon[aria-hidden=true]')?.dataset.assetIcon===e.dataset.card).filter(Boolean).length),77);
  assert.match(await page.locator('#assetPickerGrid [data-card=instagram-feed-ad]').innerText(),/\bAd\b/);
  assert.match(await page.locator('#assetPickerGrid [data-card=hiring-post]').innerText(),/Coming soon/);
  assert.match(await page.locator('#assetPickerGrid [data-card=catalogue]').innerText(),/Plan/);
  await page.locator('#assetPickerSearch').fill('story');
  const found=await page.locator('#assetPickerGrid .asset-card strong').allTextContents();
  for(const name of ['Instagram Story','Facebook Story','WhatsApp Status'])assert.ok(found.includes(name),name+' matches story');
  assert.ok(!found.includes('Instagram Post'));
  for(const id of ['instagram-story','facebook-story','whatsapp-status'])await page.locator('#assetPickerGrid [data-card='+id+']').click();
  assert.equal(await page.locator('#assetPickerGrid .asset-card[aria-checked=true]').count(),3);
  assert.match(await page.locator('#assetPickerTray').innerText(),/3 selected/);
  assert.equal(await page.locator('#assetPickerTray').innerText().then(t=>/corner logo/.test(t)),false,'logo rules are applied but not shown (8 Nov 2026)');
  await page.screenshot({path:'work/asset-picker-20261108/'+b.name.toLowerCase()+'-picker.png'});
  await page.getByRole('button',{name:'Create campaign',exact:true}).click();await page.locator('#field-brief').waitFor();
  let d=await saved(page);
  assert.equal(d.creationMode,'campaign');assert.equal(d.brandId,b.id);
  assert.deepEqual(d.outputs.map(o=>[o.assetCardId,o.name,o.featureId,o.width,o.height]),[['instagram-story','Instagram Story',8,1080,1920],['facebook-story','Facebook Story',8,1080,1920],['whatsapp-status','WhatsApp Status',14,1080,1920]]);
  assert.deepEqual(d.outputs.map(o=>o.staticValues.platform||o.staticValues.channel),['Instagram','Facebook','WhatsApp']);
  const outputs=await page.locator('#outputs .campaign-asset summary strong').allTextContents();
  assert.deepEqual(outputs.map(t=>t.trim()),['Instagram Story','Facebook Story','WhatsApp Status']);
  assert.deepEqual(await page.locator('.message-type-chip').allTextContents(),spec.messageTypes);
  assert.equal(await page.locator('.brief-platform-notes').count(),0,'logo rules are not shown in the brief (8 Nov 2026)');
  // Offer turns on the existing offer fields; another type restores the outputs.
  await page.locator('[data-message-type="Offer / price / EMI"]').click();await page.locator('[data-message-type="Offer / price / EMI"][aria-pressed=true]').waitFor();
  d=await saved(page);assert.equal(d.messageType,'Offer / price / EMI');assert.ok(d.outputs.every(o=>o.staticValues.promotionMode==='Yes'));
  assert.ok(await page.locator('[data-static-key=offer]').count()>=1,'offer fields appear');
  await page.screenshot({path:'work/asset-picker-20261108/'+b.name.toLowerCase()+'-brief.png',fullPage:true});
  await page.locator('[data-message-type="Benefit"]').click();await page.locator('[data-message-type="Benefit"][aria-pressed=true]').waitFor();
  d=await saved(page);assert.equal(d.messageType,'Benefit');assert.ok(d.outputs.every(o=>o.staticValues.promotionMode===undefined));
  // The brief's asset-type link reopens the picker with the current cards selected.
  await page.locator('.assignment-choice[data-action=add-output]').click();await page.locator('#assetPickerGrid .asset-card').first().waitFor();
  assert.deepEqual(await page.locator('#assetPickerGrid .asset-card[aria-checked=true]').evaluateAll(es=>es.map(e=>e.dataset.card)),['instagram-story','facebook-story','whatsapp-status']);
  await page.locator('#assetPickerGrid [data-card=website-banner]').click();await page.getByRole('button',{name:'Save',exact:true}).click();await page.locator('#field-brief').waitFor();
  d=await saved(page);assert.deepEqual(d.outputs.map(o=>o.assetCardId),['instagram-story','facebook-story','whatsapp-status','website-banner']);
  assert.equal(await page.locator('.brief-platform-notes').count(),0);
  // One ready card → Continue → quick design brief.
  await page.locator('[data-nav=home]').click();await page.locator('.creation-hero').waitFor();
  await page.locator('.format-more').click();await page.locator('#assetPickerGrid .asset-card').first().waitFor(); // home '+' opens the picker for one design
  assert.equal(await page.locator('[data-action=picker-continue]').isDisabled(),true);
  await page.locator('[data-action=picker-tab][data-division=ads]').click();await page.locator('#assetPickerGrid [data-card=facebook-feed-ad]').click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.locator('#field-brief').waitFor();
  d=await saved(page);assert.equal(d.creationMode,'quick');assert.equal(d.outputs.length,1);assert.deepEqual([d.outputs[0].assetCardId,d.outputs[0].staticValues.platform,d.outputs[0].staticValues.publishing],['facebook-feed-ad','Facebook','Paid']);
  assert.ok(await page.evaluate(id=>!!StudioModel.generationProfile({...StudioModel.storage(localStorage).read(new URLSearchParams(location.search).get('brand'),id),focus:'product'}),d.id));
  // Home quick pick starts the named card directly.
  await page.locator('[data-nav=home]').click();await page.locator('.creation-hero').waitFor();
  await page.getByRole('button',{name:'Create Instagram Story',exact:true}).click();await page.locator('#field-brief').waitFor();
  d=await saved(page);assert.deepEqual([d.creationMode,d.outputs[0].assetCardId,d.outputs[0].formatId],['quick','instagram-story','story']);
  // A coming-soon card is a planning brief and never reaches generation.
  await page.locator('[data-nav=home]').click();await page.locator('.creation-hero').waitFor();
  await page.getByRole('button',{name:'Browse all tools',exact:true}).click();await page.locator('#assetPickerSearch').fill('hiring');await page.locator('#assetPickerGrid [data-card=hiring-post]').click();
  assert.match(await page.locator('#assetPickerTray').innerText(),/not generated yet/);
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.locator('#field-brief').waitFor();
  d=await saved(page);assert.equal(d.outputs[0].planningOnly,true);assert.match(await page.locator('.planning-only-note').innerText(),/planning brief/);
  assert.equal(await page.locator('[data-action=generation-submit]').count(),0);
 }
 assert.deepEqual(generate,[]);assert.deepEqual(errors,[]);}finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
