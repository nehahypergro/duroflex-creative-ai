'use strict';
// 8 Nov 2026 brief-form changes (rows 2, 4, 5, 13): single-variant products need no extra click, mattresses
// get a visible, changeable Queen suggestion, size chips filter long variant lists, optional targeting is
// collapsed but opens on an error, and a complete brief shows its estimate and create button inline.
// Generation is requested only by the explicit click (the preview answers it with an error).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const read=page=>page.evaluate(()=>StudioModel.storage(localStorage).read(new URLSearchParams(location.search).get('brand'),location.hash.split('/')[1]));
test('brief form: quick product picking, optional targeting and inline create for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],generate=[],preflight=[];
 page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/studio/preflight',r=>{preflight.push(r.request().postDataJSON());return r.fulfill({json:{token:'quick-test-token',cost:{message:'Estimated ₹100 (test fixture)'},summary:{assets:1}}});});
 await page.route('**/api/studio/generate',r=>{generate.push(r.request().postDataJSON());return r.fulfill({status:503,json:{error:'Test: generation is not available here.'}});});
 try{await fs.mkdir('work/brief-form-20261108',{recursive:true});
 for(const b of f.brands){
  const products=f.products[b.id],single=products.find(p=>(p.variants||[]).length===1),mattress=products.find(p=>/mattress/i.test(p.category||'')&&(p.variants||[]).length>=30);
  assert.ok(single&&mattress,b.name+' has a single-variant product and a long mattress list');
  await page.goto(f.url+'?brand='+b.id);await page.waitForSelector('#homeBrief,.creation-hero');
  await page.evaluate(id=>{const d=StudioModel.startAssetDraft(id,['instagram-story']);d.intakeVersion=2;d.brief='A festive story about better sleep.';StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},b.id);
  await page.locator('#briefForm').waitFor();
  // Row 2: targeting is collapsed; nothing required is inside it.
  const optional=page.locator('[data-intake-section=additional]');assert.equal(await optional.getAttribute('open'),null);assert.match(await optional.locator(':scope>summary').innerText(),/Sharpen targeting \(optional\)/);
  assert.ok(await page.locator('.message-type-chips').isVisible(),'Message type stays up front');for(const hidden of ['[data-audience-group=audience]','[data-audience-group=customerAge]','[data-audience-group=markets]','#goal-get'])assert.equal(await page.locator(hidden).isVisible(),false,hidden+' starts collapsed');
  assert.ok(await page.locator('#field-brief').isVisible());assert.ok(await page.locator('#field-productId').isVisible());assert.ok(await page.locator('.assignment-requirements').isVisible());
  // Row 5a: one variant is selected with the product, no "Use this product" step.
  await page.locator('[data-action=assignment-product]').click();await page.locator('[data-assignment-product="'+single.id+'"]').click();
  await page.locator('.product-picker-dialog').waitFor({state:'detached'});let d=await read(page);assert.equal(d.productId,single.id);assert.equal(String(d.variant),String(single.variants[0].id));assert.equal(await page.locator('.variant-suggestion').count(),0);
  // Row 5b: a mattress gets the standard Queen, shown as a suggestion with an amber dot.
  await page.locator('[data-action=assignment-product]').click();await page.locator('[data-assignment-product="'+mattress.id+'"]').click();
  await page.locator('.product-picker-dialog').waitFor({state:'detached'});d=await read(page);const queen=await page.evaluate(p=>StudioModel.defaultVariant(p),mattress);
  assert.ok(queen);assert.equal(String(d.variant),queen);const suggestion=page.locator('.variant-suggestion');assert.match(await suggestion.innerText(),/We picked Queen/);assert.equal(await page.locator('#field-productId .understood-dot.ours').count(),1);
  await page.screenshot({path:'work/brief-form-20261108/test-'+b.name.toLowerCase()+'-suggested-size.png'});
  // Row 5c: size chips filter the long list; picking a King replaces the suggestion with the user's choice.
  await suggestion.getByRole('button',{name:'Change size'}).click();const chips=page.locator('[data-variant-size]');await chips.first().waitFor();
  assert.equal(await page.locator('[data-variant-size="Queen"]').getAttribute('aria-pressed'),'true');
  const select=page.locator('[data-product-detail-variant]');assert.equal(await select.inputValue(),queen);
  const total=(mattress.variants||[]).length,queenRows=await select.locator('option:not([value=""])').count();assert.ok(queenRows<total&&queenRows>0,'Queen chip filters '+queenRows+' of '+total);
  assert.ok((await select.locator('option:not([value=""])').allInnerTexts()).every(t=>/^Queen/i.test(t.trim())));
  await page.screenshot({path:'work/brief-form-20261108/test-'+b.name.toLowerCase()+'-size-chips.png'});
  await page.locator('[data-variant-size="King"]').click();assert.ok((await select.locator('option:not([value=""])').allInnerTexts()).every(t=>/^King/i.test(t.trim())));assert.equal(await select.inputValue(),'');
  await page.locator('[data-product-confirm]').click();assert.match(await page.locator('[data-variant-error]').innerText(),/Choose the exact variant/);
  const king=await select.locator('option:not([value=""])').first().getAttribute('value');await select.selectOption(king);await page.locator('[data-product-confirm]').click();await page.locator('.product-picker-dialog').waitFor({state:'detached'});
  d=await read(page);assert.equal(String(d.variant),king);assert.equal(await page.locator('.variant-suggestion').count(),0);
  // Row 4: complete brief -> estimate + create inline; no dialog and no generation without the click.
  const create=page.locator('[data-action=brief-create]');await create.waitFor();await page.waitForFunction(()=>!document.querySelector('[data-action=brief-create]')?.disabled);
  assert.match(await page.locator('#briefInlineEstimate').innerText(),/Estimated ₹100 \(test fixture\)/);assert.equal(await page.locator('.brief-review-dialog').count(),0);assert.ok(preflight.length>0);assert.equal(generate.length,0,'No generation before the click');
  assert.equal(preflight.at(-1).draft.confirmedBrief?.version,1,'The estimate is for a confirmed copy');assert.equal((await read(page)).confirmedBrief,undefined,'Nothing is confirmed until create');
  await page.locator('#assignmentStatus').screenshot({path:'work/brief-form-20261108/test-'+b.name.toLowerCase()+'-inline-create.png'});
  // Missing item -> back to "Check brief" (dialog fallback) and no create button.
  await page.locator('#field-brief').fill('');await page.waitForFunction(()=>!document.querySelector('[data-action=brief-create]')&&document.querySelector('[data-action=assignment-review]')?.textContent.includes('Check brief'));
  await page.locator('[data-action=assignment-review]').click();await page.locator('.brief-review-dialog').waitFor();assert.match(await page.locator('.brief-review-dialog').innerText(),/No brief written yet/);assert.doesNotMatch(await page.locator('.brief-review-dialog').innerText(),/See attached brief/);await page.locator('[data-assignment-back]').click();
  await page.locator('#field-brief').fill('A festive story about better sleep.');await page.waitForFunction(()=>document.querySelector('[data-action=brief-create]')&&!document.querySelector('[data-action=brief-create]').disabled);assert.equal(generate.length,0);
  await create.click();await page.waitForFunction(()=>document.querySelector('#briefInlineEstimate')?.textContent.includes('Retry'));
  assert.equal(generate.length,1,'Exactly one generation request, from the click');assert.equal(generate[0].token,'quick-test-token');d=await read(page);assert.ok(d.confirmedBrief&&await page.evaluate(x=>StudioModel.confirmationCurrent(x),d),'The confirmed brief is saved before the request');
  // Row 2 + 13: an error inside the optional section opens it and shows a red dot.
  await page.evaluate(()=>{const id=location.hash.split('/')[1],brand=new URLSearchParams(location.search).get('brand'),s=StudioModel.storage(localStorage),x=s.read(brand,id);Object.assign(x,{wordingMode:'supplied',suppliedWording:''});s.save(x);});await page.reload();await page.locator('#briefForm').waitFor();
  assert.equal(await page.locator('[data-action=brief-create]').count(),0);await page.locator('[data-action=assignment-review]').click();await page.locator('.brief-review-dialog').waitFor();await page.locator('[data-assignment-back]').click();
  assert.equal(await optional.getAttribute('open'),'');assert.ok(await page.locator('#field-suppliedWording').isVisible());assert.equal(await page.locator('label[for=field-suppliedWording] .understood-dot.need').count(),1);
  assert.match(await page.locator('label[for=field-suppliedWording] .value-origin .sr-only').innerText(),/Needs you/);
  generate.length=0;preflight.length=0;
 }
 assert.deepEqual(errors,[]);}finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
