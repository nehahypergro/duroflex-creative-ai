'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const director=require('../../lib/creative-ai/creative-director');
const {getAgentContract}=require('../../lib/creative-ai/agents');
const {inputExample,coreExample,outputExample,resultExamples}=require('../../lib/creative-ai/creative-director/examples/synthetic');
const {associateReviewedResults,renderReviewedResultsHtml}=require('../../lib/creative-ai/creative-director/results');
test('compatible registry and context includes annotated knowledge, selected strategy and no inference',()=>{
 const input=inputExample(),c=director.assembleContext(input);assert.equal(getAgentContract('creative-director'),director);assert.equal(getAgentContract('brand-strategist').agent.id,'marketing-strategist');
 for(const p of director.loadKnowledge().principles)for(const k of ['sourceSummary','application','limits','syntheticExample','counterexample'])assert.ok(c.messages[0].content.includes(p[k]));
 assert.ok(c.messages[1].content.includes('getWhoToBy'));assert.ok(c.messages[1].content.includes(input.strategy.assumptions[0].text));assert.ok(c.runtimeStatus.includes('No inference'));assert.equal(c.agent.humanApprovalRequired,false);
});
test('exact two stable route IDs; both automatically hand off to both specialists',()=>{
 const input=inputExample(),output=outputExample(input);assert.equal(director.validateOutput(output,input).ok,true);assert.equal(output.concepts.length,2);assert.deepEqual(output.concepts.map(c=>c.route),['continuity','exploration']);
 for(const r of output.handoff.recipients){assert.equal(r.dispatchAllowed,true);assert.deepEqual(r.conceptIds,output.concepts.map(c=>c.conceptId));assert.equal(r.packets.length,2);assert.deepEqual(r.packets.map(p=>p.card),output.concepts);}
 assert.deepEqual(output.handoff.recipients.map(r=>r.agentId),['copywriter','art-director']);assert.equal(output.handoff.humanApprovalRequired,false);assert.equal(output.handoff.automatic,true);
 const retry=coreExample(input);retry.workflow.attempt=2;assert.throws(()=>director.finalizeOutput(retry,input),/range/);
});
test('one, four, duplicate routes and literal duplicate premises are rejected; no selection field',()=>{
 const input=inputExample();for(const count of [1,4]){const o=outputExample(input);o.concepts=Array.from({length:count},(_,i)=>structuredClone(o.concepts[i%2]));assert.equal(director.validateOutput(o,input).ok,false);}
 const routes=outputExample(input);routes.concepts[1].route='continuity';assert.equal(director.validateOutput(routes,input).ok,false);
 const premise=outputExample(input);premise.concepts[1].creativePremise.description=premise.concepts[0].creativePremise.description;assert.equal(director.validateOutput(premise,input).ok,false);
 const select=outputExample(input);select.selectedConceptId=select.concepts[0].conceptId;assert.equal(director.validateOutput(select,input).ok,false);
});
test('strategy, evidence labels, assumptions and established positioning remain exact',()=>{
 const input=inputExample();
 for(const mutate of [o=>o.concepts[0].strategyLinkage.primaryProposition.basis='evidence',o=>o.concepts[0].strategyLinkage.positioningFactIds=[],o=>o.concepts[0].strategyLinkage.getWhoToBy.who.basis='evidence',o=>o.concepts[0].evidence.assumptionIds=[],o=>o.concepts[0].brandLinkage.preservedRequirementIds=[]]){const o=outputExample(input);mutate(o);assert.equal(director.validateOutput(o,input).ok,false);}
 assert.deepEqual(outputExample(input).handoff.context.strategyInput.facts,input.strategyInput.facts);assert.deepEqual(outputExample(input).handoff.context.strategy.uncertainties,input.strategy.uncertainties);
});
test('unknown and unavailable provenance, invented proof and format status are rejected',()=>{
 const input=inputExample();for(const mutate of [o=>o.concepts[0].evidence.sourceIds.push('unknown'),o=>o.concepts[0].evidence.sourceIds.push('site'),o=>o.concepts[0].requiredProofFactIds.push('invented-claim'),o=>o.concepts[0].evidence.referenceCreativeIds.push('uncollected-ad'),o=>o.concepts[0].formatImplications[0].specificationStatus='supplied']){const o=outputExample(input);mutate(o);assert.equal(director.validateOutput(o,input).ok,false);}
 const bad=inputExample();bad.referenceCreativeIds=['unknown'];assert.throws(()=>director.assembleContext(bad),/creative reference/);
});
test('mandatory failures block the pair, never score away a rule or dispatch one route',()=>{
 const input=inputExample(),core=coreExample(input);core.concepts[1].qualityReview.hardGate='fail';core.concepts[1].qualityReview.mandatoryChecks[0].status='fail';core.concepts[1].qualityReview.violations=['Explicit requirement unresolved'];core.status='blocked';core.workflow.internalQuestions=[{target:'brand-guardian',question:'Resolve the explicit requirement conflict without relaxing it.',relatedIds:['no-medical']}];
 const o=director.finalizeOutput(core,input);assert.equal(director.validateOutput(o,input).ok,true);for(const r of o.handoff.recipients){assert.equal(r.dispatchAllowed,false);assert.equal(r.packets.length,0);assert.equal(r.conceptIds.length,2);}assert.equal(associateReviewedResults(o,input,[]).length,0);
 const relaxed=structuredClone(core);relaxed.status='ready';assert.throws(()=>director.finalizeOutput(relaxed,input),/Pair status/);
 core.workflow.attempt=3;assert.throws(()=>director.finalizeOutput(core,input),/out of range/);
});
test('handoff tampering cannot drop either concept or change the shared facts/assumptions',()=>{
 const input=inputExample();for(const mutate of [o=>o.handoff.recipients[0].packets.pop(),o=>o.handoff.recipients[1].conceptIds.reverse(),o=>o.handoff.context.strategy.assumptions=[],o=>o.handoff.context.strategyInput.facts[0].text='Fabricated benefit',o=>o.handoff.humanApprovalRequired=true]){const o=outputExample(input);mutate(o);assert.equal(director.validateOutput(o,input).ok,false);}
});
test('missing mandatory execution asset cannot pass',()=>{
 const input=inputExample(),core=coreExample(input);core.concepts[0].requiredAssets[0].essential=true;assert.throws(()=>director.finalizeOutput(core,input),/Mandatory failure/);
});
test('only matching finished reviewed statics expose explanations; not queued, failed or unreviewed',()=>{
 const input=inputExample(),o=outputExample(input),r=resultExamples(input,o);assert.equal(associateReviewedResults(o,input,r).length,2);
 const queued=structuredClone(r);queued[0].status='queued';queued[1].review.status='pending';assert.deepEqual(associateReviewedResults(o,input,queued),[]);const html=renderReviewedResultsHtml(o,input,queued);assert.ok(!html.includes(o.concepts[0].publicExplanation.idea));assert.ok(html.includes('Concept explanations remain internal'));
 for(const mutate of [x=>x[0].conceptId='wrong',x=>x[0].conceptHash='wrong',x=>x[0].strategyHash='wrong',x=>x[0].assignmentId='wrong',x=>x[0].formatId='wrong']){const bad=structuredClone(r);mutate(bad);assert.throws(()=>associateReviewedResults(o,input,bad));}
});
test('demo placeholders cannot masquerade as generated/reviewed production images; display has no choice controls',()=>{
 const input=inputExample(),o=outputExample(input),r=resultExamples(input,o),html=renderReviewedResultsHtml(o,input,r);assert.ok(html.includes('No images were generated'));assert.ok(html.includes('Review markers are simulated'));assert.ok(!html.includes('<img'));assert.ok(!/<button|<select|<form|type="radio"|type="checkbox"/.test(html));
 for(const card of o.concepts)assert.ok(html.includes(`data-concept-id="${card.conceptId}"`));assert.ok(html.includes('Assumption:'));assert.ok(html.includes('Collected 2026-10-04'));assert.ok(html.includes('Fictional supplied product sheet'));
 r[0].artifact={kind:'static',origin:'generated',url:'/generated/fake.png'};r[0].review.evidenceStatus='runtime';assert.throws(()=>associateReviewedResults(o,input,r),/synthetic evidence/);
});
test('public explanations escape source text, while internal cards and directions stay hidden',()=>{
 const input=inputExample(),core=coreExample(input);core.concepts[0].publicExplanation.idea='<script>alert(1)</script>';const o=director.finalizeOutput(core,input),r=resultExamples(input,o),html=renderReviewedResultsHtml(o,input,r);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes(core.concepts[0].workingTitle));assert.ok(!html.includes(core.concepts[0].copyDirection));
});
test('an upstream research-required strategy blocks both handoffs and keeps both internal cards',()=>{
 const input=inputExample();input.strategyInput.facts[0].status='unverified';input.strategy.status='research_required';input.strategy.alternatives=[];input.strategy.selection={directionId:'none',reason:'Product proof is missing.',materialTradeoffs:['Only provisional conceptual discussion is possible.'],alternativesNote:'No route selected until product proof is supplied.'};
 input.strategy.brief.primaryProposition={text:'Proposition deferred pending product verification.',basis:'assumption',sourceIds:[],factIds:[]};input.strategy.brief.supportingClaims=[];input.strategy.getWhoToBy=require('../../lib/creative-ai/marketing-strategist').deriveGetWhoToBy(input.strategy.brief);
 input.strategy.strategyChecks.productFocus={text:'Product focus deferred pending proof.',basis:'assumption',sourceIds:[],factIds:[]};input.strategy.strategyChecks.customerRelevance.factIds=[];input.strategy.strategyChecks.proofFactIds=[];input.strategy.strategyChecks.messageRole='deferred';
 input.strategy.researchRequests=['capacity','supported-product-fact'].map(id=>({question:'Supply applicable product proof.',essential:true,relatedIds:[id]}));
 assert.equal(director.assembleContext(input).readiness,'upstream_research_required');const core=coreExample(input);core.status='blocked';core.workflow.internalQuestions=[{target:'marketing-strategist',question:'Resolve essential product proof and proposition.',relatedIds:['capacity']}];for(const c of core.concepts){c.evidence.factIds=['positioning'];c.requiredProofFactIds=[];}
 const output=director.finalizeOutput(core,input);assert.equal(director.validateOutput(output,input).ok,true);assert.equal(output.concepts.length,2);assert.ok(output.handoff.recipients.every(r=>!r.dispatchAllowed && r.packets.length===0));
});
test('inventory metadata alone cannot be called an available execution image',()=>{
 const input=inputExample(),core=coreExample(input);core.concepts[0].requiredAssets=[{label:'Reference image',assetId:'art',status:'available',essential:true}];assert.throws(()=>director.finalizeOutput(core,input),/supplied inventory bytes/);
});
test('product and logo assets stay usable for execution without becoming creative references',()=>{
 const input=inputExample();
 input.referenceCreativeIds=[];
 const original=input.strategyInput.research.assets.find(a=>a.id==='art');
 const ids=['official-image-3','official-image-2','sku-product-image-1','sku-product-image-2','sku-product-image-3'];
 for(const [i,id] of ids.entries())input.strategyInput.research.assets.push({...structuredClone(original),id,kind:i===0?'logo':'product',imageData:'data:image/png;base64,fixture'});
 const core=coreExample(input);
 for(const c of core.concepts){c.evidence.referenceCreativeIds=[];c.requiredAssets=ids.map(assetId=>({label:'Supplied identity asset',assetId,status:'available',essential:true}));}
 const output=director.finalizeOutput(core,input);
 assert.equal(director.validateOutput(output,input).ok,true);
 assert.ok(output.handoff.context.strategyInput.research.assets.some(a=>a.id==='sku-product-image-1'&&a.imageAvailable));
 const context=director.assembleContext(input);
 assert.ok(context.messages[0].content.includes('"allowedCreativeReferenceIds":[]'));
 assert.ok(context.messages[0].content.includes('"creativeReferenceAllowed":false'));
 for(const id of ids){const invalid=structuredClone(core);invalid.concepts[0].evidence.referenceCreativeIds=[id];assert.throws(()=>director.finalizeOutput(invalid,input),e=>e.message.includes('Unknown selected creative reference '+id)&&e.message.includes('Allowed evidence.referenceCreativeIds: []')&&e.message.includes('requiredAssets'));}
 const unknown=structuredClone(core);unknown.concepts[0].evidence.referenceCreativeIds=['invented-image'];assert.throws(()=>director.finalizeOutput(unknown,input),/absent from the supplied inventory/);
});
test('knowledge applications must cite loaded director principles; context schema leaves handoff to producer',()=>{
 const input=inputExample(),core=coreExample(input);core.concepts[0].knowledgeApplications[0].principleId='invented-framework';assert.throws(()=>director.finalizeOutput(core,input),/Unknown director principle/);
 assert.ok(!director.coreOutputSchema.required.includes('handoff'));assert.ok(director.outputSchema.required.includes('handoff'));assert.ok(director.assembleContext(input).messages[0].content.includes('MODEL CORE OUTPUT SCHEMA'));
});
