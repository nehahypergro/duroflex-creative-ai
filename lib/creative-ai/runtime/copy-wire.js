'use strict';
const {check}=require('../marketing-strategist/schema-validator');
const copy=require('../copywriter');
function object(properties){return {type:'object',properties,required:Object.keys(properties),additionalProperties:false};}
function wire(input,instructions){
 const units=input.concepts.flatMap(c=>input.placements.map(p=>({conceptId:c.conceptId,placementId:p.id,placement:p})));
 if(new Set(units.map(u=>u.conceptId+'|'+u.placementId)).size!==units.length)throw Error('Duplicate copy unit binding');
 const unitProperties={},destinationUrl=input.strategy?.strategyChecks?.destination?.url;
 const hasDestination=typeof destinationUrl==='string'&&/^https?:\/\//.test(destinationUrl);
 for(const [i,u] of units.entries()){
  const field=structuredClone(copy.outputSchema.properties.decks.items.properties.fields.items.properties);
  delete field.id;delete field.delivery;delete field.nativeFieldId;
  field.target={type:'string',enum:['embedded',...(u.placement.expanded?.profile?.nativeFields||[]).map(f=>'native:'+f.id)]};
  let fields=object(field);
  if(hasDestination&&field.target.enum.includes('native:destinationUrl')){const urlField=structuredClone(field);delete urlField.text;urlField.target={type:'string',const:'native:destinationUrl'};field.target.enum=field.target.enum.filter(t=>t!=='native:destinationUrl');fields={anyOf:[object(field),object(urlField)]};}
  unitProperties['unit'+i]=object({fields:{type:'array',minItems:1,items:fields}});
 }
 const schema=object({units:object(unitProperties),rationale:{type:'string'},unknowns:{type:'array',items:{type:'string'}}});
 return {kind:'deterministic-copy-v2',schema,input:{...input,outputUnits:units.map((u,i)=>({key:'unit'+i,conceptId:u.conceptId,placementId:u.placementId}))},instructions:instructions+'\nReturn the supplied units object. Code supplies version, agentId, conceptId, placementId, and unique field IDs. For each field choose target: embedded, or an allowed native:<publisher-field-id>. Code binds delivery/nativeFieldId. When a destination URL is supplied, native:destinationUrl has no text property: code inserts the exact saved URL, preserving its variant and query parameters. Do not output those computed fields. Keep rationale concise. Never change exact required text or omit claim qualifiers.',decode:out=>{
  const errors=check(schema,out);if(errors.length)throw Error(errors.join('\n'));
  return {version:1,agentId:'copywriter',decks:units.map((u,i)=>({conceptId:u.conceptId,placementId:u.placementId,fields:out.units['unit'+i].fields.map((f,n)=>{const {target,...rest}=f;return {...rest,...(hasDestination&&target==='native:destinationUrl'?{text:destinationUrl}:{}),id:'copy-'+(n+1),delivery:target==='embedded'?'embedded':'native',nativeFieldId:target==='embedded'?'none':target.slice(7)};})})),rationale:out.rationale,unknowns:out.unknowns};
 }};
}
module.exports={wire};
