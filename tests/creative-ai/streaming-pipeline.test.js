'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
for(let variation=0;variation<10;variation++)test('ready image progresses before unrelated planning finishes '+variation,async()=>{
 const {run}=require('../../lib/creative-ai/runtime/streaming-pipeline');const slow=deferred(),started=deferred();let planning=0,peak=0;
 const groups=Array.from({length:4},(_,i)=>({id:'p'+i,units:[{conceptId:'c',placementId:'p'+i}]}));
 const pending=run(groups,{planningLimit:2,unitLimit:2,prepare:async g=>{peak=Math.max(peak,++planning);if(g.id==='p0')await slow.promise;planning--;return g.units;},execute:async r=>{if(r.placementId==='p1')started.resolve();return r;}});
 await Promise.race([started.promise,new Promise((_,reject)=>setTimeout(()=>reject(Error('Rendering waited for unrelated planning')),200))]);slow.resolve();const results=await pending;assert.equal(peak,2);assert.equal(results.length,4);assert.ok(results.every(x=>x.status==='fulfilled'));assert.deepEqual(results.map(x=>x.value.placementId),groups.map(g=>g.id));
});
test('failed plans settle their outputs while other units run; followers retain their anchor dependency',async()=>{
 const {run}=require('../../lib/creative-ai/runtime/streaming-pipeline');const order=[],anchor=deferred();
 const units=[0,1,2].map(i=>({conceptId:'c',placementId:'p'+i}));
 const pending=run(units.map(u=>({id:u.placementId,units:[u]})),{planningLimit:3,unitLimit:2,carouselPlan:{sets:[{conceptId:'c',slides:[{placementId:'p0'},{placementId:'p1'}]}]},prepare:async g=>{if(g.id==='p2')throw Error('source missing');if(g.id==='p0')await anchor.promise;return g.units;},execute:async r=>{order.push(r.placementId);return r;}});
 await new Promise(r=>setTimeout(r,10));assert.deepEqual(order,[]);anchor.resolve();const results=await pending;assert.deepEqual(order,['p0','p1']);assert.equal(results[2].status,'rejected');assert.match(results[2].reason.message,/source missing/);
});
test('invalid output bindings cannot reach generation',async()=>{let calls=0;const results=await require('../../lib/creative-ai/runtime/streaming-pipeline').run([{id:'p',units:[{conceptId:'c',placementId:'p'}]}],{planningLimit:1,unitLimit:1,prepare:async()=>[{conceptId:'other',placementId:'p'}],execute:async()=>calls++});assert.equal(calls,0);assert.equal(results[0].status,'rejected');});
test('failures carry their exact route and placement across interleaved two-concept planning',async()=>{
 const groups=['story','feed','pdp'].map(p=>({id:p,units:['continuity','exploration'].map(c=>({conceptId:c,route:c,placementId:p}))}));
 const results=await require('../../lib/creative-ai/runtime/streaming-pipeline').run(groups,{prepare:async g=>g.units,execute:async r=>{if(r.route==='exploration'&&r.placementId==='story')throw Error('story review failed');return r;}});
 const failed=results.filter(r=>r.status==='rejected');assert.equal(failed.length,1);assert.deepEqual(failed[0].unit,{conceptId:'exploration',route:'exploration',placementId:'story'});
});
