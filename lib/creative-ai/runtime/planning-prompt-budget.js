'use strict';
const fs=require('./artifact-fs'),path=require('node:path'),{fingerprint}=require('../art-director');
async function inspectRequest(runtime,id,key,request,budget,stage='planning'){
 const report={version:1,stage,scope:request.scope,requestPromptHash:fingerprint(request.prompt),limit:32000,paidDispatch:false};
 try{
  const compiled=runtime.provider.preflightImagePrompt?await runtime.provider.preflightImagePrompt(request,budget):require('./image-prompt').prepare(request.prompt);
  Object.assign(report,{status:'passed',originalCharacters:compiled.originalCharacters,wireCharacters:compiled.wireCharacters,remainingCharacters:32000-compiled.wireCharacters,wireHash:fingerprint(compiled.text)});
  await runtime.store.save(id,'prompt-budget-'+stage+'-'+key+'.json',report);return report;
 }catch(error){
  await runtime.store.save(id,'prompt-budget-'+stage+'-'+key+'.json',{...report,status:'blocked',code:error.code||'PROMPT_PREFLIGHT_FAILED',error:error.message.slice(0,600),...(error.promptBudget?{promptBudget:error.promptBudget}:{})});throw error;
 }
}
async function checkRecords(runtime,id,job,records,budget){
 const reports=[];
 for(const record of records){
  const key=require('./editable').key(record.route,record.placementId);if(record.status!=='request-ready')continue;
  try{
   let request={prompt:record.prompt,scope:{route:record.route,placementId:record.placementId,conceptId:record.conceptId}};
   if(job.intake.composedTextVersion===1){
    const C=require('./editable-composition'),saved=await fs.readJson(path.join(runtime.store.dir(id),C.nameFor(record))),doc=C.documentFor(record,job.intake.canvasAssets,'unused',saved);
    if(job.intake.composedQualityVersion>=14)doc.compositionPolicy.initialTypePolicyVersion=2;
    request=await require('./composed-text').sourceRequest(job,record,doc,id,key);
   }
   reports.push(await inspectRequest(runtime,id,key,request,budget));
  }catch(error){
   // Keep sibling placements runnable. Dispatch rechecks the final exact prompt.
   const report={version:1,stage:'planning',scope:{route:record.route,placementId:record.placementId},status:'blocked',code:error.code||'PROMPT_PREFLIGHT_FAILED',error:error.message.slice(0,600),paidDispatch:false,...(error.promptBudget?{promptBudget:error.promptBudget}:{})};
   await runtime.store.save(id,'prompt-budget-planning-'+key+'.json',report);reports.push(report);
  }
 }
 return reports;
}
module.exports={inspectRequest,checkRecords};
