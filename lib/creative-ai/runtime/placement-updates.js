'use strict';
// Apply verified updates only to newly resolved catalogues; never rewrite saved pins.
function apply(catalog,ids){
 for(const [profileId,limit,sourceId] of [['google-demand-gen',30,'google-demand'],['google-pmax',15,'google-pmax']]){
  if(!ids.includes(profileId))continue;const p=catalog.profiles.find(p=>p.id===profileId),base=catalog.rules.find(r=>r.id===profileId+'-native-headlines');if(!p||!base)continue;
  const id=profileId+'-native-short-headline';if(p.ruleIds.includes(id))continue;
  const r={...structuredClone(base),id,version:'1.1.0',verifiedAt:'2026-10-09',versionDate:'2026-10-09',sourceIds:[sourceId],statement:'Include at least one native headline of '+limit+' characters or fewer'+(profileId==='google-demand-gen'?' for Display serving and complete Ad Strength.':'.'),check:{method:'native',field:'headlines',minShortItems:1,shortMaxChars:limit,countMethod:base.check.countMethod},rationale:'Current official headline-set requirement supplements the maximum/cardinality boundary. Native copy is outside the image.',limits:'Counting stays unknown for unimplemented publisher algorithms. Verify in the platform; this does not establish a complete responsive campaign.'};catalog.rules.push(r);p.ruleIds.push(id);
 }
 return require('../placement-knowledge').validateCatalog(catalog);
}
module.exports={apply};
