'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path');
const {fixture,mod}=require('./editor-qa-fixture.cjs');
async function harness(){const f=await fixture();const {createHandler}=require('../../lib/creative-ai/runtime/http'),handler=createHandler({root:f.root});const server=require('http').createServer(async(req,res)=>{try{const handled=await handler.handle(req,res,new URL(req.url,'http://local').pathname,async req=>{let body='';for await(const p of req)body+=p;return JSON.parse(body||'{}');});if(!handled&&!res.writableEnded){res.writeHead(404);res.end('Not found');}}catch(e){res.writeHead(e.status||500);res.end(JSON.stringify({error:e.message}));}});await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});const origin='http://127.0.0.1:'+server.address().port,browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 for(const job of f.jobs){const initial=await handler.runtime.editable.convert(job.id,'continuity','square',{imageUrl:job.results[0].imageUrl});const d=structuredClone(initial.document);d.objects.push({id:'user-headline',type:'text',role:'headline',text:'Rest your way',fontId:d.fonts[0].id,fontSize:32,fill:'#ffffff',align:'left',left:80,top:80,width:400,height:120});await handler.runtime.editable.save(job.id,{route:'continuity',placementId:'square',expectedRevision:0,document:d});}
 const open=async(job=f.jobs[0])=>{const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/creative-ai/canvas-model.js');await page.setContent('<meta charset="utf-8"><link rel="stylesheet" href="'+origin+'/creative-ai/editable-canvas.css">');await page.addStyleTag({path:path.resolve(__dirname,'../../public/creative-ai/studio.css')});for(const file of ['vendor/fabric.min.js','canvas-model.js'])await page.addScriptTag({url:origin+'/creative-ai/'+file});await page.evaluate(job=>{window.currentJob=job;window.activeBrand=null;window.brandList=[];const Base=fabric.Canvas;fabric.Canvas=class extends Base{constructor(...args){super(...args);window.qaCanvas=this;}};},job);if(process.env.POLISH_BASELINE)await page.route('**/editable-canvas.js',r=>r.fulfill({path:'work/review-polish-20261031/editor-before.js',contentType:'application/javascript'}));await page.addScriptTag({url:origin+'/creative-ai/editable-canvas.js'});await page.evaluate(()=>EditableCanvas.init());return {page,errors};};
 return {...f,handler,browser,origin,open,cleanup:async()=>{await browser.close();await new Promise(r=>server.close(r));await f.cleanup();}};}

test('Editor acknowledges loading, cancels stale opens, and recovers a failed request for both brands',{timeout:60000},async()=>{
 const f=await harness();try{for(const job of f.jobs){const {page,errors}=await f.open(job);try{
  const endpoint='**/editable/continuity/square';let release,entered;
  const waiting=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
  await page.route(endpoint,async route=>{entered();await gate;await route.continue();});
  await page.evaluate(()=>{window.openDone=EditableCanvas.open('continuity|square');});await waiting;
  try{await page.locator('.ec-opening').waitFor({state:'visible',timeout:3000});}catch(error){release();throw error;}
  assert.match(await page.locator('.ec-opening').innerText(),/Opening your design/);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();release();await page.evaluate(()=>openDone);
  assert.equal(await page.locator('#editableDialog').evaluate(el=>el.open),false,'late response must not reopen cancelled editor');
  await page.unroute(endpoint);await page.route(endpoint,route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Service temporarily unavailable'})}));
  await page.evaluate(()=>{window.openDone=EditableCanvas.open('continuity|square',{backLabel:'Back to artwork'}).catch(()=>{});});
  await page.getByRole('heading',{name:'Couldn’t open this design'}).waitFor();await page.evaluate(()=>openDone);
  await page.unroute(endpoint);
  await page.evaluate(()=>{const mount=CreativeCanvasModel.mount;window.mountGate=new Promise(r=>window.releaseMount=r);CreativeCanvasModel.mount=async(...args)=>{await mountGate;return mount(...args);};});
  await page.getByRole('button',{name:'Retry',exact:true}).click();
  await page.locator('.ec-loading:not([hidden])').waitFor();assert.equal(await page.locator('.ec-stage').getAttribute('aria-busy'),'true');
  assert.equal(await page.locator('.ec-side').evaluate(el=>el.inert),true);
  assert.equal(await page.locator('.ec-header').evaluate(el=>el.inert),true);
  await page.screenshot({path:'work/review-polish-20261031/editor-loading-'+job.intake.brandId+'.png'});
  await page.evaluate(()=>releaseMount());await page.locator('.ec-stage[aria-busy=false]').waitFor();
  assert.equal(await page.locator('.ec-loading').isVisible(),false);assert.equal(await page.locator('.ec-side').evaluate(el=>el.inert),false);
  await page.getByRole('button',{name:'Back to artwork',exact:true}).click();assert.equal(await page.locator('#editableDialog').evaluate(el=>el.open),false);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}}}finally{await f.cleanup();}
});
