'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
test('feature checklist splits explicit boundaries, preserves qualifiers and expands old saved selections',()=>{
 const paragraph='Washable cover. Only wash at 30°C. Strong support. Soft surface.';
 const p={contentSections:[{heading:'Features',text:paragraph+'\n• 7.5 inch height\n• 10-year warranty (terms apply)'}]};
 assert.deepEqual(M.productRtbs(p),['Washable cover. Only wash at 30°C.','Strong support.','Soft surface.','7.5 inch height','10-year warranty (terms apply)']);
 const d={focus:'product',productId:'p',rtbProductId:'p',selectedRtbs:[p.contentSections[0].text]};
 assert.deepEqual(M.selectedProductRtbs(d,p),M.productRtbs(p));
 assert.deepEqual(M.selectedProductRtbs({...d,productId:'other'},p),[]);
 assert.doesNotMatch(M.intakeContext({...d,selectedRtbs:['invented']},p),/invented/);
});
test('product briefs require an emphasised feature; brand-only and legacy drafts do not',()=>{
 for(const brand of ['Duroflex','Sleepyhead']){
 const p={id:'p',brandId:brand,features:['Saved fact']},d=Object.assign(M.startDraft(brand,'quick',1),{intakeVersion:2,brief:'Create a product image',productId:'p',rtbProductId:'p',focus:'product'}),context={products:[p],purpose:'review'};
 assert.ok(M.validateBrief(d,context).selectedRtbs);
 assert.equal(M.validateBrief({...d,selectedRtbs:['Saved fact']},context).selectedRtbs,undefined);
 assert.ok(M.validateBrief({...d,selectedRtbs:['Unsupported']},context).selectedRtbs);
 assert.equal(M.validateBrief({...d,rtbs:'Supplied feature, subject to terms'},context).selectedRtbs,undefined);
 assert.equal(M.validateBrief({...d,focus:'brand'},context).selectedRtbs,undefined);
 assert.equal(M.validateBrief({...d,intakeVersion:1},context).selectedRtbs,undefined);
 assert.equal(M.validateBrief(d,{...context,purpose:'preview'}).selectedRtbs,undefined);
 const custom={...d,rtbOptions:['Not selected'],rtbs:'Selected with qualifier'};
 assert.deepEqual(M.suppliedRtbOptions(custom),['Not selected','Selected with qualifier']);
 assert.doesNotMatch(M.intakeContext(custom,p),/Not selected/);
 }
});
