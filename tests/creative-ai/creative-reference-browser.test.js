'use strict';
// Creative reference v1 (user request, 10 Nov 2026: "attach a reference and we will make something similar").
// In the brief, a reference picture gets a "how to use" choice. The picture stays on this device and is added
// to the brief (shrunk to a JPEG of at most 1536 px) only when readiness runs; a non-picture reference never is.
// Both brands. Generation is never requested (the preview answers readiness with a fixture).
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
test('a reference picture can be marked "layout and look" and reaches readiness as a small JPEG, for both brands',{timeout:150000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true}),errors=[],preflight=[];
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'reference-pic-')),file=path.join(dir,'moodboard.png');await fs.writeFile(file,await sharp({create:{width:2400,height:1600,channels:3,background:'#c8a27a'}}).png().toBuffer());
 try{for(const b of f.brands){
  const page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/studio/preflight',r=>{preflight.push(r.request().postDataJSON());return r.fulfill({json:{token:'reference-test-token',cost:{message:'Estimated ₹100 (test fixture)'},summary:{assets:1}}});});
  await page.route('**/api/studio/generate',r=>r.fulfill({status:503,json:{error:'Test: generation is not available here.'}}));
  await page.route('**/api/studio/validate-reference',r=>r.fulfill({json:{status:'readable',details:{format:'png',width:2400,height:1600}}}));
  const product=f.products[b.id].find(p=>(p.variants||[]).length===1);
  await page.goto(f.url+'?brand='+b.id);await page.waitForSelector('#homeBrief,.creation-hero');
  await page.evaluate(([id,p])=>{const d=StudioModel.startAssetDraft(id,['instagram-post']);d.intakeVersion=2;d.brief='A calm morning post about better sleep.';Object.assign(d,{focus:'product',productId:p.id,productName:p.name,variant:String(p.variants[0].id)});StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},[b.id,product]);
  await page.locator('#briefForm').waitFor();
  const chooser=page.waitForEvent('filechooser');await page.locator('[data-action=add-reference]').first().click();await (await chooser).setFiles(file);
  const use=page.locator('[data-reference-use]');await use.waitFor();
  assert.deepEqual(await use.locator('option').allInnerTexts(),['Not a design reference','Copy its layout','Match its look','Use its idea','Layout and look','Layout, look and idea']);
  const before=preflight.length;await use.selectOption('layout,look');
  const saved=await page.evaluate(()=>StudioModel.storage(localStorage).read(new URLSearchParams(location.search).get('brand'),location.hash.split('/')[1]));
  assert.deepEqual(saved.references.find(r=>/moodboard/.test(r.name)).creativeUse,['layout','look']);assert.equal(JSON.stringify(saved).includes('data:image'),false,'the saved draft never holds the picture');
  // Readiness carries the picture; ask for it directly if the page has not re-checked yet.
  await page.waitForFunction(n=>true,before);
  if(preflight.length===before)await page.evaluate(async()=>{const d=StudioModel.storage(localStorage).read(new URLSearchParams(location.search).get('brand'),location.hash.split('/')[1]);await StudioData.preflight(d);});
  const sent=preflight.at(-1).draft.creativeReference;assert.ok(sent,'readiness carries the reference');assert.deepEqual(sent.use,['layout','look']);assert.equal(sent.name,'moodboard.png');
  assert.match(sent.imageData,/^data:image\/jpeg;base64,/);const meta=await sharp(Buffer.from(sent.imageData.split(',')[1],'base64')).metadata();assert.ok(Math.max(meta.width,meta.height)<=1536,'shrunk before sending');
  // Choosing "Not a design reference" removes it from the next readiness check.
  await use.selectOption('');await page.evaluate(async()=>{const d=StudioModel.storage(localStorage).read(new URLSearchParams(location.search).get('brand'),location.hash.split('/')[1]);await StudioData.preflight(d);});
  assert.equal(preflight.at(-1).draft.creativeReference,undefined);
  await page.close();
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>f.server.close(r));await fs.rm(dir,{recursive:true,force:true});}
});
