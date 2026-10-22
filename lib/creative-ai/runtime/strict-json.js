'use strict';
// JSON.parse silently keeps the last duplicate object key. Validate structure
// first, then scan the valid token stream for duplicate decoded property names.
function parse(text){
 const result=JSON.parse(text),tokens=text.match(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\]:,]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g)||[];
 let i=0;
 function value(depth=0){
  if(depth>200)throw Error('JSON nesting exceeds handoff limit');
  const token=tokens[i++];
  if(token==='{'){
   const keys=new Set();if(tokens[i]==='}'){i++;return;}
   do{const key=JSON.parse(tokens[i++]);if(keys.has(key))throw Error('Duplicate JSON field: '+key);keys.add(key);i++;value(depth+1);}while(tokens[i++]===',');
  }else if(token==='['){if(tokens[i]===']'){i++;return;}do{value(depth+1);}while(tokens[i++]===',');}
 }
 value();return result;
}
module.exports={parse};
