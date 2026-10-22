'use strict';
// Readability checks only. No reference is stored, trained on or sent to a model.
const {Worker,isMainThread,parentPort,workerData}=require('worker_threads');
const MAX_BYTES=20*1024*1024;
async function inspect({name,data}){
 const extension=String(name||'').split('.').pop().toLowerCase();
 if(!['png','jpg','jpeg','webp','pdf','pptx'].includes(extension))throw Error('Use PNG, JPEG, WebP, PDF or PPTX.');
 const match=/^data:[\w/+.-]+;base64,([A-Za-z0-9+/=]+)$/.exec(data||'');if(!match)throw Error('The file could not be read. Select it again.');
 const bytes=Buffer.from(match[1],'base64');if(!bytes.length||bytes.length>MAX_BYTES)throw Error('Use a nonempty file up to 20 MB.');let details;
 if(['png','jpg','jpeg','webp'].includes(extension)){
  const sharp=require('sharp'),image=sharp(bytes,{limitInputPixels:24e6,failOn:'warning'}),meta=await image.metadata();
  if(meta.format!==(extension==='jpg'?'jpeg':extension))throw Error('Image contents do not match the filename.');
  await image.raw().toBuffer();details={format:meta.format,width:meta.width,height:meta.height};
 }else if(extension==='pdf'){
  if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('This is not a readable PDF.');
  const {PDFParse}=require('pdf-parse'),parser=new PDFParse({data:bytes});try{const info=await parser.getInfo();if(!info.total||info.total>100)throw Error('Use a PDF with 1–100 pages.');await parser.getText();details={format:'pdf',pages:info.total};}finally{await parser.destroy();}
 }else{
  const {spawn}=require('child_process');
  const code=`import sys,io,zipfile,json,posixpath,xml.etree.ElementTree as ET
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as z:
 entries=z.infolist()
 if len(entries)>4000 or sum(e.file_size for e in entries)>100*1024*1024: raise ValueError('PPTX expands beyond the supported limit')
 names=set(z.namelist())
 if len(names)!=len(entries) or not {'[Content_Types].xml','ppt/presentation.xml','ppt/_rels/presentation.xml.rels'}<=names: raise ValueError('Not a readable PPTX presentation')
 if any(e.flag_bits&1 for e in entries): raise ValueError('Password-protected PPTX is not supported')
 for e in entries:
  b=z.read(e)
  if e.filename.endswith(('.xml','.rels')):
   if b'<!DOCTYPE' in b or b'<!ENTITY' in b: raise ValueError('Unsupported XML declarations')
   ET.fromstring(b)
 p=ET.fromstring(z.read('ppt/presentation.xml'))
 ids=p.findall('.//{http://schemas.openxmlformats.org/presentationml/2006/main}sldId')
 if not 1<=len(ids)<=100: raise ValueError('Use a PPTX with 1–100 slides')
 rels={r.attrib['Id']:r.attrib for r in ET.fromstring(z.read('ppt/_rels/presentation.xml.rels'))}
 for s in ids:
  r=rels.get(s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'),{})
  target=posixpath.normpath('ppt/'+r.get('Target',''))
  if r.get('TargetMode')=='External' or target not in names: raise ValueError('A slide is missing or external')
  root=ET.fromstring(z.read(target))
  if not root.tag.endswith('}sld'): raise ValueError('Invalid slide contents')
 print(json.dumps({'format':'pptx','slides':len(ids)}))`;
  details=await new Promise((resolve,reject)=>{const child=spawn(process.env.CREATIVE_AI_PDF_PYTHON||'python3',['-c',code],{stdio:['pipe','pipe','pipe']}),out=[],err=[];const timer=setTimeout(()=>child.kill('SIGKILL'),12000);child.stdout.on('data',b=>out.push(b));child.stderr.on('data',b=>err.push(b));child.on('error',reject);child.on('close',status=>{clearTimeout(timer);if(status!==0)return reject(Error('PPTX could not be opened: '+Buffer.concat(err).toString().trim().split('\n').at(-1)));try{resolve(JSON.parse(Buffer.concat(out)));}catch{reject(Error('PPTX could not be read.'));}});child.stdin.on('error',()=>{});child.stdin.end(bytes);});
 }
 return {status:'readable',...details,bytes:bytes.length,sha256:require('crypto').createHash('sha256').update(bytes).digest('hex')};
}
async function validate(input){if(typeof input?.data!=='string'||input.data.length>28*1024*1024)throw Error('Use a file up to 20 MB.');return new Promise((resolve,reject)=>{const worker=new Worker(__filename,{workerData:{name:input.name,data:input.data},resourceLimits:{maxOldGenerationSizeMb:256}});let done=false;const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);worker.terminate();error?reject(error):resolve(result);};const timer=setTimeout(()=>finish(Error('Readability check timed out. Try a smaller file.')),20000);worker.on('message',m=>finish(m.error?Error(m.error):null,m.result));worker.on('error',e=>finish(e));worker.on('exit',code=>{if(!done)finish(Error('File readability check stopped ('+code+').'));});});}
if(!isMainThread)inspect(workerData).then(result=>parentPort.postMessage({result}),e=>parentPort.postMessage({error:'File not accepted: '+e.message}));
module.exports={validate,MAX_BYTES};
