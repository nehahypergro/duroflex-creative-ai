'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
test('Desktop brand switching keeps library and category context in both directions',async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 try{const page=await browser.newPage({viewport:{width:1384,height:807}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('Studio page failed'))errors.push(m.text());});
 const cases=[['library','.brand-profile'],['library/products','.product-library'],['library/manage','.library-manage'],['tools/category?from=library&group=social','.tool-catalogue'],['projects','.projects-page'],['favourites','.filters']];
 for(const [route,selector]of cases){
  await page.goto(f.url+'?brand='+f.brands[0].id+'#'+route);
  if(route==='favourites')await page.getByRole('heading',{name:'Favourites',exact:true}).waitFor();else await page.locator(selector).waitFor();
  if(route==='library/manage')await page.getByRole('tab',{name:'Fonts',exact:true}).click();
  for(const b of [f.brands[1],f.brands[0]]){
   await page.locator('[data-brand="'+b.id+'"]').click();
   await page.waitForFunction(id=>window.activeBrand?.id===id&&!document.querySelector('.workspace-loader')?.checkVisibility(),b.id);
   const expected=route==='library/manage'?'library/manage?section=font':route.startsWith('tools/')?'tools/category?group=social&from=library':route;
   assert.equal(new URL(page.url()).hash,'#'+expected);
   assert.equal(new URL(page.url()).searchParams.get('brand'),b.id);
   if(route==='library'){
    await page.locator('.brand-profile').waitFor();
    assert.equal(await page.locator('.brand-profile-header h2').textContent(),b.name);
    const sources=await page.locator('.brand-logo-stage img').evaluateAll(xs=>xs.map(x=>x.src));
    assert.ok(sources.length&&sources.every(x=>x.includes(b.id)));
   }
   if(route==='library/products'){
    await page.locator('.product-library').waitFor();
    const ids=await page.locator('.product-picker').evaluateAll(xs=>xs.map(x=>x.dataset.product));
    assert.ok(ids.length&&ids.every(id=>f.products[b.id].some(p=>p.id===id)));
    assert.equal(await page.getByRole('tab',{name:'Products',exact:true}).getAttribute('aria-selected'),'true');
   }
   if(route==='library/manage'){
    await page.locator('[data-library-form=font]:visible').waitFor();
    assert.equal(await page.getByRole('tab',{name:'Fonts',exact:true}).getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('.library-brand-chip').textContent(),b.name);
   }
   if(route.startsWith('tools/')){await page.getByRole('heading',{name:'Social & ads',exact:true}).waitFor();assert.equal(await page.locator('.tool-shelf').count(),1);}
  }
 }
 assert.deepEqual(errors,[]);await page.close();
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
