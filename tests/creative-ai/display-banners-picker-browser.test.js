'use strict';
// Google Display banners picker (user request, 9 Nov 2026; docs/display-banners-20261109.md): the card is
// ready in the Ads tab, the brief lists every size and the image count, the strip sizes are an opt-in, and
// the INR estimate shows the image count before anything is submitted. Read-only preview: the preflight
// request is answered by the real generation profile and the real estimate on fake completed runs.
const {chooseSelect}=require('./helpers/ui-controls.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const M=require('../../public/creative-ai/studio-model'),{estimateBrief}=require('../../lib/creative-ai/runtime/studio-estimate');
test('both brands pick Google Display banners, see every size, the image count and the estimate before submit',{timeout:150000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),page=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[],paid=[];
 const out='work/display-banners-20261109';await fs.mkdir(out,{recursive:true});
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'banners-browser-'));await fs.mkdir(path.join(root,'output/cost-tracking'),{recursive:true});
 await fs.writeFile(path.join(root,'output/cost-tracking/currency.json'),JSON.stringify({displayCurrency:'INR',usdToInr:88,rateDate:'2026-11-01',source:'https://example.test/fx'}));await fs.writeFile(path.join(root,'workspace.json'),JSON.stringify({artworkDelivery:'original',artworkWorkflow:'lean-v1'}));
 const at='2026-11-08T00:01:00Z',rc=(kind,model,key,o)=>({kind,model,recordedAt:at,requestKey:key,usage:kind==='image'?{input_tokens:2000,output_tokens:o,input_tokens_details:{text_tokens:1000,image_tokens:1000}}:{input_tokens:20000,output_tokens:o}});
 const run=brandId=>({id:'sample-'+brandId,status:'finished',createdAt:'2026-11-08T00:00:00Z',intake:{brandId,leanWorkflowVersion:1},runtimeConfig:{roleModels:{'lean-planning':{model:'gpt-6.1-sol'}},leanImageOptions:[{route:'continuity',model:'gpt-image-2'}]},selection:[{description:{dimensions:{width:1080,height:1350}}}],results:[{imageUrl:'a'}],budget:{receipts:[rc('reasoning','gpt-6.1-sol','plan',12000),rc('image','gpt-image-2','img',6000),rc('reasoning','gpt-6-luna','review',6000)],requestStates:{}}});
 const runtime={root,config:{},store:{list:async()=>f.brands.map(b=>run(b.id))}};
 await page.route('**/api/studio/preflight',async r=>{const draft=JSON.parse(r.request().postData()).draft,profile=M.generationProfile(draft);if(!profile?.displayBanners)return r.fulfill({status:400,json:{error:'Not a banner set'}});
  const cost=await estimateBrief(runtime,draft.brandId,profile,1);r.fulfill({json:{token:'b'.repeat(64),checks:[{label:'Dimensions and brief inputs',status:'passed'}],summary:{brand:draft.brandId,width:profile.width,height:profile.height,options:1,unitsPerOption:profile.unitCount},cost}});});
 page.on('pageerror',e=>errors.push(e.stack));page.on('request',r=>{if(/\/api\/studio\/(generate|submit)/.test(r.url()))paid.push(r.url());});
 const field=k=>page.locator('[data-static-key="'+k+'"]'),overview=()=>page.locator('.asset-requirements-overview').first();
 try{for(const b of f.brands){
  const name=b.name.toLowerCase();
  await page.setViewportSize({width:1366,height:1000});await page.goto(f.url+'?brand='+b.id);await page.locator('.creation-hero').waitFor();
  // The Ads tab shows the card as ready (no "Coming soon"), with its Ad badge and its own icon.
  await page.getByRole('button',{name:'Browse all tools',exact:true}).click();await page.locator('[data-action=picker-tab][data-division=ads]').click();
  const card=page.locator('#assetPickerGrid [data-card=google-display-banners]');await card.waitFor();
  const cardText=await card.innerText();assert.doesNotMatch(cardText,/Coming soon/);assert.match(cardText,/\bAd\b/);
  assert.equal(await card.locator('.asset-icon[aria-hidden=true]').getAttribute('data-asset-icon'),'google-display-banners');
  await page.locator('#assetPickerGrid').screenshot({path:out+'/'+name+'-ads-tab-1366.png'});
  await card.click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.locator('#field-brief').waitFor();
  assert.equal(await page.locator('.planning-only-note').count(),0,'a ready card is not a planning brief');
  // Fill the brief like a marketer would, then reopen it.
  await page.evaluate(({brand,products})=>{const s=StudioModel.storage(localStorage),id=location.hash.slice(1).split('/')[1].split('?')[0],d=s.read(brand,id);const p=products.find(p=>/mattress/i.test(p.category||'')&&StudioModel.productRtbs(p).length)||products.find(p=>StudioModel.productRtbs(p).length);d.brief='Google display ads that bring shoppers to this product page.';d.objective='Consideration';StudioModel.selectBriefProduct(d,p,StudioModel.defaultVariant(p)||String(p.variants?.[0]?.id||''));s.save(d);location.hash='brief/'+d.id;},{brand:b.id,products:f.products[b.id]});
  await page.reload();await field('bannerSet').waitFor({state:'attached'});
  assert.equal(await field('bannerSet').inputValue(),M.displayBannerSetNames[0],'the standard set is the default');
  let text=await overview().innerText();assert.match(text,/Google Display banner set · 6 images in one job/);
  for(const row of ['300 × 250 Inline rectangle','336 × 280 Large rectangle','300 × 600 Half-page ad','160 × 600 Wide skyscraper','970 × 250 Billboard','320 × 100 Large mobile banner'])assert.ok(text.includes(row),row);
  assert.match(text,/728 × 90 Leaderboard · left out of the standard set/);assert.match(text,/150 KB/);
  assert.equal(await field('contactMode').count(),0,'QR / contact is never asked for banners');
  await overview().scrollIntoViewIfNeeded();await overview().screenshot({path:out+'/'+name+'-sizes-1366.png'});
  await chooseSelect(page,field('bannerSet'),M.displayBannerSetNames[1]);await page.waitForFunction(()=>/8 images/.test(document.querySelector('.asset-requirements-overview')?.innerText||''));
  text=await overview().innerText();assert.match(text,/728 × 90 Leaderboard · .*strip layout, not yet tested/);assert.match(text,/320 × 50 Mobile banner · .*strip layout, not yet tested/);
  await overview().screenshot({path:out+'/'+name+'-sizes-with-strips-1366.png'});
  await chooseSelect(page,field('bannerSet'),M.displayBannerSetNames[0]);await page.waitForFunction(()=>/6 images/.test(document.querySelector('.asset-requirements-overview')?.innerText||''));
  await page.waitForTimeout(900);await page.locator('[data-action=assignment-review]').click();
  const estimate=page.locator('[data-review-estimate]');await page.waitForFunction(()=>/₹\d+–₹\d+/.test(document.querySelector('[data-review-estimate]')?.innerText||''),null,{timeout:15000});
  text=await estimate.innerText();assert.match(text,/6 images/);assert.match(text,/not a quote/);
  await estimate.scrollIntoViewIfNeeded();await estimate.screenshot({path:out+'/'+name+'-estimate-1366.png'});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2),false,'no sideways scroll on a phone');
  await estimate.scrollIntoViewIfNeeded();await estimate.screenshot({path:out+'/'+name+'-estimate-390.png'});
  await page.goBack().catch(()=>{});await field('bannerSet').waitFor({state:'attached',timeout:5000}).catch(()=>{});
  if(await overview().count()){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2),false,'brief fits a phone');await overview().scrollIntoViewIfNeeded();await overview().screenshot({path:out+'/'+name+'-sizes-390.png'});}
 }assert.deepEqual(paid,[],'no paid request');assert.deepEqual(errors,[]);}finally{await browser.close();await new Promise(r=>f.server.close(r));await fs.rm(root,{recursive:true,force:true});}
});
