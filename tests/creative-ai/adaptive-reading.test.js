'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),reader=require('../../lib/creative-ai/runtime/readability'),fit=require('../../lib/creative-ai/runtime/copy-fit'),reading=require('../../lib/creative-ai/runtime/reading-review'),placements=require('../../lib/creative-ai/runtime/placements');
test('ten variable content plans inspect every chosen embedded element, without a mandatory headline/body/CTA inventory',()=>{
 for(let i=0;i<10;i++){
  const selected=placements.resolve({brandUrl:'https://example.com',brief:'Synthetic adaptive layout',placementIds:['custom:studio-social-square']}).selections[0],fields=Array.from({length:i},(_,n)=>({id:'element-'+n,role:['other','supporting-copy','disclaimer','headline','product-name'][n%5],text:n%2?'A long source qualification retained exactly':'आराम',delivery:'embedded',requirement:n%3?'optional':'mandatory',locked:false})),deck={conceptId:'c',placementId:selected.id,fields},record={canvas:{width:1080,height:1080},exactCopy:{fields},placementContext:{context:{placements:[{profile:selected.expanded.profile,rules:selected.expanded.rules}]}}},view=reader.viewingContract(record);
  assert.equal(reading.enabled(record,view),i>0);assert.equal(reading.schema(record,view).minItems,i);
  const assessment=fit.assess(deck,selected);assert.deepEqual(assessment.contentPlan.map(x=>x.fieldId),fields.map(f=>f.id));assert.equal(assessment.measurementStatus,'requires-layout-and-rendered-review');
  if(i){const evidence={critical:[{criterion:'required-text-legibility',status:'pass',confidence:.9,evidence:{observation:'Fixture'}}]},observations=fields.map(f=>({fieldId:f.id,previewWidth:view.previewWidth,status:'readable',confidence:.9,observation:'Synthetic fixture'}));observations.at(-1).status='unreadable';reading.apply(record,evidence,observations,view);assert.equal(evidence.critical[0].status,'fail');assert.throws(()=>reading.apply(record,evidence,observations.slice(1),view),/every/);}
 }
});
test('a soft zero-body target prompts layout review; explicit legacy restrictions remain pinned',()=>{
 const selected=placements.resolve({brandUrl:'https://example.com',brief:'Synthetic',placementIds:['google-upload-mobile-banner-320']}).selections[0],deck={conceptId:'c',placementId:selected.id,fields:[{id:'qualifier',text:'Exact condition remains',delivery:'embedded',role:'body',requirement:'optional'}]};
 assert.doesNotThrow(()=>fit.validateOmissions({decks:[deck]},{placements:[selected]}));assert.equal(fit.assess(deck,selected).status,'needs-layout-review');
 const old=structuredClone(selected),policy=old.expanded.rules.find(r=>r.check.readingPolicy).check.readingPolicy;policy.version='2026-10-23.1';delete policy.adaptiveContent;
 assert.throws(()=>fit.validateOmissions({decks:[deck]},{placements:[old]}),/omits optional/);
});
