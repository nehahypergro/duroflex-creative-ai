'use strict';
// Regression (18 Nov 2026, hosted Studio; Neha: "even switching between brands is slow"): opening a brand loaded every
// project with three requests each (Duroflex: 61 projects, 183 requests, about 9 s), four at a time, and the Projects
// page waited for all of them. Now the newest projects load first, eight at a time, the newest 12 are shown while the
// rest load, and design details (only used on a design's own page) are fetched after the list. Failing before.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
const TOTAL=30;
test('newest projects appear first while the rest load, details wait, for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 const png=await sharp({create:{width:64,height:64,channels:3,background:'#cabdd8'}}).png().toBuffer();
 try{for(const b of f.brands){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
  const id=i=>'job-'+b.id.slice(6,14)+'-'+String(i).padStart(2,'0'),when=i=>new Date(Date.UTC(2026,10,1,0,i)).toISOString(),name=i=>b.name+' project '+String(i).padStart(2,'0');
  let release;const held=new Promise(r=>{release=r;});let active=0,peak=0,details=0,detailsBeforeList=0,listDone=false;
  await page.route(/\/creative-ai\/api\/jobs(\/|$|\?)/,async route=>{
   const u=new URL(route.request().url()),parts=u.pathname.split('/').slice(4);
   if(!parts.length)return route.fulfill({json:Array.from({length:TOTAL},(_,i)=>({id:id(i),brandId:b.id,status:'finished',createdAt:when(i),updatedAt:when(i),outputs:1}))});
   const i=Number(parts[0].slice(-2));
   if(parts[1]==='files')return route.fulfill({status:200,contentType:'image/png',body:png});
   if(parts[1]==='edits')return route.fulfill({json:[]});
   if(parts[1]==='details'){details++;if(!listDone)detailsBeforeList++;return route.fulfill({json:{units:[]}});}
   active++;peak=Math.max(peak,active);try{await new Promise(r=>setTimeout(r,40));if(i<TOTAL-12)await held;
    return await route.fulfill({json:{id:id(i),brandId:b.id,status:'finished',createdAt:when(i),updatedAt:when(i),productSummary:{name:name(i)},intake:{campaignName:name(i)},placements:[{id:'square',name:'Square post',dimensions:{width:1080,height:1080}}],results:[{route:'continuity',placementId:'square',ready:true,imageUrl:'/creative-ai/api/jobs/'+id(i)+'/files/static.png'}]}});}finally{active--;}
  });
  await page.goto(f.url+'?brand='+b.id+'#projects');
  await page.locator('[data-projects-partial]').waitFor({timeout:15000});
  assert.match(await page.locator('[data-projects-partial]').innerText(),new RegExp('newest 12 of '+TOTAL),b.name+': the newest 12 are shown while the rest load');
  const shown=await page.locator('main').innerText();
  assert.ok(shown.includes(name(TOTAL-1))&&shown.includes(name(TOTAL-12)),'the newest projects are listed');assert.ok(!shown.includes(name(0)),'older projects are still loading');
  assert.equal(details,0,'design details wait until the list is loaded');
  // A project that has not loaded yet says it is loading, not that it is unavailable.
  await page.evaluate(x=>{location.hash='project/'+x;},id(0));await page.locator('main').getByText('Loading your project').waitFor();
  assert.ok(peak>4&&peak<=8,b.name+': up to eight projects load at a time (peak '+peak+')');
  listDone=true;release();
  await page.evaluate(()=>{location.hash='projects';});
  await page.locator('[data-projects-partial]').waitFor({state:'detached',timeout:15000});
  await page.locator('#projectSearch').fill(name(0));await page.locator('main').getByText(name(0)).first().waitFor();
  await page.waitForTimeout(500);
  assert.equal(detailsBeforeList,0);assert.ok(details>=1,'design details are fetched in the background afterwards');
  await context.close();
 }assert.deepEqual(errors,[]);}finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
