'use strict';
const fs=require('./artifact-fs'),path=require('path'),crypto=require('crypto'),sharp=require('sharp');
const {PDFDocument,PDFName,PDFNumber}=require('pdf-lib');
const {printGeometry}=require('../placement-knowledge');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function specFor(p,override={}){
 if(!override||typeof override!=='object'||Array.isArray(override))throw Error('Print settings must be an object.');
 const keys=['trimWidthMm','trimHeightMm','bleedMm','safeMm','proofPpi','requiredPpi','panelWidthsMm','keepoutTopMm','keepoutBottomMm','templateNote'];
 if(Object.keys(override).some(k=>!keys.includes(k)))throw Error('Unknown print setting.');
 const s={...p.print,...override};
 for(const k of keys.filter(k=>!['panelWidthsMm','templateNote'].includes(k))){const v=s[k],zero=['bleedMm','safeMm','keepoutTopMm','keepoutBottomMm'].includes(k);if(!Number.isFinite(v)||v<(zero?0:1)||v>10000)throw Error('Invalid print '+k);}
 if(s.bleedMm>50||s.safeMm>=Math.min(s.trimWidthMm,s.trimHeightMm)/2||s.keepoutTopMm+s.keepoutBottomMm+2*s.safeMm>=s.trimHeightMm)throw Error('Print margins or keep-outs leave no usable content area.');
 if(s.proofPpi>600||s.requiredPpi>1200)throw Error('PPI exceeds supported proof settings.');
 if(s.templateNote!==undefined&&(typeof s.templateNote!=='string'||s.templateNote.length>1200))throw Error('Template note must be concise text.');
 if(s.fold!=='none'){
  if(s.fold==='half')s.panelWidthsMm=[s.trimWidthMm/2,s.trimWidthMm/2];
  if(s.fold==='z')s.panelWidthsMm=Array(3).fill(s.trimWidthMm/3);
  if(!Array.isArray(s.panelWidthsMm)||s.panelWidthsMm.length!==3&&s.fold!=='half'||s.panelWidthsMm.some(v=>!Number.isFinite(v)||v<=2*s.safeMm)||Math.abs(s.panelWidthsMm.reduce((a,b)=>a+b,0)-s.trimWidthMm)>.05)throw Error('Fold panel widths must fit the supplied flat trim width.');
 }
 const bleed=Object.fromEntries(['top','right','bottom','left'].map(k=>[k,s.bleedMm]));
 const g=printGeometry({trim:{width:s.trimWidthMm,height:s.trimHeightMm,unit:'mm'},bleed:{...bleed,unit:'mm'},ppi:s.proofPpi});
 const factor=Math.min(1,2560/Math.max(g.rasterPixels.width,g.rasterPixels.height),Math.sqrt(4000000/(g.rasterPixels.width*g.rasterPixels.height)));
 const raster={width:Math.max(1,Math.ceil(g.rasterPixels.width*factor)),height:Math.max(1,Math.ceil(g.rasterPixels.height*factor))};
 return {...s,proofWorkflowVersion:1,geometry:g,raster,colourSpace:'RGB',pdfStandard:'PDF proof; no PDF/X certification',printerAccepted:false};
}
function pageLabel(p,index){if(p.pages===1)return 'Artwork';if(p.print.fold!=='none')return index===1?'Outside flat face':'Inside flat face';if(p.pages===2)return index===1?'Front':'Back';return ['Cover','Content page 1','Content page 2','Back / action'][index-1]||'Page '+index;}
function guidance(p,s,index){return [
 'PRINT DESIGN PROOF: '+p.name+'; '+pageLabel(p,index)+' ('+index+'/'+p.pages+'). '+p.guidelines,
 'Flat artwork only. Do not draw paper mockups, hanging fixtures, crop/fold marks, measurement labels or other pages inside the artwork.',
 'Job-selected geometry: trim '+s.trimWidthMm+'×'+s.trimHeightMm+' mm; '+s.bleedMm+' mm bleed on all edges. Extend the actual background into bleed; do not add white bands or artificial contrast patches.',
 'Keep logo, essential product and exact copy at least '+s.safeMm+' mm INSIDE trim. Additional top keep-out '+s.keepoutTopMm+' mm and bottom keep-out '+s.keepoutBottomMm+' mm. Respect both margins and keep-outs.',
 ...(s.fold!=='none'?['Fold '+s.fold+'; panel widths left-to-right in mm: '+s.panelWidthsMm.join(', ')+'. Keep copy clear of folds and panel edges by '+s.safeMm+' mm. Outside and inside must use distinct logical content. Confirm printer template before production.']:[]),
 'Use readable type at physical viewing size. Raster proof cannot establish vector text, press resolution, ICC output intent or printer acceptance. Never invent contact details, offers or a scannable QR code.',
 ...(s.templateNote?['User-supplied production note (not certified template evidence): '+s.templateNote]:[])
 ].join('\n');}
function decorate(record,selection){const s=selection?.description?.print;if(!s)return record;const {packageHash,...body}=record;body.prompt+='\n'+guidance({...selection.description,pages:selection.description.printSet.count,print:s,guidelines:selection.description.guidelines},s,selection.description.printSet.index);body.printProduction={...s,set:selection.description.printSet};return {...body,packageHash:require('../art-director').fingerprint(body)};}
async function bundle(job,group,dir){
 const pdf=await PDFDocument.create(),items=[];
 for(const selected of group.selections.sort((a,b)=>a.description.printSet.index-b.description.printSet.index)){
  const r=job.results.find(r=>r.conceptId===group.conceptId&&r.placementId===selected.id),name=r?.imageUrl?.split('/').pop();
  if(!name){items.push({placementId:selected.id,status:'missing'});continue;}
  if(!/^static-[\w-]+\.(png|jpg|webp)$/.test(name))throw Error('Invalid print proof source');
  const bytes=await fs.readFile(path.join(dir,name)),m=await sharp(bytes).metadata(),s=selected.description.print,w=s.geometry.artboard.width,h=s.geometry.artboard.height,pt=72/25.4;
  const png=m.format==='png'?bytes:await sharp(bytes).png().toBuffer(),image=await pdf.embedPng(png),unit=s.proofWorkflowVersion===1&&Math.max(w,h)*pt>14400?10:1,page=pdf.addPage([w*pt/unit,h*pt/unit]);if(unit!==1)page.node.set(PDFName.of('UserUnit'),PDFNumber.of(unit));
  page.drawImage(image,{x:0,y:0,width:w*pt/unit,height:h*pt/unit});page.setBleedBox(0,0,w*pt/unit,h*pt/unit);page.setTrimBox(s.bleedMm*pt/unit,s.bleedMm*pt/unit,s.trimWidthMm*pt/unit,s.trimHeightMm*pt/unit);
  let source=null;try{const proof=JSON.parse(await fs.readFile(path.join(dir,'export-proof-'+r.route+'-'+r.placementId+'-'+(/-1\./.test(name)?1:0)+'.json')));if(proof.exportHash!==hash(bytes))throw Error('Print export proof does not match delivered image bytes');source=proof.sourceMeasurement||null;}catch(e){if(e.code!=='ENOENT')throw e;}
  const effectiveSourcePpi=source?Math.min(source.width/(w/25.4),source.height/(h/25.4)):null,effectiveExportPpi=Math.min(m.width/(w/25.4),m.height/(h/25.4)),effectiveArtworkPpi=effectiveSourcePpi===null?null:Math.min(effectiveSourcePpi,effectiveExportPpi);
  items.push({placementId:selected.id,index:selected.description.printSet.index,label:selected.description.printSet.label,imageHash:hash(bytes),designReady:r.ready===true,geometry:s.geometry,rasterPixels:{width:m.width,height:m.height},effectiveSourcePpi,effectiveExportPpi,effectiveArtworkPpi,requiredPpi:s.requiredPpi,pdfUserUnit:unit,resolutionStatus:effectiveArtworkPpi===null?'source-resolution-unverified':effectiveArtworkPpi>=s.requiredPpi?'meets-requested-ppi':'below-requested-ppi',trimBox:page.getTrimBox(),bleedBox:page.getBleedBox()});
 }
 const complete=items.length===group.selections.length&&items.every(x=>x.status!=='missing');
 if(!complete)return {pdfBytes:null,report:{version:1,formatId:group.id,conceptId:group.conceptId,route:group.route,complete:false,designReady:false,productionReady:false,pages:items,note:'Missing pages; no partial PDF is offered as a complete set.'}};
 pdf.setTitle(group.name+' — design proof');pdf.setSubject('RGB raster design proof. Printer template, press resolution, stock, finishing and output intent require prepress approval.');
 const pdfBytes=Buffer.from(await pdf.save());
 return {pdfBytes,report:{version:1,formatId:group.id,conceptId:group.conceptId,route:group.route,name:group.name,complete:true,designReady:items.every(x=>x.designReady),productionReady:false,printerAccepted:false,pages:items,pdfHash:hash(pdfBytes),colourSpace:'RGB raster',pdfStandard:'PDF proof',limitations:['Reader order, not imposed printer signatures.','Text is rasterized; no embedded vector fonts or PDF/X output intent.','Upsampling does not restore source detail. Effective source PPI is measured separately.','Printer/operator must confirm dimensions, bleed, ICC profile, folds, dielines, mounting and finishing.'],note:'Downloadable design proof; not a press-ready certification.'}};
}
async function finish(runtime,id){const job=await runtime.store.read(id),sets=new Map();for(const s of job.selection){const c=s.description?.printSet;if(!c)continue;for(const route of ['continuity','exploration']){const conceptId=require('../creative-director').conceptIdFor({assignmentId:id},route),key=route+'|'+c.id;if(!sets.has(key))sets.set(key,{id:c.id,name:c.name,conceptId,route,selections:[]});sets.get(key).selections.push(s);}}
 const reports=[];for(const group of sets.values()){
  const {pdfBytes,report}=await bundle(job,group,runtime.store.dir(id)),suffix=group.route+'-'+group.id.replace(/[^\w-]/g,'_'),pdfName='print-proof-'+suffix+'.pdf',reportName='print-report-'+suffix+'.json';
  if(pdfBytes)await runtime.store.save(id,pdfName,pdfBytes);
  if(pdfBytes&&group.selections.every(s=>s.description.print.proofWorkflowVersion===1)){const proof=await require('./physical-proof').create(job,group,runtime.store.dir(id),report),proofName='print-actual-size-'+suffix+'.pdf',preflightName='print-preflight-'+suffix+'.json';await runtime.store.save(id,proofName,proof.bytes);report.physicalProof=proof.report;report.actualSizeProofUrl='/creative-ai/api/jobs/'+id+'/files/'+proofName;report.preflight=await require('./production-preflight').inspect(report,proof.report,pdfBytes);await runtime.store.save(id,preflightName,report.preflight);report.preflightUrl='/creative-ai/api/jobs/'+id+'/files/'+preflightName;}
  await runtime.store.save(id,reportName,report);reports.push({...report,downloadUrl:pdfBytes?'/creative-ai/api/jobs/'+id+'/files/'+pdfName:null,reportUrl:'/creative-ai/api/jobs/'+id+'/files/'+reportName});
 }if(sets.size)await runtime.store.update(id,j=>({...j,printProofs:reports}));return reports;}
module.exports={specFor,pageLabel,guidance,decorate,bundle,finish};
