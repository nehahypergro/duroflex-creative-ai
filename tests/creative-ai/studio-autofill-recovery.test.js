'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
const products=[{id:'octave',brandId:'d',name:'Octave 3 Seater Sofa'},{id:'cove1',brandId:'d',name:'Cove Simply Taupe Fabric 1 Seater Sofa'},{id:'cove3',brandId:'d',name:'Cove Grey Fabric 3 Seater Sofa + Lounger'},{id:'napster',brandId:'s',name:'Napster Mini Mattress',variants:[{id:'single'}]}];
test('actual reported brief recognises Story and asks which Cove without replacing manual Octave',()=>{
 const d=M.startDraft('d','quick',2);Object.assign(d,{intakeVersion:2,productId:'octave',brief:'A festive instagram story for sku sofa cove'});M.protectBriefField(d,'productId');M.applyBriefAutofill(d,{products});
 assert.equal(d.productId,'octave');assert.equal(d.occasion,'Festive');const understanding=M.briefUnderstanding(d,{products});assert.deepEqual(understanding.productIds,['cove1','cove3']);assert.equal(understanding.asset.featureId,8);assert.ok(d.briefAutofill.ambiguous.includes('productId'));
});
test('both brands recognise normal requests with text exclusions and preserve corrections',()=>{
 for(const [brand,product,phrase]of [['d','cove3','Cove 3 seater'],['s','napster','Napster Mini']]){const d=M.startDraft(brand,'quick',9);Object.assign(d,{intakeVersion:2,brief:'Make six Instagram carousel cards for '+phrase+' in Hindi without added text.'});M.applyBriefAutofill(d,{products});assert.equal(d.productId,product);assert.equal(d.language,'Hindi');assert.equal(d.wordingMode,'none');M.protectBriefField(d,'language');d.language='English';M.applyBriefAutofill(d,{products});assert.equal(d.language,'English');}
});
