'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const reviewer=require('../../lib/creative-ai/creative-reviewer'),routing=require('../../lib/creative-ai/creative-reviewer/routing'),fixture=require('../../lib/creative-ai/creative-reviewer/examples/synthetic');
for(const profile of ['general','pdp'])for(const floor of [.6,.9])for(const explicit of [false,true])test(profile+' explicit='+explicit+': scoring and routing share the selected confidence floor '+floor,async()=>{
 const ctx=await reviewer.assembleContext(await fixture.inputExample({score:95})),input=ctx.input;
 if(explicit)input.package.blockingPolicyVersion=1;
 if(profile==='pdp')input.package.placementContext.selection.pin.profileId='custom:studio-commerce-gallery';
 const selected=require('../../lib/creative-ai/creative-reviewer/'+(profile==='pdp'?'policy-pdp-v1.json':'policy-v2.json')),old=selected.minimumEvidenceConfidence;
 selected.minimumEvidenceConfidence=floor;
 try{
  for(const confidence of [floor-.01,floor,floor+.01]){
   input.evidence.findings=[fixture.findingExample(input.package,{confidence})];
   const report=reviewer.evaluate(ctx);assert.equal(report.policy.minimumEvidenceConfidence,floor);
   assert.equal(report.routing[0].status,confidence<floor?'focused-diagnostic-required':'targeted-correction');
   assert.equal(report.decision,confidence<floor?'unable-to-verify':'revise');
  }
 }finally{selected.minimumEvidenceConfidence=old;}
});
test('routing requires an explicit valid policy instead of silently falling back to legacy rules',()=>{
 const f=fixture.findingExample({packageHash:'fixture'});
 for(const policy of [undefined,{}, {minimumEvidenceConfidence:NaN},{minimumEvidenceConfidence:-1},{minimumEvidenceConfidence:1.1}])assert.throws(()=>routing.routeFinding(f,policy),/confidence policy/i);
});
test('prerequisite checks use the saved report policy independently of current defaults',()=>{
 const f=fixture.findingExample({packageHash:'fixture'},{cause:'placement-spec-missing',confidence:.8});
 assert.equal(routing.unresolvedPrerequisites({policy:{minimumEvidenceConfidence:.9},findings:[f]}).length,0);
 assert.equal(routing.unresolvedPrerequisites({policy:{minimumEvidenceConfidence:.6},findings:[f]}).length,1);
 assert.throws(()=>routing.unresolvedPrerequisites({findings:[f]}),/confidence policy/i);
});
