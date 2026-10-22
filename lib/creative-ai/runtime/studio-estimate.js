'use strict';
const fs=require('fs/promises'),path=require('path'),{estimate,validFx}=require('../../cost-tracker');
async function estimateBrief(runtime,brandId,profile){
 const unavailable={currency:'INR',status:'unavailable',message:'INR estimate unavailable for this format. Generation is paid; actual usage is recorded after the run.'};
 let fx;try{fx=validFx(JSON.parse(await fs.readFile(path.join(runtime.root,'output/cost-tracking/currency.json'),'utf8')));}catch{return unavailable;}if(!fx||!runtime.store?.list)return unavailable;
 const units=profile.unitCount||profile.carouselSlideCount||1,samples=[];
 for(const job of await runtime.store.list()){
  if(job.status!=='finished'||job.intake?.brandId!==brandId||job.results?.filter(r=>r.imageUrl).length!==units*2)continue;
  const placements=job.placements||job.selection?.map(s=>s.description)||[];
  if(!placements.some(p=>p.dimensions?.width===profile.width&&p.dimensions?.height===profile.height))continue;
  const allReceipts=job.budget?.receipts||[];if(['image','reasoning'].some(kind=>(job.budget?.[kind+'Calls']||0)>allReceipts.filter(r=>r.kind===kind).length))continue;
  const receipts=allReceipts.filter(r=>Date.parse(r.recordedAt)>=Date.parse(job.createdAt));
  if(receipts.filter(r=>r.kind==='image'&&r.model===runtime.config.imageModel).length<units*2)continue;
  if(receipts.some(r=>r.kind==='reasoning'&&r.model!==runtime.config.reasoningModel))continue;
  const unresolved=Object.values(job.budget?.requestStates||{}).some(s=>Date.parse(s.reservedAt)>=Date.parse(job.createdAt)&&!receipts.some(r=>r.kind===s.kind&&r.requestKey===s.key));
  const values=receipts.map(estimate);if(unresolved||values.some(x=>x==null))continue;
  samples.push({jobId:job.id,inr:values.reduce((a,b)=>a+b,0)*fx.usdToInr});if(samples.length===5)break;
 }
 if(!samples.length)return {...unavailable,rateDate:fx.rateDate};const low=Math.floor(Math.min(...samples.map(s=>s.inr))),high=Math.ceil(Math.max(...samples.map(s=>s.inr)));
 return {currency:'INR',status:'historical-estimate',low,high,rateDate:fx.rateDate,fxSource:fx.source,usdToInr:fx.usdToInr,samples,message:`Estimated ₹${low}–₹${high} for two options, based on ${samples.length} comparable completed run${samples.length===1?'':'s'}. Includes those runs’ corrections; this run may cost more. FX ${fx.rateDate}; not a quote or confirmed bill.`};
}
module.exports={estimateBrief};
