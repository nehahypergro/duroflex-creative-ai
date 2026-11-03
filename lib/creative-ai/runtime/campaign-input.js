'use strict';
const assignmentSchema=require('../marketing-strategist/input.schema.json').properties.assignment.properties;
const {check}=require('../marketing-strategist/schema-validator');
// Validate before source loading or any model work. Do not decode entities in
// plain campaign text: literal &amp;, quotes, line breaks and scripts are data.
function normalize(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Campaign input must be an object.');
 const out={...input};if(out.briefDocuments!==undefined)require('./brief-document-context').validate(out.briefDocuments);
 require("../concept-selection").routes(out);
 // New campaigns produce one complete continuity set; historical jobs retain their saved intake.
 out.conceptRoutes=["continuity"];
 if(typeof out.brief!=='string'||out.brief.length>5000)throw Error('Brief must be under 5000 characters');
 out.brief=out.brief.trim();
 const briefLines=out.brief.split(/\r?\n/),last=briefLines.at(-1);
 if(last.startsWith('Audience is defined by this brief, not verified consumer research.')){out.brief=out.brief.slice(0,out.brief.length-last.length)+last.replace(/ Produce two distinct options(?= (?:of the complete ordered asset set|for this one ))/,' Produce one option');}
 out.brief=out.brief.trim()||'Introduce this brand and invite people to explore its official website. Make no unsupported offers, product benefits or performance claims.';
 // Inspect only Studio's generated delivery footer. Client prose is not a
 // reliable concept-count parser and must never be silently rewritten.
 const footer=out.brief.split(/\r?\n/).at(-1),generatedCount=footer.startsWith('Audience is defined by this brief, not verified consumer research.')&&footer.match(/ Produce (one option|two distinct options) (?:of the complete ordered asset set|for this one )/);
 if(out.conceptRoutes&&generatedCount){const requested=generatedCount[1]==='one option'?1:2;if(requested!==out.conceptRoutes.length)throw Error('Generated delivery instructions request '+(requested===1?'one':'two')+' option'+(requested===1?'':'s')+', but the selected delivery scope requests '+(out.conceptRoutes.length===1?'one':'two')+'. Rebuild the brief with the selected option count before starting. No generation was dispatched.');}
 for(const [key,fallback] of [['objective','consideration'],['language','English']]){
  if(out[key]===undefined||out[key]==='')out[key]=fallback;
 }
 for(const key of ['brief','objective','language','audience','market','objectiveDetail','productName','buyingSituation','buyingBarrier','desiredAction']){
  if(out[key]===undefined)continue;
  const schema=assignmentSchema[key]||{type:'string',minLength:1,maxLength:2000};
  if(check(schema,out[key]).length||!out[key].isWellFormed()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(out[key]))throw Error('Invalid campaign input: '+key);
 }
 return out;
}
function strategyFields(intake){return Object.fromEntries(['market','objectiveDetail','buyingSituation','buyingBarrier','desiredAction','landingPageUrl'].filter(key=>intake[key]!==undefined).map(key=>[key,intake[key]]));}
function canonical(intake){
 // Derive on the server. Never accept a caller's competing brief/goal snapshot.
 // Placement treatment lives in the pinned placement contract, not a second brief.
 const keys=['briefDocuments','conceptRoutes','brandId','brandUrl','brief','objective','language','audience','market','objectiveDetail','productName','productPageUrl','productVariantId','productAssetId','focusType','buyingSituation','buyingBarrier','desiredAction','landingPageUrl'];
 const content=Object.fromEntries(keys.filter(k=>intake[k]!==undefined).map(k=>[k,structuredClone(intake[k])]));
 return {version:1,content,contentHash:require('../art-director').fingerprint(content)};
}
function assignment(intake,{productName}={}){
 const c=canonical(intake).content;
 return {...(c.focusType?{focusType:c.focusType}:{}),goal:c.brief,brief:c.brief,productName:c.productName||productName,objective:c.objective,language:c.language,...(c.audience?{audience:c.audience}:{}),...strategyFields(c)};
}
module.exports={normalize,strategyFields,canonical,assignment};
