'use strict';
const path=require('node:path'),{setTimeout:delay}=require('node:timers/promises'),{acquire}=require('./file-lock'),fs=require('node:fs/promises');
async function slot(root,limit,signal,deadline){
 while(true){signal?.throwIfAborted();for(let i=0;i<limit;i++){try{return await acquire(path.join(root,String(i)),{timeoutMs:0,signal});}catch(e){if(e.code!=='SHARED_WRITER_BUSY')throw e;}}
 if(Date.now()>=deadline){const e=Error('Shared provider capacity wait expired before dispatch');e.code='PROVIDER_CAPACITY_TIMEOUT';throw e;}
 await delay(Math.min(25+Math.floor(Math.random()*25),Math.max(1,deadline-Date.now())),undefined,{signal});
 }
}
async function run(root,kind,limit,fn,{signal,timeoutMs=30000,maxPending=64}={}){
 if(!/^[a-z-]+$/.test(kind)||!Number.isInteger(limit)||limit<1||limit>16||!Number.isInteger(maxPending)||maxPending<1||maxPending>1024)throw Error('Invalid shared capacity policy');
 const dir=path.join(root,kind),policyFile=path.join(dir,'policy.json');
 // Publish a complete immutable policy atomically. Reading it never needs an
 // owner lock, so an abandoned legacy .policy.lock cannot stall every render.
 await fs.mkdir(dir,{recursive:true});signal?.throwIfAborted();
 const candidate=path.join(dir,'.policy-'+require('node:crypto').randomUUID()+'.pending');
 try{await fs.writeFile(candidate,JSON.stringify({limit,maxPending}),{flag:'wx'});try{await fs.link(candidate,policyFile);}catch(e){if(e.code!=='EEXIST')throw e;}}
 finally{await fs.unlink(candidate).catch(e=>{if(e.code!=='ENOENT')throw e;});}
 const policy=JSON.parse(await fs.readFile(policyFile,'utf8'));
 if(policy.limit!==limit||policy.maxPending!==maxPending)throw Error('Shared capacity configuration differs between workers; drain and reconfigure the capacity directory before changing limits.');
 signal?.throwIfAborted();
 let leaveQueue;try{leaveQueue=await slot(path.join(dir,'waiting'),maxPending,signal,Date.now());}catch(e){if(e.code==='PROVIDER_CAPACITY_TIMEOUT'){e.code='PROVIDER_QUEUE_FULL';e.message='Shared provider queue is full; no request was dispatched';}throw e;}
 let release;try{release=await slot(path.join(dir,'active'),limit,signal,Date.now()+timeoutMs);await leaveQueue();leaveQueue=null;return await fn();}finally{if(leaveQueue)await leaveQueue();if(release)await release();}
}
// Change a saved limit only while nothing holds or waits for a slot (8 Nov 2026). The
// Studio calls this at startup, when it reads .env, so a changed limit takes effect on
// restart; run() keeps refusing a mismatch while work is in flight.
async function reconfigure(root,kind,limit){
 if(!/^[a-z-]+$/.test(kind)||!Number.isInteger(limit)||limit<1||limit>16)throw Error('Invalid shared capacity policy');
 const dir=path.join(root,kind),policyFile=path.join(dir,'policy.json');
 let current;try{current=JSON.parse(await fs.readFile(policyFile,'utf8'));}catch(e){if(e.code==='ENOENT')return {changed:false,missing:true,to:limit};throw e;}
 if(current.limit===limit)return {changed:false,from:current.limit,to:limit};
 for(const sub of ['active','waiting']){const entries=await fs.readdir(path.join(dir,sub)).catch(e=>{if(e.code==='ENOENT')return [];throw e;});if(entries.some(name=>!name.startsWith('.')))return {changed:false,busy:true,from:current.limit,to:limit};}
 const candidate=path.join(dir,'.policy-'+require('node:crypto').randomUUID()+'.pending');
 await fs.writeFile(candidate,JSON.stringify({...current,limit}),{flag:'wx'});
 try{await fs.rename(candidate,policyFile);}finally{await fs.unlink(candidate).catch(()=>{});}
 return {changed:true,from:current.limit,to:limit};
}
module.exports={run,reconfigure};
