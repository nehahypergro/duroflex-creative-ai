'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),{promisify}=require('node:util'),exec=promisify(require('node:child_process').execFile);
const {BrandStore,pdfTools,documentFormat}=require('../../lib/creative-ai/runtime/brands');
async function fixture(root){await fs.mkdir(root+'/scripts/creative-ai',{recursive:true});await fs.copyFile(path.resolve('scripts/creative-ai/extract-brand-pdf.py'),root+'/scripts/creative-ai/extract-brand-pdf.py');const file=root+'/synthetic.pdf';await exec((await pdfTools()).python,['-c',"from reportlab.pdfgen import canvas\nimport sys\nc=canvas.Canvas(sys.argv[1],pagesize=(240,240));c.drawString(20,200,'Synthetic own brand guidance');c.showPage();c.showPage();c.save()",file]);return file;}
test('native PDF guidance preserves source bytes, page order, unknown text, visual references and brand isolation',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'brand-pdf-'));try{
  const store=new BrandStore(root),a=await store.create({name:'Synthetic A',brandUrl:'https://example.com/'}),b=await store.create({name:'Synthetic B',brandUrl:'https://example.org/'}),file=await fixture(root);
  await store.update(a.id,b=>{b.profile={ownDirection:'Retain this configuration'};b.researchIds=['own-old-research'];b.latestResearchId='own-old-research';});const old=await store.context(a.id),other=await store.read(b.id);
  const [doc,duplicate]=await Promise.all([store.ingest(a.id,file,{name:'Own book.pdf',kind:'visual',draft:true}),store.ingest(a.id,file,{name:'Own book.pdf',kind:'visual',draft:true})]);
  assert.equal(doc.id,duplicate.id);assert.equal(doc.format,'pdf');assert.equal(doc.pageCount,2);assert.equal(doc.nativeTextPages,1);assert.equal(doc.visuals.length,2);
  const bytes=await fs.readFile(file);assert.deepEqual(await fs.readFile(store.dir(a.id)+'/sources/'+doc.id+'.pdf'),bytes);assert.equal(doc.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
  const indexed=await store.document(a.id,doc.id);assert.deepEqual(indexed.slides.map(s=>s.page),[1,2]);assert.match(indexed.slides[0].text,/Synthetic own brand/);assert.equal(indexed.slides[1].text,'');assert.match(indexed.slides[1].textNote,/no wording or guidance was inferred/i);
  const context=await store.context(a.id);assert.notEqual(context.revision,old.revision);assert.equal(context.assets.length,2);assert.match(context.pages[0].text,/PAGE 2/);assert.match(context.pages[0].text,/no wording or guidance was inferred/i);assert.match(context.assets[0].label,/page 1/);assert.ok(context.assets.every(v=>v.sourceIds[0]===doc.id));
  const saved=await store.read(a.id);assert.deepEqual(saved.profile,{ownDirection:'Retain this configuration'});assert.deepEqual(saved.researchIds,['own-old-research']);assert.equal(saved.latestResearchId,null);assert.deepEqual(await store.read(b.id),other);await assert.rejects(store.document(b.id,doc.id),/not found/);
  for(const v of doc.visuals){const image=await fs.readFile(store.dir(a.id)+'/sources/'+doc.id+'-slide-'+v.slide+'.jpg');assert.equal(image.subarray(0,2).toString('hex'),'ffd8');}
  await assert.rejects(store.ingest(a.id,file,{name:'masquerade.pptx'}),/signature/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('PDF HTTP upload and original download use the correct type and stay inside the selected brand',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'brand-pdf-http-'));let server;try{
  const file=await fixture(root),http=require('node:http'),handler=require('../../lib/creative-ai/runtime/http').createHandler({root});const a=await handler.runtime.brands.create({name:'Synthetic A',brandUrl:'https://example.com/'}),b=await handler.runtime.brands.create({name:'Synthetic B',brandUrl:'https://example.org/'});
  server=http.createServer((req,res)=>handler.handle(req,res,new URL(req.url,'http://localhost').pathname,()=>{throw Error('No JSON request expected');}));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,route=base+'/creative-ai/api/brands/'+a.id+'/documents',bytes=await fs.readFile(file);
  const response=await fetch(route,{method:'POST',headers:{'Content-Type':'application/pdf','X-File-Name':encodeURIComponent('Own book.pdf')},body:bytes});assert.equal(response.status,201);const doc=await response.json();const original=await fetch(route+'/'+doc.id+'/original');assert.equal(original.status,200);assert.equal(original.headers.get('content-type'),'application/pdf');assert.match(original.headers.get('content-disposition'),/\.pdf$/);assert.equal(original.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(Buffer.from(await original.arrayBuffer()),bytes);
  const page=await fetch(route+'/'+doc.id+'/slide-2.jpg');assert.equal(page.status,200);assert.equal(page.headers.get('content-type'),'image/jpeg');assert.equal((await fetch(base+'/creative-ai/api/brands/'+b.id+'/documents/'+doc.id+'/original')).status,400);
  assert.equal((await fetch(route,{method:'POST',headers:{'Content-Type':'text/plain','X-File-Name':'wrong.pdf'},body:bytes})).status,400);
  assert.equal((await fetch(route,{method:'POST',headers:{'X-File-Name':encodeURIComponent('../escape.pdf')},body:bytes})).status,400);
  await assert.rejects(handler.runtime.brands.upload(a.id,{headers:{'x-file-name':'large.pdf','content-length':String(512*1024*1024+1)}}),/512MB/);
 }finally{if(server)await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});}
});
test('document filename validation rejects header control characters and unsupported extensions',()=>{
 for(const name of ['../book.pdf','folder\\book.pdf','book.pdf\r\nX-Header: value','book.exe','x'.repeat(180)+'.pdf'])assert.throws(()=>documentFormat(name));
 assert.equal(documentFormat('Own Brand Book.PDF'),'pdf');assert.equal(documentFormat('Own guide.pptx'),'pptx');assert.equal(documentFormat('Own guide.txt'),'txt');assert.equal(documentFormat('Own guide.docx'),'docx');
});
