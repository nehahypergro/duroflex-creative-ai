'use strict';
// Local picture test (24 Nov 2026): after "Create 2 designs" the page went to Projects → Creating and said "No work in
// this status" while both designs were running. A Create that starts several designs cleared the page's saved copy
// but never asked the server for the list again (only a window focus did), so the new designs were missing until the
// user left the window and came back. Here readiness is answered by the real readiness code and the server's list
// has the two running designs once they have started. Both brands; fails before the fix.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const cases=[['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','product-3566a343eb36f945fd10'],['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','product-985736dbde7586ad61c7']];
let policyRoot;
test.before(async()=>{const od=require('../../lib/creative-ai/runtime/original-delivery'),prepare=od.prepare;policyRoot=await fs.mkdtemp(path.join(os.tmpdir(),'create-list-refresh-'));await fs.writeFile(path.join(policyRoot,'workspace.json'),JSON.stringify({artworkDelivery:'original',artworkWorkflow:'lean-v1'}));test.mock.method(od,'prepare',(_root,intake)=>prepare(policyRoot,intake));});
test.after(async()=>{test.mock.restoreAll();if(policyRoot)await fs.rm(policyRoot,{recursive:true,force:true});});

test('after a Create that starts two designs, Projects → Creating lists both, for both brands',{timeout:300000},async()=>{
 const g=require('../../lib/creative-ai/runtime/studio-generation'),{CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 try{for(const [brandId,productId] of cases){
  const runtime=new CreativeRuntime({root,provider:{reason(){assert.fail('No paid call');},generate(){assert.fail('No paid call');}}});await require('./helpers/pinned-research-fixture').pin(runtime,brandId);
  const product=await runtime.brands.products.read(brandId,productId),tag=brandId.slice(6,14);
  const ids=['creative-'+tag+'-0000-4000-8000-000000000001','creative-'+tag+'-0000-4000-8000-000000000002'],started=[],lists=[];
  const view=(id,n)=>({id,brandId,status:'running',stage:'research',createdAt:'2026-11-24T20:04:3'+n+'.000Z',updatedAt:'2026-11-24T20:04:3'+n+'.000Z',name:product.name,intake:{brandId,productId,productName:product.name,campaignName:product.name,brief:'create an ad for christmas'},placements:[{id:'square',name:n===1?'Instagram Post':'WhatsApp Image',width:1080,height:1080}],results:[]});
  const page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  // The server's list: empty before Create, the two running designs after it.
  await page.route(url=>url.pathname==='/creative-ai/api/jobs',async r=>{const u=new URL(r.request().url());lists.push(u.search);
   if(u.searchParams.get('include')==='projects')return r.fulfill({json:{version:1,brandId,projects:u.searchParams.get('ids').split(',').filter(id=>started.includes(id)).map(id=>({...view(id,ids.indexOf(id)+1),edits:[]}))}});
   return r.fulfill({json:started.map((id,i)=>({id,brandId,status:'running',createdAt:view(id,i+1).createdAt,updatedAt:view(id,i+1).updatedAt,freshness:'f-'+id}))});});
  await page.route('**/api/studio/preflight',async r=>{try{const {request,...safe}=await g.prepare(runtime,r.request().postDataJSON().draft);await r.fulfill({json:safe});}catch(e){await r.fulfill({status:400,json:{error:String(e.message).slice(0,800)}});}});
  await page.route('**/api/studio/generate',r=>{started.push(...ids);return r.fulfill({status:202,json:{id:ids[0],ids,errors:[]}});});
  await page.goto(f.url+'?brand='+brandId);await page.waitForSelector('#homeBrief,.creation-hero');
  await page.evaluate(([id,p])=>{const d=StudioModel.startAssetDraft(id,['whatsapp-image','instagram-post']);d.intakeVersion=2;Object.assign(d,{brief:'create an ad for christmas',objective:'Awareness',messageType:'Benefit',focus:'product',productId:p.id,productName:p.name,variant:String(p.variants[0].id),rtbs:'3 premium fabric options'});StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},[brandId,{id:product.id,name:product.name,variants:product.variants.map(v=>({id:v.id}))}]);
  await page.locator('#briefForm').waitFor();
  await page.waitForFunction(()=>/Paid AI generation starts/.test(document.querySelector('#briefInlineEstimate')?.textContent||''));
  const before=lists.length;await page.locator('[data-action=brief-create]').click();
  await page.waitForFunction(()=>location.hash==='#projects?status=creating');
  // Both new designs appear in Creating without leaving the window.
  for(const id of ids)await page.locator('a[href="#project/'+id+'"]').first().waitFor({timeout:8000}).catch(()=>{});
  const shown=await page.evaluate(ids=>ids.filter(id=>document.querySelector('a[href="#project/'+id+'"]')),ids);
  assert.deepEqual(shown,ids,'both running designs are listed under Creating');
  assert.doesNotMatch(await page.locator('main').innerText(),/No work in this status/);
  assert.ok(lists.slice(before).some(s=>/brandId=/.test(s)),'the list was asked for again after Create');
  await page.close();
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
