'use strict';
// User decision (18 Nov 2026, Neha): Create in the Home brief box opens the brief form, filled in from the reading,
// "because they would still want to edit" - the separate read-back page felt like a random step. The form labels each
// value from the brief or suggested by the reading, keeps local pattern autofill off (no Undo that could clear the
// reading), and nothing paid starts before Check brief. Failing before.
const test=require('node:test'),assert=require('node:assert/strict');
test('Create from the Home brief box opens the filled brief form, for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 try{for(const b of f.brands){
  const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
  const product=f.products[b.id].find(p=>(p.variants||[]).length)||f.products[b.id][0];const paid=[];
  await page.route('**/creative-ai/api/studio/**',route=>{paid.push(route.request().url());return route.fulfill({status:501,json:{error:'Not in this test'}});});
  await page.route('**/creative-ai/api/brands/'+b.id+'/brief-read',async route=>{const body=route.request().postDataJSON();assert.equal(body.brandName,b.name);return route.fulfill({json:{id:'read-'+b.id.slice(6,14),status:'finished',updatedAt:'2026-11-18T10:00:00Z',result:{ask:'An Instagram post for '+product.name+'.',assets:[{cardId:'instagram-post',source:'brief'}],product:{productId:product.id,candidateIds:[product.id],variantId:'',evidence:product.name,source:'brief'},messageType:{value:'Benefit',source:'brief'},objective:{value:'Consideration',source:'suggested',reason:'Shows why to choose it'},language:{value:'Hindi',source:'brief'},audience:{value:'New parents',source:'brief'},tone:{value:'',source:'none'},keyMessage:{value:'',source:'none'},features:[],offer:{wording:'',terms:'',startDate:'',endDate:''},exactWording:[],occasion:{value:'',source:'none'},cta:{value:'',source:'none'},contactDetails:false,logoRequested:false,otherBrandMentioned:'',assumptions:[],questions:[],decision:'design'}}});});
  await page.goto(f.url+'?brand='+b.id+'#home');await page.locator('#homeBrief').waitFor();
  const brief='Instagram post for '+product.name+' in Hindi for new parents';
  await page.locator('#homeBrief').fill(brief);await page.locator('[data-home-brief] [type=submit]').click();
  await page.waitForURL(/#brief\/draft-/,{timeout:15000});await page.locator('#field-brief').waitFor();
  assert.equal(await page.locator('.understood-page').count(),0,b.name+': the read-back page is skipped');
  assert.equal(await page.locator('#field-brief').inputValue(),brief,'the brief text is kept');
  assert.ok((await page.locator('[data-action=assignment-product]').innerText()).includes(product.name),'the product is filled in');
  assert.equal(await page.locator('#field-language').inputValue(),'Hindi');
  const label=async name=>page.locator(`label[for=field-${name}], [data-field=${name}], #field-${name}`).first().evaluate((el,name)=>{const box=el.closest('.field,.brief-field,section,div');return box?.querySelector('.understood-dot,.value-origin')?.getAttribute('title')||box?.innerText||'';},name);
  assert.match(await label('language'),/From your brief/,'Language is labelled from the brief');
  assert.equal(await page.locator('[data-action=brief-autofill-undo],button:text-is("Undo")').count(),0,'no autofill Undo that could clear the reading');
  // Everything stays editable here.
  await page.locator('#field-language').selectOption('English');assert.equal(await page.locator('#field-language').inputValue(),'English');
  assert.deepEqual(paid.filter(u=>/generate/.test(u)),[],'nothing is created before Check brief');
  await page.waitForLoadState('networkidle').catch(()=>{});await context.close();
 }assert.deepEqual(errors,[]);}finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});

// Neha (18 Nov 2026): "Yes, add them" - the reading's assumptions and questions, shown on the read-back page before,
// are listed on the brief form under the brief. Done clears a question; a changed value is no longer an assumption.
test('the brief form lists what the reading assumed and asked, for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 try{for(const b of f.brands){
  const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
  await page.goto(f.url+'?brand='+b.id+'#home');await page.locator('#homeBrief').waitFor();
  const id=await page.evaluate(({brandId,products})=>{const p=products.find(x=>(x.variants||[]).length)||products[0],result={ask:'A post.',assets:[{cardId:'instagram-post',source:'brief'}],product:{productId:p.id,candidateIds:[p.id],variantId:'',evidence:p.name,source:'brief'},messageType:{value:'Benefit',source:'brief'},objective:{value:'Consideration',source:'suggested',reason:'Shows why to choose it'},language:{value:'English',source:'brief'},audience:{value:'',source:'none'},tone:{value:'',source:'none'},keyMessage:{value:'',source:'none'},features:[],offer:{wording:'',terms:'',startDate:'',endDate:''},exactWording:[],occasion:{value:'',source:'none'},cta:{value:'',source:'none'},contactDetails:false,logoRequested:false,otherBrandMentioned:'',assumptions:['Feed post, not a story.'],questions:[{field:'other',question:'Is this for first-time buyers?'}],decision:'design'};
   const d=StudioModel.draftFromReading(brandId,{id:'read-1',result},{brief:'A post for our mattress',products,today:'2026-11-18'});StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;return d.id;},{brandId:b.id,products:f.products[b.id]});
  const notes=page.locator('#readingNotes');await notes.waitFor();
  const items=async sel=>notes.locator(sel+' li').allInnerTexts();
  const assumed=await items('[data-reading-assumptions]');
  assert.ok(assumed.some(a=>/^Objective: Consideration — Shows why to choose it/.test(a)),b.name+': the suggested objective is listed');
  assert.ok(assumed.includes('Feed post, not a story.'));assert.ok(assumed.some(a=>/No phone number/.test(a)));
  assert.match((await items('[data-reading-questions]')).join(),/first-time buyers/);
  await notes.locator('[data-action=reading-question-done]').click();
  assert.equal(await page.locator('[data-reading-questions]').count(),0,'Done clears the question');
  const saved=await page.evaluate(id=>StudioModel.storage(localStorage).read(location.search.match(/brand=([^&]+)/)[1],id).briefReading.answered,id);assert.deepEqual(saved,['Is this for first-time buyers?'],'and it stays cleared');
  await page.locator('#field-objective').evaluate(el=>{el.value='Purchase';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>!/Objective: Consideration/.test(document.querySelector('#readingNotes')?.innerText||''));
  await page.waitForLoadState('networkidle').catch(()=>{});await context.close();
 }assert.deepEqual(errors,[]);}finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
