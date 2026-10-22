'use strict';
// Manual editor resources are job-scoped; they do not change brand research or approval.
const fs=require('./artifact-fs'),path=require('path'),crypto=require('crypto'),sharp=require('sharp');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const filenamePattern=/^editor-[a-f0-9]{24}\.(png|woff2?|ttf|otf)$/;
async function store(runtime,id,{kind,name,bytes,weight,style}){
 const job=await runtime.store.read(id);let ext;
 if(kind==='font'){
  ext={'774f4646':'woff','774f4632':'woff2','00010000':'ttf','4f54544f':'otf'}[bytes.subarray(0,4).toString('hex')];
  if(!ext)throw Error('Choose a TTF, OTF, WOFF or WOFF2 font file.');
  const font=require('fontkit').create(bytes);name=name||font.familyName||'Uploaded font';weight=weight??font['OS/2']?.usWeightClass??400;style=style||(font.italicAngle?'italic':'normal');
  if(![100,200,300,400,500,600,700,800,900].includes(weight)||!['normal','italic'].includes(style))throw Error('Choose the font file’s weight and style.');
 }else if(kind==='image'){
  const meta=await sharp(bytes,{limitInputPixels:24e6}).metadata();if(!['png','jpeg','webp'].includes(meta.format))throw Error('Choose a PNG, JPEG or WebP image.');
  bytes=await sharp(bytes,{limitInputPixels:24e6}).rotate().png().toBuffer();ext='png';
 }else throw Error('Unsupported editor asset');
 const sha256=hash(bytes),filename='editor-'+sha256.slice(0,24)+'.'+ext;
 await runtime.store.save(id,filename,bytes);
 return {id:'editor-'+sha256.slice(0,24),brandId:job.intake.brandId,kind,name:String(name||'Uploaded image').slice(0,150),filename,sha256,scope:'job',url:'/creative-ai/api/jobs/'+id+'/files/'+filename,...(kind==='font'?{weight,style}:await sharp(bytes).metadata().then(m=>({width:m.width,height:m.height})))};
}
async function upload(runtime,id,input){const m=/^data:[\w/+.-]+;base64,([A-Za-z0-9+/=]+)$/.exec(input.data||'');if(!m)throw Error('Invalid upload');const bytes=Buffer.from(m[1],'base64');if(!bytes.length||bytes.length>12*1024*1024)throw Error('Use a file under 12 MB.');const asset=await store(runtime,id,{...input,bytes});if(input.background===true&&asset.kind==='image'){asset.kind='photograph';asset.id+='-background';}return asset;}
async function library(runtime,id){
 const dir=process.env.CREATIVE_AI_EDITOR_FONT_DIR||'/System/Library/Fonts/Supplemental';
 const fonts=[];for(const family of ['Arial','Georgia','Verdana','Trebuchet MS','Courier New'])for(const [suffix,weight,style] of [['',400,'normal'],[' Bold',700,'normal'],[' Italic',400,'italic'],[' Bold Italic',700,'italic']]){
  try{const bytes=await fs.readFile(path.join(dir,family+suffix+'.ttf'));fonts.push(await store(runtime,id,{kind:'font',name:family,bytes,weight,style}));}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 return fonts;
}
async function file(runtime,id,asset,brandId){
 // Early composed-logo documents omitted scope. Resolve only their exact
 // hash-bound project filename; preserve those immutable saved documents.
 const composedLogo=asset.scope===undefined&&asset.kind==='logo'&&/^[a-f0-9]{64}$/.test(asset.sha256||'')&&asset.id==='composed-logo-'+asset.sha256.slice(0,24)&&asset.filename==='editor-'+asset.sha256.slice(0,24)+'.png';
 if(asset.scope==='job'||composedLogo){
  if(asset.brandId!==brandId||!filenamePattern.test(asset.filename)||asset.url!=='/creative-ai/api/jobs/'+id+'/files/'+asset.filename)throw Error('Editor asset belongs to another creative.');
  return path.join(runtime.store.dir(id),asset.filename);
 }
 return null;
}
module.exports={store,upload,library,file,hash};
