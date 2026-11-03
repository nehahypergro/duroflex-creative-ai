'use strict';
const {chooseSelect}=require('./helpers/ui-controls.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),os=require('os'),sharp=require('sharp');
const mod=require('../../lib/creative-ai/runtime/editable'),ocr=require('../../lib/creative-ai/runtime/editor-ocr'),{CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
const source=path.resolve(__dirname,'../..');
const fields=[{id:'headline',role:'headline',text:'Rest your way',delivery:'embedded'},{id:'cta',role:'cta',text:'Explore now',delivery:'embedded'}];
const rows=[{text:'Rest your way',confidence:1,box:{x:.1,y:.12,width:.55,height:.08}},{text:'Explore now',confidence:1,box:{x:.1,y:.8,width:.3,height:.04}},{text:'BodyIQ',confidence:1,box:{x:.5,y:.5,width:.2,height:.04}},{text:'BOOKS',confidence:1,box:{x:.8,y:.4,width:.1,height:.05}}];
test('copy-bound OCR preserves incidental lettering, ambiguity, nonembedded copy and glyph differences',()=>{
 assert.deepEqual(ocr.select(rows,fields).matches.map(m=>m.fieldId),['headline','cta']);
 assert.equal(ocr.select([...rows,{...rows[0],box:{...rows[0].box,y:.6}}],fields).matches.some(m=>m.fieldId==='headline'),false);
 assert.equal(ocr.select(rows,[{id:'label',text:'BodylQ',delivery:'embedded'}]).matches.length,0);
 assert.equal(ocr.select(rows,[{id:'caption',text:'BOOKS',delivery:'native'}]).matches.length,0);
 assert.equal(ocr.select(rows,fields,[rows[0].box]).matches.length,1);
});
test('local cleanup preserves every decoded pixel outside selected masks, including excluded lettering',async()=>{
 const bytes=await sharp({create:{width:100,height:100,channels:3,background:'#8c9b7a'}}).png().toBuffer();const result=await ocr.cleanup(bytes,[{x:.1,y:.1,width:.3,height:.2}],[{x:.3,y:.1,width:.1,height:.2}]);
 const before=await sharp(bytes).raw().toBuffer(),after=await sharp(result.bytes).raw().toBuffer();for(let y=0;y<100;y++)for(let x=0;x<100;x++)if(x>45||y>35||x>=30&&x<40&&y>=10&&y<30){const p=(y*100+x)*3;assert.deepEqual(after.subarray(p,p+3),before.subarray(p,p+3));}assert.equal(result.outsideMaskChangedPixels,0);
});
async function fixture(){const root=await fs.mkdtemp(path.join(os.tmpdir(),'editor-production-'));await fs.symlink(path.join(source,'public'),path.join(root,'public'));const runtime=new CreativeRuntime({root,provider:{}});runtime.schedule=()=>{};const brands=['brand-duroflex-fixture','brand-sleepyhead-fixture'],jobs=[];
 for(const brandId of brands){await runtime.brands.save(brandId,'brand.json',{id:brandId,name:brandId,documents:[],researchIds:[]});await mod.uploadAsset(runtime,brandId,{kind:'font',name:'Fixture font',sourceReference:'offline QA',approved:true,weight:400,data:'data:font/ttf;base64,'+(await fs.readFile('/System/Library/Fonts/Supplemental/Arial.ttf')).toString('base64')});await mod.uploadAsset(runtime,brandId,{kind:'logo',name:'Fixture logo',sourceReference:'offline QA',approved:true,data:'data:image/png;base64,'+(await sharp({create:{width:200,height:60,channels:4,background:brandId.includes('sleepy')?'#f15a22':'#dd2222'}}).png().toBuffer()).toString('base64')});
 const job=await runtime.store.create({brandId},{maxReasoningCalls:5,jobTimeoutMs:60000},[{id:'square',description:{id:'square',dimensions:{width:600,height:600}}}]);const image=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#73846a"/>'+rows.map(r=>'<text x="'+(r.box.x*600)+'" y="'+((r.box.y+r.box.height)*600-5)+'" font-family="Arial" font-size="'+(r.box.height*600)+'" fill="white">'+r.text+'</text>').join('')+'</svg>')).png().toBuffer();await runtime.store.save(job.id,'static-continuity-square-0.png',image);await runtime.store.save(job.id,'package-continuity-square-0.json',{assignmentId:job.id,route:'continuity',placementId:'square',exactCopy:{fields},upstreamContext:{},lockedRules:[]});await runtime.store.update(job.id,j=>{j.status='finished';j.results=[{route:'continuity',placementId:'square',imageUrl:'/creative-ai/api/jobs/'+job.id+'/files/static-continuity-square-0.png'}];return j;});jobs.push(await runtime.store.read(job.id));}
 return {root,runtime,jobs,cleanup:()=>fs.rm(root,{recursive:true,force:true})};}
test('both brands: copy-only conversion, immutable originals, added elements/fonts/uploads and no AI spend',{timeout:60000},async()=>{const f=await fixture(),review=require('../../lib/creative-ai/runtime/review'),prior=review.ocr;review.ocr=async()=>({status:'measured',rows});try{
 for(const job of f.jobs){const proposal=await ocr.analyze(f.runtime,job.id,'continuity','square');assert.equal(proposal.matches.length,2);await assert.rejects(()=>f.runtime.editable.convert(job.id,'continuity','square',{imageUrl:proposal.imageUrl,token:'stale',fieldIds:['headline']}),/stale/);
 const original=await f.runtime.editable.convert(job.id,'continuity','square',{imageUrl:proposal.imageUrl,token:proposal.token,fieldIds:['headline','cta']});assert.equal(original.ocr.apiCostInr,0);assert.equal(original.ocr.preservedText,2);assert.equal(original.document.objects.length,3);assert.equal((await f.runtime.store.read(job.id)).results[0].editable,undefined);
 const resources=await f.runtime.editable.resources(job.id,'continuity','square');assert.ok(resources.fonts.some(a=>a.name==='Georgia'));assert.ok(resources.assets.filter(a=>a.kind==='logo').every(a=>a.brandId===job.intake.brandId));
 const doc=structuredClone(original.document),font=resources.fonts.find(a=>a.name==='Georgia');doc.fonts=[...new Map([...doc.fonts,font].map(a=>[a.id,a])).values()];doc.objects.push({id:'user-new-text',type:'text',role:'supporting-copy',text:'My new words',fontId:font.id,fontSize:28,fill:'#ffffff',align:'left',left:100,top:280,width:300,height:100});
 // The previous immutable-count contract rejected this exact new-text document.
 assert.throws(()=>mod.validateDocument(doc,{...original.original,fonts:doc.fonts}),/Invalid layers/);
 const uploaded=await f.runtime.editable.upload(job.id,'continuity','square',{kind:'image',name:'Client image',data:'data:image/png;base64,'+(await sharp({create:{width:80,height:40,channels:3,background:'#226699'}}).png().toBuffer()).toString('base64')});doc.assets.push(uploaded);doc.objects.push({id:'user-new-image',role:'image',type:'image',assetId:uploaded.id,left:200,top:400,width:100,height:50});
 const saved=await f.runtime.editable.save(job.id,{route:'continuity',placementId:'square',expectedRevision:0,document:doc});assert.equal(saved.revision,1);assert.deepEqual(saved.original,original.original);assert.equal(saved.fontWarnings.length,0);assert.deepEqual((await f.runtime.editable.read(job.id,'continuity','square')).document,doc);
 const cross=structuredClone(doc);cross.assets.at(-1).brandId='brand-other';await assert.rejects(()=>f.runtime.editable.save(job.id,{route:'continuity',placementId:'square',expectedRevision:1,document:cross}),/registered/);
 const rendered=await mod.render(f.runtime,job.id,doc),metadata=await sharp(Buffer.from(rendered.data.split(',')[1],'base64')).metadata();assert.equal(metadata.width,600);assert.equal(metadata.height,600);assert.equal((await f.runtime.store.read(job.id)).budget.imageCalls,0);
 const restored=await f.runtime.editable.save(job.id,{route:'continuity',placementId:'square',expectedRevision:1,document:original.original});assert.equal(restored.revision,2);assert.deepEqual(restored.document,original.original);
 }
 }finally{review.ocr=prior;await f.cleanup();}});
test('production UI: text/image insertion, font selection, undo, reflow, save, compare, reopen and pixel-identical export',{timeout:90000},async()=>{const f=await fixture();let server,browser;try{
 const job=f.jobs[1];await f.runtime.editable.convert(job.id,'continuity','square',{imageUrl:job.results[0].imageUrl});const {createHandler}=require('../../lib/creative-ai/runtime/http'),handler=createHandler({root:f.root});server=require('http').createServer(async(req,res)=>{try{await handler.handle(req,res,new URL(req.url,'http://local').pathname,async(req)=>{let body='';for await(const chunk of req)body+=chunk;return JSON.parse(body||'{}');});}catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}));}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/creative-ai/canvas-model.js');await page.setContent('<meta charset="utf-8"><link rel="stylesheet" href="'+origin+'/creative-ai/editable-canvas.css">');for(const file of ['vendor/fabric.min.js','canvas-model.js'])await page.addScriptTag({url:origin+'/creative-ai/'+file});await page.evaluate(job=>{window.currentJob=job;window.activeBrand=null;window.brandList=[];const Base=fabric.Canvas;fabric.Canvas=class extends Base{constructor(...args){super(...args);window.qaCanvas=this;}};},job);await page.addScriptTag({url:origin+'/creative-ai/editable-canvas.js'});await page.evaluate(async()=>{EditableCanvas.init();await EditableCanvas.open('continuity|square');});
 assert.equal(await page.locator('#ecLayers').isVisible(),false);await page.locator('[data-ec="add-text"]').click();await page.locator('#ecCopy').fill('Your weekend starts here');await chooseSelect(page,page.locator('#ecFont'),{label:'Georgia · 400 normal'});await page.waitForTimeout(150);await page.locator('#ecSize').fill('32');await page.locator('#ecSize').dispatchEvent('change');await page.waitForTimeout(150);await page.locator('[data-ec="save"]').click();await page.waitForFunction(()=>document.querySelector('#ecStatus').textContent==='All changes saved');
 let state=await handler.runtime.editable.read(job.id,'continuity','square');assert.equal(state.document.objects.length,2);assert.equal(state.fontWarnings.length,0);assert.equal(state.document.objects[1].text,'Your weekend starts here');
 const reflow=await page.evaluate(()=>{const t=qaCanvas.getActiveObject(),font=t.fontSize;t.set({width:200});qaCanvas.fire('object:modified',{target:t});return {before:font,after:t.fontSize,scaleX:t.scaleX,width:t.width};});assert.equal(reflow.before,reflow.after);assert.equal(reflow.scaleX,1);assert.equal(reflow.width,200);
 const handle=await page.evaluate(()=>{const t=qaCanvas.getActiveObject();t.setCoords();const box=qaCanvas.upperCanvasEl.getBoundingClientRect();return {x:box.left+t.oCoords.mr.x,y:box.top+t.oCoords.mr.y,font:t.fontSize,width:t.width};});await page.mouse.move(handle.x,handle.y);await page.mouse.down();await page.mouse.move(handle.x+80,handle.y,{steps:8});await page.mouse.up();const resized=await page.evaluate(()=>({font:qaCanvas.getActiveObject().fontSize,width:qaCanvas.getActiveObject().width,scale:qaCanvas.getActiveObject().scaleX}));assert.equal(resized.font,handle.font);assert.equal(resized.scale,1);assert.ok(resized.width>handle.width+50,'Side handle must reflow text without stretching glyphs');

 await page.locator('[data-ec="duplicate"]').click();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>qaCanvas.getObjects().length),3);await page.locator('[data-ec="undo"]').click();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>qaCanvas.getObjects().length),2);await page.locator('[data-ec="redo"]').click();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>qaCanvas.getObjects().length),3);
 await page.locator('[data-panel="uploads"]').click();const chooser=page.waitForEvent('filechooser');await page.locator('[data-ec="add-image"]').click();await (await chooser).setFiles({name:'uploaded.png',mimeType:'image/png',buffer:await sharp({create:{width:80,height:40,channels:3,background:'#447799'}}).png().toBuffer()});await page.waitForFunction(()=>qaCanvas.getObjects().length===4);await page.locator('[data-ec="save"]').click();await page.waitForFunction(()=>document.querySelector('#ecStatus').textContent==='All changes saved');
 await page.locator('.ec-tabs [data-panel=versions]').click();await page.locator('[data-ec="compare"]').first().click();assert.equal(await page.locator('#ecComparison').isVisible(),true);await page.locator('[data-ec="compare"]').first().click();await page.locator('[data-ec="preview"]').click();assert.equal(await page.locator('.ec-tabs').isVisible(),false);await page.locator('[data-ec="preview"]').click();
 await page.screenshot({path:path.join(f.root,'editor-production-qa.png'),fullPage:true});await page.locator('[data-ec="close"]').click();await page.evaluate(()=>EditableCanvas.open('continuity|square'));assert.equal(await page.evaluate(()=>qaCanvas.getObjects().length),4);
 state=await handler.runtime.editable.read(job.id,'continuity','square');const preview=await page.evaluate(()=>{qaCanvas.discardActiveObject();qaCanvas.setZoom(1);qaCanvas.setDimensions({width:600,height:600});return qaCanvas.toDataURL({format:'png'});});assert.equal((await mod.render(handler.runtime,job.id,state.document)).data,preview);
 assert.deepEqual(errors,[]);assert.equal((await handler.runtime.store.read(job.id)).budget.imageCalls,0);
 }finally{await browser?.close();if(server)await new Promise(r=>server.close(r));await f.cleanup();}});
test('resource refresh preserves historical asset variants and revision restoration',{timeout:30000},async()=>{const f=await fixture();try{const job=f.jobs[0],state=await f.runtime.editable.convert(job.id,'continuity','square',{imageUrl:job.results[0].imageUrl});const alternative={...state.original.assets[0],name:'Later photograph',url:'/creative-ai/api/jobs/'+job.id+'/files/photo-later.png'};await f.runtime.editable.registerAsset(job.id,'continuity','square',alternative);await f.runtime.editable.resources(job.id,'continuity','square');const refreshed=await f.runtime.editable.read(job.id,'continuity','square');assert.equal(refreshed.assetRegistry.filter(a=>a.id==='photograph').length,2);const saved=await f.runtime.editable.save(job.id,{route:'continuity',placementId:'square',expectedRevision:0,document:state.original});assert.equal(saved.revision,1);assert.deepEqual(saved.document,state.original);}finally{await f.cleanup();}});
test('font upload derives real family, weight and italic style without brand-approval flags',async()=>{const f=await fixture();try{const job=f.jobs[0];await f.runtime.editable.convert(job.id,'continuity','square',{imageUrl:job.results[0].imageUrl});const font=await f.runtime.editable.upload(job.id,'continuity','square',{kind:'font',data:'data:font/ttf;base64,'+(await fs.readFile('/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf')).toString('base64')});assert.equal(font.name,'Arial');assert.equal(font.weight,700);assert.equal(font.style,'italic');assert.equal(font.approved,undefined);assert.equal(font.scope,'job');}finally{await f.cleanup();}});

test('Edit automatically prepares copy for both brands and reopens saved edits without extraction choices',{timeout:90000},async()=>{
 const f=await fixture(),review=require('../../lib/creative-ai/runtime/review'),prior=review.ocr;let server,browser,scans=0;
 review.ocr=async()=>{scans++;return {status:'measured',rows};};
 try{
  const {createHandler}=require('../../lib/creative-ai/runtime/http'),handler=createHandler({root:f.root});
  server=require('http').createServer(async(req,res)=>{try{await handler.handle(req,res,new URL(req.url,'http://local').pathname,async req=>{let body='';for await(const chunk of req)body+=chunk;return JSON.parse(body||'{}');});}catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}));}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
  for(const job of f.jobs){
   const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/creative-ai/canvas-model.js');await page.setContent('<meta charset="utf-8"><link rel="stylesheet" href="'+origin+'/creative-ai/editable-canvas.css">');
   for(const file of ['vendor/fabric.min.js','canvas-model.js'])await page.addScriptTag({url:origin+'/creative-ai/'+file});
   await page.evaluate(job=>{window.currentJob=job;window.activeBrand=null;window.brandList=[];const Base=fabric.Canvas;fabric.Canvas=class extends Base{constructor(...args){super(...args);window.qaCanvas=this;}};},job);
   await page.addScriptTag({url:origin+'/creative-ai/editable-canvas.js'});
   await page.evaluate(async()=>{EditableCanvas.init();await EditableCanvas.open('continuity|square');});
   assert.equal(await page.locator('#ecCanvas').count(),1,'Edit must open the editor without a separate extraction choice');
   assert.equal(await page.locator('#ocrScan,#ocrConvert,[data-ocr-field]').count(),0);
   const prepared=await handler.runtime.editable.read(job.id,'continuity','square');
   assert.deepEqual(prepared.ocr.selectedFieldIds,['headline','cta']);assert.equal(prepared.ocr.preservedText,2);
   assert.equal(prepared.document.objects.length,3);assert.equal(prepared.ocr.apiCostInr,0);
   await page.locator('#ecCopy').fill('A saved client edit');await page.locator('[data-ec="save"]').click();
   await page.waitForFunction(()=>document.querySelector('#ecStatus').textContent==='All changes saved');
   const count=scans;await page.locator('[data-ec="close"]').click();await page.evaluate(()=>EditableCanvas.open('continuity|square'));
   assert.equal(scans,count,'Reopening must reuse saved layers');assert.equal(await page.locator('#ecCopy').inputValue(),'A saved client edit');
   assert.deepEqual((await handler.runtime.editable.read(job.id,'continuity','square')).original,prepared.original);
   assert.equal((await handler.runtime.store.read(job.id)).budget.imageCalls,0);assert.deepEqual(errors,[]);await page.close();
  }
 }finally{review.ocr=prior;await browser?.close();if(server)await new Promise(r=>server.close(r));await f.cleanup();}
});

test('automatic Edit handles unavailable text, empty matches, retry and closing during preparation',{timeout:90000},async()=>{
 const review=require('../../lib/creative-ai/runtime/review'),prior=review.ocr;
 const browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 try{for(const mode of ['unavailable','empty','retry','cancel']){
  const f=await fixture();let server,release;review.ocr=async()=>mode==='unavailable'?{status:'unavailable',rows:[]}:{status:'measured',rows:mode==='empty'?[]:rows};
  try{
   const handler=require('../../lib/creative-ai/runtime/http').createHandler({root:f.root});
   server=require('http').createServer(async(req,res)=>{try{await handler.handle(req,res,new URL(req.url,'http://local').pathname,async req=>{let body='';for await(const chunk of req)body+=chunk;return JSON.parse(body||'{}');});}catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}));}});
   await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,job=f.jobs[0],page=await browser.newPage({viewport:{width:1440,height:960}});let converts=0;
   page.on('request',req=>{if(req.url().endsWith('/convert'))converts++;});
   await page.goto(origin+'/creative-ai/canvas-model.js');await page.setContent('<meta charset="utf-8">');
   for(const file of ['vendor/fabric.min.js','canvas-model.js'])await page.addScriptTag({url:origin+'/creative-ai/'+file});
   await page.evaluate(job=>{window.currentJob=job;window.activeBrand=null;window.brandList=[];},job);await page.addScriptTag({url:origin+'/creative-ai/editable-canvas.js'});
   if(mode==='retry')await page.route('**/convert',route=>route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'Text proposal is stale'})}),{times:1});
   if(mode==='cancel'){const gate=new Promise(r=>release=r);await page.route('**/scan',async route=>{await gate;await route.continue();});}
   await page.evaluate(()=>{EditableCanvas.init();window.opening=EditableCanvas.open('continuity|square');});
   if(mode==='cancel'){
    await page.locator('#ecPreparingClose').click();release();await page.evaluate(()=>window.opening);
    assert.equal(converts,0);assert.equal(await page.locator('dialog[open]').count(),0);
    await assert.rejects(()=>handler.runtime.editable.read(job.id,'continuity','square'),/ENOENT/);
   }else{
    await page.evaluate(()=>window.opening);
    if(mode==='retry'){
     assert.equal(await page.locator('#ecPreparingRetry').isVisible(),true);assert.match(await page.locator('#ecPreparingStatus').textContent(),/Retry opening the latest version/);
     await assert.rejects(()=>handler.runtime.editable.read(job.id,'continuity','square'),/ENOENT/);
     await page.locator('#ecPreparingRetry').click();await page.waitForSelector('#ecCanvas');
    }else{
     assert.equal(await page.locator('#ecCanvas').count(),1);const saved=await handler.runtime.editable.read(job.id,'continuity','square');
     assert.equal(saved.document.objects.length,1);assert.match(await page.locator('.ec-canvas-footer').textContent(),/Some text remains/);
    }
   }
   assert.equal((await handler.runtime.store.read(job.id)).budget.imageCalls,0);await page.close();
  }finally{release?.();if(server)await new Promise(r=>server.close(r));await f.cleanup();}
 }}finally{review.ocr=prior;await browser.close();}
});
