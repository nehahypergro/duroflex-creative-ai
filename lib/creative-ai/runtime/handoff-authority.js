'use strict';
// Derived labels for each handoff; no second model classification or prose summary.
// Existing source/claim validators remain responsible for eligibility.
const instructions='HANDOFF AUTHORITY: required means explicit brief direction or an already pinned mandatory rule; sourced means supplied evidence with its original status and qualifiers, never independent proof; proposed means a working creative choice, never a permanent brand rule; unknown means unresolved, never permission to invent. The brief dictates targeting and desired action. Creative director chooses people, setting, lighting and treatment unless an explicit required rule constrains them. Absence of people in references does not prohibit people. Code owns identity/variant, dimensions, IDs, hashes, bindings and destination URLs. Copywriter owns wording until locked; downstream roles cannot rewrite it. Reviewer supplies observations; code computes exact-copy verdicts. These labels do not upgrade draft guidance or unverified claims.';
function compile(input){
 const records=[],seen=new Set();
 const add=(path,authority,owner)=>{const key=path+'|'+authority;if(!seen.has(key)){seen.add(key);records.push({path,authority,owner});}};
 function walk(v,path=[]){
  if(!v||typeof v!=='object')return;
  for(const [key,value]of Object.entries(v)){
   if(['imageData','locator','assets','sharedText','messages'].includes(key))continue;
   const at=[...path,key];
   if(key==='assignment'&&value?.goal){for(const field of ['brief','goal','audience','buyingSituation','desiredAction','objective'])if(value[field])add([...at,field].join('.'),'required','brief');}
   if(key==='requirements'&&path.at(-1)==='guardian'&&Array.isArray(value))for(const r of value)add(at.join('.')+'['+r.id+']','required','pinned-rule');
   if(['facts','preferences','assumptions'].includes(key)&&Array.isArray(value))for(const r of value){if(!r?.id)continue;add(at.join('.')+'['+r.id+']',key==='facts'?(r.status==='supported'&&r.sourceIds?.length?'sourced':'unknown'):'proposed',key==='facts'?'source':'creative');}
   if(value&&typeof value==='object')walk(value,at);
  }
 }
 walk(input);return {version:1,records};
}
module.exports={compile,instructions};
