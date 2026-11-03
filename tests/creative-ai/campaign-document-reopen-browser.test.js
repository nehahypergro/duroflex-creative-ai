'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
test('reopening document-only campaigns fills missing assets for both brands and preserves explicit choices',{timeout:90000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage(),errors=[];
 const sample=JSON.parse(execFileSync(process.execPath,['lib/admin/brief-document-worker.js','output/pdf/Duroflex_Airboost_Sample_Campaign_Brief.pdf','pdf'],{encoding:'utf8'}));
 page.on('pageerror',e=>errors.push(e.message));
 try{for(const b of f.brands){await page.goto(f.url+'?brand='+b.id);await page.locator('.creation-hero').waitFor();
 // Only Duroflex receives its own sample; Sleepyhead uses a brand-neutral synthetic document.
 const text=b.name==='Duroflex'?sample.text:'Instagram carousel: 6 cards, 1080 x 1350 px.\nInstagram story: 1080 x 1920 px.\nEmail hero: 1200 x 600 px.\nLanguage: Hindi\nOne set.';
 await page.evaluate(({b,text})=>{const d=StudioModel.startDraft(b.id,'campaign');d.intakeVersion=2;d.briefDocuments=[{id:'test-doc',name:'campaign.pdf',text,status:'extracted',bytes:1024}];StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},{b,text});
 await page.waitForFunction(()=>document.querySelectorAll('[data-static-details]').length===3,{timeout:5000});
 assert.match(await page.locator('#briefSummary').innerText(),/Carousel, Instagram story, Messaging visual · Hindi/);
 const imported=await page.evaluate(()=>{const d=StudioModel.storage(localStorage).read(new URL(location.href).searchParams.get('brand'),location.hash.slice(7));return {sets:StudioModel.creativeCount(d),items:StudioModel.units(d),languages:d.outputs.map(o=>o.language),sizes:d.outputs.map(o=>[o.width,o.height])};});
 assert.deepEqual(imported,{sets:1,items:8,languages:['Hindi','Hindi','Hindi'],sizes:[[1080,1350],[1080,1920],[1200,600]]});
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('[data-static-details]').length===3);assert.equal(await page.locator('[data-static-details]').count(),3);
 await page.evaluate(()=>{const s=StudioModel.storage(localStorage),d=s.read(new URL(location.href).searchParams.get('brand'),location.hash.slice(7));d.outputs=[StudioModel.output(1)];StudioModel.protectBriefField(d,'assetType');s.save(d);});await page.reload();await page.locator('#briefForm').waitFor();await page.waitForTimeout(1000);assert.equal(await page.locator('[data-static-details]').count(),1);
 }assert.deepEqual(errors,[]);}finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
test('Create a campaign does not inherit a hidden asset lock from an earlier design',{timeout:60000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage();
 try{for(const b of f.brands){await page.goto(f.url+'?brand='+b.id);await page.getByRole('button',{name:'Create Instagram post',exact:true}).click();await page.locator('#field-brief').waitFor();await page.locator('[data-nav=home]').click();await page.getByRole('button',{name:'Create a campaign',exact:true}).click();await page.locator('#field-brief').waitFor();
 const before=await page.evaluate(()=>StudioModel.storage(localStorage).read(new URL(location.href).searchParams.get('brand'),location.hash.slice(7)));assert.equal(before.outputs.length,0,'new campaign must not inherit a previous design');assert.ok(!before.briefAutofill?.manual?.assetType);
 await page.evaluate(()=>{const s=StudioModel.storage(localStorage),d=s.read(new URL(location.href).searchParams.get('brand'),location.hash.slice(7));d.briefDocuments=[{id:'doc',name:'campaign.pdf',bytes:100,status:'extracted',text:'Instagram carousel: 6 cards.\nInstagram story: 1 image.\nEmail hero: 1 image.'}];s.save(d);});await page.reload();await page.waitForFunction(()=>document.querySelectorAll('[data-static-details]').length===3);
 }}finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
