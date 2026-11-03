'use strict';
// Runs only isolated fixtures. The offline bootstrap rejects provider traffic and writes to live output.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'../..'),baseline=JSON.parse(await fs.readFile(path.join(root,'work/source-baseline.json'),'utf8').catch(e=>{if(e.code!=='ENOENT')throw e;return JSON.stringify({source:root,hashes:{'server.js':null,'lib/creative-ai/runtime/store.js':null,'lib/creative-ai/runtime/http.js':null,'public/creative-ai/studio.js':null}});}));
 const source=process.env.ADMIN_SOURCE_ROOT||baseline.source,stamp=new Date().toISOString().replace(/[:.]/g,'-'),out=path.join(root,'work/admin-evidence','readiness-'+stamp);await fs.mkdir(out,{recursive:true});
 const env={...process.env,NODE_PATH:process.env.NODE_PATH||path.join(root,'work/admin-deps/node_modules'),MONGOMS_DOWNLOAD_DIR:process.env.MONGOMS_DOWNLOAD_DIR||path.join(root,'work/mongodb-binaries'),ADMIN_SOURCE_ROOT:source};
 const monitored=[...Object.keys(baseline.hashes),'public/creative-ai/studio-model.js','public/creative-ai/studio-data.js','public/creative-ai/studio.css','public/creative-ai/canvas-model.js','lib/creative-ai/runtime/delivery-packages.js'];
 async function fingerprints(){return Object.fromEntries(await Promise.all(monitored.map(async f=>[f,crypto.createHash('sha256').update(await fs.readFile(path.join(source,f))).digest('hex')])));}
 const before=await fingerprints(),results=[];
 async function run(name,files){const log=path.join(out,name+'.txt'),handle=await fs.open(log,'w');let exitCode;try{exitCode=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--require','./tests/creative-ai/offline-bootstrap.cjs','--test',...files],{cwd:root,env,stdio:['ignore',handle.fd,handle.fd]});child.once('error',reject);child.once('close',resolve);});}finally{await handle.close();}const text=await fs.readFile(log,'utf8'),count=key=>Number(text.match(new RegExp('(?:ℹ|#) '+key+' (\\d+)'))?.[1]||0);const result={name,exitCode,tests:count('tests'),passed:count('pass'),failed:count('fail'),log};results.push(result);console.log(JSON.stringify(result));return exitCode===0;}
 const admin=(await fs.readdir(path.join(root,'tests/admin'))).filter(f=>f.endsWith('.test.js')).map(f=>'tests/admin/'+f);
 await run('core',[...admin,'tests/group-workspace.test.js',...['studio-edited-delivery','client-language','studio-progress','studio-collections','studio-navigation','studio-restart'].map(n=>'tests/creative-ai/'+n+'.test.js')]);
 await run('browser',['tests/creative-ai/studio-ui-browser.test.js']);
 const after=await fingerprints(),unchanged=JSON.stringify(before)===JSON.stringify(after),report={createdAt:new Date().toISOString(),isolatedPilot:root,readOnlySource:source,sourceUnchangedDuringVerification:unchanged,sourceBefore:before,sourceAfter:after,paidCallsAllowed:false,results,passed:unchanged&&results.every(r=>r.exitCode===0)};
 await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2));console.log('Verification: '+path.join(out,'verification.json'));if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
