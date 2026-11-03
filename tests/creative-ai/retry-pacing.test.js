'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const transport=require('../../lib/creative-ai/runtime/reasoning-transport');
const scenarios=[['429 numeric',429,'3',3000],['500 numeric',500,'2',2000],['502 default',502,null,1000],['503 default',503,null,1000],['504 default',504,null,1000],['zero minimum',429,'0',1000],['malformed',503,'later',1000],['negative',500,'-1',1000],['decimal',429,'1.5',1500],['http date',503,'Fri, 23 Oct 2026 00:00:05 GMT',5000]];
for(const [label,status,header,expected] of scenarios)test('recovery pacing: '+label,async()=>{
 let calls=0,now=Date.parse('2026-10-23T00:00:00Z'),reserved=0;const saved=new Map(),waits=[];
 const budget={loadResponse:async(k,key)=>saved.get(key),saveResponse:async(k,key,v)=>saved.set(key,v),reserve:async()=>reserved++,remainingMs:async()=>60000};
 const options={key:'original',operation:label,attempt:0,budget,prepare:async()=>{},now:()=>now,sleep:async ms=>{waits.push(ms);now+=ms;},send:async()=>++calls===1?{ok:false,status,headers:new Headers(header===null?{}:{'retry-after':header}),json:async()=>({error:{message:'fixture'}})}:{ok:true,json:async()=>({id:'saved'})}};
 await transport(options);assert.equal(waits.reduce((a,b)=>a+b,0),expected);assert.equal(calls,2);assert.equal(reserved,2);
 await transport(options);assert.equal(calls,2,'restart must replay without dispatch');assert.equal(waits.reduce((a,b)=>a+b,0),expected);
});
test('provider delay longer than remaining job budget stops before recovery reservation',async()=>{
 let calls=0,reserved=0;const saved=new Map();
 await assert.rejects(()=>transport({key:'first',operation:'expiry',attempt:0,now:()=>0,sleep:async()=>assert.fail('must not sleep'),prepare:async()=>{},budget:{loadResponse:async(k,key)=>saved.get(key),saveResponse:async(k,key,v)=>saved.set(key,v),reserve:async()=>reserved++,remainingMs:async()=>2000},send:async()=>{calls++;return {ok:false,status:429,headers:new Headers({'retry-after':'60'}),json:async()=>({error:{}})};}}),/budget|retry/i);
 assert.equal(calls,1);assert.equal(reserved,1);
});
