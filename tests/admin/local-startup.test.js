'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {start}=require('../../scripts/admin/local-studio');

test('integrated local startup retains setup identity and database, enables auth and does not resume jobs',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'creative-local-start-'));let stopped=0,closed=0;
 try{
  const privateDir=path.join(root,'private');await fs.mkdir(privateDir);await fs.writeFile(path.join(privateDir,'setup-token'),'saved-setup-token');
  const service=await start({root,privateDir,port:0,mongoPort:0,
   createRepl:async options=>{assert.equal(options.instanceOpts[0].dbPath,path.join(privateDir,'database'));assert.equal(options.replSet.ip,'127.0.0.1');return {getUri:()=> 'fixture',stop:async options=>{assert.equal(options.doCleanup,false);stopped++;}};},
   connect:async uri=>{assert.equal(uri,'fixture');return {db:name=>{assert.equal(name,'creative_ai_admin_pilot');return {};},close:async()=>closed++};},
   createApp:async options=>{assert.equal(options.studio,true);assert.equal(options.preview,false);assert.equal(options.setupToken,'saved-setup-token');return {server:http.createServer((q,r)=>r.end('fixture'))};}
  });
  assert.equal(JSON.parse(await fs.readFile(path.join(privateDir,'deployment.json'))).automaticJobResumption,false);
  const source=await fs.readFile(path.resolve(__dirname,'../../admin-server.js'),'utf8');assert.match(source,/resumeJobs:false/);
  await service.close();await service.close();assert.equal(stopped,1);assert.equal(closed,1);
  assert.equal(await fs.readFile(path.join(privateDir,'setup-token'),'utf8'),'saved-setup-token');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('a database or application startup failure closes resources without erasing persistent storage',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'creative-local-fail-'));let stopped=false;
 try{await assert.rejects(start({root,port:0,mongoPort:0,createRepl:async()=>({getUri:()=> 'fixture',stop:async options=>{assert.equal(options.doCleanup,false);stopped=true;}}),connect:async()=>{throw Error('fixture database unavailable');}}),/fixture database unavailable/);assert.equal(stopped,true);}
 finally{await fs.rm(root,{recursive:true,force:true});}
});

// Live restart, 10 Nov 2026: kill -TERM left the Studio stuck for minutes, not listening and not exiting,
// because an open Studio browser tab kept a keep-alive connection, so server.close() never finished.
// Shutdown now closes idle connections at once and every remaining connection after a short grace period.
test('shutdown finishes even while a browser keeps a connection open',{timeout:20000},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'creative-local-keepalive-'));
 try{
  const privateDir=path.join(root,'private');await fs.mkdir(privateDir);
  const service=await start({root,privateDir,port:0,mongoPort:0,shutdownGraceMs:300,
   createRepl:async()=>({getUri:()=> 'fixture',stop:async()=>{}}),connect:async()=>({db:()=>({}),close:async()=>{}}),
   createApp:async()=>({server:http.createServer({keepAliveTimeout:60000},(q,r)=>{if(q.url==='/stream'){r.writeHead(200,{'Content-Type':'text/event-stream'});r.write('data: open\n\n');return;}r.end('ok');})})});
  const port=service.app.server.address().port,agent=new http.Agent({keepAlive:true});
  await new Promise((resolve,reject)=>http.get({port,path:'/',agent},r=>{r.resume();r.on('end',resolve);}).on('error',reject));
  await new Promise((resolve,reject)=>http.get({port,path:'/stream'},r=>{r.once('data',()=>resolve());}).on('error',reject));
  const began=Date.now();await service.close();
  assert.ok(Date.now()-began<5000,'closed within the grace period, not hung on open connections');
  assert.equal(service.app.server.listening,false);agent.destroy();
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
