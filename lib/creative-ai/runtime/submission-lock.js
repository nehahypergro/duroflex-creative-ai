'use strict';
const {withLock}=require('./file-lock'),path=require('path'),crypto=require('crypto');
const queues=new WeakMap();
module.exports=async function submissionLock(runtime,key,fn){
 const hash=crypto.createHash('sha256').update(key).digest('hex');
 if(runtime.store.root)return withLock(path.join(runtime.store.root,'.submission-'+hash+'.lock'),fn,{timeoutMs:120000});
 // In-memory adapters/tests still serialize matching submissions.
 let map=queues.get(runtime);if(!map)queues.set(runtime,map=new Map());const prior=map.get(hash)||Promise.resolve(),next=prior.catch(()=>{}).then(fn);map.set(hash,next);try{return await next;}finally{if(map.get(hash)===next)map.delete(hash);}
};
