'use strict';
// Regression (19 Nov 2026, live QA): only about two jobs plan at once on the hosted Studio, so others wait with status
// "queued", sometimes after their first steps. The project page said "Creating · Planning · Creating your designs.
// Progress updates automatically." for 20+ minutes (Sleepyhead A+ Brand Story waited 22 minutes) with nothing moving.
// A waiting job now says it is waiting for a free slot and continues by itself. Failing before.
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../../public/creative-ai/studio-model.js');
const BRANDS=['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'];
test('a waiting job says it is waiting; a running one keeps its stage, both brands',()=>{
 for(const brandId of BRANDS)for(const stage of ['brand','concepts']){
  const waiting={id:'job-1',brandId,status:'queued',stage},running={...waiting,status:'running'};
  assert.equal(M.status(waiting).substage,'Waiting for a free slot',stage);assert.match(M.status(waiting).detail,/continues by itself/);
  assert.match(M.jobProgress(waiting).description,/Waiting for a free slot/);
  assert.equal(M.status(running).substage,'Planning');assert.doesNotMatch(M.jobProgress(running).description,/free slot/);
 }
});
test('the project page of a waiting job says it is waiting, for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 try{for(const b of f.brands){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
  const id='job-'+b.id.slice(6,14)+'-waiting',when='2026-11-19T01:00:00.000Z';
  const project={id,brandId:b.id,status:'queued',stage:'concepts',createdAt:when,updatedAt:when,productSummary:{name:b.name+' mattress'},intake:{campaignName:b.name+' story'},placements:[{id:'story',name:'Story · vertical',dimensions:{width:1080,height:1920}}],results:[]};
  await page.route(/\/creative-ai\/api\/jobs(\/|$|\?)/,async route=>{
   const parts=new URL(route.request().url()).pathname.split('/').slice(4);
   if(!parts.length)return route.fulfill({json:[{id,brandId:b.id,status:'queued',stage:'concepts',createdAt:when,updatedAt:when,outputs:1}]});
   if(parts[1]==='edits')return route.fulfill({json:[]});
   if(parts[1]==='details')return route.fulfill({json:{units:[]}});
   return route.fulfill({json:project});
  });
  await page.goto(f.url+'?brand='+b.id+'#project/'+id);
  await page.waitForFunction(()=>/free slot/.test(document.querySelector('main')?.innerText||''),null,{timeout:20000});
  const text=await page.locator('main').innerText();
  assert.match(text,/continues by itself/,b.name);assert.doesNotMatch(text,/Creating your designs/,b.name);
  await context.close();
 }assert.deepEqual(errors,[]);}finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
