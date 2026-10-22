'use strict';
// No generated creatives: source fixtures + synthetic copy/coordinate pixels.
const fs=require('fs/promises'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict'),sharp=require('sharp'),{Readable}=require('stream');
const root=path.resolve(__dirname,'../..'),runtime=path.join(root,'lib/creative-ai/runtime');
const placements=require(runtime+'/placements'),pk=require('../../lib/creative-ai/placement-knowledge'),formats=require(runtime+'/output-formats');
const {RUN,SEED}=require('./qa-random-sku-collect'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const formatNames=['social-square','social-portrait','social-story','social-landscape','pin-portrait','web-hero','email-hero','web-banner','commerce-comparison','display-skyscraper','display-wide-skyscraper','display-half-page','display-portrait','display-banner','display-leaderboard'];
const languages=['English','Hindi'];
const gcd=(a,b)=>b?gcd(b,a%b):a;
function matrix(sources){return sources.flatMap(b=>b.products.flatMap(p=>formatNames.flatMap(f=>languages.map(language=>({brand:b,product:p,formatId:'custom:studio-'+f,language,key:[b.brandId,p.variant.id,f,language].join('|')})))));}
async function calibration(g){
 const pixels=Buffer.alloc(g.width*g.height*3);for(let y=0;y<g.height;y++)for(let x=0;x<g.width;x++){const i=(y*g.width+x)*3;pixels[i]=Math.round(x*255/(g.width-1));pixels[i+1]=Math.round(y*255/(g.height-1));pixels[i+2]=((x>>5)+(y>>5))%2?200:40;}
 return 'data:image/png;base64,'+(await sharp(pixels,{raw:{width:g.width,height:g.height,channels:3}}).png().toBuffer()).toString('base64');
}
async function run({onCase=()=>{}}={}){
 const started=performance.now(),sources=JSON.parse(await fs.readFile(path.join(root,'work',RUN,'sources.json'))),parsed=new Map(),sourceHashes=[];
 assert.equal(sources.length,2);
 for(const b of sources){
  assert.equal(b.seed,SEED);assert.equal(b.products.length,10);
  assert.equal(path.resolve(b.directory),path.join(root,'output/creative-ai/brands',b.brandId,'products/qa-fixtures',RUN));
  const research=JSON.parse(await fs.readFile(path.join(root,'output/creative-ai/research-sessions',b.researchId,'job.json')));assert.equal(research.intake.brandId,b.brandId);
  for(const p of b.products){
   const html=await fs.readFile(path.join(b.directory,p.file)),json=await fs.readFile(path.join(b.directory,p.jsonFile));assert.equal(hash(html),p.pageHash);assert.equal(hash(json),p.jsonHash);
   const value=require(runtime+'/product-library').parseProduct(html.toString('utf8'),p.sourceUrl,JSON.parse(json));assert.equal(value.name,p.name);assert.deepEqual(value.variants.find(v=>v.id===p.variant.id),p.variant);assert.ok(p.variant.sku);
   parsed.set(b.brandId+'|'+p.productId,value);sourceHashes.push({file:path.join(b.directory,p.file),hash:p.pageHash},{file:path.join(b.directory,p.jsonFile),hash:p.jsonHash});
  }
 }
 const combinations=matrix(sources);assert.equal(combinations.length,600);assert.equal(new Set(combinations.map(c=>c.key)).size,600);
 const selectedFormats=formatNames.map(n=>formats.presets.find(p=>p.id==='custom:studio-'+n));assert.ok(selectedFormats.every(Boolean));assert.equal(new Set(selectedFormats.map(p=>{const d=gcd(p.width,p.height);return p.width/d+':'+p.height/d;})).size,15);
 const rows=[],images=new Map();let negativeChecks=0;
 for(const item of combinations){
  const begin=performance.now(),{brand:b,product:p,formatId,language}=item,checks=[],times={};
  const step=async(name,fn)=>{const t=performance.now();await fn();times[name]=+(performance.now()-t).toFixed(3);checks.push(name);};
  const row={key:item.key,brand:b.brandName,brandId:b.brandId,sku:p.variant.sku,variantId:p.variant.id,product:p.name,productUrl:p.variantUrl,available:p.variant.available,formatId,language};
  try{
   let intake,selected,expanded,catalog,deck,wire,wireInput,g,raw,exported;
   await step('source-and-brief',async()=>{
    assert.deepEqual(parsed.get(b.brandId+'|'+p.productId).variants.find(v=>v.id===p.variant.id),p.variant);
    const brief=(language==='Hindi'?'इस उत्पाद को दिखाएँ। दर्शक: घर बदल रहे लोग। ':'Introduce this product. Audience: people moving home. ')+p.name+'\nExact SKU: '+p.variant.sku+' — "Keep &amp; literal" 🛋️. People, setting and lighting are creative choices.';
    const original={brandId:b.brandId,brandUrl:b.brandUrl,brief,language,audience:language==='Hindi'?'घर बदल रहे लोग':'People moving home',productName:p.name,focusType:'product',productPageUrl:p.variantUrl,productVariantId:p.variant.id};
    const bytes=Buffer.from(JSON.stringify(original));const chunks=[];for(let i=0;i<bytes.length;i+=7)chunks.push(bytes.subarray(i,i+7));
    intake=require(runtime+'/campaign-input').normalize(await require('../../server').readJsonBody(Readable.from(chunks),10000));
    assert.equal(intake.brief,brief);assert.equal(intake.audience,original.audience);assert.equal(intake.language,language);assert.equal(require(runtime+'/product-input').validateProductInput(intake),p.variantUrl);
    const other=sources.find(s=>s.brandId!==b.brandId);assert.throws(()=>require(runtime+'/product-input').validateProductPage(p.variantUrl,other.brandUrl));negativeChecks++;
    assert.throws(()=>require(runtime+'/campaign-input').normalize({...intake,brief:'bad\ud800'}));negativeChecks++;
   });
   await step('placement-and-copy-wire',async()=>{
    ({catalog,selections:[selected]}=placements.resolve({brandUrl:b.brandUrl,placementIds:[formatId]}));expanded=pk.resolvePin(selected.pin,catalog);
    wireInput={concepts:[{conceptId:'continuity'},{conceptId:'exploration'}],placements:[{...selected,expanded}],strategy:{strategyChecks:{destination:{url:p.variantUrl}}}};
    wire=require(runtime+'/copy-wire').wire(wireInput,'Synthetic QA transport specimen; not approved product claims.');
    const text=(language==='Hindi'?'अपना घर, अपना अंदाज़ — ':'Your home, your way — ')+p.name+'\n'+p.variant.sku+' "&amp;" 🛋️';
    const fields=[{role:'headline',text,proofFactIds:[],requirement:'mandatory',locked:true,target:'embedded'}];
    raw={units:{unit0:{fields:structuredClone(fields)},unit1:{fields:structuredClone(fields)}},rationale:'Transport QA only, not a creative decision.',unknowns:[]};
    const decoded=wire.decode(require(runtime+'/strict-json').parse(JSON.stringify(raw)));assert.equal(decoded.decks.length,2);
    for(const [i,d]of decoded.decks.entries()){assert.equal(d.conceptId,wireInput.concepts[i].conceptId);assert.equal(d.placementId,selected.id);assert.equal(d.fields[0].id,'copy-1');assert.equal(d.fields[0].text,text);}
    deck=decoded.decks[0];row.copyFit=require(runtime+'/copy-fit').assess(deck,{...selected,expanded});
    for(const mutate of [r=>{r.units.unit0=JSON.stringify(r.units.unit0);},r=>{r.units.unit0.surprise=true;},r=>{r.units.unit0.fields[0].exactText='silently dropped?';},r=>{r.units.unit0.fields[0].target='native:unknown';}]){const bad=structuredClone(raw);mutate(bad);assert.throws(()=>wire.decode(bad));negativeChecks++;}
    assert.throws(()=>require(runtime+'/strict-json').parse('{"units":{},"units":'+JSON.stringify(raw.units)+'}'));negativeChecks++;
    assert.throws(()=>require(runtime+'/copy-wire').wire({...wireInput,concepts:[{conceptId:'same'},{conceptId:'same'}]},''));negativeChecks++;
    row.handoffBytes=Buffer.byteLength(JSON.stringify(wire.input))+Buffer.byteLength(JSON.stringify(wire.schema));
   });
   await step('sku-cache-isolation',async()=>{
    const cache=require(runtime+'/sku-audit-cache'),args={intake,profile:{id:p.productId,snapshot:'snapshot-qa',pageHash:p.pageHash},request:{instructions:'QA identity only',schema:{type:'object'},input:{sku:p.variant.sku},images:[]}},binding=cache.hash(cache.binding(args));
    assert.equal(cache.hash(cache.binding({...args,intake:{...intake,brief:'A different creative brief'}})),binding);
    for(const changed of [{...args,intake:{...intake,brandId:'other-brand'}},{...args,intake:{...intake,productVariantId:p.variant.id+'-other'}},{...args,profile:{...args.profile,pageHash:'changed'}},{...args,request:{...args.request,images:[{id:'product',imageData:'changed'}]}}]){assert.notEqual(cache.hash(cache.binding(changed)),binding);negativeChecks++;}
   });
   await step('generation-geometry',async()=>{
    const {width,height}=selected.description.dimensions;g=placements.generationSize(width,height);const d=gcd(width,height);Object.assign(row,{width,height,ratio:width/d+':'+height/d,modelCanvas:g.size,requiresCrop:g.requiresCrop});
    assert.equal(g.width%16,0);assert.equal(g.height%16,0);assert.ok(Math.max(g.width/g.height,g.height/g.width)<=3);
    assert.ok(g.crop.x>=0&&g.crop.y>=0&&g.crop.x+g.crop.width<=g.width+1e-6&&g.crop.y+g.crop.height<=g.height+1e-6);assert.ok(Math.abs(g.crop.width/g.crop.height-width/height)<1e-9);
    if(g.requiresCrop)assert.match(placements.generationInstruction(width,height),/CENTRAL retained rectangle/);
   });
   await step('raster-export',async()=>{
    if(!images.has(g.size))images.set(g.size,await calibration(g));
    const exp=require(runtime+'/export'),format=exp.outputFormat(expanded);exported=await exp.exportWholeStatic(images.get(g.size),{canvas:{width:row.width,height:row.height},outputFormat:format,placementContext:{context:{placements:[expanded]}}});
    const meta=await sharp(exported.bytes).metadata();assert.equal(meta.width,row.width);assert.equal(meta.height,row.height);assert.equal(meta.format,format);assert.notEqual(exported.proof.fitsByteCeiling,false);
    const technical=pk.reviewTechnical(selected.pin,{native:{},assets:{artwork:{width:meta.width,height:meta.height,format,bytes:exported.bytes.length}}},catalog);assert.ok(!(technical.checks||technical.results||[]).some(c=>c.status==='fail'));
    row.exportBytes=exported.bytes.length;row.exportSha256=hash(exported.bytes);row.technicalStatus=technical.status||technical.readiness||'see contract';
   });
   row.status='passed';
  }catch(e){row.status='failed';row.error=e.stack;}
  Object.assign(row,{checks,stageMs:times,elapsedMs:+(performance.now()-begin).toFixed(3)});rows.push(row);onCase(row,rows.length);
 }
 for(const entry of sourceHashes)assert.equal(hash(await fs.readFile(entry.file)),entry.hash);
 return {version:1,seed:SEED,createdAt:new Date().toISOString(),mode:'offline-new-sku-transport-matrix',providerCalls:0,costINR:0,elapsedMs:Math.round(performance.now()-started),cases:rows.length,passed:rows.filter(r=>r.status==='passed').length,failed:rows.filter(r=>r.status==='failed').length,negativeChecks,sourceProducts:20,sourceCatalogs:sources.map(b=>({brand:b.brandName,products:b.catalogProducts,sampled:b.products.length,reusedPages:b.products.filter(p=>p.reusedSavedPage).length})),ratios:[...new Set(rows.map(r=>r.ratio).filter(Boolean))],languages,copyFitWarnings:rows.filter(r=>r.copyFit?.status==='needs-layout-review').length,limits:['Synthetic copy is intentionally demanding to test exact transport; copy-fit warnings are retained, not counted as engine failures.','Synthetic coordinate images test geometry and encoding. No new creative strategy, artwork quality, logo placement, live model latency, token usage or publisher acceptance is validated.','Product source snapshots and selected variants are source-only QA fixtures, not audited product claims or approved campaign choices.','600 combinations share deterministic engine functions; this is not 600 statistically independent live model trials.'],rows};
}
if(require.main===module){global.fetch=async()=>{throw Error('Network forbidden in offline SKU matrix');};run({onCase:(r,n)=>{if(r.status==='failed'||n%50===0)process.stderr.write(n+'/600 '+r.status+' '+r.key+'\n'+(r.error||'')+'\n');}}).then(r=>{console.log(JSON.stringify(r,null,2));if(r.failed)process.exitCode=1;}).catch(e=>{console.error(e.stack);process.exitCode=1;});}
module.exports={run,matrix,formatNames,languages};
