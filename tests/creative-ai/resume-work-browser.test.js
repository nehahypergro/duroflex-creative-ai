'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('both brands: recovery offers same-project continuation without a new-attempt POST',{timeout:60000},async()=>{
 const fixture=await require('./helpers/intake-preview.cjs').createPreview();let browser,legacy=false;
 try{browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});const page=await browser.newPage(),posts=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 const jobs=fixture.brands.map((b,i)=>({id:'resume-browser-'+i,brandId:b.id,status:'failed',error:'Interrupted connection',createdAt:'2026-11-03T00:00:00Z',intake:{brandId:b.id,campaignName:'Resume saved work',brief:'Exact brief',conceptRoutes:['continuity']},placements:[{id:'square',name:'Social post',dimensions:{width:1080,height:1080}}],results:[]}));
 await page.route('**/creative-ai/api/jobs**',async route=>{const req=route.request(),url=new URL(req.url()),job=jobs.find(j=>url.pathname.includes('/'+j.id));if(req.method()==='POST')posts.push(url.pathname);
 if(url.pathname.endsWith('/resume-work')){if(legacy)return route.fulfill({status:404,json:{error:'Not found'}});if(req.method()==='POST'){assert.equal(req.postDataJSON().brandId,job.brandId);assert.equal(req.postDataJSON().token,'fixture-token');job.status='queued';return route.fulfill({json:{id:job.id,resumed:true}});}return route.fulfill({json:{id:job.id,brandId:job.brandId,canResume:true,token:'fixture-token',reason:'Continue with saved checkpoints. Unfinished paid steps may incur charges within the existing budget.'}});}
 if(url.pathname.endsWith('/restart'))return route.fulfill({json:{brandId:job.brandId,token:'legacy-token',cost:{message:'Existing paid restart estimate'}}});
 if(url.pathname.endsWith('/jobs'))return route.fulfill({json:jobs});if(url.pathname.endsWith('/edits'))return route.fulfill({json:[]});return route.fulfill({json:job||{units:[]}});
 });
 for(const [i,b]of fixture.brands.entries()){
  await page.goto(fixture.url+'?brand='+b.id+'#project/'+jobs[i].id);await page.locator('[data-action=restart-project]').first().click();await page.getByRole('button',{name:'Resume interrupted work',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[data-action=resume-work]'));
  assert(page.url().includes(jobs[i].id));
 }
 legacy=true;jobs[0].status='failed';await page.goto(fixture.url+'?brand='+fixture.brands[0].id+'#project/'+jobs[0].id);await page.locator('[data-action=restart-project]').first().click();await page.getByRole('button',{name:'Start another paid attempt',exact:true}).waitFor();
 assert.equal(posts.length,2);assert(posts.every(p=>p.endsWith('/resume-work')));assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>fixture.server.close(r));}
});
