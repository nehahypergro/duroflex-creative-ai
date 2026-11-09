'use strict';
// Live runs, 9 Nov 2026. Display-only regressions; no saved job, review or cost record changes.
// #4  A project was labelled "Ready" while some designs failed their check (creative-aa4adc3f…: A+ page,
//     12 images: 6 ready, 4 clear mismatch, 2 with no completed check). "Ready" now needs every design ready.
// #10 Failed jobs showed "Product not selected" although the saved brief named the product
//     (creative-a04301ba…): the project view carries it in briefSummary, not intake.
// #11 The read-back badge said "Single design" for one A+ Premium output that makes 14 images.
// #12 "Could not refresh project status" appeared after every Studio restart: one failed /jobs
//     request (connection refused, 404/503 while restarting) showed the toast at once.
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
const brands=['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'];
const url=n=>'/creative-ai/api/jobs/job/files/static-lean-'+n+'.png';
const design=(n,kind)=>({route:'continuity',placementId:'page-'+n,imageUrl:url(n),leanWorkflowVersion:1,leanConformanceVersion:1,
 ...(kind==='ready'?{ready:true,qualityVerified:true,visualReview:{status:'completed',conclusion:'no_mismatch'}}:kind==='flagged'?{ready:false,qualityVerified:false,visualReview:{status:'completed',conclusion:'clear_mismatch'}}:{ready:false,qualityVerified:false})});
const aplus=(brandId,status='finished')=>{const kinds=[...Array(6).fill('ready'),...Array(4).fill('flagged'),...Array(2).fill('incomplete')];return {id:'job-'+brandId,brandId,status,placements:kinds.map((_,i)=>({id:'page-'+(i+1)})),results:kinds.map((k,i)=>design(i+1,k))};};

test('#4 a project reads Ready only when every saved design is ready; otherwise it counts the flagged ones (both brands)',()=>{
 for(const brandId of brands){
  const p=aplus(brandId),before=JSON.stringify(p),s=M.status(p);
  assert.equal(s.key,'check');assert.equal(s.tone,'amber');
  assert.equal(s.label,'Check before using · 6 of 12 flagged');
  assert.match(s.detail,/4 .*mismatch/);assert.match(s.detail,/2 .*not finish/);
  assert.equal(JSON.stringify(p),before,'display only');
  const clean={...p,results:p.results.map((r,i)=>design(i+1,'ready'))};
  assert.deepEqual([M.status(clean).key,M.status(clean).label,M.status(clean).tone],['ready','Ready','green']);
  // An edited version is "Not checked yet", so it is never counted as ready.
  const edited={...clean,results:clean.results.map((r,i)=>i?r:{...r,latestEdit:{revision:1}})};
  assert.equal(M.status(edited).label,'Check before using · 1 of 12 flagged');
  // Missing pages still need attention, now with counts.
  const partial={...p,status:'partial',placements:[...p.placements,{id:'page-13'},{id:'page-14'}]},a=M.status(partial);
  assert.equal(a.key,'attention');assert.equal(a.label,'Needs attention');assert.equal(a.counts,'12 of 14 images made · 6 flagged');
  // Progress treats a finished-but-flagged project as finished, without calling it Ready.
  const progress=M.jobProgress(p);assert.equal(progress.current,'ready');assert.equal(progress.label,'Check before using · 6 of 12 flagged');assert.equal(progress.running,false);
  assert.equal(progress.steps.find(x=>x.state==='current')?.id,'ready');
  assert.equal(M.projectStatusMatches(p,'ready'),false,'the Ready filter excludes flagged projects');
  assert.equal(M.projectStatusMatches(p,'check'),true);assert.equal(M.projectStatusMatches(clean,'ready'),true);assert.equal(M.projectStatusMatches(p,'all'),true);
 }
});

test('#10 the product name falls back to the saved brief summary on failed jobs',()=>{
 for(const brandId of brands){
  const failed={id:'creative-failed',brandId,status:'failed',results:[],briefSummary:{productName:'Posture Perfect Pocket Spring Orthopedic Mattress',productId:'product-dfb69ef80bb5fad29770'}};
  assert.equal(M.projectProductName(failed),'Posture Perfect Pocket Spring Orthopedic Mattress');
  assert.equal(M.projectProductId(failed),'product-dfb69ef80bb5fad29770');
  assert.equal(M.projectProductName({intake:{productName:'Intake name'},briefSummary:{productName:''}}),'Intake name');
  assert.equal(M.projectProductName({productSummary:{name:'Summary name'}}),'Summary name');
  assert.equal(M.projectProductName({}),'');
 }
});

test('#11 the read-back badge counts the images each output makes',()=>{
 for(const brandId of brands){
  const one=M.startDraft(brandId,'quick',6);M.applyAmazonPreset(one.outputs[0],M.aplusPresetName('premium'));
  assert.equal(M.outputsBadge(one),'A+ page · 14 images');
  assert.equal(M.outputsBadge(M.startDraft(brandId,'quick',1)),'Single design');
  const mix={...one,outputs:[...one.outputs,...M.startDraft(brandId,'quick',1).outputs,...M.startDraft(brandId,'quick',1).outputs]};
  assert.equal(M.outputsBadge(mix),'Campaign · 3 designs · 16 images');
  const two={...one,outputs:[...M.startDraft(brandId,'quick',1).outputs,...M.startDraft(brandId,'quick',1).outputs]};
  assert.equal(M.outputsBadge(two),'Campaign · 2 designs');
 }
});

test('#12 a failed status refresh retries quietly; the toast waits for repeated failures or a real error',()=>{
 const network=Object.assign(new TypeError('Failed to fetch'),{}),abort=Object.assign(Error('aborted'),{name:'AbortError'});
 for(const e of [network,abort,{status:404},{status:502},{status:503},{status:504},{status:429}]){
  const first=M.refreshFailurePlan(e,1);assert.equal(first.toast,false,'quiet on the first transient failure');assert.ok(first.retryMs>=1000&&first.retryMs<=10000);
  assert.equal(M.refreshFailurePlan(e,2).toast,false);assert.ok(M.refreshFailurePlan(e,2).retryMs>first.retryMs,'backs off');
  assert.equal(M.refreshFailurePlan(e,3).toast,true,'three failures in a row are reported');
 }
 for(const e of [{status:401},{status:403},{status:500},{status:400}])assert.equal(M.refreshFailurePlan(e,1).toast,true,'a real error is reported at once');
 assert.equal(M.refreshFailurePlan({status:500},1).retryMs,null);
});
