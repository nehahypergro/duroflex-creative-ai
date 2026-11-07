'use strict';
const fs=require('node:fs/promises'),{execFile}=require('node:child_process'),{promisify}=require('node:util'),run=promisify(execFile);
let bootPromise,selfPromise;
async function bootId(){return bootPromise??=(async()=>{try{if(process.platform==='linux')return (await fs.readFile('/proc/sys/kernel/random/boot_id','utf8')).trim();if(process.platform==='darwin')return (await run('/usr/sbin/sysctl',['-n','kern.bootsessionuuid'],{timeout:2000})).stdout.trim();}catch{}return null;})();}
async function started(pid){try{if(process.platform==='linux'){const stat=await fs.readFile('/proc/'+pid+'/stat','utf8');return stat.slice(stat.lastIndexOf(')')+2).split(' ')[19];}if(process.platform==='darwin')return (await run('/bin/ps',['-p',String(pid),'-o','lstart='],{timeout:2000,env:{...process.env,LC_ALL:'C'}})).stdout.trim()||null;}catch{}return null;}
async function self(){return selfPromise??=Promise.all([bootId(),started(process.pid)]).then(([bootId,processStart])=>({bootId,processStart}));}
module.exports={bootId,started,self};
