'use strict';
// Poonam's live brief (24 Nov 2026, Error CA-101): the earlier reference test answered readiness with a fixture, so the
// clash between the page (the picture stays on this device) and the real readiness rule (device-only references were
// refused) was never seen. Here the page's readiness request is answered by the real readiness code. Both brands; fails
// before the fix.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const M=require('../../public/creative-ai/studio-model');
const root=path.resolve(__dirname,'../..');
const cases=[['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','product-3566a343eb36f945fd10'],['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','product-985736dbde7586ad61c7']];
let policyRoot;
test.before(async()=>{const od=require('../../lib/creative-ai/runtime/original-delivery'),prepare=od.prepare;policyRoot=await fs.mkdtemp(path.join(os.tmpdir(),'reference-readiness-browser-'));await fs.writeFile(path.join(policyRoot,'workspace.json'),JSON.stringify({artworkDelivery:'original',artworkWorkflow:'lean-v1'}));test.mock.method(od,'prepare',(_root,intake)=>prepare(policyRoot,intake));
 test.mock.method(require('../../lib/creative-ai/runtime/creative-reference'),'save',async(_root,brandId,input)=>({version:1,name:input.name,use:input.use,sha256:'c'.repeat(64),width:10,height:10,brandId}));});
test.after(async()=>{test.mock.restoreAll();if(policyRoot)await fs.rm(policyRoot,{recursive:true,force:true});});

test('a brief with an attached picture passes the real readiness check, as "Not a design reference" and as the design reference, for both brands',{timeout:300000},async()=>{
 const g=require('../../lib/creative-ai/runtime/studio-generation'),{CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[];
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'reference-readiness-pic-')),file=path.join(dir,'ee3957a63c0faa8cd0de00bf713aa1eb.jpg');await fs.writeFile(file,await sharp({create:{width:1600,height:1200,channels:3,background:'#b48a5a'}}).jpeg().toBuffer());
 try{for(const [brandId,productId] of cases){
  const runtime=new CreativeRuntime({root,provider:{reason(){assert.fail('No paid call');},generate(){assert.fail('No paid call');}}});await require('./helpers/pinned-research-fixture').pin(runtime,brandId);
  const product=await runtime.brands.products.read(brandId,productId),sent=[];
  const page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/studio/preflight',async r=>{const draft=r.request().postDataJSON().draft;sent.push(draft);
   try{const {request,...safe}=await g.prepare(runtime,draft);await r.fulfill({json:safe});}
   catch(e){await r.fulfill({status:400,json:{clientCode:'CA-101',reference:'CAI-000000000000',httpStatus:400,error:String(e.message).slice(0,800)}});}});
  await page.route('**/api/studio/generate',r=>r.fulfill({status:503,json:{error:'Test: generation is not available here.'}}));
  await page.route('**/api/studio/validate-reference',r=>r.fulfill({json:{status:'readable',details:{format:'jpeg',width:1600,height:1200}}}));
  await page.goto(f.url+'?brand='+brandId);await page.waitForSelector('#homeBrief,.creation-hero');
  await page.evaluate(([id,p])=>{const d=StudioModel.startAssetDraft(id,['whatsapp-image','instagram-post']);d.intakeVersion=2;Object.assign(d,{brief:'create an ad for christmas',objective:'Awareness',messageType:'Product launch',focus:'product',productId:p.id,productName:p.name,variant:String(p.variants[0].id),rtbs:'3 premium fabric options'});StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},[brandId,{id:product.id,name:product.name,variants:product.variants.map(v=>({id:v.id}))}]);
  await page.locator('#briefForm').waitFor();
  const estimate=page.locator('#briefInlineEstimate');
  // Without a picture the brief is ready (the baseline the fix must keep).
  await page.waitForFunction(()=>/Paid AI generation starts/.test(document.querySelector('#briefInlineEstimate')?.textContent||'')||/Error CA-/.test(document.querySelector('#briefInlineEstimate')?.textContent||''));
  assert.doesNotMatch(await estimate.innerText(),/Error CA-/,'the brief without a picture is ready');
  // Poonam's case: the picture added and left as "Not a design reference".
  const chooser=page.waitForEvent('filechooser');await page.locator('[data-action=add-reference]').first().click();await (await chooser).setFiles(file);
  await page.locator('[data-reference-use]').waitFor();
  await page.waitForFunction(()=>/Not used in the design|Error CA-/.test(document.querySelector('#briefInlineEstimate')?.textContent||''));
  const unused=await estimate.innerText();
  assert.doesNotMatch(unused,/recognisable reason|Error CA-/,'the attached picture no longer blocks the brief');
  assert.match(unused,/Not used in the design: “ee3957a63c0faa8cd0de00bf713aa1eb\.jpg” \(set to “Not a design reference”\)/);assert.match(unused,/Paid AI generation starts/);
  assert.equal(await page.locator('[data-action=brief-create]').isDisabled(),false,'Create is available');
  // The same picture as the design reference.
  const before=sent.length;await page.locator('[data-reference-use]').selectOption('look');
  await page.waitForFunction(()=>{const t=document.querySelector('#briefInlineEstimate')?.textContent||'';return !/Not used in the design/.test(t)&&/Paid AI generation starts|Error CA-/.test(t);});
  const used=await estimate.innerText();
  assert.doesNotMatch(used,/Error CA-|Not used in the design/,'the design reference passes readiness');assert.match(used,/Paid AI generation starts/);
  const last=sent.at(-1);assert.ok(sent.length>before);assert.equal(last.creativeReference.name,'ee3957a63c0faa8cd0de00bf713aa1eb.jpg');assert.deepEqual(last.creativeReference.use,['look']);assert.match(last.creativeReference.imageData,/^data:image\/jpeg;base64,/);
  await page.close();
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>f.server.close(r));await fs.rm(dir,{recursive:true,force:true});}
});
