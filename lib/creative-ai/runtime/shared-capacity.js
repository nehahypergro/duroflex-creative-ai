'use strict';
const path=require('node:path'),{setTimeout:delay}=require('node:timers/promises'),{acquire,withLock}=require('./file-lock'),fs=require('node:fs/promises');
async function slot(root,limit,signal,deadline){
 while(true){signal?.throwIfAborted();for(let i=0;i<limit;i++){try{return await acquire(path.join(root,String(i)),{timeoutMs:0,signal});}catch(e){if(e.code!=='SHARED_WRITER_BUSY')throw e;}}
 if(Date.now()>=deadline){const e=Error('Shared provider capacity wait expired before dispatch');e.code='PROVIDER_CAPACITY_TIMEOUT';throw e;}
 await delay(Math.min(25+Math.floor(Math.random()*25),Math.max(1,deadline-Date.now())),undefined,{signal});
 }
}
async function run(root,kind,limit,fn,{signal,timeoutMs=30000,maxPending=64}={}){
 if(!/^[a-z-]+$/.test(kind)||!Number.isInteger(limit)||limit<1||limit>16||!Number.isInteger(maxPending)||maxPending<1||maxPending>1024)throw Error('Invalid shared capacity policy');
 const dir=path.join(root,kind),policyFile=path.join(dir,'policy.json');
 await withLock(path.join(dir,'.policy.lock'),async()=>{let policy;try{policy=JSON.parse(await fs.readFile(policyFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;await fs.writeFile(policyFile,JSON.stringify({limit,maxPending}));return;}if(policy.limit!==limit||policy.maxPending!==maxPending)throw Error('Shared capacity configuration differs between workers; drain and reconfigure the capacity directory before changing limits.');},{signal});
 let leaveQueue;try{leaveQueue=await slot(path.join(dir,'waiting'),maxPending,signal,Date.now());}catch(e){if(e.code==='PROVIDER_CAPACITY_TIMEOUT'){e.code='PROVIDER_QUEUE_FULL';e.message='Shared provider queue is full; no request was dispatched';}throw e;}
 let release;try{release=await slot(path.join(dir,'active'),limit,signal,Date.now()+timeoutMs);await leaveQueue();leaveQueue=null;return await fn();}finally{if(leaveQueue)await leaveQueue();if(release)await release();}
}
module.exports={run};
