'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
test('active component correction takes priority over the saved parent failure and stays scoped to the affected asset',()=>{
 const M=require('../../public/creative-ai/studio-model'),unit={route:'continuity',placementId:'story',status:'repairing'};
 const job={status:'failed',stage:'failed',placements:[{id:'story'}],results:[],componentRecovery:{repairing:1,units:[unit]}};
 assert.equal(M.status(job).label,'Correcting');assert.equal(M.jobProgress(job).running,true);
 const other={...job,placements:[{id:'post'}],results:[{placementId:'post',route:'continuity',imageUrl:'/creative-ai/api/jobs/test/files/post.png',ready:true}],status:'finished'}; // ready:true since 9 Nov 2026: Ready needs every design ready
 assert.equal(M.status(other).label,'Ready');
 unit.status='needs-attention';job.componentRecovery.repairing=0;
 assert.equal(M.status(job).label,'Needs attention');assert.equal(M.jobProgress(job).running,false);
});
test('both brands show correction progress without stopped/retry controls and poll until recovery settles',{timeout:90000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage(),errors=[],posts=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')posts.push(r.url());});page.setDefaultTimeout(12000);
 try{for(const [i,b]of f.brands.entries()){
  const id='correction-'+i,unit={route:'continuity',placementId:'story',status:'repairing',components:{scene:'generated'}};
  const job={id,brandId:b.id,intake:{brandId:b.id},status:'failed',stage:'failed',placements:[{id:'story',name:'Instagram Story',dimensions:{width:1080,height:1920}}],results:[],componentRecovery:{repairing:1,units:[unit]}};let reads=0;
  await page.route('**/creative-ai/api/jobs**',r=>{const p=new URL(r.request().url()).pathname;if(p.endsWith('/jobs'))return r.fulfill({json:[job]});if(p.endsWith('/edits'))return r.fulfill({json:[]});reads++;return r.fulfill({json:job});});
  await page.goto(f.url+'?brand='+b.id+'#project/'+id);await page.getByText('Correcting your design…',{exact:true}).waitFor();
  assert.equal(await page.locator('.project-recovery').count(),0);assert.equal(await page.getByRole('button',{name:'Review recovery options',exact:true}).count(),0);assert.doesNotMatch(await page.locator('#main').innerText(),/Creation stopped|Needs attention/);
  const before=reads;unit.status='needs-attention';job.componentRecovery.repairing=0;
  await page.getByRole('button',{name:'Review recovery options',exact:true}).waitFor();assert.ok(reads>before,'active corrections are polled to a terminal outcome');
  assert.equal(await page.getByText('Correcting your design…',{exact:true}).count(),0);await page.unroute('**/creative-ai/api/jobs**');
 }assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);}finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
test('both brands keep recovery metadata without the removed progress panel',{timeout:90000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage();const errors=[],posts=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 try{for(const b of f.brands){const id='creative-11111111-2222-4333-8444-555555555555',unit={route:'continuity',placementId:'story',name:'Instagram Story',status:'needs-attention',components:{copy:'saved',scene:'generated',typography:'needs-attention',logo:'pending',composition:'pending',review:'pending',export:'pending'},message:'Artwork generated. Body text needs adjustment.',issues:[{action:'Recompose affected text',explanation:'Reuse the saved scene.',evidence:'Body text too small'}],repairAvailable:true};
 const job={id,brandId:b.id,intake:{brandId:b.id},status:'partial',createdAt:new Date().toISOString(),placements:[{id:'story',name:'Instagram Story',dimensions:{width:1080,height:1920}}],results:[],componentRecovery:{total:1,ready:0,repairing:0,needsAttention:1,units:[unit]}};
 await page.route('**/creative-ai/api/jobs',r=>r.fulfill({json:[{id,brandId:b.id,status:'partial'}]}));await page.route('**/creative-ai/api/jobs/'+id+'*',r=>r.fulfill({json:job}));await page.route('**/creative-ai/api/jobs/'+id+'/component-recovery**',async r=>{if(r.request().method()==='POST'){posts.push(r.request().postDataJSON());return r.fulfill({status:202,json:{status:'repairing'}});}return r.fulfill({json:{available:true,brandId:b.id,token:'test-token'}});});
 await page.goto(f.url+'?brand='+b.id+'#project/'+id);await page.locator('.project-workspace').waitFor();assert.equal(await page.locator('[aria-label="Per-design progress"]').count(),0);assert.equal(await page.getByRole('button',{name:'Repair this design'}).count(),0);assert.equal(job.componentRecovery.units[0].components.scene,'generated');
 }assert.deepEqual(errors,[]);assert.equal(posts.length,0);}finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
