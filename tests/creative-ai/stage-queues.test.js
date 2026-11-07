'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {StageQueues}=require('../../lib/creative-ai/runtime/stage-queues');
const tick=()=>new Promise(r=>setImmediate(r));
test('slow images do not occupy planning workers; lanes refill and isolate failures',async()=>{
 let release;const slow=new Promise(r=>release=r),events=[],failures=[];
 const q=new StageQueues({planningLimit:1,imageLimit:1,execute:async(id,phase)=>{events.push(phase+id);if(phase==='planning'){if(id==='bad')throw Error('bad plan');return 'image';}if(id==='a')await slow;},failure:async id=>failures.push(id)});
 q.add('a');q.add('b');q.add('bad');q.add('c');q.add('a');
 for(let n=0;n<10;n++)await tick();assert.ok(events.includes('planningc'));assert.deepEqual(events.filter(e=>e.startsWith('image')),['imagea']);assert.deepEqual(failures,['bad']);
 release();for(let n=0;n<10;n++)await tick();assert.deepEqual(events.filter(e=>e.startsWith('image')),['imagea','imageb','imagec']);assert.equal(q.known.size,0);
});
test('durable local queue claims independent stages and preserves held work',()=>{
 const {Queue}=require('../../lib/creative-ai/local-queue/store.cjs'),q=new Queue(':memory:');
 try{q.import([{key:'a',state:'pending'},{key:'b',state:'pending'},{key:'hold',state:'held'}]);q.meta('phase:a','image');q.update('a',{state:'image-pending'});assert.equal(q.claim({phase:'planning'}).key,'b');assert.equal(q.claim({phase:'image'}).key,'a');assert.equal(q.claim({phase:'image'}),null);assert.equal(q.get('hold').state,'held');}finally{q.close();}
});
test('isolated process workers hand off durably and free planning slots while images run',{timeout:15000},async()=>{
 const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{Queue}=require('../../lib/creative-ai/local-queue/store.cjs');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'stage-workers-'));
 try{
 const worker=path.join(dir,'worker.cjs');await fs.writeFile(worker,`const fs=require('node:fs');const arg=k=>process.argv[process.argv.indexOf(k)+1],dir=arg('--queue-dir'),key=arg('--key'),phase=arg('--phase');process.send({type:'admitted',jobId:key});fs.appendFileSync(dir+'/events',phase+':'+key+'\\n');setTimeout(()=>process.send(phase==='planning'?{type:'handoff'}:{type:'result',state:'finished'},()=>process.disconnect()),phase==='image'?300:10);`);
 const q=new Queue(path.join(dir,'queue.sqlite'));q.import(['a','b','c'].map(key=>({key,state:'pending'})));q.close();
 const rows=await require('../../lib/creative-ai/local-queue/supervisor.cjs').run({dir,worker,limit:2,stageLimits:{planning:1,image:1},heartbeatMs:10,keepAwake:false,workerHeapMb:128});
 assert.ok(rows.every(r=>r.state==='finished'));const events=(await fs.readFile(path.join(dir,'events'),'utf8')).trim().split('\n');assert.equal(events.length,6);assert.ok(events.indexOf('planning:c')<events.indexOf('image:b'));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
