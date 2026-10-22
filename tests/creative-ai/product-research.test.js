'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path');
const {selectProductPages,validateFacts,factStatus,passagesFor,collectBriefProductEvidence}=require('../../lib/creative-ai/runtime/product-research');
test('targeted product selection uses the named family, official host and word boundaries',()=>{
 const intake={brandUrl:'https://brand.example/',productName:'Airboost Mattress'},links=[{url:'https://brand.example/products/other',label:'Other mattress'},{url:'https://evil.example/products/airboost',label:'Airboost'},{url:'https://brand.example/products/airbooster',label:'Airbooster'},{url:'https://brand.example/products/airboost-610',label:'Airboost 6.10'},{url:'https://brand.example/collections/airboost-mattress',label:'Airboost'}];
 assert.deepEqual(selectProductPages(links,intake).map(l=>l.url),[links[4].url,links[3].url]);assert.deepEqual(selectProductPages(links,{...intake,productName:'Unknown'}),[]);
});
test('a benefit needs a real quoted passage, and clinical or numerical claims stay unverified',()=>{
 const pages=passagesFor([{sourceId:'official',text:'The open structure allows continuous airflow through the mattress.'}]),fact={text:'Manufacturer-described airflow',status:'supported',sourceId:'official',passageId:pages[0].id};assert.equal(validateFacts({facts:[fact]},pages).facts.length,1);assert.throws(()=>validateFacts({facts:[{...fact,passageId:'invented-passage'}]},pages),/known passage ID/);assert.throws(()=>validateFacts({facts:[{...fact,sourceId:'fake'}]},pages),/known passage ID/);
 assert.equal(factStatus(fact),'supported');for(const text of ['30% more deep sleep','Certified to cure back pain','Doctor recommended support','3X more breathable'])assert.equal(factStatus({...fact,text}),'unverified');
});
test('unit-bearing dimensions do not become performance claims, while mixed claims stay unverified',()=>{
 for(const text of ['Queen, 72 x 60 in (183 x 152 cm), 6 in high.','Dimensions 183 × 152 × 15.2 cm.']){
  assert.equal(factStatus({text,status:'supported'}),'supported');
  assert.equal(factStatus({text,status:'unverified'}),'unverified');
 }
 for(const text of ['72 x 60 in with 3X more support','183 × 152 cm and 30% better sleep','3× more breathable','3x support','72 x 60 in, medically proven'])assert.equal(factStatus({text,status:'supported'}),'unverified');
});
test('targeted collection adds auditable product and destination evidence without changing saved brand facts',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'product-research-'));
 try{await fs.writeFile(path.join(dir,'official-homepage.html'),'<a href="/collections/airboost">Shop Airboost</a>');const original={dossier:{version:1,event:'research.completed',researchId:'fixture',brandName:'Fixture',demo:true,completedAt:new Date().toISOString(),sources:[],assets:[],findings:[]},facts:[],pages:[]};const before=JSON.stringify(original);let calls=0;
 const provider={reason:async opts=>{calls++;assert.match(opts.instructions,/generic family name/);const out={facts:[{text:'The manufacturer describes open construction for airflow.',status:'supported',sourceId:'source-brief-product-1',passageId:opts.input.passages.find(p=>p.text.includes('continuous airflow')).id}]};opts.validate(out);return out;}};
 const out=await collectBriefProductEvidence(original,{brandUrl:'https://brand.example/',productName:'Airboost Mattress',brief:'Explain benefits'},dir,{provider,budget:{},fetchPage:async url=>({url,bytes:Buffer.from('<title>Airboost range</title><p>Our open construction supports continuous airflow through the mattress.</p>')})});assert.equal(calls,1);assert.equal(JSON.stringify(original),before);assert.equal(out.facts[0].status,'supported');assert.equal(out.facts[1].kind,'destination');assert.equal(out.dossier.sources[0].reference,'https://brand.example/collections/airboost');assert.match(out.productBriefEvidence.evidence[0].quote,/Our open construction supports continuous airflow through the mattress/);assert.match(await fs.readFile(path.join(dir,'brief-product-1.txt'),'utf8'),/continuous airflow/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('missing matching product pages cause no provider dispatch and retain original research',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'product-research-'));try{const r={facts:[]};assert.equal(await collectBriefProductEvidence(r,{brandUrl:'https://brand.example/',productName:'Airboost'},dir,{provider:{reason:()=>{throw Error('Must not dispatch');}}}),r);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('the project view follows the revised strategy checkpoint and leaves the original version intact',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'strategy-research-view-'));try{
  const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),runtime=new CreativeRuntime({root,provider:{}});
  runtime.activity.project=async()=>({progress:{},stages:[],events:[]});
  const j=await runtime.store.create({brandUrl:'https://brand.example/'},runtime.config,[]),old={getWhoToBy:{by:{text:'Missing product evidence'}}},revised={getWhoToBy:{by:{text:'Fixture source-backed airflow benefit'}}};
  await runtime.store.save(j.id,'strategy.json',old);await runtime.store.save(j.id,'strategy-researched.json',revised);await runtime.store.update(j.id,j=>{j.artifacts.currentStrategyFile='strategy-researched.json';return j;});
  const view=await runtime.view(j.id);assert.deepEqual(view.strategy,revised.getWhoToBy);assert.equal(view.strategyFile,'strategy-researched.json');assert.deepEqual(JSON.parse(await fs.readFile(path.join(runtime.store.dir(j.id),'strategy.json'))),old);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
