'use strict';
// Planner model comparison (8 Nov 2026, user-approved small paid test).
// Replays saved main-Studio lean planning packets through the SAME request the
// lean workflow sends (instructions + format principle, packet input, exact SKU
// photos, schema, validator, bounded repair) with a different planning model.
// Every paid call reserves and writes receipts through a JobStore record under
// output/creative-ai/planner-experiments, which the shared cost ledger scans.
// Existing jobs are read only.
const path=require('node:path'),fsp=require('node:fs/promises');
const root=path.resolve(__dirname,'../../../..');
const afs=require('../../runtime/artifact-fs');
const {JobStore}=require('../../runtime/store');
const {loadConfig}=require('../../runtime/config');
const {OpenAIProvider,bindConstants}=require('../../runtime/provider');
const vertex=require('../../runtime/vertex-provider');
const planning=require('../../lean/planning');
const {principle}=require('../../runtime/format-intent');
const {fingerprint}=require('../../art-director');
const {estimate}=require('../../../cost-tracker');
const check=require('../../marketing-strategist/schema-validator').check;

const JOBS=path.join(root,'output/creative-ai/jobs');
const STORE=path.join(root,'output/creative-ai/planner-experiments');
const OUT=path.join(root,'work/planner-comparison-20261108');
// planning.js last changed 2026-11-08 09:09 UTC. Saved gpt-6.1-sol plans produced
// before that used older instructions/validators, so those packets are re-run fresh.
const PLANNER_CHANGED='2026-11-08T09:09:00Z';
const PACKETS=[
 {label:'D1 WhatsApp card · Hindi',job:'creative-fa9c58c6-bc6b-4996-b904-bc8018d9f94a',key:'4b46161189ec17d3763c'},
 {label:'D2 Website banner · English',job:'creative-b257aa22-8f1d-478b-9e41-0872a3066d8e',key:'fdab1b373a8cbb18484c'},
 {label:'D3 Portrait post · English',job:'creative-e5b7bb9f-c863-4f07-a91d-b5f68db9ef85',key:'abf571d54b3f67b84b76'},
 {label:'D4 Square post · Kannada',job:'creative-a18acace-c806-44c1-8e1b-ae5b2e29c3b7',key:'12401597f4f6dd57e247'},
 {label:'S1 Square post · Tamil',job:'creative-c74259c5-e242-49f6-b854-a53f843a5bc5',key:'12401597f4f6dd57e247'},
 {label:'S2 LinkedIn post · English',job:'creative-deb7840d-b45e-43f3-996b-25820dd5509d',key:'dc8851bec240d285acf7'},
 {label:'S3 Website banner · English',job:'creative-8df10179-e8cd-4024-89bc-8d9fd01b41a5',key:'fdab1b373a8cbb18484c'},
 {label:'S4 Story · Hinglish',job:'creative-e31a4825-8eda-4309-b86e-813537d884cd',key:'2783834a3f6c5e4853e1'}
];
const MODELS={sol:{model:'gpt-6.1-sol',reasoningEffort:'high'},luna:{model:'gpt-6-luna',reasoningEffort:'high'},argon:{model:'gemini-4-argon',reasoningEffort:'high'}};
const fx=require(path.join(root,'output/cost-tracking/currency.json'));

async function loadPacket(p){
 const dir=path.join(JOBS,p.job),job=await afs.readJsonRaw(path.join(dir,'job.json'));
 const input=await afs.readJsonRaw(path.join(dir,'lean-input-'+p.key+'.json'));
 const queue=await afs.readJsonRaw(path.join(dir,'image-queue.json'));
 const unit=queue.units.find(u=>input.format.pages.some(pg=>pg.id===u.placementId));
 const record=await afs.readJson(path.join(dir,unit.file));// hydrated: actual SKU photo bytes
 if(fingerprint(record.input)!==fingerprint(input))throw Error(p.job+': saved packet and planning record differ');
 const refs=record.attachments.filter(a=>a.roles.includes('product'));
 if(refs.some(a=>!/^data:image\//.test(a.imageData)))throw Error(p.job+': SKU photo bytes unavailable');
 return {...p,brandId:job.intake.brandId,jobRecord:job,input,refs,savedPlan:record.plan};
}
function request(packet,log){
 const input=packet.input,schema=planning.schemaFor(input);
 return {contextKind:'lean-planning',strictSchema:true,instructions:planning.instructions+'\n'+principle,input,
  images:packet.refs.map(a=>({id:a.assetId,label:'Exact selected SKU reference; appearance only',imageData:a.imageData})),
  schema,maxOutputTokens:Math.min(30000,10000+input.format.pages.length*2500),maxProviderRequests:2,
  // Same validator as the workflow; the wrapper only records what each attempt got wrong.
  validate:o=>{try{planning.validatePlan(o,input);const e=check(schema,o);log.push({ok:!e.length,error:e.join('; ')||null});}catch(e){log.push({ok:false,error:e.message});throw e;}}};
}
function configFor(packet,spec){
 const base=loadConfig(root),j=packet.jobRecord;
 return {...base,distributed:null,leanContextVersion:1,leanPlanningContractVersion:2,leanReferenceVersion:1,
  roleModels:{'lean-planning':{model:spec.model,reasoningEffort:spec.reasoningEffort}},fallbackModels:{},
  // Direct requests (no background queue, no CDN upload) so both providers are timed the same way.
  reasoningBackground:false,reasoningStore:false,reasoningInputTransport:'inline',
  stageContextVersion:j.stageContextVersion||0,planningPacketVersion:j.planningPacketVersion||0,verbalBrandStyleVersion:j.verbalBrandStyleVersion||0,promptCacheVersion:j.promptCacheVersion===1?1:0,reasoningTrial:j.reasoningTrial||undefined,
  streamingPlanning:false,wordingAgreements:false,treatmentKnowledge:undefined,maxReasoningCalls:2,jobTimeoutMs:20*60*1000,initialStatus:'running',
  estimatedSpend:{...base.estimatedSpend,maxUsd:3}};
}
function provider(config,spec){return spec.model.startsWith('gemini-')?new vertex.VertexPlanningProvider(config,vertex.settings(root)):new OpenAIProvider(config);}
function costOf(receipts){let usd=0,unknown=0;for(const r of receipts){const v=estimate(r);if(v==null)unknown++;else usd+=v;}return {usd,inr:usd*fx.usdToInr,unknownReceipts:unknown};}
function summarise(receipts,{log=[],error=null,plan=null,seconds=null}){
 const byAttempt=[...receipts].sort((a,b)=>a.attempt-b.attempt),first=byAttempt.find(r=>r.attempt===0);
 const repaired=byAttempt.some(r=>r.attempt>0);
 const firstValid=!!plan&&!repaired;
 return {firstAttemptValid:firstValid,firstAttemptProblem:firstValid?null:(log[0]?.error||byAttempt.find(r=>r.attempt>0)?.requestIntent?.reason||error||'unknown'),validAfterRepair:!!plan,attempts:byAttempt.length,
  seconds,attemptSeconds:byAttempt.map(r=>r.handoff?.responseElapsedMs==null?null:r.handoff.responseElapsedMs/1000),
  inputTokens:byAttempt.reduce((n,r)=>n+(r.usage?.input_tokens||0),0),outputTokens:byAttempt.reduce((n,r)=>n+(r.usage?.output_tokens||0),0),
  reasoningTokens:byAttempt.reduce((n,r)=>n+(r.usage?.output_tokens_details?.reasoning_tokens||0),0),firstAttemptOutputTokens:first?.usage?.output_tokens??null,
  ...costOf(byAttempt),error};
}
async function runFresh(packet,name,{dry=false,suffix=''}={}){
 const spec=MODELS[name],store=new JobStore(STORE),requestKey=('pc1108-'+packet.job.slice(9,17)+'-'+packet.key.slice(0,8)+'-'+name+suffix);
 const intake={brandId:packet.brandId,costPurpose:'Testing',requestKey,plannerExperiment:{version:1,sourceJobId:packet.job,packetKey:packet.key,model:spec.model,reasoningEffort:spec.reasoningEffort,label:packet.label}};
 if(dry)return {dry:true,requestKey};
 const config=configFor(packet,spec),job=await store.create(intake,config,[]);
 // A finished or failed record is never paid for again; its saved result is reused.
 if(job.reused&&job.plannerResult&&['finished','failed'].includes(job.status))return {...job.plannerResult,reused:true,jobId:job.id,...await savedOutput(store,job.id)};
 if(job.reused)throw Error(requestKey+' already started ('+job.status+'); inspect '+job.id+' instead of paying again');
 const log=[],started=performance.now();let plan=null,error=null;
 try{plan=await provider(config,spec).reason(request(packet,log),store.budget(job.id));}catch(e){error=e.message;}
 const seconds=(performance.now()-started)/1000,saved=await store.read(job.id,{hydrate:false});
 const result={jobId:job.id,source:'fresh',model:spec.model,reasoningEffort:spec.reasoningEffort,attemptLog:log,...summarise(saved.budget.receipts.filter(r=>r.kind==='reasoning'),{log,error,plan,seconds})};
 if(plan)await store.save(job.id,'lean-plan.json',plan);
 await store.update(job.id,j=>{j.status=plan?'finished':'failed';j.error=error;j.plannerResult=result;j.updatedAt=new Date().toISOString();return j;});
 return {...result,...(plan?{plan}:await savedOutput(store,job.id))};
}
// The accepted plan, or the last rejected output (kept for the human side-by-side, never used).
async function savedOutput(store,id){
 try{return {plan:await afs.readJsonRaw(path.join(store.dir(id),'lean-plan.json'))};}catch(e){if(e.code!=='ENOENT')throw e;}
 const names=(await fsp.readdir(store.dir(id))).filter(n=>/^invalid-[a-f0-9]+\.json$/.test(n));
 for(const n of names){const v=await afs.readJsonRaw(path.join(store.dir(id),n));if(v?.output?.pages)return {plan:v.output,rejectedOutput:true,rejectedBecause:v.error};}
 return {};
}
// Saved first planning attempts of the original job: same request, already paid.
async function savedSol(packet){
 const job=packet.jobRecord,receipts=job.budget.receipts.filter(r=>r.kind==='reasoning'&&r.model==='gpt-6.1-sol');
 const op=receipts[0]?.operationKey,rows=receipts.filter(r=>r.operationKey===op);
 if(!rows.length||rows[0].recordedAt<PLANNER_CHANGED)return null;
 const log=[];const first=rows.find(r=>r.attempt===0);
 try{const raw=await afs.readJsonRaw(path.join(JOBS,packet.job,'request-reasoning-'+first.requestKey+'.json'));
  const text=(raw.json.output||[]).flatMap(x=>x.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
  const schema=planning.schemaFor(packet.input),o=bindConstants(require('../../runtime/deterministic-output').restore(require('../../runtime/strict-json').parse(text),schema),schema);
  planning.validatePlan(o,packet.input);const e=check(schema,o);log.push({ok:!e.length,error:e.join('; ')||null});
 }catch(e){log.push({ok:false,error:e.message});}
 let currentValid=true;try{planning.validatePlan(packet.savedPlan,packet.input);}catch{currentValid=false;}
 const seconds=rows.reduce((n,r)=>n+(r.handoff?.responseElapsedMs||0),0)/1000;
 return {jobId:packet.job,source:'saved original job (background request, CDN photo links)',model:'gpt-6.1-sol',reasoningEffort:'high',attemptLog:log,savedPlanPassesCurrentValidator:currentValid,...summarise(rows,{log,plan:packet.savedPlan,seconds}),plan:packet.savedPlan};
}
function readable(plan){
 if(!plan)return null;
 return {message:plan.message,concept:plan.concept,pages:plan.pages.map(p=>({id:p.id,copy:p.copy.map(c=>c.role+': '+c.text),artDirection:p.artDirection,layout:p.spatial?.layoutStructure||p.hierarchy,logo:p.spatial?.logoPlacement||null,typography:p.typography,constraints:p.formatConstraints})),omitted:plan.omitted};
}
async function pool(items,limit,fn){const out=new Array(items.length);let i=0;await Promise.all(Array.from({length:limit},async()=>{while(i<items.length){const n=i++;out[n]=await fn(items[n]);}}));return out;}

async function smoke(){
 // One tiny paid Vertex call through a ledgered record, before the comparison.
 const store=new JobStore(STORE),spec=MODELS.argon,base=loadConfig(root);
 const config={...base,distributed:null,leanContextVersion:1,roleModels:{'lean-planning':spec},fallbackModels:{},reasoningBackground:false,reasoningStore:false,reasoningInputTransport:'inline',stageContextVersion:0,streamingPlanning:false,maxReasoningCalls:1,jobTimeoutMs:5*60*1000,initialStatus:'running',estimatedSpend:{...base.estimatedSpend,maxUsd:1}};
 const brandId=(await loadPacket(PACKETS[0])).brandId;
 const job=await store.create({brandId,costPurpose:'Testing',requestKey:'pc1108-smoke-argon-'+Date.now(),plannerExperiment:{version:1,smoke:true,model:spec.model}},config,[]);
 const started=performance.now(),o=await provider(config,spec).reason({contextKind:'lean-planning',strictSchema:true,instructions:'Reply with the word ready.',input:{task:'access check'},schema:{type:'object',additionalProperties:false,required:['reply'],properties:{reply:{type:'string'}}},maxOutputTokens:2000,maxProviderRequests:1},store.budget(job.id));
 const saved=await store.read(job.id,{hydrate:false});await store.update(job.id,j=>{j.status='finished';return j;});
 return {jobId:job.id,reply:o.reply,seconds:(performance.now()-started)/1000,...costOf(saved.budget.receipts)};
}

async function main(){
 const args=new Set(process.argv.slice(2));
 if(args.has('--smoke')){console.log(JSON.stringify(await smoke(),null,1));return;}
 const only=[...args].find(a=>a.startsWith('--only='))?.slice(7).split(',');
 // --retry=S2:luna sends ONE new request after a transport failure (new record; the failed one stays in the ledger).
 const retry=new Set(([...args].find(a=>a.startsWith('--retry='))?.slice(8).split(','))||[]);
 const packets=await Promise.all(PACKETS.filter(p=>!only||only.includes(p.label.slice(0,2))).map(loadPacket));
 await fsp.mkdir(path.join(OUT,'plans'),{recursive:true});
 const tasks=[];
 for(const p of packets){const s=await savedSol(p);p.sol=s;if(!s)tasks.push([p,'sol']);tasks.push([p,'luna'],[p,'argon']);}
 if(args.has('--dry-run')){console.log(tasks.map(([p,m])=>p.label+' → '+m).join('\n'));return;}
 let total=0;const limit=Number(process.env.PLANNER_COMPARISON_CONCURRENCY||4);
 await pool(tasks,limit,async([p,name])=>{
  let r=await runFresh(p,name);
  if(retry.has(p.label.slice(0,2)+':'+name)){const failed=r;total+=failed.inr||0;r=await runFresh(p,name,{suffix:'-r2'});const {plan,...earlier}=failed;r={...r,earlierTransportFailure:{jobId:earlier.jobId,error:earlier.error,receipts:earlier.attempts,chargeStatus:'unknown (no provider response saved)'}};}
  p[name]=r;total+=r.inr||0;
  console.log(p.label,name,r.validAfterRepair?'valid':'INVALID','first='+r.firstAttemptValid,Math.round(r.seconds||0)+'s','₹'+(r.inr||0).toFixed(2),'running ₹'+total.toFixed(2),r.error?'error: '+r.error.slice(0,160):'');
  if((r.inr||0)>60||total>400)throw Error('Cost far above expectation; stopping (single ₹'+(r.inr||0).toFixed(2)+', total ₹'+total.toFixed(2)+')');
 });
 const results={version:1,createdAt:new Date().toISOString(),fx,ratesNote:'USD list-price estimates from lib/cost-tracker.js RATES at receipt time; INR is an estimate at the dated rate above.',
  method:'Same lean planning request as lib/creative-ai/runtime/lean-workflow.js (instructions + format principle, saved packet input, exact SKU photos, schemaFor, validatePlan, strict schema). Max two provider requests (first try + one repair). New runs: direct requests, inline photos, no fallback model. gpt-6.1-sol baseline reuses the original job receipts where the planner code was unchanged; otherwise it is re-run fresh like the others.',
  packets:packets.map(p=>({label:p.label,sourceJobId:p.job,packetKey:p.key,brandId:p.brandId,language:p.input.assignment.language,format:p.input.format.name,pages:p.input.format.pages.map(x=>x.id+' '+x.size),runs:Object.fromEntries(['sol','luna','argon'].filter(m=>p[m]).map(m=>{const {plan,...rest}=p[m];return [m,{...rest,summary:readable(plan)}];}))}))};
 for(const p of packets)for(const m of ['sol','luna','argon'])if(p[m]?.plan)await fsp.writeFile(path.join(OUT,'plans',p.label.slice(0,2)+'-'+m+(p[m].rejectedOutput?'-rejected':'')+'.json'),JSON.stringify(p[m].plan,null,1));
 const file=path.join(OUT,only?'results-partial.json':'results.json');await fsp.writeFile(file,JSON.stringify(results,null,1));
 console.log('Saved',file);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={PACKETS,MODELS,loadPacket,savedSol,request,configFor,summarise,readable,costOf};
