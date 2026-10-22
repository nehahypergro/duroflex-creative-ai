'use strict';
// A campaign scope choice does not resolve or promote conflicted brand evidence.
function apply(input, choice) {
 if(choice.version!==1||typeof choice.text!=='string'||!choice.text.trim()||choice.text.length>2000||!Array.isArray(choice.nonEssentialFactIds)||!Number.isFinite(Date.parse(choice.createdAt)))throw Error('Invalid saved campaign clarification');
 const out=structuredClone(input),positioning=new Set(out.guardian.establishedPositioningFactIds);
 for(const id of choice.nonEssentialFactIds){
  const fact=out.facts.find(f=>f.id===id);
  if(!fact||fact.kind!=='brand'||fact.status!=='conflicted'||positioning.has(id))throw Error('Campaign clarification cannot waive required product or positioning evidence: '+id);
  fact.essential=false;
 }
 const sourceId='user-campaign-clarification';
 if(out.additionalSources.some(s=>s.id===sourceId))throw Error('Campaign clarification already applied');
 out.additionalSources.push({id:sourceId,kind:'user',label:'Explicit user clarification for this campaign only',reference:'user-supplied:campaign-clarification',status:'available',collectedAt:choice.createdAt});
 out.assignment.brief+='\nCampaign clarification: '+choice.text;
 out.assignment.goal+='\nCampaign clarification: '+choice.text;
 out.guardian.requirements.push({id:'campaign-clarification',text:choice.text,sourceIds:[sourceId]});
 return out;
}
function applyCampaign(input,intake={},savedChoice){
 const choice=savedChoice||intake.campaignClarification;
 return choice?apply(input,choice):input;
}
module.exports={apply,applyCampaign};
