const test=require('node:test'),assert=require('node:assert/strict');
const {resolve}=require('../../lib/creative-ai/runtime/placements');
const {check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
const copy=require('../../lib/creative-ai/copywriter');
const wire=require('../../lib/creative-ai/runtime/copy-wire');
function selected(name='Product hero'){return resolve({placementIds:['custom:recipe-product-image-01'],customProfiles:[{id:'custom:recipe-product-image-01',name,platform:'PDP',publisher:'studio',placement:'image-module',assetType:'static',canvas:{width:1600,height:1600,unit:'px'},exportContract:{formats:['png']},displayContext:name}]}).selections[0];}
const field={role:'body',text:'Comfort for every night.',target:'embedded',proofFactIds:[],requirement:'optional',locked:false};
function input(p){return {concepts:[{conceptId:'a'},{conceptId:'b'}],placements:[p],facts:[]};}
test('PDP photography can pass copy handoff without invented overlay text',()=>{
 const i=input(selected()),w=wire.wire(i,'');
 const raw={units:{unit0:{fields:[]},unit1:{fields:[]}},rationale:'Product photography needs no overlay.',unknowns:[]};
 assert.deepEqual(check(w.schema,raw),[]);
 assert.doesNotThrow(()=>copy.validateOutput(w.decode(raw),i));
});
test('PDP optional-body violation is prevented in the provider wire; required qualifiers remain expressible',()=>{
 const w=wire.wire(input(selected()),'');
 const raw={units:{unit0:{fields:[field]},unit1:{fields:[]}},rationale:'Synthetic PDP copy test',unknowns:[]};
 assert.ok(check(w.schema,raw).length);
 raw.units.unit0.fields[0]={...field,requirement:'mandatory',text:'For the selected variant only.'};
 assert.deepEqual(check(w.schema,raw),[]);
});
test('legacy copy policy conflict has typed evidence, not just an error string',()=>{
 const i=input(selected()),out={version:1,agentId:'copywriter',decks:i.concepts.map(c=>({conceptId:c.conceptId,placementId:i.placements[0].id,fields:[{...field,id:'f',delivery:'embedded',nativeFieldId:'none'}]})),rationale:'Synthetic PDP copy test',unknowns:[]};
 out.decks.forEach(d=>delete d.fields[0].target);
 for(const p of i.placements){const policy=p.expanded.rules.find(r=>r.check.readingPolicy).check.readingPolicy;policy.version='2026-10-23.1';delete policy.adaptiveContent;}
 assert.throws(()=>copy.validateOutput(out,i),e=>e.code==='COPY_POLICY_CONFLICT'&&e.conflicts[0].placementId===i.placements[0].id);
});
test('full PDP is one explicit format with 12 ordered, differently treated slots',()=>{
 const r=resolve({placementIds:['custom:studio-pdp-pack']});
 assert.equal(r.selections.length,12);
 assert.ok(r.selections.every(s=>s.description.supported));
 assert.deepEqual(r.selections.map(s=>s.description.pdp.index),Array.from({length:12},(_,i)=>i+1));
 assert.equal(r.selections[0].description.readability.classId,'commerce-photo');
 assert.equal(r.selections[3].description.readability.classId,'feature');
 assert.equal(new Set(r.selections.map(s=>s.id)).size,12);
 assert.throws(()=>resolve({placementIds:['custom:studio-pdp-pack','custom:studio-social-square']}),/PDP pack/);
});
test('ordinary sets have no generic six-image ceiling and internal PDP slots cannot be selected directly',()=>{
 const formats=require('../../lib/creative-ai/runtime/output-formats');
 assert.equal(formats.validate({placementIds:Array.from({length:24},(_,i)=>'custom:test-'+i)}).units,24);
 assert.throws(()=>formats.validate({placementIds:['custom:studio-pdp-pack-slot-01']}),/internal/);
});
test('planning resumes completed batches, preserves unknowns and rejects corrupted saved outputs',async()=>{
 const batches=require('../../lib/creative-ai/runtime/planning-batches');
 const base={concepts:[{conceptId:'a'},{conceptId:'b'}],placements:Array.from({length:12},(_,i)=>({id:'p'+i})),brandId:'isolated-brand'};
 const saved=new Map(),cache={read:async k=>saved.get(k)||null,save:async(k,v)=>saved.set(k,v)};let calls=0,fail=true;
 const run=async part=>{calls++;if(fail&&part.placements[0].id==='p3')throw Error('disconnected');return {version:1,agentId:'copywriter',decks:part.concepts.flatMap(c=>part.placements.map(p=>({conceptId:c.conceptId,placementId:p.id,fields:[]}))),rationale:'Specific batch rationale',unknowns:['Unresolved source '+part.placements[0].id]};};
 await assert.rejects(()=>batches.run(base,'decks',run,cache),/disconnected/);assert.equal(saved.size,1);
 fail=false;const result=await batches.run(base,'decks',run,cache);assert.equal(calls,5);assert.equal(result.decks.length,24);assert.equal(result.agentId,'copywriter');assert.equal(result.unknowns.length,4);
 await batches.run(base,'decks',run,cache);assert.equal(calls,5);
 saved.values().next().value.output.decks[0].placementId='wrong';await assert.rejects(()=>batches.run(base,'decks',run,cache),/checkpoint/);
});
test('PDP admission respects configured spend; pack evidence cannot silently disappear',()=>{
 const pdp=require('../../lib/creative-ai/runtime/pdp');
 assert.throws(()=>pdp.admission({maxReasoningCalls:40,estimatedSpend:{maxUsd:100,imageUsd:3,reasoningUsd:2}}),e=>e.code==='PDP_BUDGET_REQUIRED');
 const selection=resolve({placementIds:[pdp.id]}).selections,concepts=[{conceptId:'a'}],facts=[{id:'f',status:'supported'}];
 const set={conceptId:'a',visualSystem:'Consistent scoped type and composition',slots:selection.map((s,i)=>({placementId:s.id,status:'ready',message:'Message '+i,visualDirection:'Use this slot evidence',proofFactIds:['f'],requiredQualifiers:[],missingEvidence:[]}))};
 assert.doesNotThrow(()=>pdp.validatePlan({version:1,sets:[set]},{selection,concepts,facts}));
 set.slots[3].proofFactIds=[];assert.throws(()=>pdp.validatePlan({version:1,sets:[set]},{selection,concepts,facts}),/evidence/);
 set.slots[3].status='needs-source';set.slots[3].missingEvidence=['Supported benefit and qualifier'];assert.throws(()=>pdp.requireReady({sets:[set]}),e=>e.code==='PDP_SOURCE_REQUIRED');
});
test('a complete saved PDP pair is not a passing pack without every child and set check',()=>{
 const pdp=require('../../lib/creative-ai/runtime/pdp'),set={conceptId:'a',visualSystem:'Test'},entries=Array.from({length:12},(_,i)=>({index:i+1,placementId:'p'+i,ready:true,imageUrl:'image-'+i,artifactHash:'hash-'+i})),checks=['slot-coverage','visual-consistency','product-truth'].map(criterion=>({criterion,status:'pass'}));
 assert.equal(pdp.assessManifest(set,entries).ready,false);assert.equal(pdp.assessManifest(set,entries,checks).ready,true);
 for(let i=0;i<12;i++){const changed=structuredClone(entries);changed[i].ready=false;assert.equal(pdp.assessManifest(set,changed,checks).ready,false);changed[i].imageUrl=null;assert.equal(pdp.assessManifest(set,changed,checks).complete,false);}
});
test('zero-overlay photography survives art, graphics and reviewer schema handoffs',async()=>{
 const graphic=require('../../lib/creative-ai/graphic-designer'),art=require('../../lib/creative-ai/art-director'),fixture=require('../../lib/creative-ai/graphic-designer/examples/synthetic');
 const input=await fixture.inputExample();
 input.artInput.copy.forEach(d=>d.fields=[]);
 const ctx=await art.assembleContext(input.artInput),{handoff,...core}=input.artOutput;core.inputHash=ctx.inputHash;
 for(const s of core.specifications){s.text=[];s.copyHash=art.fingerprint(input.artInput.copy.find(d=>d.conceptId===s.conceptId&&d.placementId===s.placementId));s.reconciliation.forEach(r=>r.fieldIds=[]);}
 input.artOutput=art.finalizeOutput(core,ctx);
 const g=await graphic.assembleContext(input),packages=graphic.buildGenerationPackages(g);assert.equal(packages.records.length,2);assert.ok(packages.records.every(r=>r.exactCopy.fields.every(f=>f.delivery!=='embedded')));
});
for(const brandId of ['duroflex','sleepyhead'])test(brandId+' full PDP brief has exact slot/dimension binding and cannot be falsely marked passed',()=>{
 const M=require('../../public/creative-ai/studio-model'),pdp=require('../../lib/creative-ai/runtime/pdp');
 assert.deepEqual(M.pdpSlots,pdp.slots.map(s=>s.name));
 const o={...M.output(5),pdpPack:true,width:1600,height:1600,staticParts:M.pdpSlots.map((name,i)=>({id:'p'+i,name,copy:'',alt:''}))},d={brandId,focus:'product',outputs:[o]},profile=M.generationProfile(d);
 assert.equal(profile.placementId,pdp.id);assert.equal(profile.unitCount,12);
 const selections=resolve({placementIds:[profile.placementId]}).selections;
 assert.equal(M.status({placements:selections.map(s=>s.description),results:[{ready:true,imageUrl:'/creative-ai/api/jobs/j/files/static-a.png'}]}).label,'Needs attention');
 o.staticParts[0].name='Different brief purpose';assert.equal(M.generationProfile(d),null);
 o.staticParts[0].name=M.pdpSlots[0];o.width=1200;assert.equal(M.generationProfile(d),null);
});
test('a PDP upload failure retains the child for safe resume without creating a fake reviewed result',async t=>{
 const fs=require('fs/promises'),path=require('path'),os=require('os'),{CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pdp-child-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const g=require('../../lib/creative-ai/graphic-designer'),input=await require('../../lib/creative-ai/graphic-designer/examples/synthetic').inputExample(),record=g.buildGenerationPackages(await g.assembleContext(input)).records[0];record.status='request-ready';
 const r=Object.create(CreativeRuntime.prototype),job={intake:{},results:[],selection:[{id:record.placementId,description:{pdp:{index:1}}}]};
 r.store={read:async()=>job,dir:()=>dir};r.artifact=async()=> 'saved-package';r.reviews={read:async()=>{const e=Error('absent');e.code='ENOENT';throw e;},start:async()=>assert.fail('No review ledger for an image that never arrived')};let calls=0;
 r.generateImage=async()=>{calls++;const e=Error(calls===1?'Reference upload failed before dispatch':'Provider request already reserved; outcome unresolved');e.code=calls===1?'IMAGE_REFERENCE_UPLOAD_FAILED':'AMBIGUOUS_PROVIDER_REQUEST';throw e;};
 await assert.rejects(()=>r.unit('job',record,{},{}),e=>e.code==='IMAGE_REFERENCE_UPLOAD_FAILED');
 await assert.rejects(()=>r.unit('job',record,{},{}),e=>e.code==='AMBIGUOUS_PROVIDER_REQUEST');assert.equal(job.results.length,0);
 job.results.push({conceptId:record.conceptId,placementId:record.placementId,imageUrl:'saved'});await r.unit('job',record,{},{});assert.equal(calls,2,'saved child was not dispatched again');
});
for(let scenario=0;scenario<10;scenario++)test('PDP varied contract scenario '+(scenario+1)+' preserves exact required qualifiers',()=>{
 const p=selected(scenario%2?'Selected variant dimensions':'Product hero'),i=input(p),w=wire.wire(i,'');
 const qualifier=['For the selected 78 × 60 × 8-inch variant.','केवल चयनित आकार के लिए।','Subject to the saved product warranty terms.'][scenario%3];
 const raw={units:{unit0:{fields:[{...field,text:qualifier,requirement:'mandatory',locked:true}]},unit1:{fields:[{...field,text:qualifier,requirement:'mandatory',locked:true}]}},rationale:'Synthetic variation '+scenario,unknowns:[]};
 const out=w.decode(raw);copy.validateOutput(out,i);assert.ok(out.decks.every(d=>d.fields[0].text===qualifier));
});
test('24 PDP specifications reconcile in bounded batches and restore the full validated handoff',async()=>{
 const art=require('../../lib/creative-ai/art-director'),fixture=require('../../lib/creative-ai/art-director/examples/synthetic'),{CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
 const input=await fixture.inputExample(),{catalog,selections}=resolve({placementIds:['custom:studio-pdp-pack']});
 input.placements=selections.map(({id,formatId,selectionStatus,pin,jobInputs})=>({id,formatId,selectionStatus,pin,jobInputs}));
 input.copy=input.directorOutput.concepts.flatMap(c=>selections.map(p=>({conceptId:c.conceptId,placementId:p.id,fields:p.description.readability.total===0?[]:[{id:'h',role:'headline',text:'Source-bound fixture message',delivery:'embedded',nativeFieldId:'none',proofFactIds:[],requirement:'mandatory',locked:true}]})));
 input.directorInput.strategyInput.assignment.formats=selections.map(s=>({id:s.formatId,label:s.description.name,channel:'PDP',specificationStatus:'supplied',constraints:[]}));
 input.directorInput.strategy.brief.channelFormatImplications=selections.map(s=>({...structuredClone(input.directorInput.strategy.brief.channelFormatImplications[0]),formatId:s.formatId}));
 input.directorOutput=require('../../lib/creative-ai/creative-director/examples/synthetic').outputExample(input.directorInput);
 const ctx=await art.assembleContext(input,{catalog}),core=fixture.coreExample(ctx),drafts={version:1,drafts:core.specifications};
 const r=Object.create(CreativeRuntime.prototype),saved=new Map();r.planningCache=async()=>({read:async k=>saved.get(k)||null,save:async(k,v)=>saved.set(k,v)});let calls=0;
 r.provider={reason:async request=>{calls++;assert.equal(request.input.artInput.placements.length,3);const out=structuredClone(request.input.expectedCore);await request.validate(out);return out;}};
 const result=await r.reconcileBatches('pdp',input,drafts,{}, {catalog});assert.equal(result.output.specifications.length,24);assert.equal(art.validateOutput(result.output,ctx).valid,true);assert.equal(calls,4);
 await r.reconcileBatches('pdp',input,drafts,{}, {catalog});assert.equal(calls,4,'resume reuses validated per-batch output');
});
test('PDP introduction is a feature card, not silently constrained as plain photography',()=>{
 assert.equal(selected('Introduction').description.readability.classId,'feature');
 assert.equal(selected('Product hero').description.readability.classId,'commerce-photo');
});
test('explicit PDP resume schedules the same unfinished job without resetting any budget or completed child',async()=>{
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),r=Object.create(CreativeRuntime.prototype),job={id:'pdp',status:'partial',selection:[{description:{pdp:{}}}],results:[{imageUrl:'saved',ready:true}],budget:{deadline:Date.now()+60000,imageCalls:9,receipts:[{unknown:true}],maxImageCalls:48},error:'Disconnected'};
 const original=JSON.stringify(job.budget),saved=JSON.stringify(job.results);let schedules=0;r.active=new Set();r.store={read:async()=>job,update:async(id,fn)=>fn(job)};r.schedule=id=>{assert.equal(id,'pdp');schedules++;};
 const result=await r.resumePdp('pdp');assert.equal(result.id,'pdp');assert.equal(job.status,'queued');assert.equal(JSON.stringify(job.budget),original);assert.equal(JSON.stringify(job.results),saved);assert.equal(schedules,1);
 job.status='partial';job.budget.deadline=Date.now()-1;await assert.rejects(()=>r.resumePdp('pdp'),/time budget/);assert.equal(schedules,1);
});
test('PDP pack reviews bind to actual bytes, retain flagged children and invalidate changed versions',async t=>{
 const fs=require('fs/promises'),path=require('path'),os=require('os'),sharp=require('sharp'),{JobStore}=require('../../lib/creative-ai/runtime/store'),review=require('../../lib/creative-ai/runtime/pdp-review');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pdp-packs-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const store=new JobStore(path.join(dir,'output/creative-ai/jobs')),selection=resolve({placementIds:['custom:studio-pdp-pack']}).selections;
 const job=await store.create({brandId:'brand-synthetic-pdp',brandUrl:'https://example.invalid',brief:'Synthetic pack review test'},{maxReasoningCalls:160,jobTimeoutMs:60000},selection);
 const sets=['a','b'].map(conceptId=>({conceptId,visualSystem:'Synthetic continuity test only',slots:selection.map((s,i)=>({placementId:s.id,status:'ready',message:'Slot '+i,proofFactIds:[],requiredQualifiers:[],missingEvidence:[]}))}));await store.save(job.id,'pdp-plan.json',{version:1,sets});
 for(const [n,set]of sets.entries())for(const [i,s]of set.slots.entries()){const name='static-'+set.conceptId+'-'+i+'.png',bytes=await sharp({create:{width:32,height:32,channels:3,background:{r:i*12,g:n*50,b:100}}}).png().toBuffer();await store.save(job.id,name,bytes);await store.update(job.id,j=>{j.results.push({conceptId:set.conceptId,route:n?'exploration':'continuity',placementId:s.placementId,imageUrl:'/creative-ai/api/jobs/'+j.id+'/files/'+name,ready:!(n===1&&i===11)});return j;});}
 let calls=0;const runtime={store,provider:{reason:async req=>{calls++;assert.ok(req.images.length<=8);return {checks:['slot-coverage','visual-consistency','product-truth'].map(criterion=>({criterion,status:'pass',evidence:'Mocked observation; not a live quality pass.'}))};}}};
 await review.finish(runtime,job.id,{});let j=await store.read(job.id);assert.equal(calls,4);assert.equal(j.pdpPacks.find(p=>p.conceptId==='a').ready,true);assert.equal(j.pdpPacks.find(p=>p.conceptId==='b').ready,false);assert.equal(j.pdpPacks.find(p=>p.conceptId==='b').passed,11);
 const old=j.pdpPacks.find(p=>p.conceptId==='a');assert.ok((await fs.readFile(path.join(store.dir(job.id),old.downloadUrl.split('/').pop()))).includes(Buffer.from('01-hero.png')));
 await review.finish(runtime,job.id,{});assert.equal(calls,4,'same hashes reuse the saved set review');
 const changed=structuredClone(j.results);changed[0].imageUrl+='.changed';assert.equal(review.current(j.pdpPacks,changed).find(p=>p.conceptId==='a').ready,false);
 await store.save(job.id,j.results[0].imageUrl.split('/').pop(),await sharp({create:{width:32,height:32,channels:3,background:'#fff'}}).png().toBuffer());await review.finish(runtime,job.id,{});j=await store.read(job.id);assert.equal(calls,8);assert.notEqual(j.pdpPacks.find(p=>p.conceptId==='a').binding,old.binding);assert.ok(await fs.stat(path.join(store.dir(job.id),old.reviewUrl.split('/').pop())),'old evidence remains saved');
});
test('streaming PDP admission accounts for independent placement planning without raising the approved cap',()=>{
 const pdp=require('../../lib/creative-ai/runtime/pdp');const config={streamingPlanning:true,maxReasoningCalls:160,estimatedSpend:{maxUsd:271,reasoningUsd:2,imageUsd:3}};assert.throws(()=>pdp.admission(config),e=>e.code==='PDP_BUDGET_REQUIRED'&&e.minimumReservation.reasoning===100&&e.minimumReservation.amount===272);assert.equal(pdp.admission({...config,estimatedSpend:{...config.estimatedSpend,maxUsd:272}}).estimatedSpend.maxUsd,272);
});
