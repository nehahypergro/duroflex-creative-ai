'use strict';
// Regression (21 Nov 2026, Neha: "all the status are overflowing, it shouldnt. it should optimise based on screen
// size"). On Home's "Continue working" cards the status pill broke inside itself ("Check before using · 1 of 6 /
// flagged", "Draf / t") because pills were set to wrap (9 Nov). Now a pill is always one line, the caption row wraps
// so the pill can take its own line, narrow cards drop the " · N of M flagged" part (full text in the title), and
// nothing passes the card edge. Failing before.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
test('status pills stay on one line inside their cards at phone, tablet and laptop widths, for both brands',{timeout:180000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 const png=await sharp({create:{width:64,height:64,channels:3,background:'#cabdd8'}}).png().toBuffer();
 try{for(const b of f.brands)for(const viewport of [{width:375,height:812},{width:768,height:1024},{width:1280,height:900}]){
  const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
  const id=i=>'creative-'+b.id.slice(6,14)+'-0000-4000-8000-00000000000'+i,when=i=>new Date(Date.UTC(2026,10,10,0,i)).toISOString();
  const view=i=>({id:id(i),brandId:b.id,status:i%3===2?'draft':'finished',createdAt:when(i),updatedAt:when(i),productSummary:{name:b.name+' Spine Contour Pocket Spring Mattress '+i},intake:{campaignName:b.name+' Spine Contour · Basic A+ page · 19 Nov'},
   placements:Array.from({length:6},(_,n)=>({id:'slot-'+n,name:'A+ module '+n,dimensions:{width:1464,height:600}})),
   results:Array.from({length:6},(_,n)=>({route:'continuity',placementId:'slot-'+n,ready:n>0,imageUrl:'/creative-ai/api/jobs/'+id(i)+'/files/static-'+n+'.png'})),edits:[]});
  await page.route(/\/creative-ai\/api\/jobs(\/|$|\?)/,async route=>{const u=new URL(route.request().url());
   if(u.pathname.includes('/files/'))return route.fulfill({status:200,contentType:'image/png',body:png});
   if(u.searchParams.get('include')==='projects')return route.fulfill({json:{version:1,brandId:b.id,projects:u.searchParams.get('ids').split(',').map(x=>view(Number(x.slice(-1))))}});
   if(u.pathname.endsWith('/jobs'))return route.fulfill({json:[0,1,3,4].map(i=>({id:id(i),brandId:b.id,status:'finished',createdAt:when(i),updatedAt:when(i),outputs:6,freshness:'x'+i}))});
   const i=Number(u.pathname.split('/')[4].slice(-1));return route.fulfill({json:u.pathname.endsWith('/edits')?[]:view(i)});});
  await page.goto(f.url+'?brand='+b.id+'#home');await page.locator('.continue-card [data-project-status]').first().waitFor({timeout:20000});
  const report=await page.evaluate(()=>[...document.querySelectorAll('.continue-card [data-project-status],.project-card [data-project-status]')].filter(e=>e.offsetParent).map(e=>{const r=document.createRange();r.selectNodeContents(e);const lines=new Set([...r.getClientRects()].filter(x=>x.width>0).map(x=>Math.round(x.top))).size,box=e.getBoundingClientRect(),card=e.closest('.continue-card,.project-card').getBoundingClientRect();return {text:e.textContent,title:e.title,lines,inside:box.left>=card.left-1&&box.right<=card.right+1};}));
  assert.ok(report.length>=2,b.name+' '+viewport.width+': cards with a status are shown');
  for(const p of report){assert.equal(p.lines,1,b.name+' '+viewport.width+'px: "'+p.text+'" stays on one line');assert.ok(p.inside,b.name+' '+viewport.width+'px: "'+p.text+'" stays inside its card');}
  assert.ok(report.some(p=>/flagged/.test(p.text)),'the flagged count is still in the pill text');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no sideways scrolling');
  await context.close();
 }}finally{await browser.close();f.server.close();}
 assert.deepEqual(errors,[]);
});
