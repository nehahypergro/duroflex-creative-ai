'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'../..');
test('studio loaders: both brands, lifecycle, reduced motion and safe decorative failure',{timeout:60000},async()=>{
 const assets=['studio.css','studio-motion.css','studio-motion.js','vendor/lottie.min.js'],requests=[];
 const server=http.createServer(async(req,res)=>{requests.push(req.url);try{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/studio.css"><link rel="stylesheet" href="/studio-motion.css"><body><main id="fixture"><div class="loading-state" role="status">Opening your workspace…</div></main><script src="/vendor/lottie.min.js"></script><script src="/studio-motion.js"></script>');return;}const file=req.url.slice(1);if(!assets.includes(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(await fs.readFile(path.join(root,'public/creative-ai',file)));}catch(e){res.writeHead(500);res.end(e.message);}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});const page=await browser.newPage({viewport:{width:1100,height:680}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('.studio-motion-screen svg');
 for(const brand of ['Duroflex','Sleepyhead']){
  await page.evaluate(brand=>{document.querySelector('#fixture').innerHTML='<div class="loading-state" role="status">Opening '+brand+'…</div>';},brand);await page.waitForSelector('.studio-motion-screen svg');assert.equal(await page.locator('[role=status]').innerText(),'Opening '+brand+'…');assert.equal(await page.locator('[data-studio-motion-host=bloom]').count(),1);assert.equal(await page.locator('.studio-motion').getAttribute('aria-hidden'),'true');assert.equal(await page.evaluate(()=>lottie.getRegisteredAnimations().length),1);
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<section class="surface progress-main"><span class="progress-orbit running"><svg class="icon"></svg></span><h2>Waiting to start</h2><p>Your saved status stays visible.</p></section>';});await page.waitForSelector('.studio-motion-canvas svg');assert.equal(await page.locator('h2').innerText(),'Waiting to start');assert.equal(await page.locator('[data-studio-motion-host=canvas]').count(),1);assert.equal(await page.evaluate(()=>lottie.getRegisteredAnimations().length),1);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>{const a=lottie.getRegisteredAnimations()[0];return a.isPaused&&Math.round(a.currentFrame)===95;});
  await page.evaluate(()=>{document.querySelector('.progress-orbit').classList.remove('running');document.querySelector('h2').textContent='Creation needs attention';});await page.waitForFunction(()=>lottie.getRegisteredAnimations().length===0);assert.equal(await page.locator('[data-studio-motion-host]').count(),0);assert.equal(await page.locator('h2').innerText(),'Creation needs attention');assert.notEqual(await page.locator('.progress-orbit>.icon').evaluate(e=>getComputedStyle(e).display),'none');
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<div class="loading-state" role="status">Loading saved work…</div>';});await page.waitForFunction(()=>{const a=lottie.getRegisteredAnimations()[0];return a?.isPaused&&Math.round(a.currentFrame)===34;});await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!lottie.getRegisteredAnimations()[0].isPaused);
 }

 await page.evaluate(() => {document.querySelector('#fixture').innerHTML='<button id="feedback"><svg></svg>Saved</button>';});
 for(const kind of ['favourite','saved','download','stage']) {
   assert.equal(await page.evaluate(kind => {const el=document.querySelector('#feedback');CreativeAIFeedback.play(el,kind);return el.getAnimations({subtree:true}).length;},kind),1);
   await page.waitForTimeout(330);
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.evaluate(() => {const el=document.querySelector('#feedback');CreativeAIFeedback.play(el,'saved');return el.getAnimations({subtree:true}).length;}),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(let n=0;n<8;n++){await page.evaluate(n=>{document.querySelector('#fixture').innerHTML='<div class="loading-state">Loading '+n+'…</div>';},n);await page.waitForSelector('.studio-motion-ready');assert.equal(await page.evaluate(()=>lottie.getRegisteredAnimations().length),1);}
 await page.evaluate(()=>{lottie.loadAnimation=()=>{throw Error('Simulated renderer unavailable');};document.querySelector('#fixture').innerHTML='<div class="loading-state" role="status">Loading recorded usage…</div>';});await page.waitForFunction(()=>document.querySelector('.loading-state').dataset.studioMotionFailed==='true');assert.equal(await page.locator('[role=status]').innerText(),'Loading recorded usage…');assert.equal(await page.evaluate(()=>lottie.getRegisteredAnimations().length),0);assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url==='/'||url==='/favicon.ico'||assets.includes(url.slice(1))),'Loaders must never call a production or external endpoint');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
