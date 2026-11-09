'use strict';
// Image size fix (user decision, 8 Nov 2026): keep today's generation size, then fit every new
// lean image to the exact format size without stretching. Off by <=1% in shape: enlarge evenly
// and trim the few extra pixels from both edges. More than that (e.g. the 2nd model's 916x1717
// story): enlarge evenly to fit and extend the edges instead, so the logo/text margin is kept.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
const {fit}=require('../../lib/creative-ai/runtime/exact-canvas');
const png=(w,h)=>sharp({create:{width:w,height:h,channels:3,background:{r:120,g:80,b:60}}}).png().toBuffer();
test('same shape: enlarged evenly to the exact size, nothing trimmed or added',async()=>{
 const r=await fit(await png(896,1120),1080,1350);const m=await sharp(r.bytes).metadata();
 assert.deepEqual([m.width,m.height],[1080,1350]);assert.equal(r.method,'scale');assert.deepEqual(r.trimmed,{x:0,y:0});assert.deepEqual(r.added,{x:0,y:0});
});
test('tiny shape difference: trims a few pixels equally, never stretches',async()=>{
 const r=await fit(await png(752,1344),1080,1920);const m=await sharp(r.bytes).metadata();
 assert.deepEqual([m.width,m.height],[1080,1920]);assert.equal(r.method,'trim');assert.ok(r.trimmed.y>0&&r.trimmed.y<=12,'only a few pixels: '+r.trimmed.y);assert.equal(r.trimmed.x,0);
 const b=await fit(await png(1744,592),1920,640);assert.equal(b.method,'extend','a 1.8% banner difference extends instead of trimming');
});
test('larger shape difference keeps the margins: edges are extended, not trimmed',async()=>{
 for(const [w,h,W,H] of [[916,1717,1080,1920],[1092,1440,1080,1350]]){
  const r=await fit(await png(w,h),W,H);const m=await sharp(r.bytes).metadata();
  assert.deepEqual([m.width,m.height],[W,H]);assert.equal(r.method,'extend');assert.deepEqual(r.trimmed,{x:0,y:0});assert.ok(r.added.x>0||r.added.y>0);
 }
});
test('already exact images are returned unchanged',async()=>{
 const bytes=await png(1080,1080),r=await fit(bytes,1080,1080);assert.equal(r.method,'exact');assert.ok(r.bytes.equals(bytes));
});
