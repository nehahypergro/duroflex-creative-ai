'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp'),crypto=require('node:crypto'),{encode}=require('../../lib/creative-ai/runtime/image-upload');
const variants=[['png',3,64,64],['png',4,107,193],['jpeg',3,320,180],['webp',4,128,128],['png',4,1,300],['png',3,970,600],['jpeg',3,720,900],['webp',3,600,400],['png',4,1600,1600],['png',3,1920,640]];
for(const [i,[type,channels,width,height]] of variants.entries())test('reference source fidelity variant '+(i+1),async()=>{
 const original=await sharp({create:{width,height,channels,background:{r:i*20,g:70,b:150,alpha:channels===4?.4:1}}})[type]().toBuffer(),before=Buffer.from(original);
 const result=await encode({assetId:'brand-scoped-उत्पाद-'+i,type,bytes:original});
 const pixels=b=>sharp(b).toColourspace('srgb').ensureAlpha().raw().toBuffer();assert.deepEqual(await pixels(result.bytes),await pixels(original));assert.deepEqual(original,before);assert.equal(result.assetId,'brand-scoped-उत्पाद-'+i);assert.equal(result.provenance.originalSha256,crypto.createHash('sha256').update(original).digest('hex'));assert.ok(result.bytes.length<=original.length);
});
