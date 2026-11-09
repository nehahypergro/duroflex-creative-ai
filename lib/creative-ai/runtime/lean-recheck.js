'use strict';
// "Re-run check" for a saved lean design (user decision, 9 Nov 2026). When the design was made but
// its check never finished (for example "fetch failed" or "Reviewer omitted required checks" after a
// paid call), the only way on used to be "Start another paid attempt", which makes every picture
// again. This is a narrow, explicit exception to "ambiguous requests are reconciled, never
// duplicated": only for the review step, only after the user clicks, and exactly one new review
// request per click, with a visible note that the earlier check may also have been charged.
// - The same saved picture is checked (its SHA-256 must match the file and the page the user saw).
// - The request has a new identity (contract.recheck.number) and its own verification budget, which
//   permits reasoning only: a re-run check can never make or change a picture.
// - The earlier ambiguous receipt stays as it is (charge unknown); nothing is overwritten.
// - Afterwards the normal readiness rules apply. No automatic correction runs after a re-run check
//   (it would make a new picture); remaining differences stay visible with a plain note.
const fs=require('./artifact-fs'),path=require('node:path'),crypto=require('node:crypto'),{fingerprint}=require('../art-director');
const policy=require('./lean-policy'),correction=require('../lean/correction');
const VERSION=1,active=new Set();
const fail=(message,code)=>Object.assign(Error(message),{code});
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const keyOf=(route,placementId)=>fingerprint([route,placementId]).slice(0,24);
async function readState(runtime,id,key){try{return await fs.readJsonRaw(path.join(runtime.store.dir(id),'lean-state-'+key+'.json'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
// A saved design whose check is missing, interrupted or failed, and nothing is running now.
function needed(job,state,result){
 return !!(state?.original&&!state.review&&['interrupted','checking'].includes(state.status)&&!['queued','running'].includes(job.status)&&(!result||result.sha256===state.original.sha256&&(!result.versionId||result.versionId==='original')));
}
// One check costs about the median of this project's earlier checks (same model), else its allowance.
async function estimate(runtime,job){
 let fx=null;try{fx=require('../../cost-tracker').validFx(JSON.parse(await fs.readFileRaw(path.join(runtime.root||runtime.store.root||'.','output/cost-tracking/currency.json'),'utf8')));}catch{}
 const {estimate:priced}=require('../../cost-tracker'),model=job.runtimeConfig?.roleModels?.['lean-review']?.model||policy.roles['lean-review'].model;
 const values=(job.budget?.receipts||[]).filter(r=>r.kind==='reasoning'&&r.model===model).map(r=>{try{return priced(r);}catch{return null;}}).filter(v=>v>0).sort((a,b)=>a-b);
 const usd=values.length?values[Math.floor(values.length/2)]:job.budget?.estimatedSpend?.reasoningUsd;
 return fx&&Number.isFinite(usd)?{currency:'INR',perCheck:Math.max(1,Math.ceil(usd*fx.usdToInr)),rateDate:fx.rateDate,basis:values.length?'Estimate from this project’s earlier checks at list prices. Not a bill.':'Reservation allowance for one check, not a predicted bill.'}:{currency:'INR',perCheck:null,rateDate:null,basis:'No dated exchange rate is saved, so no ₹ estimate is shown.'};
}
function texts(cost){
 const about=cost.perCheck?'about ₹'+cost.perCheck:'amount not known';
 return {message:'This design was saved, but its check did not finish. Re-run check sends one new check of the same saved design ('+about+'). It never makes a new picture.',costNote:'The earlier check may also have been charged ('+about+'); that cost stays marked unknown.'};
}
// Adds `leanRecheck` to results that need it (project view). Reads small state files only.
async function decorate(runtime,job){
 if(!policy.enabled(job.intake))return job;let cost=null;
 for(const r of job.results||[]){
  if(r.visualReview?.status==='completed'||!r.sha256||r.versionId&&r.versionId!=='original')continue;
  const key=keyOf(r.route,r.placementId),state=await readState(runtime,job.id,key).catch(()=>null);
  if(!needed(job,state,r)||active.has(job.id+'/'+key))continue;
  cost??=await estimate(runtime,job);r.leanRecheck={version:VERSION,available:true,estimate:cost,...texts(cost),earlierError:state.error?.message||null,rechecks:(state.rechecks||[]).length};
 }
 return job;
}
async function unitRecord(runtime,job,route,placementId){
 const dir=runtime.store.dir(job.id),manifest=await fs.readJsonRaw(path.join(dir,'image-queue.json'));
 if(manifest.jobId!==job.id||manifest.brandId!==job.intake.brandId)throw fail('This design belongs to another project.','LEAN_RECHECK_SCOPE');
 const unit=manifest.units.find(u=>u.route===route&&u.placementId===placementId);if(!unit||!/^image-queue-[a-f0-9]{24}\.json$/.test(unit.file))throw fail('Saved design not found.','LEAN_RECHECK_NOT_FOUND');
 const record=await fs.readJson(path.join(dir,unit.file));
 if(sha(Buffer.from(JSON.stringify(record)))!==unit.hash)throw fail('The saved plan for this design changed; nothing was sent.','LEAN_RECHECK_SCOPE');
 require('./lean-workflow').validateRecord(job,record);return {record,manifest};
}
async function start(runtime,id,{route,placementId,sha256,brandId,requestId}={}){
 const job=await runtime.store.read(id);
 if(!policy.enabled(job.intake))throw fail('Re-run check is only for simplified designs.','LEAN_RECHECK_UNAVAILABLE');
 if(brandId!==job.intake.brandId)throw fail('This design belongs to another brand.','BRAND_MISMATCH');
 if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(requestId))throw fail('Open Re-run check again; this click could not be identified.','LEAN_RECHECK_REQUEST');
 if(typeof route!=='string'||typeof placementId!=='string'||!/^[a-f0-9]{64}$/.test(sha256||''))throw fail('Saved design not found.','LEAN_RECHECK_NOT_FOUND');
 const key=keyOf(route,placementId),lock=id+'/'+key;
 if(active.has(lock))throw fail('This design’s check is already running.','LEAN_RECHECK_BUSY');
 active.add(lock);let release=null;
 try{
  try{release=await require('./file-lock').acquire(path.join(runtime.store.dir(id),'.runner.lock'),{timeoutMs:100});}catch{throw fail('This project is still working. Try again when it stops.','LEAN_RECHECK_BUSY');}
  const {record,manifest}=await unitRecord(runtime,job,route,placementId),stateFile='lean-state-'+key+'.json';
  const state=await readState(runtime,id,key);if(!state||state.packageHash!==record.packageHash)throw fail('Saved design not found.','LEAN_RECHECK_NOT_FOUND');
  // The same click never sends twice: return what it already did.
  const done=(state.rechecks||[]).find(x=>x.requestId===requestId);if(done)return {status:done.status,recheck:done,repeated:true};
  const result=(job.results||[]).find(r=>r.route===route&&r.placementId===placementId);
  if(!needed(job,state,result))throw fail(state.review?'This design’s check already finished, so there is nothing to re-run.':'This design is not ready for a re-run check.','LEAN_RECHECK_NOT_NEEDED');
  if(sha256!==state.original.sha256)throw fail('This design changed. Reopen it before re-running its check.','LEAN_RECHECK_STALE');
  const bytes=await fs.readFileRaw(path.join(runtime.store.dir(id),state.original.filename));
  if(sha(bytes)!==state.original.sha256)throw fail('The saved picture no longer matches its record; nothing was sent.','LEAN_RECHECK_STALE');
  const cost=await estimate(runtime,job),number=(state.rechecks||[]).length+1,verificationKey='lean-recheck-'+key+'-'+number;
  const entry={version:VERSION,number,requestId,status:'checking',imageSha256:state.original.sha256,requestedAt:new Date().toISOString(),estimate:cost,earlierCheck:{chargeStatus:'unknown',error:state.error?.message||null,code:state.error?.code||null}};
  state.rechecks=[...(state.rechecks||[]),entry];
  const save=()=>runtime.store.save(id,stateFile,state);await save();
  await runtime.store.beginVerificationBudget(id,verificationKey);
  let review;
  try{review=await require('./lean-workflow').inspect(runtime,id,record,bytes,'lean-review-'+key+'-recheck-'+number+'.json',runtime.store.budget(id,{verificationKey}),{recheck:{number}});}
  catch(e){Object.assign(entry,{status:'failed',chargeStatus:'unknown',error:e.message,code:e.code||null,finishedAt:new Date().toISOString()});await save();throw fail('The re-run check did not finish ('+e.message+'). Its cost stays marked unknown; your design is unchanged.',e.code||'LEAN_RECHECK_FAILED');}
  // Normal readiness rules from here. No correction after a re-run check (that would make a picture).
  const findings=review.report.checks.filter(c=>c.result==='clear_mismatch');
  state.review=review;
  if(findings.length){const s=correction.scope(findings);state.correctionScope={...s,skipped:s.skipped||'recheck',note:s.skipped?s.note:'Checked again: differences found. A re-run check never changes the picture; review it or use Edit with AI.'};}
  Object.assign(entry,{status:'completed',conclusion:review.report.conclusion,finishedAt:new Date().toISOString()});
  state.status='completed';state.finishedAt=entry.finishedAt;state.recheckedAt=entry.finishedAt;delete state.error;await save();
  const published=await require('./lean-workflow').publishResult(runtime,id,record,state);
  await runtime.store.update(id,j=>{j.unitErrors=(j.unitErrors||[]).filter(e=>e.route!==route||e.placementId!==placementId);if(j.status==='partial'&&!j.unitErrors.length&&!manifest.errors?.length)j.status=require('./output-completion').classify(j.results,manifest.expected);j.error=j.unitErrors.length?j.unitErrors.map(e=>e.error).join(' · ').slice(0,800):null;return j;});
  return {status:'completed',recheck:entry,result:published};
 }finally{if(release)await release();active.delete(lock);}
}
module.exports={VERSION,needed,estimate,decorate,start};
