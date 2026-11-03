'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('Both brands: previous-design references exclude trash and attach the latest saved image',{timeout:90000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview();
 const browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 const page=await browser.newPage({viewport:{width:1384,height:807}}),errors=[],uploads=[];
 page.on('pageerror',e=>errors.push(e.message));
 const original=await require('sharp')({create:{width:32,height:32,channels:3,background:'#ffffff'}}).png().toBuffer();
 const latest=await require('sharp')({create:{width:32,height:32,channels:3,background:'#6633cc'}}).png().toBuffer();
 const jobs=f.brands.flatMap((b,i)=>['kept','trashed'].map(kind=>({id:`reference-${i}-${kind}`,brandId:b.id,status:'finished',createdAt:'2026-10-31T08:00:00Z',updatedAt:'2026-10-31T08:00:00Z',intake:{brandId:b.id,campaignName:`${b.name} ${kind}`,productName:'Saved product',brief:'Supplied feature',conceptRoutes:['continuity']},placements:[{id:'square',name:'Social post',dimensions:{width:1080,height:1080}}],results:['continuity','contrast'].map(route=>({route,placementId:'square',ready:true,imageUrl:`/creative-ai/api/jobs/reference-${i}-${kind}/files/${route}.png`}))})));
 await page.route('**/creative-ai/api/jobs**',async r=>{
  const p=new URL(r.request().url()).pathname;
  if(p.endsWith('.png'))return r.fulfill({contentType:'image/png',body:p.endsWith('latest.png')?latest:original});
  if(p.endsWith('/jobs'))return r.fulfill({json:jobs});
  if(p.endsWith('/edits'))return r.fulfill({json:[{route:'continuity',placementId:'square',revision:2,sourceImageUrl:p.replace('/edits','/files/continuity.png'),previewUrl:p.replace('/edits','/files/latest.png')}]});
  return r.fulfill({json:jobs.find(j=>p==='/creative-ai/api/jobs/'+j.id)||{units:[]}});
 });
 await page.route('**/studio/validate-reference',async r=>{uploads.push(r.request().postDataJSON());await r.fulfill({json:{status:'readable',mime:'image/png'}});});
 try{for(const [i,b]of f.brands.entries()){
  await page.goto(f.url+'?brand='+b.id);await page.locator('.creation-hero').waitFor();
  await page.evaluate(({brandId,kept,trashed})=>{
   const M=window.StudioModel,org=M.organization(localStorage),v=org.read(brandId);
   org.updateMany(v,[{key:'project:'+trashed.id,patch:{trashedAt:'2026-10-31T09:00:00Z'}},{key:M.creativeKey(kept,kept.results[1]),patch:{trashedAt:'2026-10-31T09:00:00Z'}}]);
  },{brandId:b.id,kept:jobs[i*2],trashed:jobs[i*2+1]});
  await page.reload();await page.locator('.creation-hero').waitFor();
  await page.evaluate(brandId=>{const d=StudioModel.startDraft(brandId,'quick',1);d.brief='Show the product benefits';StudioModel.storage(localStorage).save(d);location.hash='brief/'+d.id;},b.id);
  await page.locator('[data-action=pick-reference]').click();
  assert.equal(await page.locator('.reference-design-card').count(),1);
  assert.ok((await page.locator('.reference-design-card').innerText()).includes(b.name));
  assert.ok((await page.locator('.reference-design-card img').getAttribute('src')).endsWith('/latest.png'));
  await page.locator('.reference-design-card').click();
  await page.waitForFunction(()=>document.querySelector('.reference-chips [data-action=remove-reference]'));
  await page.waitForFunction(()=>!document.querySelector('#referenceUploads .reference-upload-row'));
  assert.equal(uploads.length,i+1);assert.equal(uploads[i].brandId,b.id);
  assert.deepEqual(Buffer.from(uploads[i].data.split(',')[1],'base64'),latest);
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
