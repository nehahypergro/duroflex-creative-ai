'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('../../lib/creative-ai/marketing-strategist/examples/synthetic');
const strategist=require('../../lib/creative-ai/marketing-strategist'),wire=require('../../lib/creative-ai/runtime/decision-wire');
const authority=require('../../lib/creative-ai/runtime/handoff-authority');
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': background gaps are not presented as mandatory assignment blockers',async()=>{
  const input=await fixture.inputExample();input.research.brandName=brand;
  input.facts.push({id:'unadopted-range',kind:'brand',text:'Unadopted future range names.',status:'conflicted',essential:true,sourceIds:['site']});
  const audit=strategist.analyzeInput(input),request={schema:strategist.schemaFor(),input:{assignment:input,boundaryAudit:audit},instructions:''};
  const before=JSON.stringify(request),w=wire.strategy(request,input);
  assert.ok(!w.input.boundaryAudit.missingEssential.includes('unadopted-range'));
  assert.ok(w.input.boundaryAudit.backgroundBrandDependencyCandidates.some(f=>f.id==='unadopted-range'));
  assert.equal(w.input.assignment.facts.at(-1).status,'conflicted');assert.equal(JSON.stringify(request),before);
  input.facts.push({id:'required-dimension',kind:'product',text:'Unknown selected dimensions.',status:'unsupported',essential:true,sourceIds:['site']});
  const next=wire.strategy({...request,input:{assignment:input,boundaryAudit:strategist.analyzeInput(input)}},input);
  assert.ok(next.input.boundaryAudit.missingEssential.includes('required-dimension'));
 });
 for(const role of ['strategy','concepts','copy','art','reconciliation','review','pdp-plan','refinement','publishing-copy','set-review'])test(brand+': '+role+' keeps background exclusions separate from physical product labels',()=>{
  const input={brandKnowledge:{brandId:brand},stage:role,strategy:{unusedBrandFacts:[{factId:'portfolio',reason:'Existing SKU only.',avoidance:'Do not adopt proposed Restore naming.'}],uncertainties:['Source remains disputed.']},facts:[{id:'portfolio',kind:'brand',status:'conflicted',essential:true,sourceIds:['brand-doc']},{id:'product-proof',kind:'product',status:'unsupported',essential:true,sourceIds:['product-page']}]};
  const shapes={strategy:v=>v,concepts:v=>({context:v}),copy:v=>({copyContext:v}),art:v=>({directorInput:{strategyInput:{facts:v.facts},strategy:v.strategy}}),reconciliation:v=>({units:[v]}),review:v=>({record:{upstreamContext:v}}),'pdp-plan':v=>({gallery:v}),refinement:v=>({sourceVersion:v}),'publishing-copy':v=>({selectedImage:v}),'set-review':v=>({gallerySources:[v]})};
  const handoff=shapes[role](input),before=JSON.stringify(handoff),out=authority.compile(handoff);
  const record=out.records.find(r=>r.path.endsWith('facts[portfolio]'));assert.equal(record.relevance,'not-used-in-this-assignment');assert.equal(record.blocksAssignment,false);assert.equal(record.authority,'unknown');
  const product=out.records.find(r=>r.path.endsWith('facts[product-proof]'));assert.notEqual(product.blocksAssignment,false);
  const scope=out.assignmentDependencies[0];assert.equal(scope.factId,'portfolio');assert.equal(scope.scope,'background-proposal-only');assert.equal(scope.mayAlterProductMarkings,false);assert.equal(scope.reason,'Existing SKU only.');assert.equal(JSON.stringify(handoff),before);
 });
}
test('dependency guidance retains real execution and output checks without asking to reapprove existing identity',()=>{
 assert.match(authority.instructions,/unknown is not automatically a blocker/i);
 assert.match(authority.instructions,/physical product markings/i);
 assert.match(authority.instructions,/missing rendering capability/i);
});
test('excluded proposals never become an unscoped ban in downstream uncertainty text',async()=>{
 const input=await fixture.inputExample();input.facts.push({id:'draft-range',kind:'brand',text:'Draft range architecture.',status:'conflicted',essential:true,sourceIds:['site']});
 const avoidance='Do not adopt the proposed range name.';
 const raw={brandDependencyDecisions:[{factId:'draft-range',requiredForExecution:false,reason:'Existing SKU only.',executionUse:'',avoidance}],researchRequests:[],uncertainties:[avoidance,'Actual source evidence remains limited.']};
 const result=require('../../lib/creative-ai/marketing-strategist/dependencies').resolveDecisions(input,raw);
 assert.ok(!result.uncertainties.includes(avoidance));assert.ok(result.uncertainties.some(n=>n.includes('draft-range')&&n.includes('physical product markings')));
 assert.equal(result.unusedBrandFacts[0].avoidance,avoidance);assert.ok(result.uncertainties.includes('Actual source evidence remains limited.'));assert.equal(raw.uncertainties[0],avoidance);
});
