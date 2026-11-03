'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const pdp=require('../../lib/creative-ai/runtime/pdp'),{resolve}=require('../../lib/creative-ai/runtime/placements'),wire=require('../../lib/creative-ai/runtime/copy-wire'),{check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
function fixture(){const selection=resolve({placementIds:[pdp.id]}).selections;const input={selection,concepts:[{conceptId:'a'}],facts:[{id:'f',status:'supported'}],assets:[{id:'sku',imageData:'data:image/png;base64,fixture'}],productReference:{referenceAssetIds:['sku']}};const plan={version:2,sets:[{conceptId:'a',visualSystem:'One consistent gallery',slots:selection.map((s,i)=>({placementId:s.id,role:s.description.pdp.key,status:'ready',message:'Distinct answer '+i,buyerQuestion:'Question '+i,visualDirection:'Product focused',proofFactIds:['f'],requiredQualifiers:[],missingEvidence:[],visualEvidenceIds:['sku'],referenceAdequacy:'adequate',referenceNote:'Fixture supports this view',diagramKind:s.description.pdp.key==='dimensions'?'dimensions':'none',dimensionAnnotations:s.description.pdp.key==='dimensions'?['length','width','height'].map(axis=>({axis,label:'Exact sourced measurement',proofFactId:'f'})):[],altText:'Proposed description '+i}))}]};return {input,plan};}
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': optional technology/service gaps release other slots without approving an incomplete pack',()=>{
 const {input,plan}=fixture(),knowledge=require('../../lib/creative-ai/treatment-knowledge');
 const snapshot=knowledge.capture(resolve({placementIds:[pdp.id]}));
 input.brandId=brand;
 for(const s of plan.sets[0].slots.filter(s=>['technology','service'].includes(s.role))){s.status='needs-source';s.missingEvidence=['No supported alternative for '+s.role];}
 pdp.validatePlan(plan,input);
 const before=structuredClone(plan),dispatch=pdp.dispatchPlan(plan,input.selection,snapshot);
 assert.equal(dispatch.selection.length,10);assert.equal(dispatch.deferred.length,2);assert.equal(dispatch.expectedUnits,12);
 assert.deepEqual(plan,before);assert.ok(dispatch.selection.every(s=>!['technology','service'].includes(s.description.pdp.key)));
 assert.equal(pdp.assessManifest(plan.sets[0],plan.sets[0].slots.map(s=>({imageUrl:s.status==='ready'?'fixture.png':null,artifactHash:s.status==='ready'?'h':'missing',ready:s.status==='ready'}))).ready,false);
 const legacy=structuredClone(snapshot);legacy.packs.find(p=>p.id==='owned-pdp').version=3;
 assert.throws(()=>pdp.dispatchPlan(plan,input.selection,legacy),e=>e.code==='PDP_SOURCE_REQUIRED');
 assert.throws(()=>pdp.dispatchPlan(plan,input.selection,null),e=>e.code==='PDP_SOURCE_REQUIRED');
 const identity=plan.sets[0].slots[0];identity.status='needs-source';identity.missingEvidence=['Exact SKU identity unresolved'];
 assert.throws(()=>pdp.dispatchPlan(plan,input.selection,snapshot),e=>e.code==='PDP_SOURCE_REQUIRED');
});
test('optional PDP slots are identified from the saved selection, never a model-supplied role',()=>{
 const {input,plan}=fixture(),snapshot=require('../../lib/creative-ai/treatment-knowledge').capture(resolve({placementIds:[pdp.id]}));
 plan.sets[0].slots[0].role='technology';plan.sets[0].slots[0].status='needs-source';plan.sets[0].slots[0].missingEvidence=['Identity'];
 assert.throws(()=>pdp.dispatchPlan(plan,input.selection,snapshot),e=>e.code==='PDP_SOURCE_REQUIRED');
});
test('one concept with a deferred slot cannot make a partial pair look complete',()=>{
 const {input,plan}=fixture(),snapshot=require('../../lib/creative-ai/treatment-knowledge').capture(resolve({placementIds:[pdp.id]}));
 plan.sets.push({...structuredClone(plan.sets[0]),conceptId:'b'});
 const slot=plan.sets[0].slots[6];slot.status='needs-source';slot.missingEvidence=['Technology workflow'];
 const dispatch=pdp.dispatchPlan(plan,input.selection,snapshot);
 assert.equal(dispatch.expectedUnits,24);assert.equal(dispatch.selection.length,11);
 assert.equal(require('../../lib/creative-ai/runtime/output-completion').classify(Array.from({length:22},()=>({imageUrl:'fixture.png'})),dispatch.expectedUnits),'partial');
});
test('PDP gallery answers shopping questions with dedicated angles, detail, fit and included items',()=>{assert.deepEqual(pdp.slots.map(s=>s.key),['hero','alternate-angle','detail','dimensions','firmness','primary-benefit','technology','materials','lifestyle','included','care','service']);assert.match(pdp.slots[0].direction,/entire|complete/i);assert.match(pdp.slots[3].direction,/length.*width.*height/i);});
test('PDP v2 requires source-bound diagrams and sufficient visual evidence without retrofitting v1',()=>{const {input,plan}=fixture();assert.doesNotThrow(()=>pdp.validatePlan(plan,input));const bad=structuredClone(plan);bad.sets[0].slots[2].referenceAdequacy='limited';assert.throws(()=>pdp.validatePlan(bad,input),/reference|evidence/i);bad.sets[0].slots[2].status='needs-source';bad.sets[0].slots[2].missingEvidence=['Closer official surface photo'];assert.doesNotThrow(()=>pdp.validatePlan(bad,input));assert.throws(()=>pdp.requireReady(bad),e=>e.code==='PDP_SOURCE_REQUIRED');const foreign=structuredClone(plan);foreign.sets[0].slots[0].visualEvidenceIds=['other-brand'];assert.throws(()=>pdp.validatePlan(foreign,input),/reference|evidence/i);});
test('dimension cards must map three distinct axes to sourced annotations before rendering',()=>{const {input,plan}=fixture();plan.sets[0].slots[3].dimensionAnnotations.pop();assert.throws(()=>pdp.validatePlan(plan,input),/dimension|axes/i);});
test('full gallery copy cannot contain campaign CTAs or overlays on photography; qualifiers remain required',()=>{const {plan}=fixture();const deck=(slot,role,text)=>({conceptId:'a',placementId:slot.placementId,fields:[{id:'f',role,text,delivery:'embedded',requirement:'mandatory',proofFactIds:['f']}]});assert.throws(()=>pdp.validateCopy({decks:[deck(plan.sets[0].slots[0],'headline','Buy now')]},plan),/photograph|overlay/i);assert.throws(()=>pdp.validateCopy({decks:[deck(plan.sets[0].slots[5],'cta','Explore the mattress')]},plan),/CTA|action/i);plan.sets[0].slots[5].requiredQualifiers=['For selected variant'];assert.throws(()=>pdp.validateCopy({decks:[deck(plan.sets[0].slots[5],'body','Supported claim')]},plan),e=>e.code==='PDP_QUALIFIER_MISSING');});
test('provider copy schema prevents PDP photo overlays and CTA fields before dispatch',()=>{const {input,plan}=fixture();const w=wire.wire({concepts:input.concepts,placements:input.selection.slice(0,1),pdpPlan:plan},'');const raw={units:{unit0:{fields:[{role:'headline',text:'Shop now',target:'embedded',proofFactIds:[],requirement:'mandatory',locked:false}]}},rationale:'test',unknowns:[]};assert.ok(check(w.schema,raw).length);raw.units.unit0.fields=[];assert.deepEqual(check(w.schema,raw),[]);});
test('legacy saved pack roles come from its pinned selection, not the new slot order',async()=>{const review=require('../../lib/creative-ai/runtime/pdp-review');const set={slots:[{placementId:'old-second',message:'Context'}]},job={id:'old',selection:[{id:'old-second',description:{pdp:{key:'lifestyle'}}}],results:[]};const [row]=await review.manifest(set,job,'/unused');assert.equal(row.role,'lifestyle');});
test('new PDP galleries cannot pass with only legacy consistency checks',()=>{const {plan}=fixture(),set=plan.sets[0],rows=set.slots.map((s,i)=>({index:i+1,imageUrl:'i'+i,artifactHash:'h'+i,ready:true}));const checks=['slot-coverage','visual-consistency','product-truth'].map(criterion=>({criterion,status:'pass'}));assert.equal(pdp.assessManifest(set,rows,checks).ready,false);checks.push(...['buying-clarity','mobile-readability'].map(criterion=>({criterion,status:'pass'})));assert.equal(pdp.assessManifest(set,rows,checks).ready,true);});
test('dimension annotations cannot disappear from the exact visible copy',()=>{const {plan}=fixture(),s=plan.sets[0].slots[3];assert.throws(()=>pdp.validateCopy({decks:[{conceptId:'a',placementId:s.placementId,fields:[{id:'headline',text:'Queen size',role:'headline',delivery:'embedded',requirement:'mandatory',proofFactIds:['f']}]}]},plan),/dimension|annotation/i);});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': sentence case and whitespace do not erase a present PDP qualifier',()=>{
 const {plan}=fixture(),s=plan.sets[0].slots[7];s.requiredQualifiers=['high-density HR foam core','for selected variant only'];
 const field={id:'body',role:'body',delivery:'embedded',requirement:'mandatory',proofFactIds:['f'],text:'High-density HR foam core. For selected\nvariant only.'};
 const out={decks:[{conceptId:'a',placementId:s.placementId,fields:[field]}]};
 assert.doesNotThrow(()=>pdp.validateCopy(out,plan));
 field.text='High-density HR foam core. For every variant.';
 assert.throws(()=>pdp.validateCopy(out,plan),e=>e.code==='PDP_QUALIFIER_MISSING');
 field.text='High-density HR foam core. For selected variant only.';field.delivery='native';
 assert.throws(()=>pdp.validateCopy(out,plan),e=>e.code==='PDP_QUALIFIER_MISSING');
});
test('website handoff supplies responsive files, dimensions and proposed accessible text without claiming site acceptance',async()=>{const sharp=require('sharp'),delivery=require('../../lib/creative-ai/runtime/pdp-review'),bytes=await sharp({create:{width:800,height:800,channels:3,background:'#234'}}).png().toBuffer();const result=await delivery.websiteDelivery([{index:1,role:'hero',placementId:'p1',artifactHash:'original',bytes}],{slots:[{placementId:'p1',message:'Master caption',altText:'Selected mattress, complete product view'}]});assert.equal(result.manifest.integrationStatus,'not-verified');assert.equal(result.manifest.assets[0].alt.status,'proposed');const variants=result.manifest.assets[0].variants;assert.deepEqual(variants.map(v=>v.width),[320,640,800]);assert.ok(variants.every(v=>v.sourceHash==='original'&&v.sha256&&v.bytes>0));for(const v of variants){const file=result.files.find(f=>f.name===v.file);assert.equal((await sharp(file.bytes).metadata()).width,v.width);}});
test('v2 pack export reviews all masters and mobile previews and includes the website handoff',async t=>{const fs=require('fs/promises'),path=require('path'),os=require('os'),sharp=require('sharp'),{JobStore}=require('../../lib/creative-ai/runtime/store'),review=require('../../lib/creative-ai/runtime/pdp-review');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pdp-shopping-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const {input,plan}=fixture(),store=new JobStore(path.join(dir,'jobs')),job=await store.create({brandId:'brand-isolated-fixture',brandUrl:'https://example.invalid',brief:'Synthetic shopping gallery'},{maxReasoningCalls:160,jobTimeoutMs:60000},input.selection);await store.save(job.id,'pdp-plan.json',plan);for(const [i,s] of plan.sets[0].slots.entries()){const name='static-test-'+i+'.png',bytes=await sharp({create:{width:320,height:320,channels:3,background:{r:i*12,g:50,b:100}}}).png().toBuffer();await store.save(job.id,name,bytes);await store.update(job.id,j=>{j.results.push({conceptId:'a',route:'continuity',placementId:s.placementId,imageUrl:'/creative-ai/api/jobs/'+j.id+'/files/'+name,ready:true});return j;});}let calls=0;await review.finish({store,provider:{reason:async req=>{calls++;assert.ok(req.images.length<=8);const result={checks:pdp.reviewCriteria(plan.sets[0]).map(criterion=>({criterion,status:'pass',evidence:'Synthetic test observation; not artwork approval.'}))};req.validate(result);return result;}}},job.id,{});const saved=await store.read(job.id);assert.equal(calls,4);assert.equal(saved.pdpPacks[0].ready,true);const bytes=await fs.readFile(path.join(store.dir(job.id),saved.pdpPacks[0].downloadUrl.split('/').pop()));assert.ok(bytes.includes(Buffer.from('website-delivery.json')));assert.ok(bytes.includes(Buffer.from('web/01-hero-320.webp')));const save=store.save.bind(store);store.save=(id,name,value)=>{if(name.endsWith('.zip'))throw Error('Immutable ZIP must not be rewritten');return save(id,name,value);};await review.finish({store,provider:{reason:async()=>assert.fail('No repeated review')}},job.id,{});});
test('PDP planner distinguishes evidence for depicted pixels from source-backed textual claims',async()=>{
 const {input,plan}=fixture();let calls=0;
 await pdp.plan(input,{reason:async req=>{calls++;assert.match(req.instructions,/assess only the proposed depiction/i);assert.match(req.instructions,/photograph does not prove warranty/i);assert.match(req.instructions,/actual product-marking conflict/i);req.validate(plan);return plan;}},{});
 assert.equal(calls,1);
 const service=plan.sets[0].slots.find(s=>s.role==='service');service.referenceNote='Product appearance is supported; warranty coverage comes from the cited text, not the photograph.';assert.doesNotThrow(()=>pdp.validatePlan(plan,input));
 service.proofFactIds=['unsupported'];assert.throws(()=>pdp.validatePlan(plan,input),/unsupported evidence/);
 service.proofFactIds=['f'];plan.sets[0].slots[0].referenceAdequacy='limited';plan.sets[0].slots[0].referenceNote='Actual product marking differs between supplied identity references.';assert.throws(()=>pdp.validatePlan(plan,input),/adequate visual/);
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': deferred optional slots export an honest partial manifest without full-pack review',async t=>{
 const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
 const {JobStore}=require('../../lib/creative-ai/runtime/store'),review=require('../../lib/creative-ai/runtime/pdp-review');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pdp-deferred-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const {input,plan}=fixture(),store=new JobStore(path.join(dir,'jobs'));
 const job=await store.create({brandId:'brand-'+brand.toLowerCase()},{maxReasoningCalls:160,jobTimeoutMs:60000},input.selection);
 const snapshot=require('../../lib/creative-ai/treatment-knowledge').capture(resolve({placementIds:[pdp.id]}));
 await store.update(job.id,j=>({...j,treatmentKnowledgeVersion:1,treatmentKnowledge:snapshot}));
 plan.sets[0].slots[6].status='needs-source';plan.sets[0].slots[6].missingEvidence=['Technical preservation unavailable; no distinct sourced fallback'];
 await store.save(job.id,'pdp-plan.json',plan);
 await review.finish({store,provider:{reason:()=>assert.fail('An incomplete pack must not request whole-set approval')}},job.id,{});
 const saved=await store.read(job.id),pack=saved.pdpPacks[0];
 assert.equal(pack.complete,false);assert.equal(pack.ready,false);assert.equal(pack.slots.length,12);assert.ok(pack.checks.every(c=>c.status==='unknown'));
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(store.dir(job.id),'pdp-plan.json'))),plan);
});
test('PDP v3 separates copy instructions from exact qualifiers before downstream copy work',()=>{
 const {input,plan}=fixture();plan.version=3;for(const s of plan.sets[0].slots)s.copyInstructions=[];
 const slot=plan.sets[0].slots[10];slot.copyInstructions=['Retain the cleaning method in the artwork.'];slot.requiredQualifiers=['with a damp cloth'];assert.doesNotThrow(()=>pdp.validatePlan(plan,input));
 const out={decks:[{conceptId:'a',placementId:slot.placementId,fields:[{role:'body',delivery:'embedded',requirement:'mandatory',text:'Spot clean with a damp cloth',proofFactIds:['f']}]}]};assert.doesNotThrow(()=>pdp.validateCopy(out,plan));out.decks[0].fields[0].text='Spot clean';assert.throws(()=>pdp.validateCopy(out,plan),/qualifier/);
 slot.requiredQualifiers=['Retain “with a damp cloth” with the spot-cleaning instruction.'];assert.throws(()=>pdp.validatePlan(plan,input),/literal|instruction/);
 input.facts[0].text='Use a damp cloth. Do not dry clean.';slot.requiredQualifiers=['Use a damp cloth','Do not dry clean'];assert.doesNotThrow(()=>pdp.validatePlan(plan,input));
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': photo-only PDP slots allow empty overlay wording while retaining buyer intent and evidence',()=>{
 const {input,plan}=fixture();input.brandId=brand;plan.version=3;for(const s of plan.sets[0].slots){s.copyInstructions=[];if(pdp.photoRoles.has(s.role))s.message='';}
 assert.doesNotThrow(()=>pdp.validatePlan(plan,input));
 const missing=structuredClone(plan);missing.sets[0].slots.find(s=>!pdp.photoRoles.has(s.role)).message='';assert.throws(()=>pdp.validatePlan(missing,input),/required evidence/);
 const noIntent=structuredClone(plan);noIntent.sets[0].slots[0].buyerQuestion='';assert.throws(()=>pdp.validatePlan(noIntent,input));
 const noReference=structuredClone(plan);noReference.sets[0].slots[0].visualEvidenceIds=[];assert.throws(()=>pdp.validatePlan(noReference,input),/reference/);
});
