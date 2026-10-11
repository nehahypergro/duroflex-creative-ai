'use strict';
// Explicitly requested, text/vision-only comparison. Never creates campaign jobs,
// changes model routing, or permits an image generation endpoint/tool.
const fs=require('fs/promises'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'work/model-comparison-2026-10-11');
const {OpenAIProvider,sanitize}=require('../../lib/creative-ai/runtime/provider');
const focused=require('../../lib/creative-ai/runtime/focused-context');
const publishing=require('../../lib/creative-ai/runtime/publishing-copy');
const {check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
const hash=v=>crypto.createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const read=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const models=['gpt-6-luna','gpt-5.4-mini'];
const sources=['creative-79f8d6e1-230f-40c8-9742-1ac25ab1ea3c','creative-7f550f3b-b29c-41a4-a000-8f0df7879f40'];
const rates={'gpt-6-luna':{input:.1,cached:.01,write:.125,output:.5},'gpt-5.4-mini':{input:.75,cached:.075,output:4.5}};
const scenePolicy='Match furniture colour/material/make/scale to a complementary interior without redesigning the SKU. Product, people and room share plausible directional light, exposure, contact/cast shadows and occlusion. Believable anatomy and supported poses. Negative space is a real scene surface: no artificial white patches, haze, gradient/fade or blur mask added to rescue text/logo contrast. A natural pale wall/light falloff is allowed.';
const string={type:'string'},strings={type:'array',items:string};
const object=properties=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const planSchema=object({audience:string,proposition:string,proofFactIds:strings,routes:{type:'array',minItems:2,maxItems:2,items:object({route:{enum:['continuity','exploration']},idea:string,roomMaterials:string,lightingAndContact:string,personPose:string,productProtection:string,copyAndPlacement:string})},uncertainties:strings});
const translationSchema=object({language:{type:'string',enum:['Hindi']},fields:{type:'array',items:object({id:string,sourceText:string,text:string})},localisationNotes:strings});
async function capture(fn){let request;const stop=Error('capture-only');try{await fn({reason:async r=>{request=r;throw stop;}});}catch(e){if(e!==stop)throw e;}assert(request);return request;}
function basicValidate(schema){return v=>{const errors=check(schema,v);if(errors.length)throw Error(errors.join('\n'));};}
async function tasks(){
 const tasks=[],sourceHashes={};
 for(const id of sources){
  const dir=path.join(root,'output/creative-ai/jobs',id),j=await read(path.join(dir,'job.json')),pkg=await read(path.join(dir,'generation-packages.json'));
  const brand=await read(path.join(root,'output/creative-ai/brands',j.intake.brandId,'brand.json'));
  const current=await read(path.join(root,'output/creative-ai/research-sessions',brand.latestResearchId,'job.json'));
  assert.equal(current.intake.brandId,j.intake.brandId);assert.equal(j.intake.researchId,brand.latestResearchId);
  const r=pkg.records.find(r=>r.route==='continuity'),si=r.upstreamContext.strategyInput;
  assert(si.research.sources.filter(s=>s.kind==='guidelines').every(s=>brand.documents.some(d=>d.id===s.id)));
  const base={brandId:brand.id,brandName:brand.name,brief:j.intake.brief,productPageUrl:j.intake.productPageUrl,canvas:r.canvas,facts:si.facts,guardian:si.guardian,sourceReferences:si.research.sources,exactCopy:r.exactCopy,clientScenePolicy:scenePolicy};
  const brandSlug=brand.name.toLowerCase();
  const plan={contextKind:'general',instructions:'Create a compact text-only strategy and art-direction plan for the saved brief. Return exactly two genuinely distinct continuity/exploration routes. Respect all exact copy locks, supported product identity and same-brand rules. Distinguish inferred audience/design choices from supplied authority. Do not borrow other brands, invent offers, health/performance claims, product facts or source IDs. Resolve a complementary room, coherent light/shadows, anatomy/support where requested and real negative space. Respect actual dimensions and safe areas. No image generation. Current task is planning only; do not certify future pixels.',input:base,schema:planSchema,strictSchema:true,maxOutputTokens:5000,reasoningEffort:'medium',validate:v=>{basicValidate(planSchema)(v);assert.deepEqual(new Set(v.routes.map(x=>x.route)),new Set(['continuity','exploration']));assert(v.proofFactIds.every(id=>si.facts.some(f=>f.id===id)));}};
  tasks.push({id:brandSlug+'-planning',stage:'planning',brandId:brand.id,brandName:brand.name,request:plan});
  const imageName='static-'+r.route+'-'+r.placementId+'-0.png',imageBytes=await fs.readFile(path.join(dir,imageName));
  const imageData='data:image/png;base64,'+imageBytes.toString('base64');
  const ev=publishing.evidence(r,j.intake),profile=publishing.publicProfiles().find(p=>p.id==='instagram');
  const caption={contextKind:'publishing-copy',instructions:'Write accompanying Instagram copy for this ONE actual saved creative: caption, optional short hashtags, concise altText. Preserve same-brand tone, product identity, supported qualifiers and central message. Add one useful complementary angle instead of merely repeating the headline. Use concise natural product naming, never invented offers/prices/urgency/health promises. Product claims need relevant proofFactIds from supplied supported facts. The embedded artwork copy is context, not mandatory verbatim caption wording. Alt text describes actual visible pixels without unseen feature claims. Studio character targets are supplied in profile. No URLs in fields; no workflow language. No image generation. Return each requested field exactly once. Keep note one sentence.',input:{...ev,profile,brandName:brand.name,brief:j.intake.brief,language:'English',clientScenePolicy:scenePolicy},images:[{id:'selected-creative',label:'Actual unchanged saved artwork',imageData}],schema:publishing.schemaFor('instagram',ev.facts),strictSchema:true,maxOutputTokens:3000,reasoningEffort:'medium',validate:v=>publishing.validateFields(v,'instagram',ev.facts)};
  tasks.push({id:brandSlug+'-caption',stage:'caption',brandId:brand.id,brandName:brand.name,request:caption});
  const fields=r.exactCopy.fields.map(f=>({id:f.id,sourceText:f.text}));
  const localise={contextKind:'general',instructions:'Localise the supplied existing artwork copy to natural Hindi for India, preserving meaning, qualifiers, same-brand tone and field identity. This explicitly requested text-only localisation overrides the original English-language requirement only. Do not invent offers, product claims, copy fields, or extra messages. Keep brand wordmark and full product identifier verbatim in Latin script; translate headline and CTA naturally, keeping the product name Meadow/Bubbles in Latin script within the CTA. Retain concision and reading hierarchy. Return each source field once, with exact sourceText. Explain any idiomatic choice briefly. No image generation and no artwork modification.',input:{brandName:brand.name,fields:r.exactCopy.fields,guardian:si.guardian,facts:si.facts,target:'Hindi, India'},schema:translationSchema,strictSchema:true,maxOutputTokens:3000,reasoningEffort:'medium',validate:v=>{basicValidate(translationSchema)(v);assert.equal(v.fields.length,fields.length);assert.equal(new Set(v.fields.map(f=>f.id)).size,fields.length);for(const f of v.fields){const src=r.exactCopy.fields.find(s=>s.id===f.id);assert(src&&src.text===f.sourceText);if(src.role==='brand'||src.role==='body')assert.equal(f.text,src.text);}}};
  tasks.push({id:brandSlug+'-hindi',stage:'localisation',brandId:brand.id,brandName:brand.name,request:localise});
  sourceHashes[id]={job:hash(await fs.readFile(path.join(dir,'job.json'))),packages:hash(await fs.readFile(path.join(dir,'generation-packages.json'))),artworks:{}};
  for(const record of pkg.records){
   const name='static-'+record.route+'-'+record.placementId+'-0.png',bytes=await fs.readFile(path.join(dir,name)),data='data:image/png;base64,'+bytes.toString('base64');sourceHashes[id].artworks[name]=hash(bytes);
   const captureDir=path.join(out,'inputs',brandSlug+'-'+record.route);await fs.mkdir(captureDir,{recursive:true});await fs.copyFile(path.join(dir,'placement-catalog.json'),path.join(captureDir,'placement-catalog.json'));
   // Capture the exact current runtime review request; all original files untouched.
   const request=await capture(p=>require('../../lib/creative-ai/runtime/review').review(record,data,{provider:p,budget:{},dir:captureDir,attempt:'capture'}));
   tasks.push({id:brandSlug+'-review-'+record.route,stage:'visual-review',brandId:brand.id,brandName:brand.name,request});
  }
 }
 return {tasks,sourceHashes};
}
function cost(receipt){const u=receipt.usage,r=rates[receipt.model],cached=u.input_tokens_details?.cached_tokens||0,writes=u.input_tokens_details?.cache_write_tokens||u.input_tokens_details?.cache_creation_tokens||0;assert(cached+writes<=u.input_tokens);return ((u.input_tokens-cached-writes)*r.input+cached*r.cached+writes*(r.write??r.input)+u.output_tokens*r.output)/1e6;}
async function main(){
 await fs.mkdir(out,{recursive:true});const built=await tasks();
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),models,fxInrPerUsd:97,fxBasis:'Fixed comparison reporting assumption, not a current bank conversion or tax-inclusive invoice.',method:'10 matched tasks; one trial per model, same prompt/schema/images/effort/limits per task. Planning/caption/localisation are compact diagnostic tasks; visual review uses the exact current runtime request and validator. No automatic campaign writes or model switches. At most one normal contract repair per task. Independent assistant assessment; not a statistical benchmark or human user panel.',tasks:built.tasks.map(({id,stage,brandName,request})=>({id,stage,brandName,effort:request.reasoningEffort,maxOutputTokens:request.maxOutputTokens,inputHash:hash(sanitize(request.input)),instructionsHash:hash(request.instructions),imageHashes:request.images?.map(a=>({id:a.id,hash:hash(a.imageData)}))||[]})),sourceHashes:built.sourceHashes,rates,rateSources:['https://developers.openai.com/api/docs/models/gpt-6-luna','https://developers.openai.com/api/docs/models/gpt-5.4-mini'],imagesGenerated:0},null,2));
 if(process.argv.includes('--prepare')){console.log(JSON.stringify({prepared:true,tasks:built.tasks.length,out}));return;}
 const cfg=require('../../lib/creative-ai/runtime/config').loadConfig(root);cfg.apiKey=cfg.apiKey||require('../../lib/creative-ai/runtime/config').loadConfig('/Users/neha/Desktop/codex2').apiKey;assert(cfg.apiKey,'Configured API credential unavailable');
 const nativeFetch=global.fetch;
 global.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses','Only Responses text/vision API permitted');const body=JSON.parse(options.body);assert(models.includes(body.model));assert(!body.tools,'Image/tool dispatch forbidden');const response=await nativeFetch(url,options);if(!response.ok){const error=await response.clone().json().catch(()=>({}));await fs.appendFile(path.join(out,'provider-errors.jsonl'),JSON.stringify({at:new Date().toISOString(),model:body.model,status:response.status,error:error.error})+'\n');}return response;};
 const all=[];
 // Alternate model order by case; concurrent model pair, no cross-brand context.
 for(const [index,t] of built.tasks.entries()){
  const ordered=index%2?[...models].reverse():models;
  const pair=await Promise.all(ordered.map(async(model)=>{
   const file=path.join(out,t.id+'-'+model+'.json');let harnessPriorFailures=[];try{const existing=await read(file);if(existing.finishedAt&&(existing.status==='passed-contract'||existing.receipts.length))return existing;if(existing.finishedAt){harnessPriorFailures=[...(existing.harnessPriorFailures||[]),{error:existing.error,reservations:existing.reservations,startedAt:existing.startedAt,finishedAt:existing.finishedAt,receiptCount:existing.receipts.length}];await fs.writeFile(file+'.initial-harness-error',JSON.stringify(existing,null,2));}}catch(e){if(e.code!=='ENOENT')throw e;}
   const saved={taskId:t.id,stage:t.stage,brandId:t.brandId,brandName:t.brandName,model,startedAt:new Date().toISOString(),receipts:[],reservations:0,harnessPriorFailures};
   const persist=()=>fs.writeFile(file,JSON.stringify(saved,null,2));
   const budget={reserve:async kind=>{assert.equal(kind,'reasoning');assert(saved.reservations<2,'At most one bounded repair');saved.reservations++;},receipt:async r=>{saved.receipts.push({...r,recordedAt:new Date().toISOString()});await persist();}};
   const provider=new OpenAIProvider({...cfg,reasoningModel:model,maxRecoveryOutputTokens:t.request.maxOutputTokens*2});
   const start=Date.now();try{saved.output=await provider.reason(t.request,budget);saved.status='passed-contract';}catch(e){saved.status='failed';saved.error=e.message;}saved.elapsedMs=Date.now()-start;saved.estimatedUsd=saved.receipts.reduce((n,r)=>n+cost(r),0);saved.estimatedInr=saved.estimatedUsd*97;saved.finishedAt=new Date().toISOString();await persist();return saved;
  }));
  all.push(...pair);console.log(JSON.stringify({completedTask:t.id,results:pair.map(r=>({model:r.model,status:r.status,calls:r.receipts.length,inr:+r.estimatedInr.toFixed(4),seconds:+(r.elapsedMs/1000).toFixed(1),error:r.error}))}));
 }
 for(const id of sources){const d=path.join(root,'output/creative-ai/jobs',id),h=built.sourceHashes[id];assert.equal(hash(await fs.readFile(path.join(d,'job.json'))),h.job);assert.equal(hash(await fs.readFile(path.join(d,'generation-packages.json'))),h.packages);for(const [name,expected] of Object.entries(h.artworks))assert.equal(hash(await fs.readFile(path.join(d,name))),expected);}
 const summary=models.map(model=>{const rows=all.filter(r=>r.model===model);return {model,tasks:rows.length,contractPasses:rows.filter(r=>r.status==='passed-contract').length,calls:rows.reduce((n,r)=>n+r.receipts.length,0),usd:rows.reduce((n,r)=>n+r.estimatedUsd,0),inr:rows.reduce((n,r)=>n+r.estimatedInr,0),seconds:rows.reduce((n,r)=>n+r.elapsedMs/1000,0),inputTokens:rows.flatMap(r=>r.receipts).reduce((n,r)=>n+r.usage.input_tokens,0),outputTokens:rows.flatMap(r=>r.receipts).reduce((n,r)=>n+r.usage.output_tokens,0)};});
 await fs.writeFile(path.join(out,'cost-summary.json'),JSON.stringify({models:summary,sourceFilesUnchanged:true,imagesGenerated:0},null,2));
 // Blind response labels for assessment; mapping is not printed with responses.
 const blind=[],mapping={};for(const t of built.tasks){const pair=all.filter(r=>r.taskId===t.id).sort(()=>crypto.randomInt(2)?1:-1);for(const [i,r] of pair.entries()){const label=t.id+'-'+String.fromCharCode(65+i);mapping[label]=r.model;blind.push({label,stage:r.stage,status:r.status,error:r.error,output:r.output});}}
 await fs.writeFile(path.join(out,'blind-outputs.json'),JSON.stringify(blind,null,2));await fs.writeFile(path.join(out,'blind-map.json'),JSON.stringify(mapping,null,2));
 // These eval receipts are outside automatic job scanning. Register unique,
 // additional usage estimates, never invoices, exactly once in the existing ledger.
 const {CostTracker}=require('../../lib/cost-tracker'),tracker=new CostTracker(root,await read(path.join(root,'workspace.json')));
 for(const brandId of new Set(all.map(r=>r.brandId)))for(const model of models){const rows=all.filter(r=>r.brandId===brandId&&r.model===model),receipts=rows.flatMap(r=>r.receipts);if(!receipts.length)continue;const reference='model-comparison-2026-10-11:'+brandId+':'+model;const prior=await tracker.read('manual.json',[]),amount=rows.reduce((n,r)=>n+r.estimatedUsd,0),note=model+' text/vision comparison; '+receipts.length+' unique provider receipts. Usage × published Standard rates; includes reasoning output, no invoice/tax claim. Raw response IDs, usage and calculation: work/model-comparison-2026-10-11. No images generated.';const existing=prior.find(r=>r.reference===reference);if(existing){if(existing.estimatedUsd!==amount||existing.notes!==note){existing.estimatedUsd=amount;existing.notes=note;await tracker.save('manual.json',prior);}continue;}await tracker.add({brandId,category:'Logic / LLMs',purpose:'Testing',basis:'estimate',amount,reference,note});}
 console.log(JSON.stringify({finished:true,summary,out}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
