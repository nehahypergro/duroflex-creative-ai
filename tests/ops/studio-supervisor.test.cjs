'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events');
const modulePath=path.resolve(__dirname,'../../scripts/ops/studio-supervisor.cjs');const {occupied}=require(modulePath);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<80;i++){if(await fn())return;await wait(50);}throw Error('Timed out');}
test('Supervisor preserves existing listener, takes over only when it exits, and propagates child failure',{timeout:15000},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-supervisor-')),old=http.createServer((q,r)=>r.end('existing'));
 await new Promise(r=>old.listen(0,'127.0.0.1',r));const port=old.address().port;let guard;
 try{
 assert.equal(await occupied(port),true);
 await fs.writeFile(path.join(root,'server.js'),"require('fs').writeFileSync('pid',String(process.pid));require('http').createServer((q,r)=>r.end('replacement')).listen(Number(process.env.PORT),process.env.HOST);");
 guard=spawn(process.execPath,['-e',`require(${JSON.stringify(modulePath)}).supervise(${JSON.stringify({root,port,interval:50})})`],{stdio:['ignore','pipe','pipe']});
 let log='';guard.stdout.on('data',b=>log+=b);await until(()=>log.includes('Existing studio listener retained'));
 assert.equal(await (await fetch('http://127.0.0.1:'+port)).text(),'existing');await assert.rejects(fs.readFile(path.join(root,'pid')),{code:'ENOENT'});
 await new Promise(r=>old.close(r));await until(async()=>{try{return await (await fetch('http://127.0.0.1:'+port)).text()==='replacement';}catch{return false;}});
 const pid=Number(await fs.readFile(path.join(root,'pid'),'utf8')),ended=once(guard,'exit');process.kill(pid,'SIGTERM');const [code]=await ended;assert.equal(code,1,'Exit makes launchd restart the guard');await until(async()=>!await occupied(port));
 }finally{old.close();if(guard?.exitCode===null)guard.kill('SIGTERM');await fs.rm(root,{recursive:true,force:true});}
});
