'use strict';
// Amazon A+ picker (user decisions, 9 Nov 2026): the A+ card asks Premium (recommended) / Basic /
// Brand Story, shows every module with its exact sizes and image count, and shows the INR estimate
// before anything is submitted. Read-only preview: the preflight request is answered in this test by
// the real generation profile and the real A+ estimate on fake completed runs; nothing is generated.
const {chooseSelect}=require('./helpers/ui-controls.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const M=require('../../public/creative-ai/studio-model'),{estimateBrief}=require('../../lib/creative-ai/runtime/studio-estimate');
test('both brands choose an A+ page type, see its modules, sizes, image count and estimate before submit',{timeout:120000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[],paid=[];
 const out='work/aplus-20261109';await fs.mkdir(out,{recursive:true});
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'aplus-browser-'));await fs.mkdir(path.join(root,'output/cost-tracking'),{recursive:true});
 await fs.writeFile(path.join(root,'output/cost-tracking/currency.json'),JSON.stringify({displayCurrency:'INR',usdToInr:88,rateDate:'2026-11-01',source:'https://example.test/fx'}));await fs.writeFile(path.join(root,'workspace.json'),JSON.stringify({artworkDelivery:'original',artworkWorkflow:'lean-v1'}));
 const at='2026-11-08T00:01:00Z',rc=(kind,model,key,o)=>({kind,model,recordedAt:at,requestKey:key,usage:kind==='image'?{input_tokens:2000,output_tokens:o,input_tokens_details:{text_tokens:1000,image_tokens:1000}}:{input_tokens:20000,output_tokens:o}});
 const run=brandId=>({id:'sample-'+brandId,status:'finished',createdAt:'2026-11-08T00:00:00Z',intake:{brandId,leanWorkflowVersion:1},runtimeConfig:{roleModels:{'lean-planning':{model:'gpt-6.1-sol'}},leanImageOptions:[{route:'continuity',model:'gpt-image-2'}]},selection:[{description:{dimensions:{width:1080,height:1350}}}],results:[{imageUrl:'a'}],budget:{receipts:[rc('reasoning','gpt-6.1-sol','plan',12000),rc('image','gpt-image-2','img',6000),rc('reasoning','gpt-6-luna','review',6000)],requestStates:{}}});
 const runtime={root,config:{},store:{list:async()=>f.brands.map(b=>run(b.id))}};
 await page.route('**/api/studio/preflight',async r=>{const draft=JSON.parse(r.request().postData()).draft,profile=M.generationProfile(draft);if(!profile?.aplus)return r.fulfill({status:400,json:{error:'Not an A+ page'}});
  const cost=await estimateBrief(runtime,draft.brandId,profile,1);r.fulfill({json:{token:'a'.repeat(64),checks:[{label:'Dimensions and brief inputs',status:'passed'}],summary:{brand:draft.brandId,width:profile.width,height:profile.height,options:1,unitsPerOption:profile.unitCount},cost}});});
 page.on('pageerror',e=>errors.push(e.stack));page.on('request',r=>{if(/\/api\/studio\/(generate|submit)/.test(r.url()))paid.push(r.url());});
 const field=k=>page.locator('[data-static-key="'+k+'"]'),overview=()=>page.locator('.asset-requirements-overview').first();
 try{for(const b of f.brands){
  await page.setViewportSize({width:1366,height:1000});await page.goto(f.url+'?brand='+b.id);await page.locator('.creation-hero').waitFor();
  await page.evaluate(({brand,products})=>{const p=products.find(p=>/mattress/i.test(p.category||'')&&StudioModel.productRtbs(p).length)||products.find(p=>StudioModel.productRtbs(p).length);const d=StudioModel.startAssetDraft(brand,['amazon-aplus']);d.brief='Make an Amazon A+ page for this product that explains why it is worth choosing.';d.objective='Consideration';StudioModel.selectBriefProduct(d,p,StudioModel.defaultVariant(p)||String(p.variants?.[0]?.id||''));StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},{brand:b.id,products:f.products[b.id]});
  await field('amazonPreset').waitFor({state:'attached'});
  assert.equal(await field('amazonPreset').inputValue(),'Amazon A+ page — Premium (recommended)','the A+ card starts the recommended Premium page');
  const options=await field('amazonPreset').evaluate(e=>[...e.options].map(o=>o.value).filter(Boolean));assert.deepEqual(options.slice(0,3),['Amazon A+ page — Premium (recommended)','Amazon A+ page — Basic','Amazon A+ page — Brand Story']);
  let text=await overview().innerText();assert.match(text,/Premium A\+ page · 6 modules · 14 images/);assert.match(text,/Hero banner · 1464 × 600 desktop \+ 600 × 450 mobile/);assert.match(text,/Benefits carousel · 3 × 1464 × 600 desktop \+ 600 × 450 mobile each/);assert.match(text,/FAQ · text only/);assert.match(text,/alt text/);
  assert.equal(await field('contactMode').count(),0,'QR / contact is never asked for A+');
  await overview().screenshot({path:out+'/'+b.name.toLowerCase()+'-premium-modules-1366.png'});
  await chooseSelect(page,field('amazonPreset'),'Amazon A+ page — Basic');await page.waitForFunction(()=>/6 images/.test(document.querySelector('.asset-requirements-overview')?.innerText||''));text=await overview().innerText();assert.match(text,/Header image with text · 970 × 600/);assert.match(text,/Three images · 3 × 300 × 300 each/);
  await chooseSelect(page,field('amazonPreset'),'Amazon A+ page — Brand Story');await page.waitForFunction(()=>/5 images/.test(document.querySelector('.asset-requirements-overview')?.innerText||''));text=await overview().innerText();assert.match(text,/Brand Story background · 1464 × 625 desktop \+ 463 × 625 mobile/);assert.match(text,/Story cards · 3 × 362 × 453 each/);
  await chooseSelect(page,field('amazonPreset'),'Amazon A+ page — Premium (recommended)');await page.waitForFunction(()=>/14 images/.test(document.querySelector('.asset-requirements-overview')?.innerText||''));
  await page.waitForTimeout(900);await page.locator('[data-action=assignment-review]').click();
  const estimate=page.locator('[data-review-estimate]');await page.waitForFunction(()=>/₹\d+–₹\d+/.test(document.querySelector('[data-review-estimate]')?.innerText||''),null,{timeout:15000});
  text=await estimate.innerText();assert.match(text,/14 images/);assert.match(text,/Premium A\+ page/);assert.match(text,/not a quote/);
  await estimate.scrollIntoViewIfNeeded();await estimate.screenshot({path:out+'/'+b.name.toLowerCase()+'-estimate-1366.png'});
  await page.screenshot({path:out+'/'+b.name.toLowerCase()+'-premium-estimate-1366.png',fullPage:false});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2),false,'no sideways scroll on a phone');
  await estimate.scrollIntoViewIfNeeded();await estimate.screenshot({path:out+'/'+b.name.toLowerCase()+'-estimate-390.png'});
  await page.screenshot({path:out+'/'+b.name.toLowerCase()+'-premium-estimate-390.png',fullPage:false});
  await page.goBack().catch(()=>{});await field('amazonPreset').waitFor({state:'attached',timeout:5000}).catch(()=>{});if(await overview().count()){await overview().scrollIntoViewIfNeeded();await overview().screenshot({path:out+'/'+b.name.toLowerCase()+'-premium-modules-390.png'});}
 }assert.deepEqual(paid,[],'no paid request');assert.deepEqual(errors,[]);}finally{await browser.close();await new Promise(r=>f.server.close(r));await fs.rm(root,{recursive:true,force:true});}
});
