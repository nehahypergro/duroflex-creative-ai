'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),P=require('../../lib/creative-ai/runtime/placement-logo-policy'),M=require('../../public/creative-ai/studio-model');
const selected=(id,extra={})=>({id:id.replace(/\W/g,'_'),description:{profileId:id,...extra},jobInputs:{}});
test('policy matrix resolves publishing context for both brands and keeps physical product marks',()=>{for(const brandId of ['Duroflex','Sleepyhead'])for(const [id,context,expected] of [['custom:studio-social-story',{publishing:'organic'},'omit'],['custom:studio-social-story',{publishing:'paid'},'include'],['custom:studio-web-hero',{brandedHost:true},'omit'],['custom:studio-web-hero',{brandedHost:false},'include'],['custom:studio-commerce-product',{},'omit'],['custom:studio-commerce-feature',{},'omit'],['custom:studio-linkedin-post',{},'include']]){const p=P.resolvePolicy({brandId,placementPublishing:{[id]:context}},selected(id));assert.equal(p.treatment,expected);assert.equal(p.preserveProductMarkings,true);}});
test('ambiguous Story/host context and explicit inclusion conflicts stop before paid work',()=>{assert.throws(()=>P.resolvePolicy({},selected('custom:studio-social-story')),/organic|paid/);assert.throws(()=>P.resolvePolicy({},selected('custom:studio-web-hero')),/branded/);assert.throws(()=>P.resolvePolicy({placementPublishing:{'custom:studio-social-story':{publishing:'organic'}},logoTreatmentByPlacement:{'custom:studio-social-story':'include'}},selected('custom:studio-social-story')),/conflict/i);});
test('carousel policy omits only middles and makes no square-ratio assumptions',()=>{for(let i=1;i<=3;i++)assert.equal(P.resolvePolicy({},selected('slide-'+i,{formatId:'custom:studio-carousel-square',carousel:{index:i,count:3}})).treatment,i===2?'omit':'include');assert.equal(P.resolvePolicy({},selected('custom:unknown',{dimensions:{width:1080,height:1920}})).treatment,'include');});
test('omission removes logo-only assets and reserved boxes, retaining a physical product reference',()=>{const d={logo:{assetIds:['logo'],treatment:'logo'},references:[{assetId:'logo',roles:['logo'],instruction:'brand'},{assetId:'product',roles:['product','logo'],instruction:'physical product'}],editableLayout:{boxes:[{role:'logo'},{role:'headline'}]}};P.applySpec(d,{treatment:'omit',version:1});assert.deepEqual(d.logo.assetIds,[]);assert.deepEqual(d.references.map(r=>r.assetId),['product']);assert.deepEqual(d.references[0].roles,['product']);assert.deepEqual(d.editableLayout.boxes,[{role:'headline'}]);});
test('LinkedIn is enabled only at the requested 1200 by 627 profile; Story publishing control is explicit',()=>{const d=M.startDraft('brand','quick',13);assert.equal(M.generationProfile(d)?.placementId,'custom:studio-linkedin-post');assert.equal(M.generationProfile({...d,outputs:[{...d.outputs[0],height:628}]}),null);assert.ok(M.staticRecipe(8).fields.some(f=>f[0]==='publishing'));});
test('new pinned contracts reach mandatory rendered review; saved jobs remain unchanged',()=>{
 const placements=require('../../lib/creative-ai/runtime/placements'),review=require('../../lib/creative-ai/runtime/rendered-placement-review');
 for(const brandId of ['duroflex','sleepyhead'])for(const publishing of ['organic','paid']){
  const intake={brandId,placementIds:['custom:studio-social-story'],placementPublishing:{'custom:studio-social-story':{publishing}}};
  assert.equal(placements.resolve(intake).selections[0].jobInputs.logoPolicy,undefined);
  const s=placements.resolve({...intake,placementLogoPolicyVersion:1}).selections[0];
  assert.equal(s.jobInputs.logoPolicy.treatment,publishing==='organic'?'omit':'include');
  const record={placementContext:{context:{placements:[s.expanded]}}},rules=review.rules(record),rule=rules.find(r=>r.id.endsWith('-client-logo-policy'));
  assert.ok(rule);assert.equal(review.status(rule,[],'runtime-attestation').status,'unknown');
  assert.equal(review.status(rule,[{ruleId:rule.id,status:'fail',confidence:.95,method:'vision-attestation',observation:'Logo violates the pinned treatment',location:'top-centre'}],'runtime-attestation').status,'fail');
 }
});
test('editable omitted placements do not synthesize a logo layer',()=>{
 const E=require('../../lib/creative-ai/runtime/editable');
 const d=E.layout({canvas:{width:1200,height:627},placementContext:{selection:{jobInputs:{logoPolicy:{version:1,treatment:'omit'}}}},exactCopy:{fields:[{id:'headline',text:'Hello',delivery:'embedded'}]},artDirection:{text:[]}}, {fonts:[{id:'font',weight:400}],logo:null},'brand','/photo','Product');
 assert.equal(d.objects.some(o=>o.role==='logo'),false);assert.equal(d.assets.length,1);
});
test('observed LinkedIn margin ambiguity has explicit final-canvas context without inventing publisher margins',()=>{
 const fs=require('fs'),path=require('path'),file=path.resolve(__dirname,'../../output/creative-ai/jobs/creative-7b1152d4-bbae-471c-9d42-f0a8bafbd50f/package-exploration-custom_studio-linkedin-post-0.json');
 const record=JSON.parse(fs.readFileSync(file));const c=P.reviewContext(record);
 assert.deepEqual(c.finalCanvasBounds,{left:0,top:0,right:1200,bottom:627});assert.equal(c.extraPublisherMarginSupplied,false);assert.match(c.instruction,/do not require/i);
 const explicit=structuredClone(record);explicit.lockedRules=[{id:'current-campaign-brief',text:'Keep all promotional copy and the complete logo inside x=80–1100 and y=50–570',sourceIds:['user-brief']}];
 assert.deepEqual(P.reviewContext(explicit).explicitBriefBounds,{left:80,top:50,right:1100,bottom:570});
});
