'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises');
test('reference text toolbar edits, undo and saved font variants remain scoped',{timeout:60000},async()=>{
 const f=await require('./editor-qa-fixture.cjs').fixture();let server,browser;
 try{
  const job=f.jobs[0],brandId=job.intake.brandId;
  for(const [file,weight,style]of [['Arial Bold.ttf',700,'normal'],['Arial Italic.ttf',400,'italic'],['Arial Bold Italic.ttf',700,'italic']])await require('../../lib/creative-ai/runtime/editable').uploadAsset(f.runtime,brandId,{kind:'font',name:'Fixture font',sourceReference:'Offline test',approved:true,weight,style,data:'data:font/ttf;base64,'+(await fs.readFile('/System/Library/Fonts/Supplemental/'+file)).toString('base64')});
  const handler=require('../../lib/creative-ai/runtime/http').createHandler({root:f.root});
  server=http.createServer(async(req,res)=>{try{await handler.handle(req,res,new URL(req.url,'http://local').pathname,async req=>{let t='';for await(const c of req)t+=c;return JSON.parse(t||'{}');});}catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}));}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  await handler.runtime.editable.convert(job.id,'continuity','square',{imageUrl:job.results[0].imageUrl});
  browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});const p=await browser.newPage({viewport:{width:1384,height:850}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(5000);
  await p.goto(origin+'/creative-ai/canvas-model.js');await p.setContent('<link rel="stylesheet" href="'+origin+'/creative-ai/editable-canvas.css"><link rel="stylesheet" href="'+origin+'/creative-ai/studio.css">');for(const file of ['vendor/fabric.min.js','canvas-model.js','editable-canvas.js'])await p.addScriptTag({url:origin+'/creative-ai/'+file});
  await p.evaluate(async job=>{window.currentJob=job;window.activeBrand=null;window.brandList=[];EditableCanvas.init();await EditableCanvas.open('continuity|square');},job);
  assert.equal(await p.locator('.ec-tabs [data-panel=design]').count(),0);await p.locator('.ec-tabs [data-panel=elements]').click();await p.locator('[data-ec=add-text]').click();await p.waitForFunction(()=>document.querySelector('#ecCopy').value==='Your text'&&document.querySelector('.ec-stage').getAttribute('aria-busy')!=='true');assert.equal(await p.locator('#ecCopy').isVisible(),false);const bounds=await p.locator('.upper-canvas').boundingBox();await p.mouse.dblclick(bounds.x+bounds.width*.15+10,bounds.y+bounds.height*.25+8);await p.keyboard.press('ControlOrMeta+A');await p.keyboard.insertText('First line\nSecond line');await p.keyboard.press('Escape');await p.locator('.ec-title').click();
  const size=Number(await p.locator('#ecSize').inputValue());await p.getByRole('button',{name:'Increase font size',exact:true}).click();await p.waitForFunction(n=>Number(document.querySelector('#ecSize').value)===n,size+1);await p.getByRole('button',{name:'Decrease font size',exact:true}).click();await p.waitForFunction(n=>Number(document.querySelector('#ecSize').value)===n,size);
  for(const name of ['Bold','Italic']){await p.getByRole('button',{name,exact:true}).click();await p.waitForFunction(name=>document.querySelector('[aria-label="'+name+'"]').getAttribute('aria-pressed')==='true',name);}
  await p.locator('[data-ec=text-align]').click();await p.waitForFunction(()=>document.querySelector('#ecAlign').value==='center');
  await p.getByRole('button',{name:'Bulleted list',exact:true}).click();await p.waitForFunction(()=>document.querySelector('#ecCopy').value==='• First line\n• Second line');await p.getByRole('button',{name:'Undo',exact:true}).click();await p.waitForFunction(()=>document.querySelector('#ecCopy').value==='First line\nSecond line');await p.getByRole('button',{name:'Redo',exact:true}).click();await p.waitForFunction(()=>document.querySelector('#ecCopy').value==='• First line\n• Second line');
  await p.getByRole('button',{name:'Text spacing',exact:true}).click();assert.ok(await p.locator('#ecLine').isVisible());await p.locator('#ecLine').fill('1.5');await p.locator('#ecLine').dispatchEvent('change');await p.locator('.ec-title').click();
  await p.locator('[data-ec=save]').click();await p.waitForFunction(()=>document.querySelector('#ecStatus').textContent==='All changes saved');
  const saved=await handler.runtime.editable.read(job.id,'continuity','square'),o=saved.document.objects.find(o=>o.text==='• First line\n• Second line'),font=saved.document.fonts.find(f=>f.id===o.fontId);
  assert.equal(font.weight,700);assert.equal(font.style,'italic');assert.equal(font.brandId,brandId);assert.equal(o.align,'center');assert.equal(o.fontSize,size);assert.equal(o.lineHeight,1.5);
  assert.match(await p.locator('#ecSinglePage').innerText(),/Page 1 of 1/);
  assert.ok(await p.locator('#ecPageThumbnail').evaluate(c=>c.getContext('2d').getImageData(80,45,1,1).data[3]>0),'Thumbnail shows the current canvas');
  await p.locator('[data-ec=page-fit]').click();
  await p.evaluate(()=>{document.querySelector('.ec-shell').insertAdjacentHTML('beforeend','<section class="collection-pages"><div class="collection-heading"><strong>Saved set</strong><span>Page 1 of 2</span></div><nav class="collection-page-strip"><a class="collection-page" aria-current="page" href="#page-one">1</a><a class="collection-page" href="#page-two">2</a></nav></section>');EditableCanvas.syncCollectionNavigation();EditableCanvas.syncCollectionNavigation();});
  assert.equal(await p.locator('#ecPageDock .collection-pages').count(),1);assert.equal(await p.locator('#ecSinglePage').isVisible(),false);assert.equal(await p.locator('#ecPageDock a').nth(1).getAttribute('href'),'#page-two');
  await p.evaluate(()=>{document.querySelector('.collection-pages').remove();document.querySelector('#ecSinglePage').hidden=false;});
  await p.screenshot({path:'/private/tmp/duroflex-editor-reference-toolbar.png'});
  await p.setViewportSize({width:390,height:844});assert.equal(await p.locator('#editableDialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
  assert.deepEqual(errors,[]);assert.equal((await handler.runtime.store.read(job.id)).budget.imageCalls,0);
 }finally{await browser?.close();server?.closeAllConnections();if(server)await new Promise(r=>server.close(r));await f.cleanup();}
});
