'use strict';
// Recover only reviews that never dispatched because of the reproduced wire
// schema defect. Preserve baseline review records and all generated originals.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'work/cocoon-model-comparison');
const quality=require('../../lib/creative-ai/runtime/editable-quality'),editable=require('../../lib/creative-ai/runtime/editable');
async function main(){
 if(!process.argv.includes('--live'))throw Error('Explicit --live required');
 const label=process.argv.find(a=>a.startsWith('--label='))?.slice(8),e=JSON.parse(fs.readFileSync(path.join(out,'experiment.json'))),r=require('../../server').createServer().runtime;
 for(const run of e.runs.filter(x=>x.label===label)){
  if(run.status!=='finished')throw Error('Wait for this comparison run to finish');
  const id=run.id,dir=r.store.dir(id),job=await r.store.read(id),start=new Date().toISOString(),records=[];
  for(const result of job.results){
   const key=editable.key(result.route,result.placementId),state=JSON.parse(fs.readFileSync(path.join(dir,'editable-'+key+'.json'))),record=JSON.parse(await require('../../lib/creative-ai/runtime/artifact-fs').readFile(path.join(dir,'editable-source-package-'+key+'.json'),'utf8'));
   if(state.review.status!=='unavailable'||!state.review.error.includes('Input-context counting is unavailable'))throw Error('Recovery limited to the observed pre-dispatch count failure');
   const doc=state.original,initial=await editable.render(r,id,doc),review=await quality.reviewOnce(r,id,'comparison-recovery-decoded-'+key,doc,initial,record,r.store.budget(id));
   let corrected=null,correctionError=null;
   if(review.status==='complete'&&review.review.corrections.length){try{const rendered=await editable.render(r,id,review.document),issues=quality.geometry(review.document,rendered.measurements);require('../../lib/creative-ai/runtime/composition-guards').verifyReview(doc,review.document,review.review,rendered.measurements);if(issues.length)throw Error(issues.join('; '));const contrast=x=>x.issues.filter(i=>/low.*contrast/i.test(i)).length;if(contrast(rendered)>contrast(initial))throw Error('Correction worsens sampled contrast');const file='comparison-corrected-'+key+'.png';await r.store.save(id,file,Buffer.from(rendered.data.split(',')[1],'base64'));await r.store.save(id,'comparison-corrected-'+key+'.json',review.document);corrected={file,validation:rendered.issues,requiresManualReview:true};}catch(error){correctionError=error.message;}}
   const entry={route:result.route,status:review.status,error:review.error||null,review:review.review||null,corrected,correctionError,baselinePreserved:true};records.push(entry);console.log(JSON.stringify({label,route:result.route,status:review.status,corrected:!!corrected,error:entry.error,correctionError}));
  }
  const after=await r.store.read(id),fx=JSON.parse(fs.readFileSync(path.join(root,'output/cost-tracking/currency.json'))),rows=after.budget.receipts.filter(x=>x.recordedAt>=start).map(x=>({stage:x.optimisation?.stage,model:x.model,seconds:x.handoff?.responseElapsedMs/1000,estimatedINR:require('../../lib/cost-tracker').estimate(x)*fx.usdToInr})),report={label,id,startedAt:start,finishedAt:new Date().toISOString(),elapsedSeconds:(Date.now()-Date.parse(start))/1000,rows,estimatedINR:rows.reduce((s,r)=>s+r.estimatedINR,0),records};
  fs.writeFileSync(path.join(out,'review-'+label.toLowerCase()+'.json'),JSON.stringify(report,null,2));await r.store.save(id,'comparison-review-recovery.json',report);
 }
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
