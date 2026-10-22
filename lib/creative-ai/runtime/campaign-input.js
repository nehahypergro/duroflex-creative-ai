'use strict';
const assignment=require('../marketing-strategist/input.schema.json').properties.assignment.properties;
const {check}=require('../marketing-strategist/schema-validator');
// Validate before source loading or any model work. Do not decode entities in
// plain campaign text: literal &amp;, quotes, line breaks and scripts are data.
function normalize(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Campaign input must be an object.');
 const out={...input};
 if(typeof out.brief!=='string'||out.brief.length>5000)throw Error('Brief must be under 5000 characters');
 out.brief=out.brief.trim()||'Introduce this brand and invite people to explore its official website. Make no unsupported offers, product benefits or performance claims.';
 for(const [key,fallback] of [['objective','consideration'],['language','English']]){
  if(out[key]===undefined||out[key]==='')out[key]=fallback;
 }
 for(const key of ['brief','objective','language','audience','market','objectiveDetail','productName','buyingSituation','buyingBarrier','desiredAction']){
  if(out[key]===undefined)continue;
  const schema=assignment[key]||{type:'string',minLength:1,maxLength:2000};
  if(check(schema,out[key]).length||!out[key].isWellFormed()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(out[key]))throw Error('Invalid campaign input: '+key);
 }
 return out;
}
function strategyFields(intake){return Object.fromEntries(['market','objectiveDetail','buyingSituation','buyingBarrier','desiredAction','landingPageUrl'].filter(key=>intake[key]!==undefined).map(key=>[key,intake[key]]));}
module.exports={normalize,strategyFields};
