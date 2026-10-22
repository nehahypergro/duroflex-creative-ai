'use strict';
// A launchd-owned fallback: never interrupts a listener already using the studio port.
const net=require('node:net'),{spawn}=require('node:child_process'),path=require('node:path');
function occupied(port,host='127.0.0.1'){
 return new Promise(resolve=>{const s=net.connect({host,port});let done=false;const finish=v=>{if(done)return;done=true;s.destroy();resolve(v);};s.on('connect',()=>finish(true));s.on('error',e=>finish(e.code!=='ECONNREFUSED'));s.setTimeout(1500,()=>finish(true));});
}
async function supervise({root=path.resolve(__dirname,'../..'),port=1842,interval=10000,entry='server.js',log=console.log}={}){
 let stopped=false,child=null;
 const stop=()=>{stopped=true;if(child)child.kill('SIGTERM');else process.exit(0);};
 process.once('SIGTERM',stop);process.once('SIGINT',stop);
 if(await occupied(port)){log('Existing studio listener retained; checking every '+interval/1000+' seconds.');while(!stopped&&await occupied(port))await new Promise(r=>setTimeout(r,interval));}
 if(stopped)return;
 log('Starting supervised studio on localhost:'+port);
 child=spawn(process.execPath,[path.resolve(root,entry)],{cwd:root,stdio:'inherit',env:{...process.env,HOST:'127.0.0.1',PORT:String(port)}});
 await new Promise(resolve=>{child.once('error',e=>{log('Studio launch failed: '+e.message);process.exitCode=1;resolve();});child.once('exit',(code,signal)=>{log('Studio exited ('+(signal||code)+'); launchd will restart the supervisor.');process.exitCode=stopped?0:(code||1);resolve();});});
 process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop);
}
if(require.main===module)supervise().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={occupied,supervise};
