'use strict';
// Planner comparison follow-up (8 Nov 2026, user-approved small paid test):
// render ONE image per valid plan for D2 and S3 with the main Studio's first
// option (gpt-image-2, high) so only the plan differs. Same prompt builder
// (planning.imagePrompt), same exact-SKU/logo attachments and size as the saved
// source job's lean image package. No review or correction. Every image call
// reserves and writes receipts through a JobStore record in
// output/creative-ai/planner-experiments (scanned by the cost ledger).
// Source jobs are read only.
const path=require('node:path'),fsp=require('node:fs/promises');
const root=path.resolve(__dirname,'../../../..');
const afs=require('../../runtime/artifact-fs');
const {JobStore}=require('../../runtime/store');
const {loadConfig}=require('../../runtime/config');
const {OpenAIProvider}=require('../../runtime/provider');
const planning=require('../../lean/planning');
const {fingerprint}=require('../../art-director');
const {generationSize}=require('../../runtime/placements');
const {PACKETS,costOf}=require('./run');

const JOBS=path.join(root,'output/creative-ai/jobs');
const STORE=path.join(root,'output/creative-ai/planner-experiments');
const OUT=path.join(root,'work/planner-comparison-20261108');
const IMAGES=path.join(OUT,'images');
const MODELS=['sol','luna','argon'];
const IMAGE={model:'gpt-image-2',quality:'high'};

async function source(label){
 const p=PACKETS.find(x=>x.label.startsWith(label));const dir=path.join(JOBS,p.job);
 const job=await afs.readJsonRaw(path.join(dir,'job.json'));
 const input=await afs.readJsonRaw(path.join(dir,'lean-input-'+p.key+'.json'));
 const queue=await afs.readJsonRaw(path.join(dir,'image-queue.json'));
 if(queue.jobId!==p.job||queue.brandId!==job.intake.brandId)throw Error(label+': queue belongs to another project');
 const option=job.runtimeConfig.leanImageOptions[0];
 if(option.model!==IMAGE.model||option.quality!==IMAGE.quality)throw Error(label+': source first option is not gpt-image-2 high');
 const unit=queue.units.find(u=>u.route===option.route&&input.format.pages.some(pg=>pg.id===u.placementId));
 const record=await afs.readJson(path.join(dir,unit.file));// hydrated SKU/logo bytes
 if(record.brandId!==job.intake.brandId||fingerprint(record.input)!==fingerprint(input))throw Error(label+': saved package does not match its packet');
 // The reproduction must rebuild the production prompt exactly from the production plan.
 const page=record.plan.pages.find(x=>x.id===record.placementId);
 if(planning.imagePrompt(record.plan,input,page)!==record.prompt)throw Error(label+': prompt rebuild differs from the saved production prompt');
 if(record.attachments.some(a=>!/^data:image\//.test(a.imageData)))throw Error(label+': reference bytes unavailable');
 return {...p,title:p.label,label,job,input,record,brandId:job.intake.brandId};
}
function configFor(){
 const base=loadConfig(root);
 // Direct multipart upload (same bytes as the CDN route, no staging); one image per record.
 return {...base,distributed:null,imageModel:IMAGE.model,imageOptionModels:[IMAGE.model],imageInputTransport:'multipart',jobTimeoutMs:25*60*1000,initialStatus:'running',maxReasoningCalls:0,estimatedSpend:{...base.estimatedSpend,maxUsd:3}};
}
async function render(src,name,results,suffix=''){
 const planFile=path.join(OUT,'plans',src.label+'-'+name+'.json');
 const plan=await afs.readJsonRaw(planFile);
 planning.validatePlan(plan,src.input);
 const page=plan.pages.find(x=>x.id===src.record.placementId);
 const prompt=planning.imagePrompt(plan,src.input,page);
 const size=generationSize(src.record.canvas.width,src.record.canvas.height).size;
 const run=results.packets.find(x=>x.sourceJobId===src.job.id).runs[name];
 const store=new JobStore(STORE),requestKey='pcimg1108-'+src.label+'-'+name+suffix;
 const intake={brandId:src.brandId,costPurpose:'Testing',requestKey,plannerExperiment:{version:1,kind:'image-from-plan',sourceJobId:src.job.id,packetKey:src.key,planModel:run.model,planFile:path.relative(root,planFile),imageModel:IMAGE.model,quality:IMAGE.quality,label:src.label,...(suffix?{retryOf:'pcimg1108-'+src.label+'-'+name,retryReason:'earlier request failed during upload (connection closed, no response); its charge stays unknown in the ledger'}:{})}};
 const selection=src.job.selection.filter(s=>s.id===src.record.placementId);
 const job=await store.create(intake,configFor(),selection);
 const out=path.join(IMAGES,src.label+'-'+name+'.png');
 if(job.reused&&job.imageResult&&['finished','failed'].includes(job.status))return {...job.imageResult,reused:true};
 if(job.reused&&job.status!=='running')throw Error(requestKey+' already '+job.status+'; inspect '+job.id+' instead of paying again');
 const scope={conceptId:'planner-image-'+src.label+'-'+name+suffix,route:'continuity',placementId:src.record.placementId};
 const started=performance.now();let error=null,bytes=null;
 try{
  const r=await new OpenAIProvider(configFor()).generate({prompt,attachments:src.record.attachments,quality:IMAGE.quality,model:IMAGE.model,size,scope,resolvedLeanBrief:true,requestKey:fingerprint([job.id,fingerprint(plan),'original'])},store.budget(job.id));
  bytes=Buffer.from(r.imageData.split(',')[1],'base64');await fsp.writeFile(out,bytes);await store.save(job.id,'image.png',bytes);
 }catch(e){error=e.message;}
 const seconds=(performance.now()-started)/1000,saved=await store.read(job.id,{hydrate:false});
 const receipts=saved.budget.receipts.filter(r=>r.kind==='image');
 const result={jobId:job.id,requestKey,label:src.label,planModel:run.model,image:bytes?path.relative(root,out):null,size,promptCharacters:prompt.length,seconds,error,receipts:receipts.length,unresolvedReservations:saved.budget.imageReservations?.length||0,...costOf(receipts)};
 await store.update(job.id,j=>{j.status=bytes?'finished':'failed';j.error=error;j.imageResult=result;j.updatedAt=new Date().toISOString();return j;});
 return result;
}
async function main(){
 await fsp.mkdir(IMAGES,{recursive:true});
 const results=JSON.parse(await fsp.readFile(path.join(OUT,'results.json'),'utf8'));
 const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
 const labels=['D2','S3'].filter(l=>!only||only.includes(l)),sources=await Promise.all(labels.map(source));
 if(process.argv.includes('--dry-run')){for(const s of sources)for(const m of MODELS){const plan=await afs.readJsonRaw(path.join(OUT,'plans',s.label+'-'+m+'.json'));planning.validatePlan(plan,s.input);console.log(s.label,m,'prompt',planning.imagePrompt(plan,s.input,plan.pages[0]).length,'chars, refs',s.record.attachments.map(a=>a.roles.join('/')).join(', '),'size',generationSize(s.record.canvas.width,s.record.canvas.height).size);}return;}
 // --retry=S3:sol sends ONE new request (new ledgered record, sequential) after a transport failure.
 const retry=(process.argv.find(a=>a.startsWith('--retry='))?.slice(8).split(','))||[];
 let total=0;const all=[];
 const one=async(s,m)=>{
  let r=await render(s,m,results);
  if(retry.includes(s.label+':'+m)&&r.error){const failed=r;total+=failed.inr||0;r=await render(s,m,results,'-r2');r={...r,earlierTransportFailure:{jobId:failed.jobId,requestKey:failed.requestKey,error:failed.error,chargeStatus:'unknown (no provider response saved)'}};}
  return r;};
 const jobs=sources.flatMap(s=>MODELS.map(m=>[s,m]));
 await Promise.all(jobs.filter(([s,m])=>!retry.includes(s.label+':'+m)).map(async([s,m])=>report(s,m,await one(s,m))));
 for(const [s,m] of jobs.filter(([s,m])=>retry.includes(s.label+':'+m)))report(s,m,await one(s,m));
 function report(s,m,r){all.push(r);total+=r.inr||0;
  console.log(s.label,m,r.error?'FAILED: '+r.error.slice(0,200):'ok',Math.round(r.seconds||0)+'s','₹'+(r.inr||0).toFixed(2),'unknown receipts',r.unknownReceipts,'running ₹'+total.toFixed(2));
  if(total>400)console.error('Cost far above expectation (₹'+total.toFixed(2)+')');
 }
 const fx=results.fx;
 await fsp.writeFile(path.join(IMAGES,'images.json'),JSON.stringify({version:1,createdAt:new Date().toISOString(),image:IMAGE,fx,note:'One gpt-image-2 high render per plan, same prompt builder, references and size as the source job first option. USD list-price estimate; INR estimate at the dated rate.',totalUsd:all.reduce((n,r)=>n+(r.usd||0),0),totalInr:total,results:all.sort((a,b)=>(a.label+a.planModel).localeCompare(b.label+b.planModel))},null,1));
 console.log('Total ₹'+total.toFixed(2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
