'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('strategy accepts an exact saved variant binding but rejects an unbound query variant',async()=>{
 const fixture=require('../../lib/creative-ai/marketing-strategist/examples/synthetic'),input=await fixture.inputExample(),output=fixture.outputExample({includeStrategyChecks:true}),base='https://www.duroflexworld.com/products/example',url=base+'?variant=123';
 input.assignment.landingPageUrl=url;output.strategyChecks.destination={...output.strategyChecks.destination,url,status:'verified',fit:'supported',factIds:['destination']};
 const facts=new Map([['destination',{kind:'destination',sourceIds:['page']}]]),sources=new Map([['page',{reference:base}]]),check=()=>{const errors=[];require('../../lib/creative-ai/marketing-strategist/decision-checks').validateDecisionChecks(output,input,{facts,sources,errors,statement:()=>{},checkFacts:()=>{}});return errors;};
 assert.ok(check().some(e=>e.includes('actual selected page')));
 const source=require('../../lib/creative-ai/runtime/sku-research').savedVariantDestination({requestedUrl:url,pageUrl:base,variants:[{id:'123',sku:'EXACT'}],collectedAt:'2026-10-13T00:00:00Z'},url,base);
 sources.set(source.id,source);facts.get('destination').sourceIds.push(source.id);assert.ok(!check().some(e=>e.includes('actual selected page')));
 output.strategyChecks.destination.url=base+'?variant=456';assert.ok(check().some(e=>e.includes('actual selected page')));
});
test('saved exact variant provides destination provenance without requiring a live refresh',()=>{
 const {savedVariantDestination}=require('../../lib/creative-ai/runtime/sku-research');
 for(const host of ['www.duroflexworld.com','mysleepyhead.com']){
  const base='https://'+host+'/products/example',requested=base+'?variant=123',profile={requestedUrl:requested,pageUrl:base,variants:[{id:'123',sku:'EXACT-SKU'}],collectedAt:'2026-10-13T00:00:00.000Z'};
  const source=savedVariantDestination(profile,requested,base);assert.equal(source.reference,requested);assert.match(source.note,/not.*live/i);assert.equal(source.collectedAt,profile.collectedAt);
  assert.equal(savedVariantDestination(profile,base+'?variant=999',base),null);
  assert.equal(savedVariantDestination({...profile,variants:[]},requested,base),null);
  assert.equal(savedVariantDestination(profile,requested,'https://foreign.example/products/example'),null);
  assert.equal(savedVariantDestination(profile,base+'?variant=123&offer=new',base),null);
 }
});
