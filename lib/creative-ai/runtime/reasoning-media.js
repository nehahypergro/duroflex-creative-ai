'use strict';
// Reuse the verified, brand-scoped media transport used by rendering. Never
// resize review pixels or upload prompts/briefs to the media service.
async function prepare(body,budget,stage=require('./image-reference-stage').stage){
 const wire=structuredClone(body),images=[];
 for(const message of wire.input||[])for(const part of message.content||[]){
  if(part.type!=='input_image'||!part.image_url?.startsWith('data:'))continue;
  const match=/^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(part.image_url);
  if(!match)throw Error('Reasoning references must be raster images');
  images.push({part,assetId:'reasoning-reference-'+images.length,type:match[1],bytes:Buffer.from(match[2],'base64')});
 }
 if(!images.length)return wire;
 try{
  const refs=await stage(images.map(({part,...r})=>r),budget);
  if(refs.length!==images.length)throw Error('Reference staging omitted an image');
  refs.forEach((r,i)=>{if(!/^https:\/\//.test(r.url))throw Error('Reference URL must use HTTPS');images[i].part.image_url=r.url;});
 }catch(cause){throw Object.assign(Error('Reasoning reference transfer failed before paid dispatch.',{cause}),{code:'REASONING_REFERENCE_UPLOAD_FAILED'});}
 return wire;
}
module.exports={prepare};
// A rejected staged URL may be replaced with the original inline bytes only
// before any paid dispatch. The counted body is also the body sent afterwards.
async function countWithInlineFallback(body,inlineBody,count){try{return {body,preflight:await count(body)};}catch(error){const d=error.contextPreflight,invalidUrl=d?.attempts?.some(a=>a.httpStatus===400&&(a.providerParam==='url'||/image_url/.test(a.providerParam||'')||/image_url/.test(a.providerCode||''))),staged=body!==inlineBody&&(body.input||[]).some(m=>m.content?.some(p=>p.type==='input_image'&&p.image_url?.startsWith('https://')));if(!invalidUrl||!staged)throw error;const preflight=await count(inlineBody);return {body:inlineBody,preflight:{...preflight,transportFallback:{from:'staged-url',to:'original-inline-image',reason:'URL rejected during preflight; no paid request dispatched',previous:d}}};}}
module.exports.countWithInlineFallback=countWithInlineFallback;
