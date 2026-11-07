'use strict';
// A fallback within the existing correction cycle, not a new campaign or an
// in-place change to frozen reconstruction. The normal candidate review follows.
const sharp=require('sharp'),crypto=require('node:crypto');
const editable=require('./editable');
const hash=v=>crypto.createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
async function layout(runtime,id,planned){
 const topLogo=structuredClone(planned);
 for(const logo of topLogo.objects.filter(o=>o.role==='logo'))logo.top=topLogo.safeMargin||0;
 const variants=[planned,topLogo],regions=topLogo.protectedRegions||[],margin=planned.safeMargin||0;
 if(regions.length){
  const bottom=structuredClone(topLogo),dy=planned.canvas.height-margin-Math.max(...regions.map(r=>r.top+r.height));
  for(const region of bottom.protectedRegions)region.top+=dy;
  variants.push(bottom);
 }
 let error;
 for(const [index,variant]of variants.entries()){
  try{return {...await require('./typography-repair').reflow(variant,d=>editable.render(runtime,id,d,'png',{preflight:true})),layoutAttempts:index+1};}
  catch(e){if(e.code!=='TYPOGRAPHY_COMPOSITION_REQUIRED')throw e;error=e;}
 }
 throw error;
}
async function prepare(runtime,id,record,planned){
 if(record.protectedProduct||record.productReference?.policyVersion!==2)throw Error('Scene recomposition requires the reference-led product policy; original pixels remain preserved');
 const references=record.attachmentManifest.filter(a=>a.roles?.includes('product'));
 if(planned.compositionPolicy?.productRequired&&(!references.length||!planned.protectedRegions?.some(r=>r.kind==='product')))throw Error('Scene recomposition needs the selected SKU references and a planned product envelope');
 // Restore the validated intended subject space, not the observed silhouette
 // from the rejected image. Measure the exact copy before requesting that scene.
 const reflow=await layout(runtime,id,planned);
 const doc=reflow.document;
 require('./wording-agreement').verifyCanvas(record,doc);
 require('./composed-quality').assertReadable(doc);
 const measured=await editable.render(runtime,id,{...doc,assets:doc.assets.filter(a=>a.kind!=='photograph'),objects:doc.objects.filter(o=>o.role!=='photograph')});
 const issues=require('./editable-quality').geometry(doc,measured.measurements).filter(x=>!/^Advisory: /.test(x));
 if(issues.length)throw Error('Scene recomposition has no feasible measured layout: '+issues.join('; '));
 const photoRecord={...record,attachmentManifest:references};
 const prompt=editable.photoPrompt(photoRecord,doc,measured.measurements)+'\nTARGETED COMPOSITION CORRECTION: The previous generated subject occupied the measured copy space. Reframe the selected product within the subject envelope above, leaving the complete measured overlay area clear. Keep the approved scene premise, SKU identity and supported claims. Generate only the clean visual layer. Exact copy and the official logo will be rendered locally; do not generate them. This changes this placement only.';
 return {document:doc,reflow,prompt,attachments:references,scope:{route:record.route,placementId:record.placementId,conceptId:record.conceptId},size:require('./placements').generationSize(doc.canvas.width,doc.canvas.height).size,quality:'high'};
}
async function generate(runtime,id,ctx,planned,key,budget,source){
 const plan=await prepare(runtime,id,ctx.record,planned);
 const request={prompt:plan.prompt,attachments:plan.attachments,scope:plan.scope,size:plan.size,quality:plan.quality};
 request.requestKey=hash({id,key,operation:'typography-recomposition-v1',sourceHash:hash(source),document:plan.document,prompt:request.prompt,references:request.attachments.map(a=>({id:a.assetId,hash:hash(a.imageData)}))});
 await runtime.store.save(id,'typography-recomposition-plan.json',{version:1,sourceHash:hash(source),originalPlannedDocument:planned,document:plan.document,changes:plan.reflow.changes,layoutAttempts:plan.reflow.layoutAttempts,requestKey:request.requestKey,referenceIds:plan.attachments.map(a=>a.assetId),reason:'Observed subject leaves insufficient space at the pinned reading size',preserves:['exact copy','fonts','SKU identity','brand and review policies','original artwork','other placements']});
 const out=await runtime.provider.generate(request,{...budget,...(budget.brandContext?{brandContext:async()=>({...await budget.brandContext(),dir:runtime.store.dir(id)})}:{})});
 const photo=await sharp(Buffer.from(out.imageData.split(',')[1],'base64')).resize(plan.document.canvas.width,plan.document.canvas.height,{fit:'cover'}).png().toBuffer();
 await runtime.store.save(id,'typography-recomposition-scene.png',photo);
 return {document:plan.document,photo};
}
module.exports={prepare,generate};
