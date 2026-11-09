'use strict';
// Asset picker drafts through the real readiness path, with saved research replay and
// no provider calls: message type reaches the request brief, coming-soon cards block.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('path');
const M=require('../../public/creative-ai/studio-model');
const root=path.resolve(__dirname,'../..');
let policyRoot;
test.before(async()=>{const fs=require('node:fs/promises'),od=require('../../lib/creative-ai/runtime/original-delivery'),prepare=od.prepare;policyRoot=await fs.mkdtemp(path.join(require('node:os').tmpdir(),'studio-picker-policy-'));await fs.writeFile(path.join(policyRoot,'workspace.json'),JSON.stringify({artworkDelivery:'original',artworkWorkflow:'lean-v1'}));test.mock.method(od,'prepare',(_root,intake)=>prepare(policyRoot,intake));});
test.after(async()=>{test.mock.restoreAll();if(policyRoot)await require('node:fs/promises').rm(policyRoot,{recursive:true,force:true});});
const cases=[['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','product-3566a343eb36f945fd10'],['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','product-985736dbde7586ad61c7']];
async function fixture(c,cards){const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');const runtime=new CreativeRuntime({root,provider:{reason(){assert.fail('No paid call');},generate(){assert.fail('No paid call');}}});await require('./helpers/pinned-research-fixture').pin(runtime,c[0]);const p=await runtime.brands.products.read(...c),d=M.startAssetDraft(c[0],cards);Object.assign(d,{name:'Picker readiness',brief:'Show everyday comfort. No price or offer.',audience:'Families',productId:p.id,variant:p.variants[0].id});return {runtime,d,p};}
test('picker drafts prepare through existing profiles; message type reaches the brief; soon cards stay planning-only',{timeout:120000},async()=>{
 const g=require('../../lib/creative-ai/runtime/studio-generation');
 for(const c of cases){
  const {runtime,d}=await fixture(c,['facebook-post']);M.applyMessageType(d,'Product launch');
  const a=await g.prepare(runtime,d);assert.match(a.request.brief,/Message type: Product launch/);assert.match(a.request.brief,/Facebook/);
  assert.deepEqual(require('../../lib/creative-ai/runtime/placements').resolve(a.request).selections[0].description.dimensions,{width:1080,height:1080,ratio:1});
  const legacy=(await fixture(c,['facebook-post'])).d;const b=await g.prepare(runtime,legacy);assert.doesNotMatch(b.request.brief,/Message type/);
  const soon=(await fixture(c,['hiring-post'])).d;await assert.rejects(()=>g.prepare(runtime,soon),/connected static recipe/);
  const campaign=(await fixture(c,['instagram-story','hiring-post'])).d;campaign.intakeVersion=2;campaign.selectedRtbs=[];campaign.rtbs='Soft, supportive comfort';M.confirmRequirements(campaign);
  const prepared=await g.prepare(runtime,campaign);
  assert.deepEqual(prepared.request.campaignChildren.map(x=>x.name),['Instagram Story']);assert.deepEqual(prepared.blocked.map(x=>x.name),['Hiring Post']);
  const story=prepared.request.campaignChildren[0].prepared.request;assert.equal(story.placementPublishing[story.placementIds[0]].publishing,'organic');
 }
});
