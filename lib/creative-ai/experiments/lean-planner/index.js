'use strict';
// Opt-in experiment only. Nothing in the production engine imports this module.
const fs=require('node:fs/promises'), path=require('node:path'), crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {format,formats}=require('./formats');
const {compiledBrand,selectedBrand}=require('./context');
const {instructions,schema,schemaFor,validatePlan,imagePrompt}=require('./planning');
const BRAND='brand-1923d633-e03e-44cc-84b2-bbfb5c152710', PRODUCT='product-45b3f915e4bf3558c623';
const MODELS=[{id:'gpt-image-2',quality:'high'},{id:'gpt-image-2.6-sunburst',quality:'high'}];
const apiSize=(model,size)=>model==='gpt-image-2'?size:'auto';
const defaultBrief='Create a single-sided retail flyer for Duroflex Airboost 6.8 Arctic Ice. Help mattress shoppers understand its responsive fibres, latex comfort and adjustable firmness, then encourage them to explore Airboost on the official website. Warm and dependable, visually distinctive, with enough detail for a hand-held flyer. No price or offer.';
const digest=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
async function save(dir,name,value){await fs.mkdir(dir,{recursive:true});const f=path.join(dir,name),tmp=f+'.'+crypto.randomUUID()+'.pending';await fs.writeFile(tmp,typeof value==='string'?value:JSON.stringify(value,null,2));await fs.rename(tmp,f);}
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const outputRoot=root=>path.join(root,'output/imagegen/lean-planner');
async function packet(root,brief,formatId='flyer'){
 if(typeof brief!=='string'||!brief.trim()||brief.length>5000)throw Error('Brief must contain 1–5,000 characters.');
 const brandDir=path.join(root,'output/creative-ai/brands',BRAND),brand=await read(path.join(brandDir,'brand.json'));
 const product=await read(path.join(brandDir,'products',PRODUCT,'profile.json'));
 if(product.brandId!==BRAND)throw Error('Product brand mismatch');
 const context=await require('../../../../scripts/creative-ai/brand-generation-context').context(root,BRAND,product.pageUrl);
 const variant=product.variants.find(v=>String(v.id)==='51476984692868');
 if(!variant||variant.sku!=='AIRBOOST68AIPRO780060000800BLUE')throw Error('Exact Airboost Queen variant is unavailable');
 const selectedFacts=(product.audit?.facts||[]).filter(f=>['sku-fact-4','sku-fact-6','sku-fact-8'].includes(f.id)&&f.status==='supported');
 if(selectedFacts.length!==3)throw Error('Required source facts unavailable');
 const logo=brand.canvasAssets.logos.find(a=>a.id==='asset-6306adf45256a69ef7583b76'&&a.approved);
 if(!logo)throw Error('Approved logo missing');
 const productImage=product.assets.find(a=>a.file?.endsWith('media-a0f5814c8fac19b0.jpg'));
 if(!productImage)throw Error('Selected product reference missing');
 const references=[{role:'Exact SKU product appearance; not room, captions or layout inspiration',path:path.join(brandDir,'products',PRODUCT,productImage.file)}, {role:'Official red Duroflex logo identity',path:path.join(brandDir,'canvas-assets',logo.filename)}];
 for(const ref of references)ref.sha256=digest(await fs.readFile(ref.path));
 const selectedFormat=format(formatId),compiled=await compiledBrand(root,brand,context);
 const input={brief:brief.trim(),brand:selectedBrand(compiled,{productUrl:product.pageUrl,formatId:selectedFormat.formatId,profileId:selectedFormat.profileId}),
  product:{id:PRODUCT,name:'Airboost 6.8 Arctic Ice',variant,source:product.pageUrl,facts:selectedFacts.map(f=>({id:f.id,text:f.text,sourceIds:f.sourceIds})),appearance:'Blue/white wavy top; navy ribbed sides; genuine airboost, DUROFLEX and DUROPEDIC labels. Reference has a cutaway and bedroom; neither is required. Do not infer new layers or properties.'},
  format:selectedFormat,
  constraints:['Preserve exact SKU identity and source qualifiers.','No prices, offers, medical promises, invented QR/contact details or certifications.','Official destination: duroflexworld.com.','No library mood pixels; use verbal brand guidance.','Planner decides copy density and hierarchy for this format; no fixed word quota.']};
 input.spatialPlanningVersion=1;
 input.requirements=require('./requirements').resolve(selectedFormat);
 input.format.guidance.mandatory.push(...input.requirements.pages.map(p=>p.rule));
 return {input,references:input.format.text==='none'?references.slice(0,1):references,context,compiled,provenance:{brandId:BRAND,productId:PRODUCT,variantId:variant.id,source:product.pageUrl,productSnapshot:product.snapshot,brandRevision:context.brandKnowledge.revision}};
}
async function list(root){await fs.mkdir(outputRoot(root),{recursive:true});const rows=[];for(const id of await fs.readdir(outputRoot(root))){if(!/^lean-[a-z0-9-]+$/.test(id))continue;try{rows.push(await require('./correction').decorate(root,await require('./visual-review').decorate(root,await read(path.join(outputRoot(root),id,'run.json')))));}catch{}}return rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
async function create(root,brief,requestId,formatId='flyer'){
 if(typeof brief!=='string'||!brief.trim()||brief.length>5000)throw Error('Brief must contain 1–5,000 characters.');
 const selectedFormat=format(formatId);
 if(!/^[a-z0-9-]{12,80}$/.test(requestId||''))throw Error('Valid request ID required');
 const id='lean-'+requestId,dir=path.join(outputRoot(root),id);
 try{const old=await read(path.join(dir,'run.json'));if(old.brief!==brief||(old.formatId||'flyer')!==formatId)throw Error('Request ID already used for a different brief');return old;}catch(e){if(e.code!=='ENOENT')throw e;}
 const run={id,brief,version:2,formatId,formatName:selectedFormat.name,pageCount:selectedFormat.pages.length,createdAt:new Date().toISOString(),plannerRecovery:{version:1},plannerSettings:{model:'gpt-6-astra',reasoningEffort:'medium'},visualReviewPolicy:1,correctionPolicy:1,status:'queued',models:MODELS.map(m=>({...m,status:'queued',costINR:null})),costINR:null};
 await save(dir,'run.json',run);return run;
}
async function execute(root,run,options={}){
 return require('../../runtime/file-lock').withLock(require('./planner-recovery').lockFile(path.join(outputRoot(root),run.id)),async()=>executeUnlocked(root,await read(path.join(outputRoot(root),run.id,'run.json')),options),{timeoutMs:0});
}
async function executeUnlocked(root,run,{resumePlan=false}={}){
 const dir=path.join(outputRoot(root),run.id),config=require('../../runtime/config').loadConfig(root);
 const update=async()=>save(dir,'run.json',run),started=Date.now(),priorElapsed=resumePlan?(run.elapsedSeconds||0):0;
 try{
  let resumed;
  if(resumePlan){
   if(run.status!=='interrupted'||run.version!==2||run.models.some(m=>m.status!=='queued'||m.pages?.length))throw Error('Only a completed plan with no dispatched images can resume here');
   resumed=await read(path.join(dir,'planner-response.json'));
   const request=await read(path.join(dir,'planner-request.json'));
   if(resumed.status!=='completed'||resumed.id!==run.planner?.responseId||request.model!==run.planner.model)throw Error('Saved planner response is not completed or bound to this run');
  }else if(run.status!=='queued')throw Error('Saved run is not queued; do not replay ambiguous provider work');
  const preflight=await require('../../local-queue/cost-preflight.cjs').preflight(root);
  const prior=(await list(root)).filter(r=>r.id!==run.id).reduce((n,r)=>n+(r.allowanceINR||0),0);
  run.allowanceINR=10000; // Conservative exposure allowance, not a claimed cost.
  if(run.allowanceINR>preflight.perJobInr||preflight.remainingInr-preflight.additionalUnknownReserveInr-prior<run.allowanceINR)throw Error('Testing allowance unavailable');
  await save(dir,'budget-preflight.json',{...preflight,priorExperimentAllowanceINR:prior,thisRunAllowanceINR:run.allowanceINR});
  let data,result,began;
  if(resumePlan){
   const input=await read(path.join(dir,'planner-input.json')),provenance=await read(path.join(dir,'provenance.json')),request=await read(path.join(dir,'planner-request.json'));
   if(request.input!==JSON.stringify(input)||input.brief!==run.brief.trim()||input.format.id!==run.formatId)throw Error('Saved planner input binding mismatch');
   for(const ref of provenance.references)if(digest(await fs.readFile(ref.path))!==ref.sha256)throw Error('Saved reference changed; cannot reuse this plan');
   data={input,references:provenance.references};result=resumed;
   run.recoveries=[...(run.recoveries||[]),{at:new Date().toISOString(),previousError:run.error,action:'Validate saved completed plan and dispatch images only',responseId:resumed.id}];
   delete run.error;delete run.finishedAt;
  }else{
  data=await packet(root,run.brief,run.formatId);await save(dir,'compiled-brand-context.json',data.compiled);await save(dir,'brand-context.json',data.context);await save(dir,'planner-input.json',data.input);await save(dir,'provenance.json',{...data.provenance,references:data.references});
  run.status='planning';run.planner={model:run.plannerSettings?.model||config.roleModels.strategy.model,reasoningEffort:run.plannerSettings?.reasoningEffort||config.roleModels.strategy.reasoningEffort,inputCharacters:JSON.stringify(data.input).length,images:0};await update();
  const body={model:run.planner.model,reasoning:{effort:run.planner.reasoningEffort},instructions,input:JSON.stringify(data.input),max_output_tokens:10000,store:true,background:true,text:{format:{type:'json_schema',name:'lean_plan',strict:true,schema:schemaFor(data.input)}}};
  await save(dir,'planner-request.json',body);
  began=Date.now();
  if(run.plannerRecovery?.version===1){run.plannerRecovery.deadlineAt=new Date(began+45*60*1000).toISOString();await update();}
  let response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+config.apiKey,'Content-Type':'application/json','X-Client-Request-Id':run.id},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
  result=await response.json();await save(dir,'planner-response.json',result);
  if(!response.ok)throw Error('Planner request rejected: '+JSON.stringify(result.error));
  run.planner.responseId=result.id;await update();
  while(['queued','in_progress'].includes(result.status)){
   if(Date.now()-began>15*60*1000)throw Object.assign(Error('Planning is taking longer than usual; tracking the saved response.'),{code:'PLANNER_PENDING'});
   await new Promise(r=>setTimeout(r,3000));response=await fetch('https://api.openai.com/v1/responses/'+encodeURIComponent(result.id),{headers:{Authorization:'Bearer '+config.apiKey},signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error('Planner retrieval interrupted; saved response ID retained');result=await response.json();await save(dir,'planner-response.json',result);
  }
  }
  if(!resumePlan){run.planner.elapsedSeconds=(Date.now()-began)/1000;run.planner.usage=result.usage||null;}
  if(result.status!=='completed')throw Error('Planner did not complete: '+result.status);
  const plan=validatePlan(JSON.parse(result.output.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('')),data.input);
  await save(dir,'plan.json',plan);
  const prompts=data.input.format.pages.map(target=>({target,prompt:imagePrompt(plan,data.input,plan.pages.find(p=>p.id===target.id))}));
  for(const {target,prompt} of prompts)await save(dir,'image-prompt-'+target.id+'.txt',prompt);
  await save(dir,'image-prompt.txt',prompts.map(p=>p.prompt).join('\n\n--- NEXT PAGE ---\n\n'));
  run.plan=plan;run.promptCharacters=prompts.reduce((n,p)=>n+p.prompt.length,0);run.promptHash=digest(prompts);run.status='generating';await update();
  const python=process.env.LEAN_IMAGE_PYTHON||path.join(root,'work/airboost-three-models-20261106/venv/bin/python');
  const cli=process.env.IMAGE_GEN_CLI||path.join(require('node:os').homedir(),'.codex/skills/.system/imagegen/scripts/image_gen.py');
  // Two image workers total; sets preserve all pages without multiplying load.
  await Promise.all(run.models.map(async m=>{
   const t=Date.now();m.status='generating';m.startedAt=new Date().toISOString();m.pages=[];await update();
   for(const {target} of prompts){
    const item={id:target.id,name:target.name,status:'generating',size:target.size};item.requestSize=apiSize(m.id,target.size);m.pages.push(item);await update();
    const began=Date.now(),filename=m.id+'-'+target.id+'.png';
    const args=[cli,'edit','--model',m.id,'--quality',m.quality,'--size',item.requestSize,'--prompt-file',path.join(dir,'image-prompt-'+target.id+'.txt'),'--no-augment','--out',path.join(dir,filename),...require('./requirements').references(data.input,target.id,data.references).flatMap(r=>['--image',r.path])];
    try{await new Promise((resolve,reject)=>{const child=spawn(python,args,{cwd:root,env:{...process.env,OPENAI_API_KEY:config.apiKey}});let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);child.on('error',reject);child.on('close',async code=>{try{await save(dir,m.id+'-'+target.id+'.log',log);code===0?resolve():reject(Error('Image CLI exited '+code+'; see saved log'));}catch(e){reject(e);}});});
     const bytes=await fs.readFile(path.join(dir,filename));if(bytes.length<100)throw Error('Image output missing');item.actualSize=bytes.readUInt32BE(16)+'x'+bytes.readUInt32BE(20);item.sha256=digest(bytes);item.file=filename;item.status='completed';
    }catch(e){item.status='interrupted';item.error=e.message;}finally{item.elapsedSeconds=(Date.now()-began)/1000;await update();}
   }
   m.status=m.pages.every(p=>p.status==='completed')?'completed':'partial';m.elapsedSeconds=(Date.now()-t)/1000;await update();
  }));
  run.status=run.models.every(m=>m.status==='completed')?'completed':'partial';
 }catch(e){run.status=run.plannerRecovery?.version===1&&run.planner?.responseId&&(e.code==='PLANNER_PENDING'||!run.plan&&await read(path.join(dir,'planner-response.json')).then(r=>['queued','in_progress'].includes(r.status)).catch(()=>false))?'planning_pending':'interrupted';run.error=run.status==='planning_pending'?undefined:e.message;if(run.status==='planning_pending')run.plannerRecovery.message=e.message;}
 run.elapsedSeconds=priorElapsed+(Date.now()-started)/1000;run.finishedAt=new Date().toISOString();await update();
 if((run.visualReviewPolicy===1||run.correctionPolicy===1)&&['completed','partial'].includes(run.status))await require('./finishing').finishRun(root,run.id);
 return read(path.join(dir,'run.json'));
}
// Retry only the known local CLI size rejection: this evidence establishes that
// no provider request was sent. Unknown/network outcomes are deliberately excluded.
async function retryLocalSize(root,id){
 const dir=path.join(outputRoot(root),id),run=await read(path.join(dir,'run.json'));
 if(run.status!=='partial')throw Error('No partial comparison to recover');
 const m=run.models.find(m=>m.id==='gpt-image-2.6-sunburst'),item=m?.pages?.find(p=>p.status==='interrupted');
 if(!item||m.pages.filter(p=>p.status==='interrupted').length!==1)throw Error('Expected one local size rejection');
 const oldLog=await fs.readFile(path.join(dir,m.id+'-'+item.id+'.log'),'utf8');
 if(oldLog.trim()!=='Error: size must be one of 1024x1024, 1536x1024, 1024x1536, or auto for this GPT Image model.')throw Error('Outcome not proven local; do not resubmit');
 if(item.retryAttempt)throw Error('Local correction already attempted; reconcile before retrying');
 const provenance=await read(path.join(dir,'provenance.json'));
 const retryReferences=require('./requirements').references(await read(path.join(dir,'planner-input.json')),item.id,provenance.references);
 for(const ref of provenance.references)if(digest(await fs.readFile(ref.path))!==ref.sha256)throw Error('Reference changed');
 const budget=await require('../../local-queue/cost-preflight.cjs').preflight(root);
 const prior=(await list(root)).reduce((n,r)=>n+(r.allowanceINR||0),0);
 if(budget.remainingInr-budget.additionalUnknownReserveInr-prior<0)throw Error('Existing comparison allowance exceeds remaining budget');
 const config=require('../../runtime/config').loadConfig(root),python=process.env.LEAN_IMAGE_PYTHON||path.join(root,'work/airboost-three-models-20261106/venv/bin/python'),cli=process.env.IMAGE_GEN_CLI||path.join(require('node:os').homedir(),'.codex/skills/.system/imagegen/scripts/image_gen.py');
 run.recoveries.push({at:new Date().toISOString(),previousError:item.error,action:'Retry Sunburst only after local size rejection; supported auto sizing, same saved prompt and references'});
 item.attempts=[{status:item.status,error:item.error,elapsedSeconds:item.elapsedSeconds,requestSize:item.size,log:m.id+'-'+item.id+'.log'}];
 item.retryAttempt=1;item.requestSize='auto';item.status='generating';delete item.error;m.status='generating';run.status='generating';delete run.finishedAt;await save(dir,'run.json',run);
 const filename=m.id+'-'+item.id+'.png',t=Date.now();
 try{await new Promise((resolve,reject)=>{const child=spawn(python,[cli,'edit','--model',m.id,'--quality',m.quality,'--size','auto','--prompt-file',path.join(dir,'image-prompt-'+item.id+'.txt'),'--no-augment','--out',path.join(dir,filename),...retryReferences.flatMap(r=>['--image',r.path])],{cwd:root,env:{...process.env,OPENAI_API_KEY:config.apiKey}});let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);child.on('error',reject);child.on('close',async code=>{try{await save(dir,m.id+'-'+item.id+'-retry.log',log);code===0?resolve():reject(Error('Image CLI exited '+code+'; see retry log'));}catch(e){reject(e);}});});const bytes=await fs.readFile(path.join(dir,filename));item.file=filename;item.sha256=digest(bytes);item.actualSize=bytes.readUInt32BE(16)+'x'+bytes.readUInt32BE(20);item.status='completed';}
 catch(e){item.status='interrupted';item.error=e.message;}
 item.elapsedSeconds=(Date.now()-t)/1000;m.elapsedSeconds+=item.elapsedSeconds;run.elapsedSeconds+=item.elapsedSeconds;m.status=m.pages.every(p=>p.status==='completed')?'completed':'partial';run.status=run.models.every(m=>m.status==='completed')?'completed':'partial';run.finishedAt=new Date().toISOString();await save(dir,'run.json',run);return run;
}
module.exports={apiSize,retryLocalSize,BRAND,PRODUCT,MODELS,defaultBrief,packet,formats,validatePlan,imagePrompt,schema,create,execute,list,outputRoot};
