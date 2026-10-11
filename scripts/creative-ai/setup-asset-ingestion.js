'use strict';
// Install from the standard Python package registry into this studio only.
const path=require('path'),fs=require('fs/promises'),{spawn}=require('child_process');
(async()=>{
 const root=path.resolve(__dirname,'../..'),{python}=await require('../../lib/creative-ai/runtime/brands').pdfTools();
 const target=path.join(root,'work/asset-ingestion-deps');await fs.mkdir(target,{recursive:true});
 const child=spawn(python,['-m','pip','install','--upgrade','--target',target,'--only-binary=:all:','-r',path.join(__dirname,'asset-ingestion-requirements.txt')],{stdio:'inherit'});
 child.once('error',e=>{console.error(e.message);process.exitCode=1;});child.once('exit',code=>{process.exitCode=code||0;});
})().catch(e=>{console.error(e.message);process.exitCode=1;});
