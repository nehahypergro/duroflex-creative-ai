#!/usr/bin/env node
'use strict';
const path=require('path'),assert=require('node:assert/strict');
const fs=require('../../lib/creative-ai/runtime/artifact-fs'),agents=require('../../lib/creative-ai/runtime/agents'),pk=require('../../lib/creative-ai/placement-knowledge');
const {OpenAIProvider}=require('../../lib/creative-ai/runtime/provider');
const root=path.resolve(__dirname,'../..'),defaultJobIds=['creative-7468176a-6c4a-4e0f-a39a-1afe1e360528','creative-8e57a041-f219-4be2-afce-15a7a97f4b3a'];
function stageOf(raw){return raw.adjustments?'reconciliation':raw.units?'copy':raw.drafts?'art':raw.concepts?'concepts':raw.brief?'strategy':null;}
// Keep provider status, refusals and incomplete details intact during replay.
function replayEnvelope(saved,output){
 const envelope=structuredClone(saved.json);
 const blocks=(envelope.output||[]).flatMap(item=>item.content||[]).filter(item=>item.type==='output_text');
 assert.equal(blocks.length,1,'Recorded replay requires one output_text block');
 blocks[0].text=JSON.stringify(output);
 return envelope;
}
// Explicit historical codec migration; never used by the live provider. Do not
// discard an arbitrary field or change a decision to make the replay pass.
function migrate(raw,stage,input,notes){
 let out=structuredClone(raw);
 if(stage==='reconciliation'){if(out.adjustments.some(u=>u.changes.some(c=>'valueJson' in c)))notes.push('v1 valueJson → typed value');out=require('./replay-handoffs').legacyPatch(out);}
 if(stage==='strategy'){
  out=require('../../lib/creative-ai/runtime/strategy-choice').fromRecorded(out);notes.push('Move the recorded chosen candidate into explicit directionDecision; do not invent missing candidates');
  const assignment=input.directorInput.strategyInput.assignment;
  for(const key of ['audience','buyingSituation','desiredAction'])if(assignment[key]&&out.brief[key]){assert.equal(out.brief[key].text,assignment[key],'Historical '+key+' conflicts with assigned brief');delete out.brief[key];notes.push('Move matching '+key+' to code-owned brief binding');}
  if(assignment.landingPageUrl&&out.strategyChecks?.destination?.url!==undefined){assert.equal(out.strategyChecks.destination.url,assignment.landingPageUrl);delete out.strategyChecks.destination.url;notes.push('Move matching destination URL to code-owned binding');}
 }
 if(stage==='copy')for(const unit of Object.values(out.units))for(const f of unit.fields)if(f.target==='native:destinationUrl'&&f.text!==undefined){assert.equal(f.text,input.directorInput.strategy.strategyChecks.destination.url);delete f.text;notes.push('Move matching native destination to code-owned binding');}
 return out;
}
async function run({scoped=false,jobIds=defaultJobIds}={}){
 const began=Date.now(),results=[];let simulatedDispatches=0;
 const originalFetch=global.fetch;
 global.fetch=async()=>{throw Error('Network forbidden outside recorded provider transport');};
 try{for(const id of jobIds){
  if(!/^creative-[a-f0-9-]{36}$/.test(id))throw Error('Invalid recorded job ID');
  const dir=path.join(root,'output/creative-ai/jobs',id),read=async name=>JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));
  const [input,drafts,catalog,job]=await Promise.all(['art-input.json','art-drafts.json','placement-catalog.json','job.json'].map(read));
  let guardian;try{guardian=await read('guardian-scoped.json');}catch(e){if(e.code!=='ENOENT')throw e;guardian=await read('guardian.json');}
  const research=await read(job.artifacts.currentResearchFile||'research-sku.json');
  const base={strategy:input.directorInput.strategy,concepts:input.directorOutput.concepts,placements:job.selection.map(s=>({...s,expanded:pk.resolvePin(s.pin,catalog)})),facts:input.directorInput.strategyInput.facts,guardian,brandResearch:research.dossier,assets:research.dossier.assets,requiredSkuAssetIds:research.productBriefEvidence?.assetIds||[],creativeDirection:require('../../lib/creative-ai/runtime/output-formats').creativeDirection(job.intake)};
  const attempts=[];
  for(const file of (await fs.readdir(dir)).filter(n=>/^request-reasoning-.*\.json$/.test(n)).sort()){
   const saved=await read(file);let raw;try{raw=JSON.parse((saved.json?.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join(''));}catch{continue;}
   const stage=stageOf(raw);if(!stage)continue;
   const start=Date.now(),notes=[],receipts=[];let calls=0;
   try{
    const output=migrate(raw,stage,input,notes),rawProvider=new OpenAIProvider({inputContextPreflight:false,reasoningModel:'offline-recorded-response',reasoningTimeoutMs:1000}),provider=scoped?new(require('../../lib/creative-ai/runtime/brand-isolation').BrandScopedProvider)(rawProvider,{}):rawProvider,budget={reserve:async()=>{},receipt:async r=>receipts.push({handoff:r.handoff,optimisation:r.optimisation}),...(scoped?{brandContext:async()=>({intake:job.intake,preferenceMemory:job.preferenceMemory,dir})}:{})};
    global.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.model,'offline-recorded-response');calls++;simulatedDispatches++;return {ok:true,json:async()=>replayEnvelope(saved,output)};};
    if(stage==='strategy')await agents.strategist(input.directorInput.strategyInput,provider,budget);
    if(stage==='concepts')await agents.concepts(input.directorInput,provider,budget);
    if(stage==='art')await agents.artDraft(base,provider,budget);
    if(stage==='copy'){const copy=require('../../lib/creative-ai/copywriter');await provider.reason({contextKind:'copy',instructions:copy.instructions,input:base,schema:copy.schemaFor(base),wire:require('../../lib/creative-ai/runtime/copy-wire').wire(base,copy.instructions),validate:o=>copy.validateOutput(o,base)},budget);}
    if(stage==='reconciliation')await agents.reconcile(input,drafts,provider,budget,{catalog});
    attempts.push({file,stage,status:'passed',simulatedCalls:calls,measurements:receipts,migrations:notes,elapsedMs:Date.now()-start});
   }catch(e){attempts.push({file,stage,status:'rejected',simulatedCalls:calls,measurements:receipts,migrations:notes,error:e.message,elapsedMs:Date.now()-start});}
  }
  const stages=Object.fromEntries(['strategy','concepts','copy','art','reconciliation'].map(stage=>[stage,attempts.some(a=>a.stage===stage&&a.status==='passed')?'passed':'failed']));
  results.push({id,researchFile:job.artifacts.currentResearchFile||'research-sku.json',stages,attempts});
 }}finally{global.fetch=originalFetch;}
 return {mode:'recorded-response-through-real-provider-adapter',brandScoped:scoped,outboundNetworkCalls:0,paidCalls:0,costINR:0,simulatedDispatches,elapsedMs:Date.now()-began,failedStages:results.reduce((n,r)=>n+Object.values(r.stages).filter(s=>s==='failed').length,0),results,limits:'Recorded responses, explicit old-contract migrations and mocked transport. No new model output or creative-quality evaluation; production artifacts and ledgers unchanged.'};
}
if(require.main===module)run({scoped:process.argv.includes('--scoped'),...(process.argv.some(a=>a.startsWith('--job='))?{jobIds:process.argv.filter(a=>a.startsWith('--job=')).map(a=>a.slice(6))}:{})}).then(r=>{console.log(JSON.stringify(r,null,2));if(r.failedStages)process.exitCode=1;}).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={run,migrate,stageOf,replayEnvelope};
