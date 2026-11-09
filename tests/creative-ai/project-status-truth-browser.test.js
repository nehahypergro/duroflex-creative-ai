'use strict';
// Live runs, 9 Nov 2026 (items 4, 10, 11). Every API call is stubbed; no generation or paid request.
// #4  A project with flagged designs read "Ready" on its tiles and page header; it now reads
//     "Check before using · N of M flagged", and the Ready filter shows only fully ready projects.
// #10 A failed job's project page said "Product not selected" although its saved brief named the product.
// #11 The read-back badge said "Single design" for one A+ Premium output that makes 14 images.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
test('project tiles, headers and the read-back badge tell the truth about designs (both brands)',{timeout:180000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 const png=await sharp({create:{width:300,height:300,channels:3,background:'#dfe7f3'}}).png().toBuffer(),errors=[],writes=[];
 try{for(const b of f.brands){
  const tag=b.id.slice(-6),file=(id,n)=>'/creative-ai/api/jobs/'+id+'/files/static-lean-'+n+'.png';
  const result=(id,n,kind)=>({route:'continuity',placementId:'page-'+n,imageUrl:file(id,n),width:300,height:300,sha256:String(n%10).repeat(64),originalArtwork:true,editable:false,leanWorkflowVersion:1,leanConformanceVersion:1,
   ...(kind==='ready'?{ready:true,qualityVerified:true,visualReview:{status:'completed',conclusion:'no_mismatch'}}:kind==='flagged'?{ready:false,qualityVerified:false,visualReview:{status:'completed',conclusion:'clear_mismatch'}}:{ready:false,qualityVerified:false})});
  const job=(id,name,kinds,extra={})=>({id,brandId:b.id,status:'finished',createdAt:'2026-11-09T10:00:00Z',updatedAt:'2026-11-09T10:0'+kinds.length%10+':00Z',activeStages:[],intake:{brandId:b.id,campaignName:name,leanWorkflowVersion:1},briefSummary:{brief:'Test brief',productName:b.name+' Mattress',objective:'Purchase',language:'English'},
   placements:kinds.map((_,i)=>({id:'page-'+(i+1),name:'Page '+(i+1),dimensions:{width:300,height:300}})),results:kinds.map((k,i)=>result(id,i+1,k)),...extra});
  const flagged=job('flagged-'+tag,'Flagged test '+tag,[...Array(6).fill('ready'),...Array(4).fill('flagged'),...Array(2).fill('incomplete')]);
  const clean=job('clean-'+tag,'Clean test '+tag,['ready','ready']);
  const failed={id:'failed-'+tag,brandId:b.id,status:'failed',createdAt:'2026-11-09T09:00:00Z',updatedAt:'2026-11-09T09:00:00Z',activeStages:[],error:'Planning stopped.',briefSummary:{brief:'Failed brief',productName:'Posture Perfect Pocket Spring Orthopedic Mattress',productId:'product-not-in-library'},placements:[{id:'page-1',name:'Page 1',dimensions:{width:300,height:300}}],results:[]};
  const jobs=[flagged,clean,failed];
  const page=await browser.newPage({viewport:{width:1366,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')writes.push(r.url());});
  await page.route('**/creative-ai/api/jobs**',async route=>{const p=new URL(route.request().url()).pathname;if(route.request().method()!=='GET')return route.fulfill({status:501,json:{}});
   if(p.endsWith('.png'))return route.fulfill({body:png,contentType:'image/png'});
   if(p.endsWith('/jobs'))return route.fulfill({json:jobs});if(p.endsWith('/edits'))return route.fulfill({json:[]});if(p.endsWith('/details'))return route.fulfill({json:{units:[]}});
   const j=jobs.find(j=>p==='/creative-ai/api/jobs/'+j.id);return route.fulfill(j?{json:j}:{status:404,json:{error:'Missing'}});});
  await page.goto(f.url+'?brand='+b.id);await page.locator('.creation-hero').waitFor();
  const badge=async(scope,name)=>(await page.locator(scope,{hasText:name}).first().locator('.status').first().innerText()).trim();
  // Home "Continue working" and the Projects tiles.
  await page.locator('.continue-card',{hasText:'Flagged test'}).first().waitFor();
  assert.equal(await badge('.continue-card','Flagged test'),'Check before using · 6 of 12 flagged');
  assert.equal(await badge('.continue-card','Clean test'),'Ready');
  await page.evaluate(()=>location.hash='projects');await page.locator('.project-card',{hasText:'Flagged test'}).waitFor();
  assert.equal(await badge('.project-card','Flagged test'),'Check before using · 6 of 12 flagged');
  assert.equal(await badge('.project-card','Clean test'),'Ready');
  await page.locator('[data-filter=ready]').click();await page.waitForTimeout(200);
  assert.equal(await page.locator('.project-card',{hasText:'Flagged test'}).count(),0,'the Ready filter excludes flagged projects');
  assert.equal(await page.locator('.project-card',{hasText:'Clean test'}).count(),1);
  await page.locator('[data-filter=check]').click();await page.waitForTimeout(200);
  assert.equal(await page.locator('.project-card',{hasText:'Flagged test'}).count(),1);assert.equal(await page.locator('.project-card',{hasText:'Clean test'}).count(),0);
  // Project page header.
  await page.evaluate(id=>location.hash='project/'+id,flagged.id);await page.locator('.flow-header-status .status').waitFor();
  assert.equal((await page.locator('.flow-header-status .status').innerText()).trim(),'Check before using · 6 of 12 flagged');
  await page.evaluate(id=>location.hash='project/'+id,clean.id);await page.waitForFunction(()=>document.querySelector('.flow-header-status .status')?.textContent==='Ready');
  // The design page keeps its per-image badge.
  await page.evaluate(id=>location.hash='review/'+id+'/7/0',flagged.id);await page.locator('.focused-art img').waitFor();
  assert.equal((await page.locator('.flow-header-status [data-design-check]').innerText()).trim(),'Check before using');
  // A failed job names the product from its saved brief.
  await page.evaluate(id=>location.hash='project/'+id,failed.id);await page.locator('.flow-context').waitFor();
  const context=await page.locator('.flow-context').innerText();assert.doesNotMatch(context,/Product not selected|Choose a product/);assert.match(context,/Posture Perfect/);
  // Read-back badge for one A+ Premium output.
  const draftId=await page.evaluate(brandId=>{const M=StudioModel,result={ask:'An A+ page for the mattress.',assets:[{cardId:'amazon-aplus',source:'brief'}],product:{productId:'',candidateIds:[],variantId:'',evidence:''},messageType:{value:'',source:'none'},objective:{value:'Purchase',source:'brief'},language:{value:'English',source:'brief'},audience:{value:'',source:'none'},tone:{value:'',source:'none'},keyMessage:{value:'',source:'none'},features:[],offer:{wording:'',terms:'',startDate:'',endDate:''},exactWording:[],occasion:{value:'',source:'none'},cta:{value:'',source:'none'},contactDetails:false,logoRequested:false,otherBrandMentioned:'',assumptions:[],questions:[],decision:'design'};
   const d=M.draftFromReading(brandId,{id:'creative-read',result},{brief:'An A+ Premium page for our mattress',products:[],today:'2026-11-09'});M.storage(localStorage).save(d);return d.id;},b.id);
  await page.evaluate(id=>location.hash='understood/'+id,draftId);await page.locator('#understoodFormats .understood-badge').waitFor();
  assert.equal((await page.locator('#understoodFormats .understood-badge').innerText()).trim(),'A+ page · 14 images');
  await page.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes.filter(u=>!/preflight/.test(u)),[],'no generation or other write');
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
