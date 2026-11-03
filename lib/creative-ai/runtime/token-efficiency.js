'use strict';
// v3 wire-only changes. Authoritative schemas/validators are never replaced.
const hash=s=>require('crypto').createHash('sha256').update(s).digest('hex');
function compactSchema(schema){
 const counts=new Map(),definitions={};
 function visit(s,fn){if(!s||typeof s!=='object')return;fn(s);for(const child of Object.values(s.properties||{}))visit(child,fn);if(s.items)visit(s.items,fn);for(const key of ['anyOf','allOf','oneOf'])for(const child of s[key]||[])visit(child,fn);}
 // Reuse identical enum subschemas, including type and other restrictions.
 visit(schema,s=>{if(s.enum&&JSON.stringify(s).length>160){const k=JSON.stringify(s);counts.set(k,(counts.get(k)||0)+1);}});
 function walk(s){const key=JSON.stringify(s);if(counts.get(key)>1){let name='shared_'+hash(key).slice(0,20);while(Object.hasOwn(schema.$defs||{},name))name+='_';definitions[name]=structuredClone(s);return {$ref:'#/$defs/'+name};}const out=structuredClone(s);if(out.properties)for(const k of Object.keys(out.properties))out.properties[k]=walk(out.properties[k]);if(out.items)out.items=walk(out.items);for(const k of ['anyOf','allOf','oneOf'])if(out[k])out[k]=out[k].map(walk);return out;}
 const result=walk(schema);if(Object.keys(definitions).length)result.$defs={...schema.$defs,...definitions};
 return JSON.stringify(result).length<JSON.stringify(schema).length?result:structuredClone(schema);
}
function instructions(text,stage,routes){
 let out=text;
 if(['art','reconciliation'].includes(stage))out=out
  .replaceAll('for BOTH continuity and exploration concepts','for the selected concept routes only')
  .replaceAll('The copy interface is an input contract, not an implemented Copywriter.','Copywriter supplies the approved copy for this revision.')
  .replaceAll('Keep both concepts in the blocked output.','Keep every requested concept in the blocked output.')
  .replaceAll('Both concepts and placements required','Every requested concept and placement is required');
 if(stage==='concepts'&&routes?.length===1){out=out.replace('The continuity key is the continuity premise; the exploration key is its contrasting exploration. Develop continuity first and keep every title, rationale, self-critique and public explanation under its own named key. Never describe the exploration concept as continuity or contrast continuity against itself.','Develop only the selected '+routes[0]+' concept. Keep its title, rationale, self-critique and public explanation under that named key.').replace('Produce the two creative premises','Produce the requested creative premise');}
 return out;
}
function strategyChoices(schema,input){
 const out=structuredClone(schema),si=input.assignment;
 if(!si?.assignment||!Array.isArray(si.facts))return out;
 const properties=out.properties||{},unusedField=properties.unusedBrandFacts,unused=unusedField?.type==='array'?unusedField:unusedField?.anyOf?.find(s=>s.type==='array');
 // Empty eligibility is an empty decision list, not an unrestricted string ID.
 if(unused&&!require('../marketing-strategist/dependencies').candidates(si).length){unused.maxItems=0;unused.minItems=0;}
 const destination=properties.strategyChecks?.properties?.destination;
 const target=si.assignment.landingPageUrl;
 if(destination&&target){
  const sources=new Map([...(si.research?.sources||[]),...(si.additionalSources||[])].map(s=>[s.id,s]));
  const canonical=x=>{try{return new URL(x).href;}catch{return null;}};
  const ids=si.facts.filter(f=>f.kind==='destination'&&f.status==='supported'&&f.sourceIds.some(id=>canonical(sources.get(id)?.reference)===canonical(target))).map(f=>f.id);
  const field=destination.properties?.factIds;
  if(field?.items){if(ids.length)field.items={...field.items,enum:ids};else{field.minItems=0;field.maxItems=0;}}
  if(!ids.length&&destination.properties?.status?.enum)destination.properties.status.enum=destination.properties.status.enum.filter(x=>x!=='verified');
  if(!ids.length&&destination.properties?.fit?.enum)destination.properties.fit.enum=destination.properties.fit.enum.filter(x=>x!=='supported');
 }
 return out;
}
function review(input){
 const out=structuredClone(input),facts=out.sourceFacts;
 if(!Array.isArray(facts))return out;
 const ids=new Set();function collect(v){if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(k==='sourceFacts')continue;if(k==='factId'&&typeof x==='string')ids.add(x);else if(/FactIds$|^factIds$/.test(k)&&Array.isArray(x))x.forEach(id=>ids.add(id));else if(x&&typeof x==='object')collect(x);}}collect(out);
 // Without explicit citations, all facts stay. Product/claim/unknown evidence
 // always stays; only uncited nonessential supported brand background is omitted.
 if(ids.size)out.sourceFacts=facts.filter(f=>f.kind!=='brand'||f.status!=='supported'||f.essential!==false||ids.has(f.id));
 // An assembled message can duplicate the complete placement object. Remove it
 // only when the structured pinned rules are also available.
 if(out.placementContext?.contextHash&&out.placementContext?.placements)delete out.placementContext.messages;
 return out;
}
function repair(schema,previous,error,stage){
 if(stage!=='strategy'||!previous||!schema.properties)return null;
 const message=String(error.message||error);
 let key;
 if(/^Verified destination proof must refer to the actual selected page/.test(message))key='strategyChecks';
 else if(/^Cannot exclude required or non-brand evidence:/.test(message))key='unusedBrandFacts';
 // Composite/unknown failures use the full existing repair, never a guess.
 if(!key||message.includes('\n')||!schema.properties[key])return null;
 const patchSchema={type:'object',properties:{[key]:schema.properties[key]},required:[key],additionalProperties:false,...(schema.$defs?{$defs:schema.$defs}:{})};
 return {key,schema:patchSchema,merge(patch){const errors=require('../marketing-strategist/schema-validator').check(patchSchema,patch);if(errors.length)throw Error(errors.join('\n'));return {...structuredClone(previous),...patch};}};
}
function trial(value){
 if(value==null)return null;
 if(typeof value!=='object'||!/^trial-[a-zA-Z0-9-]{1,60}$/.test(value.id||'')||!['strategy','concepts','copy','art','reconciliation','canvas-layout-review'].includes(value.stage)||!['low','medium'].includes(value.effort))throw Error('Invalid stage reasoning trial');
 return {id:value.id,stage:value.stage,effort:value.effort};
}
module.exports={compactSchema,instructions,strategyChoices,review,repair,trial};
