'use strict';
const {check}=require('../marketing-strategist/schema-validator');
// Bind a known collection's identity fields outside the model. Keyed slots
// cannot accidentally duplicate one route/placement and omit another.
function wire(request,collection,bindings){
 bindings=structuredClone(bindings);if(!bindings.length||new Set(bindings.map(b=>JSON.stringify(Object.entries(b).sort()))).size!==bindings.length)throw Error('Unit bindings must be nonempty and unique');
 const schema=structuredClone(request.schema),item=schema.properties[collection].items;
 const keys=[...new Set(bindings.flatMap(b=>Object.keys(b)))];
 for(const key of keys){delete item.properties[key];item.required=item.required.filter(k=>k!==key);}
 const slots=Object.fromEntries(bindings.map((b,i)=>['unit'+i,structuredClone(item)]));
 schema.properties[collection]={type:'object',properties:slots,required:Object.keys(slots),additionalProperties:false};
 return {kind:'deterministic-units-v1',schema,input:{...request.input,outputUnits:bindings.map((b,i)=>({key:'unit'+i,...b}))},instructions:request.instructions+'\nReturn '+collection+' as the keyed object in the schema, one slot per outputUnits entry. Code binds '+keys.join(', ')+'. Do not output those fields within slots; retain all creative choices, provenance and constraints.',decode:out=>{const errors=check(schema,out);if(errors.length)throw Error(errors.join('\n'));return {...out,[collection]:bindings.map((b,i)=>({...out[collection]['unit'+i],...b}))};}};
}
module.exports={wire};
