'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
const image=(id='one')=>({route:'continuity',placementId:id,imageUrl:'/creative-ai/api/jobs/job/files/'+id+'.png',ready:false,qualityVerified:false});
test('Studio exposes four stages and keeps image review evidence separate from availability',()=>{
 for(const brandId of ['duroflex','sleepyhead']){
  const samples=[ [{local:true,status:'draft'},'Draft'],[{local:true,status:'preview'},'Draft'],[{loadError:'offline'},'Needs attention'],[{status:'running',activeStages:['review']},'Creating'],[{status:'finished',results:[image()]},'Ready'],[{status:'finished',results:[{...image(),latestEdit:{revision:1}}]},'Ready'],[{status:'finished',placements:[{id:'one',pdp:{index:1,count:1}}],pdpPacks:[{ready:false}],results:[image()]},'Ready'],[{status:'finished',placements:[{id:'one'},{id:'two'}],results:[image()]},'Needs attention'],[{status:'failed',results:[image()]},'Needs attention'],[{status:'finished',results:[]},'Needs attention'] ];
  for(const [p,label] of samples){p.brandId=brandId;const before=JSON.stringify(p);assert.equal(M.status(p).label,label);assert.equal(JSON.stringify(p),before);}
 }
});
test('Creating uses secondary stage labels; terminal review warnings do not add a fifth stage',()=>{
 for(const [active,substage] of [['strategy','Planning'],['generation','Generating images'],['review','Checking images']]){const p={status:'running',activeStages:[active]},v=M.jobProgress(p);assert.equal(v.label,'Creating');assert.equal(v.substage,substage);assert.deepEqual(v.steps.map(x=>x.label),['Draft','Creating','Ready']);}
 assert.equal(M.jobProgress({status:'finished',results:[image()]}).label,'Ready');
 assert.equal(M.jobProgress({status:'partial',results:[image()]}).label,'Needs attention');
});
