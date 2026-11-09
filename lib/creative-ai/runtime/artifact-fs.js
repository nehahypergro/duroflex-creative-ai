'use strict';
// Runtime readers accept both historical inline JSON and new raster references.
// Raw exports/hashes use readFileRaw. Media writes enqueue durable CDN uploads;
// verified videos can be read back remotely after their local bytes are removed.
const fs=require('fs/promises'),path=require('path'),storage=require('./reference-storage'),cdn=require('./cdn-media');
async function readFile(file,options){let bytes;try{bytes=await fs.readFile(file,options);}catch(e){if(e.code!=='ENOENT'||!cdn.scope(file))throw e;const receipt=await cdn.receipt(file);if(!receipt)throw e;bytes=await cdn.read(file,options);}if(typeof file!=='string'||!file.endsWith('.json')||!bytes.includes('"'+storage.tag+'"'))return bytes;const logical=await storage.decode(JSON.parse(bytes.toString()),{file}),text=JSON.stringify(logical,null,2)+'\n';return typeof bytes==='string'?text:Buffer.from(text);}
// Decode directly to an object. Avoid a second 100+ MB JSON string and parse
// when saved planning artifacts contain many raster references.
async function readJson(file){const bytes=await readText(file),value=JSON.parse(bytes);return bytes.includes('"'+storage.tag+'"')?storage.decode(value,{file}):value;}
// Parsed saved JSON with raster references left as small hash-bound metadata.
// Callers that need pixels must validate with reference-storage inspect and
// resolve only their selected references (defect #6 heap exhaustion).
async function readJsonRaw(file){return JSON.parse(await readText(file));}
async function readText(file){try{return await fs.readFile(file,'utf8');}catch(e){if(e.code!=='ENOENT'||!cdn.scope(file))throw e;const receipt=await cdn.receipt(file);if(!receipt)throw e;return cdn.read(file,'utf8');}}
async function jsonBytes(file,value,{owner}={}){
 if(!owner)try{owner=JSON.parse(await fs.readFile(path.join(path.dirname(file),'job.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const saved=owner?.storageVersion===1&&owner.intake?.brandId?await storage.encode(value,{file,brandId:owner.intake.brandId}):value;
 return Buffer.from(JSON.stringify(saved,null,2)+'\n');
}
async function writeFile(file,...args){const result=await fs.writeFile(file,...args);await require('./media-outbox').enqueue(file);return result;}
async function rename(source,dest){const result=await fs.rename(source,dest);await require('./media-outbox').enqueue(dest);return result;}
async function copyFile(source,dest,...args){try{await fs.copyFile(source,dest,...args);}catch(e){if(e.code!=='ENOENT')throw e;await fs.writeFile(dest,await readFile(source));}await require('./media-outbox').enqueue(dest);}
async function stat(file,...args){try{return await fs.stat(file,...args);}catch(e){if(e.code!=='ENOENT'||!cdn.scope(file))throw e;const receipt=await cdn.receipt(file);if(!receipt)throw e;return cdn.stat(file);}}
async function rm(file,...args){const result=await fs.rm(file,...args);await fs.rm(String(file)+'.cdn.json',{force:true});await fs.rm(String(file)+'.cdn-pending.json',{force:true});return result;}
module.exports={...fs,readFile,readJson,readJsonRaw,readFileRaw:fs.readFile,jsonBytes,writeFile,rename,copyFile,stat,rm};
