#!/usr/bin/env node
'use strict';
// Replay the exact recorded observation object against its bound package and pixels.
const fs=require('../../lib/creative-ai/runtime/artifact-fs'),native=require('fs/promises'),path=require('path'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),{OpenAIProvider}=require('../../lib/creative-ai/runtime/provider'),{BrandScopedProvider}=require('../../lib/creative-ai/runtime/brand-isolation');
async function run(id){
 if(!/^creative-[a-f0-9-]{36}$/.test(id))throw Error('Invalid recorded job ID');
 const jobDir=path.join(root,'output/creative-ai/jobs',id),read=async n=>JSON.parse(await fs.readFile(path.join(jobDir,n),'utf8')),job=await read('job.json'),responses=[];
 for(const r of job.budget.receipts.filter(r=>r.optimisation?.stage==='review')){const raw=(await read('request-reasoning-'+r.requestKey+'.json')).json;const output=JSON.parse(raw.output.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join(''));responses.push({raw,output});}
 const rows=[],originalFetch=global.fetch;
 try{for(const result of job.results.filter(r=>r.imageUrl)){
  const temp=await native.mkdtemp(path.join(os.tmpdir(),'qa-recorded-review-')),begin=performance.now(),measurements=[];let calls=0;
  try{
   await native.copyFile(path.join(jobDir,'placement-catalog.json'),path.join(temp,'placement-catalog.json'));
   const originalReport=await read(result.reviewUrl.split('/').pop());
   // Resolve the actual reviewed package by hash, never assume attempt 0 for a corrected image.
   let record;for(const file of (await fs.readdir(jobDir)).filter(f=>f.startsWith('package-'+result.route+'-'+result.placementId+'-')&&f.endsWith('.json'))){const candidate=await read(file);if(candidate.packageHash===originalReport.packageHash)record=candidate;}
   if(!record)throw Error('No package matching recorded review hash');
   const imageData='data:image/png;base64,'+(await fs.readFile(path.join(jobDir,result.imageUrl.split('/').pop()))).toString('base64'),measured=await require('../../lib/creative-ai/graphic-designer/results').inspectArtifact(imageData);
   assert.equal(measured.artifactHash,originalReport.artifactHash,'Selected pixels differ from recorded review');
   const match=responses.find(r=>r.output.packageHash===record.packageHash&&r.output.artifactHash===measured.artifactHash);if(!match)throw Error('No matching recorded raw review');
   global.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.model,'offline-recorded-review');calls++;return {ok:true,json:async()=>structuredClone(match.raw)};};
   const provider=new BrandScopedProvider(new OpenAIProvider({inputContextPreflight:false,reasoningModel:'offline-recorded-review',reasoningTimeoutMs:1000}),{}),budget={brandContext:async()=>({intake:job.intake,preferenceMemory:job.preferenceMemory,dir:jobDir}),reserve:async()=>{},receipt:async r=>measurements.push(r.handoff)};
   const reviewed=await require('../../lib/creative-ai/runtime/review').review(record,imageData,{provider,budget,dir:temp,attempt:0});
   assert.equal(reviewed.report.decision,originalReport.decision,'Recorded verdict changed; inspect before accepting replay');
   assert.equal(reviewed.report.qualityVerified,originalReport.qualityVerified,'Recorded quality verification changed');
   rows.push({route:result.route,status:'passed',simulatedCalls:calls,elapsedMs:Math.round(performance.now()-begin),measurements,ocrStatus:reviewed.ocr.status,ocrRows:reviewed.ocr.rows?.length,copyObservations:reviewed.copyObservations,originalDecision:originalReport.decision,replayedDecision:reviewed.report.decision,decisionUnchanged:originalReport.decision===reviewed.report.decision,criticalChecks:reviewed.report.criticalChecks,qualityVerified:reviewed.report.qualityVerified});
  }catch(e){rows.push({route:result.route,status:'failed',error:e.message,simulatedCalls:calls,elapsedMs:Math.round(performance.now()-begin),measurements});}
  finally{await native.rm(temp,{recursive:true,force:true});}
 }}finally{global.fetch=originalFetch;}
 return {jobId:id,brandId:job.intake.brandId,mode:'actual-saved-pixels-and-recorded-observations-through-current-review',paidCalls:0,costINR:0,outboundNetworkCalls:0,failed:rows.filter(r=>r.status==='failed').length,rows,limits:'Recorded model observations, current local OCR and current validation. Not a new visual model assessment. Original packages, images, verdicts and ledgers remain unchanged.'};
}
if(require.main===module)run(process.argv[2]).then(r=>{console.log(JSON.stringify(r,null,2));if(r.failed)process.exitCode=1;}).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={run};
