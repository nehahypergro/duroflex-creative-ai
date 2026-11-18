'use strict';
// Regression (19 Nov 2026, live QA): a finished lean LinkedIn carousel's download page offered neither "Download carousel
// ZIP" nor "Download LinkedIn PDF" (no saved carousel package). The page now links to the on-request export. Failing before.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
test('a finished lean carousel offers the carousel ZIP, and LinkedIn the PDF, for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 const png=await sharp({create:{width:64,height:64,channels:3,background:'#cabdd8'}}).png().toBuffer();
 try{for(const b of f.brands)for(const kind of ['LinkedIn carousel document · square','Carousel · square']){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
  const id='job-'+b.id.slice(6,14)+'-car',when='2026-11-19T01:00:00.000Z';
  const placements=[1,2,3].map(i=>({id:'slide-'+i,name:kind+' · Slide '+i+' of 3',dimensions:{width:1080,height:1080},carousel:{id:'custom:'+kind,index:i,count:3,name:kind,...(/LinkedIn/.test(kind)?{delivery:'linkedin-document'}:{})}}));
  const project={id,brandId:b.id,status:'finished',createdAt:when,updatedAt:when,productSummary:{name:b.name+' mattress'},intake:{campaignName:b.name+' carousel'},placements,
   results:placements.map(p=>({route:'continuity',placementId:p.id,ready:true,status:'available',imageUrl:'/creative-ai/api/jobs/'+id+'/files/static-lean-'+p.id+'.png'}))};
  await page.route(/\/creative-ai\/api\/jobs(\/|$|\?)/,route=>{const parts=new URL(route.request().url()).pathname.split('/').slice(4);
   if(!parts.length)return route.fulfill({json:[{id,brandId:b.id,status:'finished',createdAt:when,updatedAt:when,outputs:3}]});
   if(parts[1]==='files')return route.fulfill({status:200,contentType:'image/png',body:png});if(parts[1]==='edits')return route.fulfill({json:[]});if(parts[1]==='details')return route.fulfill({json:{units:[]}});
   return route.fulfill({json:project});});
  await page.goto(f.url+'?brand='+b.id+'#download/'+id+'/0/0');
  await page.locator('[data-carousel-zip]').waitFor({state:'attached',timeout:15000});
  assert.match(await page.locator('[data-carousel-zip]').getAttribute('href'),new RegExp('/creative-ai/api/jobs/'+id+'/carousel-export/continuity\\?format=zip$'));
  assert.equal(await page.locator('[data-carousel-pdf]').count(),/LinkedIn/.test(kind)?1:0,b.name+' '+kind+': the PDF is offered only for LinkedIn');
  await page.waitForLoadState('networkidle').catch(()=>{});await context.close();
 }assert.deepEqual(errors,[]);}finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
