'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {run}=require('../../lib/creative-ai/runtime/unit-scheduler');
const tick=()=>new Promise(r=>setImmediate(r));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
for(let variation=0;variation<10;variation++)test('output scheduler fills a free slot without waiting for its slow peer: variation '+variation,async()=>{
 const gates=Array.from({length:4+variation},deferred),started=[];let active=0,max=0;
 const records=gates.map((_,i)=>({conceptId:variation%2?'sleepyhead-fixture':'duroflex-fixture',placementId:'format-'+i}));
 const done=run(records,{limit:2,execute:async(r,i)=>{started.push(i);max=Math.max(max,++active);try{return await gates[i].promise;}finally{active--;}}});
 try{await tick();assert.deepEqual(started,[0,1]);gates[1].resolve(1);await tick();assert.deepEqual(started,[0,1,2],'Independent third output must start while first remains slow');}
 finally{gates.forEach((g,i)=>g.resolve(i));await done;}
 assert.equal(max,2);assert.equal(active,0);assert.deepEqual((await done).map(r=>r.value),gates.map((_,i)=>i));assert.equal(new Set(started).size,records.length);
});

test('each carousel uses its own settled opening slide while independent outputs use free capacity',async()=>{
 const records=[['a','first'],['b','first'],['a','second'],['b','second'],['c','standalone']].map(([conceptId,placementId])=>({conceptId,placementId}));
 const plan={sets:['a','b'].map(conceptId=>({conceptId,slides:[{placementId:'first'},{placementId:'second'}]}))},gates=records.map(deferred),started=[],done=run(records,{limit:2,carouselPlan:plan,execute:(r,i)=>{started.push(i);return gates[i].promise;}});
 try{await tick();gates[1].resolve('b anchor');await tick();assert.deepEqual([...started],[0,1,3]);gates[3].resolve('b follower');await tick();assert.deepEqual([...started],[0,1,3,4]);gates[4].resolve('independent');await tick();assert.equal(started.includes(2),false);gates[0].resolve('a anchor');await tick();assert.deepEqual([...started],[0,1,3,4,2]);}
 finally{gates.forEach(g=>g.resolve());await done;}
});
test('rejections and synchronous throws are retained, never retried, and do not starve other outputs',async()=>{
 const records=Array.from({length:8},(_,i)=>({conceptId:'one',placementId:String(i)})),calls=[];
 const output=await run(records,{limit:2,execute:(r,i)=>{calls.push(i);if(i===0)throw Error('sync failure');if(i===1)return Promise.reject(Error('lost response'));return i;}});
 assert.equal(calls.length,8);assert.equal(new Set(calls).size,8);assert.deepEqual(output.map(r=>r.status),['rejected','rejected',...Array(6).fill('fulfilled')]);assert.match(output[1].reason.message,/lost response/);assert.equal(output[7].value,7);
});
test('failed carousel opening settles its dependency but does not become a passing reference',async()=>{
 let anchorReady=false;const records=['first','second'].map(placementId=>({conceptId:'a',placementId}));const output=await run(records,{limit:2,carouselPlan:{sets:[{conceptId:'a',slides:records}]},execute:(r,i)=>{if(i===0)throw Error('anchor failed');assert.equal(anchorReady,false);return 'follower still needs normal review';}});assert.equal(output[0].status,'rejected');assert.equal(output[1].status,'fulfilled');
});
test('invalid schedules fail before dispatch and empty work completes',async()=>{
 const execute=()=>assert.fail('must not dispatch'),r={conceptId:'a',placementId:'second'};
 for(const limit of [0,-1,NaN,1.5])await assert.rejects(run([r],{limit,execute}),/concurrency/);
 await assert.rejects(run([r,r],{limit:2,execute}),/Duplicate/);
 await assert.rejects(run([r],{limit:2,execute,carouselPlan:{sets:[{conceptId:'a',slides:[{placementId:'first'},r]}]}}),/opening/);
 assert.deepEqual(await run([],{limit:2,execute}),[]);
});
