'use strict';
// Regression (25 Nov 2026, local picture test, Neha: "Yes, fix them"): after "Resume interrupted work" or "Continue anyway"
// the project page kept "Creation stopped before a design was saved" while the job ran, until the page was reloaded.
// The fresh project went only to state.project (the page draws from the project list), and the stopped project's live
// updates stayed off. Failing before; no paid calls (every Studio request is answered here).
const test=require('node:test'),assert=require('node:assert/strict');
test('both brands: after Resume or Continue anyway the project page shows the running job and keeps it updated',{timeout:120000},async()=>{
 const fixture=await require('./helpers/intake-preview.cjs').createPreview();let browser;
 try{browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
  const errors=[],reads=new Map();
  const jobs=[];for(const [i,b]of fixture.brands.entries())for(const mode of ['resume','continue'])jobs.push({id:'resume-refresh-'+mode+'-'+i,mode,brandId:b.id,status:'failed',error:'Planning could not prepare artwork: The provider could not complete this agent response. Saved work is preserved.',createdAt:'2026-11-25T00:00:00Z',intake:{brandId:b.id,campaignName:'Resume refresh',brief:'Exact brief',conceptRoutes:['continuity']},placements:[{id:'square',name:'Social post',dimensions:{width:1080,height:1080}}],results:[]});
  for(const job of jobs){
   const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/creative-ai/api/jobs**',async route=>{const req=route.request(),url=new URL(req.url()),j=jobs.find(x=>url.pathname.includes('/'+x.id));
    if(url.pathname.endsWith('/resume-work')){
     if(req.method()==='POST'){const body=req.postDataJSON();assert.equal(body.brandId,j.brandId);if(j.mode==='continue')assert.equal(body.continueAnyway,'a'.repeat(64));j.status='queued';j.error=null;j.resumedAt=Date.now();return route.fulfill({status:202,json:{id:j.id,reused:true,resumed:true}});}
     return route.fulfill({json:j.mode==='resume'?{id:j.id,brandId:j.brandId,canResume:true,token:'fixture-token',reason:'Continue this project using its saved checkpoints.'}:{id:j.id,brandId:j.brandId,canResume:false,reason:'A paid request has no saved response.',continueAnyway:{requestKey:'a'.repeat(64),kind:'reasoning',token:'continue-token',message:'A paid request for this project never saved its answer.',warning:'Continue anyway sends one new request for that step (about ₹5).'}}});}
    if(url.pathname.endsWith('/jobs'))return route.fulfill({json:jobs.filter(x=>x.brandId===url.searchParams.get('brandId')||!url.searchParams.get('brandId'))});
    if(url.pathname.endsWith('/edits'))return route.fulfill({json:[]});
    if(j&&req.method()==='GET'&&j.resumedAt)reads.set(j.id,(reads.get(j.id)||0)+1);
    return route.fulfill({json:j||{units:[]}});
   });
   await page.goto(fixture.url+'?brand='+job.brandId+'#project/'+job.id);
   await page.getByText('Creation stopped before a design was saved').waitFor();
   await page.locator('[data-action=restart-project]').first().click();
   await page.getByRole('button',{name:job.mode==='resume'?'Resume interrupted work':'Continue anyway',exact:true}).click();
   // The stopped panel goes away without a reload, and the running job is read again by the live updates.
   await page.waitForFunction(()=>!document.querySelector('.project-recovery'),null,{timeout:8000}).catch(()=>{});
   assert.equal(await page.locator('.project-recovery').count(),0,job.id+': the page still shows "Creation stopped" after '+job.mode);
   const deadline=Date.now()+8000;while((reads.get(job.id)||0)<2&&Date.now()<deadline)await page.waitForTimeout(200);
   assert(reads.get(job.id)>=2,job.id+': live updates did not read the running job ('+(reads.get(job.id)||0)+' reads)');
   assert(page.url().includes('#project/'+job.id));
   await page.close();
  }
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>fixture.server.close(r));}
});
