'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const M=require('../../lib/admin/analytics-metrics'),{summary}=require('../../lib/admin/requests'),{timing,unionMinutes}=require('../../lib/admin/analytics'),E=require('../../lib/admin/analytics-export');
const brands=[{id:'d',name:'Duroflex'},{id:'s',name:'Sleepyhead'}],now=Date.parse('2026-10-28T12:00:00Z');
function job(id,overrides={}){return {id,createdAt:'2026-10-27T06:00:00Z',updatedAt:'2026-10-27T06:20:00Z',status:'finished',intake:{brandId:'d',conceptRoutes:['continuity'],productName:'Airboost'},selection:[{id:'hero',description:{placement:'PDP'}}],results:[{route:'continuity',placementId:'hero',imageUrl:'/saved.png',ready:true,qualityVerified:true,reviewDecision:'ready',correctionCycles:0}],...overrides};}
function record(j){return {...summary(j,brands),sourceHash:'hash-'+j.id};}
function calc(jobs,options={}){return M.calculate({records:jobs.map(record),now,params:new URLSearchParams('from=2026-10-27&to=2026-10-28'),...options});}
test('both brands slice independently; duplicate image units and synthetic work cannot inflate output',()=>{
 const a=job('a');a.results.push({...a.results[0]});const b=job('b',{intake:{...a.intake,brandId:'s',productName:'Napster Mini'}});const c=job('synthetic',{synthetic:true});
 const all=calc([a,b,c]);assert.equal(all.metrics.requests,2);assert.equal(all.metrics.generated,2);assert.equal(all.coverage.syntheticExcluded,1);
 for(const brand of brands){const s=calc([a,b,c],{params:new URLSearchParams('brand='+brand.id)});assert.equal(s.metrics.requests,1);assert.equal(s.requests[0].brand,brand.name);}
});
test('extra images cannot substitute for a missing pack slot or missing option',()=>{
 const j=job('pack',{selection:[{id:'hero'},{id:'feature'}]});j.results.push({...j.results[0],placementId:'unrequested'});assert.equal(M.projectJob(j).complete,false);assert.equal(M.projectJob(j).completePassing,false);
 j.results[1].placementId='feature';assert.equal(M.projectJob(j).completePassing,true);delete j.intake.conceptRoutes;assert.equal(M.projectJob(j).requested,4);assert.equal(M.projectJob(j).complete,false);
});
test('fast failures and unfinished requests do not improve complete-set turnaround',()=>{
 const failed=job('failure',{status:'failed',updatedAt:'2026-10-27T06:01:00Z',results:[]}),slow=job('slow',{updatedAt:'2026-10-27T07:40:00Z'}),running=job('running',{status:'running'});
 const m=calc([job('done'),slow,failed,running]).metrics;assert.equal(m.medianMinutes,60);assert.equal(m.p90Minutes,92);assert.equal(m.durationSamples,2);assert.equal(m.attentionRate,1/3);assert.equal(m.zeroOutputTerminal,1);
});
test('automated pass denominator excludes unknown reviews; human approval is never inferred',()=>{
 const revise=job('revise',{results:[{route:'continuity',placementId:'hero',imageUrl:'/r',reviewDecision:'revise',correctionCycles:1}]}),unknown=job('unknown',{results:[{route:'continuity',placementId:'hero',imageUrl:'/u',reviewDecision:'unable-to-verify',ready:true,qualityVerified:false}]}),m=calc([job('pass'),revise,unknown]).metrics;
 assert.equal(m.autoPassRate,.5);assert.equal(m.reviewCoverage,2/3);assert.equal(m.unverified,1);assert.equal(m.humanApprovalRate,null);assert.equal(m.costPerHumanApproved,null);assert.equal(m.reworkRate,.5);
});
test('costs retain unknowns, deduplicate receipts and prefer actuals; failed work belongs in unit economics',()=>{
 const costs={generatedAt:'2026-10-28',entries:[{id:'a',sourceId:'pass',actualInr:80,estimatedInr:100},{id:'a',sourceId:'pass',actualInr:80},{id:'b',sourceId:'fail',estimatedInr:20},{id:'c',sourceId:'fail',actualInr:null,estimatedInr:null},{id:'d',sourceId:'unlinked',estimatedInr:900}]};
 const s=calc([job('pass'),job('fail',{status:'failed',results:[]})],{costSnapshot:costs});assert.equal(s.metrics.knownInr,100);assert.equal(s.metrics.estimatedInr,20);assert.equal(s.metrics.unknownCharges,1);assert.equal(s.metrics.knownCostPerAutoPassed,100);assert.equal(s.coverage.unattributedLedgerRecords,1);assert.equal(s.costEvidence.length,4);
 assert.equal(calc([job('missing')]).metrics.knownCostPerAutoPassed,null);assert.equal(calc([job('fail',{results:[]})],{costSnapshot:costs}).metrics.knownCostPerAutoPassed,null);
});
test('adoption counts authenticated people, not automation; same names do not merge users',()=>{
 const person=id=>({id,name:'Same name'});const s=calc([job('old',{createdAt:'2026-10-20T00:00:00Z',submittedBy:person('a')}),job('new1',{submittedBy:person('a')}),job('new2',{submittedBy:person('b')}),job('repeat',{createdAt:'2026-10-28T06:00:00Z',submittedBy:person('a')}),job('legacy')],{params:new URLSearchParams('from=2026-10-27&to=2026-10-28&groupBy=user')});
 assert.equal(s.adoption.activeCreators,2);assert.equal(s.adoption.returningCreators,1);assert.equal(s.adoption.repeatRate,.5);assert.equal(s.adoption.legacyRequests,1);assert.equal(s.breakdown.length,3);assert.equal(s.adoption.activeCreators30d,2);
});
test('India submission dates, empty denominators, invalid dates and equal-length comparisons are explicit',()=>{
 const s=calc([job('boundary',{createdAt:'2026-10-26T19:00:00Z'}),job('outside',{createdAt:'2026-10-26T18:00:00Z'}),job('bad',{createdAt:'not-a-date'})]);assert.equal(s.metrics.requests,1);assert.equal(s.coverage.invalidDateExcluded,1);
 assert.throws(()=>M.period(new URLSearchParams('from=2026-02-30'),now));assert.throws(()=>M.period(new URLSearchParams('from=2020-01-01'),now));const empty=calc([]);assert.equal(empty.metrics.autoPassRate,null);assert.equal(empty.metrics.medianMinutes,null);assert.equal(empty.adoption.repeatRate,null);assert.equal(empty.comparison.requestChange,null);
 assert.equal(empty.period.end-empty.period.start,Date.parse(empty.comparison.previousEnd)-Date.parse(empty.comparison.previousStart));
});
test('failure patterns deduplicate within a request, redact secrets and support exact drilldown',()=>{
 const j=job('fail',{status:'failed',results:[],error:'fetch failed token=secret123 Bearer otherSecret',unitErrors:[{error:'fetch failed'}]});const s=calc([j]);assert.equal(s.failurePatterns.length,1);assert.equal(s.failurePatterns[0].requests,1);assert.doesNotMatch(JSON.stringify(s),/secret123|otherSecret/);assert.equal(calc([j],{params:new URLSearchParams('reason=readability')}).metrics.requests,0);
});
test('stage elapsed time merges concurrent tasks; unreadable or mismatched history cannot become timing evidence',async()=>{
 assert.equal(unionMinutes([[0,120000],[60000,180000],[300000,360000]]),4);const root=await fs.mkdtemp(path.join(os.tmpdir(),'analytics-timing-'));try{const r=record(job('creative-timing')),dir=path.join(root,'output/creative-ai/activity',r._id);await fs.mkdir(dir,{recursive:true});const events=[['task.started',{taskId:'a',taskKind:'generation'},'06:01'],['task.started',{taskId:'b',taskKind:'generation'},'06:02'],['artifact.saved',{artifact:{kind:'image'}},'06:04'],['task.completed',{taskId:'a'},'06:04'],['task.completed',{taskId:'b'},'06:05']];for(const [i,[type,details,t]]of events.entries())await fs.writeFile(path.join(dir,String(i+1).padStart(8,'0')+'.json'),JSON.stringify({jobId:r._id,sequence:i+1,previousHash:i?'h'+i:'genesis',eventHash:'h'+(i+1),type,details,recordedAt:'2026-10-27T'+t+':00Z'}));const t=await timing(root,r);assert.equal(t.queueMinutes,1);assert.equal(t.firstImageMinutes,4);assert.equal(t.stageMinutes['Image creation'],4);assert.equal(t.complete,true);const mismatch=calc([job('creative-timing')],{timings:[{...t,sourceHash:'old'}]});assert.equal(mismatch.speed.timedRequests,0);await fs.writeFile(path.join(dir,'00000001.json'),'{}');await assert.rejects(timing(root,r),/mismatch/);}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('CSV cannot execute spreadsheet formulas; HTML escapes stored titles and carries metric definitions',()=>{
 assert.equal(E.csvCell('=HYPERLINK("evil")'),'"\'=HYPERLINK(""evil"")"');const s=calc([job('x',{intake:{brandId:'d',conceptRoutes:['continuity'],campaignName:'<script>alert(1)</script>',productName:'=1+2'}})]);s.snapshotId='snapshot';const csv=E.csv(s),html=E.html(s);assert.ok(csv.startsWith('\uFEFF'));assert.match(csv,/"'=1\+2"/);assert.match(html,/Metric definitions/);assert.doesNotMatch(html,/<script>/);assert.match(html,/not client approvals/);
});

test('explicit user-requested stops are separate from failures and no-output problems',()=>{const s=calc([job('ok'),job('stop',{status:'failed',results:[],error:'Stopped at user request: experiment changed. Saved work retained.'})]);assert.equal(s.metrics.terminal,2);assert.equal(s.metrics.evaluatedTerminal,1);assert.equal(s.metrics.stoppedByUser,1);assert.equal(s.metrics.failed,0);assert.equal(s.metrics.attentionRate,0);assert.equal(s.metrics.zeroOutputTerminal,0);assert.equal(s.failurePatterns.length,0);assert.equal(s.requests[1].status,'failed');});
test('Option 1 batch slice excludes unrelated historical work without pretending it is client adoption',()=>{const batch=job('batch');batch.intake.requestKey='static-option1-duroflex-example';const s=calc([batch,job('old')],{params:new URLSearchParams('run=option1')});assert.equal(s.metrics.requests,1);assert.equal(s.requests[0].id,'batch');assert.equal(s.adoption.activeCreators,0);});
test('login activity from an excluded synthetic account is not counted in the account funnel',()=>{const s=calc([],{users:[],logins:[{actorId:'synthetic',at:'2026-10-27T06:00:00Z'}]});assert.equal(s.adoption.signedInUsers,0);assert.equal(s.adoption.enabledAccounts,0);});
