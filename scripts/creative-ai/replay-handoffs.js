#!/usr/bin/env node
'use strict';
// Read-only local replay. No provider, engine or credential loading.
const path=require('path'),assert=require('node:assert/strict');
const fs=require('../../lib/creative-ai/runtime/artifact-fs');
const root=path.resolve(__dirname,'../..');
const defaultJobs=['creative-7468176a-6c4a-4e0f-a39a-1afe1e360528','creative-8e57a041-f219-4be2-afce-15a7a97f4b3a'];
function legacyPatch(raw){
 const out=structuredClone(raw);
 for(const unit of out.adjustments)for(const change of unit.changes){
  if(!Object.hasOwn(change,'valueJson'))continue;
  // Explicit replay-only v1 migration. Never accept this shape on the live wire.
  try{change.value=JSON.parse(change.valueJson);}catch{change.value=change.valueJson;}
  delete change.valueJson;
 }
 return out;
}
async function replay(id){
 if(!/^creative-[a-f0-9-]+$/.test(id))throw Error('Invalid saved job ID');
 const directory=path.join(root,'output/creative-ai/jobs',id),read=async name=>JSON.parse(await fs.readFile(path.join(directory,name),'utf8'));
 const [input,drafts,copy,catalog]=await Promise.all(['art-input.json','art-drafts.json','copy.json','placement-catalog.json'].map(read));
 const before=JSON.stringify({input,drafts,copy,catalog});
 const strategy=require('../../lib/creative-ai/marketing-strategist'),cd=require('../../lib/creative-ai/creative-director'),pk=require('../../lib/creative-ai/placement-knowledge');
 const sv=strategy.validateOutput(input.directorInput.strategy,input.directorInput.strategyInput,{requireStrategyChecks:true});assert.equal(sv.ok,true,JSON.stringify(sv.hardErrors));
 const cv=cd.validateOutput(input.directorOutput,input.directorInput);assert.equal(cv.ok,true,JSON.stringify(cv.hardErrors));
 require('../../lib/creative-ai/copywriter').validateOutput(copy,{concepts:input.directorOutput.concepts,placements:input.placements.map(p=>({...p,expanded:pk.resolvePin(p.pin,catalog)})),facts:input.directorInput.strategyInput.facts,strategy:input.directorInput.strategy});
 const attempts=[];
 for(const filename of (await fs.readdir(directory)).filter(n=>/^request-reasoning-.*\.json$/.test(n)).sort()){
  const response=await read(filename),text=(response.json?.output||[]).flatMap(r=>r.content||[]).filter(r=>r.type==='output_text').map(r=>r.text).join('');
  let raw;try{raw=JSON.parse(text);}catch{continue;}if(!Array.isArray(raw.adjustments))continue;
  try{
   const result=await require('../../lib/creative-ai/runtime/agents').reconcile(input,drafts,{reason:async request=>{
    const decoded=request.wire.decode(require('../../lib/creative-ai/runtime/deterministic-output').restore(legacyPatch(raw),request.wire.schema));await request.validate(decoded);return decoded;
   }},{},{catalog});
   for(const s of result.output.specifications){
    const locked=copy.decks.find(d=>d.conceptId===s.conceptId&&d.placementId===s.placementId);
    assert.deepEqual(s.text.map(f=>[f.fieldId,f.exactText,f.delivery,f.nativeFieldId]),locked.fields.map(f=>[f.id,f.text,f.delivery,f.nativeFieldId]));
    const draft=drafts.drafts.find(d=>d.conceptId===s.conceptId&&d.placementId===s.placementId);
    for(const role of ['logo','product'])assert.deepEqual(s[role].assetIds,draft[role].assetIds);
   }
   attempts.push({filename,status:'passed',units:result.output.specifications.length});
  }catch(e){attempts.push({filename,status:'rejected',reason:e.message});}
 }
 assert.ok(attempts.some(a=>a.status==='passed'),'No saved reconciliation response passed current contracts: '+JSON.stringify(attempts));
 assert.equal(JSON.stringify({input,drafts,copy,catalog}),before,'Replay mutated its source records');
 return {id,strategy:'passed',concepts:'passed',copy:'passed',reconciliation:attempts,historicalArtifacts:'unchanged'};
}
async function main(){
 global.fetch=async()=>{throw Error('Network forbidden during offline replay');};
 const started=Date.now(),jobs=[];for(const id of process.argv.slice(2).length?process.argv.slice(2):defaultJobs)jobs.push(await replay(id));
 console.log(JSON.stringify({mode:'offline-saved-response-replay',providerCalls:0,costINR:0,elapsedMs:Date.now()-started,jobs},null,2));
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={legacyPatch,replay};
