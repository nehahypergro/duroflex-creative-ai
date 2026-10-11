'use strict';
// Scope every evidence pointer, including finding comparison references.
// Criterion names and object paths are not evidence IDs.
function scopeReferences(schema, ids) {
 const out=structuredClone(schema), allowed=[...new Set(ids)];
 function visit(s){if(!s||typeof s!=='object')return;for(const [key,value] of Object.entries(s.properties||{})){
  if(['sourceIds','ruleIds'].includes(key)&&value.items)value.items.enum=allowed;
  if(key==='referenceId')value.enum=allowed;
 }for(const value of Object.values(s))if(value&&typeof value==='object')visit(value);}
 visit(out);return out;
}
// Explicit brand requirements and publisher specifications have different
// authorities. A copy or legibility policy cannot become a locked brand rule.
function scopeFindingAuthority(schema, record) {
 const out=structuredClone(schema),finding=out.properties.findings.items;
 const locked=record.lockedRules.map(r=>r.id);
 const technical=(record.placementContext.context.placements[0]?.rules||[]).filter(r=>r.tier==='mandatory'&&['verified-primary','user-specified'].includes(r.evidenceStatus)).map(r=>r.id);
 const variants=[];
 for(const authority of ['explicit','verified-technical','policy','inferred']){
  const ids=authority==='explicit'?locked:authority==='verified-technical'?technical:null;
  if(ids&&!ids.length)continue;
  const variant=structuredClone(finding);variant.properties.authority.enum=[authority];
  if(ids){variant.properties.evidence.properties.ruleIds.items.enum=[...new Set(ids)];variant.properties.evidence.properties.ruleIds.minItems=1;}
  if(authority==='inferred')variant.properties.severity.enum=['advisory'];
  variants.push(variant);
 }
 out.properties.findings.items={anyOf:variants};return out;
}
module.exports={scopeReferences,scopeFindingAuthority};
