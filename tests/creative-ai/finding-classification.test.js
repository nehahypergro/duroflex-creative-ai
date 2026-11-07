'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../../lib/creative-ai/runtime/finding-classification');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': evidence, requirement and scope distinguish defects from uncertainty',()=>{
 const scope={brandId:brand,placementId:'story',component:'readability'};
 assert.equal(policy.classify({status:'fail',criterion:'readability',evidence:'Small text'},scope).category,'verification');
 assert.equal(policy.classify({status:'fail',requirement:'Required copy must be readable',evidence:'CTA strokes merge at its display size'},scope).category,'blocker');
 assert.equal(policy.classify({status:'unknown',requirement:'Correct SKU',evidence:'Reference unavailable'},scope).category,'verification');
 const suggestion=policy.classify({severity:'advisory',requirement:'Spacing',evidence:'Prefer more whitespace'},scope);
 assert.equal(suggestion.category,'suggestion');assert.equal(suggestion.scope.placementId,'story');
});
test('publishing targets are advice; unsupported proof and truly missing fields still reject',()=>{
 const copy=require('../../lib/creative-ai/runtime/publishing-copy');
 const deck={note:'Advice',fields:copy.profiles.instagram.fields.map(([id])=>({id,text:id==='caption'?'a'.repeat(650):id==='hashtags'?'':'Description',proofFactIds:[]}))};
 assert.doesNotThrow(()=>copy.validateFields(deck,'instagram',[]));
 assert.ok(copy.writingSuggestions(deck,'instagram').some(f=>f.category==='suggestion'));
 assert.throws(()=>copy.validateFields({...deck,fields:deck.fields.slice(1)},'instagram',[]));
});
test('publishing suggestions do not become factual failures; unsupported blocker needs verification',()=>{
 const p=require('../../lib/creative-ai/runtime/publishing-copy'),fields=[{id:'caption'}];
 const make=(category,requirement='',evidence='')=>({passed:category==='suggestion',summary:'Review',issues:[{fieldId:'caption',note:'Check',category,requirement,evidence}]});
 assert.equal(p.classifiedReview(make('suggestion'),fields).status,'checked');
 assert.equal(p.classifiedReview(make('blocker'),fields).status,'verification-needed');
 assert.equal(p.classifiedReview(make('blocker','supported-claims','Caption promises a warranty absent from approved facts'),fields).status,'needs-attention');
});
test('Studio presents finding categories and placement scope without policy metadata',()=>{
 const M=require('../../public/creative-ai/studio-model');
 const findings=[{category:'suggestion',criterion:'spacing',requirement:'Internal preference',evidence:'More space could help',scope:{placementId:'one'}},{category:'verification',criterion:'product-identity',requirement:'Correct SKU',evidence:'Reference unavailable',scope:{placementId:'two'}}];
 const result=M.reviewSummary({review:{policy:{version:2,status:'legacy'},classifiedFindings:findings}});
 assert.equal(result.concerns[0].category,'suggestion');assert.equal(result.concerns[1].category,'verification');assert.equal(result.concerns[1].scope.placementId,'two');assert.equal(JSON.stringify(result.concerns).includes('legacy'),false);
});
test('an editorial note cannot stand in for concrete blocker evidence',()=>{
 const p=require('../../lib/creative-ai/runtime/publishing-copy');
 const review={passed:false,summary:'Review',issues:[{fieldId:'caption',note:'Please improve the claim',category:'blocker',requirement:'supported-claims',evidence:''}]};
 assert.equal(p.classifiedReview(review,[{id:'caption'}]).status,'verification-needed');
});
