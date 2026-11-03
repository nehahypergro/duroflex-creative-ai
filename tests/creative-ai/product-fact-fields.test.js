'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseProduct}=require('../../lib/creative-ai/runtime/product-library');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': imported specifications preserve units, full service conditions, conflicts and selected variant',()=>{
 const html='<main><h1>Fixture mattress</h1><table><tr><th>Warranty duration</th><td>10 years, only for manufacturing defects</td></tr><tr><th>Warranty duration</th><td>5 years, excluding accidental damage</td></tr></table><dl><dt>Dimensions</dt><dd>78 × 60 × 8 inches</dd></dl><section><h2>Care instructions</h2><p>Spot clean only; do not soak or machine wash.</p></section></main>';
 const p=parseProduct(html,'https://example.com/products/fixture',{title:'Fixture mattress',options:[{name:'Length × width (inches)'},{name:'Thickness (inches)'}],variants:[{id:'queen',sku:'Q',title:'Queen',options:['78 × 60','8']},{id:'king',sku:'K',title:'King',options:['78 × 72','8']}]});
 assert.ok(p.specificationFields?.some(f=>f.label==='Dimensions'&&f.value==='78 × 60 × 8 inches'));
 const facts=require('../../lib/creative-ai/runtime/product-fact-fields').build({...p,brandId:brand,id:'product-test',pageUrl:'https://example.com/products/fixture',pageHash:'a'.repeat(64),snapshot:'saved'});
 assert.equal(facts.entries.filter(e=>e.label==='Warranty duration').every(e=>e.status==='conflicting'),true);assert.ok(facts.entries.some(e=>e.value.includes('do not soak')));
 const scoped=require('../../lib/creative-ai/runtime/product-fact-fields').forVariant(facts,'queen');assert.ok(scoped.entries.some(e=>e.variantId==='queen'&&e.label.includes('inches')));assert.equal(scoped.entries.some(e=>e.variantId==='king'),false);assert.ok(scoped.missing.includes('certification'));
 for(const e of scoped.entries){assert.equal(e.source.brandId,brand);assert.equal(e.source.pageHash,'a'.repeat(64));}
});
test('unlabelled numeric options remain unlabelled and do not acquire invented units',()=>{
 const fields=require('../../lib/creative-ai/runtime/product-fact-fields'),facts=fields.build({brandId:'Sleepyhead',pageUrl:'https://example.com/products/test',pageHash:'b'.repeat(64),variants:[{id:'v',attributes:[{name:'Option 1',value:'78 x 60'}]}]});
 assert.equal(facts.entries[0].value,'78 x 60');assert.equal(facts.entries[0].category,'other');assert.ok(facts.missing.includes('dimensions'));assert.equal(fields.forVariant(facts,'unknown').entries.length,0);
});
