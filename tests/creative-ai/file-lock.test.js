'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{fork}=require('node:child_process'),{once}=require('node:events');
const locks=require('../../lib/creative-ai/runtime/file-lock');
test('killed worker is recoverable; ten contenders never enter together',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'writer-death-')),file=path.join(root,'lock'),childPath=path.join(root,'owner.cjs');let child;
 try{await fs.writeFile(childPath,`require(${JSON.stringify(require.resolve('../../lib/creative-ai/runtime/file-lock'))}).acquire(process.argv[2]).then(()=>{process.send('owned');setInterval(()=>{},1000);});`);
 child=fork(childPath,[file],{stdio:['ignore','ignore','inherit','ipc']});await once(child,'message');const closed=once(child,'exit');child.kill('SIGKILL');await closed;
 let active=0,peak=0,count=0;await Promise.all(Array.from({length:10},()=>locks.withLock(file,async()=>{peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,3));count++;active--;})));assert.equal(peak,1);assert.equal(count,10);
 }finally{child?.kill();await fs.rm(root,{recursive:true,force:true});}
});
test('live, empty, foreign and legacy locks are not stolen; wait is bounded and cancellable',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'writer-wait-')),file=path.join(root,'lock');
 try{const release=await locks.acquire(file);await assert.rejects(()=>locks.acquire(file,{timeoutMs:25}),{code:'SHARED_WRITER_BUSY'});const abort=new AbortController();const pending=locks.acquire(file,{signal:abort.signal});abort.abort();await assert.rejects(()=>pending,/abort/i);await release();
 await fs.mkdir(file);await assert.rejects(()=>locks.acquire(file,{timeoutMs:10}),{code:'SHARED_WRITER_BUSY'});await fs.rmdir(file);
 await fs.writeFile(file,'legacy PID');await assert.rejects(()=>locks.acquire(file,{timeoutMs:10}),{code:'SHARED_WRITER_BUSY'});await fs.unlink(file);
 await fs.mkdir(file);await fs.writeFile(path.join(file,'owner-abc.json'),JSON.stringify({pid:999999999,host:'a-different-host'}));await assert.rejects(()=>locks.acquire(file,{timeoutMs:10}),{code:'SHARED_WRITER_BUSY'});
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
