'use strict';
// Explicit custom multi-page families use the same provider, stage cache and
// source-bound facts as the standard planners. Native carousel/PDP planners stay.
const {check}=require('../marketing-strategist/schema-validator');
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const text={type:'string',minLength:1,maxLength:1200};
function families(selection){const groups=new Map();for(const p of selection){const f=p.jobInputs?.formatIntent;if(f?.relationship!=='coordinated-set'||p.description?.carousel||p.description?.pdp)continue;if(!groups.has(f.familyId))groups.set(f.familyId,[]);groups.get(f.familyId).push(p);}return [...groups.values()].filter(g=>g.length>1);}
async function plan(runtime,id,{selection,strategy,concepts,facts,guardian,budget}){
 const pagePlans=new Map();
 for(const group of families(selection)){
  const supportedIds=facts.filter(f=>f.status==='supported').map(f=>f.id);
  const pages=Object.fromEntries(group.map((p,i)=>['page'+i,object({purpose:text,message:text,composition:text,proofFactIds:{type:'array',items:{type:'string',...(supportedIds.length?{enum:supportedIds}:{})},maxItems:supportedIds.length?8:0}})]));
  const schema=object({visualSystem:text,pages:object(pages)}),familyId=group[0].jobInputs.formatIntent.familyId;
  const result=await runtime.stage(id,'collection-plan','creative-director','asset-family-'+require('../art-director').fingerprint(familyId).slice(0,16)+'.json',()=>runtime.provider.reason({contextKind:'asset-family-plan',reasoningEffort:'medium',maxOutputTokens:10000,
   instructions:'Plan the ordered pages of this ONE asset family, using the selected strategy and concept. Give every page a specific communication purpose, supported message and composition. Use one coherent visual system without repeating a hero headline/scene on every page. These are internal directions; the copywriter writes final copy. Preserve exact supplied wording, qualifiers, text/logo policy, dimensions and print panel/keepout constraints. A print preview is flat artwork: no installed mockup, fold shadows or printed guide marks. Never invent facts, offers, addresses or production approval. Physical product markings remain protected. Return only the requested page keys.',
   input:{strategy,concepts,requirements:guardian.requirements,facts,placements:group.map((p,i)=>({key:'page'+i,id:p.id,...p.jobInputs.formatIntent,canvas:p.description.dimensions}))},schema,validate:o=>{const errors=check(schema,o);if(errors.length)throw Error(errors.join('; '));}},budget),{scope:{conceptId:concepts[0].conceptId,route:concepts[0].route,placementId:group[0].id}});
  group.forEach((p,i)=>pagePlans.set(p.id,{familyId,visualSystem:result.visualSystem,...result.pages['page'+i]}));
 }
 return selection.map(p=>pagePlans.has(p.id)?{...p,jobInputs:{...p.jobInputs,assetPagePlan:pagePlans.get(p.id)}}:p);
}
module.exports={families,plan};
