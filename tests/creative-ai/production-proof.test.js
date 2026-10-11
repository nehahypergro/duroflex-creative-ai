'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs/promises'),path=require('path'),crypto=require('crypto');
const sharp=require('sharp'),{PDFDocument,PDFName,PDFNumber}=require('pdf-lib');
const root=path.resolve(__dirname,'../..'),print=require('../../lib/creative-ai/runtime/print-production');
const physical=require('../../lib/creative-ai/runtime/physical-proof');
const preflight=require('../../lib/creative-ai/runtime/production-preflight');
const formats=require('../../lib/creative-ai/runtime/output-formats');
const placements=require('../../lib/creative-ai/runtime/placements');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function temporary(fn){await fs.mkdir(path.join(root,'work'),{recursive:true});const dir=await fs.mkdtemp(path.join(root,'work/production-test-'));try{return await fn(dir);}finally{await fs.rm(dir,{recursive:true,force:true});}}
const contract=()=>({operatorName:'Synthetic operator fixture',specReference:'Fixture specification, not real approval',stock:'Fixture paper',finishing:'Fixture trim',fileAcceptance:'rgb-raster-pdf',requiredPpi:200,largePageUserUnitAccepted:false,completePhysicalProof:true,printedAtActualSize:true,measuredRulerMm:50,readability:'pass',distanceM:1,dwellSeconds:10,stockColourFinishing:'pass',templateMatch:'pass',checkedBy:'Synthetic test observer',evidenceReference:'Test-only evidence'});
async function artwork(dir,id='custom:studio-print-leaflet-a5',legacy=false){
 const {selections}=placements.resolve({brandUrl:'https://example.com',brief:'Synthetic production test',placementIds:[id]});
 const results=[];
 for(const s of selections){if(legacy)delete s.description.print.proofWorkflowVersion;
  const bytes=await sharp({create:{width:1500,height:2100,channels:3,background:'#d5cbbf'}}).png().toBuffer(),name='static-continuity-'+s.id+'-0.png';
  await fs.writeFile(path.join(dir,name),bytes);
  await fs.writeFile(path.join(dir,'export-proof-continuity-'+s.id+'-0.json'),JSON.stringify({exportHash:hash(bytes),sourceMeasurement:{width:1500,height:2100}}));
  results.push({conceptId:'fixture',route:'continuity',placementId:s.id,imageUrl:'/files/'+name,ready:true});
 }
 const group={id,name:'Synthetic proof',route:'continuity',conceptId:'fixture',selections};
 const master=await print.bundle({results},group,dir),proof=await physical.create({results},group,dir,master.report);
 return {selections,results,group,master,proof};
}
test('all 43 physical formats get explicit full or partial coverage; full tiles cover all edges with overlap',()=>{
 for(const f of formats.presets.filter(f=>f.kind==='print')){const s=print.specFor(f),{width:w,height:h}=s.geometry.artboard,p=physical.plan(w,h);
  assert.equal(p.windows.length,p.coverage==='full-artboard-tiled'?p.cols*p.rows:3,f.name);
  for(const c of p.windows){assert.ok(c.x>=0&&c.y>=0&&c.width<=190&&c.height<=235);assert.ok(c.x+c.width<=w+1e-6&&c.y+c.height<=h+1e-6);}
  if(p.coverage==='full-artboard-tiled'){assert.equal(p.windows[0].x,0);assert.equal(p.windows[0].y,0);const last=p.windows.at(-1);assert.ok(Math.abs(last.x+last.width-w)<1e-6);assert.ok(Math.abs(last.y+last.height-h)<1e-6);if(p.cols>1)assert.equal(p.windows[0].x+p.windows[0].width-p.windows[1].x,5);}
 }
 assert.equal(physical.plan(190,235).windows.length,1);assert.equal(physical.plan(191,235).windows.length,2);assert.equal(physical.plan(6006,3006).coverage,'partial-actual-size-samples');
});
test('A4 packet binds every delivered face, preserves 1:1 pixel scale and covers final raster edges',()=>temporary(async dir=>{
 const f=await artwork(dir),pdf=await PDFDocument.load(f.proof.bytes),r=f.proof.report;
 assert.equal(r.masterPdfHash,f.master.report.pdfHash);assert.equal(r.proofHash,hash(f.proof.bytes));assert.equal(r.fullCoverage,true);assert.equal(r.physicalCheckPerformed,false);assert.equal(pdf.getPageCount(),4);
 for(const p of pdf.getPages()){assert.ok(Math.abs(p.getWidth()*25.4/72-210)<1e-6);assert.ok(Math.abs(p.getHeight()*25.4/72-297)<1e-6);}
 for(const item of r.pages){const crop=item.cropPages[0],s=f.selections.find(s=>s.id===item.placementId).description.print;assert.equal(crop.pixelCrop.left+crop.pixelCrop.width,1500);assert.equal(crop.pixelCrop.top+crop.pixelCrop.height,2100);assert.equal(crop.physicalWidthMm,crop.pixelCrop.width*s.geometry.artboard.width/1500);assert.equal(crop.scale,1);}
 assert.ok(pdf.getPages().every(p=>p.node.Resources().lookup(PDFName.of('XObject'))));
}));
test('oversized masters use physical UserUnit without overstating source PPI and only offer partial samples',()=>temporary(async dir=>{
 const id=formats.presets.find(f=>/Hoarding/.test(f.name)).id,f=await artwork(dir,id),pdf=await PDFDocument.load(f.master.pdfBytes),page=pdf.getPages()[0],unit=page.node.lookup(PDFName.of('UserUnit'),PDFNumber).asNumber(),p=f.master.report.pages[0];
 assert.equal(unit,10);assert.ok(page.getWidth()<14400);assert.ok(Math.abs(page.getTrimBox().width*unit*25.4/72-p.geometry.trim.width)<.001);assert.ok(p.effectiveArtworkPpi<10);assert.equal(f.proof.report.fullCoverage,false);assert.equal(f.proof.report.pages[0].cropPages.length,3);assert.ok(f.proof.report.pages[0].fullTileCount>12);
 const report=await preflight.inspect(f.master.report,f.proof.report,f.master.pdfBytes);assert.equal(report.status,'blocked');assert.ok(report.checks.some(c=>c.id.endsWith('large-page-support')&&c.status==='pending'));
}));
test('preflight separates observed attestations from release and blocks low detail, scale, colour and template failures',()=>temporary(async dir=>{
 const f=await artwork(dir),c=contract();
 let r=await preflight.inspect(f.master.report,f.proof.report,f.master.pdfBytes,c);assert.equal(r.status,'recorded-checks-complete');assert.equal(r.productionReady,false);assert.match(r.approvalBasis,/not independently authenticated/);
 for(const override of [{requiredPpi:300},{printedAtActualSize:false},{measuredRulerMm:48},{fileAcceptance:'cmyk-pdfx-vector'},{readability:'fail'},{templateMatch:'fail'},{stockColourFinishing:'fail'}]){r=await preflight.inspect(f.master.report,f.proof.report,f.master.pdfBytes,{...c,...override});assert.equal(r.status,'blocked',JSON.stringify(override));}
 r=await preflight.inspect(f.master.report,f.proof.report,f.master.pdfBytes,{...c,completePhysicalProof:false});assert.equal(r.status,'checks-pending');
 r=await preflight.inspect(f.master.report,f.proof.report,f.master.pdfBytes,{...c,fileAcceptance:'unknown'});assert.equal(r.status,'checks-pending');
 const unknown=structuredClone(f.master.report);for(const p of unknown.pages)p.effectiveArtworkPpi=null;
 r=await preflight.inspect(unknown,f.proof.report,f.master.pdfBytes,c);assert.equal(r.status,'checks-pending');
 for(const p of unknown.pages)p.effectiveExportPpi=20;r=await preflight.inspect(unknown,f.proof.report,f.master.pdfBytes,c);assert.equal(r.status,'blocked');
 const changed=structuredClone(f.proof.report);changed.pages[0].imageHash='changed';assert.equal((await preflight.inspect(f.master.report,changed,f.master.pdfBytes,c)).status,'blocked');
 const wrong=await PDFDocument.load(f.master.pdfBytes);wrong.getPages()[0].setTrimBox(0,0,100,100);assert.equal((await preflight.inspect(f.master.report,f.proof.report,await wrong.save(),c)).status,'blocked');
}));
test('evidence requires complete strict observed fields',()=>{
 assert.deepEqual(preflight.validate(contract()),contract());
 for(const c of [{...contract(),measuredRulerMm:NaN},{...contract(),requiredPpi:0},{...contract(),printedAtActualSize:'yes'},{...contract(),certified:true},{...contract(),evidenceReference:''},{...contract(),readability:'unknown'}])assert.throws(()=>preflight.validate(c));
 const c=contract();delete c.templateMatch;assert.throws(()=>preflight.validate(c));
});
test('production evidence is brand/file-bound, saved separately, exposed in view, and rejects modified bytes',()=>temporary(async dir=>{
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),runtime=new CreativeRuntime({root:dir,provider:{generate:()=>{throw Error('No paid calls');},reason:()=>{throw Error('No paid calls');}}});runtime.schedule=()=>{};
 const brandId='brand-00000000-0000-0000-0000-000000000000';await runtime.brands.save(brandId,'brand.json',{id:brandId,name:'Duroflex'});
 const selections=placements.resolve({brandUrl:'https://example.com',brief:'Fixture',placementIds:['custom:studio-print-leaflet-a5']}).selections;
 const job=await runtime.store.create({brandId,brandUrl:'https://example.com'},runtime.config,selections),f=await artwork(runtime.store.dir(job.id));
 const master={...f.master.report,physicalProof:f.proof.report,downloadUrl:'/files/print-proof-test.pdf',actualSizeProofUrl:'/files/print-actual-size-test.pdf'};
 await runtime.store.save(job.id,'print-proof-test.pdf',f.master.pdfBytes);await runtime.store.save(job.id,'print-actual-size-test.pdf',f.proof.bytes);await runtime.store.update(job.id,j=>({...j,printProofs:[master]}));
 const data={brandName:'Duroflex',route:'continuity',formatId:f.group.id,masterPdfHash:master.pdfHash,proofHash:master.physicalProof.proofHash,contract:contract()};
 await assert.rejects(()=>preflight.record(runtime,job.id,{...data,brandName:'Sleepyhead'}),/saved brand/);await assert.rejects(()=>preflight.record(runtime,job.id,{...data,proofHash:'stale'}),/changed proof/);
 const report=await preflight.record(runtime,job.id,data),saved=await runtime.store.read(job.id);assert.equal(saved.productionChecks.length,1);assert.equal(saved.printProofs[0].productionReady,false);assert.equal(saved.budget.imageCalls,0);assert.deepEqual(saved.printProofs[0],master);assert.equal((await runtime.view(job.id)).productionChecks[0].reportUrl,report.reportUrl);assert.equal(JSON.parse(await fs.readFile(path.join(runtime.store.dir(job.id),report.reportUrl.split('/').pop()))).masterPdfHash,master.pdfHash);
 await runtime.store.save(job.id,'print-actual-size-test.pdf',Buffer.from('changed'));await assert.rejects(()=>preflight.record(runtime,job.id,data),/proof bytes changed/);
}));
test('historical print selections retain their original files without retroactive physical-proof workflow',()=>temporary(async dir=>{
 const f=await artwork(dir,'custom:studio-print-leaflet-a5',true),conceptId=require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:'legacy'},'continuity');
 let saved;const job={selection:f.selections,results:f.results.map(r=>({...r,conceptId}))},runtime={store:{read:async()=>job,dir:()=>dir,save:async(id,n,v)=>fs.writeFile(path.join(dir,n),Buffer.isBuffer(v)?v:JSON.stringify(v)),update:async(id,fn)=>{saved=fn(job);}}};
 const reports=await print.finish(runtime,'legacy');assert.equal(reports[0].physicalProof,undefined);assert.ok(!((await fs.readdir(dir)).some(n=>n.startsWith('print-actual-size-'))));assert.equal(saved.printProofs.length,2);
}));
test('HTTP serves calibration PDF and workflow through exact safe guide routes',()=>temporary(async dir=>{
 for(const file of ['docs/placements/india-production-proof-workflow.md','output/pdf/india-print-production-calibration.pdf']){await fs.mkdir(path.dirname(path.join(dir,file)),{recursive:true});await fs.copyFile(path.join(root,file),path.join(dir,file));}
 const handler=require('../../lib/creative-ai/runtime/http').createHandler({root:dir}),server=require('http').createServer((req,res)=>handler.handle(req,res,new URL(req.url,'http://localhost').pathname,async()=>({})));handler.runtime.schedule=()=>{};await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const base='http://127.0.0.1:'+server.address().port+'/creative-ai/placement-guide/';const r=await fetch(base+'production-calibration.pdf');assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/pdf');assert.equal((await PDFDocument.load(await r.arrayBuffer())).getPageCount(),6);assert.equal((await fetch(base+'production.md')).status,200);assert.equal((await fetch(base+'not-allowed.pdf')).status,404);}finally{await new Promise(r=>server.close(r));}
}));
test('Studio exposes current evidence only for matching files; evidence dialog defaults never assert inspection',async()=>{
 const source=await fs.readFile(path.join(root,'public/creative-ai/app.js'),'utf8'),vm=require('node:vm'),elements=new Map(),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const proof={route:'continuity',formatId:'fixture',name:'Test fixture',pdfHash:'masterhash',pages:[{requiredPpi:300}],physicalProof:{proofHash:'proofhash',fullCoverage:false},preflight:{status:'checks-pending',approvalBasis:'No observed checks',checks:[]},actualSizeProofUrl:'/calibrated.pdf',preflightUrl:'/preflight.json'};
 const j={id:'job-fixture',brandId:'brand-fixture',placements:[{id:'page1',name:'Front',printSet:{id:'fixture',index:1,name:'Test fixture'}}],printProofs:[proof],results:[],productionChecks:[{route:'continuity',formatId:'fixture',masterPdfHash:'old',proofHash:'proofhash',status:'recorded-checks-complete',reportUrl:'/old.json'}]};
 const context={currentJob:j,brandList:[{id:j.brandId,name:'Duroflex'}],imageReactions:new Map(),carouselPages:{},esc,score:n=>n,document:{addEventListener:()=>{}},$:id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',showModal(){this.open=true;},close(){this.open=false;}});return elements.get(id);}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function imageReactionKey('),source.indexOf('function updateImageReaction(')),context);vm.runInContext(source.slice(source.indexOf('function copyPlanningHtml('),source.indexOf('function readingReviewHtml(')),context);vm.runInContext(source.slice(source.indexOf('function outputUnit('),source.indexOf('function render(j){')),context);
 let html=context.renderOutputs(j,'continuity');assert.match(html,/Partial actual-size samples only/);assert.match(html,/Record physical \/ operator evidence/);assert.ok(!html.includes('/old.json'));
 j.productionChecks.push({...j.productionChecks[0],masterPdfHash:proof.pdfHash,reportUrl:'/current.json'});html=context.renderOutputs(j,'continuity');assert.match(html,/current.json/);assert.match(html,/Recorded checks/);
 vm.runInContext(source.slice(source.indexOf('let productionTarget=')),context);context.openProductionEvidence('continuity|fixture');html=elements.get('#productionEvidenceFields').innerHTML;assert.match(html,/Actually printed at 100%/);assert.match(html,/Select observed result/);assert.match(html,/Unconfirmed/);assert.ok(!html.includes(' checked'));assert.equal(elements.get('#productionDialog').open,true);assert.equal(vm.runInContext('productionTarget.jobId',context),j.id);
});
