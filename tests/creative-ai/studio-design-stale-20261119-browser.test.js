'use strict';
// Regression (19 Nov 2026, live rerun test, Duroflex Memory Foam Topper counter card): the job had finished with a saved
// picture, but its design page opened by link or reload said "Artwork has not been created · No saved image is available"
// because it read the browser's saved project list from before the picture existed. Only visiting the project page fixed
// it. Now a design page with no saved picture asks the server once for the latest project. Failing before.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
test('a design whose picture was saved after the project list was loaded still opens, for both brands',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 const png=await sharp({create:{width:64,height:64,channels:3,background:'#cabdd8'}}).png().toBuffer();
 try{for(const b of f.brands){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
  const id='job-'+b.id.slice(6,14)+'-counter',when='2026-11-19T01:00:00.000Z';let saved=false,loads=0;
  const project=()=>({id,brandId:b.id,status:'finished',createdAt:when,updatedAt:when,productSummary:{name:b.name+' topper'},intake:{campaignName:b.name+' counter card'},
   placements:[{id:'counter',name:'Counter / tabletop card · Artwork',dimensions:{width:910,height:1276}}],
   results:saved?[{route:'continuity',placementId:'counter',ready:false,status:'available',imageUrl:'/creative-ai/api/jobs/'+id+'/files/static.png'}]:[]});
  await page.route(/\/creative-ai\/api\/jobs(\/|$|\?)/,async route=>{
   const parts=new URL(route.request().url()).pathname.split('/').slice(4);
   if(!parts.length)return route.fulfill({json:[{id,brandId:b.id,status:'finished',createdAt:when,updatedAt:when,outputs:1}]});
   if(parts[1]==='files')return route.fulfill({status:200,contentType:'image/png',body:png});
   if(parts[1]==='edits')return route.fulfill({json:[]});
   if(parts[1]==='details')return route.fulfill({json:{units:[]}});
   loads++;return route.fulfill({json:project()});
  });
  await page.goto(f.url+'?brand='+b.id+'#projects');for(let k=0;k<150&&!loads;k++)await page.waitForTimeout(100);assert.ok(loads>0,'the project list loaded the project');await page.waitForLoadState('networkidle').catch(()=>{});
  saved=true; // the picture is saved after this browser loaded the project list
  await page.evaluate(x=>{location.hash='review/'+x+'/0/0';},id);
  await page.locator('main img[src*="files/static.png"]').first().waitFor({timeout:15000});
  assert.equal(await page.locator('main').getByText('Artwork has not been created').count(),0,b.name+': the saved picture is shown');
  await page.waitForLoadState('networkidle').catch(()=>{});await context.close();
 }assert.deepEqual(errors,[]);}finally{await browser.close();f.server.closeAllConnections();await new Promise(r=>f.server.close(r));}
});
