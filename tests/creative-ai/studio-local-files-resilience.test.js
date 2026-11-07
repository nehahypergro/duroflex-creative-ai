'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
test('both brands: PDF removal releases unowned blobs, keeps duplicate owners and downloads intact',{timeout:60000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview();let browser;
 try{
  browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
  const page=await browser.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const brand of f.brands){
   await page.goto(f.url+'?brand='+brand.id);await page.locator('.creation-hero').waitFor();
   const info=await page.evaluate(async brandId=>{
    window.StudioDocuments={enabled:false,status:()=>null,enqueue(){}};
    window.readBlob=key=>new Promise((resolve,reject)=>{const r=indexedDB.open('studio-ui-reference-files',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('files'),get=tx.objectStore('files').get(key);get.onsuccess=()=>resolve(!!get.result);tx.oncomplete=()=>db.close();};r.onerror=reject;});
    const store=StudioModel.storage(localStorage),d=StudioModel.startDraft(brandId,'quick',1);d.focus='brand';d.brief='Preserve this brief';
    const key=brandId+':'+d.id+':brief-document';d.briefDocument={name:'original.pdf',bytes:18,key,status:'not-extracted'};store.save(d);
    const copy={...structuredClone(d),id:StudioModel.uid(),revision:0};store.save(copy);
    await new Promise((resolve,reject)=>{const r=indexedDB.open('studio-ui-reference-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>{const db=r.result,tx=db.transaction('files','readwrite');tx.objectStore('files').put(new File(['%PDF-1.4\nfixture\n'], 'original.pdf',{type:'application/pdf'}),key);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=reject;};r.onerror=reject;});
    location.hash='brief/'+d.id;return {id:d.id,copy:copy.id,key};
   },brand.id);
   const download=page.waitForEvent('download',{timeout:12000});download.catch(()=>{});await page.locator('[data-action=brief-pdf-download]').click().catch(async e=>{throw Error(e.message+'; text='+await page.locator('main').innerText());});const file=await download.catch(async e=>{throw Error(e.message+'; toast='+await page.locator('#toast').innerText()+'; errors='+JSON.stringify(errors)+'; blob='+await page.evaluate(key=>readBlob(key),info.key));});assert.equal(await fs.readFile(await file.path(),'utf8'),'%PDF-1.4\nfixture\n');
   await page.locator('[data-action=brief-pdf-remove]').click();await page.waitForFunction(()=>!document.querySelector('[data-action=brief-pdf-remove]'));assert.equal(await page.evaluate(key=>readBlob(key),info.key),true,'duplicate still owns original');assert.equal(await page.locator('#field-brief').inputValue(),'Preserve this brief');
   await page.evaluate(id=>location.hash='brief/'+id,info.copy);await page.locator('[data-action=brief-pdf-remove]').click();await page.waitForFunction(async key=>!await readBlob(key),info.key);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>f.server.close(r));}
});
