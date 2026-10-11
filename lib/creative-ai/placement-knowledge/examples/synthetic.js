'use strict';
const pk=require('..');
const fs=require('node:fs');
const path=require('node:path');
function buildExamples() {
 const catalog=pk.loadCatalog();
 const banner=pk.pinProfile({id:'google-upload-inline-rectangle'},catalog);
 const notification=pk.pinProfile({id:'notification-android-big-picture'},catalog);
 const merchant=pk.pinProfile({id:'merchant-primary'},catalog);
 const base={constraints:[],conflicts:[],brandRules:[],truthfulClaims:[],assignment:{brief:'FICTIONAL metadata illustration only; no real product claim or campaign results.'}};
 return {synthetic:true,authorship:'Authored and reviewed as contract examples; no live inference, real image generation or observed performance.',version:'1.0.0',cases:[
  {name:'Fixed banner metadata passes known pixel/file checks',pin:banner,input:{assets:{artwork:{width:300,height:250,format:'png',bytes:100000}}},review:pk.reviewTechnical(banner,{assets:{artwork:{width:300,height:250,format:'png',bytes:100000}}},catalog),editorialReview:'Metadata satisfies the known dimensions/file rule; actual text/crop/claims still require a rendered reviewer. No artwork exists for this synthetic case.'},
  {name:'Same-ratio large canvas is a counterexample',pin:banner,input:{assets:{artwork:{width:600,height:500,format:'png',bytes:100000}}},review:pk.reviewTechnical(banner,{assets:{artwork:{width:600,height:500,format:'png',bytes:100000}}},catalog),editorialReview:'A 600×500 master has the right ratio but fails exact uploaded300×250 pixels.'},
  {name:'Rich notification preserves native title/body',context:pk.assembleContext({...base,pins:[notification],role:'copywriter',jobInputs:{notificationContract:'Synthetic app title/body; no publisher character algorithm provided',osVersion:'job-defined',locale:'en-IN',deviceMatrix:['small/large font, collapsed/expanded']}},catalog),proposedCopy:{native:{title:'Your guide is ready',body:'Open the app to read it.'},embedded:{image:'Guide cover'}},editorialReview:'Short useful native utility text plus optional cover; Android30/40 are targets. Native requiredness and provider technical limits need the app contract. Image copy cannot substitute for title/body.'},
  {name:'Promotional product overlay is a mandatory conflict counterexample',context:pk.assembleContext({...base,pins:[merchant],role:'graphic-designer',constraints:[{id:'sale',severity:'mandatory',sourceIds:['user:synthetic-brief'],statement:'Bake SALE into primary product image',kind:'embedded-text-required'}]},catalog),editorialReview:'Primary product promotional-copy prohibition conflicts with the assignment. Preserve both, request targeted correction, and do not silently generate an ineligible campaign graphic.'},
  {name:'Custom user list with explicit count and bytes',userImport:{rows:[{id:'custom:synthetic-offer',name:'Fictional offer artwork',platform:'owned',publisher:'fictional-app',placement:'offer-card',assetType:'whole-image',canvas:{width:600,height:800,unit:'px'},exportContract:{formats:['png'],maxBytes:1000000},nativeFields:[{id:'altText',required:true,maxChars:120,countMethod:'unicode-code-points'}]}],source:{id:'user:synthetic-format-list',title:'Fictional user format list',url:'user:synthetic-example',verifiedAt:'2026-10-04'}},editorialReview:'Explicit job constraints import into a separate namespace; they do not imply platform certification.'}
 ]};
}
if(require.main===module) {
 const result=buildExamples();
 fs.writeFileSync(path.join(__dirname,'worked-cases.json'),JSON.stringify(result,null,2)+'\n');
 const row=result.cases.at(-1).userImport;
 const custom=pk.importCustomProfiles(row.rows,{source:row.source});
 const imported=pk.resolveProfile({id:row.rows[0].id},custom);
 console.log(JSON.stringify({synthetic:true,cases:result.cases.length,customProfile:imported.id,certification:imported.certification},null,2));
}
module.exports={buildExamples};
