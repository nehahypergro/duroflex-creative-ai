'use strict';
// Readiness tests replay saved research, independently of the live workspace's
// invalidation state. Only this test runtime's read/revision adapters are pinned;
// production manifests and research are never edited or marked current.
const assert=require('node:assert/strict');
const ids={
 'brand-1923d633-e03e-44cc-84b2-bbfb5c152710':'creative-d23cdaaa-c97d-432c-83f4-05d59dd11be1',
 'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de':'creative-a5835af7-6943-4fe6-b7ff-e7bcdf0cb1a7'
};
async function pin(runtime,brandId){
 const researchId=ids[brandId];assert.ok(researchId,'Known saved replay fixture');
 const research=await runtime.researchSessions.store.read(researchId);
 assert.equal(research.intake.brandId,brandId);assert.equal(research.status,'finished');
 const revision=research.intake.brandKnowledge?.revision||research.intake.brandContext?.revision;
 assert.ok(revision,'Saved research binds its original brand revision');
 const read=runtime.brands.read.bind(runtime.brands),revisionOf=runtime.brands.revision.bind(runtime.brands);
 runtime.brands.read=async id=>{const b=await read(id);return id===brandId?{...b,latestResearchId:researchId}:b;};
 runtime.brands.revision=b=>b.id===brandId?revision:revisionOf(b);
 return research;
}
module.exports={ids,pin};
