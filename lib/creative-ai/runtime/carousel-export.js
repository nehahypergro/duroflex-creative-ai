'use strict';
const fs=require('./artifact-fs'),path=require('path');
async function document(report,dir){
 if(report.delivery!=='linkedin-document')return null;
 if(report.slides.length<2||report.slides.length>6)throw Error('LinkedIn document needs the selected 2–6 pages.');
 if(report.slides.some((s,i)=>!s.imageUrl||s.index!==i+1))return null;
 const pdf=await require('pdf-lib').PDFDocument.create();pdf.setTitle(report.title);pdf.setProducer('Creative AI raster carousel handoff');
 let canvas;
 for(const slide of report.slides){
  const filename=slide.imageUrl.split('/').pop();if(!/^static-[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(filename))throw Error('Invalid carousel document image');
  const bytes=await fs.readFile(path.join(dir,filename));if(require('crypto').createHash('sha256').update(bytes).digest('hex')!==slide.artifactHash)throw Error('Carousel document source changed; rebuild from the current set.');
  const meta=await require('sharp')(bytes,{limitInputPixels:40000000}).metadata();if(!meta.width||!meta.height)throw Error('Carousel page has no valid dimensions');
  if(canvas&&(meta.width!==canvas[0]||meta.height!==canvas[1]))throw Error('LinkedIn document pages must have the same size.');canvas=[meta.width,meta.height];
  const png=await require('sharp')(bytes).png().toBuffer(),image=await pdf.embedPng(png),page=pdf.addPage([meta.width*.75,meta.height*.75]);page.drawImage(image,{x:0,y:0,width:page.getWidth(),height:page.getHeight()});
 }
 const bytes=Buffer.from(await pdf.save());if(bytes.length>100000000)throw Error('LinkedIn document exceeds the 100 MB delivery boundary.');return bytes;
}
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
// Store-only ZIP, no shell commands or additional dependencies; slide order is explicit.
function zip(entries){const local=[],central=[];let offset=0;for(const e of entries){const name=Buffer.from(e.name),bytes=Buffer.from(e.bytes),crc=crc32(bytes),header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(bytes.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(name.length,26);local.push(header,name,bytes);const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(33,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(bytes.length,20);c.writeUInt32LE(bytes.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);offset+=header.length+name.length+bytes.length;}const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,directory,end]);}
async function bundle(report,dir){const entries=[];for(const s of report.slides){if(!s.imageUrl)continue;const name=s.imageUrl.split('/').pop();if(!/^static-[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(name))throw Error('Invalid carousel export image');entries.push({name:'slide-'+String(s.index).padStart(2,'0')+'.'+name.split('.').pop(),bytes:await fs.readFile(path.join(dir,name))});}entries.push({name:'review.json',bytes:JSON.stringify(report,null,2)});entries.push({name:'README.txt',bytes:report.title+'\n'+(report.ready?'All slide and carousel checks passed.':'REVIEW REQUIRED: this set contains flagged, unverified or missing slides. Consult review.json.')+'\nSlides are numbered in the intended publishing order.\nPublisher crop and upload eligibility must be checked in the target application.\n'});return zip(entries);}
module.exports={crc32,zip,bundle,document};
