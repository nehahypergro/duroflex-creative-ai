'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..');
test('transient counting failure recovers before any paid dispatch; diagnostics retain both attempts',async()=>{
 const check=require('../../lib/creative-ai/runtime/context-preflight').check,old=global.fetch;let calls=0,diagnostic;
 global.fetch=async()=>{if(++calls===1)throw TypeError('fetch failed');return {ok:true,json:async()=>({object:'response.input_tokens',input_tokens:123})};};
 try{const r=await check({model:'gpt-6-luna',max_output_tokens:100,input:'fixture'},{inputTokenCountTimeoutMs:2000},{remainingMs:async()=>2000,preflight:async d=>diagnostic=d});assert.equal(r.inputTokens,123);assert.equal(calls,2);assert.equal(diagnostic.attempts.length,2);assert.equal(diagnostic.attempts[0].status,'unavailable');}finally{global.fetch=old;}
});
test('saved Duroflex white headline is not mistaken for a dark background colour',async()=>{
 const ocr=require('../../lib/creative-ai/runtime/editor-ocr');assert.equal(typeof ocr.ink,'function');
 const dir=path.join(root,'output/creative-ai/jobs/creative-c5f646b0-c61d-4034-97c8-ac873327619d'),proposal=JSON.parse(await fs.readFile(path.join(dir,'editor-ocr-continuity-custom_studio-social-story-proposal.json'))),raw=await sharp(path.join(dir,'static-continuity-custom_studio-social-story-1.png')).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const result=ocr.ink(raw,proposal.matches[0].lines[0].box);assert.ok(result.rgb.every(v=>v>220),JSON.stringify(result));
});
test('cleanup preserves a two-tone wall boundary inside an OCR line rectangle',async()=>{
 const ocr=require('../../lib/creative-ai/runtime/editor-ocr'),w=160,h=80,background=Buffer.alloc(w*h*3);for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<3;c++)background[(y*w+x)*3+c]=x<75?90:150;
 const data=Buffer.from(background);for(let y=25;y<50;y++)for(let x=30;x<125;x++)if(x%16<5)for(let c=0;c<3;c++)data[(y*w+x)*3+c]=250;
 const source=await sharp(data,{raw:{width:w,height:h,channels:3}}).png().toBuffer(),fixed=await ocr.cleanup(source,[{x:25/w,y:22/h,width:105/w,height:31/h}],[],{textOnly:true}),after=await sharp(fixed.bytes).removeAlpha().raw().toBuffer();
 const p=(37*w+79)*3;assert.deepEqual(after.subarray(p,p+3),background.subarray(p,p+3),'Non-text pixels inside the OCR rectangle must retain the wall edge');assert.ok(fixed.maskedPixels<105*31*.6,'Do not fill the whole rectangle');
});
test('editor keeps requested wording and punctuation while retaining observed line breaks',()=>{
 const {requestedText}=require('../../lib/creative-ai/runtime/editor-ocr');assert.equal(typeof requestedText,'function');
 assert.equal(requestedText({text:'Cocoon · Cool Grey',lines:[{text:'Cocoon • Cool Grey'}]}),'Cocoon · Cool Grey');
 assert.equal(requestedText({text:'Make room for your kind of day.',lines:[{text:'Make room for'},{text:'your kind of day'}]}),'Make room for\nyour kind of day.');
 assert.equal(requestedText({text:'A “fresh” start',lines:[{text:'A "fresh" start'}]}),'A “fresh” start');
});
test('unidentifiable foreground remains in the original instead of adding duplicate text',async()=>{
 const pixels=require('../../lib/creative-ai/runtime/editor-pixels');assert.equal(typeof pixels.separable,'function');
 const raw=await sharp({create:{width:100,height:100,channels:3,background:'#777777'}}).raw().toBuffer({resolveWithObject:true});
 assert.equal(pixels.separable(raw,{lines:[{box:{x:.1,y:.1,width:.5,height:.2}}]}),false);
});
test('counting retries stop after three transient attempts and never retry permanent rejection',async()=>{
 const check=require('../../lib/creative-ai/runtime/context-preflight').check,old=global.fetch;
 try{for(const status of [503,401]){let n=0,d;global.fetch=async()=>{n++;return {ok:false,status};};await assert.rejects(()=>check({model:'gpt-6-luna',max_output_tokens:100,input:'fixture'},{inputTokenCountTimeoutMs:3000},{remainingMs:async()=>3000,preflight:async v=>d=v}),/not dispatched/);assert.equal(n,status===503?3:1);assert.equal(d.attempts.length,n);}}finally{global.fetch=old;}
});
test('saved Sleepyhead adjacent lines do not contaminate the surrounding-background estimate',async()=>{
 const pixels=require('../../lib/creative-ai/runtime/editor-pixels'),dir=path.join(root,'output/creative-ai/jobs/creative-3d7db977-ab11-4258-9bfe-7c05f32af691'),p=JSON.parse(await fs.readFile(path.join(dir,'editor-ocr-exploration-custom_studio-social-story-proposal.json'))),raw=await sharp(path.join(dir,'static-exploration-custom_studio-social-story-0.png')).removeAlpha().raw().toBuffer({resolveWithObject:true});
 for(const r of p.matches[0].lines){const found=pixels.ink(raw,r.box);assert.ok(found.rgb.every(v=>v<60),r.text+': '+JSON.stringify(found));}
});
test('editor derives multiline spacing from observed lines instead of a fixed leading',()=>{
 const {lineHeight}=require('../../lib/creative-ai/runtime/editor-ocr');assert.equal(typeof lineHeight,'function');
 const m={lines:[{box:{y:.21}},{box:{y:.255}},{box:{y:.30}}]};assert.ok(Math.abs(lineHeight(m,82.5,1920)*82.5*1.13-86.4)<.01);
 assert.equal(lineHeight({lines:[{box:{y:.1}}]},30,1920),1.05);
});
