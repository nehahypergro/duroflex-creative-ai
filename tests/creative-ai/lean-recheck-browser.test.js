'use strict';
// "Re-run check" button (user decision, 9 Nov 2026), both brands, every API call stubbed in the
// browser (no paid request). A saved lean design whose check did not finish shows the button with the
// plain cost note; the confirm dialog repeats the note; one click posts ONE request with the exact
// image hash, brand and a click identity; nothing else is sent; once the check passes the button is
// gone. A design whose check passed never shows it. The project recovery panel offers it too.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
test('Re-run check on the design page and recovery panel for both brands',{timeout:240000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 const png=await sharp({create:{width:1080,height:1350,channels:3,background:'#e9e2d6'}}).png().toBuffer();
 const errors=[],posts=[],jobs=[];
 const costNote='The earlier check may also have been charged (about ₹2); that cost stays marked unknown.';
 try{for(const b of f.brands){
  const id='recheck-'+b.id.slice(-6),passedId='checked-'+b.id.slice(-6),sha='d'.repeat(64),fileUrl=jobId=>'/creative-ai/api/jobs/'+jobId+'/files/static-lean-x.png';
  const result=jobId=>({route:'continuity',placementId:'portrait',imageUrl:fileUrl(jobId),width:1080,height:1350,sha256:sha,originalArtwork:true,editable:false,status:'available',ready:false,qualityVerified:false,leanWorkflowVersion:1,leanConformanceVersion:1,visualReview:{status:'interrupted',conclusion:null,unverified:[],notVisuallyVerifiable:[]},correction:null,
   leanRecheck:{version:1,available:true,estimate:{currency:'INR',perCheck:2},message:'This design was saved, but its check did not finish. Re-run check sends one new check of the same saved design (about ₹2). It never makes a new picture.',costNote}});
  const base=jobId=>({id:jobId,name:'Mattress launch',brandId:b.id,createdAt:'2026-11-09T10:00:00Z',updatedAt:'2026-11-09T10:05:00Z',activeStages:[],intake:{brandId:b.id,campaignName:'Mattress launch',conceptRoutes:['continuity'],leanWorkflowVersion:1},placements:[{id:'portrait',name:'Social portrait',dimensions:{width:1080,height:1350}}]});
  const job={...base(id),status:'partial',error:'fetch failed',results:[result(id)]};
  const passed={...base(passedId),status:'finished',results:[{...result(passedId),ready:true,visualReview:{status:'completed',conclusion:'no_mismatch',unverified:[],notVisuallyVerifiable:[]},leanRecheck:undefined}]};
  jobs.push(job,passed);
  const page=await browser.newPage({viewport:{width:1366,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/creative-ai/api/jobs**',async route=>{const req=route.request(),p=new URL(req.url()).pathname;
   if(p.endsWith('/lean-recheck')&&req.method()==='POST'){const body=req.postDataJSON();posts.push({p,body});const r=job.results[0];delete r.leanRecheck;Object.assign(r,{ready:true,visualReview:{status:'completed',conclusion:'no_mismatch',unverified:[],notVisuallyVerifiable:[]}});job.status='finished';job.error=null;job.updatedAt='2026-11-09T10:20:00Z';return route.fulfill({status:200,json:{status:'completed'}});}
   if(req.method()!=='GET'){posts.push({p,body:null});return route.fulfill({status:501,json:{error:'Read-only test.'}});}
   if(p.endsWith('/jobs'))return route.fulfill({json:jobs});if(p.endsWith('/edits')||p.endsWith('/ai-edits'))return route.fulfill({json:[]});if(p.endsWith('/details'))return route.fulfill({json:{units:[]}});
   if(p.endsWith('.png'))return route.fulfill({body:png,contentType:'image/png'});
   if(p.endsWith('/resume-work'))return route.fulfill({json:{brandId:b.id,canResume:false,reason:'An earlier request outcome is unresolved.'}});if(p.endsWith('/restart'))return route.fulfill({json:{brandId:b.id,token:'preview-token',cost:{message:'Estimated ₹40–₹60.'}}});
   return route.fulfill(p==='/creative-ai/api/jobs/'+id?{json:job}:p==='/creative-ai/api/jobs/'+passedId?{json:passed}:{json:{}});});
  await page.goto(f.url+'?brand='+b.id);await page.locator('.creation-hero').waitFor();
  // A design whose check passed: no button.
  await page.evaluate(id=>location.hash='review/'+id+'/0/0',passedId);await page.locator('.focused-art img').waitFor();
  assert.equal(await page.locator('[data-lean-recheck]').count(),0,'hidden when the check passed');
  // The interrupted design: button with the cost note.
  await page.evaluate(id=>location.hash='review/'+id+'/0/0',id);await page.locator('[data-lean-recheck]').waitFor();
  const section=page.locator('[data-lean-recheck]');assert.match(await section.innerText(),/never makes a new picture/);assert.match(await section.innerText(),/The earlier check may also have been charged \(about ₹2\); that cost stays marked unknown\./);
  assert.equal(posts.length,0,'nothing is sent by opening the page');
  await section.locator('[data-action=lean-recheck]').click();
  const dialog=page.locator('#assignmentDialog[open]');await dialog.waitFor();assert.match(await dialog.locator('[data-recheck-cost]').innerText(),/about ₹2\); that cost stays marked unknown/);
  assert.equal(posts.length,0,'opening the dialog sends nothing');
  await dialog.locator('[data-recheck-confirm]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-lean-recheck]'));
  const sent=posts.filter(x=>x.p.endsWith('/lean-recheck'));assert.equal(sent.length,1,'one request per click');assert.equal(posts.length,1,'no other request (no new picture)');
  assert.deepEqual({route:sent[0].body.route,placementId:sent[0].body.placementId,sha256:sent[0].body.sha256,brandId:sent[0].body.brandId},{route:'continuity',placementId:'portrait',sha256:sha,brandId:b.id});assert.match(sent[0].body.requestId,/^recheck-[A-Za-z0-9-]{8,}$/);
  // Recovery panel on the project page offers the same action for another stuck design.
  job.results[0]=result(id);job.status='partial';job.updatedAt='2026-11-09T10:30:00Z';await page.goto(f.url+'?brand='+b.id+'#project/'+id);
  const recover=page.locator('[data-action=restart-project]').first();await recover.waitFor();await recover.click();
  await page.locator('#restartPanel [data-action=lean-recheck]').waitFor();assert.match(await page.locator('#restartPanel').innerText(),/Re-run a check instead[\s\S]*never makes a new picture[\s\S]*that cost stays marked unknown/);
  assert.equal(posts.filter(x=>x.p.endsWith('/lean-recheck')).length,1,'the panel does not send by itself');
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll at phone width');
  await page.close();posts.length=0;
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
