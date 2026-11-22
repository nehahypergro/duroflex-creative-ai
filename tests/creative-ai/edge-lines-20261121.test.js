'use strict';
// Regression (21 Nov 2026, Neha on a Duroflex infographic: "why are there side black lines on the left and right? I
// think while resizing there was a problem"). The image model had drawn a 1 px dark frame round the whole picture
// (752×1344); the resize trimmed its top and bottom and enlarged the sides to ~2 px. 2 of 312 saved raw pictures had
// such a frame. New lean jobs pin edgeLineVersion 1: the frame is replaced by the picture's own neighbouring pixels
// before fitting. Failing before.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp'),fs=require('node:fs'),path=require('node:path');
const BRANDS=[['Duroflex','#d8382c'],['Sleepyhead','#0b6e6e']];
async function picture(width,height,{frame=0,frameColour='#3c3c3c',background='#fdfdfd',accent='#d8382c',darkSides=0}={}){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${background}"/>`+
  (darkSides?`<rect width="${darkSides}" height="100%" fill="#202020"/><rect x="${width-darkSides}" width="${darkSides}" height="100%" fill="#202020"/>`:'')+
  `<rect x="${width*.2}" y="${height*.3}" width="${width*.6}" height="${height*.3}" fill="${accent}"/>`+
  (frame?`<rect x="${frame/2}" y="${frame/2}" width="${width-frame}" height="${height-frame}" fill="none" stroke="${frameColour}" stroke-width="${frame}"/>`:'')+'</svg>';
 return sharp(Buffer.from(svg)).png().toBuffer();
}
const columnLum=async(bytes,x)=>{const {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});let s=0;for(let y=0;y<info.height;y++){const i=(y*info.width+x)*3;s+=.299*data[i]+.587*data[i+1]+.114*data[i+2];}return s/info.height;};
for(const [brand,accent] of BRANDS)test(brand+': a thin frame drawn round the picture is removed before the resize',async()=>{
 const {fit,cleanEdgeLines}=require('../../lib/creative-ai/runtime/exact-canvas');
 const raw=await picture(752,1344,{frame:1,accent});assert.ok(await columnLum(raw,0)<120,'the drawn frame is dark');
 const fitted=await fit(raw,1080,1920,{edgeLines:true});
 assert.deepEqual(fitted.edgeLines,{left:1,right:1,top:1,bottom:1});
 for(const x of [0,1,1078,1079])assert.ok(await columnLum(fitted.bytes,x)>240,brand+': column '+x+' is the picture’s own background');
 const before=await fit(raw,1080,1920);assert.equal(before.edgeLines,undefined);assert.ok(await columnLum(before.bytes,0)<160,'without the pin the line stays (earlier jobs)');
 assert.equal(await cleanEdgeLines(await picture(752,1344,{accent})),null,'a picture without a frame is unchanged');
 assert.equal(await cleanEdgeLines(await picture(752,1344,{accent,darkSides:120})),null,'dark design areas at the edges are not lines');
 const two=await cleanEdgeLines(await picture(1200,848,{frame:3,accent}));assert.ok(two&&Object.values(two.sides).every(k=>k>=1&&k<=3),'frames up to 3 px');
});
test('new lean jobs pin edgeLineVersion 1 and every new drawing uses it',()=>{
 const repo=path.join(__dirname,'../..'),policy=fs.readFileSync(path.join(repo,'lib/creative-ai/runtime/lean-policy.js'),'utf8'),wf=fs.readFileSync(path.join(repo,'lib/creative-ai/runtime/lean-workflow.js'),'utf8');
 assert.match(policy,/exactCanvasVersion:1,edgeLineVersion:1,/);assert.match(fs.readFileSync(path.join(repo,'lib/creative-ai/runtime/provider-config.js'),'utf8'),/edgeLineVersion:config\.edgeLineVersion/);
 assert.equal((wf.match(/edgeLines:job\.runtimeConfig\?\.edgeLineVersion===1/g)||[]).length,4,'first drawing, story redraw, layout redraw and brochure panels');
});
