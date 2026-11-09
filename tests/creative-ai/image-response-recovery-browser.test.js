'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('both brands: recover an existing image response before continuing the same project',{timeout:60000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview();let browser;
 try{
  browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});const page=await browser.newPage(),posts=[],errors=[],recovered=new Set();page.on('pageerror',e=>errors.push(e.message));
  const jobs=f.brands.map((b,i)=>({id:'image-recovery-'+i,brandId:b.id,status:'failed',error:'Image response unresolved',createdAt:'2026-11-03T00:00:00Z',intake:{brandId:b.id,campaignName:'Recover existing image',brief:'Exact saved brief',conceptRoutes:['continuity']},placements:[{id:'square',name:'Social post',dimensions:{width:1080,height:1080}}],results:[]}));
  await page.route('**/creative-ai/api/jobs**',async route=>{
   const req=route.request(),url=new URL(req.url()),job=jobs.find(j=>url.pathname.includes('/'+j.id));if(req.method()==='POST')posts.push(url.pathname);
   if(url.pathname.endsWith('/reconcile-images')){assert.equal(req.postDataJSON().brandId,job.brandId);recovered.add(job.id);return route.fulfill({json:{id:job.id,recovered:1,unresolved:0,paidRequests:0}});}
   if(url.pathname.endsWith('/resume-work')){if(req.method()==='POST'){assert(recovered.has(job.id));assert.equal(req.postDataJSON().token,'resume-token');job.status='queued';return route.fulfill({json:{id:job.id,resumed:true}});}return route.fulfill({json:{id:job.id,brandId:job.brandId,canResume:recovered.has(job.id),canReconcileImages:!recovered.has(job.id),token:'resume-token',reason:'Use saved checkpoints'}});}
   if(url.pathname.endsWith('/jobs'))return route.fulfill({json:jobs});if(url.pathname.endsWith('/edits'))return route.fulfill({json:[]});return route.fulfill({json:job||{units:[]}});
  });
  for(const [i,b]of f.brands.entries()){
   await page.goto(f.url+'?brand='+b.id+'#project/'+jobs[i].id);await page.locator('[data-action=restart-project]').first().click();
   await page.getByRole('button',{name:'Check for finished images',exact:true}).click();await page.getByRole('button',{name:'Continue saved work',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[data-action=resume-work]'));
   assert(page.url().includes(jobs[i].id));
  }
  assert.equal(posts.length,4);assert(posts.every(p=>p.endsWith('/reconcile-images')||p.endsWith('/resume-work')));assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>f.server.close(r));}
});
