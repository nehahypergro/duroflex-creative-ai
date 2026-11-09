'use strict';
// UX row 17 (8 Nov 2026): the review page showed a green "Ready" pill on a design whose saved
// lean review found a clear mismatch (creative-e5b7bb9f, Avalon Grande festive portrait post:
// ready:false, qualityVerified:false, visualReview.conclusion 'clear_mismatch'). The pill was the
// project stage, which only means images are available. M.designCheck labels one design.
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
const url='/creative-ai/api/jobs/job/files/a.png';
test('a design with a clear mismatch or unverified blocking item reads "Check before using"; only clean designs read Ready',()=>{
 const flagged={route:'continuity',placementId:'p',imageUrl:url,ready:false,qualityVerified:false,leanWorkflowVersion:1,leanConformanceVersion:1,visualReview:{status:'completed',conclusion:'clear_mismatch'}};
 const before=JSON.stringify(flagged);
 assert.deepEqual([M.designCheck(flagged).label,M.designCheck(flagged).tone],['Check before using','amber']);
 assert.match(M.designCheck(flagged).detail,/clear mismatch/);
 assert.equal(JSON.stringify(flagged),before,'display only: the saved result is not changed');
 // Pre-v1 lean record: unable_to_verify is not deliverable, so its unverified items still block.
 const unverified={...flagged,leanConformanceVersion:undefined,visualReview:{status:'completed',conclusion:'unable_to_verify'}};
 assert.equal(M.designCheck(unverified).label,'Check before using');assert.match(M.designCheck(unverified).detail,/did not confirm/);
 // Conformance v1: no concrete mismatch is deliverable (ready) but not qualityVerified.
 const deliverable={...flagged,ready:true,qualityVerified:false,visualReview:{status:'completed',conclusion:'unable_to_verify'}};
 assert.deepEqual([M.designCheck(deliverable).label,M.designCheck(deliverable).tone],['Ready','green']);assert.match(M.designCheck(deliverable).detail,/No blocking issue found/);
 const clean={...flagged,ready:true,qualityVerified:true,visualReview:{status:'completed',conclusion:'no_mismatch'}};
 assert.equal(M.designCheck(clean).label,'Ready');
 // Legacy results and edited designs.
 assert.equal(M.designCheck({imageUrl:url,ready:false}).label,'Check before using');
 assert.equal(M.designCheck({imageUrl:url,ready:true}).label,'Ready');
 assert.equal(M.designCheck({imageUrl:url}).label,'Check before using');
 assert.match(M.designCheck({...clean,latestEdit:{revision:2}}).detail,/edited after/);
 assert.equal(M.designCheck({...clean,imageUrl:'https://elsewhere.example/a.png'}),null);
 assert.equal(M.designCheck(null),null);
 // Superseded 9 Nov 2026 (live run, item 4): the project reads Ready only when every design is ready.
 assert.equal(M.status({status:'finished',results:[flagged]}).label,'Check before using · 1 of 1 flagged');
 assert.equal(M.status({status:'finished',results:[clean]}).label,'Ready');
});
