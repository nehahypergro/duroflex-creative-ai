'use strict';
const reader=require('./readability');
// An editorial capacity is an allowance, not an instruction to add wording.
// Share the same decision between generation schema and post-response checks.
function contentPolicy(input,conceptId,placement){
 const policy=reader.pinnedPolicy(placement?.expanded?.rules||placement?.rules||[]);
 const slot=input.pdpPlan?.version>=2?input.pdpPlan.sets.find(s=>s.conceptId===conceptId)?.slots.find(s=>s.placementId===placement?.id):null;
 const cleanPhoto=!!(placement?.jobInputs?.formatIntent?.textPolicy==='none'||(slot&&require('./pdp').photoRoles.has(slot.role))||require('./pmax-images').clean(placement?.pin?.profileId));
 const profile=placement?.expanded?.profile||placement?.profile;
 // Custom Amazon slots carry an explicit image-module contract even when a
 // historical generic reading policy labelled them as a feature tile.
 const amazonImage=profile?.platform==='Amazon A+'&&profile.assetType==='static'&&profile.placement==='image-module';
 const optional=amazonImage||!!(policy&&reader.supportsVersion(policy.version)&&(policy.total===0||['aplus-image','email','rcs-image','push-image'].includes(policy.classId)));
 return {cleanPhoto,allowEmpty:cleanPhoto||optional};
}
module.exports={contentPolicy};
