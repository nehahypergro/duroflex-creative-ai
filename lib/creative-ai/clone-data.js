'use strict';
// Clone mutable containers while sharing immutable primitive strings, including
// large raster data URLs. structuredClone materializes those strings repeatedly.
function cloneData(value,seen=new WeakMap()){
 if(value===null||typeof value!=='object')return ['function','symbol'].includes(typeof value)?structuredClone(value):value;
 if(seen.has(value))return seen.get(value);
 if(!Array.isArray(value)&&![Object.prototype,null].includes(Object.getPrototypeOf(value)))return structuredClone(value);
 const out=Array.isArray(value)?[]:{};seen.set(value,out);
 for(const [key,item] of Object.entries(value))Object.defineProperty(out,key,{value:cloneData(item,seen),enumerable:true,writable:true,configurable:true});
 return out;
}
module.exports=cloneData;
