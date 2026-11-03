'use strict';
const sharp=require('sharp'),crypto=require('crypto');const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
class Gate {
 constructor(limit=2,{maxPending=64}={}) {
  if(!Number.isInteger(limit)||limit<1||limit>8)throw Error('Image request concurrency must be 1–8');
  if(!Number.isInteger(maxPending)||maxPending<1||maxPending>1024)throw Error('Invalid image queue capacity');
  this.limit=limit;this.maxPending=maxPending;this.active=0;this.waiters=[];
 }
 async run(fn,{signal}={}) {
  if(signal?.aborted)throw signal.reason;
  if(this.active>=this.limit&&this.waiters.length>=this.maxPending){const e=Error('Image queue is at capacity. Try again when a project finishes.');e.code='IMAGE_QUEUE_FULL';throw e;}
  await new Promise((resolve,reject)=>{
   const waiter={resolve,reject,signal,onAbort:null};
   waiter.onAbort=()=>{const index=this.waiters.indexOf(waiter);if(index>=0){this.waiters.splice(index,1);signal.removeEventListener('abort',waiter.onAbort);reject(signal.reason);}};
   signal?.addEventListener('abort',waiter.onAbort,{once:true});this.waiters.push(waiter);this.pump();
  });
  try{if(signal?.aborted)throw signal.reason;return await fn();}finally{this.active--;this.pump();}
 }
 pump(){while(this.active<this.limit&&this.waiters.length){const waiter=this.waiters.shift();waiter.signal?.removeEventListener('abort',waiter.onAbort);this.active++;waiter.resolve();}}
}
async function encode(source){
 const originalSha256=hash(source.bytes),base={...source,provenance:{originalMime:'image/'+source.type,originalBytes:source.bytes.length,originalSha256,wireMime:'image/'+source.type,wireBytes:source.bytes.length,wireSha256:originalSha256,pixelEquality:true,encoding:'original'}};
 if(source.type!=='png')return base;
 const meta=await sharp(source.bytes).metadata();if((meta.depth&&meta.depth!=='uchar')||(meta.pages||1)!==1||!meta.width||!meta.height||meta.width*meta.height>16000000)return base;
 const bytes=await sharp(source.bytes).keepMetadata().webp({lossless:true,effort:4}).toBuffer();if(bytes.length>=source.bytes.length)return base;
 const rgba=b=>sharp(b).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});const [a,b]=await Promise.all([rgba(source.bytes),rgba(bytes)]);if(a.info.width!==b.info.width||a.info.height!==b.info.height||!a.data.equals(b.data))return base;
 return {...source,type:'webp',bytes,provenance:{...base.provenance,wireMime:'image/webp',wireBytes:bytes.length,wireSha256:hash(bytes),encoding:'lossless-webp-verified-rgba'}};
}
module.exports={Gate,encode};
