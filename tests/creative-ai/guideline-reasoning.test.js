'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const reasoning=require('../../lib/creative-ai/runtime/guideline-reasoning'),art=require('../../lib/creative-ai/art-director'),fixture=require('../../lib/creative-ai/art-director/examples/synthetic');
const source={id:'own-guide',kind:'guidelines',status:'partial',label:'Own brand guide (draft)',reference:'user-upload:Own guide.pdf',collectedAt:'2026-10-07T00:00:00Z',note:'Draft; selected pages inspected.'};
const rule={id:'brand-palette',domain:'palette',value:'Use the supplied palette.',sourceIds:[source.id]};
const application={ruleId:rule.id,decision:'Use the supplied accent on the headline.',why:'The accent connects the message to the supplied brand identity while retaining a quiet product area.'};
test('specific rule, decision, why and draft source survive the saved-package explanation',()=>{const pkg={artDirection:{lockedRules:[rule],brandGuidelineApplications:[application]},upstreamContext:{strategyInput:{research:{sources:[source]}}}};assert.deepEqual(reasoning.explain(pkg),{recorded:true,applications:[{...application,rule:rule.value,sources:[source]}]});});
test('website patterns, unavailable guides and foreign rule IDs cannot become guideline applications',()=>{assert.equal(reasoning.validate([application],[rule],[{...source,kind:'site'}]).length,1);assert.equal(reasoning.validate([application],[rule],[{...source,status:'unavailable'}]).length,1);assert.equal(reasoning.validate([{...application,ruleId:'other-brand'}],[rule],[source]).length,1);assert.equal(reasoning.validate([{...application,why:' '}],[rule],[source]).length,1);});
test('legacy saved packages remain honest and unsupported citations are suppressed',()=>{assert.deepEqual(reasoning.explain({artDirection:{lockedRules:[rule]}}),{recorded:false,applications:[]});assert.deepEqual(reasoning.explain({artDirection:{lockedRules:[rule],brandGuidelineApplications:[application]},upstreamContext:{strategyInput:{research:{sources:[]}}}}),{recorded:true,applications:[]});});
test('rule applications survive deterministic handoff; invented rule blocks finalization',async()=>{const input=await fixture.inputExample();input.referenceSources.push(source);input.visualRules.push(rule);const ctx=await art.assembleContext(input),core=fixture.coreExample(ctx);core.specifications[0].brandGuidelineApplications=[structuredClone(application)];const out=art.finalizeOutput(core,ctx);assert.equal(art.validateOutput(out,ctx).valid,true);assert.deepEqual(out.handoff.packets[0].specification.brandGuidelineApplications,[application]);core.specifications[0].brandGuidelineApplications[0].ruleId='foreign-rule';assert.throws(()=>art.finalizeOutput(core,ctx),/non-guideline rule/);});

test('reconciliation schema permits supplied-guideline IDs and excludes campaign directives',()=>{
 const {reconciliationSchemaFor}=require('../../lib/creative-ai/runtime/agents');
 const rules=[rule,{id:'fresh-backdrop',sourceIds:['user-brief']}],sources=[source,{id:'user-brief',kind:'user',status:'available'}];
 const eligible=reasoning.eligibleRules(rules,sources),template=[{conceptId:'c',placementId:'p'}];
 const schema=reconciliationSchemaFor(template,[],[],eligible),applications=schema.properties.specifications.items.properties.brandGuidelineApplications;
 assert.deepEqual(applications.items.properties.ruleId.enum,['brand-palette']);
 assert.ok(!applications.items.properties.ruleId.enum.includes('fresh-backdrop'));
 assert.equal(reconciliationSchemaFor(template,[],[],[]).properties.specifications.items.properties.brandGuidelineApplications.maxItems,0);
});
test('initial art planning keeps brief directives out of guideline citations without a provider call',async()=>{
 const calls=require('../../lib/creative-ai/runtime/agents'),input=await require('../../lib/creative-ai/graphic-designer/examples/synthetic').inputExample(),pk=require('../../lib/creative-ai/placement-knowledge');
 const campaign={id:'fresh-backdrop',domain:'imagery',value:'Change the website backdrop.',sourceIds:['user-brief']};
 const base={concepts:input.artInput.directorOutput.concepts,placements:input.artInput.placements.map(p=>({...p,expanded:pk.resolvePin(p.pin)})),guardian:{requirements:[],visualRules:[rule,campaign]},brandResearch:{sources:[source,{id:'user-brief',kind:'user',status:'available'}]},assets:[]};
 const drafts={version:1,drafts:input.artOutput.specifications.map(s=>Object.fromEntries(Object.keys(calls.draftSchema.properties.drafts.items.properties).map(k=>[k,structuredClone(s[k])]))) };let requests=0;
 const result=await calls.artDraft(base,{reason:async req=>{
  requests++;assert.deepEqual(req.input.eligibleBrandGuidelineRules.map(r=>r.id),[rule.id]);assert.deepEqual(req.schema.properties.drafts.items.properties.brandGuidelineApplications.items.properties.ruleId.enum,[rule.id]);
  const out=structuredClone(drafts);out.drafts[0].brandGuidelineApplications=[application];req.validate(out);
  const invalid=structuredClone(out);invalid.drafts[0].brandGuidelineApplications[0].ruleId=campaign.id;assert.throws(()=>req.validate(invalid),/unsupported value|enum|non-guideline/);
  invalid.drafts[0].brandGuidelineApplications[0].ruleId='unknown-rule';assert.throws(()=>req.validate(invalid),/unsupported value|enum|non-guideline/);
  return out;
 }},{});assert.equal(requests,1);assert.equal(result.drafts[0].brandGuidelineApplications[0].ruleId,rule.id);
});
