'use strict';
const fs=require('./artifact-fs'),path=require('path'),sharp=require('sharp'),fontkit=require('fontkit'),S=require('./saved-copy-layout');
function metrics(font,text){const r=font.layout(text);return {width:r.positions.reduce((s,p)=>s+p.xAdvance,0),height:Math.max(...r.glyphs.map(g=>g.bbox.maxY))-Math.min(...r.glyphs.map(g=>g.bbox.minY))};}
async function bounds(data){const {data:p,info}=await sharp(Buffer.from(data.split(',')[1],'base64')).removeAlpha().raw().toBuffer({resolveWithObject:true});let x=info.width,y=info.height,right=-1,bottom=-1;for(let yy=0;yy<info.height;yy++)for(let xx=0;xx<info.width;xx++)if(p[(yy*info.width+xx)*info.channels]<128){x=Math.min(x,xx);y=Math.min(y,yy);right=Math.max(right,xx);bottom=Math.max(bottom,yy);}if(right<0)throw Error('Editable line produced no lettering');return {x,y,width:right-x+1,height:bottom-y+1};}
async function reconstruct(runtime,id,planned,source,matches){
 const doc=structuredClone(planned),raw=await sharp(source).removeAlpha().raw().toBuffer({resolveWithObject:true}),{width:w,height:h}=doc.canvas;
 for(const match of matches){const original=doc.objects.find(o=>o.fieldId===match.fieldId);if(!original)throw Error('Unbound editable line field');const f=doc.fonts.find(f=>f.id===original.fontId),font=fontkit.create(await fs.readFile(path.join(runtime.brands.dir(doc.brandId),'canvas-assets',f.filename))),lines=S.lines(match,t=>{const m=metrics(font,t);return{width:m.width/w,height:m.height/h};}),objects=[];
  for(const [index,line] of lines.entries()){
   const m=metrics(font,line.text),target={x:line.box.x*w,y:line.box.y*h,width:line.box.width*w,height:line.box.height*h},ink=require('./editor-pixels').ink(raw,line.box);if(ink.confidence<.7)throw Error('Uncertain editable line colour');
   const o={...original,id:original.id+'-line-'+index,type:'text',lineIndex:index,lineCount:lines.length,text:line.text,fontSize:target.height/m.height*font.unitsPerEm,scaleX:1,scaleY:1,left:0,top:0,width:w,height:target.height+100,align:'left',lineHeight:1.16,charSpacing:0};delete o.background;delete o.padding;
   const gaps=Math.max(1,[...line.text].length-1),b=await calibrate(o,target,async()=>bounds((await require('./editable').render(runtime,id,{...doc,assets:[],objects:[{...o,fill:'#000000'}]})).data));
   o.left=target.x-b.x;o.top=target.y-b.y;o.width=Math.max(target.width+b.x+4,m.width/font.unitsPerEm*o.fontSize+gaps*o.charSpacing*o.fontSize/1000+4);o.height=o.fontSize*1.8;o.fill='#'+ink.rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');objects.push(o);
  }
  doc.objects.splice(doc.objects.indexOf(original),1,...objects);
 }
 S.assertCopy(doc,matches.map(m=>({id:m.fieldId,text:m.text,delivery:'embedded'})));return doc;
}
async function calibrate(o,target,measure){
 const measuredSize=o.fontSize,gaps=Math.max(1,[...o.text].length-1);let b;
 for(let attempt=0;attempt<4;attempt++){
  b=await measure(o);
  if(Math.abs(b.height-target.height)<=1&&Math.abs(b.width-target.width)<=1)break;
  if(attempt===3)throw Error('Editable line geometry cannot match measured lettering without distortion');
  // Search within the approved range. Raster rounding can suggest a >5% jump
  // even when the boundary already matches the visible height within one pixel.
  const limit=require('./font-approximation').maximumFraction,previous=o.fontSize;
  o.fontSize=Math.max(measuredSize*(1-limit),Math.min(measuredSize*(1+limit),previous*target.height/b.height));
  const ratio=o.fontSize/previous;
  o.charSpacing+=(target.width-b.width*ratio)/gaps/o.fontSize*1000;
  if(Math.abs(o.charSpacing)>120)throw Error('Editable line requires excessive spacing adjustment');
 }
 require('./font-approximation').assert(measuredSize,o.fontSize);return b;
}
module.exports={reconstruct,calibrate};
