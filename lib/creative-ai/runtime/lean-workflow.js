'use strict';
const fs=require('./artifact-fs'),path=require('node:path'),sharp=require('sharp');
const {fingerprint}=require('../art-director'),policy=require('./lean-policy');
const planning=require('../experiments/lean-planner/planning');
const visual=require('../experiments/lean-planner/visual-review');
const correction=require('../experiments/lean-planner/correction');
const masked=require('./masked-image');
const hash=masked.hash,uri=bytes=>'data:image/png;base64,'+bytes.toString('base64');
async function read(runtime,id,name){try{return await fs.readJson(path.join(runtime.store.dir(id),name));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function plan(runtime,id,context){
 const {job,intake,budget,phase}=context,units=[],errors=[];
 if(!policy.enabled(intake))throw Error('Lean workflow is not pinned');
 for(const selection of require('./lean-context').groups(job.selection)){
  const key=fingerprint(selection.map(s=>s.id)).slice(0,20);
  try{
   const packet=require('./lean-context').packet(context,selection);
   const saved=await read(runtime,id,'lean-input-'+key+'.json');
   if(saved&&fingerprint(saved)!==fingerprint(packet.input))throw Error('Saved lean planning context changed; original retained');
   await runtime.store.save(id,'lean-input-'+key+'.json',packet.input);
   const output=await runtime.stage(id,'strategy','marketing-strategist','lean-plan-'+key+'.json',()=>runtime.provider.reason({contextKind:'lean-planning',strictSchema:true,instructions:planning.instructions+'\n'+require('./format-intent').principle,input:packet.input,images:packet.productRefs.map(a=>({id:a.assetId,label:'Exact selected SKU reference; appearance only',imageData:a.imageData})),schema:planning.schemaFor(packet.input),maxOutputTokens:Math.min(30000,10000+selection.length*2500),validate:o=>planning.validatePlan(o,packet.input)},budget));
   planning.validatePlan(output,packet.input);
   // Validate EVERY page before admitting any image from this set.
   const records=[];
   for(const page of output.pages){const s=selection.find(s=>s.id===page.id),logo=packet.input.requirements.pages.find(p=>p.id===page.id).logo;
    const prompt=planning.imagePrompt(output,packet.input,page),attachments=[...packet.productRefs,...(logo.treatment==='omit'?[]:[packet.logo])];
    for(const option of policy.options){const record={leanWorkflowVersion:1,assignmentId:id,brandId:intake.brandId,conceptId:require('../creative-director').conceptIdFor({assignmentId:id},option.route),route:option.route,placementId:s.id,canvas:s.description.dimensions,option,input:packet.input,plan:output,prompt,attachments,contextBinding:packet.binding};record.packageHash=fingerprint(record);records.push(record);}
   }
   for(const record of records)units.push(await require('./stage-handoff').saveUnit(runtime,id,record));
  }catch(e){errors.push({placementIds:selection.map(s=>s.id),error:e.message});await runtime.store.save(id,'lean-planning-error-'+key+'.json',{error:e.message,code:e.code||null,at:new Date().toISOString()});}
 }
 if(!units.length)throw Error('Planning could not prepare artwork: '+errors.map(e=>e.error).join('; '));
 await require('./stage-handoff').publish(runtime,id,units,job.selection.length*policy.options.length,errors);
 // Direct/manual callers retain the same staged dispatch as the normal queues.
 if(phase!=='planning')runtime.schedule(id);
}
function validateRecord(job,record){
 const {packageHash,...body}=record;
 if(!policy.enabled(job.intake)||record.leanWorkflowVersion!==1||record.assignmentId!==job.id||record.brandId!==job.intake.brandId||fingerprint(body)!==packageHash)throw Error('Lean image package binding changed');
 if(!policy.options.some(o=>JSON.stringify(o)===JSON.stringify(record.option)&&o.route===record.route)||record.conceptId!==require('../creative-director').conceptIdFor({assignmentId:job.id},record.route)||!job.selection.some(s=>s.id===record.placementId))throw Error('Lean option is outside this job');
 planning.validatePlan(record.plan,record.input);
 if(planning.imagePrompt(record.plan,record.input,record.plan.pages.find(p=>p.id===record.placementId))!==record.prompt)throw Error('Lean execution brief differs from its plan');
}
async function inspect(runtime,id,record,image,filename,budget,{original,decision}={}){
 const contract=visual.contract(record.input,record.plan,record.placementId);
 const images=[{id:'final-artwork',label:'Finished artwork to inspect',imageData:uri(image)},...record.attachments.map(a=>({id:a.assetId,label:a.roles.join(', ')+' reference',imageData:a.imageData}))];
 if(original){contract.requirements.push({id:'correction-integrity',name:'Correction integrity',expected:'Resolve the named defects without new copy errors, seams, smears, damaged product details or other blocking side effects. Compare against the original.'});contract.correction=decision;images.push({id:'original-artwork',label:'Before correction; compare for side effects only',imageData:uri(original)});}
 const output=await runtime.stage(id,'review','creative-reviewer',filename,()=>runtime.provider.reason({contextKind:'lean-review',strictSchema:true,instructions:visual.instructions,input:contract,images,schema:visual.schema,maxOutputTokens:16000,validate:o=>visual.validateReport(o,contract.requirements)},budget),{scope:{conceptId:record.conceptId,route:record.route,placementId:record.placementId}});
 return {status:'completed',report:visual.validateReport(output,contract.requirements),requirements:contract.requirements};
}
async function saveImage(runtime,id,name,bytes,scope){
 const meta=await sharp(bytes).metadata();if(!['png','jpeg','webp'].includes(meta.format))throw Error('Unsupported generated image');
 // Store a lossless PNG checkpoint for stable masked correction and previews.
 const png=meta.format==='png'?bytes:await sharp(bytes).png().toBuffer();
 await runtime.artifact(id,name,'image',png,scope);return {filename:name,sha256:hash(png),width:meta.width,height:meta.height};
}
async function imageBytes(runtime,id,item){const bytes=await fs.readFile(path.join(runtime.store.dir(id),item.filename));if(hash(bytes)!==item.sha256)throw Error('Saved artwork changed; automatic promotion stopped');return bytes;}
async function publishResult(runtime,id,record,state){
 const selected=state.selected==='candidate'?state.candidate:state.original;if(!selected)return;
 const report=state.selected==='candidate'?state.candidateReview:state.review;
 const result={conceptId:record.conceptId,route:record.route,placementId:record.placementId,imageUrl:'/creative-ai/api/jobs/'+id+'/files/'+selected.filename,width:selected.width,height:selected.height,sha256:selected.sha256,originalArtwork:true,editable:false,status:'available',ready:report?.report?.conclusion==='no_mismatch',qualityVerified:report?.report?.conclusion==='no_mismatch',imageModel:record.option.model,leanWorkflowVersion:1,visualReview:{status:report?.status||state.status,conclusion:report?.report?.conclusion||null},correction:state.decision?{action:state.decision.action,selected:state.selected==='candidate'}:null};
 await runtime.store.update(id,j=>{j.results=j.results.filter(r=>r.route!==record.route||r.placementId!==record.placementId);j.results.push(result);return j;});return result;
}
async function generate(runtime,id,record,budget){
 const job=await runtime.store.read(id);validateRecord(job,record);
 const key=fingerprint([record.route,record.placementId]).slice(0,24),stateFile='lean-state-'+key+'.json',scope={conceptId:record.conceptId,route:record.route,placementId:record.placementId};
 let state=await read(runtime,id,stateFile)||{version:1,packageHash:record.packageHash,status:'generating',selected:'original',startedAt:new Date().toISOString()};
 if(state.packageHash!==record.packageHash)throw Error('Lean checkpoint does not match its saved plan');
 if(state.original)await imageBytes(runtime,id,state.original);
 if(state.candidate)await imageBytes(runtime,id,state.candidate);
 if(state.status==='completed')return publishResult(runtime,id,record,state);
 const save=()=>runtime.store.save(id,stateFile,state),taskId='lean-artwork-'+key;
 await runtime.beginTask(id,'start-'+taskId,{scope,agent:'graphic-designer',description:'Creating artwork',outcome:'One shared plan, two complete image options.',details:{taskId,taskKind:'generation'}});
 try{
  if(!state.original){
   const request={prompt:record.prompt,attachments:record.attachments,quality:'high',model:record.option.model,size:record.option.model==='gpt-image-2'?require('./placements').generationSize(record.canvas.width,record.canvas.height).size:'auto',scope,resolvedLeanBrief:true,requestKey:fingerprint([id,record.packageHash,'original'])};
   await save();const result=await runtime.provider.generate(request,budget);
   state.original=await saveImage(runtime,id,'static-lean-'+key+'.png',Buffer.from(result.imageData.split(',')[1],'base64'),scope);state.status='checking';await save();await publishResult(runtime,id,record,state);
  }
  const original=await imageBytes(runtime,id,state.original);
  if(!state.review){state.status='checking';await save();state.review=await inspect(runtime,id,record,original,'lean-review-'+key+'.json',budget);await save();}
  const findings=state.review.report.checks.filter(c=>c.result==='clear_mismatch');
  if(findings.length){
   if(!state.decision){state.status='diagnosing';await save();state.decision=await runtime.stage(id,'review','creative-reviewer','lean-correction-plan-'+key+'.json',()=>runtime.provider.reason({contextKind:'lean-correction',strictSchema:true,instructions:correction.instructions,input:{findings,requirements:state.review.requirements},images:[{id:'finished-artwork',label:'Actual artwork',imageData:uri(original)},...record.attachments.map(a=>({id:a.assetId,label:a.roles.join(', '),imageData:a.imageData}))],schema:correction.schema,maxOutputTokens:10000,validate:d=>correction.validateDecision(d,findings)},budget),{scope});await save();}
   const decision=state.decision;correction.validateDecision(decision,findings);
   if(['local_edit','regenerate'].includes(decision.action)){
    let region,mask;
    if(decision.action==='local_edit'){region=correction.regionsMask(decision,state.original.width,state.original.height);mask=await masked.pngMask(region,state.original.width,state.original.height);}
    if(!state.candidate){
     state.status='correcting';await save();
     const sourceName='lean-anchor-'+key+'.png',maskName=mask?'lean-mask-'+key+'.png':null;
     await runtime.store.save(id,sourceName,original);if(mask)await runtime.store.save(id,maskName,mask);
     await runtime.store.save(id,'lean-binding-'+key+'.json',{brandId:record.brandId,scope,sourceName,sourceSha256:hash(original),maskName,maskSha256:mask?hash(mask):null});
     const anchor={assetId:'lean-artwork-anchor',bindingKey:key,ownership:'generated-project-reference',roles:['visual-style'],sha256:hash(original),imageData:uri(original)};
     const refRoles=record.attachments.map(a=>({role:a.roles.join(', ')}));
     // Renumber the execution brief when a saved artwork is prepended.
     const prompt=correction.promptFor({decision,findings},{attachments:refRoles},record.prompt.replace(/Product reference image\(s\) 1–(\d+)/g,(_,n)=>'Product reference image(s) 2–'+(Number(n)+1)).replace(/Image (\d+)/g,(_,n)=>'Image '+(Number(n)+1)).replace(/reference image (\d+)/g,(_,n)=>'reference image '+(Number(n)+1)));
     const result=await runtime.provider.generate({prompt,attachments:[anchor,...record.attachments],mask,quality:'high',model:record.option.model,size:record.option.model==='gpt-image-2'?require('./placements').generationSize(state.original.width,state.original.height).size:'auto',scope,resolvedLeanBrief:true,requestKey:fingerprint([id,record.packageHash,'correction',decision,hash(original)])},budget);
     const raw=Buffer.from(result.imageData.split(',')[1],'base64');
     await saveImage(runtime,id,'static-lean-candidate-raw-'+key+'.png',raw,scope);
     const restored=region?await masked.restore(original,raw,region,{transitionPixels:3}):{bytes:raw};
     if(region){state.maskProof={outsideMaskChangedPixels:restored.outsideMaskChangedPixels,maskedPixels:restored.maskedPixels};if(restored.outsideMaskChangedPixels!==0)throw Error('Correction changed protected pixels');}
     state.candidate=await saveImage(runtime,id,'static-lean-candidate-'+key+'.png',restored.bytes,scope);await save();
    }
    if(!state.candidateReview){state.status='checking-correction';await save();state.candidateReview=await inspect(runtime,id,record,await imageBytes(runtime,id,state.candidate),'lean-candidate-review-'+key+'.json',budget,{original,decision});await save();}
    if(correction.safeCandidate(state.candidateReview,state.candidateReview.requirements))state.selected='candidate';
   }
  }
  state.status='completed';state.finishedAt=new Date().toISOString();delete state.error;await save();const result=await publishResult(runtime,id,record,state);
  await runtime.finishTask(id,'complete-'+taskId,{scope,artifactRefs:[(state.selected==='candidate'?state.candidate:state.original).filename.replace(/\./g,'-')],agent:'graphic-designer',description:'Artwork saved',outcome:state.selected==='candidate'?'Verified correction selected; original preserved.':'Saved artwork retained with its conformance record.',details:{taskId,taskKind:'generation'}});return result;
 }catch(e){state.status='interrupted';state.error={message:e.message,code:e.code||null,at:new Date().toISOString()};await save();await publishResult(runtime,id,record,state);throw e;}
}
module.exports={plan,generate,validateRecord,inspect,publishResult};
