'use strict';
const fs=require('./artifact-fs'),path=require('path'),crypto=require('crypto');
const {withLock}=require('./file-lock'),{JobStore}=require('./store'),tools=require('./component-repair-tools');
const hash=v=>crypto.createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const active=new Map();
function issue(message){const d=require('./component-recovery').diagnose(message);return {...d,category:['request','transport','export'].includes(d.component)?'processing':/^Advisory: /.test(message)?'advisory':'defect',likelyCause:d.explanation,reusable:['approved product evidence','campaign direction','unaffected placements'],permittedActions:['typography','logo','background','export','transport'].includes(d.component)?[d.component]:[]};}
function canResumePreparation(entry){return entry?.status==='needs-attention'&&entry.calls===0&&entry.requestKeys?.length===0&&(entry.preparationRetries||0)<2&&(entry.errorCode==='IMAGE_REFERENCE_UPLOAD_FAILED'||entry.error==='Reference upload could not finish. No image generation was started.');}
async function inspect(runtime,id,input){
 const unit={route:input.route,placementId:input.placementId};
 const job=await runtime.store.read(id,{hydrate:false});
 if(!['continuity','exploration'].includes(unit.route)||!job.selection.some(p=>p.id===unit.placementId))throw Error('Unknown campaign placement');
 const result=job.results.find(r=>r.route===unit.route&&r.placementId===unit.placementId),failure=job.unitErrors?.find(r=>r.route===unit.route&&r.placementId===unit.placementId);
 const issues=[failure?.error,...(result?.validation||[])].filter(Boolean).map(issue).filter(i=>i.category!=='advisory');
 const componentKey=hash(unit.route+'|'+unit.placementId),previous=job.componentRepairs?.[componentKey];
 let state=null;try{state=await runtime.editable.read(id,unit.route,unit.placementId);}catch(e){if(e.code!=='ENOENT')throw e;}
 const sourceHash=hash({result:result||null,revision:state?.revision??null,document:state?.document||null,issues});
 const spend=job.budget.estimatedSpend,remainingUsd=spend?Math.max(0,spend.maxUsd-spend.reservedUsd):0;
 let reason=null;
 if(result?.ready)reason='This design already passed its checks.';
 else if(previous&&!canResumePreparation(previous))reason='The single correction attempt is '+previous.status+'. Its evidence and costs are preserved.';
 else if(!issues.length)reason='No diagnosed defect is available for automatic repair.';
 else if(issues.some(i=>!i.permittedActions.length))reason='This defect requires diagnosis before an automatic repair is safe.';
 else if(state?.revision>0&&issues.some(i=>i.component==='typography'||i.component==='logo'))reason='This design has user edits. Layout recovery requires a separate reviewed candidate; automatic recovery will not replace them.';
 else if(Object.values(job.providerWaits||{}).some(w=>['waiting','attention'].includes(w.status)))reason='An accepted provider response is unresolved. Retrieve it before another submission.';
 if(!reason){const recovery=await require('../local-queue/recovery.cjs').inspect(job,runtime.store.dir(id));if(!recovery.safe||recovery.pending.length)reason='A provider request is pending or has an ambiguous outcome. Reconcile its saved response before another submission.';}
 const actions=[...new Set(issues.flatMap(i=>i.permittedActions))];
 if(actions.includes('transport')&&!result?.editable)reason='Resume the saved provider response through its original operation; no replacement request is authorized by this repair.';
 const imageReserve=actions.some(a=>['typography','logo','background'].includes(a))?spend?.imageUsd||0:0;
 const reviewMaxCalls=actions.length===1&&actions[0]==='export'?0:Math.max(1,Math.min(2,job.budget.maxReasoningCalls-job.budget.reasoningCalls,spend?.reasoningUsd?Math.floor(Math.max(0,remainingUsd-imageReserve)/spend.reasoningUsd):1));
 const maximumUsd=imageReserve+reviewMaxCalls*(spend?.reasoningUsd||0);
 const needsImage=actions.some(a=>['typography','logo','background'].includes(a)),needsReview=!(actions.length===1&&actions[0]==='export');
 if(!reason&&needsReview&&!spend)reason='This campaign has no saved monetary allowance for paid repair.';
 if(!reason&&needsImage&&job.budget.imageCalls>=job.budget.maxImageCalls)reason='The campaign image-call allowance is exhausted. No repair attempt was started.';
 if(!reason&&needsReview&&job.budget.reasoningCalls>=job.budget.maxReasoningCalls)reason='The campaign review-call allowance is exhausted. No repair attempt was started.';
 if(!reason&&remainingUsd<maximumUsd)reason='The campaign allowance cannot cover this repair reservation.';
 return {version:1,brandId:job.intake.brandId,...unit,componentKey,sourceHash,token:hash({id,brandId:job.intake.brandId,componentKey,sourceHash,actions}),issues,actions,available:!reason,reason,previous:previous||null,reviewMaxCalls,maximumUsd,remainingUsd,monetaryPolicy:'Original campaign allowance; usage and actual billing recorded separately.'};
}
async function status(runtime,id){const job=await runtime.store.read(id,{hydrate:false});return job.componentRepairs||{};}
async function start(runtime,id,input,{automatic=false}={}){
 const unit={route:input.route,placementId:input.placementId},key=hash(unit.route+'|'+unit.placementId);
 return withLock(path.join(runtime.store.dir(id),'.component-start-'+key+'.lock'),async()=>{
  const plan=await inspect(runtime,id,unit);
  if(!automatic&&input.brandId!==plan.brandId)throw Error('Repair belongs to a different brand');
  if(plan.previous&&!canResumePreparation(plan.previous))return plan.previous;
  if(!plan.available)throw Error(plan.reason);
  if(!automatic&&(input.brandId!==plan.brandId||input.token!==plan.token))throw Error('The design changed. Refresh its repair plan before continuing.');
  if(!automatic&&['running','queued'].includes((await runtime.store.read(id,{hydrate:false})).status))throw Error('Let the current campaign operation finish before requesting another repair.');
  await tools.context(runtime,id,unit); // Fail before reservation when required checkpoints are absent.
  const entry={...(plan.previous||{}),preparationRetries:(plan.previous?.preparationRetries||0)+(plan.previous?1:0),attemptHistory:[...(plan.previous?.attemptHistory||[]),...(plan.previous?[{status:plan.previous.status,error:plan.previous.error,finishedAt:plan.previous.finishedAt}]:[])],version:1,key,unit,actions:plan.actions,issues:plan.issues,sourceHash:plan.sourceHash,status:'repairing',error:null,errorCode:null,finishedAt:null,ownerPid:process.pid,startedAt:new Date().toISOString(),deadline:Date.now()+45*60*1000,calls:0,reviewMaxCalls:plan.reviewMaxCalls,maxCalls:plan.reviewMaxCalls+(plan.actions.some(a=>['typography','logo','background'].includes(a))?1:0),reservedUsd:0,imageCalls:0,maxImageCalls:1,maximumUsd:plan.maximumUsd,requestKeys:[],receiptIds:[],automatic};
  await runtime.store.update(id,j=>{j.componentRepairs??={};if(j.componentRepairs[key]&&!canResumePreparation(j.componentRepairs[key]))throw Error('Repair already reserved');j.componentRepairs[key]=entry;return j;});
  const work=run(runtime,id,key).catch(async e=>{let candidateAvailable=false;try{await fs.stat(path.join(runtime.store.dir(id),'component-repairs',key,'after.png'));candidateAvailable=true;}catch{}await runtime.store.update(id,j=>{Object.assign(j.componentRepairs[key],{status:'needs-attention',error:e.message,errorCode:e.code||null,candidateAvailable,finishedAt:new Date().toISOString()});return j;});}).finally(async()=>{await account(runtime,id,key);active.delete(id+'|'+key);});active.set(id+'|'+key,work);return entry;
 });
}
async function account(runtime,id,key){
 const job=await runtime.store.read(id,{hydrate:false}),entry=job.componentRepairs[key],receipts=job.budget.receipts.filter(r=>r.componentRepair?.key===key),{estimate,validFx}=require('../../cost-tracker');let fx=null;try{fx=validFx(await fs.readJson(path.join(runtime.root,'output/cost-tracking/currency.json')));}catch{}const estimates=receipts.map(estimate),unresolved=entry.requestKeys.filter(q=>!receipts.some(r=>r.kind===q.kind&&r.requestKey===q.key)).length;
 await runtime.store.update(id,j=>{j.componentRepairs[key].costs={currency:'INR',estimatedInr:fx?estimates.reduce((n,v)=>n+(v||0),0)*fx.usdToInr:null,actualInr:null,unknownRecords:estimates.filter(v=>v==null).length+unresolved,fx,receiptCount:receipts.length};return j;});
}
async function run(runtime,id,key){
 const job=await runtime.store.read(id),entry=job.componentRepairs[key],ctx=await tools.context(runtime,id,entry.unit),root=path.join(runtime.store.dir(id),'component-repairs'),store=new JobStore(root),dir=store.dir(key);
 await fs.mkdir(dir,{recursive:true});await store.save(key,'job.json',{id,parentJobId:id,intake:{brandId:job.intake.brandId,brandUrl:job.intake.brandUrl},purpose:'Isolated component repair media scope; billing belongs to parent'});await store.save(key,'repair-plan.json',entry);
 await store.save(key,'before-state.json',{...(ctx.state||{}),result:job.results.find(r=>r.route===entry.unit.route&&r.placementId===entry.unit.placementId)||null});
 // Copy only local render dependencies; all original checkpoints remain immutable.
 for(const name of await fs.readdir(ctx.dir))if((name.startsWith('editor-')||name.includes(ctx.k))&&/\.(png|ttf|otf|woff2?)$/.test(name))await store.save(key,name,await fs.readFile(path.join(ctx.dir,name)));
 const candidate=Object.create(runtime);candidate.store={...runtime.store,dir:()=>dir,read:(...a)=>runtime.store.read(...a),save:(_,name,value)=>store.save(key,name,value)};
 const base=runtime.store.budget(id,{componentKey:key}),budget={...base,reserve:async(kind,requestKey)=>{await base.reserve(kind,requestKey);},receipt:async receipt=>{await base.receipt({...receipt,componentRepair:{key,route:entry.unit.route,placementId:entry.unit.placementId,actions:entry.actions}});await runtime.store.update(id,j=>{j.componentRepairs[key].receiptIds.push(receipt.requestId||receipt.requestKey);return j;});}};
 const built=await tools.build(candidate,id,ctx,entry.actions,key,budget);
 await store.save(key,'outcome.json',{readiness:built.readiness,sourceHash:built.sourceHash,outputHash:built.outputHash});
 if(!built.readiness.ready){await runtime.store.update(id,j=>{Object.assign(j.componentRepairs[key],{status:'needs-attention',error:built.readiness.userNote,finishedAt:new Date().toISOString(),candidateAvailable:true});return j;});return;}
 if(built.sourceHash===built.outputHash&&entry.actions.some(a=>['typography','logo','background'].includes(a)))throw Error('The candidate did not change the diagnosed defect; no repeat was dispatched');
 await promote(runtime,id,key,ctx,built,store);
}
async function promote(runtime,id,key,ctx,built,store){
 const k=ctx.k,queueKey=id+'|'+k,queues=runtime.editable.queues;
 const work=(queues.get(queueKey)||Promise.resolve()).catch(()=>{}).then(()=>withLock(path.join(runtime.store.dir(id),'.component-promote-'+k+'.lock'),async()=>{
  const current=await inspect(runtime,id,ctx.record),job=await runtime.store.read(id),entry=job.componentRepairs[key];
  if(current.sourceHash!==entry.sourceHash)throw Error('The source design changed during repair. Candidate retained; user edits were not replaced.');
  const imageName='static-component-'+key+'.png';await runtime.store.save(id,built.photoName,await fs.readFile(path.join(store.dir(key),built.photoName)));await runtime.store.save(id,imageName,Buffer.from(built.rendered.data.split(',')[1],'base64'));
  const now=new Date().toISOString(),revision=(ctx.state?.revision??-1)+1,versionFile='editable-'+k+'-component-'+key+'.json';
  await runtime.store.save(id,versionFile,built.doc);
  const state={...(ctx.state||{}),version:1,jobId:id,route:ctx.record.route,placementId:ctx.record.placementId,original:ctx.state?.original||built.doc,document:built.doc,revision,review:built.summary,validation:[],assetRegistry:[...(ctx.state?.assetRegistry||ctx.state?.document.assets||[]),...built.doc.assets],fontRegistry:built.doc.fonts,history:[...(ctx.state?.history||[]),{revision,file:versionFile,createdAt:now,origin:'component-repair',repairKey:key}],updatedAt:now};
  const result={conceptId:ctx.record.conceptId,route:ctx.record.route,placementId:ctx.record.placementId,imageUrl:'/creative-ai/api/jobs/'+id+'/files/'+imageName,editable:true,editableUrl:'/creative-ai/api/jobs/'+id+'/editable/'+ctx.record.route+'/'+ctx.record.placementId,...built.readiness,validation:[],editableReview:built.summary,componentRepairKey:key,correctionCycles:1,readinessBasis:'automated-checks'};
  // Preserve original result and editor state in the candidate folder before replacing current pointers.
  await runtime.store.save(id,'editable-'+k+'.json',state);
  await runtime.store.update(id,j=>{j.results=j.results.filter(r=>r.route!==result.route||r.placementId!==result.placementId).concat(result);j.unitErrors=(j.unitErrors||[]).filter(r=>r.route!==result.route||r.placementId!==result.placementId);Object.assign(j.componentRepairs[key],{status:'ready',error:null,errorCode:null,promotedAt:now,finishedAt:now,candidateAvailable:true,imageUrl:result.imageUrl});return j;});
 }));queues.set(queueKey,work);return work;
}
async function automatic(runtime,id,record,budget,generate){
 let error,result;try{result=await generate();}catch(e){error=e;}
 const job=await runtime.store.read(id,{hydrate:false});if(job.intake.componentRecoveryVersion!==1)return error?Promise.reject(error):result;
 if(error)await runtime.store.update(id,j=>{j.unitErrors??=[];j.unitErrors=j.unitErrors.filter(u=>u.route!==record.route||u.placementId!==record.placementId).concat({route:record.route,placementId:record.placementId,error:error.message});return j;});
 const plan=await inspect(runtime,id,record);
 if(plan.available){try{await start(runtime,id,record,{automatic:true});await active.get(id+'|'+plan.componentKey);}catch(e){if(!error)error=e;}}
 const final=(await runtime.store.read(id,{hydrate:false})).results.find(r=>r.route===record.route&&r.placementId===record.placementId);if(final?.ready||!error)return final||result;throw error;
}
module.exports={inspect,start,status,run,automatic,issue,active,canResumePreparation};
