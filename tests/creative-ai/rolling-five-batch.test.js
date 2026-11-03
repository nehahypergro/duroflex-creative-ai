'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{run}=require('../../lib/creative-ai/runtime/unit-scheduler');
test('five rolling slots refill immediately after success or failure without waiting for the other four',async()=>{
 const started=[],gates=new Map();let active=0,peak=0;
 const done=run(Array.from({length:8},(_,i)=>({conceptId:String(i),placementId:String(i)})),{limit:5,execute:async r=>{const id=Number(r.conceptId);started.push(id);active++;peak=Math.max(peak,active);try{return await new Promise((resolve,reject)=>gates.set(id,{resolve,reject}));}finally{active--;}}});
 const tick=()=>new Promise(r=>setImmediate(r));await tick();assert.deepEqual(started,[0,1,2,3,4]);gates.get(2).reject(Error('Isolated failure'));await tick();assert.deepEqual(started,[0,1,2,3,4,5]);gates.get(5).resolve('finished');await tick();assert.deepEqual(started,[0,1,2,3,4,5,6]);gates.get(0).resolve('finished');await tick();assert.deepEqual(started,[0,1,2,3,4,5,6,7]);for(const i of [1,3,4,6,7])gates.get(i).resolve('finished');const results=await done;assert.equal(results[2].status,'rejected');assert.equal(results.filter(r=>r.status==='fulfilled').length,7);assert.equal(peak,5);assert.equal(active,0);
});
