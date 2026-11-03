const test=require('node:test'),assert=require('node:assert/strict'),{calibrate}=require('../../lib/creative-ai/runtime/editable-copy-lines');
test('small raster height rounding stays within 5% while matching within one pixel',async()=>{
 const sourceSize=28.57142857142857,o={text:'Dimensions: 24 x 16.5 x 4 in',fontSize:sourceSize,charSpacing:0},target={width:708,height:32},sizes=[];
 const b=await calibrate(o,target,async line=>{sizes.push(line.fontSize);return {x:0,y:0,height:Math.round(30*line.fontSize/sourceSize),width:700*line.fontSize/sourceSize+(line.text.length-1)*line.charSpacing*line.fontSize/1000};});
 assert(sizes.every(size=>Math.abs(size/sourceSize-1)<=.05+1e-9));assert(Math.abs(b.height-target.height)<=1);assert(Math.abs(b.width-target.width)<=1);assert(Math.abs(o.fontSize/sourceSize-1)<=.05+1e-9);
});
test('geometry impossible within the cap still fails instead of widening tolerance',async()=>{
 const o={text:'Saved wording',fontSize:30,charSpacing:0},sizes=[];
 await assert.rejects(()=>calibrate(o,{width:200,height:50},async line=>{sizes.push(line.fontSize);return {x:0,y:0,width:200,height:20};}),/geometry|spacing/);
 assert(sizes.every(size=>Math.abs(size/30-1)<=.05+1e-9));assert.equal(o.text,'Saved wording');
});
