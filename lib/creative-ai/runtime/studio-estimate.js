'use strict';
const fs=require('fs/promises'),path=require('path'),{estimate,validFx}=require('../../cost-tracker');
async function estimateBrief(runtime,brandId,profile,options=2){
 const lean=require('./original-delivery').prepare(runtime.root,{}).leanWorkflowVersion===1;
 const unavailable={currency:'INR',status:'unavailable',message:'INR estimate unavailable for this format. Generation is paid; actual usage is recorded after the run.'};
 let fx;try{fx=validFx(JSON.parse(await fs.readFile(path.join(runtime.root,'output/cost-tracking/currency.json'),'utf8')));}catch{return unavailable;}if(!fx||!runtime.store?.list)return unavailable;
 const units=profile.unitCount||profile.carouselSlideCount||1,samples=[];
 // Receipts and placement metadata only: never hydrate ~200 saved jobs' pictures per readiness check (defect #6).
 for(const job of await runtime.store.list({metadataOnly:true})){
  if(lean?job.intake?.leanWorkflowVersion!==1:job.intake?.composedTextVersion!==1)continue;
  if(job.status!=='finished'||job.intake?.brandId!==brandId||job.results?.filter(r=>r.imageUrl).length!==units*(lean?require('./lean-policy').jobOptions(job).length:options))continue;
  const placements=job.placements||job.selection?.map(s=>s.description)||[];
  if(!placements.some(p=>p.dimensions?.width===profile.width&&p.dimensions?.height===profile.height))continue;
  const allReceipts=job.budget?.receipts||[];if(['image','reasoning'].some(kind=>(job.budget?.[kind+'Calls']||0)>allReceipts.filter(r=>r.kind===kind).length))continue;
  const receipts=allReceipts.filter(r=>Date.parse(r.recordedAt)>=Date.parse(job.createdAt));
  const jobOptions=lean?require('./lean-policy').jobOptions(job):null;
  if(lean){if(jobOptions.some(o=>receipts.filter(r=>r.kind==='image'&&r.model===o.model).length<units))continue;}else if(receipts.filter(r=>r.kind==='image'&&r.model===runtime.config.imageModel).length<units*options)continue;
  // Lean jobs accept the reasoning models they pinned (planner, reviewer, backup), not a fixed list (8 Nov 2026).
  const leanModels=lean?new Set(['gpt-6-astra','gpt-6-luna',job.runtimeConfig?.reasoningModel,...Object.values(job.runtimeConfig?.roleModels||{}).map(m=>m?.model),...Object.values(job.runtimeConfig?.fallbackModels||{}).map(m=>m?.model)].filter(Boolean)):null;
  if(receipts.some(r=>r.kind==='reasoning'&&!(lean?leanModels.has(r.model):r.model===runtime.config.reasoningModel)))continue;
  const unresolved=Object.values(job.budget?.requestStates||{}).some(s=>Date.parse(s.reservedAt)>=Date.parse(job.createdAt)&&!receipts.some(r=>r.kind===s.kind&&r.requestKey===s.key));
  const values=receipts.map(estimate);if(unresolved||values.some(x=>x==null))continue;
  // One design per format (8 Nov 2026): a past two-option lean run is scaled to one option by keeping
  // the shared planning calls and the gpt-image-2 images, dropping the retired model's images and
  // counting half of the per-option review/correction calls. Receipts do not record the option.
  let usd=values.reduce((a,b)=>a+b,0),adjusted=false;
  if(lean&&jobOptions.length>1&&options===1){const primary=jobOptions[0].model,planner=job.runtimeConfig?.roleModels?.['lean-planning']?.model;usd=receipts.reduce((sum,r,i)=>sum+(r.kind==='image'?(r.model===primary?values[i]:0):r.model===planner?values[i]:values[i]/jobOptions.length),0);adjusted=true;}
  samples.push({jobId:job.id,inr:usd*fx.usdToInr,adjustedFromOptions:adjusted?jobOptions.length:undefined});if(samples.length===5)break;
 }
 if(!samples.length&&lean)return aplusEstimate(runtime,brandId,profile,fx,unavailable,options);
 if(!samples.length)return {...unavailable,rateDate:fx.rateDate};const low=Math.floor(Math.min(...samples.map(s=>s.inr))),high=Math.ceil(Math.max(...samples.map(s=>s.inr)));
 return {currency:'INR',status:'historical-estimate',low,high,rateDate:fx.rateDate,fxSource:fx.source,usdToInr:fx.usdToInr,samples,message:`Estimated ₹${low}–₹${high} for ${options===1&&lean?'one design per format':options+' option'+(options===1?'':'s')}, based on ${samples.length} comparable completed run${samples.length===1?'':'s'}${samples.some(x=>x.adjustedFromOptions)?' (earlier two-option runs scaled to one option)':''}. Includes those runs’ corrections; this run may cost more. FX ${fx.rateDate}; not a quote or confirmed bill.`};
}
// Amazon A+ page (9 Nov 2026): no earlier run has the same 14 (or 6, or 5) sizes, so scale completed
// one-design lean runs of the same brand per image: the run's planning cost (counted twice at the high
// end, because one plan covers the whole page) plus its per-image cost (image, check and correction
// calls) times the page's image count. Same receipt rules as above; unknown usage is never zero.
// Any other format with no comparable run (9 Nov 2026 live run: Facebook Story/Feed, PMax) uses the same
// per-image scaling, labelled "estimated from this brand's other formats", from runs with the same pinned
// image and planning models. Unavailable only when the brand has no completed run at all; never ₹0.
async function aplusEstimate(runtime,brandId,profile,fx,unavailable,attemptOptions=1){
 const policy=require('./lean-policy'),units=profile.unitCount||profile.carouselSlideCount||1,images=profile.aplus?profile.aplus.imageCount||profile.unitCount:units*Math.max(1,attemptOptions),samples=[];
 const imageModel=policy.options[0].model,plannerModel=policy.roles['lean-planning'].model;
 for(const job of await runtime.store.list({metadataOnly:true})){
  if(job.intake?.leanWorkflowVersion!==1||job.status!=='finished'||job.intake?.brandId!==brandId)continue;
  const options=policy.jobOptions(job),pages=(job.results||[]).filter(r=>r.imageUrl).length/options.length;if(!Number.isInteger(pages)||pages<1)continue;
  if((options[0].model!==imageModel||(job.runtimeConfig?.roleModels?.['lean-planning']?.model||plannerModel)!==plannerModel))continue;
  const all=job.budget?.receipts||[];if(['image','reasoning'].some(kind=>(job.budget?.[kind+'Calls']||0)>all.filter(r=>r.kind===kind).length))continue;
  const receipts=all.filter(r=>Date.parse(r.recordedAt)>=Date.parse(job.createdAt));
  if(Object.values(job.budget?.requestStates||{}).some(s=>Date.parse(s.reservedAt)>=Date.parse(job.createdAt)&&!receipts.some(r=>r.kind===s.kind&&r.requestKey===s.key)))continue;
  const values=receipts.map(estimate);if(!receipts.length||values.some(v=>v==null))continue;
  const planner=job.runtimeConfig?.roleModels?.['lean-planning']?.model,primary=options[0].model;let planning=0,perOption=0;
  receipts.forEach((r,i)=>{if(r.kind==='reasoning'&&r.model===planner)planning+=values[i];else if(r.kind==='image')perOption+=r.model===primary?values[i]:0;else perOption+=values[i]/options.length;});
  const perImage=perOption/pages;samples.push({jobId:job.id,pages,low:(planning+perImage*images)*fx.usdToInr,high:(planning*2+perImage*images)*fx.usdToInr});if(samples.length===5)break;
 }
 const what=profile.aplus?'This '+profile.aplus.name+' makes '+images+' images in one job.':'This format makes '+images+' image'+(images===1?'':'s')+' in one job.';
 if(!samples.length)return {...unavailable,rateDate:fx.rateDate,imageCount:images,message:'INR estimate unavailable: no completed run of this brand to scale from. '+what+' Generation is paid; actual usage is recorded after the run.'};
 const low=Math.max(1,Math.floor(Math.min(...samples.map(s=>s.low)))),high=Math.max(low,Math.ceil(Math.max(...samples.map(s=>s.high))));
 const runs=`${samples.length} completed run${samples.length===1?'':'s'} of this brand`,tail='Includes those runs’ checks and corrections; this run may cost more. FX '+fx.rateDate+'; not a quote or confirmed bill.';
 return {currency:'INR',status:'scaled-estimate',low,high,imageCount:images,...(profile.aplus?{}:{basis:'brand-other-formats'}),rateDate:fx.rateDate,fxSource:fx.source,usdToInr:fx.usdToInr,samples:samples.map(s=>({jobId:s.jobId,pages:s.pages})),message:profile.aplus?`Estimated ₹${low}–₹${high} for this ${profile.aplus.name}: ${images} images (one design each) and one plan, scaled per image from ${runs}. ${tail}`:`Estimated ₹${low}–₹${high} for ${images} image${images===1?'':'s'} and one plan, estimated from this brand’s other formats (no completed run of this exact size yet; scaled per image from ${runs}). ${tail}`};
}
module.exports={estimateBrief,aplusEstimate};
