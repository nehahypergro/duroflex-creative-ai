'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const strategy=require('../../lib/creative-ai/marketing-strategist');
const fixture=require('../../lib/creative-ai/marketing-strategist/examples/synthetic');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+' brand-only greeting does not require product-efficacy proof',async()=>{
 const input=await fixture.inputExample();input.assignment.focusType='brand';input.assignment.productName=brand;
 input.facts=input.facts.filter(f=>f.kind!=='product');
 input.facts.push({id:'efficacy-boundary',kind:'product',status:'unverified',essential:true,text:'No product efficacy claims have been substantiated.',sourceIds:['product-sheet']});
 const before=structuredClone(input),analysis=strategy.analyzeInput(input);
 assert.equal(analysis.readiness,'context_ready');
 assert.ok(!analysis.missingEssential.includes('supported-product-fact'));
 assert.ok(analysis.excludedFacts.some(f=>f.id==='efficacy-boundary'&&f.status==='unverified'));
 assert.deepEqual(input,before);
 for(const focus of ['product','collection',undefined]){
  const other=structuredClone(input);if(focus)other.assignment.focusType=focus;else delete other.assignment.focusType;
  assert.equal(strategy.analyzeInput(other).readiness,'research_required');
  assert.ok(strategy.analyzeInput(other).missingEssential.includes('efficacy-boundary'));
 }
 input.facts.push({id:'unresolved-identity',kind:'brand',status:'conflicted',essential:true,text:'Identity unresolved.',sourceIds:['brief-source']});
 assert.ok(strategy.analyzeInput(input).missingEssential.includes('unresolved-identity'));
});
test('explicit focus type survives validated strategist input',async()=>{
 const input=await fixture.inputExample();input.assignment.focusType='brand';
 assert.equal(strategy.validateInput(input).assignment.focusType,'brand');
});
test('brand-only output can cite supported brand facts for its focus, while product output cannot',async()=>{
 const input=await fixture.inputExample();input.assignment.focusType='brand';
 const output=fixture.outputExample({includeStrategyChecks:true});
 output.strategyChecks.productFocus={text:'The brand is the focus of this greeting.',basis:'evidence',factIds:['positioning'],sourceIds:['brief-source']};
 const result=strategy.validateOutput(output,input);
 assert.ok(!result.hardErrors.some(e=>e.includes('strategyChecks.productFocus')),result.hardErrors.join('; '));
 input.assignment.focusType='product';
 assert.ok(strategy.validateOutput(output,input).hardErrors.some(e=>e.includes('strategyChecks.productFocus')));
});
