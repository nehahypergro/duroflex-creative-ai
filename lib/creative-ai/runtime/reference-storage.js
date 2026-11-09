'use strict';
// Brand-scoped, immutable raster blobs. Logical JSON is reconstructed before
// validation; package, SKU and source hashes continue to bind the original data.
const fs=require('fs/promises'),path=require('path'),crypto=require('crypto');
const tag='$studioRaster',digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function namespace(file){let dir=path.dirname(path.resolve(file));for(;;){if(['jobs','research-sessions','publishing-copy','brief-reads','planner-experiments'].includes(path.basename(dir)))return path.dirname(dir);const parent=path.dirname(dir);if(parent===dir)throw Error('Reference storage requires a campaign namespace');dir=parent;}}
function validBrand(id){if(typeof id!=='string'||!/^brand-[a-zA-Z0-9-]{1,90}$/.test(id))throw Error('Invalid reference brand namespace');return id;}
function blobPath(root,brand,hash){validBrand(brand);if(!/^[a-f0-9]{64}$/.test(hash))throw Error('Invalid raster hash');return path.join(root,'reference-images',brand,hash+'.bin');}
async function put(root,brand,bytes){const hash=digest(bytes),file=blobPath(root,brand,hash);await fs.mkdir(path.dirname(file),{recursive:true});try{const existing=await fs.readFile(file);if(digest(existing)!==hash)throw Error('Stored raster hash mismatch');return hash;}catch(e){if(e.code!=='ENOENT')throw e;}
 const temp=file+'.'+crypto.randomUUID()+'.pending';try{await fs.writeFile(temp,bytes,{flag:'wx'});try{await fs.link(temp,file);}catch(e){if(e.code!=='EEXIST')throw e;if(digest(await fs.readFile(file))!==hash)throw Error('Stored raster hash mismatch');}}finally{await fs.unlink(temp).catch(()=>{});}return hash;
}
async function encode(value,{file,brandId}){validBrand(brandId);const root=namespace(file),memo=new Map();
 async function walk(v,key){if(typeof v==='string'){const match=/^(data:image\/(?:png|jpeg|webp|gif);base64,)([A-Za-z0-9+/]*={0,2})$/.exec(v),raw=key==='b64_json'&&/^[A-Za-z0-9+/]+={0,2}$/.test(v);if(!match&&!raw)return v;const prefix=match?match[1]:'',b64=match?match[2]:v,bytes=Buffer.from(b64,'base64');if(!bytes.length||bytes.toString('base64')!==b64)return v;if(!memo.has(v))memo.set(v,put(root,brandId,bytes).then(sha256=>({[tag]:{version:1,brandId,sha256,prefix,bytes:bytes.length}})));return memo.get(v);}
 if(Array.isArray(v)){const out=[];for(const x of v)out.push(await walk(x));return out;}if(v&&typeof v==='object'){const out={};for(const [k,x]of Object.entries(v))Object.defineProperty(out,k,{value:await walk(x,k),enumerable:true,writable:true,configurable:true});return out;}return v;}
 return walk(value);
}
async function owner(file){let dir=path.dirname(path.resolve(file));for(;;){try{const j=JSON.parse(await fs.readFile(path.join(dir,'job.json'),'utf8'));return validBrand(j.intake?.brandId);}catch(e){if(e.code!=='ENOENT')throw e;}const p=path.dirname(dir);if(p===dir)throw Error('Raster reference has no campaign owner');dir=p;}}
function checked(v,brand){const r=v[tag];if(Object.keys(v).length!==1||r.version!==1||r.brandId!==brand||!Number.isSafeInteger(r.bytes)||r.bytes<=0||!(r.prefix===''||/^data:image\/(png|jpeg|webp|gif);base64,$/.test(r.prefix)))throw Error('Invalid or cross-brand raster reference');return r;}
async function verified(root,brand,r){const bytes=await fs.readFile(blobPath(root,brand,r.sha256));if(bytes.length!==r.bytes||digest(bytes)!==r.sha256)throw Error('Raster reference bytes changed');return bytes;}
async function decode(value,{file}){const brand=await owner(file),root=namespace(file),memo=new Map();async function walk(v){if(Array.isArray(v))return Promise.all(v.map(walk));if(v&&typeof v==='object'){if(Object.hasOwn(v,tag)){const r=checked(v,brand),key=r.sha256+'|'+r.prefix;if(!memo.has(key))memo.set(key,verified(root,brand,r).then(bytes=>r.prefix+bytes.toString('base64')));return memo.get(key);}const out={};for(const[k,x]of Object.entries(v))Object.defineProperty(out,k,{value:await walk(x),enumerable:true,writable:true,configurable:true});return out;}return v;}return walk(value);}
// Metadata-only access for hot paths (defect #6: expanding every reference of a
// research file materialised 100+ M base64 characters per read). inspect applies
// decode's ownership/brand/shape checks to every reference and confirms each blob
// exists at its recorded size, without reading pixels. It returns null for legacy
// values with no references, otherwise the verified context for resolve/verify.
function isReference(v){return Boolean(v)&&typeof v==='object'&&!Array.isArray(v)&&Object.hasOwn(v,tag);}
function references(value){const out=[];(function walk(v){if(Array.isArray(v)){for(const x of v)walk(x);return;}if(v&&typeof v==='object'){if(Object.hasOwn(v,tag)){out.push(v);return;}for(const x of Object.values(v))walk(x);}})(value);return out;}
async function inspect(value,{file}){const refs=references(value);if(!refs.length)return null;const brand=await owner(file),root=namespace(file),sizes=new Map();
 for(const v of refs){const r=checked(v,brand);blobPath(root,brand,r.sha256);sizes.set(r.sha256+'|'+r.bytes,r);}
 await Promise.all([...sizes.values()].map(async r=>{if((await fs.stat(blobPath(root,brand,r.sha256))).size!==r.bytes)throw Error('Raster reference bytes changed');}));
 return {brand,root};
}
// Byte-verify one reference (length and SHA-256 of the stored blob); resolve also
// returns its logical string, exactly as decode would materialise it.
async function verify(v,{brand,root}){const r=checked(v,brand);await verified(root,brand,r);return r;}
async function resolve(v,{brand,root}){const r=checked(v,brand);return r.prefix+(await verified(root,brand,r)).toString('base64');}
// Logical identity shared by a reference and the string it decodes to: media
// prefix plus SHA-256 of canonical bytes. Non-canonical encodings never match,
// because decode always yields canonical base64.
function identity(v){
 if(isReference(v))return v[tag].prefix+'|'+v[tag].sha256;if(typeof v!=='string')return null;
 const match=/^(data:image\/(?:png|jpeg|webp|gif);base64,)([A-Za-z0-9+/]*={0,2})$/.exec(v),raw=!match&&/^[A-Za-z0-9+/]+={0,2}$/.test(v);if(!match&&!raw)return null;
 const prefix=match?match[1]:'',b64=match?match[2]:v,bytes=Buffer.from(b64,'base64');return bytes.length&&bytes.toString('base64')===b64?prefix+'|'+digest(bytes):null;
}
// Decode a selected subtree only when it actually contains references.
async function hydrate(value,{file}){return references(value).length?decode(value,{file}):value;}
module.exports={encode,decode,namespace,blobPath,tag,isReference,inspect,verify,resolve,identity,hydrate};
