'use strict';
const fs=require('node:fs'),path=require('node:path');
const arg=k=>process.argv[process.argv.indexOf(k)+1],dir=arg('--queue-dir'),key=arg('--key');
const {Queue}=require('../../../lib/creative-ai/local-queue/store.cjs');const q=new Queue(path.join(dir,'queue.sqlite')),r=q.get(key);q.close();
const send=m=>new Promise(resolve=>process.send(m,resolve));
process.on('disconnect',()=>process.exit(75));
(async()=>{
 const timer=setInterval(()=>send({type:'heartbeat',rss:process.memoryUsage().rss}),20);
 await send({type:'admitted',jobId:'fixture-'+key});
 if(r.payload.hang&&r.attempts===1){clearInterval(timer);setInterval(()=>{},1000);return;}
 const checkpoint=path.join(dir,key+'.checkpoint');
 if(r.payload.ambiguous){if(!fs.existsSync(checkpoint)){fs.writeFileSync(checkpoint,'reserved-no-response');process.kill(process.pid,'SIGKILL');return;}await send({type:'result',state:'held',error:'Unresolved paid request; no duplicate dispatch'});}
 else {
  if(!fs.existsSync(checkpoint)){fs.appendFileSync(path.join(dir,'dispatch.jsonl'),JSON.stringify({key,brand:r.payload.brand})+'\n');fs.writeFileSync(checkpoint,'saved-output');}
  if(r.payload.crash&&r.attempts===1){process.kill(process.pid,'SIGKILL');return;}
  const work=async()=>{if(r.payload.capacity)fs.appendFileSync(path.join(dir,'capacity.jsonl'),JSON.stringify({key,type:'enter'})+'\n');await new Promise(resolve=>setTimeout(resolve,r.payload.delay||100));if(r.payload.capacity)fs.appendFileSync(path.join(dir,'capacity.jsonl'),JSON.stringify({key,type:'exit'})+'\n');};if(r.payload.capacity)await require('../../../lib/creative-ai/runtime/shared-capacity').run(path.join(dir,'provider'),'image',2,work,{timeoutMs:10000});else await work();
  await send({type:'result',state:r.payload.fail?'failed':'finished',result:{brand:r.payload.brand,checkpoint:'reused'}});
 }
 clearInterval(timer);process.disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
