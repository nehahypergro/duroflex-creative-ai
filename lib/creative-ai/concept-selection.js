'use strict';
const defaults=['continuity','exploration'];
function routes(input={}){
 const selected=input.conceptRoutes;
 if(selected===undefined)return [...defaults];
 if(!Array.isArray(selected)||!selected.length||selected.length>2||new Set(selected).size!==selected.length||selected.some(r=>!defaults.includes(r)))throw Error('Invalid conceptRoutes selection');
 return [...selected];
}
function schemaFor(schema,input){
 const out=structuredClone(schema),selected=routes(input);
 out.properties.concepts.minItems=selected.length;
 out.properties.concepts.maxItems=selected.length;
 out.properties.concepts.items.properties.route.enum=selected;
 return out;
}
module.exports={routes,schemaFor};
