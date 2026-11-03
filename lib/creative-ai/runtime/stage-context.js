'use strict';
// Versioned, lossless wire compaction AFTER role selection. Never summarize or
// truncate evidence to meet a target. Original inputs remain validator authority.
const crypto=require('crypto');
const VERSION=1,REF='$stageContextRef',hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const purposes=Object.freeze({strategy:'Brief, audience, objective, product facts and brand requirements',concepts:'Selected strategy, product references and visual guidance',copy:'Message, supported claims, qualifiers, exact wording and format constraints',art:'Approved copy, visual direction, SKU references and layout constraints',reconciliation:'Exact copy and applicable visual/placement requirements',review:'Final artwork, approved brief/copy, SKU references and applicable checks'});
function pack(value){
 const counts=new Map();
 function count(v){if(!v||typeof v!=='object')return; if(Object.hasOwn(v,REF))throw Error('Reserved stage context reference in source');
  const text=JSON.stringify(v);if(text.length>=512)counts.set(text,(counts.get(text)||0)+1);Object.values(v).forEach(count);
 }count(value);
 const shared={};let references=0;
 function encode(v){if(!v||typeof v!=='object')return v;const text=JSON.stringify(v);
  if(counts.get(text)>1){const key=hash(text);shared[key]??=v;references++;return {[REF]:key};}
  return Array.isArray(v)?v.map(encode):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]));
 }
 const encoded=encode(value),candidate={context:encoded,sharedContext:shared,contextReferenceInstructions:'Resolve each {$stageContextRef: hash} to the complete value at sharedContext[hash]. Values are identical source evidence, not summaries. Preserve wording, qualifiers, authority and unknowns.'};
 const before=Buffer.byteLength(JSON.stringify(value)),after=Buffer.byteLength(JSON.stringify(candidate));
 return {input:references&&after<before?candidate:value,metrics:{originalBytes:before,wireBytes:references&&after<before?after:before,repeatedObjectReferences:references,savedBytes:Math.max(0,before-after)}};
}
function expand(packet){if(!packet.sharedContext||!packet.contextReferenceInstructions)return packet;
 function walk(v){if(!v||typeof v!=='object')return v;if(Object.hasOwn(v,REF)){const key=v[REF],source=packet.sharedContext[key];if(Object.keys(v).length!==1||!source||hash(JSON.stringify(source))!==key)throw Error('Invalid shared stage context hash');return structuredClone(source);}return Array.isArray(v)?v.map(walk):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x)]));}return walk(packet.context);
}
function compile(stage,input,{brandId,images=[],targetBytes}={}){
 if(!brandId)throw Error('Stage context requires a pinned brand');
 function check(v){if(!v||typeof v!=='object')return;if(v.brandId&&v.brandId!==brandId)throw Error('Cross-brand stage context');Object.values(v).forEach(check);}check(input);
 const packed=pack(input);
 const selectedImages=images.map(a=>{if(typeof a.imageData!=='string')throw Error('Selected stage image is unresolved');return {id:a.id,sha256:hash(a.imageData),bytes:Buffer.byteLength(a.imageData)};});
 return {...packed,metrics:{version:VERSION,stage,purpose:purposes[stage]||'Preserve the existing specialized stage contract',brandId,...packed.metrics,selectedImages,targetBytes:targetBytes??null,targetStatus:targetBytes?(packed.metrics.wireBytes>targetBytes?'above-target':'within-target'):'baseline-only',note:'Byte targets are observational, not token counts or permission to remove required evidence.'}};
}
// Read metadata first, select a role's input, then hydrate only that selection.
// Existing readers retain their behavior; callers must opt into this interface.
async function readSelected(file,select,{brandId}={}){
 const fs=require('fs/promises'),storage=require('./reference-storage');
 const raw=JSON.parse(await fs.readFile(file,'utf8'));
 const selected=await select(raw);
 function check(v){if(!v||typeof v!=='object')return;if(v[storage.tag]?.brandId!==undefined&&v[storage.tag].brandId!==brandId)throw Error('Cross-brand selected raster');Object.values(v).forEach(check);}check(selected);
 return JSON.stringify(selected).includes('"'+storage.tag+'"')?storage.decode(selected,{file}):selected;
}
module.exports={VERSION,purposes,pack,expand,compile,readSelected};
