'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
const ctx={window:{},TextEncoder};require('node:vm').runInNewContext(require('node:fs').readFileSync(require('node:path').join(__dirname,'../../public/creative-ai/canvas-model.js'),'utf8'),ctx);const C=ctx.window.CreativeCanvasModel;
test('Search explanations name the fields that actually matched, including mixed tokens',()=>{
 assert.equal(M.searchExplanation('diwali',{'Project name':'Airboost','Brief':'Create a Diwali post'}),'Matches brief');
 assert.equal(M.searchExplanation('airboost hindi',{'Product':'Airboost','Language':'Hindi'}),'Matches product and language');
 assert.equal(M.searchExplanation('absent',{'Project name':'Airboost'}),'');
 assert.equal(M.searchExplanation('',{'Project name':'Airboost'}),'');
});
test('Tab title keeps project, screen and brand without internal IDs',()=>{
 assert.equal(M.browserTitle('Duroflex','project','Airboost · Diwali'),'Airboost · Diwali — Duroflex · Creative AI');
 assert.equal(M.browserTitle('Sleepyhead','review','Napster launch'),'Napster launch · Design — Sleepyhead · Creative AI');
 assert.equal(M.browserTitle('Duroflex','home'),'Home — Duroflex · Creative AI');
 assert.equal(C.optionLabel('continuity'),'Alternative set 1');assert.equal(C.optionLabel('exploration'),'Alternative set 2');
});
test('Project recovery and search are clear in both brands without submitting work',{timeout:60000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage({viewport:{width:1366,height:900}}),writes=[],errors=[];
 page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());});
 const jobs=f.brands.flatMap((b,i)=>['failed','finished','running'].map((status,k)=>({id:'clarity-'+i+'-'+k,brandId:b.id,status,createdAt:'2026-10-29T06:00:00Z',updatedAt:'2026-10-29T06:00:00Z',intake:{brandId:b.id,campaignName:'Launch '+k,productName:'Test product',brief:'Diwali product launch'},placements:[],results:[],error:status==='failed'?'Provider unavailable':undefined})));
 await page.route('**/creative-ai/api/jobs**',r=>{const p=new URL(r.request().url()).pathname;if(p.endsWith('/jobs'))return r.fulfill({json:jobs});if(p.endsWith('/restart'))return r.fulfill({json:{brandId:jobs.find(j=>p.includes(j.id)).brandId,token:'fixture',cost:{message:'Estimated ₹120.00. Final usage may vary.'}}});if(p.endsWith('/edits'))return r.fulfill({json:[]});return r.fulfill({json:jobs.find(j=>p.endsWith('/'+j.id))||{}});});
 try{for(const [i,b] of f.brands.entries()){
 await page.goto(f.url+'?brand='+b.id+'#project/clarity-'+i+'-0');await page.getByRole('button',{name:'Review recovery options',exact:true}).waitFor();
 assert.match(await page.title(),new RegExp(b.name));assert.match(await page.title(),/Launch 0/);
 await page.screenshot({path:require('node:path').join(__dirname,'../../work/ux-project-clarity/recovery-'+i+'.png'),fullPage:true});await page.getByRole('button',{name:'Review recovery options',exact:true}).click();await page.getByRole('button',{name:'Start another paid attempt',exact:true}).waitFor();assert.match(await page.locator('#restartPanel').innerText(),/₹120/);assert.equal(writes.length,0);
 await page.evaluate(id=>location.hash='project/'+id,'clarity-'+i+'-1');await page.getByText('No designs were saved',{exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Create a new brief',exact:true}).isVisible());assert.equal(await page.locator('.image-selection').count(),0);assert.doesNotMatch(await page.locator('#main').innerText(),/No items in this view|Choose another filter/);
 await page.evaluate(()=>location.hash='project/missing-clarity');await page.getByText('Project not found',{exact:true}).waitFor();assert.match(await page.locator('#main').innerText(),/removed or hidden/);assert.equal(await page.getByRole('link',{name:'Open Trash',exact:true}).count(),0);
 await page.evaluate(id=>location.hash='project/'+id,'clarity-'+(1-i)+'-1');await page.getByRole('link',{name:'Open in '+f.brands[1-i].name,exact:true}).waitFor();const target=new URL(await page.getByRole('link',{name:'Open in '+f.brands[1-i].name,exact:true}).getAttribute('href'));assert.equal(target.searchParams.get('brand'),f.brands[1-i].id);assert.equal(target.hash,'#project/clarity-'+(1-i)+'-1');
 await page.evaluate(({brand,id})=>{const s=StudioModel.organization(localStorage),o=s.read(brand);o.entries['project:'+id]={trashedAt:new Date().toISOString()};s.save(o,o.revision);location.hash='project/'+id;},{brand:b.id,id:'clarity-'+i+'-1'});await page.reload();await page.getByText('Project is in Trash',{exact:true}).waitFor();assert.ok(await page.getByRole('link',{name:'Open Trash',exact:true}).isVisible());
 await page.evaluate(()=>location.hash='home');await page.waitForFunction(()=>document.title.startsWith('Home'));await page.locator('[data-action=workspace-search]').first().click();await page.locator('#workspaceSearch').fill('diwali');await page.locator('#workspaceResults').waitFor({state:'visible'});assert.match(await page.locator('#workspaceResults').innerText(),/Matches brief/);
 }
 await page.screenshot({path:require('node:path').join(__dirname,'../../work/ux-project-clarity/search.png'),fullPage:true});let release;const gate=new Promise(r=>release=r);await page.route('**/creative-ai/api/jobs',async r=>{await gate;await r.fulfill({json:jobs});});
 await page.evaluate(()=>location.hash='project/delayed-missing');await page.getByText('Checking this project',{exact:true}).waitFor();await page.evaluate(()=>location.hash='home');await page.waitForFunction(()=>document.title.startsWith('Home'));release();await page.waitForTimeout(150);assert.ok(await page.locator('.creation-hero').isVisible());assert.equal(await page.getByText('Project not found',{exact:true}).count(),0);
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
