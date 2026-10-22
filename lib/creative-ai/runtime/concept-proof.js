'use strict';
const strategist=require('../marketing-strategist');
function eligibleIds(input){return strategist.analyzeInput(input.strategyInput).eligibleFacts.map(f=>f.id);}
function schemaFor(schema,input){
 const out=structuredClone(schema),ids=eligibleIds(input);
 function visit(node){if(!node||typeof node!=='object')return;
  for(const [key,value] of Object.entries(node.properties||{}))if(['factIds','requiredProofFactIds'].includes(key)&&value.items){if(ids.length)value.items.enum=ids;else{delete value.items.enum;value.maxItems=0;}}
  for(const value of Object.values(node))if(value&&typeof value==='object')visit(value);
 }visit(out);return out;
}
module.exports={eligibleIds,schemaFor};
