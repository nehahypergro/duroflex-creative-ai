'use strict';
// Check the bound before scanning. Split the short header/padding and use a
// negated character class so large valid strings avoid greedy regex backtracking.
function valid(value){
 if(typeof value!=='string'||value.length>8_000_000)return false;
 const prefix=value.startsWith('data:image/png;base64,')?'data:image/png;base64,':value.startsWith('data:image/jpeg;base64,')?'data:image/jpeg;base64,':null;
 if(!prefix)return false;
 const payload=value.slice(prefix.length),padding=payload.indexOf('='),body=padding<0?payload:payload.slice(0,padding);
 return body.length>0&&!/[^A-Za-z0-9+/]/.test(body)&&(padding<0||! /[^=]/.test(payload.slice(padding)));
}
module.exports={valid};
