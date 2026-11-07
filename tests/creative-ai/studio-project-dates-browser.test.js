'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('Projects keeps missing and invalid dates accessible in both brands',{timeout:90000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage(),errors=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('Studio page failed'))errors.push(m.text());});page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());});
 const dates=[undefined,null,'','not-a-date','2026-10-29T06:00:00.000Z'];
 const jobs=f.brands.flatMap(b=>dates.map((createdAt,i)=>({id:'date-fixture-'+b.id+'-'+i,brandId:b.id,createdAt,updatedAt:createdAt,status:'running',intake:{brandId:b.id,productName:b.name+' date fixture '+i},placements:[{id:'square',name:'Square post',dimensions:{width:1080,height:1080}}],results:[]})));
 await page.route('**/creative-ai/api/jobs**',async r=>{const path=new URL(r.request().url()).pathname;if(path.endsWith('/jobs'))return r.fulfill({json:jobs});if(path.endsWith('/edits'))return r.fulfill({json:[]});const j=jobs.find(j=>path.endsWith('/'+j.id));return r.fulfill({json:j||{}});});
 try{for(const b of f.brands){await page.goto(f.url+'?brand='+b.id+'#projects');await page.waitForFunction(()=>document.querySelector('.project-gallery')||document.querySelector('main')?.textContent.includes('We couldn’t complete'));
 assert.equal(await page.locator('.project-card').count(),dates.length,'one invalid date must not take down the gallery');
 assert.equal(await page.locator('.project-name').filter({hasText:'date fixture'}).count(),5);assert.equal(await page.locator('.project-subtitle').filter({hasText:'Date unavailable'}).count(),4);
 assert.match(await page.locator('.project-subtitle').last().innerText(),/29 Oct/);
 assert.doesNotMatch(await page.locator('main').innerText(),/Invalid Date|1970|We couldn’t complete/);
 const link=page.locator('.project-name').first();await link.click();await page.locator('.flow-header').waitFor();
 assert.doesNotMatch(await page.locator('main').innerText(),/We couldn’t complete/);
 await page.getByRole('link',{name:'Projects',exact:true}).first().click();await page.locator('.project-gallery').waitFor();
 assert.equal(await page.locator('.project-card').count(),dates.length);
 // Older locally saved campaign briefs have no createdAt either.
 await page.evaluate(brandId=>{const d=StudioModel.startDraft(brandId,'campaign');d.name='Legacy campaign product';d.productName=d.name;delete d.createdAt;d.outputs=[StudioModel.output(1)];StudioModel.storage(localStorage).save(d);},b.id);
 await page.reload();await page.locator('.project-gallery').waitFor();assert.equal(await page.locator('.project-card').count(),dates.length+1);
 const legacy=page.locator('.project-name[href^="#brief/"]');assert.match(await legacy.innerText(),/Legacy campaign/);await legacy.click();await page.locator('#field-brief').waitFor();
 }assert.deepEqual(errors,[]);assert.deepEqual(writes,[],'viewing projects must not mutate saved history or start generation');}finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
