'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {scopeReferences}=require('../../lib/creative-ai/runtime/evidence-schema');
const {check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
const reviewer=require('../../lib/creative-ai/creative-reviewer');
const copy=require('../../lib/creative-ai/runtime/copy-checks');
test('finding comparisons reject criterion names and package paths as evidence references',()=>{
 const schema=scopeReferences(reviewer.inputSchema.properties.evidence,['review-policy','headline','product-photo']);
 const comparison=schema.properties.findings.items.properties.comparison.items;
 assert.equal(check(comparison,{stage:'copy',observation:'Observed words',referenceId:'headline'}).length,0);
 for(const referenceId of ['reference-boundary','exactCopy','other-brand-photo'])assert.ok(check(comparison,{stage:'copy',observation:'Observed words',referenceId}).length);
 assert.equal(reviewer.inputSchema.properties.evidence.properties.findings.items.properties.comparison.items.properties.referenceId.enum,undefined);
});
test('additional independent OCR can confirm full wording but cannot override visual uncertainty or a changed glyph',()=>{
 const record={exactCopy:{fields:[{id:'cta',text:'Explore Meadow',delivery:'embedded',locked:true}]}};
 const evidence=()=>({critical:[{criterion:'exact-required-copy',status:'pass',confidence:1,evidence:{observation:'Actual pixels'}}],findings:[]});
 const observation=(text,confidence=1)=>[{fieldId:'cta',observedText:text,decoration:'none',confidence,observation:'Glyphs inspected'}];
 const ocr={status:'measured',rows:[],passes:[{status:'measured',rows:[]},{status:'measured',rows:[{text:'Explore Meadow'}]}]};
 let e=evidence();copy.applyCopyChecks(record,e,observation('Explore Meadow'),ocr);assert.equal(e.critical[0].status,'pass');
 e=evidence();copy.applyCopyChecks(record,e,observation('Explore Meadow',0.5),ocr);assert.equal(e.critical[0].status,'unknown');
 e=evidence();copy.applyCopyChecks(record,e,observation('Explore Meadows'),ocr);assert.equal(e.critical[0].status,'fail');
 e=evidence();copy.applyCopyChecks(record,e,observation('Explore Meadow'),{...ocr,passes:[{status:'measured',rows:[{text:'Explore Meadowbrook'}]}]});assert.equal(e.critical[0].status,'unknown');
});
test('runtime strategy binds the supplied action and includes all selected proof while still rejecting unknown proof',async()=>{
 const {inputExample,outputExample}=require('../../lib/creative-ai/marketing-strategist/examples/synthetic');
 const {strategist}=require('../../lib/creative-ai/runtime/agents');
 const input=await inputExample();input.assignment.desiredAction='Explore the selected product.';
 input.additionalSources.push({...input.additionalSources[1],id:'user-brief'});
 const draft=outputExample({includeStrategyChecks:true});draft.strategyChecks.proofFactIds=[];
 draft.brief.desiredAction.text='Explore the selected product';
 const provider={reason:async request=>{const out=structuredClone(draft);await request.validate(out);return out;}};
 const result=await strategist(input,provider,{});
 assert.equal(result.brief.desiredAction.text,input.assignment.desiredAction);
 assert.deepEqual(result.strategyChecks.destination.expectedAction,result.brief.desiredAction);
 assert.ok(result.strategyChecks.proofFactIds.includes('capacity'));
 draft.strategyChecks.proofFactIds=['unavailable-proof'];
 await assert.rejects(strategist(input,provider,{}),/unavailable-proof/);
});
test('finding authority binds explicit findings to locked brand rules and technical findings to verified mandatory rules',()=>{
 const {scopeFindingAuthority}=require('../../lib/creative-ai/runtime/evidence-schema');
 const schema=scopeFindingAuthority(scopeReferences(reviewer.inputSchema.properties.evidence,['brand-logo','target-size','advisory-size','copy-field','review-policy']),{lockedRules:[{id:'brand-logo'}],placementContext:{context:{placements:[{rules:[{id:'target-size',tier:'mandatory',evidenceStatus:'user-specified'},{id:'advisory-size',tier:'advisory',evidenceStatus:'unknown'}]}]}}});
 const variants=schema.properties.findings.items.anyOf;
 const explicit=variants.find(v=>v.properties.authority.enum[0]==='explicit');
 const technical=variants.find(v=>v.properties.authority.enum[0]==='verified-technical');
 assert.deepEqual(explicit.properties.evidence.properties.ruleIds.items.enum,['brand-logo']);
 assert.equal(explicit.properties.evidence.properties.ruleIds.minItems,1);
 assert.deepEqual(technical.properties.evidence.properties.ruleIds.items.enum,['target-size']);
 assert.deepEqual(variants.find(v=>v.properties.authority.enum[0]==='inferred').properties.severity.enum,['advisory']);
 assert.ok(!reviewer.inputSchema.properties.evidence.properties.findings.items.anyOf);
});

test('strategy citation inventory closes over used facts without importing a large unused source registry',async()=>{
 const fixture=require('../../lib/creative-ai/marketing-strategist/examples/synthetic'),input=await fixture.inputExample(),draft=fixture.outputExample({includeStrategyChecks:true});
 for(let i=0;i<150;i++)input.research.sources.push({...input.additionalSources[0],id:'unused-'+i});
 draft.sourceIds=[];
 const result=await require('../../lib/creative-ai/runtime/agents').strategist(input,{reason:async request=>{await request.validate(draft);return draft;}},{});
 assert.ok(result.sourceIds.includes('product-sheet'));assert.ok(result.sourceIds.includes('brief-source'));
 assert.ok(result.sourceIds.every(id=>!id.startsWith('unused-')));
 assert.equal(require('../../lib/creative-ai/marketing-strategist').validateOutput(result,input,{requireStrategyChecks:true}).ok,true);
});
