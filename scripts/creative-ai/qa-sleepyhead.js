#!/usr/bin/env node
'use strict';
// Offline, named-brand audit. Never substitutes another brand's campaign.
const fs=require('fs/promises'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict'),os=require('os');
const af=require('../../lib/creative-ai/runtime/artifact-fs'),isolation=require('../../lib/creative-ai/runtime/brand-isolation'),researchModule=require('../../lib/creative-ai/runtime/research');
const root=path.resolve(__dirname,'../..'),brandId='brand-3a5870df-d114-43eb-ba02-e5d8c3c729de';
const digest=x=>crypto.createHash('sha256').update(x).digest('hex'),bytes=x=>Buffer.byteLength(JSON.stringify(x));
async function run(){
 const began=performance.now(),read=async f=>JSON.parse(await af.readFile(f,'utf8'));
 const brands=new(require('../../lib/creative-ai/runtime/brands').BrandStore)(root),brand=await brands.read(brandId);
 assert.equal(brand.name,'Sleepyhead');
 const dir=path.join(root,'output/creative-ai/research-sessions',brand.latestResearchId),job=await read(path.join(dir,'job.json')),research=await read(path.join(dir,'research-product-evidence.json'));
 const protectedFiles=[path.join(brands.dir(brandId),'brand.json'),...(await fs.readdir(dir)).filter(f=>f.endsWith('.json')).map(f=>path.join(dir,f))];
 const hashes=await Promise.all(protectedFiles.map(async f=>digest(await fs.readFile(f))));
 assert.equal(job.intake.brandId,brandId);assert.equal(job.status,'finished');
 const scope=await isolation.snapshot({brandId,brandUrl:brand.brandUrl},brands);
 isolation.assertContext(research,scope);
 const sessions=new(require('../../lib/creative-ai/runtime/research-session').ResearchSessions)({root,brands});
 await sessions.prepare({brandId,brandUrl:brand.brandUrl,researchId:job.id});
 const checks=[];const pass=(name,detail)=>checks.push({name,status:'passed',detail});
 pass('Brand manifest, research revision and reuse gate','Saved research matches the current Sleepyhead knowledge revision.');
 require('../../lib/brand-dossier/contract').validateResearch(research.dossier);pass('Saved research dossier','Current source, finding, image-data and asset-reference validation passed.');
 for(const bad of [{brandId:'brand-foreign'},{documentId:'doc-foreign'},{id:'asset-foreign'},{sourceIds:['doc-foreign']},{kind:'product',reference:'https://foreign.example/products/item'}])assert.throws(()=>isolation.assertContext(bad,scope),/Brand isolation/);
 await assert.rejects(()=>sessions.prepare({brandId:'brand-foreign',brandUrl:brand.brandUrl,researchId:job.id}),/different brand/);
 pass('Brand isolation','Six foreign-brand/document/asset/product/research handoffs rejected.');
 const receipts=[],recorded=[];
 for(const receipt of job.budget.receipts.filter(r=>r.kind==='reasoning')){
  const saved=(await read(path.join(dir,'request-reasoning-'+receipt.requestKey+'.json'))).json;
  const raw=JSON.parse(saved.output.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join(''));
  let error=null;
  try{if(raw.findings){require('../../lib/brand-dossier/contract').validateResearch({...research.dossier,findings:raw.findings});const known=new Set(research.dossier.sources.filter(s=>s.status!=='unavailable').map(s=>s.id));assert.ok(raw.facts.every(f=>f.status!=='supported'||f.sourceIds?.length&&f.sourceIds.every(id=>known.has(id))));}else{assert.deepEqual(require('../../lib/creative-ai/marketing-strategist/schema-validator').check({type:'object',properties:{kind:{enum:['product','reference']},label:{type:'string'},confidence:{type:'number',minimum:0,maximum:1}},required:['kind','label','confidence'],additionalProperties:false},raw),[]);}}
  catch(e){error=e.message;}
  const row={stage:raw.findings?'brand research':'product-image classification',attempt:receipt.attempt,model:receipt.model,inputTokens:receipt.usage.input_tokens,cachedInputTokens:receipt.usage.input_tokens_details.cached_tokens,outputTokens:receipt.usage.output_tokens,outputLimit:receipt.outputTokenLimit,serverSeconds:Number.isFinite(saved.completed_at)&&Number.isFinite(saved.created_at)?saved.completed_at-saved.created_at:null,status:receipt.responseStatus,recordedOutputValidation:error?'rejected':'passed',error};
  receipts.push(row);recorded.push({raw,row});
 }
 assert.equal(receipts.filter(r=>r.stage==='brand research'&&r.recordedOutputValidation==='passed').length,1);
 pass('Recorded research outputs','Original invalid finding asset IDs still reject; the successful research and classification outputs validate. No output rewritten.');
 const packetRows=[],packets=require('../../lib/creative-ai/runtime/role-packets');
 const assets=research.dossier.assets.map(({imageData,...a})=>a),input={brandKnowledge:scope,brief:'Offline Sleepyhead packet transport check; not a campaign brief.',brandResearch:{...research.dossier,assets},facts:research.facts};
 const before=JSON.stringify(input),temp=await fs.mkdtemp(path.join(os.tmpdir(),'sleepyhead-qa-'));
 try{
  for(const role of ['strategy','concepts','copy','art','reconciliation','review']){
   const start=performance.now(),first=await packets.prepare(role,input,temp),second=await packets.prepare(role,{...input,brief:'Different offline brief'},temp);
   assert.equal(first.metadata.status,'created');assert.equal(second.metadata.status,'hit');assert.equal(first.metadata.key,second.metadata.key);
   const expanded=packets.expand(first.input.brandContext,first.input.brandContext.sharedText||{});
   // Check every lifted non-source row survives exactly; source URLs/dates are deliberately local registry fields.
   for(const [field,rows]of Object.entries(expanded.fields)){if(field.endsWith('sources'))continue;const original=field.split('.').reduce((x,k)=>x[k],input);for(const row of rows)assert.ok(original.some(x=>JSON.stringify(x)===JSON.stringify(row)));}
   assert.notEqual((await packets.prepare(role,{...input,brandKnowledge:{...scope,revision:'qa-changed'}},temp)).metadata.key,first.metadata.key);
   packetRows.push({role,originalBytes:bytes(input),packetEnvelopeBytes:bytes(first.input),stablePacketCharacters:first.metadata.characters,cacheStatus:second.metadata.status,elapsedMs:Math.round((performance.now()-start)*100)/100});
  }
  const p=await packets.prepare('art',input,temp);await fs.writeFile(path.join(temp,p.metadata.key+'.json'),JSON.stringify({key:p.metadata.key,packet:{tampered:true}}));await assert.rejects(()=>packets.prepare('art',input,temp),/changed/);
 }finally{await fs.rm(temp,{recursive:true,force:true});}
 assert.equal(JSON.stringify(input),before);pass('Six role context packets','Cache reuse, revision invalidation, original immutability, evidence preservation and tamper rejection passed. These are packet-layer probes, not creative-agent runs.');
 const selected=researchModule.orderedImages(research.dossier.assets);
 researchModule.validateAssetLabels([{assetId:selected[0].id,kind:'reference',label:'QA label'}],selected);
 assert.throws(()=>researchModule.validateAssetLabels([{assetId:'not-attached',kind:'reference',label:'Unseen'}],selected));
 pass('Inspected-image label boundary','Unseen, unknown, duplicate and malformed labels are covered by the new regression tests.');
 const envelope=[];const originalFetch=global.fetch;
 try{
  global.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');envelope.push(require('../../lib/creative-ai/runtime/handoff-metrics').measure(JSON.parse(options.body),options.body));throw Error('OFFLINE_ENVELOPE_CAPTURE');};
  const provider=new isolation.BrandScopedProvider(new(require('../../lib/creative-ai/runtime/provider').OpenAIProvider)({inputContextPreflight:false,reasoningModel:'offline-envelope-only',reasoningTimeoutMs:1000}),{});
  const request=researchModule.researchRequest(job.intake,{pages:research.pages,sources:research.dossier.sources,assets:research.dossier.assets});
  await assert.rejects(()=>provider.reason(request,{reserve:async()=>{},receipt:async()=>{},brandContext:async()=>({intake:job.intake,dir})}),/OFFLINE_ENVELOPE_CAPTURE/);
 }finally{global.fetch=originalFetch;}
 pass('Current research request envelope','Real provider serialisation captured at mocked transport; zero external calls. Reconstructed from final saved evidence, not the exact original request.');
 const placements=require('../../lib/creative-ai/runtime/placements'),matrix=[];
 for(const item of require('./qa-digital-matrix').cases()){
  const {selections}=placements.resolve({brandUrl:brand.brandUrl,placementIds:[item.id],customProfiles:item.customProfiles,carouselSlideCount:4});
  for(const s of selections){const {width,height}=s.description.dimensions,g=placements.generationSize(width,height);assert.ok(g.width%16===0&&g.height%16===0);assert.ok(g.width/g.height<=3&&g.height/g.width<=3);assert.ok(g.crop.x>=0&&g.crop.y>=0&&g.crop.x+g.crop.width<=g.width+1e-6&&g.crop.y+g.crop.height<=g.height+1e-6);assert.ok(Math.abs(g.crop.width/g.crop.height-width/height)<1e-9);matrix.push({format:item.id,placement:s.id,width,height,modelCanvas:g.size});}
 }
 pass('Digital dimension and crop contracts',`${new Set(matrix.map(x=>x.format)).size} formats / ${matrix.length} expanded placements. Geometry only; no invented Sleepyhead layouts or artwork.`);
 const campaigns=[];for(const id of await fs.readdir(path.join(root,'output/creative-ai/jobs'))){try{const j=JSON.parse(await fs.readFile(path.join(root,'output/creative-ai/jobs',id,'job.json'),'utf8'));if(j.intake.brandId===brandId)campaigns.push(id);}catch(e){if(e.code!=='ENOENT')throw e;}}
 assert.deepEqual(await Promise.all(protectedFiles.map(async f=>digest(await fs.readFile(f)))),hashes);pass('Archive immutability',`${protectedFiles.length} saved manifest/research/receipt files unchanged.`);
 return {version:1,brand:'Sleepyhead',brandId,researchId:job.id,createdAt:new Date().toISOString(),mode:'offline-recorded-research-and-context-contract-QA',elapsedMs:Math.round(performance.now()-began),paidCalls:0,costINR:0,inventory:{documents:brand.documents.length,libraryAssets:brand.assets.length,researchAssets:assets.length,sources:research.dossier.sources.length,findings:research.dossier.findings.length,facts:research.facts.length,creativeCampaigns:campaigns.length},checks,receipts,packetRows,envelope,matrix,findings:[{severity:'fixed',text:'Asset labels previously accepted generic objects and silently ignored unknown IDs/kinds. The live request now advertises exact attached IDs and validates labels, duplicate IDs and extra fields before acceptance.'},{severity:'historical',text:'One research retry was caused by finding asset IDs using library-source IDs instead of research-image IDs. Historical artifacts remain unchanged.'},{severity:'coverage gap',text:'No saved Sleepyhead creative campaign exists. Strategy, concept, copy, art, reconciliation and rendered-review output replay are unavailable.'},{severity:'coverage gap',text:'Original attachment selections and per-request envelopes were not logged. Current capture uses final saved evidence and cannot establish which images the historical call inspected.'}],limits:['No new model calls, images or live latency measurement. Server seconds are recorded provider timestamps, not full end-to-end task time.','Role-packet hits are local file-cache hits; they do not guarantee provider token-cache hits.','All-format check validates geometry, not rendered copy readability, logo placement or creative quality.','Shared timeout, token-ceiling, strict JSON, typed edits and recovery behavior are checked by the accompanying full offline regression suite.']};
}
if(require.main===module){global.fetch=async()=>{throw Error('Network forbidden in Sleepyhead QA');};run().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.stack);process.exitCode=1;});}
module.exports={run};
