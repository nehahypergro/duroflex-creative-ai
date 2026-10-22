'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path');
const reviewer=require('../../lib/creative-ai/creative-reviewer'),fixture=require('../../lib/creative-ai/creative-reviewer/examples/synthetic'),lifecycle=require('../../lib/creative-ai/creative-reviewer/lifecycle'),focused=require('../../lib/creative-ai/runtime/focused-context'),deterministic=require('../../lib/creative-ai/runtime/deterministic-output'),{check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
test('unknown-only and undiagnosed low score preserve artwork and the unused correction cycle',async()=>{
 for(const options of [{pending:true},{score:74}]){
  const input=await fixture.inputExample(options),report=reviewer.evaluate(await reviewer.assembleContext(input)),initial=await lifecycle.createState(input.package,input.artifact.imageData),result=lifecycle.consumeReview(initial,report);
  assert.equal(result.state.delivery,'verification-pending');assert.equal(result.state.correctionCycles,0);assert.equal(result.plan,null);assert.equal(result.state.currentArtifactHash,initial.currentArtifactHash);
  const delivery=await require('../../lib/creative-ai/creative-reviewer/delivery').buildDelivery(result.state,report,input.package,input.artifact);assert.equal(delivery.ready,false);assert.ok(delivery.imageData);
 }
});
test('confirmed defect can use the single correction even when another criterion is unknown',async()=>{
 const input=await fixture.inputExample({criticalFailure:true});input.evidence.critical.find(c=>c.criterion==='logo-identity').status='unknown';const report=reviewer.evaluate(await reviewer.assembleContext(input));const result=lifecycle.consumeReview(await lifecycle.createState(input.package,input.artifact.imageData),report);assert.equal(result.state.phase,'correction-planned');assert.equal(result.state.correctionCycles,1);
});
test('alternative evidence branches keep required authority on the actual provider wire contract',async()=>{
 const input=await fixture.inputExample(),schema=require('../../lib/creative-ai/runtime/evidence-schema').scopeFindingAuthority(reviewer.inputSchema.properties.evidence,input.package),wire=require('./offline-provider.cjs').typedWireSchema(deterministic.project(schema)),branches=wire.properties.findings.items.anyOf;
 for(const b of branches){assert.ok(b.required.includes('authority'));assert.equal(b.properties.authority.type,'string');assert.equal(b.properties.authority.enum.length,1);}
 const finding=fixture.findingExample(input.package);assert.deepEqual(check(wire.properties.findings.items,finding),[]);delete finding.authority;assert.ok(check(wire.properties.findings.items,finding).length);
 const before=structuredClone(schema);deterministic.project(schema);assert.deepEqual(schema,before);
});
test('concept schema and role input use the same supported proof set as semantic validation',()=>{
 const input=require('../../lib/creative-ai/creative-director/examples/synthetic').inputExample(),cd=require('../../lib/creative-ai/creative-director'),proof=require('../../lib/creative-ai/runtime/concept-proof');
 input.strategyInput.facts.push({id:'uncertain-identity',text:'Proposed identity, not adopted',status:'unsupported',sourceIds:[input.strategyInput.research.sources[0].id]});
 const ids=proof.eligibleIds(input),schema=proof.schemaFor(cd.coreOutputSchema,input),row=schema.properties.concepts.items;
 assert.ok(!ids.includes('uncertain-identity'));assert.deepEqual(row.properties.evidence.properties.factIds.items.enum,ids);assert.deepEqual(row.properties.requiredProofFactIds.items.enum,ids);
 assert.ok(check(row.properties.requiredProofFactIds,['uncertain-identity']).length);
 const projected=focused.project('concepts',{context:input,eligibleProofFactIds:ids});assert.ok(projected.context.strategyInput.nonProofContext.some(f=>f.id==='uncertain-identity'));assert.ok(!projected.context.strategyInput.facts.some(f=>f.id==='uncertain-identity'));
});
function expand(v,shared){if(Array.isArray(v))return v.map(x=>expand(x,shared));if(v&&typeof v==='object'){if(v.sharedTextId)return shared[v.sharedTextId];return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,expand(x,shared)]));}return v;}
test('review compaction retains whole rules, exact copy, facts and used source qualifiers losslessly',async()=>{
 const input=await fixture.inputExample(),r=input.package,source={id:'source-qualifier',status:'partial',note:'Draft only; cannot establish adopted identity.'};r.upstreamContext.strategyInput.additionalSources.push(source,{id:'uncited-source',note:'Unused inventory'});r.lockedRules[0].sourceIds.push(source.id);
 const original=structuredClone(r),projection=focused.project('review',{record:r}),out=expand(projection,projection.sharedText);
 assert.deepEqual(r,original);assert.deepEqual(out.record.lockedRules,r.lockedRules);assert.deepEqual(out.record.exactCopy,r.exactCopy);assert.deepEqual(out.record.evidence.facts,r.upstreamContext.strategyInput.facts);assert.deepEqual(out.record.placementContext.context.placements[0].rules,r.placementContext.context.placements[0].rules);
 assert.deepEqual(out.record.evidence.sources.find(s=>s.id===source.id),source);assert.ok(!out.record.evidence.sources.some(s=>s.id==='uncited-source'));assert.equal(out.record.prompt,undefined);assert.equal(out.record.upstreamContext,undefined);
 const repeated='Important full rule and qualifier. '.repeat(20),small=focused.shareText({a:repeated,b:repeated,c:repeated});assert.deepEqual(expand({a:small.a,b:small.b,c:small.c},small.sharedText),{a:repeated,b:repeated,c:repeated});assert.ok(JSON.stringify(small).length<JSON.stringify({a:repeated,b:repeated,c:repeated}).length);
});
test('focused OCR inspects existing text pixels and never treats I/l as an exact match',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'focused-copy-'));try{
  const file=path.join(dir,'image.png');await require('sharp')({create:{width:1080,height:1920,channels:3,background:'#fff'}}).png().toFile(file);const before=await fs.readFile(file),copy=require('../../lib/creative-ai/runtime/copy-checks'),local=require('../../lib/creative-ai/runtime/focused-ocr'),record={exactCopy:{fields:[{id:'title',text:'LiveIn Orthopedic Mattress',delivery:'embedded',locked:true}]}};
  const original={status:'measured',rows:[{text:'Liveln Orthopedic Mattress',box:{x:0.1,y:0.2,width:0.6,height:0.1}}]};let calls=0;
  assert.equal(copy.matchesFullField(original,record.exactCopy.fields[0].text),false);
  const out=await local.focus(record,file,{width:1080,height:1920},original,{recognize:async crop=>{calls++;assert.notEqual(crop,file);return {status:'measured',rows:[{text:'Liveln Orthopedic Mattress'}]};}});
  assert.equal(calls,1);assert.equal(copy.matchesFullField(out,record.exactCopy.fields[0].text),false);assert.deepEqual(await fs.readFile(file),before);
  const correct={status:'measured',rows:[{text:'LiveIn Orthopedic Mattress'}]};await local.focus(record,file,{width:1080,height:1920},correct,{recognize:()=>{throw Error('Already matched; no crop needed');}});
  assert.equal(local.region([],record.exactCopy.fields[0].text,1080,1920),null);
  const block=local.region([{text:'Liveln',box:{x:0.1,y:0.1,width:0.2,height:0.025}},{text:'Orthopedic',box:{x:0.1,y:0.14,width:0.4,height:0.025}},{text:'Mattress',box:{x:0.1,y:0.18,width:0.3,height:0.025}}],record.exactCopy.fields[0].text,1080,1920);assert.ok(block.top<192,'Keep the uncertain first line in its actual text block');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
