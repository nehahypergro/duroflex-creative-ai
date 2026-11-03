'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
test('decimal aliases match literal model names, not regular-expression wildcards',()=>{
 const products=[{id:'numeric',brandId:'b',name:'6.8 Comfort Mattress'}];
 const d=M.startDraft('b','quick',9);d.intakeVersion=2;d.brief='Create a carousel for 6x8';
 M.applyBriefAutofill(d,{products});assert.equal(d.productId,'');
 d.brief='Create a carousel for 6.8';M.applyBriefAutofill(d,{products});assert.equal(d.productId,'numeric');
});
for(const brand of ['Duroflex','Sleepyhead']){
 const brandId='brand-'+brand.toLowerCase();
 // Synthetic names exercise the shared matcher without borrowing brand facts.
 const products=['6.8','6.9','7.8'].map(model=>({id:brandId+'-'+model,brandId,brandName:brand,name:'Example '+model+' Comfort Mattress'}));
 products.push({...products[0],id:'foreign',brandId:'other'});
 for(const document of [false,true])test(brand+': decimal model names disambiguate '+(document?'uploaded':'typed')+' briefs',()=>{
  const d=M.startDraft(brandId,'quick',9);d.intakeVersion=2;
  const text='Create a Hindi Instagram carousel with six cards for '+brand+' Example 6.8.';
  if(document)d.briefDocuments=[{id:'source',text}];else d.brief=text;
  M.applyBriefAutofill(d,{products});assert.equal(d.productId,products[0].id);assert.equal(d.language,'Hindi');assert.equal(d.outputs[0].slides,6);
  assert.ok(!d.briefAutofill.ambiguous.includes('productId'));
  assert.deepEqual(M.applyBriefAutofill(d,{products}),[]);
  const restored=JSON.parse(JSON.stringify(d));M.applyBriefAutofill(restored,{products});assert.equal(restored.productId,products[0].id);
  M.protectBriefField(restored,'productId');restored.productId=products[2].id;M.applyBriefAutofill(restored,{products});assert.equal(restored.productId,products[2].id);
  M.undoBriefAutofill(d,{products});assert.equal(d.productId,'');assert.deepEqual(M.applyBriefAutofill(d,{products}),[]);
 });
 test(brand+': incomplete, conflicting and negated model names do not guess',()=>{
  for(const text of ['Create a carousel for '+brand+' Example.','Create a carousel for '+brand+' Example 6.','Create a carousel for '+brand+' Example 6.8 and Example 6.9.','Avoid '+brand+' Example 6.8.']){
   const d=M.startDraft(brandId,'quick',9);d.intakeVersion=2;d.brief=text;M.applyBriefAutofill(d,{products});assert.equal(d.productId,'',text);
  }
 });
}
