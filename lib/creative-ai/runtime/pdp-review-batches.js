'use strict';
const sharp=require('sharp');
// Every master and small preview is inspected; the final call compares the
// entire set. Never exceed the existing provider image limit or upgrade a
// failed/unknown batch through a later overview pass.
async function inspect({rows,previews,request,provider,budget,load,save,binding,continueOnError=false}){
 request={...request,instructions:request.instructions+' '+require('./reference-product').visibilityInstructions};
 const starts=Array.from({length:Math.ceil(rows.length/4)},(_,i)=>i*4);
 const batches=await require('./unit-scheduler').run(starts.map(start=>({conceptId:binding,placementId:String(start),start})),{limit:2,execute:async({start})=>{
  const part=rows.slice(start,start+4),ids=new Set(part.map(r=>r.placementId));
  const name='pdp-review-batch-'+binding+'-'+start+'.json';let result=await load(name);
  if(!result){
   try{result=await provider.reason({...request,instructions:request.instructions+' This is a bounded inspection batch. Assess the requested criteria only within the supplied slots. The twelve-slot requirement applies to the complete set, not this batch: absence of other batch slots is not a failure or uncertainty; cross-batch consistency is assessed separately afterward. Inspect each full master and its matching mobile preview.',input:{...request.input,set:{...request.input.set,slots:request.input.set.slots.filter(s=>ids.has(s.placementId))},manifest:request.input.manifest.filter(r=>ids.has(r.placementId))},images:[...part.map(r=>({id:'pdp-slot-'+r.index,label:'PDP slot '+r.index+' '+r.role,imageData:'data:image/'+(r.imageUrl.endsWith('.jpg')?'jpeg':r.imageUrl.endsWith('.webp')?'webp':'png')+';base64,'+r.bytes.toString('base64')})),...previews.filter(p=>part.some(r=>p.id==='pdp-mobile-'+r.index))]},budget);
   request.validate(result);await save(name,result);}catch(e){if(!continueOnError)throw e;result={checks:request.schema.properties.checks.items.properties.criterion.enum.map(criterion=>({criterion,status:'unknown',evidence:'This batch could not be inspected: '+String(e.message).slice(0,300)}))};}
  }else request.validate(result);
  return {slots:part.map(r=>r.index),checks:result.checks};
 }});
 const failed=batches.find(b=>b.status==='rejected');if(failed)throw failed.reason;
 const observations=batches.map(b=>b.value);
 const overviews=[];
 for(let start=0;start<rows.length;start+=4){
  const part=rows.slice(start,start+4),tiles=await Promise.all(part.map(async(r,i)=>({input:await sharp(r.bytes).resize(320,320,{fit:'contain',background:'white'}).png().toBuffer(),left:i*320,top:0})));
  const bytes=await sharp({create:{width:part.length*320,height:320,channels:3,background:'white'}}).composite(tiles).png().toBuffer();
  overviews.push({id:'pdp-overview-'+start,label:'Actual slots '+part.map(r=>r.index).join(', ')+' left to right; masters separately inspected',imageData:'data:image/png;base64,'+bytes.toString('base64')});
 }
 let result;try{result=await provider.reason({...request,instructions:request.instructions+' This is the final whole-gallery comparison. Full masters and mobile previews were inspected in the supplied batch observations. Compare all twelve actual slots in the overview rows for consistency, distinct purpose and contradictions. Acknowledge limitations; never erase a failed or unknown batch check.',input:{...request.input,batchObservations:observations},images:overviews},budget);
 request.validate(result);}catch(e){if(!continueOnError)throw e;result={checks:request.schema.properties.checks.items.properties.criterion.enum.map(criterion=>({criterion,status:'unknown',evidence:'Overview could not be inspected: '+String(e.message).slice(0,300)}))};}
 return {checks:result.checks.map(c=>{const all=[c,...observations.flatMap(b=>b.checks.filter(x=>x.criterion===c.criterion))];const status=all.some(x=>x.status==='fail')?'fail':all.some(x=>x.status==='unknown')?'unknown':'pass';return {...c,status,evidence:c.evidence+' Batch checks: '+observations.map(b=>b.slots.join(',')+' '+b.checks.find(x=>x.criterion===c.criterion).status).join('; ')};})};
}
module.exports={inspect};
