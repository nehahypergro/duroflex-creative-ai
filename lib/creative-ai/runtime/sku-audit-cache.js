'use strict';
const fs=require('./artifact-fs'),path=require('path'),crypto=require('crypto');
const VERSION=1,hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function binding({intake,profile,request,validatorVersion=1}){
 return {version:VERSION,validatorVersion,brandId:intake.brandId,productId:profile.id,snapshot:profile.snapshot,pageHash:profile.pageHash,variant:intake.productProtection?.variant||{id:intake.productVariantId||null},instructions:request.instructions,schema:request.schema,input:request.input,images:request.images.map(a=>({id:a.id,hash:hash(a.imageData)}))};
}
async function prepare({intake,profile,request,productLibrary,validatorVersion}){
 if(!intake.brandId||!profile||typeof productLibrary?.dir!=='function')return null;
 if(profile.brandId!==intake.brandId||!/^product-[a-f0-9]{20}$/.test(profile.id)||!/^snapshot-[a-zA-Z0-9-]+$/.test(profile.snapshot))throw Error('Invalid product audit cache scope.');
 const bindings=binding({intake,profile,request,validatorVersion}),key=hash(bindings),dir=path.join(productLibrary.dir(intake.brandId),profile.id,profile.snapshot,'audit-cache'),file=path.join(dir,key+'.json');
 let entry;try{entry=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(entry){
  if(entry.key!==key||entry.bindingsHash!==hash(bindings)||entry.analysisHash!==hash(entry.analysis)||entry.brandId!==intake.brandId)throw Error('Saved product audit changed; refresh the product snapshot.');
  request.validate(entry.analysis);
  if(entry.analysis.identityStatus!=='matched'||!entry.analysis.images.some(a=>a.kind==='product'&&a.confidence>=0.7))throw Error('Saved product audit is not eligible for reuse.');
 }
 return {analysis:entry?.analysis,metadata:{version:VERSION,status:entry?'hit':'miss',key,brandId:intake.brandId,productId:profile.id,snapshot:profile.snapshot,createdByJobId:entry?.createdByJobId||null,auditedAt:entry?.auditedAt||null},async save(analysis,jobId){
  request.validate(analysis);if(analysis.identityStatus!=='matched'||!analysis.images.some(a=>a.kind==='product'&&a.confidence>=0.7))return;
  const body={version:VERSION,key,brandId:intake.brandId,bindingsHash:hash(bindings),analysisHash:hash(analysis),analysis,createdByJobId:jobId||null,auditedAt:new Date().toISOString()};
  await fs.mkdir(dir,{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.pending';await fs.writeFile(temp,JSON.stringify(body)+'\n');await fs.rename(temp,file);
 }};
}
module.exports={prepare,binding,hash,VERSION};
