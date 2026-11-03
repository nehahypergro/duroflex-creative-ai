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
  if(input.copyAuthority?.version===1)delete field.locked;
  delete field.id;delete field.delivery;delete field.nativeFieldId;
  const shoppingSlot=input.pdpPlan?.version>=2?input.pdpPlan.sets.find(s=>s.conceptId===u.conceptId)?.slots.find(s=>s.placementId===u.placementId):null;
  if(shoppingSlot)field.role.enum=field.role.enum.filter(r=>r!=='cta');
  field.target={type:'string',enum:['embedded',...(u.placement.expanded?.profile?.nativeFields||[]).map(f=>'native:'+f.id)]};
  const policy=require('./readability').pinnedPolicy(u.placement.expanded?.rules||[]);
  const known=policy&&require('./readability').supportsVersion(policy.version);
  let fields=object(field);
  if(hasDestination&&field.target.enum.includes('native:destinationUrl')){const urlField=structuredClone(field);delete urlField.text;urlField.target={type:'string',const:'native:destinationUrl'};field.target.enum=field.target.enum.filter(t=>t!=='native:destinationUrl');fields={anyOf:[object(field),object(urlField)]};}
  if(known&&policy.body===0){
   // Make an invalid optional paragraph unrepresentable before the paid draft,
   // while preserving mandatory wording and separate native fields.
   const mandatory=structuredClone(field);mandatory.requirement={const:'mandatory'};
   const optional=structuredClone(field);optional.requirement={const:'optional'};optional.target={const:'embedded'};optional.role.enum=optional.role.enum.filter(r=>!['body','supporting-copy'].includes(r));
   const branches=[object(mandatory),object(optional)];
   const targets=field.target.enum.filter(t=>t!=='embedded');
   if(targets.length){const native=structuredClone(field);native.requirement={const:'optional'};native.target={enum:targets};branches.push(object(native));}
   if(hasDestination&&(u.placement.expanded?.profile?.nativeFields||[]).some(f=>f.id==='destinationUrl')){const url=structuredClone(field);delete url.text;url.target={const:'native:destinationUrl'};branches.push(object(url));}
   fields={anyOf:branches};
  }
  const {cleanPhoto,allowEmpty}=require('./copy-content-policy').contentPolicy(input,u.conceptId,u.placement);
  unitProperties['unit'+i]=object({fields:{type:'array',minItems:allowEmpty?0:1,...(cleanPhoto?{maxItems:0}:{}),items:fields}});
 }
 const schema=object({units:object(unitProperties),rationale:{type:'string'},unknowns:{type:'array',items:{type:'string'}}});
 return {kind:'deterministic-copy-v2',schema,input:{...input,outputUnits:units.map((u,i)=>({key:'unit'+i,conceptId:u.conceptId,placementId:u.placementId}))},instructions:instructions+(input.copyAuthority?.version===1?'\nCOPY STAGE AUTHORITY: You author the campaign copy NOW from this brief and supplied facts. Later image generation and reconstruction must use the copy saved by YOU. A reference to saved copy in the workflow is not a requirement for pre-existing copy at this drafting stage. Do not report missing prior copy as a source gap. EXACT-WORDING AUTHORITY: code supplies locked flags from the actual supplied brief and source requirements. Do not return locked. Generated names, headlines and optional feature details are revisable; do not turn a full catalogue title or chosen feature list into mandatory exact client wording. Preserve supplied exact words and necessary claim qualifiers.':'')+'\nReturn the supplied units object. Code supplies version, agentId, conceptId, placementId, and unique field IDs. For each field choose target: embedded, or an allowed native:<publisher-field-id>. Code binds delivery/nativeFieldId. When a destination URL is supplied, native:destinationUrl has no text property: code inserts the exact saved URL, preserving its variant and query parameters. Do not output those computed fields. Keep rationale concise. Never change exact required text or omit claim qualifiers. Read each placement reading policy before drafting. A+ image-only placements permit empty fields; do not invent overlay wording or a CTA. Only explicit artwork wording from the user brief needs fields. Photography with total=0 permits an empty fields array: physical SKU markings are preserved through product references and must not be duplicated as overlay fields. A zero optional body target disallows optional embedded body/supporting-copy, not mandatory claim qualifiers. Do not relabel an optional paragraph mandatory or another role to bypass this rule.',decode:out=>{
  const errors=check(schema,out);if(errors.length)throw Error(errors.join('\n'));
  return {version:1,agentId:'copywriter',decks:units.map((u,i)=>({conceptId:u.conceptId,placementId:u.placementId,fields:out.units['unit'+i].fields.map((f,n)=>{const {target,...rest}=f;return require('./copy-lock-authority').bind({...rest,...(hasDestination&&target==='native:destinationUrl'?{text:destinationUrl}:{}),id:'copy-'+(n+1),delivery:target==='embedded'?'embedded':'native',nativeFieldId:target==='embedded'?'none':target.slice(7)},input.copyAuthority);})})),rationale:out.rationale,unknowns:out.unknowns};
 }};
}
module.exports={wire};
