'use strict';
// Regression (19 Nov 2026, live QA): the product picker offers "Collection" and "Brand only" for every format, but most
// formats are made for one product and brand-only works only for A+ Brand Story, email, RCS, web push and in-store
// formats. The brief page accepted the choice and Check brief then failed with "Choose a connected static recipe and its
// exact supported dimensions…", or called it a planning brief with no reason. Check brief (and the brief page's inline
// create) now say plainly what to change, and such a brief can still be saved as a planning brief.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const M=require('../../public/creative-ai/studio-model.js');
const BRANDS=[{id:'brand-1923d633-e03e-44cc-84b2-bbfb5c152710',name:'Duroflex'},{id:'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de',name:'Sleepyhead'}];
const cards=M.assetCatalogue.filter(c=>c.status==='ready'&&!c.preset?.tool);
const draft=(brandId,card,focus)=>{const d=M.startAssetDraft(brandId,[card]);d.intakeVersion=2;d.name='QA';d.brief='QA brief';d.objective='Awareness';d.focus=focus;if(focus==='collection'){d.productIds=['p1'];d.collectionVariants={p1:''};}return d;};
const products=[{id:'p1',brandId:'',name:'Test mattress',variants:[]}];
for(const b of BRANDS){
 test(b.name+': a collection on a single-product format says what to change and stays a savable planning brief',()=>{
  let checked=0;
  for(const c of cards){const d=draft(b.id,c.id,'collection');const o=d.outputs[0];if(!M.generationProfile({...d,focus:'product',outputs:[o]}))continue;checked++;
   const errors=M.validateBrief(d,{products:products.map(p=>({...p,brandId:b.id})),purpose:'review'});
   assert.doesNotMatch(String(errors.productIds||''),/made for one product/,c.id+': not an error, so Save brief still works');
   assert.match(M.planningBriefNote(d),/made for one product at a time.*planning brief/,c.id);}
  assert.ok(checked>30,'most ready formats are single-product ('+checked+')');
 });
 test(b.name+': brand only explains the product need for product formats and is kept for brand-capable ones',()=>{
  const ig=draft(b.id,'instagram-post','brand');
  assert.match(M.planningBriefNote(ig),/needs a product.*planning brief/);
  assert.ok(M.planningBriefNote(ig,{short:true}).length<=80,'the short note fits the slim bar under the brief');assert.match(M.planningBriefNote(draft(b.id,'instagram-post','collection'),{short:true}),/one product.*planning brief/);
  assert.equal(M.validateBrief(ig,{products:[],purpose:'review'}).productName,undefined,'brand only is still savable');
  for(const id of ['email-banner','rcs-card','web-push','standee']){const d=draft(b.id,id,'brand');assert.equal(M.focusUnsupported(d,d.outputs[0]),'',id+' works for the brand alone');}
  const plan=draft(b.id,'instagram-post','product');plan.outputs[0].planningOnly=true;
  assert.equal(M.planningBriefNote(plan),'This selection is a planning brief. Image creation is not available for it yet.','other planning briefs keep their note');
 });
 test(b.name+': Check brief explains the problem instead of the recipe message',async()=>{
  const gen=require('../../lib/creative-ai/runtime/studio-generation');
  const d=draft(b.id,'instagram-post','collection');
  await assert.rejects(()=>gen.prepare({root:path.resolve(__dirname,'../..')},d),/made for one product at a time/);
 });
}
