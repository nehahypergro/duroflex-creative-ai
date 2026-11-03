'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Gate}=require('../../lib/creative-ai/runtime/image-upload');
for(let n=1;n<=10;n++)test('bounded image admission and cancellation variation '+n,async()=>{
 const gate=new Gate(1,{maxPending:2});let finish;const first=gate.run(()=>new Promise(resolve=>{finish=resolve;}));await new Promise(r=>setImmediate(r));
 const c=new AbortController();let cancelledDispatches=0;
 const queued=gate.run(()=>cancelledDispatches++,{signal:c.signal});
 const next=gate.run(()=>n);
 await assert.rejects(gate.run(()=>assert.fail('overflow dispatched')),/queue|capacity/i);
 c.abort();await assert.rejects(queued,{name:'AbortError'});
 const replacement=gate.run(()=>n+1);finish(0);
 assert.deepEqual(await Promise.all([first,next,replacement]),[0,n,n+1]);
 assert.equal(cancelledDispatches,0);assert.equal(gate.active,0);assert.equal(gate.waiters.length,0);
});
