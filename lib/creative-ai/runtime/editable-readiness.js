'use strict';
const checks=['readability','copy-fit','logo','subject-occlusion','photograph'];
function assess(review,validation=[]){
 const s=review||{},requiredChecks=(s.briefDirectionPolicy?[...checks,'brief-direction']:checks).filter(c=>(s.reviewChecksVersion!==2||c!=='copy-fit')&&(s.approvedLogoOverlayVersion!==1||c!=='logo')),observations=s.observations||[],issues=[...(s.compositionChecks?.issues||[]),...validation].filter(x=>!/^Advisory: /.test(x)).filter(x=>!/: contrast over photograph sampled; detailed visual review remains required\.$/.test(x));
 const pendingIssues=issues.filter(x=>/Visual review unavailable|\(unknown\)|could not be measured|unavailable|unmeasured/i.test(x));
 const failed=observations.some(o=>o.status==='fail')||issues.length>pendingIssues.length||s.correctionError||(s.unresolvedOverlapIds||[]).length>0;
 if(failed)return {ready:false,qualityVerified:false,status:'changes-needed',userNote:'Changes needed. See the specific findings.'};
 const complete=s.status==='complete'&&!!s.compositionChecks&&observations.length===requiredChecks.length&&requiredChecks.every(c=>observations.filter(o=>o.check===c&&o.status==='pass').length===1)&&!s.error&&!s.correctionApplied&&!pendingIssues.length;
 return complete?{ready:true,qualityVerified:true,status:'ready',userNote:'Automated checks passed. Ready to use.'}:{ready:false,qualityVerified:false,status:'verification-pending',userNote:'Verification pending. Saved images remain available.'};
}
function project(result){if(!result.editable||!result.imageUrl||result.status!=='editable-needs-review'||(result.versionId&&result.versionId!=='original'))return result;const readiness=assess(result.editableReview,result.validation||[]);return {...result,...readiness,editableReview:{...result.editableReview,requiresManualReview:!readiness.ready,note:readiness.userNote},readinessBasis:'automated-checks',historicalStatus:result.status};}
module.exports={assess,project};
