'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../../lib/creative-ai/runtime/website-certification-approval');
const {factStatus}=require('../../lib/creative-ai/runtime/product-research');
const approval={version:2,brandId:'brand-fixture',officialHost:'www.duroflexworld.com',status:'client-approved',scope:'explicit-product-website-statements',approvedAt:'2026-10-24T00:00:00Z',basis:'Client accepts its selected official website as final source for product statements.',independentVerification:false};
const intake={brandId:approval.brandId,brandUrl:'https://www.duroflexworld.com'};
function example(text){return {fact:{text,status:'supported',sourceId:'official',passageId:'p'},context:{approval,intake,sourceUrl:'https://www.duroflexworld.com/products/exact-sku',passage:{id:'p',sourceId:'official',text}}};}
test('approved official website statements do not need an independent proof step across claim families',()=>{
 for(const text of ['Warranty guarantees coverage for manufacturing defects for 10 years under normal use.','Certified by Example Institute for this product category.','The official website describes this product as providing 3X support.','The page states the technology uses 50% natural latex.']){const {fact,context}=example(text);assert.equal(policy.matches(approval,intake,context.sourceUrl),true);assert.equal(factStatus(fact,context),'supported',text);}
 const guidance=policy.guidance(approval,intake,'https://www.duroflexworld.com/products/exact-sku');assert.match(guidance,/warranty/i);assert.match(guidance,/technical/i);assert.match(guidance,/independent/i);
});
test('source approval cannot invent wording, discard qualifiers, cross brand or replace output checks',()=>{
 const {fact,context}=example('Warranty guarantees coverage for 10 years under normal use.');
 for(const change of [{sourceUrl:'https://other.example/product'},{intake:{...intake,brandId:'sleepyhead'}},{passage:{...context.passage,text:'A mattress.'}},{approval:{...approval,status:'pending'}}])assert.equal(factStatus(fact,{...context,...change}),'unverified');
 assert.equal(factStatus({...fact,text:'Warranty guarantees unconditional lifetime coverage.'},context),'unverified');
 assert.equal(factStatus({...fact,status:'unverified'},context),'unverified');
 assert.match(policy.guidance(approval,intake,context.sourceUrl),/qualifiers/i);
});
test('new registry grants broad source acceptance separately to each brand, retaining the legacy approval contract',async()=>{
 const path=require('path'),root=path.resolve(__dirname,'../..');
 for(const brand of [{brandId:'brand-1923d633-e03e-44cc-84b2-bbfb5c152710',brandUrl:'https://www.duroflexworld.com/'},{brandId:'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de',brandUrl:'https://mysleepyhead.com/'}]){const pinned=await policy.load(root,brand);assert.equal(pinned.version,1);assert.equal(pinned.scope,'explicit-product-certifications');assert.equal(policy.broad(pinned),true);assert.equal(pinned.independentVerification,false);}
 const old={...approval,version:1,scope:'explicit-product-certifications'};
 const {fact,context}=example('Warranty guarantees 10 years under normal use.');assert.equal(factStatus(fact,{...context,approval:old}),'unverified');
});
