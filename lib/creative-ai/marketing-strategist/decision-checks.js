'use strict';
// These checks establish contract consistency and provenance, not customer truth or persuasion.
const {isDeepStrictEqual:same}=require('node:util');
function validateDecisionChecks(output,input,{facts,statement,checkFacts,errors,sources}){
 const audit=output.strategyChecks;
 if(!audit)return;
 for(const key of ['productFocus','customerBarrier','customerRelevance'])statement(audit[key],'strategyChecks.'+key);
 statement(audit.destination.expectedAction,'strategyChecks.destination.expectedAction');
 checkFacts(audit.proofFactIds,'strategyChecks.proofFactIds');checkFacts(audit.destination.factIds,'strategyChecks.destination.factIds');
 for(const id of new Set([...audit.proofFactIds,...audit.destination.factIds])){const fact=facts.get(id);if(fact)statement({basis:'evidence',factIds:[id],sourceIds:fact.sourceIds},'strategyChecks proof '+id);}
 for(const key of ['customerBarrier','customerRelevance'])if(audit[key].basis==='evidence'&&!audit[key].factIds.some(id=>['customer','campaign'].includes(facts.get(id)?.kind)))errors.push('strategyChecks.'+key+': measured customer reasoning needs eligible customer/campaign facts');
 const focusKind=input.assignment.focusType==='brand'?'brand':'product';
 if(output.status==='ready'&&!audit.productFocus.factIds.some(id=>facts.get(id)?.kind===focusKind))errors.push('strategyChecks.productFocus: ready strategy needs a supported '+focusKind+' fact');
 if(output.status==='ready'&&audit.messageRole==='deferred')errors.push('Ready strategy cannot defer its message');
 if(!same(audit.destination.expectedAction,output.brief.desiredAction))errors.push('Destination expected action must preserve the selected brief desired action');
 if(input.assignment.desiredAction&&output.brief.desiredAction.text!==input.assignment.desiredAction)errors.push('Preserve the explicitly assigned desired action in the brief before assessing destination fit');
 const selected=output.alternatives.find(a=>a.id===output.selection.directionId),needed=new Set([...output.brief.primaryProposition.factIds,...output.brief.supportingClaims.map(c=>c.factId),...(selected?.proofFactIds||[])]);
 for(const id of needed)if(!audit.proofFactIds.includes(id))errors.push('strategyChecks.proofFactIds: missing selected message/claim proof '+id);
 if(output.status==='ready'&&!audit.proofFactIds.length)errors.push('Ready message needs eligible product/brand proof, even when customer relevance is a hypothesis'+(input.assignment.focusType==='brand'?'. For a brand greeting, cite applicable eligible brand identity/positioning facts in strategyChecks.proofFactIds and the selected alternative proofFactIds. These support sender identity/brand fit only; proofLimits must not present them as proof of the sentiment, efficacy or audience response.':''));
 if(audit.destination.url){let url;try{url=new URL(audit.destination.url);}catch{errors.push('Invalid strategy destination URL');}if(url&&!['http:','https:'].includes(url.protocol))errors.push('Strategy destination must be a web URL');if(input.assignment.landingPageUrl&&audit.destination.url!==input.assignment.landingPageUrl)errors.push('Strategy must preserve the assigned landing page URL');}
 else if(input.assignment.landingPageUrl)errors.push('Strategy must retain the assigned landing page URL, with an honest verification status');
 if(audit.destination.status==='verified'){
  if(!audit.destination.url||!audit.destination.factIds.some(id=>facts.get(id)?.kind==='destination'))errors.push('Verified destination needs a URL and eligible destination facts');
  if(audit.destination.fit!=='supported')errors.push('Verified destination must have supported action alignment');
  const canonical=value=>{try{return new URL(value).href;}catch{return null;}};
  const target=canonical(audit.destination.url);
  if(!target||!audit.destination.factIds.some(id=>facts.get(id)?.kind==='destination'&&facts.get(id).sourceIds.some(sourceId=>canonical(sources.get(sourceId)?.reference)===target)))errors.push('Verified destination proof must refer to the actual selected page, not a different page on the site');
 }
 if(audit.destination.fit==='supported'&&!audit.destination.factIds.some(id=>facts.get(id)?.kind==='destination'))errors.push('Supported destination fit needs eligible destination facts');
 if(output.status==='ready'&&audit.destination.fit==='blocked')errors.push('Blocked destination requires targeted research instead of ready strategy');
 const customerHypothesis=['audience','buyingSituation','communicationProblem'].some(key=>output.brief[key].basis!=='evidence')||['customerBarrier','customerRelevance'].some(key=>audit[key].basis!=='evidence');
 if(customerHypothesis&&!output.uncertainties.length)errors.push('Creative customer assumptions must remain disclosed; customer research is not required');
 if(audit.destination.status!=='verified'){
  if(!output.uncertainties.length||!audit.evidenceNeeded.length||!output.researchRequests.length)errors.push('Unverified customer/destination reasoning must disclose uncertainty, evidence needed and a targeted research request');
 }
 // Narrow tripwires for observed failures. They deliberately do not pretend to classify every proposition.
 const formatOnly=/^(?:(?:a|the|this|our)\s+)?(?:(?:small|compact|large|digital|static|consideration|awareness|[0-9]+\s*[×x]\s*[0-9]+)\s+)*(?:ad\b|advertisement\b|banner\b|placement\b|format\b|creative\s+unit\b)/i;
 for(const [label,text] of [['brief.buyingSituation',output.brief.buyingSituation.text],['getWhoToBy.who',output.getWhoToBy.who.text]])if(formatOnly.test(text))errors.push(label+': describe a customer situation, not the ad format');
 const executionOnly=/^(?:keep|preserve|use|place|render|design|create|make)\b.{0,180}\b(?:logo|branding|brand recognizable|brand recognisable|headline|CTA|layout|typography|font|color palette|colour palette)\b/i;
 for(const [label,text] of [['brief.primaryProposition',output.brief.primaryProposition.text],['getWhoToBy.by',output.getWhoToBy.by.text]])if(executionOnly.test(text))errors.push(label+': state the customer-facing proposition; execution instructions belong in channel/design guidance');
}
module.exports={validateDecisionChecks};
