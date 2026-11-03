'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const knowledge=require('../../lib/creative-ai/treatment-knowledge');
const {resolve}=require('../../lib/creative-ai/runtime/placements');
const strategy=require('../../lib/creative-ai/marketing-strategist');
const fixture=require('../../lib/creative-ai/marketing-strategist/examples/input.json');
function selected(intake={placementIds:['custom:studio-pdp-pack']}){const {catalog,selections}=resolve(intake);return {catalog,selections,intake};}
function inputFor(selections){const input=structuredClone(fixture);input.assignment.formats=selections.map(s=>({id:s.id,label:s.description.name,channel:s.description.platform,specificationStatus:'supplied',constraints:[]}));return input;}
test('PDP rules reach strategist context before concepts without relying on brief keywords',()=>{
 const c=selected(),snapshot=knowledge.capture(c);const input=knowledge.apply(inputFor(c.selections),snapshot,c.selections);
 strategy.validateInput(input);const text=JSON.stringify(strategy.assembleContext(input).messages);
 for(const phrase of ['buyer question','qualifiers','no overlay','different buyer question'])assert.ok(text.includes(phrase),phrase);
 assert.equal(snapshot.placements.length,12);assert.deepEqual(snapshot.packs.map(p=>p.id),['owned-pdp','format-common']);
 assert.ok(input.assignment.formats.find(f=>f.id.endsWith('04')).constraints.some(x=>x.includes('length, width and height')));
 assert.equal(fixture.assignment.formats.some(f=>f.constraints.some(x=>x.includes('TREATMENT'))),false);
});
test('exact selected destination wins over unrelated words in a brief; marketplace gets no owned-PDP rules',()=>{
 const c=selected({placementIds:['merchant-primary'],brief:'Instagram story about PDP A+ printing'});
 const snapshot=knowledge.capture(c);assert.deepEqual(snapshot.packs.map(p=>p.id),['format-common','marketplace-main']);
 const input=knowledge.apply(inputFor(c.selections),snapshot,c.selections);
 assert.ok(input.assignment.formats[0].constraints.some(x=>x.includes('mandatory')));
 assert.ok(!JSON.stringify(input).includes('pdp-buyer-questions'));
});
test('each selection gets only its own sourced rules, not a ratio-based fallback',()=>{
 const catalog=require('../../lib/creative-ai/placement-knowledge').loadCatalog();
 const ids=catalog.profiles.filter(p=>p.family!=='custom').slice(0,10).map(p=>p.id);
 for(const id of ids){const c=selected({placementIds:[id]}),s=knowledge.capture(c),p=s.placements[0];
 assert.equal(p.profile.id,id);assert.deepEqual(p.rules,c.selections[0].expanded.rules);
 assert.ok(p.rules.every(r=>r.sourceIds.every(id=>p.sources.some(s=>s.id===id))));}
 assert.throws(()=>selected({placementIds:['unknown-square']}),/No matching/);
});
test('stored snapshot survives a later library edit and detects altered bytes or selection',()=>{
 const c=selected(),snapshot=knowledge.capture(c),original=structuredClone(snapshot);
 c.catalog.rules[0].statement='Later catalogue edit';
 assert.deepEqual(knowledge.validate(snapshot,c.selections),original);
 const changed=structuredClone(snapshot);changed.packs[0].rules[0].statement='Corrupted rule';
 assert.throws(()=>knowledge.validate(changed,c.selections),/hash/);
 const changedSelection=structuredClone(c.selections);changedSelection[0].pin.profileId='wrong';
 assert.throws(()=>knowledge.validate(snapshot,changedSelection),/selection/);
});
test('both brands use identical common guidance without copying brand evidence',()=>{
 const c=selected();const a=knowledge.capture({...c,intake:{...c.intake,brandId:'Duroflex',brief:'Duroflex private brief'}}),b=knowledge.capture({...c,intake:{...c.intake,brandId:'Sleepyhead',brief:'Sleepyhead private brief'}});
 assert.deepEqual(a,b);assert.ok(!JSON.stringify(a).includes('private brief'));
 for(const brand of ['Duroflex','Sleepyhead']){const input=inputFor(c.selections);input.assignment.productName=brand+' private SKU';const result=knowledge.apply(input,a,c.selections);assert.equal(result.assignment.productName,brand+' private SKU');assert.deepEqual(result.research,input.research);assert.deepEqual(result.facts,input.facts);}
});
test('legacy strategies remain unchanged and missing selected format is rejected',()=>{
 const c=selected(),input=inputFor(c.selections);assert.deepEqual(knowledge.apply(input,null,c.selections),input);
 const broken=structuredClone(input);broken.assignment.formats.pop();assert.throws(()=>knowledge.apply(broken,knowledge.capture(c),c.selections),/format/);
});
test('PDP executor and common library share slot and execution guidance',()=>{
 const pdp=require('../../lib/creative-ai/runtime/pdp'),pack=knowledge.loadPack('owned-pdp');
 assert.deepEqual(pdp.slots,pack.slots);assert.equal(pdp.instructions,pack.executionInstructions);
});
test('actual strategist adapter receives the rule snapshot in its decision request',async()=>{
 const c=selected(),input=knowledge.apply(inputFor(c.selections),knowledge.capture(c),c.selections);let calls=0;
 await assert.rejects(()=>require('../../lib/creative-ai/runtime/agents').strategist(input,{reason:async request=>{
  calls++;const actual=request.wire.input.assignment.assignment.formats;
  assert.equal(actual.length,12);assert.ok(actual.every(f=>f.constraints.some(x=>x.includes('pdp-buyer-questions'))));
  assert.ok(request.wire.instructions.includes('Selected-format treatment knowledge'));
  throw Error('Intercepted before paid dispatch');
 }},{}),/Intercepted before paid dispatch/);assert.equal(calls,1);
});
test('job persistence retains pinned rules; missing required snapshot fails closed',async t=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{JobStore}=require('../../lib/creative-ai/runtime/store');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'treatment-pin-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const c=selected(),snapshot=knowledge.capture(c),store=new JobStore(root),job=await store.create({brief:'Synthetic fixture'},{treatmentKnowledge:snapshot,jobTimeoutMs:1000,maxReasoningCalls:1},c.selections);
 const reopened=await store.read(job.id);assert.equal(reopened.treatmentKnowledgeVersion,1);assert.deepEqual(knowledge.forJob(reopened),snapshot);
 delete reopened.treatmentKnowledge;assert.throws(()=>knowledge.forJob(reopened),/missing/);
 assert.equal(knowledge.forJob({selection:c.selections}),null);
});
test('execution and review resolve the same pinned treatment without loading latest',()=>{
 const c=selected(),snapshot=knowledge.capture(c);snapshot.packs[0].executionInstructions='Saved old execution instructions';
 assert.equal(knowledge.execution(snapshot),'Saved old execution instructions');
 const context=knowledge.forPlacement(snapshot,c.selections[3].id);assert.equal(context.packs[0].executionInstructions,'Saved old execution instructions');assert.equal(context.placements[0].slot.key,'dimensions');
});

test('prompt context deduplicates common rules and includes only requested scopes without mutating the snapshot',()=>{
 const c=selected(),snapshot=knowledge.capture(c),before=JSON.stringify(snapshot),context=knowledge.context(snapshot);
 assert.equal(context.rules.length,new Set(context.rules.map(r=>r.id)).size);
 assert.ok(JSON.stringify(context).length<before.length/2);
 const unit=knowledge.forPlacement(snapshot,c.selections[0].id);
 assert.equal(unit.placements.length,1);assert.ok(unit.rules.every(r=>r.scope.profileIds.every(id=>id===c.selections[0].pin.profileId)));
 unit.rules[0].statement='caller edit';assert.equal(JSON.stringify(snapshot),before);
});
