'use strict';
const {check}=require('../marketing-strategist/schema-validator');
// One length recovery and one content repair, sharing a hard dispatch ceiling.
// Reconstructed from persisted responses on resume; never a new outer retry budget.
function state(limit=3){
 if(!(limit===Infinity||Number.isInteger(limit)&&limit>=1))throw Error('Invalid provider request limit');
 const maximum=Math.min(3,limit),history=[];let providerRequests=0,length=0,repair=0,limitReason=null;
 return {
  httpRetries(){return Math.max(0,Math.min(1,maximum-providerRequests-1));},
  received(count){providerRequests+=count;},
  correct(reason,requestKey){
   history.push({reason,requestKey});
   if(providerRequests>=maximum){limitReason='provider-request-limit';return false;}
   if(reason==='output-limit'){
    if(length){limitReason='output-limit-recovery-limit';return false;}length++;
   }else{
    if(repair){limitReason='repair-limit';return false;}repair++;
   }
   return true;
  },
  snapshot(){return {providerRequests,maxProviderRequests:maximum,outputRecoveries:length,repairRecoveries:repair,history:structuredClone(history),limitReason};}
 };
}
// Narrow only an independently identifiable wire-schema field. Semantic or
// cross-field failures retain the full contract. Validate the patch AND merge.
function fieldRepair(schema,previous){
 if(!previous||typeof previous!=='object'||Array.isArray(previous)||!schema.properties)return null;
 const errors=check(schema,previous);if(!errors.length)return null;
 const keys=errors.map(e=>/^\$\.([^.[\]:]+)(?:[.[:])/.exec(e)?.[1]);
 const key=keys[0];if(!key||keys.some(k=>k!==key)||!Object.hasOwn(schema.properties,key))return null;
 const patchSchema={type:'object',properties:{[key]:schema.properties[key]},required:[key],additionalProperties:false};
 const original=structuredClone(previous);
 return {key,schema:patchSchema,merge(patch){const issues=check(patchSchema,patch);if(issues.length)throw Error(issues.join('\n'));const merged={...structuredClone(original),...patch};const remaining=check(schema,merged);if(remaining.length)throw Error(remaining.join('\n'));return merged;}};
}
function repairLimit(current,ceiling,usage){return usage?.output_tokens>=current*.8?Math.min(ceiling,Math.ceil(current*1.5)):current;}
module.exports={state,fieldRepair,repairLimit};
