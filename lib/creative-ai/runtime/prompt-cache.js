'use strict';
const crypto=require('crypto');
// Sort object keys only. Preserve all values, array order, exact copy and qualifiers.
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 return value;
}
function prepare(stable,{brandId,stage,model,instructions,schema}){
 if(!brandId)throw Error('Prompt cache requires a pinned brand');
 function verify(v){if(!v||typeof v!=='object')return;if(v.brandId&&v.brandId!==brandId)throw Error('Cross-brand prompt cache context');Object.values(v).forEach(verify);}verify(stable);
 const text=JSON.stringify(canonical(stable));
 const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
 const contextHash=hash(text);
 return {text,key:'creative-pc1-'+hash(JSON.stringify({brandId,stage,model,instructions,schema,contextHash})).slice(0,48),metrics:{version:1,brandId,stage,contextHash,stableContextBytes:Buffer.byteLength(text)}};
}
function usage(value={}){
 const input=value.input_tokens,cached=value.input_tokens_details?.cached_tokens;
 const valid=Number.isSafeInteger(input)&&input>=0&&Number.isSafeInteger(cached)&&cached>=0&&cached<=input;
 const writes=value.input_tokens_details?.cache_write_tokens;
 const cacheWriteTokens=Number.isSafeInteger(writes)&&writes>=0&&Number.isSafeInteger(input)&&writes<=input&&(!valid||writes+cached<=input)?writes:null;
 return {cacheWriteTokens,inputTokens:Number.isSafeInteger(input)&&input>=0?input:null,cachedTokens:valid?cached:null,cachedInputFraction:valid&&input>0?cached/input:null};
}
module.exports={canonical,prepare,usage};
