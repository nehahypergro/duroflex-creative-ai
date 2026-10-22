#!/usr/bin/env node
'use strict';
const fs=require('fs/promises'),af=require('../../lib/creative-ai/runtime/artifact-fs'),path=require('path'),assert=require('node:assert/strict'),crypto=require('crypto'),{Readable}=require('node:stream');
const root=path.resolve(__dirname,'../..'),languageSamples=require('./qa-language-samples');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function samplesForBrand(name){assert.ok(['Duroflex','Sleepyhead'].includes(name),'Explicit supported brand name required');return Object.fromEntries(Object.entries(languageSamples).map(([language,text])=>[language,text.replaceAll('Sleepyhead Original',name).replaceAll('Original',name)]));}
async function run({jobId:id,brandName}={}){
 assert.match(id||'',/^creative-[a-f0-9-]{36}$/,'Valid recorded job ID required');
 assert.ok(['Duroflex','Sleepyhead'].includes(brandName),'Explicit supported brand name required');
 const began=performance.now(),dir=path.join(root,'output/creative-ai/jobs',id),read=async n=>JSON.parse(await af.readFile(path.join(dir,n),'utf8'));
 const [job,input,identity]=await Promise.all(['job.json','art-input.json','product-identity.json'].map(read));const brandId=job.intake.brandId;assert.match(brandId,/^brand-[a-f0-9-]{36}$/);assert.equal(identity.brandId,brandId);
 const brand=JSON.parse(await fs.readFile(path.join(root,'output/creative-ai/brands',brandId,'brand.json'),'utf8'));assert.equal(brand.name,brandName,'Recorded campaign belongs to a different brand');
 const samples=samplesForBrand(brandName);
 const originals={};async function capture(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const f=path.join(dir,item.name);if(item.isDirectory())await capture(f);else if(item.isFile())originals[f]=digest(await fs.readFile(f));}}
 await capture(dir);await capture(path.join(root,'output/creative-ai/brands',brandId));await capture(path.join(root,'output/cost-tracking'));
 const placements=require('../../lib/creative-ai/runtime/placements'),wire=require('../../lib/creative-ai/runtime/copy-wire'),text=require('../../lib/creative-ai/runtime/text-boundary'),normal=require('../../lib/creative-ai/runtime/campaign-input').normalize,{readJsonBody}=require('../../server'),matrix=[];let rejected=0;
 for(const item of require('./qa-digital-matrix').cases()){
  const {selections}=placements.resolve({brandUrl:job.intake.brandUrl,placementIds:[item.id],customProfiles:item.customProfiles,carouselSlideCount:4});
  for(const language of Object.keys(samples)){
   const brief=samples[language]+'\n'+identity.productName+' / '+identity.variant.name+'\n"Quote" \\ literal &amp; <tag> 👨‍👩‍👧‍👦',intake=normal({...job.intake,brief,language,market:language==='Arabic'?'UAE':'India',audience:'Young adults refreshing a bedroom'});
   const bytes=Buffer.from(JSON.stringify(intake)),parsed=await readJsonBody(Readable.from([bytes.subarray(0,33),bytes.subarray(33)]),bytes.length);assert.equal(parsed.brief,brief);assert.equal(parsed.language,language);
   const prefix='Current campaign instructions; not substantiation of product claims: ',guide=require('../../lib/creative-ai/runtime/brand-guide-cache').campaignGuide({requirements:[]},brief);assert.equal(guide.requirements.map(r=>r.text.slice(prefix.length)).join(''),brief);
   for(const selected of selections){
    const w=wire.wire({concepts:input.directorOutput.concepts,placements:[selected],strategy:input.directorInput.strategy},'Offline encoding test');
    const fields=input.copy[0].fields.filter(f=>f.delivery==='embedded').map(({id,delivery,nativeFieldId,...f},i)=>({...f,text:i===0?samples[language]:f.text,target:'embedded'}));
    const raw={units:Object.fromEntries(input.directorOutput.concepts.map((c,i)=>['unit'+i,{fields:structuredClone(fields)}])),rationale:'Transport fixture only',unknowns:[]};
    const decoded=w.decode(JSON.parse(JSON.stringify(raw)));assert.equal(decoded.decks.length,2);for(const deck of decoded.decks)assert.deepEqual(deck.fields.map(f=>f.text),fields.map(f=>f.text));
    const bad=structuredClone(raw);bad.units.unit0.fields[0].unexpected='never discard';assert.throws(()=>w.decode(bad));rejected++;
    const encoded=structuredClone(raw);encoded.units.unit0=JSON.stringify(encoded.units.unit0);assert.throws(()=>w.decode(encoded));rejected++;
    matrix.push({profile:item.id,placement:selected.id,language,status:'passed',units:2});
   }
  }
 }
 // Rebuild exact child packages from the selected brand’s saved package, with synthetic
 // localized copy. This checks identity/hash/prompt plumbing, not translation quality.
 const refinements=require('../../lib/creative-ai/runtime/refinements'),result=job.results.find(r=>r.route==='continuity'&&r.imageUrl),review=await read(path.basename(result.reviewUrl));
 let record;for(const file of (await fs.readdir(dir)).filter(f=>f.startsWith('package-'+result.route+'-'+result.placementId+'-')&&f.endsWith('.json'))){const candidate=await read(file);if(candidate.packageHash===review.packageHash)record=candidate;}
 assert.ok(record,'Package bound to the selected review required');const before=digest(JSON.stringify(record)),versions=[];
 const editableIndex=record.exactCopy.fields.findIndex(f=>!text.numericTokens(f.text).length&&f.delivery==='embedded');assert.ok(editableIndex>=0,'A nonnumeric embedded field is required for this translation fixture');
 for(const [language,transportSample]of Object.entries(samples)){
  const sample=language==='English'?'Explore '+brandName+' — 👩🏽‍💻':transportSample;
  const fields=record.exactCopy.fields.map((f,i)=>({id:f.id,text:i===editableIndex?sample:f.text})),change={action:'translate',language,market:'India',mode:'faithful'},plan={accepted:true,reason:'Offline fixture',fields,visual:Object.fromEntries(['scene','composition','imageTreatment','camera','lighting'].map(k=>[k,record.artDirection[k]])),explanation:'Offline language handoff fixture'};
  refinements.validatePlan(plan,change,record);const child=refinements.revisePackage(record,plan,change);assert.notEqual(child.packageHash,record.packageHash);assert.deepEqual(child.productReference,record.productReference);assert.deepEqual(child.protectedProduct,record.protectedProduct);assert.deepEqual(child.attachmentManifest,record.attachmentManifest);assert.equal(child.exactCopy.fields[editableIndex].text,sample);assert.ok(child.prompt.includes(sample));assert.ok(child.prompt.includes('Write naturally in '+language));versions.push({language,status:'passed'});
 }
 assert.equal(digest(JSON.stringify(record)),before);
 let seed=721;for(let i=0;i<1000;i++){seed=(seed*1664525+1013904223)>>>0;const w=64+seed%3937;seed=(seed*1664525+1013904223)>>>0;const h=64+seed%3937;if(w/h>20||h/w>20){assert.throws(()=>placements.generationSize(w,h));continue;}const g=placements.generationSize(w,h);assert.ok(g.width%16===0&&g.height%16===0);assert.ok(g.width/g.height<=3&&g.height/g.width<=3);assert.ok(Math.abs(g.crop.width/g.crop.height-w/h)<1e-9);assert.ok(g.crop.x>=0&&g.crop.y>=0);}
 // Campaign-specific changes cannot remain hidden inside a reusable SKU audit key.
 const cache=require('../../lib/creative-ai/runtime/sku-audit-cache'),request={instructions:'Fixture',schema:{type:'object'},input:{sku:identity.variant.sku},images:[{id:identity.assetId,imageData:'fixture-image'}]},profile={id:identity.productId,snapshot:'snapshot-qa',pageHash:'fixture-source'};
 const key=intake=>cache.hash(cache.binding({intake,profile,request})),base={brandId,productProtection:identity};assert.equal(key(base),key({...base,brief:'Different brief',language:'Hindi',market:'India'}));assert.notEqual(key(base),key({...base,productProtection:{...identity,variant:{...identity.variant,id:'different'}}}));assert.notEqual(key(base),key({...base,brandId:'foreign-brand'}));
 for(const [file,hash]of Object.entries(originals))assert.equal(digest(await fs.readFile(file)),hash,'Saved evidence changed: '+file);
 return {brand:brandName,jobId:id,createdAt:new Date().toISOString(),mode:'offline-next-run-boundary-matrix',elapsedMs:Math.round(performance.now()-began),paidCalls:0,costINR:0,languages:Object.keys(samples),profiles:new Set(matrix.map(r=>r.profile)).size,languagePlacementCases:matrix.length,copyUnits:matrix.reduce((n,r)=>n+r.units,0),rejectedMalformedHandoffs:rejected,localizedPackageRebuilds:versions.length,randomizedCanvasCases:1000,protectedFilesUnchanged:Object.keys(originals).length,skuBindingChecks:3,matrix,versions,limits:['Synthetic multilingual strings test exact transport, not native-language writing quality or glyph rendering.','No model calls, external network or new images. Product audit binding checks do not re-audit a SKU.','Recorded brand source files are unchanged; generated fixture packages remain in memory.','Format geometry and encoding do not prove artwork readability, crop safety or publisher acceptance.']};
}
if(require.main===module){global.fetch=async()=>{throw Error('External network forbidden during next-run QA');};run({jobId:process.argv.find(a=>a.startsWith('--job='))?.slice(6),brandName:process.argv.find(a=>a.startsWith('--brand='))?.slice(8)}).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.stack);process.exitCode=1;});}
module.exports={run,samplesForBrand};
