'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
test('Home continues directly to complete design and campaign briefs for both brands',{timeout:90000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')writes.push(r.url());});
 try{await fs.mkdir('work/home-continue-20261029',{recursive:true});for(const b of f.brands){for(const mode of ['design','campaign']){
 await page.goto(f.url+'?brand='+b.id);await page.locator('.home-create-actions').waitFor();
 assert.equal(await page.locator('#homePrompt,.composer-chips').count(),0);
 await page.getByRole('button',{name:mode==='design'?'Create design':'Create a campaign',exact:true}).click();await page.locator('#field-brief').waitFor();
 await page.locator('#field-brief').fill('A festive Instagram story in Hindi');await page.locator('#field-brief').blur();await page.waitForTimeout(850);
 assert.equal(await page.locator('.assignment-requirements').count(),1);assert.match(page.url(),/#brief\//);
 const d=await page.evaluate(()=>StudioModel.storage(localStorage).read(new URLSearchParams(location.search).get('brand'),location.hash.split('/')[1]));
 assert.equal(d.brandId,b.id);assert.equal(d.creationMode,mode==='design'?'quick':'campaign');assert.equal(d.language,'Hindi');
 await page.reload();await page.locator('#field-brief').waitFor();assert.equal(await page.locator('#field-brief').inputValue(),'A festive Instagram story in Hindi');
 await page.screenshot({path:'work/home-continue-20261029/'+b.name.toLowerCase()+'-'+mode+'.png'});
 }}assert.deepEqual(errors,[]);assert.deepEqual(writes,[],'Continue must not start generation');
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
