'use strict';
const path=require('node:path'),fs=require('node:fs/promises'),{Queue}=require('../../lib/creative-ai/local-queue/store.cjs');
const root=path.resolve(__dirname,'../..'),arg=k=>{const i=process.argv.indexOf(k);return i<0?undefined:process.argv[i+1];};
const dir=path.resolve(arg('--dir')||path.join(root,'work/local-workers-20261103'));
(async()=>{
 if(process.argv.includes('--import')){const file=path.resolve(arg('--import')),m=JSON.parse(await fs.readFile(file));const q=new Queue(path.join(dir,'queue.sqlite'));q.import(m.rows);q.meta('source',file);q.close();console.log('Imported '+m.rows.length+' rows without changing historical artifacts.');return;}
 if(process.argv.includes('--status')){const q=new Queue(path.join(dir,'queue.sqlite'));const rows=q.rows(),owner=q.meta('owner');console.log(JSON.stringify({owner,supervisorAlive:require('../../lib/creative-ai/local-queue/supervisor.cjs').alive(owner?.pid),counts:rows.reduce((a,r)=>(a[r.state]=(a[r.state]||0)+1,a),{}),halt:q.meta('halt'),lastStop:q.meta('lastStop')},null,2));q.close();return;}
 if(process.argv.includes('--wait-for-owner')){for(;;){const q=new Queue(path.join(dir,'queue.sqlite')),owner=q.meta('owner');q.close();if(!require('../../lib/creative-ai/local-queue/supervisor.cjs').alive(owner?.pid))break;await new Promise(r=>setTimeout(r,3000));}}
 await require('../../lib/creative-ai/local-queue/supervisor.cjs').run({dir,projectRoot:root,worker:path.join(__dirname,'local-queue-worker.cjs'),limit:5,maxJobs:arg('--max-jobs')?Number(arg('--max-jobs')):Infinity});
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
