'use strict';
// Same-host, shared-filesystem coordination. Never steal a live owner by age:
// a slow provider response must not authorize a duplicate paid request.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {setTimeout:delay}=require('node:timers/promises');
function busy(file){const e=Error('Timed out waiting for shared writer: '+path.basename(file)+'. The owner was not interrupted.');e.code='SHARED_WRITER_BUSY';return e;}
async function recoverDeadOwner(file){
 let names;try{names=await fs.readdir(file);}catch(e){if(['ENOENT','ENOTDIR'].includes(e.code))return;throw e;}
 // Empty/legacy/malformed locks need inspection; absence of proof is not death.
 if(names.length!==1||!/^owner-[a-f0-9-]+\.json$/.test(names[0]))return;
 const marker=path.join(file,names[0]);let owner;try{owner=JSON.parse(await fs.readFile(marker,'utf8'));}catch(e){if(e.code==='ENOENT'||e instanceof SyntaxError)return;throw e;}
 if(!Number.isInteger(owner.pid)||owner.pid<=0)return;
 const identity=require('./process-identity'),bootId=await identity.bootId(),sameBoot=!!bootId&&owner.bootId===bootId;
 // A boot UUID survives hostname changes and distinguishes separate machines.
 if(!sameBoot&&owner.host!==os.hostname())return;
 // Different boots on the same hostname cannot prove a remote machine is dead.
 if(owner.bootId&&bootId&&!sameBoot)return;
 let dead=false;try{process.kill(owner.pid,0);}catch(e){if(e.code==='ESRCH')dead=true;else return;}
 if(!dead&&sameBoot&&owner.processStart){const current=await identity.started(owner.pid);dead=!!current&&current!==owner.processStart;}
 if(!dead)return;
 // Only the contender that removes THIS unique dead-owner marker may rmdir.
 // A second contender cannot remove a replacement owner's different marker.
 try{await fs.unlink(marker);}catch(e){if(e.code==='ENOENT')return;throw e;}
 try{await fs.rmdir(file);}catch(e){if(!['ENOENT','ENOTEMPTY','EEXIST'].includes(e.code))throw e;}
}
async function acquire(file,{timeoutMs=30000,signal}={}){
 const deadline=Date.now()+timeoutMs;await fs.mkdir(path.dirname(file),{recursive:true});
 while(true){signal?.throwIfAborted();try{await fs.mkdir(file);break;}catch(e){if(e.code!=='EEXIST')throw e;}
 await recoverDeadOwner(file);if(Date.now()>=deadline)throw busy(file);
 await delay(Math.min(15+Math.floor(Math.random()*25),Math.max(1,deadline-Date.now())),undefined,{signal});
 }
 const token=crypto.randomUUID(),marker=path.join(file,'owner-'+token+'.json');
 try{await fs.writeFile(marker,JSON.stringify({pid:process.pid,host:os.hostname(),...await require('./process-identity').self(),token,createdAt:new Date().toISOString()}),{flag:'wx'});}catch(e){await fs.rmdir(file).catch(()=>{});throw e;}
 let released=false;return async()=>{if(released)return;released=true;await fs.unlink(marker);await fs.rmdir(file);};
}
async function withLock(file,fn,options){const release=await acquire(file,options);try{return await fn();}finally{await release();}}
module.exports={acquire,withLock};
