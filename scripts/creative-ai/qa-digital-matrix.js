#!/usr/bin/env node
'use strict';
const path=require('path'),assert=require('node:assert/strict'),sharp=require('sharp');
const fs=require('../../lib/creative-ai/runtime/artifact-fs');
const pk=require('../../lib/creative-ai/placement-knowledge'),placements=require('../../lib/creative-ai/runtime/placements'),formats=require('../../lib/creative-ai/runtime/output-formats');
const {check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
const art=require('../../lib/creative-ai/art-director');
const root=path.resolve(__dirname,'../..');
const defaultSourceJob='creative-8e57a041-f219-4be2-afce-15a7a97f4b3a';
function cases(){
 const catalog=pk.loadCatalog();
 const rows=[...formats.presets.filter(p=>p.kind!=='print').map(p=>({id:p.id,kind:p.kind})),...catalog.profiles.filter(p=>placements.describe(p,catalog).supported).map(p=>({id:p.id,kind:'catalog-static'}))];
 for(const [width,height]of [[1920,768],[2000,100],[100,2000]])rows.push({id:'custom:qa-'+width+'x'+height,kind:'custom-boundary',customProfiles:[{id:'custom:qa-'+width+'x'+height,name:'QA boundary '+width+'×'+height,platform:'QA only',publisher:'QA',placement:'Synthetic transport check',assetType:'static',canvas:{width,height,unit:'px'},exportContract:{formats:['png']},displayContext:'QA only; no publishing approval.'}]});
 return rows;
}
function patchFor(expected){return {adjustments:expected.specifications.map(s=>({conceptId:s.conceptId,placementId:s.placementId,status:s.status,dependencies:s.dependencies,reconciliation:s.reconciliation,text:s.text.filter(f=>f.delivery!=='native').map(({fieldId,position,font,sizeDirection,contrastDirection})=>({fieldId,position,font,sizeDirection,contrastDirection})),changes:[]}))};}
async function calibration(g){
 // Synthetic coordinate pattern for crop/export testing, never a creative output.
 const bytes=Buffer.alloc(g.width*g.height*3);for(let y=0;y<g.height;y++)for(let x=0;x<g.width;x++){const i=(y*g.width+x)*3;bytes[i]=Math.round(x*255/(g.width-1));bytes[i+1]=Math.round(y*255/(g.height-1));bytes[i+2]=((x>>5)+(y>>5))%2?200:40;}
 return 'data:image/png;base64,'+(await sharp(bytes,{raw:{width:g.width,height:g.height,channels:3}}).png().toBuffer()).toString('base64');
}
async function run({onCase=()=>{},sourceJob=defaultSourceJob}={}){
 if(!/^creative-[a-f0-9-]{36}$/.test(sourceJob))throw Error('Invalid recorded job ID');
 const started=Date.now(),directory=path.join(root,'output/creative-ai/jobs',sourceJob);
 const [input,output,job]=await Promise.all(['art-input.json','art-output.json','job.json'].map(async n=>JSON.parse(await fs.readFile(path.join(directory,n),'utf8'))));
 const before=art.fingerprint({input,output}),ctx=await art.assembleContext(input,{catalog:JSON.parse(await fs.readFile(path.join(directory,'placement-catalog.json'),'utf8')),includeMessages:false});
 const matrix=[],images=new Map();let negativeChecks=0;
 for(const item of cases()){
  const begin=Date.now();try{
   const {catalog,selections}=placements.resolve({brandUrl:job.intake.brandUrl,placementIds:[item.id],customProfiles:item.customProfiles,carouselSlideCount:4});
   const rows=[];
   for(const selected of selections){
    const {width,height}=selected.description.dimensions,g=placements.generationSize(width,height);
    assert.ok(g.width%16===0&&g.height%16===0&&g.width/g.height<=3&&g.height/g.width<=3);
    assert.ok(g.crop.x>=0&&g.crop.y>=0&&g.crop.x+g.crop.width<=g.width+1e-6&&g.crop.y+g.crop.height<=g.height+1e-6);
    assert.ok(Math.abs(g.crop.width/g.crop.height-width/height)<1e-9);
    if(g.requiresCrop)assert.match(placements.generationInstruction(width,height),/CENTRAL retained rectangle/);
    const expected={specifications:output.specifications.map(s=>({...structuredClone(s),placementId:selected.id,formatId:selected.formatId}))};
    const w=require('../../lib/creative-ai/runtime/reconciliation-patch').wire({expected,artInput:input,ctx,copyFit:[],eligibleBrandGuidelineRules:[],visualFields:Object.keys(require('../../lib/creative-ai/runtime/agents').draftSchema.properties.drafts.items.properties).filter(k=>!['conceptId','placementId'].includes(k))});
    const patch=patchFor(expected),decoded=w.decode(JSON.parse(JSON.stringify(patch)));
    assert.deepEqual(decoded,expected);assert.deepEqual(check({type:'array',items:art.coreOutputSchema.properties.specifications.items},decoded.specifications),[]);
    const reversed=structuredClone(patch);reversed.adjustments.reverse();assert.deepEqual(w.decode(reversed),expected);
    const duplicate=structuredClone(patch);duplicate.adjustments[1]=duplicate.adjustments[0];assert.throws(()=>w.decode(duplicate));negativeChecks++;
    const stringified=structuredClone(patch);stringified.adjustments[0].changes=[{field:'crop',value:JSON.stringify(expected.specifications[0].crop)}];assert.throws(()=>w.decode(stringified));negativeChecks++;
    const drift=structuredClone(patch);drift.adjustments[0].text[0].exactText='Changed copy';assert.throws(()=>w.decode(drift));negativeChecks++;
    // Exercise the copy wire against the actual selected native-field contract.
    const expanded=pk.resolvePin(selected.pin,catalog),sourceCopy=input.copy[0];
    const fields=sourceCopy.fields.filter(f=>f.delivery==='embedded').map(({id,delivery,nativeFieldId,...f})=>({...f,target:'embedded'}));
    const wireInput={concepts:input.directorOutput.concepts,placements:[{...selected,expanded}],facts:input.directorInput.strategyInput.facts,strategy:input.directorInput.strategy};
    const cw=require('../../lib/creative-ai/runtime/copy-wire').wire(wireInput,'Offline fixture'),copyRaw={units:Object.fromEntries(wireInput.concepts.map((c,i)=>['unit'+i,{fields:structuredClone(fields)}])),rationale:'Recorded copy used for transport testing only.',unknowns:[]};
    const copy=cw.decode(copyRaw);assert.equal(copy.decks.length,2);assert.deepEqual(copy.decks[0].fields.map(f=>f.text),sourceCopy.fields.filter(f=>f.delivery==='embedded').map(f=>f.text));
    const fit=require('../../lib/creative-ai/runtime/copy-fit').assess(copy.decks[0],{...selected,expanded});
    if(!images.has(g.size))images.set(g.size,await calibration(g));
    const format=require('../../lib/creative-ai/runtime/export').outputFormat(expanded),record={canvas:{width,height},outputFormat:format,placementContext:{context:{placements:[expanded]}}};
    const exported=await require('../../lib/creative-ai/runtime/export').exportWholeStatic(images.get(g.size),record),meta=await sharp(exported.bytes).metadata();
    assert.equal(meta.width,width);assert.equal(meta.height,height);assert.equal(meta.format,format);assert.notEqual(exported.proof.fitsByteCeiling,false);
    const native=Object.fromEntries((expanded.profile.nativeFields||[]).filter(f=>f.required&&!f.platformSupplied).map(f=>[f.id,['Offline fixture']]));
    const technical=pk.reviewTechnical(selected.pin,{native,assets:{artwork:{width,height,format,bytes:exported.bytes.length}}},catalog);
    assert.ok(!(technical.checks||technical.results||[]).some(c=>c.status==='fail'),'Technical export contract failed');
    rows.push({placementId:selected.id,width,height,ratio:width+'/'+height,modelCanvas:g.size,crop:g.crop,requiresCrop:g.requiresCrop,exportBytes:exported.bytes.length,byteCeiling:exported.proof.conservativeByteCeiling,copyFit:fit?.status||'no-policy',copyFitIssues:fit?.issues.map(i=>i.code)||[],technicalStatus:technical.status||technical.readiness||'see checks',technicalChecks:technical.checks||technical.results||[],units:2});
   }
   matrix.push({id:item.id,kind:item.kind,status:'passed',elapsedMs:Date.now()-begin,placements:rows});
  }catch(e){matrix.push({id:item.id,kind:item.kind,status:'failed',elapsedMs:Date.now()-begin,error:e.message});}
  onCase(matrix.at(-1));
 }
 assert.equal(art.fingerprint({input,output}),before);
 return {version:1,sourceJob,mode:'recorded-content-digital-transport-matrix',providerCalls:0,costINR:0,elapsedMs:Date.now()-started,profiles:matrix.length,failed:matrix.filter(r=>r.status==='failed').length,negativeChecks,units:matrix.flatMap(r=>r.placements||[]).reduce((n,p)=>n+p.units,0),ratios:[...new Set(matrix.flatMap(r=>r.placements||[]).map(p=>{const gcd=(a,b)=>b?gcd(b,a%b):a,d=gcd(p.width,p.height);return p.width/d+':'+p.height/d;}))],limits:'Reuses recorded copy/layout data to test transport and encoding, not new creative strategy or visual fit. Calibration pixels are synthetic. Full historical semantic replay is a separate check. Native fields in saved layouts remain locked; publishing eligibility, readability, crop safety of real content and people/product fidelity require actual artwork review.',matrix};
}
if(require.main===module){global.fetch=async()=>{throw Error('Network forbidden in QA matrix');};run({...(process.argv.find(a=>a.startsWith('--job='))?{sourceJob:process.argv.find(a=>a.startsWith('--job=')).slice(6)}:{}),onCase:r=>process.stderr.write(r.status+' '+r.id+'\n')}).then(report=>{console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;}).catch(e=>{console.error(e.stack);process.exitCode=1;});}
module.exports={cases,run,patchFor};
