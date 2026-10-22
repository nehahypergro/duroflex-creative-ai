'use strict';
// Explicit paid experiment; never invoked by the server or test suite.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'work/cocoon-all-mini-trial');
const {loadConfig}=require('../../lib/creative-ai/runtime/config');
const {OpenAIProvider}=require('../../lib/creative-ai/runtime/provider');
class AllMiniProvider extends OpenAIProvider {
 reason(request,budget){const role=request.contextKind||require('../../lib/creative-ai/runtime/focused-context').infer(request);this.config.roleModels[role]={model:'gpt-5.4-mini',reasoningEffort:'medium'};return super.reason({...request,reasoningEffort:'medium'},budget);}
}
const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
const {estimate}=require('../../lib/cost-tracker');
const write=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2));
async function main(){
 if(!process.argv.includes('--live'))throw Error('Use --live only for the user-authorized paid comparison');
 fs.mkdirSync(out,{recursive:true});if(fs.existsSync(path.join(out,'experiment.json')))throw Error('Existing experiment preserved; do not dispatch duplicate runs');
 const intake=JSON.parse(fs.readFileSync(path.join(root,'work/cocoon-protected-astra-run/request.json')));delete intake.requestKey;
 const specs=[{label:'AllMini',strategy:'gpt-5.4-mini',art:'gpt-5.4-mini'}];
 const experiment={version:1,createdAt:new Date().toISOString(),briefHash:crypto.createHash('sha256').update(JSON.stringify(intake)).digest('hex'),intake,notes:['Fresh strategy, concepts, copy, art, reconciliation and photographs for each job. Saved brand research and SKU evidence reused.','All reasoning calls use GPT-5.4 mini Medium, including guardian, strategy, concepts, copy, art, reconciliation and assembled review. Image model stays fixed.','OpenAI Responses structured output with existing shared validation.','Two routes per job; no global/default model configuration change.'],runs:[]};write('experiment.json',experiment);
 for(const spec of specs){
  const config={...loadConfig(root),reasoningModel:'gpt-5.4-mini',roleModels:{...Object.fromEntries(['strategy','concepts','art','reconciliation'].map(role=>[role,{model:['strategy','concepts'].includes(role)?spec.strategy:spec.art,reasoningEffort:'medium'}])),copy:{model:'gpt-5.4-mini',reasoningEffort:'medium'},'canvas-layout-review':{model:'gpt-5.4-mini',reasoningEffort:'medium'},general:{model:'gpt-5.4-mini',reasoningEffort:'medium'}}};
  const provider=new AllMiniProvider(config);
  const access=await provider.checkAccess();if(!access.configured){experiment.runs.push({...spec,error:access.reason||'Configured model access unavailable',access});write('experiment.json',experiment);continue;}
  const research=JSON.parse(fs.readFileSync(path.join(root,'output/creative-ai/research-sessions',intake.researchId,'job.json')));if(research.intake.brandId!==intake.brandId)throw Error('Research brand mismatch');
  const runtime=new CreativeRuntime({root,dossierStore:require('../../lib/brand-dossier').createDossierStore(path.join(root,'output/brand-dossiers')),provider});runtime.config=config;require('../../lib/group-workspace').groupPolicy(root).mount(runtime);
  const request={...structuredClone(intake),requestKey:'cocoon-'+spec.label.toLowerCase()+'-'+crypto.randomUUID()},startedAt=new Date().toISOString(),id=await runtime.create(request),row={...spec,id,startedAt,models:config.roleModels,imageModel:config.imageModel,fallbackModel:config.reasoningModel};experiment.runs.push(row);write('experiment.json',experiment);console.log(JSON.stringify({event:'started',...row}));
  let job;do{await new Promise(r=>setTimeout(r,10000));job=await runtime.store.read(id);console.log(JSON.stringify({label:spec.label,id,status:job.status,stage:job.stage,receipts:job.budget.receipts.length,results:job.results.length}));}while(runtime.active.has(id)||runtime.pending.includes(id));
  job=await runtime.store.read(id);const fx=JSON.parse(fs.readFileSync(path.join(root,'output/cost-tracking/currency.json'))),receipts=job.budget.receipts.filter(r=>r.recordedAt>=job.createdAt),rows=receipts.map(r=>({stage:r.optimisation?.stage||r.kind,model:r.model,reasoningEffort:r.reasoningEffort,seconds:r.handoff?.responseElapsedMs/1000||null,inputTokens:r.usage?.input_tokens,outputTokens:r.usage?.output_tokens,estimatedINR:estimate(r)==null?null:estimate(r)*fx.usdToInr,requestKey:r.requestKey}));
  const dir=runtime.store.dir(id),events=(await runtime.activity.project(id)).events;Object.assign(row,{finishedAt:new Date().toISOString(),elapsedSeconds:(Date.now()-Date.parse(startedAt))/1000,status:job.status,error:job.error,rows,knownEstimatedINR:rows.reduce((s,r)=>s+(r.estimatedINR||0),0),unknownReceiptCosts:rows.filter(r=>r.estimatedINR==null).length,fx,results:job.results,unitErrors:job.unitErrors,failedEvents:events.filter(e=>e.type==='task.failed'),diagnosticFiles:fs.readdirSync(dir).filter(f=>/editable-(preflight|review-outcome)/.test(f))});write(spec.label.toLowerCase()+'-report.json',row);write('experiment.json',experiment);console.log(JSON.stringify({event:'finished',label:spec.label,id,status:row.status,elapsedSeconds:row.elapsedSeconds,estimatedINR:row.knownEstimatedINR,images:row.results.length,error:row.error}));
 }
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
