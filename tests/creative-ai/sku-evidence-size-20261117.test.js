'use strict';
// Regression (live test batch, 17 Nov 2026, Duroflex Memory Foam Topper mobile banner): the job failed with
// "Images must be embedded PNG/JPEG data URLs under 6MB" after product research, because a busy 3000 px product
// photo became a 1600 px PNG over the dossier's embedded-image limit. A saved Duroflex photo (Airboost Duo Topper)
// is also over it. Failing before: there was no smaller step. No paid calls; both brands use this shared path.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp'),crypto=require('node:crypto');
const {evidencePng}=require('../../lib/creative-ai/runtime/sku-research'),{valid}=require('../../lib/brand-dossier/embedded-image');
const dataUrl=b=>'data:image/png;base64,'+b.toString('base64');
async function noisy(size){const buf=Buffer.alloc(size*size*3);let seed=7;for(let i=0;i<buf.length;i++){seed=(seed*1103515245+12345)&0x7fffffff;buf[i]=seed>>16&255;}return sharp(buf,{raw:{width:size,height:size,channels:3}}).jpeg({quality:95}).toBuffer();}

test('a busy product photo becomes valid embedded evidence instead of failing the job',async()=>{
 const photo=await noisy(3000);
 const old=await sharp(photo).resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).png().toBuffer();
 assert.equal(valid(dataUrl(old)),false,'the old 1600 px PNG is over the limit');
 const out=await evidencePng(photo);assert.ok(valid(dataUrl(out)));
 const meta=await sharp(out).metadata();assert.ok(meta.width<1600&&meta.width>=800,'drawn smaller: '+meta.width);
});

test('photos that already fitted keep their exact bytes',async()=>{
 const plain=await sharp({create:{width:3000,height:2000,channels:3,background:'#c8b496'}}).jpeg().toBuffer();
 const old=await sharp(plain,{limitInputPixels:40000000}).resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).png().toBuffer();
 assert.deepEqual(await evidencePng(plain),old);
});
