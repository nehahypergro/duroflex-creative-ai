'use strict';
// User request, 9 Nov 2026 (annotated design page of a 14-image A+ page): "I would like a next arrow
// to go through all the assets." The design page now has Previous/Next arrows over the image, an
// "N of M" counter and keyboard ←/→, stepping through every saved image in the project, for both
// brands. Every API call is stubbed; no generation or paid request happens.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
test('design page steps through every image in the project with arrows and keys (both brands)',{timeout:180000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 const colours=['#d9e4f5','#e9e2d6','#d6efe0'],pngs=await Promise.all(colours.map(c=>sharp({create:{width:1464,height:600,channels:3,background:c}}).png().toBuffer()));
 const errors=[],jobs=[];
 try{for(const b of f.brands){
  const id='steps-'+b.id.slice(-6),ids=['hero','technology','lifestyle'];
  const url=i=>'/creative-ai/api/jobs/'+id+'/files/static-lean-'+ids[i]+'.png';
  const job={id,name:'Step test',brandId:b.id,status:'finished',createdAt:'2026-11-09T10:00:00Z',updatedAt:'2026-11-09T10:05:00Z',activeStages:[],intake:{brandId:b.id,campaignName:'Step test',leanWorkflowVersion:1,productName:b.name+' Mattress'},briefSummary:{brief:'Amazon A+ Premium content for the '+b.name+' mattress. Purchase objective.',productName:b.name+' Mattress',objective:'Purchase',language:'English'},
   placements:ids.map(p=>({id:p,name:'A+ '+p,dimensions:{width:1464,height:600}})),
   results:ids.map((p,i)=>({route:'continuity',placementId:p,imageUrl:url(i),width:1464,height:600,sha256:String(i).repeat(64),originalArtwork:true,editable:false,ready:true,leanWorkflowVersion:1}))};
  jobs.push(job);
  const page=await browser.newPage({viewport:{width:1366,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/creative-ai/api/jobs**',async route=>{const p=new URL(route.request().url()).pathname;if(route.request().method()!=='GET')return route.fulfill({status:501,json:{}});
   if(p.endsWith('.png'))return route.fulfill({body:pngs[ids.findIndex(x=>p.includes(x))]||pngs[0],contentType:'image/png'});
   if(p.endsWith('/jobs'))return route.fulfill({json:jobs});if(p.endsWith('/edits'))return route.fulfill({json:[]});if(p.endsWith('/details'))return route.fulfill({json:{units:[]}});
   return route.fulfill(p==='/creative-ai/api/jobs/'+id?{json:job}:{json:{}});});
  await page.goto(f.url+'?brand='+b.id);await page.locator('.creation-hero').waitFor();
  await page.evaluate(id=>location.hash='review/'+id+'/0/0',id);await page.locator('.focused-art img').waitFor();
  const prev=page.locator('[data-review-step=prev]'),next=page.locator('[data-review-step=next]'),count=page.locator('.review-step-count');
  assert.equal(await count.innerText(),'1 of 3');assert.equal(await prev.getAttribute('aria-disabled'),'true','no previous image on the first one');
  const counted=t=>page.waitForFunction(t=>document.querySelector('.review-step-count')?.textContent===t,t);
  await next.click();await page.waitForFunction(id=>location.hash==='#review/'+id+'/1/0',id);await counted('2 of 3');
  await page.keyboard.press('ArrowRight');await page.waitForFunction(id=>location.hash==='#review/'+id+'/2/0',id);await counted('3 of 3');assert.equal(await next.getAttribute('aria-disabled'),'true','no next image on the last one');
  await page.keyboard.press('ArrowLeft');await page.waitForFunction(id=>location.hash==='#review/'+id+'/1/0',id);
  await counted('2 of 3');await prev.click();await page.waitForFunction(id=>location.hash==='#review/'+id+'/0/0',id);await counted('1 of 3');
  assert.match(await next.getAttribute('aria-label'),/Next image/);
  /* User request, 9 Nov 2026: show the brief on the left of the design so it never needs scrolling to. */
  const brief=await page.locator('.review-brief-summary').boundingBox(),art=await page.locator('.focused-art').boundingBox();
  assert.ok(brief&&art&&brief.x+brief.width<=art.x+1,'the brief sits to the left of the design on a laptop');
  assert.ok(brief.y<art.y+art.height&&brief.y<900,'the brief is visible beside the design without scrolling');
  await page.evaluate(()=>{const m=document.scrollingElement;m.scrollTop=400;for(const el of document.querySelectorAll('main,#main,.app-main'))el.scrollTop=400;});await page.waitForTimeout(200);
  const after=await page.locator('.review-brief-summary').boundingBox();assert.ok(after.y>=-1&&after.y<300,'the brief stays in view while scrolling');
  // Typing in a field must not change the image.
  await page.evaluate(()=>{const i=document.createElement('input');i.id='typing';document.body.append(i);i.focus();});await page.keyboard.press('ArrowRight');await page.waitForTimeout(300);assert.match(await page.evaluate(()=>location.hash),/\/0\/0$/);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll on a phone');
  {const b2=await page.locator('.review-brief-summary').boundingBox(),a2=await page.locator('.focused-art').boundingBox();assert.ok(b2.y>=a2.y+a2.height-1,'on a phone the brief sits below the design');}
  const box=await next.boundingBox();assert.ok(box&&box.width>=32&&box.height>=32,'arrows stay tappable on a phone');
  await page.close();
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
