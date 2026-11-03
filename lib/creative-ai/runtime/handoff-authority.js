'use strict';
// Derived labels for each handoff; no second model classification or prose summary.
// Existing source/claim validators remain responsible for eligibility.
const instructions='HANDOFF AUTHORITY: required means explicit brief direction or an already pinned mandatory rule; sourced means supplied evidence with its original status and qualifiers, never independent proof; proposed means a working creative choice, never a permanent brand rule; unknown means unresolved, never permission to invent. The brief dictates targeting and desired action. Creative director chooses people, setting, lighting and treatment unless an explicit required rule constrains them. Absence of people in references does not prohibit people. Code owns identity/variant, dimensions, IDs, hashes, bindings and destination URLs. Copywriter owns wording until locked; downstream roles cannot rewrite it. Reviewer supplies observations; code computes exact-copy verdicts. These labels do not upgrade draft guidance or unverified claims.';
const dependencyInstructions=' ASSIGNMENT RELEVANCE: unknown is not automatically a blocker. Ask for clarification only when the chosen execution needs the missing information and no supplied approved evidence or permitted creative decision resolves it. Unused background brand proposals remain unresolved research notes, not additional approval tasks. assignmentDependencies describe exclusions of those proposals only: they never authorize deleting, renaming or questioning authentic physical product markings, or discarding approved exact-SKU website references. Different visible labels in different locations or views do not alone prove conflicting product identity; identify an actual incompatible depiction before blocking. Keep campaign naming and draft identity adoption separate from existing product labels. Apply the pinned source approval already supplied; do not ask the user to reapprove it or confirm freshness when saved-snapshot reuse is permitted. Missing required SKU/variant facts, offer terms, claim qualifiers, actual identity conflicts and missing rendering capability remain real dependencies. Preserve output checks and the source-reuse contract; relevance does not establish a rendered pass.';
function compile(input){
 const records=[],seen=new Set();
 const assignmentDependencies=[],excluded=new Set();
 function scopes(v,path=[]){if(!v||typeof v!=='object')return;for(const [key,value]of Object.entries(v)){
  if(['imageData','locator','assets','sharedText','messages','handoffAuthority'].includes(key))continue;
  if(key==='unusedBrandFacts'&&Array.isArray(value))for(const d of value){if(!d.factId||!d.reason||!d.avoidance)continue;excluded.add(d.factId);assignmentDependencies.push({path:[...path,key].join('.'),factId:d.factId,reason:d.reason,avoidance:d.avoidance,scope:'background-proposal-only',mayAlterProductMarkings:false});}
  else if(value&&typeof value==='object')scopes(value,[...path,key]);
 }}scopes(input);
 const add=(path,authority,owner,extra={})=>{const key=path+'|'+authority;if(!seen.has(key)){seen.add(key);records.push({path,authority,owner,...extra});}};
 function walk(v,path=[]){
  if(!v||typeof v!=='object')return;
  for(const [key,value]of Object.entries(v)){
   if(['imageData','locator','assets','sharedText','messages'].includes(key))continue;
   const at=[...path,key];
   if(key==='assignment'&&value?.goal){for(const field of ['brief','goal','audience','buyingSituation','desiredAction','objective'])if(value[field])add([...at,field].join('.'),'required','brief');}
   if(key==='requirements'&&path.at(-1)==='guardian'&&Array.isArray(value))for(const r of value)add(at.join('.')+'['+r.id+']','required','pinned-rule');
   if(['facts','nonProofContext','preferences','assumptions'].includes(key)&&Array.isArray(value))for(const r of value){if(!r?.id)continue;const fact=['facts','nonProofContext'].includes(key);add(at.join('.')+'['+r.id+']',fact?(r.status==='supported'&&r.sourceIds?.length?'sourced':'unknown'):'proposed',fact?'source':'creative',fact&&r.kind==='brand'&&r.status!=='supported'&&excluded.has(r.id)?{relevance:'not-used-in-this-assignment',blocksAssignment:false}:{});}
   if(value&&typeof value==='object')walk(value,at);
  }
 }
 walk(input);return {version:2,records,assignmentDependencies};
}
module.exports={compile,instructions:instructions+dependencyInstructions};
