'use strict';
// Remove schema constants from model work; restore them before authoritative
// validation. No inferred facts or discretionary creative choices are defaulted.
function constant(schema){return schema.const!==undefined?{value:schema.const}:schema.enum?.length===1?{value:schema.enum[0]}:null;}
function project(schema){
 const out=structuredClone(schema);
 if(out.properties){for(const [key,child] of Object.entries(out.properties)){if(constant(child)){delete out.properties[key];out.required=out.required?.filter(k=>k!==key);}else out.properties[key]=project(child);}}
 if(out.items)out.items=project(out.items);
 // Alternative branch constants can be discriminators (e.g. finding authority).
 // Removing them makes different branches indistinguishable; code cannot safely
 // reconstruct that choice. Keep each alternative's complete contract.
 if(out.allOf)out.allOf=out.allOf.map(project);
 return out;
}
function restore(value,schema){
 const fixed=constant(schema);if(fixed){if(value!==undefined&&JSON.stringify(value)!==JSON.stringify(fixed.value))throw Error('Contract drift: conflicting code-owned constant');return structuredClone(fixed.value);}
 if(Array.isArray(value)&&schema.items)return value.map(v=>restore(v,schema.items));
 if(value&&typeof value==='object'&&schema.properties){const out=structuredClone(value);for(const [key,child] of Object.entries(schema.properties))if(constant(child)||key in out)out[key]=restore(out[key],child);return out;}
 return value;
}
module.exports={project,restore};
