'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
test('catalogue formats keep aligned desktop requirements for both brands',{timeout:180000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview();
 const browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 await fs.mkdir('work/category-requirements',{recursive:true});
 try{for(const brand of f.brands){
  const page=await browser.newPage({viewport:{width:1384,height:807}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(f.url+'?brand='+brand.id+'#tools?from=home');
  await page.locator('#toolCatalogueSearch').waitFor();
  await page.locator('#toolCatalogueSearch').fill('Website Banner');
  assert.equal(await page.locator('.tool-visual-card:visible').count(),1);
  await page.locator('#toolCatalogueSearch').fill('');
  const cards=await page.locator('.tool-visual-card').evaluateAll(xs=>xs.map((e,index)=>({index,name:e.querySelector('strong').textContent,caption:e.querySelector('small').textContent,platform:e.dataset.imagePlatform})));
  let checked=0;
  for(const card of cards){
   if(card.platform==='Push icons'||card.caption==='Planning brief')continue;
   assert.match(card.caption,/^\d+ × \d+ px(?: · .+)?$|^Multiple sizes · .+$|^Physical size · Print$/);
   if(checked){await page.evaluate(()=>location.hash='tools?from=home');await page.locator('#toolCatalogueSearch').waitFor();}
   await page.locator('.tool-visual-card').nth(card.index).click();
   await page.locator('#briefForm .output-row').first().waitFor();
   const border=await page.locator('.assignment-selector').evaluate(e=>getComputedStyle(e).borderTopWidth);
   assert.equal(border,'1px');
   for(const width of [1384,1100]){
    await page.setViewportSize({width,height:807});
    const layout=await page.locator('.assignment-requirements').evaluate(root=>{
     const controls=[...root.querySelectorAll('input,textarea,select,button.studio-select-trigger')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).opacity!=='0');
     const boxes=controls.map(e=>({name:e.getAttribute('aria-label')||e.name||e.dataset.prop||e.tagName,r:e.getBoundingClientRect().toJSON()}));
     const overlaps=[];
     for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
      const a=boxes[i].r,b=boxes[j].r;if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)overlaps.push([boxes[i].name,boxes[j].name]);
     }
     return {overlaps,overflow:document.documentElement.scrollWidth>innerWidth+1,notes:[...root.querySelectorAll('.output-settings>.hint')].map(e=>getComputedStyle(e).gridColumn)};
    });
    assert.deepEqual(layout.overlaps,[],brand.name+' '+card.name+' '+width);
    assert.equal(layout.overflow,false,card.name+' horizontal overflow');
    assert.ok(layout.notes.every(x=>x==='1 / -1'),card.name+' notes get their own row');
   }
   if(['Google Business Profile Post','Instagram Carousel','Marketplace A+ Images','Email Header / Hero','Website Banner'].includes(card.name)){
    await page.setViewportSize({width:1384,height:807});
    await page.locator('.assignment-requirements').screenshot({path:'work/category-requirements/'+brand.name+'-'+card.name.replace(/[^a-z0-9]+/gi,'-')+'.png'});
   }
   if(card.name==='Instagram Carousel'){
    await page.locator('[data-prop=slides]').fill('6');await page.locator('[data-prop=slides]').press('Tab');
    assert.equal(await page.locator('[data-prop=slides]').inputValue(),'6');
   }
   checked++;
  }
  assert.ok(checked>=20,'Cover all active catalogue briefs');
  assert.deepEqual(errors,[]);console.log(brand.name+': '+checked+' formats checked at two desktop widths');
  await page.close();
 }}finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
