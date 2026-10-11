'use strict';
// Runtime readers accept both historical inline JSON and new raster references.
// Raw exports/hashes can explicitly use readFileRaw; all non-JSON I/O is native.
const fs=require('fs/promises'),path=require('path'),storage=require('./reference-storage');
async function readFile(file,options){const bytes=await fs.readFile(file,options);if(typeof file!=='string'||!file.endsWith('.json')||!bytes.includes('"'+storage.tag+'"'))return bytes;const logical=await storage.decode(JSON.parse(bytes.toString()),{file}),text=JSON.stringify(logical,null,2)+'\n';return typeof bytes==='string'?text:Buffer.from(text);}
async function jsonBytes(file,value,{owner}={}){
 if(!owner)try{owner=JSON.parse(await fs.readFile(path.join(path.dirname(file),'job.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const saved=owner?.storageVersion===1&&owner.intake?.brandId?await storage.encode(value,{file,brandId:owner.intake.brandId}):value;
 return Buffer.from(JSON.stringify(saved,null,2)+'\n');
}
module.exports={...fs,readFile,readFileRaw:fs.readFile,jsonBytes};
