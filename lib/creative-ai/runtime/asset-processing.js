'use strict';
const fs=require('./artifact-fs'),path=require('path'),crypto=require('crypto'),exec=require('util').promisify(require('child_process').execFile);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const supported=['ttf','otf','woff','woff2','psd','ai','mp4','mov','webm','mp3','wav','m4a'];
async function processAsset(library,brandId,assetId,data){
 const brand=await library.brands.read(brandId),a=await library.read(brandId,assetId);
 if(data.brandName!==brand.name)throw Error('Processing must name the asset’s own brand.');
 if(!supported.includes(a.format))throw Error('Export this source as PDF/PNG/SVG and link the export to its original.');
 let source=path.join(library.brands.dir(brandId),a.originalPath),temporary=null;
 if(hash(await fs.readFile(source))!==a.sha256)throw Error('Original asset bytes changed.');
 if(a.processing?.sourceHash===a.sha256)return a;
 const run='processed/'+assetId+'/'+crypto.randomUUID(),dest=path.join(library.brands.dir(brandId),run);
 try{
  if(await require('./cdn-media').receipt(source)){const native=require('fs/promises');try{await native.access(source);}catch(e){if(e.code!=='ENOENT')throw e;temporary=await native.mkdtemp(path.join(require('os').tmpdir(),'creative-ai-media-'));const local=path.join(temporary,'source.'+a.format);await native.writeFile(local,await fs.readFile(source));source=local;}}
  const {python}=await require('./brands').pdfTools();
  await exec(python,[path.join(library.brands.root,'scripts/creative-ai/process-brand-asset.py'),source,dest,a.format],{timeout:120000,maxBuffer:1000000,env:{...process.env,PYTHONPATH:path.join(library.brands.root,'work/asset-ingestion-deps')+(process.env.PYTHONPATH?path.delimiter+process.env.PYTHONPATH:'')}});
  const parsed=JSON.parse(await fs.readFile(path.join(dest,'extraction.json'),'utf8'));
  const previews=[];for(const p of parsed.previews){if(!/^(preview-\d+|waveform)\.png$/.test(p.file))throw Error('Invalid processed preview');const bytes=await fs.readFile(path.join(dest,p.file));await require('sharp')(bytes,{limitInputPixels:40000000}).metadata();await require('./cdn-media').sync(path.join(dest,p.file));previews.push({...p,path:path.join(run,p.file),sha256:hash(bytes)});}
  const processing={version:1,sourceHash:a.sha256,processedAt:new Date().toISOString(),metadata:parsed.metadata,text:parsed.text,limitations:parsed.limitations,previews,indexPath:path.join(run,'extraction.json')};
  await library.brands.update(brandId,b=>{const item=b.assets.find(x=>x.id===assetId);if(item.sha256!==a.sha256)throw Error('Asset changed during extraction');item.processing=processing;item.status='processed-reference';item.trainingNote='Locally extracted metadata and bounded actual previews; '+parsed.limitations.join(' ');b.latestResearchId=null;});
  return library.read(brandId,assetId);
 }catch(e){await fs.rm(dest,{recursive:true,force:true});throw Error('Asset extraction did not complete: '+String(e.stderr||e.message).slice(0,600));}finally{if(temporary)await require('fs/promises').rm(temporary,{recursive:true,force:true});}
}
async function annotate(library,brandId,assetId,data){
 const b=await library.brands.read(brandId),a=await library.read(brandId,assetId);if(data.brandName!==b.name)throw Error('Name the asset’s own brand.');
 if(data.sourceHash!==a.sha256)throw Error('Asset version changed.');
 const transcript=data.transcript;if(transcript!==undefined&&(typeof transcript!=='string'||!transcript.trim()||transcript.length>50000||!['mp3','wav','m4a','mp4','mov','webm'].includes(a.format)))throw Error('A supplied media transcript must be text under 50,000 characters.');
 let linked=null;if(data.exportId){linked=(b.assets||[]).find(x=>x.id===data.exportId)||(b.documents||[]).find(x=>x.id===data.exportId);if(!linked||linked.id===a.id||!(['png','jpg','jpeg','webp','svg','pdf'].includes(linked.format)))throw Error('Choose a PDF or image export from this same brand library.');}
 if(transcript===undefined&&!linked)throw Error('Supply a transcript or a same-brand design export.');
 await library.brands.update(brandId,current=>{const item=current.assets.find(x=>x.id===a.id);item.annotations??=[];item.annotations.push({id:'annotation-'+crypto.randomUUID(),sourceHash:a.sha256,recordedAt:new Date().toISOString(),...(linked?{exportId:linked.id,exportHash:linked.sha256}:{}),...(transcript!==undefined?{transcript,transcriptBasis:'User-supplied transcript; not automatically recognized or verified.'}:{})});current.latestResearchId=null;});return library.read(brandId,assetId);
}
module.exports={processAsset,annotate,supported};
