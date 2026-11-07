'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
async function inspect(file){
 const stat=await fs.lstat(file);if(stat.isSymbolicLink())throw Error('Symlink locks require manual inspection');
 const names=stat.isDirectory()?(await fs.readdir(file)).sort():[],contents=stat.isDirectory()?await Promise.all(names.map(async name=>({name,text:await fs.readFile(path.join(file,name),'utf8')}))):[{name:'legacy',text:await fs.readFile(file,'utf8')}];
 let owner;try{if(names.length===1&&/^owner-[a-f0-9-]+\.json$/.test(names[0]))owner=JSON.parse(contents[0].text);}catch{}
 const boot=await require('./process-identity').bootId(),local=owner&&(owner.bootId&&boot?owner.bootId===boot:owner.host===os.hostname());let state='unverified';
 if(local&&Number.isInteger(owner.pid)&&owner.pid>0){try{process.kill(owner.pid,0);state='live';if(owner.processStart){const start=await require('./process-identity').started(owner.pid);if(start&&start!==owner.processStart)state='dead';}}catch(e){if(e.code==='ESRCH')state='dead';}}
 const snapshot={dev:stat.dev,ino:stat.ino,mtime:stat.mtimeMs,contents},fingerprint=crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');return {file:path.resolve(file),state,owner:owner||null,fingerprint};
}
async function quarantine(file,{fingerprint,writersStopped=false}={}){
 if(!writersStopped)throw Error('Stop all writers using this lock before maintenance.');
 const release=await require('./file-lock').acquire(file+'.maintenance.lock',{timeoutMs:100});
 try{const current=await inspect(file);if(current.fingerprint!==fingerprint)throw Error('Lock changed; inspect it again.');if(current.state==='live')throw Error('Refusing to remove a live owner lock.');
 const destination=file+'.quarantine-'+crypto.randomUUID();await fs.rename(file,destination);await fs.writeFile(destination+'.audit.json',JSON.stringify({...current,at:new Date().toISOString(),writersStopped:true},null,2));return {quarantined:destination};
 }finally{await release();}
}
module.exports={inspect,quarantine};
