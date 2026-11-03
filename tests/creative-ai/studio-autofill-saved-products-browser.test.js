'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
test('brand-prefixed model names fill saved products and persist without generation',{timeout:60000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview();
 let browser;
 try{
  browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
  const page=await browser.newPage({viewport:{width:1384,height:900}}),errors=[],dispatches=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!==new URL(f.url).origin||request.method()!=='GET'){dispatches.push(request.url());return route.abort();}
   return route.continue();
  });
  await fs.mkdir('work/autofill-resume-20261101',{recursive:true});
  for(const brand of f.brands){
   const alias=brand.name==='Duroflex'?'Airboost 6.8':'Napster Mini';
   const expected=f.products[brand.id].filter(p=>p.name.includes(alias));assert.equal(expected.length,1);
   await page.goto(f.url+'?brand='+brand.id);await page.waitForSelector('.creation-hero');
   await page.evaluate(id=>{const d=StudioModel.startDraft(id,'quick',9);d.intakeVersion=2;StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},brand.id);
   const brief='Create a Hindi Instagram carousel with six cards for '+brand.name+' '+alias+'.';
   await page.locator('#field-brief').fill(brief);
   await page.waitForFunction(name=>document.querySelector('#field-productId')?.textContent.includes(name),expected[0].name);
   assert.equal(await page.locator('[data-field=language]').inputValue(),'Hindi');
   assert.equal(await page.locator('[data-prop=slides]').inputValue(),'6');
   assert.equal(await page.locator('[data-action=brief-match-product]').count(),0);
   await page.reload();await page.waitForSelector('#field-brief');
   const saved=await page.evaluate(()=>StudioModel.storage(localStorage).read(new URLSearchParams(location.search).get('brand'),location.hash.split('/')[1]));
   assert.equal(saved.productId,expected[0].id);assert.equal(saved.language,'Hindi');assert.equal(saved.outputs[0].language,'Hindi');assert.equal(saved.outputs[0].slides,6);assert.equal(saved.brief,brief);
   await page.screenshot({path:'work/autofill-resume-20261101/'+brand.name.toLowerCase()+'-model-name.png'});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(dispatches,[]);
 }finally{if(browser)await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
