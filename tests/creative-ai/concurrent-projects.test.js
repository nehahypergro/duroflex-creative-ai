'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {loadConfig}=require('../../lib/creative-ai/runtime/config');
const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
test('multiple brand projects start together, queue remains bounded and duplicate scheduling is ignored',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-concurrency-'));
 try{const config=loadConfig(root);assert.equal(config.maxConcurrentJobs,2);config.maxConcurrentJobs=5;
 const started=[],release=[],fake={config,active:new Set(),pending:[],execute:id=>new Promise(resolve=>{started.push(id);release.push(resolve);}),store:{update:async()=>{}},log:async()=>{}};
 fake.pump=()=>CreativeRuntime.prototype.pump.call(fake);
 for(const id of ['Duroflex-1','Sleepyhead-1','Duroflex-2','Sleepyhead-2','Duroflex-3','Duroflex-4'])CreativeRuntime.prototype.schedule.call(fake,id);
 CreativeRuntime.prototype.schedule.call(fake,'Duroflex-1');assert.equal(started.length,5);assert.equal(fake.pending.length,1);
 release.shift()();await new Promise(r=>setImmediate(r));assert.equal(started.length,6);assert.equal(fake.active.size,5);
 release.forEach(r=>r());await new Promise(r=>setImmediate(r));assert.equal(fake.active.size,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('project concurrency accepts a bounded local override and rejects invalid values',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-concurrency-'));
 try{fs.writeFileSync(path.join(root,'.env'),'CREATIVE_AI_MAX_CONCURRENT_JOBS=6\n');assert.equal(loadConfig(root).maxConcurrentJobs,6);
 for(const value of ['0','-1','1.5','17','many']){fs.writeFileSync(path.join(root,'.env'),'CREATIVE_AI_MAX_CONCURRENT_JOBS='+value+'\n');assert.throws(()=>loadConfig(root),/concurrent/i);}}
 finally{fs.rmSync(root,{recursive:true,force:true});}
});
