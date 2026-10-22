#!/usr/bin/env node
'use strict';
const fs=require('../../lib/creative-ai/runtime/artifact-fs'),native=require('fs/promises'),path=require('path'),os=require('os');
const root=path.resolve(__dirname,'../..'),{OpenAIProvider}=require('../../lib/creative-ai/runtime/provider'),{BrandScopedProvider}=require('../../lib/creative-ai/runtime/brand-isolation');
async function run(){const old=global.fetch,rows=[],stop=Error('Offline request captured; no network dispatch');let capture;global.fetch=async(url,options)=>{if(url!=='https://api.openai.com/v1/responses')throw Error('Unexpected offline URL');const body=JSON.parse(options.body);capture={...require('../../lib/creative-ai/runtime/handoff-metrics').measure(body,options.body),maxOutputTokens:body.max_output_tokens,reasoningEffort:body.reasoning.effort,strictSchema:body.text.format.strict,ocrStatus:JSON.parse(body.input.find(m=>m.role==='user').content.find(c=>c.type==='input_text').text.slice('Return JSON matching this contract. '.length)).input.ocr?.status||'not-reported'};throw stop;};
 try{for(const id of ['creative-7468176a-6c4a-4e0f-a39a-1afe1e360528','creative-8e57a041-f219-4be2-afce-15a7a97f4b3a']){
  const jobDir=path.join(root,'output/creative-ai/jobs',id),job=JSON.parse(await fs.readFile(path.join(jobDir,'job.json'),'utf8'));
  for(const result of job.results.filter(r=>r.imageUrl)){
   const temp=await native.mkdtemp(path.join(os.tmpdir(),'qa-review-envelope-'));capture=null;const started=performance.now();
   try{await native.copyFile(path.join(jobDir,'placement-catalog.json'),path.join(temp,'placement-catalog.json'));
    const record=JSON.parse(await fs.readFile(path.join(jobDir,'package-'+result.route+'-'+result.placementId+'-0.json'),'utf8')),bytes=await fs.readFile(path.join(jobDir,result.imageUrl.split('/').pop()));
    const provider=new BrandScopedProvider(new OpenAIProvider({inputContextPreflight:false,reasoningModel:'offline-capture',reasoningTimeoutMs:1000}),{}),budget={brandContext:async()=>({intake:job.intake,preferenceMemory:job.preferenceMemory,dir:jobDir}),reserve:async()=>{},receipt:async()=>{}};
    try{await require('../../lib/creative-ai/runtime/review').review(record,'data:image/png;base64,'+bytes.toString('base64'),{provider,budget,dir:temp,attempt:0});throw Error('Expected offline capture stop');}catch(e){if(e!==stop)throw e;}
    rows.push({jobId:id,route:result.route,measurements:capture,localPreparationIncludingOcrMs:Math.round(performance.now()-started)});
   }finally{await native.rm(temp,{recursive:true,force:true});}
  }
 }}finally{global.fetch=old;}
 return {mode:'offline-review-envelope-capture',paidCalls:0,outboundCalls:0,costINR:0,rows,limits:'Actual saved pixels and local OCR build the request; transport is stopped before network. No new model observations, verdicts or historical review changes. Package-0 and selected image are payload-size fixtures, not a new review identity claim.'};
}
if(require.main===module)run().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={run};
