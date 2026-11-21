'use strict';
// Response speed (21 Nov 2026; developer review: "the api request has a lot of latency … every single click is
// requesting multiple api calls"). Measured on the local copy: a fresh Studio load fetched about 10 MB of JSON and
// 2 MB of scripts uncompressed, and every visit downloaded the scripts again. This wrapper, installed once per
// request in server.js, does two things to single-shot responses (one res.end with the whole body):
// - gzip for text, JSON, JavaScript, CSS and SVG of 1 KB or more when the browser accepts it (5–9× smaller);
// - an ETag on page files the server already marks "no-cache", so a browser that has them gets 304 Not Modified
//   (no body) until the file changes. "no-store" API answers get no ETag and are never kept.
// Streams (res.write), images, downloads with their own encoding and HEAD requests pass through unchanged.
const zlib=require('zlib'),crypto=require('crypto');
const COMPRESSIBLE=/^(?:application\/(?:json|javascript|xml)|text\/|image\/svg\+xml)/i,MIN_BYTES=1024,memo=new Map(),MEMO_MAX=96;
function header(headers,name){if(!headers||Array.isArray(headers))return undefined;const k=Object.keys(headers).find(h=>h.toLowerCase()===name);return k===undefined?undefined:headers[k];}
function setHeader(headers,name,value){for(const k of Object.keys(headers))if(k.toLowerCase()===name.toLowerCase())delete headers[k];if(value!==undefined)headers[name]=value;}
function gzip(body,etag){if(etag&&memo.has(etag))return memo.get(etag);const out=zlib.gzipSync(body,{level:6});if(etag){memo.set(etag,out);if(memo.size>MEMO_MAX)memo.delete(memo.keys().next().value);}return out;}
function wrap(req,res){
 const writeHead=res.writeHead,write=res.write,end=res.end;let pending=null,flushed=false;
 const flush=()=>{if(flushed)return;flushed=true;if(pending)pending.reason!==undefined?writeHead.call(res,pending.status,pending.reason,pending.headers):writeHead.call(res,pending.status,pending.headers);};
 res.writeHead=function(status,reason,headers){if(flushed)return writeHead.apply(res,arguments);if(reason&&typeof reason==='object'){headers=reason;reason=undefined;}if(Array.isArray(headers)){pending={status,reason,headers};flush();return res;}pending={status,reason,headers:{...(headers||{})}};return res;};
 res.write=function(){flush();return write.apply(res,arguments);};
 res.end=function(chunk,encoding,cb){
  if(typeof chunk==='function'){cb=chunk;chunk=undefined;}if(typeof encoding==='function'){cb=encoding;encoding=undefined;}
  if(flushed||chunk==null||req.method==='HEAD'){flush();return end.call(res,chunk,encoding,cb);}
  const p=pending||{status:res.statusCode,headers:{}},all={...res.getHeaders(),...p.headers},type=String(header(all,'content-type')||''),cache=String(header(all,'cache-control')||'');
  let body=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,typeof encoding==='string'?encoding:'utf8');
  if(p.status!==200||!COMPRESSIBLE.test(type)||header(all,'content-encoding')){flush();return end.call(res,chunk,encoding,cb);}
  const headers={...p.headers};let etag=null;
  if(req.method==='GET'&&!/no-store|private/i.test(cache)&&/no-cache/i.test(cache)){
   etag='W/"'+crypto.createHash('sha1').update(body).digest('base64url')+'"';setHeader(headers,'ETag',etag);
   if(String(req.headers['if-none-match']||'').split(',').map(s=>s.trim()).includes(etag)){for(const h of Object.keys(headers))if(/^content-(?:length|type)$/i.test(h))delete headers[h];res.removeHeader('content-length');pending={status:304,reason:undefined,headers};flush();return end.call(res,undefined,undefined,cb);}
  }
  if(body.length>=MIN_BYTES&&/\bgzip\b/i.test(String(req.headers['accept-encoding']||''))){body=gzip(body,etag);setHeader(headers,'Content-Encoding','gzip');setHeader(headers,'Content-Length',String(body.length));res.removeHeader('content-length');setHeader(headers,'Vary','Accept-Encoding');}
  pending={status:p.status,reason:p.reason,headers};flush();return end.call(res,body,undefined,cb);
 };
}
module.exports={wrap,MIN_BYTES};
