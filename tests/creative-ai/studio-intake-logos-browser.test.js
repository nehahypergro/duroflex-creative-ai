'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('intake preview shows the saved logos for both brands, including after switching',{timeout:20000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage();
 try{for(const brand of f.brands){await page.goto(f.url+'?brand='+brand.id);await page.waitForSelector('#brandSwitch .brand-option');await page.waitForFunction(()=>[...document.querySelectorAll('.brand-switch-logo')].every(i=>i.complete),{},{timeout:5000});const logos=await page.locator('.brand-switch-logo').evaluateAll(es=>es.map(i=>({width:i.naturalWidth,hidden:i.hidden,src:i.getAttribute('src')})));assert.equal(logos.length,2);assert.ok(logos.every(i=>i.width>0&&!i.hidden),'Both approved brand logos must load, not fall back to names');for(const logo of logos)assert.equal((await fetch(new URL(logo.src,f.url))).status,200);}
 const root=new URL(f.url).origin;
 assert.equal((await fetch(root+'/creative-ai/api/brands/'+f.brands[0].id+'/canvas-assets/unknown.png')).status,404);
 assert.equal((await fetch(root+'/creative-ai/api/brands/'+f.brands[0].id+'/canvas-assets/'+f.brands[1].canvasAssets.logo.filename)).status,404);
 assert.equal((await fetch(root+'/creative-ai/api/jobs',{method:'POST'})).status,501);
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
