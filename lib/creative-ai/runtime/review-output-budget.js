'use strict';
// Estimates for concise evidence, not measured tokens or hard limits on prose.
// Fixed-key wire groups retain every check; larger packages get more JSON room.
const perEntry={lockedRuleObservations:160,critical:360,quality:300,copyObservations:140,readabilityObservations:240,layoutMeasurements:200,placementObservations:240,productObservations:600,logoPresentation:220};
const reasoningReserve={none:0,minimal:1000,low:2500,medium:8000,high:16000,xhigh:24000};
function plan({schema,record,reasoningEffort,bounds}){
 const groups={};let evidenceTokens=2000; // Envelope and findings/comparisons.
 for(const [name,item]of Object.entries(schema.properties||{})){
  if(!Object.hasOwn(perEntry,name))continue;
  const ids=Object.keys(item.properties||{}),count=ids.length||item.minItems||0;
  groups[name]=count;
  evidenceTokens+=count*perEntry[name]+Math.ceil(Buffer.byteLength(JSON.stringify(ids),'utf8')/2);
 }
 // Copy transcription can be much longer than a typical observation. UTF-8
 // bytes deliberately overestimate English and allow for multilingual copy.
 const copyBytes=(record?.exactCopy?.fields||[]).filter(f=>f.delivery==='embedded'&&(f.locked||f.requirement==='mandatory')).reduce((n,f)=>n+Buffer.byteLength(f.text||'','utf8'),0);
 evidenceTokens+=Math.ceil(copyBytes/2);
 const reasoningHeadroomTokens=reasoningReserve[reasoningEffort]??24000;
 const requestedTokens=Math.max(bounds.initial,Math.ceil((evidenceTokens*1.2+reasoningHeadroomTokens)/1000)*1000);
 const initial=Math.min(requestedTokens,bounds.recovery);
 return {bounds:{...bounds,initial},metrics:{version:1,policy:'review-evidence-v1',basis:'Heuristic capacity estimate; reasoning and visible JSON share max_output_tokens. Provider usage is authoritative.',groups,copyBytes,estimatedEvidenceTokens:evidenceTokens,reasoningEffort,reasoningHeadroomTokens,requestedTokens,initialTokens:initial,recoveryCeiling:bounds.recovery,capped:initial<requestedTokens}};
}
module.exports={plan};
