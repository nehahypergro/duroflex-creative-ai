'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),os=require('os');
const style=()=>require('../../lib/creative-ai/runtime/verbal-brand-style');
function fixture(brandId='duroflex'){
 const scope={brandId,brandName:brandId,brandUrl:'https://example.com/',revision:'r1',assetIds:[],documentIds:['doc-style'],draftDocumentIds:['doc-style']};
 const research={brandKnowledge:scope,dossier:{brandName:brandId,sources:[{id:'doc-style',kind:'guidelines',status:'available',reference:'uploaded',note:'Draft, not approved'},{id:'product-source',kind:'product',status:'available',reference:'https://example.com/sofa'}],assets:[{id:'bedroom',kind:'reference',sourceIds:['doc-style'],imageData:'data:image/png;base64,YQ=='},{id:'sku-product-image-1',kind:'product',sourceIds:['product-source'],imageData:'data:image/png;base64,Yg=='},{id:'approved-logo-1',kind:'logo',sourceIds:['doc-style'],imageData:'data:image/png;base64,Yw=='}],findings:[{section:'creative',basis:'evidence',title:'Observed style',text:'Tactile textures, sage accents and soft directional daylight; optional inspiration.',sourceIds:['doc-style'],assetIds:['bedroom']}]},facts:[{id:'sku-fact',text:'Frame only warranty.',sourceIds:['product-source']}],productBriefEvidence:{assetIds:['sku-product-image-1']}};
 const guardian={requirements:[{id:'campaign',text:'Use this campaign-specific offer',sourceIds:['user-brief']}],preferences:[{id:'warm',text:'Warm textures are a suggestion, not a rule.',sourceIds:['doc-style']}],visualRules:[]};
 return {scope,research,guardian};
}
test('reuse written brand style; exclude campaign offers, retain authority and exact SKU pixels',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'verbal-style-'));
 try{for(const brand of ['duroflex','sleepyhead']){const f=fixture(brand),original=structuredClone(f.research),r=await style().prepare({...f,directory:path.join(root,brand)});
 assert.equal(r.cache.status,'created');assert.ok(!JSON.stringify(r.profile).includes('data:image'));assert.ok(!JSON.stringify(r.profile).includes('campaign-specific offer'));assert.match(JSON.stringify(r.profile),/sage accents/);assert.match(JSON.stringify(r.profile),/Draft, not approved/);
 const second=await style().prepare({...f,directory:path.join(root,brand)});assert.equal(second.cache.status,'reused');assert.equal(second.profile.key,r.profile.key);
 const projected=style().project(f.research,r.profile);assert.deepEqual(projected.dossier.assets.map(a=>a.id),['sku-product-image-1','approved-logo-1']);assert.equal(projected.dossier.assets[0].imageData,f.research.dossier.assets[1].imageData);assert.deepEqual(f.research,original);assert.deepEqual(projected.facts,original.facts);assert.deepEqual(projected.dossier.findings[0].assetIds,[]);
 const changed=structuredClone(f);changed.research.dossier.assets[0].imageData='data:image/png;base64,ZA==';assert.notEqual((await style().prepare({...changed,directory:path.join(root,brand)})).profile.key,r.profile.key);
 assert.throws(()=>style().validate(r.profile,{...f.scope,brandId:'foreign'}),/brand|scope/i);
 }}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('selected inspiration is verbal-only for new jobs; historical selection still attaches pixels',async()=>{
 const mod=require('../../lib/creative-ai/runtime/selected-references'),request={contextKind:'art',images:[]},context={selectedReferenceIds:['bedroom'],dir:'/no-file-read-needed'};
 assert.deepEqual(await mod.apply(request,context,{verbalBrandStyleVersion:1}),request);
 await assert.rejects(()=>mod.apply(request,context,{}),/ENOENT/);
});
test('style attachment guard rejects library pixels while keeping product, logo and generated repair anchors',async()=>{
 const f=fixture(),r=await style().prepare(f);
 assert.throws(()=>style().assertAttachments([{assetId:'bedroom',imageData:f.research.dossier.assets[0].imageData}],r.profile),{code:'STYLE_REFERENCE_PIXELS_DISABLED'});
 assert.throws(()=>style().assertAttachments([{id:'renamed',imageData:f.research.dossier.assets[0].imageData}],r.profile),{code:'STYLE_REFERENCE_PIXELS_DISABLED'});
 assert.doesNotThrow(()=>style().assertAttachments([{assetId:'sku-product-image-1',imageData:f.research.dossier.assets[1].imageData},{assetId:'approved-logo-1',imageData:f.research.dossier.assets[2].imageData},{assetId:'composed-artwork-anchor',imageData:'data:image/png;base64,bmV3'}],r.profile));
 assert.match(style().instructions(r.profile),/verbal-only/);
});
test('new jobs pin verbal style and cannot reattach selected inspiration; old jobs keep original contract',async()=>{
 const {JobStore}=require('../../lib/creative-ai/runtime/store'),root=await fs.mkdtemp(path.join(os.tmpdir(),'style-pin-')),store=new JobStore(path.join(root,'jobs')),config={maxReasoningCalls:3,jobTimeoutMs:10000};
 try{const intake={brandId:'brand-duroflex',selectedReferenceIds:['bedroom']},old=await store.create({...intake,requestKey:'old-style-job'},config,[]),next=await store.create(intake,{...config,verbalBrandStyleVersion:1},[]);
 assert.deepEqual((await store.budget(old.id).stageContext()).selectedReferenceIds,['bedroom']);const state=await store.budget(next.id).stageContext();assert.equal(state.verbalBrandStyleVersion,1);assert.deepEqual(state.selectedReferenceIds,[]);
 assert.equal((await store.create(old.intake,{...config,verbalBrandStyleVersion:1},[])).verbalBrandStyleVersion,undefined);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('campaign handoff uses one brand profile across different SKUs and preserves source archives',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'style-handoff-')),saved=new Map(),jobs=new Map(),f=fixture('brand-duroflex');
 const runtime={brands:{dir:()=>root},store:{save:async(id,name,value)=>saved.set(id+'/'+name,structuredClone(value)),update:async(id,fn)=>jobs.set(id,fn(jobs.get(id)))}};
 try{const base=structuredClone(f.research);base.dossier.assets=base.dossier.assets.filter(a=>a.kind!=='product');base.dossier.sources=base.dossier.sources.filter(s=>s.kind!=='product');delete base.productBriefEvidence;
 for(const id of ['first','next']){const j={id,verbalBrandStyleVersion:1,intake:{brandKnowledge:f.scope},artifacts:{}};jobs.set(id,j);const r=structuredClone(f.research);r.dossier.assets[1].imageData+='different-'+id;
 const output=await style().apply(runtime,j,r,f.guardian,base);assert.equal(output.dossier.assets[0].imageData,r.dossier.assets[1].imageData);assert.ok(!output.dossier.assets.some(a=>a.id==='bedroom'));assert.equal(jobs.get(id).artifacts.currentResearchFile,'research-verbal-style.json');
 }
 assert.equal(jobs.get('first').brandStyleMemory.key,jobs.get('next').brandStyleMemory.key);assert.equal(saved.get('next/verbal-brand-style-cache.json').status,'reused');
 const old={id:'old',intake:{}};assert.equal(await style().apply(runtime,old,f.research,f.guardian),f.research);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('scoped provider carries verbal style into generation/preflight and prevents downstream reattachment',async()=>{
 const f=fixture('brand-duroflex'),{profile}=await style().prepare(f),{BrandScopedProvider}=require('../../lib/creative-ai/runtime/brand-isolation');let calls=0;
 const p=new BrandScopedProvider({reason:async r=>{calls++;return r;}},{}),budget={brandContext:async()=>({intake:{brandId:f.scope.brandId,brandUrl:f.scope.brandUrl,brandKnowledge:f.scope,selectedReferenceIds:['bedroom']},brandStyleMemory:profile}),stageContext:async()=>({verbalBrandStyleVersion:1})};
 const good=await p.reason({contextKind:'art',instructions:'Art',input:{guardian:f.guardian},images:[f.research.dossier.assets[1]]},budget);assert.equal(good.images.length,1);assert.equal(calls,1);
 await assert.rejects(()=>p.reason({...good,images:[f.research.dossier.assets[0]]},budget),{code:'STYLE_REFERENCE_PIXELS_DISABLED'});assert.equal(calls,1);
 const context=await p.context(budget),prompt=p.imagePrompt({prompt:'Render the exact sofa.'},context);assert.match(prompt,/verbal-only/);assert.ok(!prompt.includes('sage accents'));assert.ok(style().instructions(profile).length<500);assert.ok(!prompt.includes('data:image'));assert.ok(!prompt.includes('campaign-specific offer'));
 const measured=await p.preflightImagePrompt({prompt:'Render the exact sofa.'},budget);assert.ok(measured);
});
test('a later selected SKU can reuse pixels also present in the inspiration library',async()=>{
 const f=fixture('brand-duroflex'),base=structuredClone(f.research),saved=new Map();base.dossier.assets=base.dossier.assets.filter(a=>a.kind!=='product');delete base.productBriefEvidence;
 f.research.dossier.assets[1].imageData=base.dossier.assets[0].imageData;
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'style-sku-collision-')),job={id:'campaign',verbalBrandStyleVersion:1,intake:{brandKnowledge:f.scope},artifacts:{}};
 const runtime={brands:{dir:()=>root},store:{save:async(k,n,v)=>saved.set(n,v),update:async(k,fn)=>fn(job)}};
 try{const projected=await style().apply(runtime,job,f.research,f.guardian,base);
 const budget={brandContext:async()=>({intake:{brandId:f.scope.brandId,brandUrl:f.scope.brandUrl,brandKnowledge:f.scope},brandStyleMemory:job.brandStyleMemory,brandStyleExecutionHashes:job.brandStyleExecutionHashes}),stageContext:async()=>({verbalBrandStyleVersion:1})};
 const {BrandScopedProvider}=require('../../lib/creative-ai/runtime/brand-isolation'),p=new BrandScopedProvider({reason:async r=>r},{});
 const result=await p.reason({contextKind:'art',instructions:'Inspect the exact SKU',input:{},images:projected.dossier.assets},budget);assert.equal(result.images.length,2);
 await assert.rejects(()=>p.reason({contextKind:'art',instructions:'Art',input:{},images:[base.dossier.assets[0]]},budget),{code:'STYLE_REFERENCE_PIXELS_DISABLED'});
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('concept planning retains verbal mood evidence and qualifiers after inspiration pixels are removed',()=>{
 const f=fixture('brand-duroflex'),profile=style().compile(f),projected=style().project(f.research,profile),assignment={brief:'A night-time sofa scene with two people.',formats:[]};
 const packet=require('../../lib/creative-ai/runtime/planning-packets').prepare('concepts',{context:{strategyInput:{assignment,research:projected.dossier,guardian:f.guardian,facts:projected.facts},strategy:{},referenceCreativeIds:['bedroom'],conceptRoutes:['continuity']}},{images:projected.dossier.assets,brandId:f.scope.brandId});
 assert.match(JSON.stringify(packet.input.brandGuidance),/sage accents/);assert.match(JSON.stringify(packet.input.guardian),/Warm textures are a suggestion/);assert.match(JSON.stringify(packet.input.facts),/Frame only warranty/);assert.equal(packet.input.assignment.brief,assignment.brief);assert.deepEqual(packet.images.map(a=>a.id),['sku-product-image-1','approved-logo-1']);assert.deepEqual(packet.input.allowedCreativeReferenceIds,[]);
});
