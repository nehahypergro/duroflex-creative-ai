'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),batches=require('../../lib/creative-ai/runtime/planning-batches');
test('bounded planning makes progress past a slow batch and preserves other batches after one fails',async()=>{
 const base={concepts:[{conceptId:'continuity'},{conceptId:'exploration'}],placements:Array.from({length:12},(_,i)=>({id:'slot-'+i}))},saved=new Map(),cache={read:async k=>saved.get(k),save:async(k,v)=>saved.set(k,v)};
 let release,second,active=0,peak=0;const hold=new Promise(r=>release=r),started=new Promise(r=>second=r);let fail=true,calls=0;
 const request=async part=>{calls++;peak=Math.max(peak,++active);try{if(part.placements[0].id==='slot-0')await hold;else second();if(fail&&part.placements[0].id==='slot-3')throw Error('Synthetic disconnected batch');return {version:1,decks:part.concepts.flatMap(c=>part.placements.map(p=>({conceptId:c.conceptId,placementId:p.id,fields:[]})))};}finally{active--;}};
 const pending=batches.run(base,'decks',request,cache,{concurrency:2});const outcome=pending.catch(e=>e);const overlapped=await Promise.race([started.then(()=>true),new Promise(r=>setTimeout(()=>r(false),150))]);release();assert.equal(overlapped,true,'second batch must start before slow first batch finishes');assert.match((await outcome).message,/disconnected/);assert.equal(peak,2);assert.equal(saved.size,3);
 fail=false;const result=await batches.run(base,'decks',request,cache,{concurrency:2});assert.equal(calls,5);assert.equal(result.decks.length,24);assert.equal(result.decks[0].placementId,'slot-0');
});
