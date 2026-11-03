'use strict';
const fs=require('node:fs/promises'),fss=require('node:fs'),path=require('node:path'),os=require('node:os'),{fork,spawn}=require('node:child_process');
const {Queue}=require('./store.cjs'),{acquire}=require('../runtime/file-lock');
const alive=pid=>{if(!Number.isInteger(pid)||pid<1)return false;try{process.kill(pid,0);return true;}catch(e){return e.code!=='ESRCH';}};
async function run({dir,worker,projectRoot,args=[],limit=5,heartbeatMs=5000,staleMs=90000,maxAttempts=2,maxRssBytes=3.5*1024**3,memoryGraceMs=30000,aggregateRssBytes=12*1024**3,workerHeapMb=1536,keepAwake=true,maxJobs=Infinity}){
 if(!Number.isInteger(limit)||limit<1||limit>5)throw Error('Local worker limit must be 1–5');
 await fs.mkdir(dir,{recursive:true});const release=await acquire(path.join(dir,'.supervisor.lock'),{timeoutMs:100});const q=new Queue(path.join(dir,'queue.sqlite'));const children=new Map();let stopping=false,settled=false,admitting=false,started=0,fatal=null,awake;
 // No credentials in arguments, logs, or queue rows. Config is loaded only by workers.
 if(keepAwake&&process.platform==='darwin'){awake=spawn('/usr/bin/caffeinate',['-i','-w',String(process.pid)],{stdio:'ignore'});awake.on('error',e=>q.event(null,'sleep-prevention-error',{error:e.message}));}
 q.meta('owner',{pid:process.pid,host:os.hostname(),startedAt:new Date().toISOString()});
 const stop=()=>{stopping=true;for(const {child}of children.values())child.kill('SIGTERM');};
 process.on('SIGTERM',stop);process.on('SIGINT',stop);
 const publish=async()=>{const rows=q.rows(),counts={};for(const r of rows)counts[r.state]=(counts[r.state]||0)+1;
 const value={updatedAt:new Date().toISOString(),pid:process.pid,status:stopping?'stopped':q.meta('halt')?'held':settled?'settled':'running',concurrency:limit,active:children.size,counts,halt:q.meta('halt'),jobs:rows.map(({key,state,job_id,heartbeat,pid,error,result,payload})=>({key,name:payload.name,brand:payload.brand,state,jobId:job_id,pid,heartbeat,error,result}))};
 await fs.writeFile(path.join(dir,'status.json.tmp'),JSON.stringify(value,null,2)+'\n');await fs.rename(path.join(dir,'status.json.tmp'),path.join(dir,'status.json'));
 await fs.writeFile(path.join(dir,'SUMMARY.md'),'# Local isolated-worker batch\n\nUpdated: '+value.updatedAt+' (UTC)\n\n'+Object.entries(counts).map(([k,v])=>'- '+k+': '+v).join('\n')+'\n\n'+(value.halt||'Five rolling project slots; shared provider/render gates retained.')+'\n\n'+rows.filter(r=>r.error).map(r=>'- '+r.payload.name+': '+r.error).join('\n')+'\n');};
 function orphan(r){if(alive(r.pid)){// Never replace a live owner merely because its heartbeat is old.
   q.update(r.key,{state:'recovering',error:'Waiting for previous worker to exit; no replacement dispatched.'});return false;
  }q.update(r.key,{state:r.attempts>=maxAttempts?'held':'recovering',pid:null,error:'Worker stopped; saved requests will be checked before recovery.'});q.event(r.key,'orphan-recovered',{previousPid:r.pid});return true;}
 for(const r of q.rows())if(['starting','running','recovering'].includes(r.state)&&r.pid)orphan(r);
 // A starting row may have crashed between claim and spawn.
 for(const r of q.rows())if(r.state==='starting'&&!r.pid)q.update(r.key,{state:'recovering'});
 const launch=r=>{
  const log=fss.openSync(path.join(dir,r.key+'-attempt-'+r.attempts+'.log'),'a');
  const child=fork(worker,[...args,'--queue-dir',dir,'--key',r.key],{execArgv:['--max-old-space-size='+workerHeapMb],stdio:['ignore',log,log,'ipc']});fss.closeSync(log);
  children.set(r.key,{child,started:Date.now(),admitted:false,rss:0,overMemorySince:null});admitting=true;q.update(r.key,{pid:child.pid,heartbeat:Date.now()});q.event(r.key,'worker-started',{pid:child.pid});
  child.on('message',m=>{try{if(!m||typeof m!=='object')return;
   const current=q.get(r.key);if(current.pid!==child.pid)return;
   if(m.type==='heartbeat'){q.update(r.key,{heartbeat:Date.now()});const entry=children.get(r.key);entry.rss=Number(m.rss)||0;const metric=q.meta('memory:'+r.key)||{};q.meta('memory:'+r.key,{rss:entry.rss,peakRss:Math.max(metric.peakRss||0,entry.rss),heapUsed:m.heapUsed||null,at:new Date().toISOString()});if(entry.rss>maxRssBytes){entry.overMemorySince??=Date.now();if(Date.now()-entry.overMemorySince>=memoryGraceMs){q.event(r.key,'memory-limit',{rss:m.rss,sustainedMs:Date.now()-entry.overMemorySince});child.kill('SIGTERM');}}else entry.overMemorySince=null;}
   if(m.type==='admitted'){q.update(r.key,{job_id:m.jobId||current.job_id,state:'running',heartbeat:Date.now()});children.get(r.key).admitted=true;admitting=false;q.event(r.key,'admitted',{jobId:m.jobId});}
   if(m.type==='result'){const valid=['finished','partial','failed','needs-input','held','waiting-budget'];if(!valid.includes(m.state))throw Error('Invalid worker outcome');q.update(r.key,{state:m.state,error:m.error||null,result:m.result||null});q.event(r.key,'result',m);if(m.halt)q.meta('halt',m.halt);}
  }catch(e){fatal=e;stop();}});
  child.on('error',e=>q.event(r.key,'spawn-error',{error:e.message}));
  child.on('exit',async(code,signal)=>{const entry=children.get(r.key);if(!entry?.admitted)admitting=false;const row=q.get(r.key);q.event(r.key,'worker-exited',{code,signal});if(['starting','running','recovering'].includes(row.state))q.update(r.key,{state:row.attempts>=maxAttempts?'held':'recovering',error:'Worker exited before completion ('+(signal||code)+'); checkpoint inspection required.'});q.update(r.key,{pid:null});try{const latest=q.get(r.key);if(projectRoot&&['recovering','held'].includes(latest.state))await require('./job-state.cjs').interrupted(projectRoot,latest.job_id,latest.state,latest.error);}catch(e){fatal=e;}finally{children.delete(r.key);}});
 };
 try{while(true){
  for(const r of q.rows())if(r.state==='recovering'&&r.pid&&!children.has(r.key)&&!alive(r.pid))orphan(r);
  for(const [key,{child}]of children){const r=q.get(key);if(Date.now()-r.heartbeat>staleMs){q.event(key,'heartbeat-expired',{pid:child.pid});child.kill('SIGKILL');}}
  const control=await fs.readFile(path.join(dir,'control.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return {};throw e;});
  const external=q.rows().filter(r=>r.pid&&!children.has(r.key)&&alive(r.pid)).length;
  if(!stopping&&!admitting&&!q.meta('halt')&&!control.pauseAdmissions&&children.size+external<limit&&[...children.values()].reduce((n,e)=>n+e.rss,0)<aggregateRssBytes&&started<maxJobs){const r=q.claim();if(r){if(r.pid)throw Error('Refusing to replace a live worker');launch(r);started++;}}
  await publish();if(fatal)throw fatal;
  const waiting=q.rows().some(r=>['pending','recovering','starting','running'].includes(r.state));
  if(!children.size&&!external&&(stopping||!waiting||q.meta('halt')||started>=maxJobs))break;
  await new Promise(resolve=>setTimeout(resolve,Math.min(heartbeatMs,1000)));
 }settled=true;q.meta('lastStop',{at:new Date().toISOString(),reason:stopping?'signal':q.meta('halt')?'held':started>=maxJobs?'test-limit':'settled'});await publish();return q.rows();
 }finally{stop();if(children.size)await new Promise(resolve=>setTimeout(resolve,1000));for(const {child}of children.values())child.kill('SIGKILL');while(children.size)await new Promise(resolve=>setTimeout(resolve,20));awake?.kill();process.off('SIGTERM',stop);process.off('SIGINT',stop);q.close();await release();}
}
module.exports={run,alive};
